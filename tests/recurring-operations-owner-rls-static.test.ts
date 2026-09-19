import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/069_add_recurring_hybrid_operations.sql'), 'utf8');
const roleGate = fs.readFileSync(path.join(process.cwd(), 'lib/permissions/role-freshness.ts'), 'utf8');

for (const table of ['venues', 'operation_schedules']) {
  assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`));
  assert.match(migration, new RegExp(`CREATE POLICY ${table}_owner_select`));
  assert.match(migration, new RegExp(`CREATE POLICY ${table}_owner_insert`));
  assert.match(migration, new RegExp(`CREATE POLICY ${table}_owner_update`));
}
assert.doesNotMatch(migration, /CREATE POLICY (?:venues|operation_schedules)_.*delete/i);
assert.match(migration, /WHERE id = v_schedule_id AND owner_id = NEW\.actor_id/);
assert.match(migration, /WHERE id = v_venue_id AND owner_id = NEW\.actor_id/);
assert.match(migration, /schedule venue owner scope mismatch/);

for (const eventType of [
  'venue_created', 'venue_updated', 'venue_archived',
  'operation_schedule_created', 'operation_schedule_updated',
  'operation_schedule_paused', 'operation_schedule_resumed', 'operation_schedule_archived',
]) {
  assert.match(roleGate, new RegExp(`'${eventType}'`));
}

console.log('recurring operations owner RLS static tests passed');
