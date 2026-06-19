import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    failures.push(name);
    failed++;
  }
}

const fieldNotesSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/lib/markets/field-notes.ts',
  'utf-8'
);
const fieldNotesPanelSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/components/markets/FieldNotesPanel.tsx',
  'utf-8'
);
const staffMarketDetailSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/components/markets/StaffMarketDetailView.tsx',
  'utf-8'
);
const dailyTransactionLogSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/components/markets/DailyTransactionLog.tsx',
  'utf-8'
);
const eventDeletionSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/lib/markets/event-deletion-service.ts',
  'utf-8'
);
const roleFreshnessSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/lib/permissions/role-freshness.ts',
  'utf-8'
);
const staffPreflightSource = readFileSync(
  'C:/Users/chean/Documents/Codex/2026-05-24/github-plugin-github-openai-curated/markit-master/lib/sync/staff-event-preflight.ts',
  'utf-8'
);

console.log('\n=== P5 field notes ===');

runTest('field note service records event-sourced create/update/delete events', () => {
  assert.match(fieldNotesSource, /FIELD_NOTE_CREATED\s*=\s*['"]field_note_created['"]/);
  assert.match(fieldNotesSource, /FIELD_NOTE_UPDATED\s*=\s*['"]field_note_updated['"]/);
  assert.match(fieldNotesSource, /FIELD_NOTE_DELETED\s*=\s*['"]field_note_deleted['"]/);
  assert.match(fieldNotesSource, /recordEvent\(FIELD_NOTE_CREATED/);
  assert.match(fieldNotesSource, /recordEvent\(FIELD_NOTE_UPDATED/);
  assert.match(fieldNotesSource, /recordEvent\(FIELD_NOTE_DELETED/);
});

runTest('field note update/delete checks existence without own-record bypass', () => {
  assert.match(fieldNotesSource, /assertFieldNoteExists/);
  assert.match(fieldNotesSource, /Field note not found/);
  assert.doesNotMatch(fieldNotesSource, /note\.actorId !== userId/);
  assert.doesNotMatch(fieldNotesSource, /Only the note creator can edit or delete/);
});

runTest('role freshness maps field note events to field-note management', () => {
  assert.match(roleFreshnessSource, /field_note_created:\s*['"]canManageFieldNotes['"]/);
  assert.match(roleFreshnessSource, /field_note_updated:\s*['"]canManageFieldNotes['"]/);
  assert.match(roleFreshnessSource, /field_note_deleted:\s*['"]canManageFieldNotes['"]/);
});

runTest('staff sync preflight treats field notes as market-scoped', () => {
  assert.match(staffPreflightSource, /field_note_created/);
  assert.match(staffPreflightSource, /field_note_updated/);
  assert.match(staffPreflightSource, /field_note_deleted/);
});

runTest('staff market detail renders FieldNotesPanel with capability gates', () => {
  assert.match(staffMarketDetailSource, /import \{ FieldNotesPanel \}/);
  assert.match(staffMarketDetailSource, /canCreateFieldNote/);
  assert.match(staffMarketDetailSource, /canEditOwnSameDayRecord/);
  assert.match(staffMarketDetailSource, /canDeleteOwnSameDayRecord/);
  assert.match(staffMarketDetailSource, /<FieldNotesPanel/);
});

runTest('field note panel calls create/update/delete service functions', () => {
  assert.match(fieldNotesPanelSource, /createFieldNote/);
  assert.match(fieldNotesPanelSource, /updateFieldNote/);
  assert.match(fieldNotesPanelSource, /deleteFieldNote/);
  assert.match(fieldNotesPanelSource, /user\?\.id === note\.actorId/);
});

runTest('staff daily log deletion is scoped by actor and same-day rules', () => {
  assert.match(eventDeletionSource, /ownActorId\?:\s*string/);
  assert.match(eventDeletionSource, /sameDayOnly\?:\s*boolean/);
  assert.match(eventDeletionSource, /assertOwnEventDeletionAllowed/);
  assert.match(eventDeletionSource, /Only the creator can delete this event/);
  assert.match(eventDeletionSource, /Only same-day events can be deleted in this context/);
  assert.match(dailyTransactionLogSource, /deleteActorId\?:\s*string/);
  assert.match(dailyTransactionLogSource, /deleteSameDayOnly\?:\s*boolean/);
  assert.match(dailyTransactionLogSource, /ownActorId:\s*deleteActorId/);
  assert.match(dailyTransactionLogSource, /sameDayOnly:\s*deleteSameDayOnly/);
  assert.match(staffMarketDetailSource, /deleteActorId=\{deleteActorId\}/);
  assert.match(staffMarketDetailSource, /deleteSameDayOnly=\{canDeleteOwnRecord\}/);
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error('Failures:');
  for (const name of failures) console.error(`  - ${name}`);
  process.exit(1);
}
