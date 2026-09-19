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

function section(source: string, start: string, end?: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);
  if (!end) return source.slice(startIndex);

  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

const migrationSource = readProjectFile('supabase/migrations/053_repair_staff_accessible_view_sanitization.sql');

console.log('\n=== Supabase staff view repair migration ===');

runTest('sanitizer removes deposit along with existing sensitive event payload keys', () => {
  const sanitizer = section(
    migrationSource,
    'CREATE OR REPLACE FUNCTION public.sanitize_staff_event_payload',
    'COMMENT ON FUNCTION public.sanitize_staff_event_payload'
  );

  for (const key of [
    'boothCost',
    'booth_cost',
    'registrationFee',
    'registration_fee',
    'deposit',
    'cost',
    'supplierInfo',
    'supplier_info',
    'totalProfit',
    'total_profit',
  ]) {
    assert.match(sanitizer, new RegExp(`'${key}'`));
  }

  assert.match(sanitizer, /public\.sanitize_staff_event_payload\(result->'items'->i\)/);
});

runTest('staff_accessible_markets uses strict owner branch and nulls staff deposit', () => {
  const marketView = section(
    migrationSource,
    'CREATE OR REPLACE VIEW public.staff_accessible_markets AS',
    'COMMENT ON VIEW public.staff_accessible_markets'
  );

  const staffBranch = section(marketView, '-- Branch 1: STAFF', 'UNION ALL');
  const ownerBranch = section(marketView, '-- Branch 2: OWNER');

  assert.match(staffBranch, /NULL::numeric\(10,2\) AS deposit/);
  assert.match(staffBranch, /JOIN public\.staff_relationships sr ON sr\.owner_id = m\.owner_id/);
  assert.match(staffBranch, /sr\.staff_id = auth\.uid\(\)/);
  assert.match(staffBranch, /COALESCE\(m\.is_deleted, false\) = false/);

  assert.match(ownerBranch, /FROM public\.markets m\s+WHERE m\.owner_id = auth\.uid\(\)/);
  assert.doesNotMatch(ownerBranch, /market_members/i);
});

runTest('staff_accessible_events avoids staff-authored owner-branch duplicates', () => {
  const eventView = section(
    migrationSource,
    'CREATE OR REPLACE VIEW public.staff_accessible_events AS',
    'COMMENT ON VIEW public.staff_accessible_events'
  );

  const staffMarketBranch = section(eventView, '-- Branch 1: STAFF market events', 'UNION ALL');
  const ownerSelfBranch = section(eventView, '-- Branch 3: OWNER self global events only', 'UNION ALL');
  const ownerMarketBranch = section(eventView, '-- Branch 4: OWNER owned-market events');

  assert.match(staffMarketBranch, /public\.sanitize_staff_event_payload\(e\.payload\) AS payload/);
  assert.match(staffMarketBranch, /JOIN public\.markets m ON m\.id = e\.market_id/);
  assert.match(staffMarketBranch, /JOIN public\.staff_relationships sr ON sr\.owner_id = m\.owner_id/);

  assert.match(ownerSelfBranch, /e\.actor_id = auth\.uid\(\)/);
  assert.match(ownerSelfBranch, /e\.market_id IS NULL/);
  assert.match(ownerSelfBranch, /EXISTS \(/);

  assert.match(ownerMarketBranch, /JOIN public\.markets m ON m\.id = e\.market_id/);
  assert.match(ownerMarketBranch, /WHERE m\.owner_id = auth\.uid\(\)/);
  assert.doesNotMatch(ownerMarketBranch, /market_members/i);
  assert.doesNotMatch(ownerMarketBranch, /e\.actor_id <> auth\.uid\(\)/);
});

runTest('verification SQL covers staff redaction duplicates tombstones and owner regression', () => {
  assert.match(migrationSource, /count\(\*\) FILTER \(WHERE deposit IS NULL\) AS deposit_null/);
  assert.match(migrationSource, /count\(\*\) FILTER \(WHERE payload \? 'deposit'\) AS has_deposit/);
  assert.match(migrationSource, /GROUP BY id, type, market_id[\s\S]*HAVING count\(\*\) > 1/);
  assert.match(migrationSource, /WHERE type IN \('deal_deleted', 'interaction_deleted'\)/);
  assert.match(migrationSource, /WHERE access_type = 'owner'[\s\S]*LIMIT 5/);
});

runTest('migration stays scoped to function and view repair only', () => {
  assert.doesNotMatch(migrationSource, /\bUPDATE\s+public\./i);
  assert.doesNotMatch(migrationSource, /\bDELETE\s+FROM\s+public\./i);
  assert.doesNotMatch(migrationSource, /\bINSERT\s+INTO\s+public\./i);
  assert.doesNotMatch(migrationSource, /\bALTER\s+TABLE\b/i);
  assert.doesNotMatch(migrationSource, /\bCREATE\s+POLICY\b/i);
  assert.doesNotMatch(migrationSource, /\bDROP\s+POLICY\b/i);
  assert.doesNotMatch(migrationSource, /\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b/i);
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
    throw new Error(`${failed} staff view repair migration tests failed`);
  }
}

main();
