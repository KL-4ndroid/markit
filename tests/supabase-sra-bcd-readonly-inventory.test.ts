import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const path = 'supabase/verification/sra_bcd_production_read_only_inventory.sql';
const sql = readFileSync(join(root, path), 'utf8');

assert.match(sql, /^\s*--[\s\S]*?BEGIN;\s*SET TRANSACTION READ ONLY;/iu);
assert.match(sql, /SET LOCAL statement_timeout = '15s';/u);
assert.match(sql, /SET LOCAL lock_timeout = '3s';/u);
assert.match(sql, /ROLLBACK;\s*$/u);
assert.doesNotMatch(
  sql,
  /^\s*(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CALL|DO|COPY|COMMIT)\b/gimu,
);
assert.doesNotMatch(sql, /\b(?:auth\.users|storage\.objects|public\.events)\b/iu);

for (const marker of [
  'sra_b_insert_policy',
  'sra_c_staff_view',
  'sra_c_view_dependency',
  'transactionReadOnly',
  'migrationLedgerPresent',
  'securityInvoker',
  'definitionMd5',
  'columnSignature',
  'selectAcl',
]) {
  assert.ok(sql.includes(marker), `missing bounded SRA-B/C inventory marker: ${marker}`);
}

for (const objectName of [
  'markets',
  'products',
  'staff_accessible_events',
  'staff_accessible_markets',
  'staff_accessible_products',
]) {
  assert.ok(sql.includes(`'${objectName}'`), `missing SRA-B/C target: ${objectName}`);
}

assert.ok(
  readFileSync(join(root, 'scripts/test-files.txt'), 'utf8').includes(
    'tsx tests/supabase-sra-bcd-readonly-inventory.test.ts',
  ),
);

console.log('PASS SRA-B/C/D Production inventory is bounded, metadata-only, and read-only');
