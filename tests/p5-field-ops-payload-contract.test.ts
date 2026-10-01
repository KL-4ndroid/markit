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

const eventsSource = readProjectFile('lib/db/events.ts');
const integritySource = readProjectFile('lib/db/integrity.ts');
const fieldNotesServiceSource = readProjectFile('lib/markets/field-notes.ts');
const checklistServiceSource = readProjectFile('lib/markets/checklist.ts');
const roleFreshnessSource = readProjectFile('lib/permissions/role-freshness.ts');

console.log('\n=== P5 field ops payload contract ===');

runTest('recordEvent validates field note payload requirements', () => {
  assert.match(eventsSource, /case ['"]field_note_created['"]:[\s\S]*case ['"]field_note_updated['"]:/);
  assert.match(
    eventsSource,
    /case ['"]field_note_created['"]:[\s\S]*assertMarketId\(record,\s*type\);[\s\S]*assertString\(record\.noteId,\s*['"]noteId['"],\s*type\);[\s\S]*assertString\(record\.text,\s*['"]text['"],\s*type\);[\s\S]*return;/
  );
  assert.match(
    eventsSource,
    /case ['"]field_note_deleted['"]:[\s\S]*assertMarketId\(record,\s*type\);[\s\S]*assertString\(record\.noteId,\s*['"]noteId['"],\s*type\);[\s\S]*return;/
  );
});

runTest('integrity validates field note payload requirements', () => {
  assert.match(
    integritySource,
    /case ['"]field_note_created['"]:[\s\S]*case ['"]field_note_updated['"]:[\s\S]*requireMarketId\(\);[\s\S]*payload\.noteId[\s\S]*missing noteId[\s\S]*payload\.text[\s\S]*missing text[\s\S]*break;/
  );
  assert.match(
    integritySource,
    /case ['"]field_note_deleted['"]:[\s\S]*requireMarketId\(\);[\s\S]*payload\.noteId[\s\S]*missing noteId[\s\S]*break;/
  );
});

runTest('recordEvent validates checklist payload requirements', () => {
  assert.match(
    eventsSource,
    /case ['"]checklist_item_created['"]:[\s\S]*assertMarketId\(record,\s*type\);[\s\S]*assertString\(record\.itemId,\s*['"]itemId['"],\s*type\);[\s\S]*assertString\(record\.text,\s*['"]text['"],\s*type\);[\s\S]*completed must be a boolean[\s\S]*return;/
  );
  assert.match(
    eventsSource,
    /case ['"]checklist_item_updated['"]:[\s\S]*assertMarketId\(record,\s*type\);[\s\S]*assertString\(record\.itemId,\s*['"]itemId['"],\s*type\);[\s\S]*record\.text !== undefined[\s\S]*assertString\(record\.text,\s*['"]text['"],\s*type\);[\s\S]*completed must be a boolean[\s\S]*text or completed is required[\s\S]*return;/
  );
  assert.match(
    eventsSource,
    /case ['"]checklist_item_deleted['"]:[\s\S]*assertMarketId\(record,\s*type\);[\s\S]*assertString\(record\.itemId,\s*['"]itemId['"],\s*type\);[\s\S]*return;/
  );
});

runTest('integrity validates checklist payload requirements', () => {
  assert.match(
    integritySource,
    /case ['"]checklist_item_created['"]:[\s\S]*requireMarketId\(\);[\s\S]*payload\.itemId[\s\S]*missing itemId[\s\S]*payload\.text[\s\S]*missing text[\s\S]*invalid completed[\s\S]*break;/
  );
  assert.match(
    integritySource,
    /case ['"]checklist_item_updated['"]:[\s\S]*requireMarketId\(\);[\s\S]*payload\.itemId[\s\S]*missing itemId[\s\S]*invalid text[\s\S]*invalid completed[\s\S]*missing text or completed[\s\S]*break;/
  );
  assert.match(
    integritySource,
    /case ['"]checklist_item_deleted['"]:[\s\S]*requireMarketId\(\);[\s\S]*payload\.itemId[\s\S]*missing itemId[\s\S]*break;/
  );
});

runTest('field ops services emit only the stable payload fields', () => {
  assert.match(
    fieldNotesServiceSource,
    /writeFieldOpsEvent\(FIELD_NOTE_CREATED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*noteId,[\s\S]*text:\s*assertText\(text\)[\s\S]*\}/
  );
  assert.match(
    fieldNotesServiceSource,
    /writeFieldOpsEvent\(FIELD_NOTE_UPDATED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*noteId,[\s\S]*text:\s*assertText\(text\)[\s\S]*\}/
  );
  assert.match(
    checklistServiceSource,
    /writeFieldOpsEvent\(CHECKLIST_ITEM_CREATED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*itemId,[\s\S]*text:\s*assertText\(text\),[\s\S]*completed,[\s\S]*\}/
  );
  assert.match(
    checklistServiceSource,
    /const payload:\s*Record<string,\s*unknown>\s*=\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*itemId,[\s\S]*\};/
  );
});

runTest('checklist toggle payload stays completed-only for operator capability separation', () => {
  assert.match(
    checklistServiceSource,
    /export async function toggleChecklistItem\([\s\S]*writeFieldOpsEvent\(CHECKLIST_ITEM_UPDATED,\s*\{[\s\S]*market_id:\s*marketId,[\s\S]*itemId,[\s\S]*completed,[\s\S]*\}/
  );
  assert.doesNotMatch(
    checklistServiceSource,
    /export async function toggleChecklistItem[\s\S]*text:\s*assertText/,
    'toggle should not write text'
  );
  assert.match(roleFreshnessSource, /isChecklistCompletedOnlyUpdate/);
  assert.match(roleFreshnessSource, /canToggleChecklistItem/);
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
    throw new Error(`${failed} field ops payload contract tests failed`);
  }
}

main();
