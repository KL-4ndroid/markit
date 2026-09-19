import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/070_enforce_recurring_operations_owner_role.sql'),
  'utf8',
);

assert.match(migration, /CREATE OR REPLACE FUNCTION public\.can_manage_recurring_operations\(\)/);
assert.match(migration, /NOT EXISTS[\s\S]*staff_relationships[\s\S]*staff_id = auth\.uid\(\)[\s\S]*status = 'active'/);
assert.match(migration, /AS RESTRICTIVE[\s\S]*FOR INSERT[\s\S]*recurring_operations_events_owner_only/);
assert.match(migration, /type NOT IN[\s\S]*'venue_created'[\s\S]*'operation_schedule_archived'/);
assert.match(migration, /BEFORE INSERT ON public\.events/);
assert.match(migration, /NEW\.actor_id IS DISTINCT FROM auth\.uid\(\)/);
assert.match(migration, /ERRCODE = '42501'/);
assert.doesNotMatch(migration, /DROP POLICY IF EXISTS "用戶可以插入事件_v3"/);

for (const table of ['venues', 'operation_schedules']) {
  const policies = migration.match(new RegExp(`CREATE POLICY ${table}_owner_`, 'g')) ?? [];
  assert.equal(policies.length, 3);
}

console.log('recurring operations remote owner guard tests passed');
