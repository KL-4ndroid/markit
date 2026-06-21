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

const fieldNotesServiceSource = readProjectFile('lib/markets/field-notes.ts');
const checklistServiceSource = readProjectFile('lib/markets/checklist.ts');
const fieldOpsWriteRouterSource = readProjectFile('lib/markets/field-ops-write-router.ts');
const fieldNotesPanelSource = readProjectFile('components/markets/FieldNotesPanel.tsx');
const checklistPanelSource = readProjectFile('components/markets/ChecklistPanel.tsx');
const marketFieldOpsSectionSource = readProjectFile('components/markets/MarketFieldOpsSection.tsx');

const fieldOpsServiceSources = [
  ['field notes service', fieldNotesServiceSource],
  ['checklist service', checklistServiceSource],
] as const;

const fieldOpsComponentSources = [
  ['field notes panel', fieldNotesPanelSource],
  ['checklist panel', checklistPanelSource],
  ['market field ops section', marketFieldOpsSectionSource],
] as const;

console.log('\n=== P5 field ops write boundary ===');

runTest('field ops services keep direct event writes behind a service boundary', () => {
  assert.match(fieldNotesServiceSource, /import \{ writeFieldOpsEvent \} from ['"]@\/lib\/markets\/field-ops-write-router['"]/);
  assert.match(checklistServiceSource, /import \{ writeFieldOpsEvent \} from ['"]@\/lib\/markets\/field-ops-write-router['"]/);
  assert.match(fieldOpsWriteRouterSource, /import \{ recordEvent \} from ['"]@\/lib\/db\/events['"]/);
  assert.match(fieldOpsWriteRouterSource, /await recordEvent\(type,\s*payload\)/);

  assert.match(fieldNotesServiceSource, /export async function createFieldNote/);
  assert.match(fieldNotesServiceSource, /export async function updateFieldNote/);
  assert.match(fieldNotesServiceSource, /export async function deleteFieldNote/);

  assert.match(checklistServiceSource, /export async function createChecklistItem/);
  assert.match(checklistServiceSource, /export async function updateChecklistItem/);
  assert.match(checklistServiceSource, /export async function toggleChecklistItem/);
  assert.match(checklistServiceSource, /export async function deleteChecklistItem/);
});

runTest('field ops services do not consume Gate D or pending operation infrastructure', () => {
  for (const [label, source] of fieldOpsServiceSources) {
    assert.doesNotMatch(source, /sync-gate-d-flags|SYNC_GATE_D_FLAGS|isSyncGateDFlagEnabled/, label);
    assert.doesNotMatch(source, /pending-operation-model|PendingOperation|pending_operations/, label);
    assert.doesNotMatch(source, /cache-replacement-preview|replaceCache|previewReplace/i, label);
  }
  assert.match(fieldOpsWriteRouterSource, /isSyncGateDFlagEnabled\(['"]pendingOperationWriteRouting['"]\)/);
  assert.doesNotMatch(fieldOpsWriteRouterSource, /pending-operation-model|PendingOperation|pending_operations/);
});

runTest('field ops services do not bypass the event abstraction with cloud or sync imports', () => {
  for (const [label, source] of fieldOpsServiceSources) {
    assert.doesNotMatch(source, /@\/lib\/supabase|supabase/, label);
    assert.doesNotMatch(source, /@\/hooks\/useSync|@\/lib\/sync\//, label);
    assert.doesNotMatch(source, /process\.env|NEXT_PUBLIC|localStorage|sessionStorage/, label);
  }
  assert.doesNotMatch(fieldOpsWriteRouterSource, /@\/lib\/supabase|supabase/);
});

runTest('field ops panels call services rather than direct event writers', () => {
  assert.match(
    fieldNotesPanelSource,
    /from ['"]@\/lib\/markets\/field-notes['"][\s\S]*createFieldNote[\s\S]*updateFieldNote[\s\S]*deleteFieldNote/
  );
  assert.match(
    checklistPanelSource,
    /from ['"]@\/lib\/markets\/checklist['"][\s\S]*createChecklistItem[\s\S]*toggleChecklistItem[\s\S]*updateChecklistItem[\s\S]*deleteChecklistItem/
  );

  for (const [label, source] of fieldOpsComponentSources) {
    assert.doesNotMatch(source, /recordEvent\(/, label);
    assert.doesNotMatch(source, /@\/lib\/db\/events/, label);
    assert.doesNotMatch(source, /pending-operation-model|sync-gate-d-flags|cache-replacement-preview/, label);
  }
});

runTest('checklist toggle remains a completed-only service operation', () => {
  assert.match(
    checklistServiceSource,
    /export async function toggleChecklistItem\([\s\S]*completed:\s*boolean[\s\S]*writeFieldOpsEvent\(CHECKLIST_ITEM_UPDATED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*itemId,[\s\S]*completed,[\s\S]*\}/
  );
  assert.doesNotMatch(
    checklistServiceSource,
    /export async function toggleChecklistItem[\s\S]*text:/,
    'toggle service must not write checklist text'
  );
});

runTest('field note and checklist writes keep stable market-scoped event payloads', () => {
  assert.match(
    fieldNotesServiceSource,
    /writeFieldOpsEvent\(FIELD_NOTE_CREATED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*noteId,[\s\S]*text:\s*assertText\(text\)/
  );
  assert.match(
    fieldNotesServiceSource,
    /writeFieldOpsEvent\(FIELD_NOTE_UPDATED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*noteId,[\s\S]*text:\s*assertText\(text\)/
  );
  assert.match(
    fieldNotesServiceSource,
    /writeFieldOpsEvent\(FIELD_NOTE_DELETED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*noteId/
  );
  assert.match(
    checklistServiceSource,
    /writeFieldOpsEvent\(CHECKLIST_ITEM_CREATED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*itemId,[\s\S]*text:\s*assertText\(text\),[\s\S]*completed/
  );
  assert.match(
    checklistServiceSource,
    /writeFieldOpsEvent\(CHECKLIST_ITEM_UPDATED,\s*payload\)/
  );
  assert.match(
    checklistServiceSource,
    /writeFieldOpsEvent\(CHECKLIST_ITEM_DELETED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*itemId/
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
    throw new Error(`${failed} field ops write boundary tests failed`);
  }
}

main();
