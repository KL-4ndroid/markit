import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: false, quiet: true });

const EXECUTION_CONFIRMATION = 'isolated-fixture-only';
const args = process.argv.slice(2);

function readOption(name) {
  const prefix = `${name}=`;
  const inline = args.find(argument => argument.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();
  const index = args.indexOf(name);
  return index >= 0 ? String(args[index + 1] ?? '').trim() : '';
}

const executeConfirmation = readOption('--execute');
const requestedProjectRef = readOption('--project-ref');
const cleanupLeftover = args.includes('--cleanup-leftover');

for (const key of [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SECRET_KEY',
]) {
  if (!process.env[key]?.trim()) throw new Error(`Missing required environment variable: ${key}`);
}

if (executeConfirmation !== EXECUTION_CONFIRMATION) {
  throw new Error(`Refusing live mutation without --execute=${EXECUTION_CONFIRMATION}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, '');
const hostname = new URL(supabaseUrl).hostname;
const actualProjectRef = hostname.endsWith('.supabase.co') ? hostname.split('.')[0] : '';
if (!actualProjectRef || requestedProjectRef !== actualProjectRef) {
  throw new Error('Refusing live mutation because --project-ref does not match the configured project.');
}

const statePath = join(tmpdir(), `boothbook-team-transition-smoke-${actualProjectRef}.json`);
const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

const service = createClient(supabaseUrl, process.env.SUPABASE_SECRET_KEY, clientOptions);
const results = [];
let runFailure = null;
let cleanupFailure = null;
let state = {
  version: 1,
  projectRef: actualProjectRef,
  createdAt: new Date().toISOString(),
  ownerUserId: null,
  staffUserId: null,
  marketId: null,
};

function record(check, status, detail) {
  results.push({ check, status, detail });
}

function errorCode(error) {
  return String(error?.code || error?.name || 'unknown_error').slice(0, 80);
}

function persistState() {
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

function requireCheck(check, condition, detail) {
  record(check, condition ? 'PASS' : 'FAIL', detail);
  if (!condition) throw new Error(`${check}: assertion_failed`);
}

function requireResponse(check, response, predicate = data => Boolean(data)) {
  if (response.error) {
    record(check, 'FAIL', errorCode(response.error));
    throw new Error(`${check}: ${errorCode(response.error)}`);
  }
  requireCheck(check, predicate(response.data), 'expected contract observed');
  return response.data;
}

async function deleteFixtureUser(userId) {
  if (!userId) return null;
  const response = await service.auth.admin.deleteUser(userId);
  if (!response.error || response.error.status === 404 || response.error.code === 'user_not_found') {
    return null;
  }
  return errorCode(response.error);
}

async function cleanupFixture(targetState) {
  const failures = [];
  const ownerFailure = await deleteFixtureUser(targetState.ownerUserId);
  if (ownerFailure) failures.push(`owner:${ownerFailure}`);
  const staffFailure = await deleteFixtureUser(targetState.staffUserId);
  if (staffFailure) failures.push(`staff:${staffFailure}`);

  if (failures.length === 0) {
    rmSync(statePath, { force: true });
  }
  return failures;
}

function readPersistedState() {
  const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
  if (
    parsed?.version !== 1
    || parsed?.projectRef !== actualProjectRef
    || (parsed.ownerUserId !== null && typeof parsed.ownerUserId !== 'string')
    || (parsed.staffUserId !== null && typeof parsed.staffUserId !== 'string')
  ) {
    throw new Error('Refusing cleanup because the persisted fixture state is invalid.');
  }
  return parsed;
}

async function expectDenied(check, request) {
  const response = await request;
  requireCheck(
    check,
    response.error?.code === '42501',
    response.error ? `denied:${errorCode(response.error)}` : 'unexpectedly allowed',
  );
}

async function setPlan(planCode, planSource) {
  const response = await service.from('subscription_accounts').upsert({
    owner_id: state.ownerUserId,
    plan_code: planCode,
    plan_source: planSource,
    billing_status: 'none',
    entitlement_status: 'active',
    entitlement_ends_at: null,
  }, { onConflict: 'owner_id' });
  requireResponse(`set authoritative ${planCode}`, response, () => true);
}

async function readRelationship() {
  return service
    .from('staff_relationships')
    .select('id,status,role,permissions')
    .eq('owner_id', state.ownerUserId)
    .eq('staff_id', state.staffUserId)
    .single();
}

async function readFixtureMemberships() {
  return service
    .from('market_members')
    .select('market_id,role')
    .eq('market_id', state.marketId)
    .eq('user_id', state.staffUserId);
}

async function expectPlanRpcDenial(client, label, staffEmail, relationshipId) {
  await expectDenied(`${label} invite denied`, client.rpc('invite_staff_member', {
    p_staff_email: staffEmail,
  }));
  await expectDenied(`${label} link creation denied`, client.rpc('create_staff_invitation'));
  await expectDenied(`${label} role change denied`, client.rpc('update_staff_role', {
    p_relationship_id: relationshipId,
    p_role: 'manager',
  }));
  await expectDenied(`${label} restore denied`, client.rpc('restore_staff_relationship', {
    p_relationship_id: relationshipId,
  }));
}

async function expectAuthenticatedDirectMutationDenial(ownerClient) {
  const fakeOwnerId = randomUUID();
  const fakeStaffId = randomUUID();
  const fakeRelationshipId = randomUUID();
  const fakeInvitationId = randomUUID();

  await expectDenied('authenticated relationship insert denied', ownerClient
    .from('staff_relationships')
    .insert({
      id: fakeRelationshipId,
      owner_id: fakeOwnerId,
      staff_id: fakeStaffId,
      staff_email: 'team-transition-denial@invalid.example',
      status: 'pending',
    }));
  await expectDenied('authenticated relationship update denied', ownerClient
    .from('staff_relationships')
    .update({ status: 'revoked' })
    .eq('id', fakeRelationshipId));
  await expectDenied('authenticated relationship delete denied', ownerClient
    .from('staff_relationships')
    .delete()
    .eq('id', fakeRelationshipId));
  await expectDenied('authenticated invitation insert denied', ownerClient
    .from('staff_invitations')
    .insert({
      id: fakeInvitationId,
      owner_id: fakeOwnerId,
      token: randomUUID().replaceAll('-', ''),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    }));
  await expectDenied('authenticated invitation update denied', ownerClient
    .from('staff_invitations')
    .update({ expires_at: new Date(Date.now() + 120_000).toISOString() })
    .eq('id', fakeInvitationId));
  await expectDenied('authenticated invitation delete denied', ownerClient
    .from('staff_invitations')
    .delete()
    .eq('id', fakeInvitationId));
}

async function runTransitionSmoke() {
  const runId = randomUUID().replaceAll('-', '');
  const password = `${randomBytes(24).toString('base64url')}Aa1!`;
  const ownerEmail = `boothbook-team-smoke-owner-${runId}@example.com`;
  const staffEmail = `boothbook-team-smoke-staff-${runId}@example.com`;

  const ownerCreation = await service.auth.admin.createUser({
    email: ownerEmail,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'BoothBook Team Smoke Owner', boothbook_test_fixture: true },
  });
  const owner = requireResponse('create isolated owner auth fixture', ownerCreation, data => Boolean(data?.user?.id));
  state.ownerUserId = owner.user.id;
  persistState();

  const staffCreation = await service.auth.admin.createUser({
    email: staffEmail,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'BoothBook Team Smoke Staff', boothbook_test_fixture: true },
  });
  const staff = requireResponse('create isolated staff auth fixture', staffCreation, data => Boolean(data?.user?.id));
  state.staffUserId = staff.user.id;
  persistState();

  requireResponse('upsert isolated profiles', await service.from('profiles').upsert([
    { id: state.ownerUserId, email: ownerEmail, display_name: 'BoothBook Team Smoke Owner' },
    { id: state.staffUserId, email: staffEmail, display_name: 'BoothBook Team Smoke Staff' },
  ]), () => true);

  const market = requireResponse('create isolated market fixture', await service.from('markets').insert({
    owner_id: state.ownerUserId,
    name: 'BoothBook Team Transition Smoke',
    location: 'Automated isolated fixture',
    start_date: '2099-01-01',
    end_date: '2099-01-01',
    status: 'registered',
  }).select('id').single(), data => Boolean(data?.id));
  state.marketId = market.id;
  persistState();

  requireResponse('create isolated owner membership', await service.from('market_members').insert({
    market_id: state.marketId,
    user_id: state.ownerUserId,
    role: 'owner',
  }), () => true);

  const ownerClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, clientOptions);
  const staffClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, clientOptions);
  requireResponse('authenticate isolated owner', await ownerClient.auth.signInWithPassword({
    email: ownerEmail,
    password,
  }), data => Boolean(data?.session?.access_token));
  requireResponse('authenticate isolated staff', await staffClient.auth.signInWithPassword({
    email: staffEmail,
    password,
  }), data => Boolean(data?.session?.access_token));

  await setPlan('free', 'free');
  await expectAuthenticatedDirectMutationDenial(ownerClient);
  await expectPlanRpcDenial(ownerClient, 'Free', staffEmail, randomUUID());

  await setPlan('pro', 'admin');
  await expectPlanRpcDenial(ownerClient, 'Pro', staffEmail, randomUUID());

  await setPlan('team', 'admin');
  const invitation = requireResponse('Team email invitation succeeds', await ownerClient.rpc(
    'invite_staff_member',
    { p_staff_email: staffEmail },
  ), data => data?.status === 'pending' && Boolean(data?.id));

  const invitationLink = requireResponse('Team invitation link creation succeeds', await ownerClient.rpc(
    'create_staff_invitation',
  ), data => Boolean(data?.id) && typeof data?.token === 'string');
  requireResponse('owner invitation-link cleanup succeeds', await ownerClient.rpc(
    'delete_staff_invitation',
    { p_invitation_id: invitationLink.id },
  ), data => data === true);

  requireResponse('staff invitation acceptance succeeds', await staffClient.rpc(
    'accept_staff_email_invitation',
    { p_relationship_id: invitation.id },
  ), data => data?.status === 'active' && data?.role === 'viewer');
  requireResponse('Team role viewer to operator succeeds', await ownerClient.rpc('update_staff_role', {
    p_relationship_id: invitation.id,
    p_role: 'operator',
  }), data => data?.status === 'active' && data?.role === 'operator');
  requireResponse('Team role operator to manager succeeds', await ownerClient.rpc('update_staff_role', {
    p_relationship_id: invitation.id,
    p_role: 'manager',
  }), data => data?.status === 'active' && data?.role === 'manager');

  const activeRelationship = requireResponse(
    'active manager relationship persisted',
    await readRelationship(),
    data => data?.status === 'active' && data?.role === 'manager',
  );
  requireResponse('active staff membership exists', await readFixtureMemberships(), data => (
    Array.isArray(data) && data.length === 1 && data[0]?.role === 'staff'
  ));
  requireResponse('active staff owner RPC is visible', await staffClient.rpc('get_my_owners'), data => (
    Array.isArray(data) && data.length === 1
  ));
  requireResponse('active staff market scope is visible', await staffClient.rpc('current_user_market_ids'), data => (
    Array.isArray(data) && data.length === 1
  ));

  await setPlan('pro', 'admin');
  requireResponse('Team to Pro suspends relationship', await readRelationship(), data => (
    data?.status === 'suspended_by_plan' && data?.role === 'manager'
  ));
  requireResponse('Team to Pro removes staff membership', await readFixtureMemberships(), data => (
    Array.isArray(data) && data.length === 0
  ));
  requireResponse('suspended staff loses owner scope', await staffClient.rpc('get_my_owners'), data => (
    Array.isArray(data) && data.length === 0
  ));
  requireResponse('suspended staff loses market scope', await staffClient.rpc('current_user_market_ids'), data => (
    Array.isArray(data) && data.length === 0
  ));
  await expectPlanRpcDenial(ownerClient, 'downgraded Pro', staffEmail, activeRelationship.id);

  await setPlan('free', 'free');
  requireResponse('Pro to Free preserves suspension', await readRelationship(), data => (
    data?.status === 'suspended_by_plan' && data?.role === 'manager'
  ));
  await expectPlanRpcDenial(ownerClient, 'downgraded Free', staffEmail, activeRelationship.id);

  await setPlan('team', 'admin');
  requireResponse('Team re-upgrade does not auto-restore', await readRelationship(), data => (
    data?.status === 'suspended_by_plan' && data?.role === 'manager'
  ));
  requireResponse('Team re-upgrade keeps membership absent', await readFixtureMemberships(), data => (
    Array.isArray(data) && data.length === 0
  ));

  requireResponse('explicit owner restore succeeds', await ownerClient.rpc('restore_staff_relationship', {
    p_relationship_id: activeRelationship.id,
  }), data => data?.status === 'active' && data?.role === 'manager');
  requireResponse('explicit restore recreates staff membership', await readFixtureMemberships(), data => (
    Array.isArray(data) && data.length === 1 && data[0]?.role === 'staff'
  ));
  requireResponse('restored staff owner scope returns', await staffClient.rpc('get_my_owners'), data => (
    Array.isArray(data) && data.length === 1
  ));
  requireResponse('restored staff market scope returns', await staffClient.rpc('current_user_market_ids'), data => (
    Array.isArray(data) && data.length === 1
  ));

  await Promise.all([ownerClient.auth.signOut(), staffClient.auth.signOut()]);
}

if (cleanupLeftover) {
  if (!existsSync(statePath)) throw new Error('No persisted Team transition smoke fixture exists.');
  const persistedState = readPersistedState();
  const failures = await cleanupFixture(persistedState);
  record(
    'leftover fixture cleanup',
    failures.length === 0 ? 'PASS' : 'FAIL',
    failures.length === 0 ? 'isolated auth fixtures removed' : failures.join(', '),
  );
  console.table(results);
  if (failures.length > 0) process.exit(1);
  process.exit(0);
}

if (existsSync(statePath)) {
  throw new Error('A prior fixture state exists. Run the guarded --cleanup-leftover mode first.');
}

try {
  persistState();
  await runTransitionSmoke();
} catch (error) {
  runFailure = error;
  if (!results.some(result => result.status === 'FAIL')) {
    record('Team transition smoke', 'FAIL', errorCode(error));
  }
} finally {
  const failures = await cleanupFixture(state);
  cleanupFailure = failures.length > 0 ? failures : null;
  record(
    'isolated fixture cleanup',
    failures.length === 0 ? 'PASS' : 'FAIL',
    failures.length === 0 ? 'auth users and cascading fixture rows removed' : failures.join(', '),
  );
}

console.table(results);
if (runFailure || cleanupFailure) process.exit(1);
