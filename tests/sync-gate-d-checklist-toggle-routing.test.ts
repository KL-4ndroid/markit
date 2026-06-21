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

const adapterSource = readProjectFile('lib/markets/field-ops-write-router.ts');
const checklistServiceSource = readProjectFile('lib/markets/checklist.ts');
const flagSource = readProjectFile('lib/sync/sync-gate-d-flags.ts');

console.log('\n=== Sync Gate D checklist toggle routing ===');

function functionBody(source: string, functionName: string): string {
  const start = source.indexOf(`export async function ${functionName}`);
  assert.notEqual(start, -1, `Missing function ${functionName}`);

  const next = source.indexOf('\nexport async function ', start + 1);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

runTest('D3c-1 keeps the write-routing flag disabled by default', () => {
  assert.match(flagSource, /pendingOperationWriteRouting:\s*false/);
  assert.match(flagSource, /pendingOperationDrainAfterEnqueue:\s*false/);
  assert.match(flagSource, /process\.env\.NODE_ENV === ['"]production['"]/);
  assert.doesNotMatch(flagSource, /NEXT_PUBLIC|localStorage|sessionStorage/);
});

runTest('only checklist toggle gets the approved routing hint', () => {
  const createBody = functionBody(checklistServiceSource, 'createChecklistItem');
  const updateBody = functionBody(checklistServiceSource, 'updateChecklistItem');
  const toggleBody = functionBody(checklistServiceSource, 'toggleChecklistItem');
  const deleteBody = functionBody(checklistServiceSource, 'deleteChecklistItem');

  assert.match(
    toggleBody,
    /writeFieldOpsEvent\(CHECKLIST_ITEM_UPDATED,[\s\S]*\{ operation: ['"]checklist_toggle['"] \}/
  );
  assert.doesNotMatch(createBody, /\{ operation: ['"]checklist_toggle['"] \}/);
  assert.doesNotMatch(updateBody, /\{ operation: ['"]checklist_toggle['"] \}/);
  assert.doesNotMatch(deleteBody, /\{ operation: ['"]checklist_toggle['"] \}/);
  assert.match(updateBody, /writeFieldOpsEvent\(CHECKLIST_ITEM_UPDATED,\s*payload\)/);
});

runTest('adapter routes to RPC only for checklist toggle when the flag is enabled', () => {
  assert.match(adapterSource, /isSyncGateDFlagEnabled\(['"]pendingOperationWriteRouting['"]\)/);
  assert.match(adapterSource, /options\?\.operation !== ['"]checklist_toggle['"]/);
  assert.match(adapterSource, /type !== ['"]checklist_item_updated['"]/);
  assert.match(adapterSource, /if \('text' in payload\) return null/);
  assert.match(adapterSource, /return ['"]checklist_toggle_pending_operation_rpc['"]/);
});

runTest('adapter uses the approved enqueue RPC and never inserts pending_operations directly', () => {
  assert.match(adapterSource, /supabase\.rpc\(['"]enqueue_checklist_toggle_pending_operation['"]/);
  assert.match(adapterSource, /p_operation_id:\s*operationId/);
  assert.match(adapterSource, /p_market_id:\s*payload\.marketId/);
  assert.match(adapterSource, /p_item_id:\s*payload\.itemId/);
  assert.match(adapterSource, /p_completed:\s*payload\.completed/);
  assert.match(adapterSource, /p_idempotency_key:\s*idempotencyKey/);
  assert.match(adapterSource, /const operationId = generateUUID\(\)/);
  assert.match(adapterSource, /const idempotencyKey = `checklist-toggle:\$\{operationId\}`/);
  assert.doesNotMatch(adapterSource, /\.from\(['"]pending_operations['"]\)/);
  assert.doesNotMatch(adapterSource, /\.insert\(|\.upsert\(|\.update\(|\.delete\(/);
});

runTest('adapter drains only after enqueue succeeds and the dedicated drain flag is enabled', () => {
  assert.match(adapterSource, /const operationId = await enqueueChecklistTogglePendingOperation\(checklistTogglePayload\)/);
  assert.match(
    adapterSource,
    /if \(operationId && isSyncGateDFlagEnabled\(['"]pendingOperationDrainAfterEnqueue['"]\)\)/
  );
  assert.match(adapterSource, /await drainChecklistTogglePendingOperation\(operationId\)/);
  assert.match(adapterSource, /supabase\.rpc\(['"]drain_checklist_toggle_pending_operation['"]/);
  assert.match(adapterSource, /p_operation_id:\s*operationId/);
});

runTest('direct local event write remains primary and RPC failure is non-blocking', () => {
  assert.match(adapterSource, /await recordEvent\(type,\s*payload\)/);
  assert.match(adapterSource, /try \{[\s\S]*enqueueChecklistTogglePendingOperation/);
  assert.match(adapterSource, /catch \(error\) \{[\s\S]*console\.warn/);
  assert.match(adapterSource, /if \(!isSupabaseConfigured\(\)\) return/);
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
    throw new Error(`${failed} checklist toggle routing tests failed`);
  }
}

main();
