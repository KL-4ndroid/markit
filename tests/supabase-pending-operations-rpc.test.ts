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
  'supabase/migrations/049_enqueue_checklist_toggle_pending_operation.sql'
);
const migrationSource = readFileSync(migrationPath, 'utf8');

function read(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

runTest('049 migration exists and defines a narrow security definer RPC', () => {
  assert.ok(existsSync(migrationPath));
  assert.match(
    migrationSource,
    /CREATE OR REPLACE FUNCTION public\.enqueue_checklist_toggle_pending_operation\(\s*p_operation_id TEXT,\s*p_market_id UUID,\s*p_item_id TEXT,\s*p_completed BOOLEAN,\s*p_idempotency_key TEXT\s*\)/m
  );
  assert.match(migrationSource, /RETURNS TEXT/);
  assert.match(migrationSource, /SECURITY DEFINER/);
  assert.match(migrationSource, /SET search_path = public/);
});

runTest('RPC validates authenticated actor and required checklist toggle inputs', () => {
  for (const requiredText of [
    'v_actor_id UUID := auth.uid()',
    'Authentication required.',
    'operation_id is required.',
    'market_id is required.',
    'item_id is required.',
    'completed is required.',
    'idempotency_key is required.',
  ]) {
    assert.ok(
      migrationSource.includes(requiredText),
      `Expected validation text in migration: ${requiredText}`
    );
  }

  assert.match(migrationSource, /USING ERRCODE = '42501'/);
  assert.match(migrationSource, /USING ERRCODE = '22023'/);
});

runTest('RPC re-checks owner or active operator/manager permission from live tables', () => {
  assert.match(
    migrationSource,
    /FROM public\.markets m[\s\S]*m\.id = p_market_id[\s\S]*m\.owner_id = v_actor_id/
  );
  assert.match(
    migrationSource,
    /JOIN public\.staff_relationships sr[\s\S]*sr\.owner_id = m\.owner_id/
  );
  assert.match(migrationSource, /sr\.staff_id = v_actor_id/);
  assert.match(migrationSource, /sr\.status = 'active'/);
  assert.match(migrationSource, /v_staff_role IS NULL OR v_staff_role NOT IN \('operator', 'manager'\)/);
  assert.doesNotMatch(migrationSource, /'viewer'/);
});

runTest('RPC only enqueues checklist toggle pending operations', () => {
  assert.match(migrationSource, /INSERT INTO public\.pending_operations/);
  assert.match(migrationSource, /'checklist_item_toggle'/);
  assert.match(migrationSource, /'checklist_item'/);
  assert.match(migrationSource, /'itemId', v_item_id/);
  assert.match(migrationSource, /'completed', p_completed/);

  for (const blockedType of [
    'field_note_create',
    'field_note_update',
    'field_note_delete',
    'checklist_item_create',
    'checklist_item_update',
    'checklist_item_delete',
  ]) {
    assert.doesNotMatch(migrationSource, new RegExp(`'${blockedType}'`));
  }
});

runTest('RPC builds role snapshot server-side and does not trust client role inputs', () => {
  assert.match(migrationSource, /jsonb_build_object\([\s\S]*'isOwner', true/);
  assert.match(migrationSource, /jsonb_build_object\([\s\S]*'isOwner', false/);
  assert.match(migrationSource, /'staffRole', v_staff_role/);
  assert.match(migrationSource, /'canToggleChecklistItem'/);

  for (const forbiddenClientInput of [
    'p_role',
    'p_staff_role',
    'p_role_snapshot',
    'p_capabilities',
  ]) {
    assert.doesNotMatch(
      migrationSource,
      new RegExp(`\\b${forbiddenClientInput}\\b`),
      `RPC must not accept client authority input: ${forbiddenClientInput}`
    );
  }
});

runTest('RPC is idempotent and rejects reused keys with different payloads', () => {
  assert.match(migrationSource, /ON CONFLICT \(actor_id, idempotency_key\) DO NOTHING/);
  assert.match(migrationSource, /RETURNING operation_id INTO v_inserted_operation_id/);
  assert.match(migrationSource, /po\.payload = v_payload/);
  assert.match(
    migrationSource,
    /Idempotency key already used for a different pending operation\./
  );
  assert.doesNotMatch(migrationSource, /DO UPDATE SET/);
});

runTest('049 migration does not change policies tables views or events', () => {
  for (const forbiddenSql of [
    /CREATE POLICY/i,
    /DROP POLICY/i,
    /ALTER TABLE/i,
    /CREATE OR REPLACE VIEW/i,
    /INSERT INTO public\.events/i,
    /UPDATE public\.events/i,
    /DELETE FROM public\.events/i,
  ]) {
    assert.doesNotMatch(migrationSource, forbiddenSql);
  }
});

runTest('RPC grants execute narrowly and remains disconnected from runtime', () => {
  assert.match(
    migrationSource,
    /REVOKE ALL ON FUNCTION public\.enqueue_checklist_toggle_pending_operation\(TEXT, UUID, TEXT, BOOLEAN, TEXT\)[\s\S]*FROM PUBLIC, anon/
  );
  assert.match(
    migrationSource,
    /GRANT EXECUTE ON FUNCTION public\.enqueue_checklist_toggle_pending_operation\(TEXT, UUID, TEXT, BOOLEAN, TEXT\)[\s\S]*TO authenticated/
  );

  const runtimeSources = [
    'lib/markets/field-ops-write-router.ts',
    'lib/markets/field-notes.ts',
    'lib/markets/checklist.ts',
    'components/markets/ChecklistPanel.tsx',
    'components/markets/FieldNotesPanel.tsx',
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
  ]
    .map(read)
    .join('\n');

  assert.doesNotMatch(runtimeSources, /enqueue_checklist_toggle_pending_operation/);
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
    throw new Error(`${failed} pending operations RPC tests failed`);
  }
}

main();
