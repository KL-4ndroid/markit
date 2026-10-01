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
const fieldNotesServiceSource = readProjectFile('lib/markets/field-notes.ts');
const checklistServiceSource = readProjectFile('lib/markets/checklist.ts');

console.log('\n=== Sync Gate D gated adapter ===');

runTest('adapter reads the disabled write-routing flag and keeps direct route as fallback', () => {
  assert.match(adapterSource, /isSyncGateDFlagEnabled\(['"]pendingOperationWriteRouting['"]\)/);
  assert.match(
    adapterSource,
    /export type FieldOpsWriteRoute = ['"]direct_event['"] \| ['"]checklist_toggle_pending_operation_rpc['"]/
  );
  assert.match(adapterSource, /return ['"]direct_event['"]/);
  assert.match(adapterSource, /return ['"]checklist_toggle_pending_operation_rpc['"]/);
  assert.doesNotMatch(adapterSource, /pending-operation-model/);
});

runTest('adapter keeps direct recordEvent primary and only uses approved RPCs for checklist toggle', () => {
  assert.match(adapterSource, /import \{ recordEvent \} from ['"]@\/lib\/db\/events['"]/);
  assert.match(adapterSource, /await recordEvent\(type,\s*payload\)/);
  assert.match(adapterSource, /supabase\.rpc\(['"]enqueue_checklist_toggle_pending_operation['"]/);
  assert.match(adapterSource, /supabase\.rpc\(['"]drain_checklist_toggle_pending_operation['"]/);
  assert.match(adapterSource, /isSyncGateDFlagEnabled\(['"]pendingOperationDrainAfterEnqueue['"]\)/);
  assert.doesNotMatch(adapterSource, /\.from\(['"]pending_operations['"]\)/);
  assert.doesNotMatch(adapterSource, /\.insert\(|\.upsert\(|\.update\(|\.delete\(/);
});

runTest('field ops services call the adapter instead of reading Gate D flags directly', () => {
  for (const [label, source] of [
    ['field notes service', fieldNotesServiceSource],
    ['checklist service', checklistServiceSource],
  ] as const) {
    assert.match(source, /writeFieldOpsEvent/);
    assert.doesNotMatch(source, /sync-gate-d-flags|isSyncGateDFlagEnabled|SYNC_GATE_D_FLAGS/, label);
    assert.doesNotMatch(source, /pending_operations|pending-operation-model/, label);
    assert.doesNotMatch(source, /@\/lib\/supabase|supabase/, label);
  }
});

runTest('field ops payloads remain stable through the adapter boundary', () => {
  assert.match(
    fieldNotesServiceSource,
    /writeFieldOpsEvent\(FIELD_NOTE_CREATED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*noteId,[\s\S]*text:\s*assertText\(text\)/
  );
  assert.match(
    checklistServiceSource,
    /writeFieldOpsEvent\(CHECKLIST_ITEM_CREATED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*itemId,[\s\S]*text:\s*assertText\(text\),[\s\S]*completed/
  );
  assert.match(
    checklistServiceSource,
    /writeFieldOpsEvent\(CHECKLIST_ITEM_UPDATED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*itemId,[\s\S]*completed/
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
    throw new Error(`${failed} disabled adapter tests failed`);
  }
}

main();
