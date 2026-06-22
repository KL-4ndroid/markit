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
  'supabase/migrations/052_recover_stale_processing_pending_operation.sql'
);
const migrationSource = readFileSync(migrationPath, 'utf8');

function read(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

console.log('\n=== Supabase pending operations stale recovery RPC ===');

runTest('052 migration exists and defines a narrow stale processing recovery RPC', () => {
  assert.ok(existsSync(migrationPath));
  assert.match(
    migrationSource,
    /CREATE OR REPLACE FUNCTION public\.recover_stale_processing_pending_operation\(\s*p_operation_id TEXT\s*\)/m
  );
  assert.match(migrationSource, /RETURNS TEXT/);
  assert.match(migrationSource, /SECURITY DEFINER/);
  assert.match(migrationSource, /SET search_path = public/);
});

runTest('RPC authenticates caller and restricts recovery to market owner', () => {
  assert.match(migrationSource, /v_actor_id UUID := auth\.uid\(\)/);
  assert.match(migrationSource, /Authentication required\./);
  assert.match(migrationSource, /operation_id is required\./);
  assert.match(
    migrationSource,
    /FROM public\.markets m[\s\S]*m\.id = v_operation\.market_id[\s\S]*m\.owner_id = v_actor_id/
  );
  assert.match(
    migrationSource,
    /Only the market owner can recover stale processing pending operations\./
  );
  assert.doesNotMatch(migrationSource, /staff_relationships|operator|manager|viewer/i);
  assert.doesNotMatch(migrationSource, /\bp_actor_id\b|\bp_role\b|\bp_staff_role\b|\bp_payload\b/);
});

runTest('RPC locks exactly one row and only processes stale processing status', () => {
  assert.match(migrationSource, /WHERE po\.operation_id = v_operation_id[\s\S]*FOR UPDATE/);
  assert.match(migrationSource, /v_operation\.status <> 'processing'/);
  assert.match(migrationSource, /Only processing pending operations can be recovered\./);
  assert.match(migrationSource, /v_operation\.updated_at >= NOW\(\) - INTERVAL '15 minutes'/);
  assert.match(migrationSource, /Processing pending operation is not stale\./);
  assert.doesNotMatch(migrationSource, /LIMIT\s+\d+/i);
});

runTest('RPC inspects final event before changing state and never creates events', () => {
  assert.match(migrationSource, /v_operation_id ~\*/);
  assert.match(migrationSource, /v_event_id := v_operation_id::UUID/);
  assert.match(migrationSource, /FROM public\.events e[\s\S]*WHERE e\.id = v_event_id/);
  assert.doesNotMatch(migrationSource, /INSERT INTO public\.events/i);
  assert.doesNotMatch(migrationSource, /ON CONFLICT/i);
});

runTest('RPC classifies matching final event as synced without retrying', () => {
  assert.match(migrationSource, /v_operation\.operation_type = 'checklist_item_toggle'/);
  assert.match(migrationSource, /v_operation\.entity_type = 'checklist_item'/);
  assert.match(migrationSource, /v_existing_event\.type = 'checklist_item_updated'/);
  assert.match(migrationSource, /v_existing_event\.payload = v_operation\.payload/);
  assert.match(migrationSource, /v_existing_event\.actor_id = v_operation\.actor_id/);
  assert.match(migrationSource, /v_existing_event\.market_id = v_operation\.market_id/);
  assert.match(migrationSource, /status = 'synced'[\s\S]*last_error_code = NULL[\s\S]*last_error_message = NULL/);
  assert.match(migrationSource, /RETURN 'synced'/);
});

runTest('RPC classifies mismatched final event as permanent collision', () => {
  assert.match(migrationSource, /status = 'failed_permanent'/);
  assert.match(migrationSource, /last_error_code = 'event_id_collision'/);
  assert.match(migrationSource, /A different event already uses this operation_id/);
  assert.match(migrationSource, /RETURN 'failed_permanent'/);
});

runTest('RPC resets missing final event to retryable without draining in same action', () => {
  assert.match(migrationSource, /status = 'failed_retryable'/);
  assert.match(migrationSource, /retry_count = retry_count \+ 1/);
  assert.match(migrationSource, /last_error_code = 'stale_processing_reset'/);
  assert.match(migrationSource, /Stale processing operation reset to retryable without draining/);
  assert.match(migrationSource, /RETURN 'failed_retryable'/);
  assert.doesNotMatch(migrationSource, /\bdrain_checklist_toggle_pending_operation\b/i);
  assert.doesNotMatch(migrationSource, /\benqueue_checklist_toggle_pending_operation\b/i);
});

runTest('052 migration does not widen schema policies flags cleanup or runtime behavior', () => {
  for (const forbiddenSql of [
    /CREATE POLICY/i,
    /DROP POLICY/i,
    /ALTER TABLE/i,
    /CREATE OR REPLACE VIEW/i,
    /CREATE TRIGGER/i,
    /DELETE FROM public\.pending_operations/i,
    /\bUPDATE\s+public\.events\b/i,
  ]) {
    assert.doesNotMatch(migrationSource, forbiddenSql);
  }

  const runtimeSources = [
    'app/recovery/page.tsx',
    'components/common/OwnerPendingOperationDiagnosticsPanel.tsx',
    'lib/sync/owner-pending-operation-diagnostics.ts',
    'lib/markets/field-ops-write-router.ts',
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
    'lib/sync/local-cache-writer.ts',
  ]
    .map(read)
    .join('\n');

  assert.doesNotMatch(runtimeSources, /recover_stale_processing_pending_operation/);
});

runTest('RPC grants execute narrowly', () => {
  assert.match(
    migrationSource,
    /REVOKE ALL ON FUNCTION public\.recover_stale_processing_pending_operation\(TEXT\)[\s\S]*FROM PUBLIC, anon/
  );
  assert.match(
    migrationSource,
    /GRANT EXECUTE ON FUNCTION public\.recover_stale_processing_pending_operation\(TEXT\)[\s\S]*TO authenticated/
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
    throw new Error(`${failed} pending operations stale recovery RPC tests failed`);
  }
}

main();
