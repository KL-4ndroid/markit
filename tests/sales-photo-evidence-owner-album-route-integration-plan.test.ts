import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const marketDetailSource = readProjectFile('components/markets/MarketDetailScreen.tsx');
const staffMarketDetailSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence owner album route integration plan ===');

runTest('plan records Slice 9B as design-only route integration guardrail', () => {
  assert.match(planSource, /Slice 9B Status/);
  assert.match(planSource, /design and guardrail test before touching the market detail runtime route/);
  assert.match(planSource, /owner market detail experience/);
  assert.match(planSource, /not in `StaffMarketDetailView`/);
  assert.match(planSource, /fail closed when role, owner id, or market id is not ready/);
});

runTest('planned route integration must use the read model and shell boundary', () => {
  assert.match(planSource, /buildSalesPhotoEvidenceOwnerAlbumViewModel\(\)/);
  assert.match(planSource, /SalesPhotoEvidenceOwnerAlbumShell/);
  assert.match(planSource, /prop-driven owner-only route section/);
  assert.match(planSource, /injected rows/);
});

runTest('route integration keeps sensitive runtime work behind approval boundaries', () => {
  assert.match(planSource, /must not fetch signed read URLs/);
  assert.match(planSource, /render private images/);
  assert.match(planSource, /call R2/);
  assert.match(planSource, /upload/);
  assert.match(planSource, /write Supabase/);
  assert.match(planSource, /mutate expiration/);
  assert.match(planSource, /enable runtime enqueue/);
  assert.match(planSource, /execute cleanup/);
  assert.match(planSource, /Data fetching remains a separate approval boundary/);
});

runTest('current runtime route uses the route section boundary instead of direct shell or read-model wiring', () => {
  assert.match(marketDetailSource, /SalesPhotoEvidenceOwnerAlbumRouteSection/);
  assert.doesNotMatch(marketDetailSource, /SalesPhotoEvidenceOwnerAlbumShell/);
  assert.doesNotMatch(marketDetailSource, /buildSalesPhotoEvidenceOwnerAlbumViewModel/);
  assert.doesNotMatch(staffMarketDetailSource, /SalesPhotoEvidenceOwnerAlbumShell/);
  assert.doesNotMatch(staffMarketDetailSource, /buildSalesPhotoEvidenceOwnerAlbumViewModel/);
});

runTest('route integration plan is included in the main test command', () => {
  assert.match(
    testManifestSource,
    /tsx tests\/sales-photo-evidence-owner-album-route-integration-plan\.test\.ts/
  );
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
    throw new Error(`${failed} sales photo evidence owner album route integration plan tests failed`);
  }
}

main();
