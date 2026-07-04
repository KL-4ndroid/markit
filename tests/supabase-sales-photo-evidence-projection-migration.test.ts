import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function section(source: string, start: string, end?: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);

  if (!end) return source.slice(startIndex);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

const migrationSource = readProjectFile('supabase/migrations/056_wire_sales_photo_evidence_market_projection.sql');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };

console.log('\n=== Supabase sales photo evidence projection migration ===');

runTest('056 migration wires market projection without adding feature runtime', () => {
  assert.match(migrationSource, /CREATE OR REPLACE FUNCTION update_market_read_model\(\)/);
  assert.match(migrationSource, /sales_photo_evidence_required/);
  assert.match(migrationSource, /salesPhotoEvidenceRequired/);
  assert.match(migrationSource, /COALESCE\([\s\S]*NEW\.payload->>'sales_photo_evidence_required'[\s\S]*NEW\.payload->>'salesPhotoEvidenceRequired'[\s\S]*FALSE[\s\S]*\)/);
  assert.match(migrationSource, /v_updates->>'sales_photo_evidence_required'[\s\S]*v_updates->>'salesPhotoEvidenceRequired'[\s\S]*sales_photo_evidence_required/);
  assert.doesNotMatch(migrationSource, /INSERT INTO public\.sale_photo_evidence|INSERT INTO sale_photo_evidence/i);
  assert.doesNotMatch(migrationSource, /signed_url|getUserMedia|uploadEvidence|capturePhoto/i);
});

runTest('staff_accessible_markets adds the flag at the end while preserving redaction', () => {
  const viewSource = section(
    migrationSource,
    'CREATE OR REPLACE VIEW public.staff_accessible_markets AS',
    'COMMENT ON VIEW public.staff_accessible_markets'
  );
  const staffBranch = section(viewSource, '-- Branch 1: STAFF', 'UNION ALL');
  const ownerBranch = section(viewSource, '-- Branch 2: OWNER');

  assert.match(staffBranch, /NULL::numeric\(10,2\) AS registration_fee/);
  assert.match(staffBranch, /NULL::numeric\(10,2\) AS booth_cost/);
  assert.match(staffBranch, /NULL::numeric\(10,2\) AS deposit/);
  assert.match(staffBranch, /NULL::numeric\(5,2\) AS commission_rate/);
  assert.match(staffBranch, /NULL::numeric\(10,2\) AS total_profit/);
  assert.match(staffBranch, /'staff'::text AS access_type,\s*m\.sales_photo_evidence_required/);
  assert.match(ownerBranch, /'owner'::text AS access_type,\s*m\.sales_photo_evidence_required/);
  assert.match(ownerBranch, /WHERE m\.owner_id = auth\.uid\(\)/);
  assert.doesNotMatch(ownerBranch, /market_members/i);
});

runTest('056 remains schema projection only and does not widen policies', () => {
  assert.doesNotMatch(migrationSource, /\bALTER TABLE\b/i);
  assert.doesNotMatch(migrationSource, /\bCREATE\s+POLICY\b/i);
  assert.doesNotMatch(migrationSource, /\bDROP\s+POLICY\b/i);
  assert.doesNotMatch(migrationSource, /\bENABLE\s+ROW\s+LEVEL\s+SECURITY\b/i);
  assert.doesNotMatch(migrationSource, /\bGRANT\b/i);
  assert.doesNotMatch(migrationSource, /\bREVOKE\b/i);
  assert.doesNotMatch(migrationSource, /\bFROM\s+public\.pending_operations\b|\bUPDATE\s+public\.pending_operations\b|\bINSERT\s+INTO\s+public\.pending_operations\b/i);
  assert.doesNotMatch(migrationSource, /\bFROM\s+public\.sale_photo_evidence\b|\bUPDATE\s+public\.sale_photo_evidence\b|\bINSERT\s+INTO\s+public\.sale_photo_evidence\b/i);
  assert.match(migrationSource, /Existing markets are not backfilled/);
});

runTest('plan records 056 as manually executed', () => {
  assert.match(planSource, /056_wire_sales_photo_evidence_market_projection\.sql/);
  assert.match(planSource, /056 has been manually executed/);
  assert.match(planSource, /reported as complete by the project owner/);
  assert.match(packageJson.scripts.test, /tsx tests\/supabase-sales-photo-evidence-projection-migration\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence projection migration tests failed`);
  }
}

main();
