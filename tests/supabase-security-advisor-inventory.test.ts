import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const sql = read('supabase/verification/security_advisor_read_only_inventory.sql');
const runbook = read(
  'docs/security/SUPABASE_SECURITY_ADVISOR_INVENTORY_RUNBOOK_2026_08_09.md',
);
const remediation = read(
  'docs/security/SUPABASE_SECURITY_ADVISOR_REMEDIATION_PLAN_2026_08_05.md',
);
const masterPlan = read('docs/LAUNCH_EXECUTION_MASTER_PLAN_2026_08_09.md');
const taskMatrix = read('docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json');

assert.match(sql, /begin;\s*set transaction read only;/i);
assert.match(sql, /rollback;\s*$/i);
assert.doesNotMatch(
  sql,
  /^\s*(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|call|do|copy)\b/gim,
);
assert.doesNotMatch(sql, /\b(?:auth\.users|storage\.objects|public\.events)\b/i);
assert.match(sql, /pg_catalog\.pg_class/);
assert.match(sql, /pg_catalog\.pg_proc/);
assert.match(sql, /pg_catalog\.pg_policy/);
assert.match(sql, /pg_catalog\.pg_trigger/);
assert.match(sql, /pg_catalog\.pg_depend/);
assert.match(sql, /aclexplode/);
assert.match(sql, /security_invoker=true/);
for (const section of [
  'inventory_summary',
  'staff_view',
  'view_select_acl',
  'public_function',
  'rls_policy',
  'function_execute_acl',
  'function_trigger',
  'function_dependency',
]) {
  assert.match(sql, new RegExp(section));
  assert.match(runbook, new RegExp(`\\b${section}\\b`));
}
for (const view of [
  'staff_accessible_events',
  'staff_accessible_markets',
  'staff_accessible_products',
]) {
  assert.match(sql, new RegExp(view));
}
assert.match(remediation, /`SRA-000` is a prerequisite/);
assert.match(runbook, /execution pending manual target access/);
assert.match(runbook, /must not be committed/i);
assert.match(runbook, /Auth leaked-password protection/);
assert.match(masterPlan, /SRA-000 inventory/);
assert.match(taskMatrix, /SEC-SRA000-EXECUTION/);
assert.doesNotMatch(sql, /@capacitor|window\.|document\.|localStorage|indexedDB|Dexie/i);

console.log('PASS SRA-000 inventory is read-only, bounded, and manually targeted');
