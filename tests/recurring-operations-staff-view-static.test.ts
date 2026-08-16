import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/069_add_recurring_hybrid_operations.sql'), 'utf8');
const viewStart = migration.indexOf('CREATE OR REPLACE VIEW public.staff_accessible_markets');
assert.ok(viewStart > 0);
const view = migration.slice(viewStart);

for (const column of [
  'venue_id', 'schedule_id', 'session_origin', 'schedule_occurrence_key',
  'schedule_revision', 'schedule_occurrence_state', 'is_schedule_override',
]) {
  assert.match(view, new RegExp(`m\\.${column}`));
}
assert.match(view, /NULL::numeric\(10,2\) AS registration_fee/);
assert.match(view, /NULL::numeric\(10,2\) AS booth_cost/);
assert.match(view, /NULL::numeric\(10,2\) AS total_profit/);
assert.match(view, /JOIN public\.staff_relationships/);
assert.doesNotMatch(view, /JOIN public\.(?:venues|operation_schedules)/);
assert.doesNotMatch(view, /\bdefaults\b/);

console.log('recurring operations staff view static tests passed');
