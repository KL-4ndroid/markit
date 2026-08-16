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

const sql = readProjectFile('supabase/verification/c2_29b_staff_view_rls_read_only.sql');
const followupSql = readProjectFile('supabase/verification/c2_29b_staff_view_rls_read_only_followup.sql');
const template = readProjectFile('docs/C2.29B_READ_ONLY_VERIFICATION_RESULT_TEMPLATE.md');

console.log('\n=== C2.29B read-only verification SQL ===');

runTest('verification SQL includes every C2.29B section', () => {
  for (const section of [
    'C2.29B-E0',
    'C2.29B-E1',
    'C2.29B-E2',
    'C2.29B-E3',
    'C2.29B-E4',
    'C2.29B-E4-owner',
    'C2.29B-E5',
  ]) {
    assert.match(sql, new RegExp(section));
    assert.match(template, new RegExp(section.replace('-owner', '')));
  }
});

runTest('verification SQL keeps explicit auth placeholders', () => {
  assert.match(sql, /STAFF_USER_UUID/);
  assert.match(sql, /OWNER_USER_UUID/);
  assert.doesNotMatch(sql, /5e92b457-1eaf-49eb-9295-ba47b5a3e575/);
  assert.doesNotMatch(sql, /0d21abfe-136f-4c42-987b-14928593f323/);
});

runTest('staff checks cover view redaction scope duplicates and base-table denial', () => {
  assert.match(sql, /public\.staff_accessible_markets/);
  assert.match(sql, /public\.staff_accessible_products/);
  assert.match(sql, /public\.staff_accessible_events/);
  assert.match(sql, /access_type,\s*count\(\*\)/);
  assert.match(sql, /deposit_null/);
  assert.match(sql, /has_deposit/);
  assert.match(sql, /duplicate_market_id_rows/);
  assert.match(sql, /duplicate_event_id_rows/);
  assert.match(sql, /staff_markets_direct/);
  assert.match(sql, /staff_products_direct/);
  assert.match(sql, /staff_events_direct/);
});

runTest('owner regression and local type guard are represented', () => {
  assert.match(sql, /owner_markets_direct/);
  assert.match(sql, /owner_products_direct/);
  assert.match(sql, /owner_events_direct/);
  assert.match(sql, /booth_cost, total_profit, commission_rate, registration_fee, deposit/);
  assert.match(sql, /npx\.cmd tsc --noEmit --project tsconfig\.staff-typed-client\.json/);
});

runTest('verification SQL remains read-only and migration-free', () => {
  for (const source of [sql, followupSql]) {
    assert.doesNotMatch(source, /\bINSERT\s+INTO\b/i);
    assert.doesNotMatch(source, /\bUPDATE\s+/i);
    assert.doesNotMatch(source, /\bDELETE\s+FROM\b/i);
    assert.doesNotMatch(source, /\bUPSERT\b/i);
    assert.doesNotMatch(source, /\bALTER\s+TABLE\b/i);
    assert.doesNotMatch(source, /\bCREATE\s+(OR\s+REPLACE\s+)?(FUNCTION|VIEW|POLICY)\b/i);
    assert.doesNotMatch(source, /\bDROP\s+(FUNCTION|VIEW|POLICY|TABLE)\b/i);
    assert.doesNotMatch(source, /\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b/i);
  }
});

runTest('follow-up SQL collects missing C2.29B evidence as compact summaries', () => {
  assert.match(followupSql, /total_markets/);
  assert.match(followupSql, /duplicate_market_id_rows/);
  assert.match(followupSql, /total_events/);
  assert.match(followupSql, /duplicate_event_id_rows/);
  assert.match(followupSql, /staff_markets_direct/);
  assert.match(followupSql, /owner_markets_direct/);
  assert.match(followupSql, /STAFF_USER_UUID/);
  assert.match(followupSql, /OWNER_USER_UUID/);
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
    throw new Error(`${failed} C2.29B verification SQL tests failed`);
  }
}

main();
