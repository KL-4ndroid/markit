import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const migrationPath = join(
  projectRoot,
  'supabase/migrations/050_drain_checklist_toggle_pending_operation.sql'
);
const migrationSource = readFileSync(migrationPath, 'utf8');

function read(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

console.log('\n=== Supabase pending operations drain RPC ===');

runTest('050 migration exists and defines a narrow security definer drain RPC', () => {
  assert.ok(existsSync(migrationPath));
  assert.match(
    migrationSource,
    /CREATE OR REPLACE FUNCTION public\.drain_checklist_toggle_pending_operation\(\s*p_operation_id TEXT\s*\)/m
  );
  assert.match(migrationSource, /RETURNS TEXT/);
  assert.match(migrationSource, /SECURITY DEFINER/);
  assert.match(migrationSource, /SET search_path = public/);
});

runTest('RPC authenticates caller and only lets the pending actor drain the row', () => {
  assert.match(migrationSource, /v_actor_id UUID := auth\.uid\(\)/);
  assert.match(migrationSource, /Authentication required\./);
  assert.match(migrationSource, /operation_id is required\./);
  assert.match(migrationSource, /v_operation\.actor_id <> v_actor_id/);
  assert.match(migrationSource, /Not authorized to drain this pending operation\./);
  assert.doesNotMatch(migrationSource, /\bp_actor_id\b|\bp_role\b|\bp_staff_role\b|\bp_payload\b/);
});

runTest('RPC atomically claims one eligible row and refuses terminal states', () => {
  assert.match(migrationSource, /WHERE po\.operation_id = v_operation_id[\s\S]*FOR UPDATE/);
  assert.match(migrationSource, /v_operation\.status IN \([\s\S]*'synced'[\s\S]*'processing'[\s\S]*'blocked_permission'[\s\S]*'failed_permanent'/);
  assert.match(migrationSource, /v_operation\.status NOT IN \('pending', 'failed_retryable'\)/);
  assert.match(migrationSource, /status = 'processing'/);
  assert.match(migrationSource, /last_error_code = NULL/);
  assert.match(migrationSource, /last_error_message = NULL/);
});

runTest('RPC validates the checklist toggle payload before creating an event', () => {
  assert.match(migrationSource, /v_operation\.operation_type <> 'checklist_item_toggle'/);
  assert.match(migrationSource, /v_operation\.entity_type <> 'checklist_item'/);
  assert.match(migrationSource, /jsonb_typeof\(v_payload\) <> 'object'/);
  assert.match(migrationSource, /v_payload->>'market_id' IS DISTINCT FROM v_operation\.market_id::TEXT/);
  assert.match(migrationSource, /jsonb_typeof\(v_payload->'completed'\) <> 'boolean'/);
  assert.match(migrationSource, /v_payload \? 'text'/);
  assert.match(migrationSource, /v_item_id := trim\(COALESCE\(v_payload->>'itemId', ''\)\)/);
  assert.match(migrationSource, /v_operation\.entity_id <> v_item_id/);
});

runTest('RPC re-checks live owner or active operator/manager permission', () => {
  assert.match(
    migrationSource,
    /FROM public\.markets m[\s\S]*m\.id = v_operation\.market_id[\s\S]*m\.owner_id = v_operation\.actor_id/
  );
  assert.match(
    migrationSource,
    /JOIN public\.staff_relationships sr[\s\S]*sr\.owner_id = m\.owner_id/
  );
  assert.match(migrationSource, /sr\.staff_id = v_operation\.actor_id/);
  assert.match(migrationSource, /sr\.status = 'active'/);
  assert.match(migrationSource, /v_staff_role IS NULL OR v_staff_role NOT IN \('operator', 'manager'\)/);
  assert.match(migrationSource, /status = 'blocked_permission'/);
  assert.match(migrationSource, /last_error_code = 'permission_denied'/);
});

runTest('RPC creates an idempotent checklist_item_updated event from operation_id', () => {
  assert.match(migrationSource, /v_operation_id !~\*/);
  assert.match(migrationSource, /v_event_id := v_operation_id::UUID/);
  assert.match(migrationSource, /FROM public\.events e[\s\S]*WHERE e\.id = v_event_id/);
  assert.match(migrationSource, /v_existing_event\.type = 'checklist_item_updated'/);
  assert.match(migrationSource, /v_existing_event\.payload = v_payload/);
  assert.match(migrationSource, /v_existing_event\.actor_id = v_operation\.actor_id/);
  assert.match(migrationSource, /v_existing_event\.market_id = v_operation\.market_id/);
  assert.match(migrationSource, /INSERT INTO public\.events/);
  assert.match(migrationSource, /'checklist_item_updated'/);
  assert.match(migrationSource, /ON CONFLICT \(id\) DO NOTHING/);
  assert.doesNotMatch(migrationSource, /DO UPDATE SET/);
});

runTest('RPC records metadata and classifies permanent retryable and synced outcomes', () => {
  assert.match(migrationSource, /'source', 'pending_operations'/);
  assert.match(migrationSource, /'pendingOperationId', v_operation\.operation_id/);
  assert.match(migrationSource, /'idempotencyKey', v_operation\.idempotency_key/);
  assert.match(migrationSource, /'drainedAt', NOW\(\)/);
  assert.match(migrationSource, /status = 'synced'/);
  assert.match(migrationSource, /status = 'failed_permanent'/);
  assert.match(migrationSource, /status = 'failed_retryable'/);
  assert.match(migrationSource, /retry_count = retry_count \+ 1/);
  assert.match(migrationSource, /last_error_code = SQLSTATE/);
  assert.match(migrationSource, /last_error_message = SQLERRM/);
});

runTest('050 migration does not widen schema policies flags or runtime wiring', () => {
  for (const forbiddenSql of [
    /CREATE POLICY/i,
    /DROP POLICY/i,
    /ALTER TABLE/i,
    /CREATE OR REPLACE VIEW/i,
    /CREATE TRIGGER/i,
    /DELETE FROM public\.pending_operations/i,
  ]) {
    assert.doesNotMatch(migrationSource, forbiddenSql);
  }

  const runtimeSources = [
    'lib/markets/field-ops-write-router.ts',
    'lib/markets/checklist.ts',
    'lib/markets/field-notes.ts',
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
    'lib/sync/sync-gate-d-flags.ts',
  ]
    .map(read)
    .join('\n');

  assert.doesNotMatch(runtimeSources, /drain_checklist_toggle_pending_operation/);
  assert.doesNotMatch(runtimeSources, /pendingOperationWriteRouting:\s*true/);
});

runTest('RPC grants execute narrowly', () => {
  assert.match(
    migrationSource,
    /REVOKE ALL ON FUNCTION public\.drain_checklist_toggle_pending_operation\(TEXT\)[\s\S]*FROM PUBLIC, anon/
  );
  assert.match(
    migrationSource,
    /GRANT EXECUTE ON FUNCTION public\.drain_checklist_toggle_pending_operation\(TEXT\)[\s\S]*TO authenticated/
  );
});

function main(): void {
  let failed = 0;
  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} pending operations drain RPC tests failed`);
  }
}

main();
