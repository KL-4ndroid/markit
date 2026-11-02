// Real local Auth → actual API → PostgREST → private request table, without cleanup.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';
import { ACCOUNT_DELETION_POLICY_REVISION } from '../lib/subscription/account-deletion-contract';
import { assertLocalDeletionStack, localDeletionKeys, localDeletionState, ageSyntheticSession, localDeletionPreservationProof, sql, LOCAL_API, INTEGRATION_ORIGIN, TEST_PASSWORD } from './lib/account-deletion-local-supabase';

async function main() {
  const phase = process.argv[2];
  assert.ok(['before-restart', 'after-db-restart', 'after-api-restart', 'finish'].includes(phase));
  assertLocalDeletionStack();
  const keys = localDeletionKeys(), state = localDeletionState();
  const session = async (role: 'owner' | 'staff') => {
    const client = createClient(LOCAL_API, keys.PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const result = await client.auth.signInWithPassword({ email: state[role].email, password: TEST_PASSWORD });
    assert.ok(!result.error && result.data.session, 'real local Auth sign-in');
    assert.equal(result.data.user.id, state[role].id);
    return { client, token: result.data.session.access_token, refreshToken: result.data.session.refresh_token };
  };
  const api = async (path: string, token?: string, body?: unknown) => {
    const response = await fetch(`${INTEGRATION_ORIGIN}/api/account-deletion${path}`, {
      method: body ? 'POST' : 'GET', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
    });
    return { status: response.status, body: await response.json() };
  };
  const owner = await session('owner');
  const checkpointFile = '.codex-artifacts/deletion-real-checkpoint.private.json';
  const evidenceFile = '.codex-artifacts/deletion-real-acceptance.json';
  const preservation = () => assert.deepEqual(localDeletionPreservationProof(), { authUsers: 2, profiles: 2, markets: 1, staffRelations: 1, startedCleanup: 0 });
  if (phase === 'before-restart') {
    assert.equal((await api('')).status, 401);
    const staff = await session('staff');
    assert.equal((await api('', staff.token)).status, 404);
    const payload = { policyRevision: ACCOUNT_DELETION_POLICY_REVISION, preflightResolution: 'clean', idempotencyKey: uuid(), acknowledgeStoreBillingContinues: true };
    const create = await api('', owner.token, payload); assert.equal(create.status, 202);
    assert.equal(create.body.request.status, 'requested');
    const id = create.body.request.requestId as string;
    assert.equal((await api('', owner.token, payload)).body.request.requestId, id);
    const action = { requestId: id, expectedStatus: 'requested' };
    assert.equal((await api('/confirm', staff.token, action)).status, 404);
    assert.equal((await api('/cancel', staff.token, action)).status, 404);
    const direct = await staff.client.from('account_deletion_requests').select('id');
    assert.equal(direct.error?.code, '42501');
    const rpc = await staff.client.rpc('bff_confirm_account_deletion_request', { p_actor_id: state.owner.id, p_request_id: id, p_expected_status: 'requested' });
    assert.equal(rpc.error?.code, '42501');
    const secret = createClient(LOCAL_API, keys.SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    assert.equal((await secret.from('account_deletion_requests').select('id')).error?.code, '42501');
    const ownStaff = await api('', staff.token, { ...payload, idempotencyKey: uuid() }); assert.equal(ownStaff.status, 202);
    assert.equal((await api('/cancel', staff.token, { requestId: ownStaff.body.request.requestId, expectedStatus: 'requested' })).status, 200);
    assert.equal(sql(`SELECT account_kind FROM public.account_deletion_requests WHERE id='${ownStaff.body.request.requestId}';`), 'staff');
    preservation();
    writeFileSync(checkpointFile, JSON.stringify({ id }));
    writeFileSync(evidenceFile, JSON.stringify({ checks: ['real Auth sign-in', 'anonymous denied', 'real service RPC creates request', 'idempotent create', 'staff cross-actor confirm/cancel denied', 'authenticated table/RPC denied', 'secret-key direct table access denied', 'staff self-request withdraws independently'], phases: ['before-restart'], preservation: localDeletionPreservationProof() }, null, 2));
  } else {
    const { id } = JSON.parse(readFileSync(checkpointFile, 'utf8')) as { id: string };
    const evidence = JSON.parse(readFileSync(evidenceFile, 'utf8')) as { checks: string[]; phases: string[]; completedAt?: string };
    const current = await api('', owner.token);
    assert.equal(current.status, 200); assert.equal(current.body.request.requestId, id); assert.equal(current.body.request.status, 'requested');
    if (phase === 'finish') {
      await ageSyntheticSession(owner.token);
      const refreshed = await owner.client.auth.refreshSession({ refresh_token: owner.refreshToken });
      assert.ok(!refreshed.error && refreshed.data.session);
      const stale = refreshed.data.session.access_token;
      const confirmation = { requestId: id, expectedStatus: 'requested' };
      const expired = await api('/confirm', stale, confirmation);
      assert.equal(expired.status, 409); assert.equal(expired.body.code, 'recent_reauth_required');
      const reauthenticated = await session('owner');
      assert.equal((await api('/confirm', stale, confirmation)).status, 409, 'another sign-in cannot freshen the old bearer AMR');
      const confirmed = await api('/confirm', reauthenticated.token, confirmation);
      assert.equal(confirmed.status, 200); assert.equal(confirmed.body.request.status, 'identity_confirmed');
      assert.equal((await api('/cancel', reauthenticated.token, confirmation)).status, 409);
      const cancelled = await api('/cancel', reauthenticated.token, { requestId: id, expectedStatus: 'identity_confirmed' });
      assert.equal(cancelled.status, 200); assert.equal(cancelled.body.request.status, 'cancelled');
      assert.equal((await api('', reauthenticated.token)).body.request.status, 'cancelled');
      preservation();
      evidence.checks.push('real refreshed token with old AMR denied', 'new sign-in does not freshen old bearer', 'real password reauth enables confirm', 'stale cancellation denied', 'withdrawal persisted through real RPC', 'no cleanup or operational/Auth deletion');
      evidence.completedAt = new Date().toISOString();
    } else { evidence.checks.push(`${phase}: request and identity persisted`); preservation(); }
    evidence.phases.push(phase);
    writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));
  }
  console.log(`PASS real Supabase deletion integration: ${phase}; auth/profile/workspace counts unchanged; cleanup never started`);
}
void main().catch(error => { console.error('FAIL local deletion integration:', error instanceof assert.AssertionError ? error.message : 'local dependency unavailable'); process.exitCode = 1; });
