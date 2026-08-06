import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

const migrationSource = readFileSync(
  join(process.cwd(), 'supabase/migrations/047_add_note_checklist_event_types.sql'),
  'utf-8'
);

console.log('\n=== Supabase note/checklist migration ===');

runTest('allows all note and checklist event types', () => {
  for (const eventType of [
    'field_note_created',
    'field_note_updated',
    'field_note_deleted',
    'checklist_item_created',
    'checklist_item_updated',
    'checklist_item_deleted',
  ]) {
    assert.match(migrationSource, new RegExp(`'${eventType}'`));
  }
});

runTest('preserves existing application event types', () => {
  for (const eventType of [
    'market_created',
    'market_updated',
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',
    'product_created',
    'product_updated',
    'product_deleted',
    'interaction_recorded',
    'interaction_deleted',
    'deal_closed',
    'deal_deleted',
    'settings_updated',
  ]) {
    assert.match(migrationSource, new RegExp(`'${eventType}'`));
  }
});

runTest('only updates the event type constraint', () => {
  assert.match(migrationSource, /DROP CONSTRAINT IF EXISTS events_type_check/i);
  assert.match(migrationSource, /ADD CONSTRAINT events_type_check CHECK/i);
  assert.doesNotMatch(migrationSource, /\bCREATE\s+(OR\s+REPLACE\s+)?VIEW\b/i);
  assert.doesNotMatch(migrationSource, /\bCREATE\s+POLICY\b/i);
  assert.doesNotMatch(migrationSource, /\bDROP\s+POLICY\b/i);
  assert.doesNotMatch(migrationSource, /\bGRANT\b/i);
  assert.doesNotMatch(migrationSource, /\bREVOKE\b/i);
  assert.doesNotMatch(migrationSource, /\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b/i);
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  console.error('Failures:');
  for (const name of failures) console.error(`  - ${name}`);
  process.exit(1);
}
