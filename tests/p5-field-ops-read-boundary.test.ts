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

function findFunctionBody(source: string, functionName: string): string {
  const match = new RegExp(`export\\s+async\\s+function\\s+${functionName}\\s*\\(`).exec(source);
  assert.ok(match, `Expected to find ${functionName}`);

  const openBrace = source.indexOf('{', match.index);
  assert.ok(openBrace >= 0, `Expected ${functionName} to have a body`);

  let depth = 0;
  for (let index = openBrace; index < source.length; index++) {
    const char = source[index];
    if (char === '{') depth++;
    if (char === '}') depth--;
    if (depth === 0) {
      return source.slice(openBrace, index + 1);
    }
  }

  throw new Error(`Could not parse ${functionName}`);
}

const fieldNotesSource = readProjectFile('lib/markets/field-notes.ts');
const checklistSource = readProjectFile('lib/markets/checklist.ts');
const fieldNotesReadBody = findFunctionBody(fieldNotesSource, 'getActiveFieldNotesForMarket');
const checklistReadBody = findFunctionBody(checklistSource, 'getActiveChecklistItemsForMarket');

const readBodies = [
  ['field notes read model', fieldNotesReadBody],
  ['checklist read model', checklistReadBody],
] as const;

console.log('\n=== P5 field ops read boundary ===');

runTest('field ops read models rebuild from local events only', () => {
  for (const [label, body] of readBodies) {
    assert.match(body, /if \(!marketId\) return \[\]/, label);
    assert.match(body, /await db\.events\.toArray\(\)/, label);
    assert.match(body, /\.sort\(\(a,\s*b\) => a\.timestamp - b\.timestamp\)/, label);
    assert.match(body, /getEventMarketId\(event\) !== marketId/, label);
    assert.doesNotMatch(body, /recordEvent\(/, label);
  }
});

runTest('field ops read models do not consume cloud sync or Gate D infrastructure', () => {
  for (const [label, source] of [
    ['field notes service', fieldNotesSource],
    ['checklist service', checklistSource],
  ] as const) {
    assert.doesNotMatch(source, /@\/lib\/supabase|supabase/, label);
    assert.doesNotMatch(source, /@\/hooks\/useSync|@\/lib\/sync\//, label);
    assert.doesNotMatch(source, /sync-gate-d-flags|SYNC_GATE_D_FLAGS|isSyncGateDFlagEnabled/, label);
    assert.doesNotMatch(source, /pending-operation-model|PendingOperation|pending_operations/, label);
    assert.doesNotMatch(source, /cache-replacement-preview|replaceCache|previewReplace/i, label);
    assert.doesNotMatch(source, /process\.env|NEXT_PUBLIC|localStorage|sessionStorage/, label);
  }
});

runTest('field notes read model applies create update delete events in order', () => {
  assert.match(fieldNotesReadBody, /const notes = new Map<string,\s*FieldNote>\(\)/);
  assert.match(fieldNotesReadBody, /event\.type === FIELD_NOTE_CREATED[\s\S]*notes\.set\(noteId/);
  assert.match(fieldNotesReadBody, /event\.type === FIELD_NOTE_UPDATED[\s\S]*notes\.set\(noteId/);
  assert.match(fieldNotesReadBody, /event\.type === FIELD_NOTE_DELETED[\s\S]*notes\.delete\(noteId\)/);
  assert.match(fieldNotesReadBody, /actorId:\s*event\.actor_id/);
  assert.match(fieldNotesReadBody, /return Array\.from\(notes\.values\(\)\)\.sort\(\(a,\s*b\) => b\.updatedAt - a\.updatedAt\)/);
});

runTest('checklist read model applies create update delete events in order', () => {
  assert.match(checklistReadBody, /const items = new Map<string,\s*ChecklistItem>\(\)/);
  assert.match(checklistReadBody, /event\.type === CHECKLIST_ITEM_CREATED[\s\S]*items\.set\(itemId/);
  assert.match(checklistReadBody, /event\.type === CHECKLIST_ITEM_UPDATED[\s\S]*items\.set\(itemId/);
  assert.match(checklistReadBody, /event\.type === CHECKLIST_ITEM_DELETED[\s\S]*items\.delete\(itemId\)/);
  assert.match(checklistReadBody, /completed:\s*payload\.completed === true/);
  assert.match(checklistReadBody, /typeof payload\.completed === ['"]boolean['"] \? payload\.completed : existing\.completed/);
  assert.match(checklistReadBody, /actorId:\s*event\.actor_id/);
  assert.match(checklistReadBody, /if \(a\.completed !== b\.completed\) return a\.completed \? 1 : -1/);
});

runTest('field ops read models ignore malformed or unrelated events without throwing', () => {
  assert.match(fieldNotesReadBody, /if \(!isFieldNoteEvent\(event\)\) continue/);
  assert.match(fieldNotesReadBody, /if \(!noteId\) continue/);
  assert.match(fieldNotesReadBody, /if \(!existing\) continue/);

  assert.match(checklistReadBody, /if \(!isChecklistEvent\(event\)\) continue/);
  assert.match(checklistReadBody, /if \(!itemId\) continue/);
  assert.match(checklistReadBody, /if \(!existing\) continue/);
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
    throw new Error(`${failed} field ops read boundary tests failed`);
  }
}

main();
