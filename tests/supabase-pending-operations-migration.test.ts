import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const migrationSource = readProjectFile('supabase/migrations/048_add_pending_operations_schema.sql');
const pendingOperationModelSource = readProjectFile('lib/sync/pending-operation-model.ts');

const productionFiles = [
  'hooks/useSync.ts',
  'lib/sync/sync-push-service.ts',
  'lib/sync/owner-pull-service.ts',
  'lib/sync/staff-pull-service.ts',
  'lib/sync/local-cache-writer.ts',
  'lib/markets/field-notes.ts',
  'lib/markets/checklist.ts',
  'components/markets/FieldNotesPanel.tsx',
  'components/markets/ChecklistPanel.tsx',
  'components/markets/MarketFieldOpsSection.tsx',
];

console.log('\n=== Supabase pending operations migration ===');

runTest('creates pending_operations with the approved local model columns', () => {
  assert.match(migrationSource, /CREATE TABLE IF NOT EXISTS public\.pending_operations/);

  for (const column of [
    'operation_id TEXT PRIMARY KEY',
    'operation_type TEXT NOT NULL',
    'entity_type TEXT NOT NULL',
    'entity_id TEXT NOT NULL',
    'market_id UUID NOT NULL',
    'payload JSONB NOT NULL',
    'idempotency_key TEXT NOT NULL',
    'actor_id UUID NOT NULL',
    'role_snapshot JSONB NOT NULL',
    'status TEXT NOT NULL DEFAULT',
    'retry_count INTEGER NOT NULL DEFAULT 0',
    'last_error_code TEXT',
    'last_error_message TEXT',
    'created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    'updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  ]) {
    assert.match(migrationSource, new RegExp(column.replace(/[()]/g, '\\$&')));
  }
});

runTest('operation type status and entity constraints match the local-only model', () => {
  for (const operationType of [
    'field_note_create',
    'field_note_update',
    'field_note_delete',
    'checklist_item_create',
    'checklist_item_update',
    'checklist_item_delete',
    'checklist_item_toggle',
  ]) {
    assert.match(migrationSource, new RegExp(`'${operationType}'`));
    assert.match(pendingOperationModelSource, new RegExp(`'${operationType}'`));
  }

  for (const entityType of ['field_note', 'checklist_item']) {
    assert.match(migrationSource, new RegExp(`'${entityType}'`));
    assert.match(pendingOperationModelSource, new RegExp(`'${entityType}'`));
  }

  for (const status of [
    'pending',
    'processing',
    'synced',
    'failed_retryable',
    'failed_permanent',
    'blocked_permission',
  ]) {
    assert.match(migrationSource, new RegExp(`'${status}'`));
    assert.match(pendingOperationModelSource, new RegExp(`'${status}'`));
  }
});

runTest('idempotency and retry safety are explicit', () => {
  assert.match(
    migrationSource,
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_operations_actor_idempotency[\s\S]*ON public\.pending_operations\(actor_id, idempotency_key\)/
  );
  assert.match(migrationSource, /retry_count INTEGER NOT NULL DEFAULT 0 CHECK \(retry_count >= 0\)/);
  assert.match(migrationSource, /length\(trim\(idempotency_key\)\) > 0/);
  assert.match(migrationSource, /payload JSONB NOT NULL CHECK \(jsonb_typeof\(payload\) = 'object'\)/);
  assert.match(migrationSource, /role_snapshot JSONB NOT NULL CHECK \(jsonb_typeof\(role_snapshot\) = 'object'\)/);
});

runTest('RLS is enabled and keeps mutation narrow', () => {
  assert.match(migrationSource, /ALTER TABLE public\.pending_operations ENABLE ROW LEVEL SECURITY/);
  assert.match(migrationSource, /pending_operations_select_actor_or_owner/);
  assert.match(migrationSource, /actor_id = auth\.uid\(\)[\s\S]*m\.owner_id = auth\.uid\(\)/);
  assert.match(migrationSource, /pending_operations_insert_actor_market_member/);
  assert.match(migrationSource, /sr\.staff_id = auth\.uid\(\)[\s\S]*sr\.status = 'active'/);
  assert.match(migrationSource, /pending_operations_update_actor_only/);
  assert.match(migrationSource, /REVOKE DELETE ON TABLE public\.pending_operations FROM authenticated/);
  assert.doesNotMatch(migrationSource, /FOR DELETE/i);
});

runTest('migration does not alter existing event sync behavior', () => {
  assert.doesNotMatch(migrationSource, /\bALTER TABLE public\.events\b/i);
  assert.doesNotMatch(migrationSource, /\bCREATE\s+(OR\s+REPLACE\s+)?VIEW\b/i);
  assert.doesNotMatch(migrationSource, /\bstaff_accessible_events\b/i);
  assert.doesNotMatch(migrationSource, /\bUPDATE\s+public\.events\b/i);
  assert.doesNotMatch(migrationSource, /\bDELETE\s+FROM\s+public\.events\b/i);
});

runTest('production runtime still does not import or write pending_operations', () => {
  const matches = productionFiles.filter(file => {
    const source = readProjectFile(file);
    return /pending_operations|pending-operation-model|sync-gate-d-flags/.test(source);
  });

  assert.deepEqual(matches, []);
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
    throw new Error(`${failed} pending operations migration tests failed`);
  }
}

main();
