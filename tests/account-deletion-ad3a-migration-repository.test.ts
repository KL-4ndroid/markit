import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { createAccountDeletionStorageRepository } from '../lib/subscription/account-deletion-storage.server';

const root = process.cwd();
const migrationPath = path.join(root, 'supabase/migrations/071_add_account_deletion_request_foundation.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');
const route = fs.readFileSync(path.join(root, 'app/api/account-deletion/route.ts'), 'utf8');

assert.match(migration, /^BEGIN;/u);
assert.match(migration, /COMMIT;\s*$/u);
assert.doesNotMatch(migration, /ROLLBACK;/u);

for (const table of [
  'account_deletion_requests',
  'account_deletion_cleanup_steps',
  'account_deletion_transition_audit',
]) {
  assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`, 'u'));
  assert.match(migration, new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM PUBLIC, anon, authenticated, service_role;`, 'u'));
}

for (const rpc of [
  'bff_read_account_deletion_request',
  'bff_create_account_deletion_request',
  'bff_claim_account_deletion_lease',
  'bff_record_account_deletion_step',
  'bff_finalize_account_deletion',
  'bff_release_account_deletion_lease',
]) {
  assert.match(migration, new RegExp(`FUNCTION public\\.${rpc}`, 'u'));
  assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${rpc}\\([^;]+\\) TO service_role;`, 'u'));
  assert.doesNotMatch(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${rpc}\\([^;]+\\) TO authenticated;`, 'u'));
}

assert.match(migration, /SECURITY DEFINER SET search_path = ''/u);
assert.match(migration, /REVOKE EXECUTE ON FUNCTION public\.delete_current_user_app_data\(\) FROM authenticated;/u);
assert.match(migration, /EXISTS \(SELECT 1 FROM public\.markets m WHERE m\.owner_id = p_actor_id\)/u);
assert.match(migration, /EXISTS \(SELECT 1 FROM public\.subscription_accounts s WHERE s\.owner_id = p_actor_id\)/u);
assert.match(migration, /WHEN EXISTS \(SELECT 1 FROM public\.staff_relationships sr WHERE sr\.staff_id = p_actor_id\)[\s\S]+ELSE 'owner' END;/u);
assert.match(migration, /active_actor_id uuid,/u);
assert.doesNotMatch(migration, /active_actor_id uuid REFERENCES/u);
assert.doesNotMatch(migration, /p_(owner|staff|email|object_key)_id/u);
assert.match(route, /return createAccountDeletionStorageRepository\(\);/u);

const env = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-publishable-key',
  SUPABASE_SECRET_KEY: `sb_secret_${'a'.repeat(40)}`,
};
const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
let response: unknown = [{
  request_id: '11111111-1111-4111-8111-111111111111',
  status: 'requested',
  safe_error_code: null,
  requested_at: '2026-08-17T00:00:00.000Z',
  updated_at: '2026-08-17T00:00:00.000Z',
  next_action_after: null,
}];

async function main(): Promise<void> {
const repository = createAccountDeletionStorageRepository({
  env,
  createMutationClient: () => ({
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: response, error: null };
    },
  }),
});
assert.ok(repository);

const actorId = '22222222-2222-4222-8222-222222222222';
const status = await repository.readCurrentForActor(actorId) as Record<string, unknown>;
assert.equal(status.requestId, '11111111-1111-4111-8111-111111111111');
assert.deepEqual(calls.at(-1), {
  name: 'bff_read_account_deletion_request',
  args: { p_actor_id: actorId },
});

await repository.createForActor({
  actorId,
  subjectRefHash: 'a'.repeat(64),
  idempotencyHash: 'b'.repeat(64),
  policyRevision: '2026-08-17',
  preflightResolution: 'clean',
});
assert.deepEqual(calls.at(-1), {
  name: 'bff_create_account_deletion_request',
  args: {
    p_actor_id: actorId,
    p_subject_ref_hash: 'a'.repeat(64),
    p_idempotency_hash: 'b'.repeat(64),
    p_policy_revision: '2026-08-17',
    p_preflight_resolution: 'clean',
  },
});

response = { claimed: false };
const firstClaim = await repository.claimLease({
  requestId: '11111111-1111-4111-8111-111111111111',
  workerId: 'worker.ad3a',
  nowMs: Date.parse('2026-08-17T00:00:00.000Z'),
  leaseDurationMs: 30_000,
});
const secondClaim = await repository.claimLease({
  requestId: '11111111-1111-4111-8111-111111111111',
  workerId: 'worker.ad3b',
  nowMs: Date.parse('2026-08-17T00:00:00.000Z'),
  leaseDurationMs: 30_000,
});
assert.deepEqual(firstClaim, { claimed: false, leaseToken: null, snapshot: null });
assert.deepEqual(secondClaim, firstClaim);

assert.equal(createAccountDeletionStorageRepository({
  env: { ...env, NEXT_PUBLIC_SUPABASE_URL: 'https://remote.example.test', SUPABASE_SECRET_KEY: 'bad' },
  createMutationClient: () => { throw new Error('must not run'); },
}), null);

console.log('account deletion AD3A migration/repository guardrails passed');
}

void main();
