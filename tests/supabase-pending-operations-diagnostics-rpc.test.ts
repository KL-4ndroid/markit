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
  'supabase/migrations/051_list_owner_pending_operation_diagnostics.sql'
);
const migrationSource = readFileSync(migrationPath, 'utf8');

function read(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

console.log('\n=== Supabase pending operations owner diagnostics RPC ===');

runTest('051 migration exists and defines an owner-only read diagnostics RPC', () => {
  assert.ok(existsSync(migrationPath));
  assert.match(
    migrationSource,
    /CREATE OR REPLACE FUNCTION public\.list_owner_pending_operation_diagnostics\(\s*p_owner_id UUID DEFAULT auth\.uid\(\)\s*\)/m
  );
  assert.match(migrationSource, /RETURNS TABLE/);
  assert.match(migrationSource, /SECURITY DEFINER/);
  assert.match(migrationSource, /SET search_path = public/);
});

runTest('RPC authenticates the caller and forbids owner impersonation', () => {
  assert.match(migrationSource, /v_actor_id UUID := auth\.uid\(\)/);
  assert.match(migrationSource, /v_owner_id UUID := COALESCE\(p_owner_id, auth\.uid\(\)\)/);
  assert.match(migrationSource, /Authentication required\./);
  assert.match(migrationSource, /owner_id is required\./);
  assert.match(migrationSource, /v_owner_id <> v_actor_id/);
  assert.match(migrationSource, /Owner diagnostics can only be read by the authenticated owner\./);
  assert.match(migrationSource, /USING ERRCODE = '42501'/);
});

runTest('RPC restricts rows to markets owned by the authenticated owner', () => {
  assert.match(migrationSource, /FROM public\.pending_operations po/);
  assert.match(migrationSource, /JOIN public\.markets m[\s\S]*ON m\.id = po\.market_id/);
  assert.match(migrationSource, /WHERE m\.owner_id = v_owner_id/);
  assert.doesNotMatch(migrationSource, /staff_relationships|staff_accessible/i);
  assert.doesNotMatch(migrationSource, /sr\.role|operator|manager|viewer/);
});

runTest('RPC returns an explicit redacted diagnostics column list', () => {
  for (const column of [
    'operation_id TEXT',
    'operation_type TEXT',
    'entity_type TEXT',
    'entity_id TEXT',
    'market_id UUID',
    'status TEXT',
    'retry_count INTEGER',
    'actor_id UUID',
    'created_at TIMESTAMPTZ',
    'updated_at TIMESTAMPTZ',
    'last_error_code TEXT',
    'last_error_message TEXT',
    'safe_metadata JSONB',
    'age_bucket TEXT',
    'state_group TEXT',
    'final_event_id UUID',
    'final_event_type TEXT',
    'has_final_event BOOLEAN',
    'final_event_mismatch BOOLEAN',
  ]) {
    assert.match(migrationSource, new RegExp(column.replace(/[()]/g, '\\$&')));
  }

  assert.doesNotMatch(migrationSource, /payload JSONB/);
  assert.doesNotMatch(migrationSource, /role_snapshot JSONB/);
  assert.doesNotMatch(migrationSource, /po\.payload/);
  assert.doesNotMatch(migrationSource, /po\.role_snapshot/);
});

runTest('RPC exposes only approved safe metadata keys from final events', () => {
  assert.match(migrationSource, /jsonb_strip_nulls\(jsonb_build_object/);
  for (const safeKey of ['source', 'idempotencyKey', 'pendingOperationId', 'drainedAt']) {
    assert.match(migrationSource, new RegExp(`'${safeKey}'`));
  }

  for (const forbiddenKey of ['text', 'body', 'payload', 'roleSnapshot', 'cost', 'profit', 'supplier']) {
    assert.doesNotMatch(migrationSource, new RegExp(`'${forbiddenKey}'`, 'i'));
  }
});

runTest('RPC classifies state and final-event mismatch read-only', () => {
  assert.match(migrationSource, /'healthy'/);
  assert.match(migrationSource, /'needs_attention'/);
  assert.match(migrationSource, /'in_progress'/);
  assert.match(migrationSource, /LEFT JOIN public\.events e[\s\S]*po\.operation_id ~\*/);
  assert.match(migrationSource, /THEN po\.operation_id::UUID/);
  assert.match(migrationSource, /e\.id IS NOT NULL AS has_final_event/);
  assert.match(migrationSource, /final_event_mismatch/);
  assert.match(migrationSource, /e\.type = 'checklist_item_updated'/);
});

runTest('051 migration is read-only and does not alter runtime behavior', () => {
  for (const forbiddenSql of [
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+public\./i,
    /\bDELETE\s+FROM\b/i,
    /\bALTER\s+TABLE\b/i,
    /\bCREATE\s+POLICY\b/i,
    /\bDROP\s+POLICY\b/i,
    /\bCREATE\s+(OR\s+REPLACE\s+)?VIEW\b/i,
    /\bCREATE\s+TRIGGER\b/i,
    /\bdrain_checklist_toggle_pending_operation\b/i,
    /\benqueue_checklist_toggle_pending_operation\b/i,
  ]) {
    assert.doesNotMatch(migrationSource, forbiddenSql);
  }

  assert.match(migrationSource, /RETURN QUERY[\s\S]*SELECT/);
});

runTest('RPC grants execute narrowly and is not consumed by app runtime', () => {
  assert.match(
    migrationSource,
    /REVOKE ALL ON FUNCTION public\.list_owner_pending_operation_diagnostics\(UUID\)[\s\S]*FROM PUBLIC, anon/
  );
  assert.match(
    migrationSource,
    /GRANT EXECUTE ON FUNCTION public\.list_owner_pending_operation_diagnostics\(UUID\)[\s\S]*TO authenticated/
  );

  const runtimeSources = [
    'app/recovery/page.tsx',
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
    'lib/sync/local-cache-writer.ts',
    'lib/markets/field-ops-write-router.ts',
    'components/markets/FieldNotesPanel.tsx',
    'components/markets/ChecklistPanel.tsx',
    'components/markets/MarketFieldOpsSection.tsx',
  ]
    .map(read)
    .join('\n');

  assert.doesNotMatch(runtimeSources, /list_owner_pending_operation_diagnostics/);
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
    throw new Error(`${failed} pending operations diagnostics RPC tests failed`);
  }
}

main();
