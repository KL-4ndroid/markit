import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: false, quiet: true });

for (const key of [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SECRET_KEY',
]) {
  if (!process.env[key]?.trim()) throw new Error(`Missing required environment variable: ${key}`);
}

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  clientOptions,
);
const anonymous = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  clientOptions,
);

const results = [];
let failed = false;

function record(check, status, detail) {
  results.push({ check, status, detail });
  if (status === 'FAIL') failed = true;
}

function safeError(error) {
  return String(error?.code || error?.name || error?.message || 'unknown_error').slice(0, 80);
}

async function readAll(table, columns) {
  const rows = [];
  const pageSize = 1_000;

  for (let from = 0; from < 50_000; from += pageSize) {
    const response = await service
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (response.error) throw response.error;
    rows.push(...(response.data ?? []));
    if ((response.data?.length ?? 0) < pageSize) return rows;
  }

  throw new Error(`${table} exceeded the bounded smoke-test row limit`);
}

function hasEffectiveAdminTeam(account, nowMs) {
  if (!account) return false;
  if (
    account.plan_code !== 'team'
    || account.plan_source !== 'admin'
    || account.billing_status !== 'none'
    || !['active', 'grace'].includes(account.entitlement_status)
  ) {
    return false;
  }
  return account.entitlement_ends_at === null
    || Date.parse(account.entitlement_ends_at) >= nowMs;
}

let relationships = [];
let accounts = [];
let markets = [];
let memberships = [];

try {
  [relationships, accounts, markets, memberships] = await Promise.all([
    readAll('staff_relationships', 'owner_id,staff_id,status'),
    readAll(
      'subscription_accounts',
      'owner_id,plan_code,plan_source,billing_status,entitlement_status,entitlement_ends_at',
    ),
    readAll('markets', 'id,owner_id'),
    readAll('market_members', 'market_id,user_id,role'),
  ]);
  record('service fixture reads', 'PASS', 'bounded rows read without exposing identifiers');
} catch (error) {
  record('service fixture reads', 'FAIL', safeError(error));
}

if (!failed) {
  const allowedStatuses = new Set(['pending', 'active', 'suspended_by_plan', 'revoked']);
  const statusCounts = new Map();
  for (const relationship of relationships) {
    statusCounts.set(
      relationship.status,
      (statusCounts.get(relationship.status) ?? 0) + 1,
    );
  }
  const invalidStatuses = [...statusCounts.keys()].filter(status => !allowedStatuses.has(status));
  record(
    'relationship status contract',
    invalidStatuses.length === 0 ? 'PASS' : 'FAIL',
    [...statusCounts.entries()].map(([status, count]) => `${status}=${count}`).join(', ') || 'no rows',
  );

  const accountByOwner = new Map(accounts.map(account => [account.owner_id, account]));
  const invalidActive = relationships.filter(relationship => (
    relationship.status === 'active'
    && !hasEffectiveAdminTeam(accountByOwner.get(relationship.owner_id), Date.now())
  ));
  record(
    'active relationship Team backing',
    invalidActive.length === 0 ? 'PASS' : 'FAIL',
    invalidActive.length === 0 ? 'every active row is Team-backed' : `${invalidActive.length} invalid row(s)`,
  );

  const ownerByMarket = new Map(markets.map(market => [market.id, market.owner_id]));
  const suspendedPairs = new Set(
    relationships
      .filter(relationship => relationship.status === 'suspended_by_plan')
      .map(relationship => `${relationship.owner_id}:${relationship.staff_id}`),
  );
  const leakedMemberships = memberships.filter(membership => (
    membership.role === 'staff'
    && suspendedPairs.has(`${ownerByMarket.get(membership.market_id)}:${membership.user_id}`)
  ));
  record(
    'suspended membership cleanup',
    leakedMemberships.length === 0 ? 'PASS' : 'FAIL',
    leakedMemberships.length === 0
      ? `${suspendedPairs.size} suspended pair(s), no market_members leak`
      : `${leakedMemberships.length} leaked membership row(s)`,
  );
}

const fakeOwnerId = randomUUID();
const fakeStaffId = randomUUID();
const fakeRelationshipId = randomUUID();
const fakeInvitationId = randomUUID();

const deniedWrites = [
  ['anonymous relationship insert', anonymous.from('staff_relationships').insert({
    id: fakeRelationshipId,
    owner_id: fakeOwnerId,
    staff_id: fakeStaffId,
    staff_email: 'denied-write-smoke@invalid.example',
    status: 'pending',
  })],
  ['anonymous relationship update', anonymous.from('staff_relationships')
    .update({ status: 'revoked' })
    .eq('id', fakeRelationshipId)],
  ['anonymous relationship delete', anonymous.from('staff_relationships')
    .delete()
    .eq('id', fakeRelationshipId)],
  ['anonymous invitation insert', anonymous.from('staff_invitations').insert({
    id: fakeInvitationId,
    owner_id: fakeOwnerId,
    token: randomUUID().replaceAll('-', ''),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  })],
  ['anonymous invitation update', anonymous.from('staff_invitations')
    .update({ expires_at: new Date(Date.now() + 120_000).toISOString() })
    .eq('id', fakeInvitationId)],
  ['anonymous invitation delete', anonymous.from('staff_invitations')
    .delete()
    .eq('id', fakeInvitationId)],
];

for (const [check, request] of deniedWrites) {
  const response = await request;
  record(
    check,
    response.error ? 'PASS' : 'FAIL',
    response.error ? `denied: ${safeError(response.error)}` : 'unexpectedly allowed',
  );
}

const tokenVerification = await anonymous.rpc('verify_invitation_token', {
  p_token: randomUUID().replaceAll('-', ''),
});
const verificationRow = Array.isArray(tokenVerification.data) ? tokenVerification.data[0] : null;
record(
  'anonymous token verification boundary',
  !tokenVerification.error && verificationRow?.is_valid === false ? 'PASS' : 'FAIL',
  tokenVerification.error ? safeError(tokenVerification.error) : 'unknown token rejected',
);

const protectedRpcs = [
  ['invite_staff_member', { p_staff_email: 'denied-rpc-smoke@invalid.example' }],
  ['create_staff_invitation', undefined],
  ['delete_staff_invitation', { p_invitation_id: fakeInvitationId }],
  ['accept_staff_email_invitation', { p_relationship_id: fakeRelationshipId }],
  ['decline_staff_email_invitation', { p_relationship_id: fakeRelationshipId }],
  ['restore_staff_relationship', { p_relationship_id: fakeRelationshipId }],
  ['revoke_staff_member', { p_staff_id: fakeStaffId }],
  ['revoke_staff_relationship', { p_relationship_id: fakeRelationshipId }],
  ['update_staff_role', { p_relationship_id: fakeRelationshipId, p_role: 'viewer' }],
  ['update_staff_permissions', {
    p_relationship_id: fakeRelationshipId,
    p_permissions: { can_view: true, can_edit: false, infoLevel: 0 },
  }],
  ['delete_revoked_staff_relationship', { p_relationship_id: fakeRelationshipId }],
];

for (const [name, args] of protectedRpcs) {
  const response = args === undefined
    ? await anonymous.rpc(name)
    : await anonymous.rpc(name, args);
  record(
    `anonymous RPC denied: ${name}`,
    response.error ? 'PASS' : 'FAIL',
    response.error ? `denied: ${safeError(response.error)}` : 'unexpectedly executable',
  );
}

console.table(results);
if (failed) process.exit(1);
