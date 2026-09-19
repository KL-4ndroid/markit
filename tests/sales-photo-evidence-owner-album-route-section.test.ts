import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const routeSectionSource = readProjectFile('components/markets/SalesPhotoEvidenceOwnerAlbumRouteSection.tsx');
const marketDetailSource = readProjectFile('components/markets/MarketDetailScreen.tsx');
const staffMarketDetailSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence owner album route section ===');

runTest('route section is prop-driven and uses the approved read model plus shell', () => {
  assert.match(routeSectionSource, /interface SalesPhotoEvidenceOwnerAlbumRouteSectionProps/);
  assert.match(routeSectionSource, /rows\?: readonly SalesPhotoEvidenceAlbumSourceRow\[\]/);
  assert.match(routeSectionSource, /dealEvents\?: readonly Event<DealClosedPayload>\[\]/);
  assert.match(routeSectionSource, /buildSalesPhotoEvidenceOwnerAlbumViewModel/);
  assert.match(routeSectionSource, /buildSalesPhotoEvidenceTransactionIndex/);
  assert.match(routeSectionSource, /SalesPhotoEvidenceOwnerAlbumShell/);
  assert.match(routeSectionSource, /viewModel=\{decision\.viewModel\}/);
  assert.match(routeSectionSource, /transactionBySaleId=\{transactionBySaleId\}/);
});

runTest('route section fails closed until owner role and scope are ready', () => {
  assert.match(routeSectionSource, /actorRole:\s*SalesPhotoEvidenceOwnerAlbumActorRole \| null/);
  assert.match(routeSectionSource, /isRoleReady\?: boolean/);
  assert.match(routeSectionSource, /if \(!isRoleReady \|\| actorRole !== 'owner' \|\| !ownerId \|\| !marketId\)/);
  assert.match(routeSectionSource, /return null/);
  assert.match(routeSectionSource, /decision\.action !== 'show_owner_album'/);
});

runTest('route section stays free of data fetching mutation and cloud image access', () => {
  assert.doesNotMatch(routeSectionSource, /useEffect|useState|useLiveQuery|useAuth|useUserRole|useRoleContext/);
  assert.doesNotMatch(routeSectionSource, /@\/lib\/db|db\.|Dexie|indexedDB/i);
  assert.doesNotMatch(routeSectionSource, /@\/lib\/supabase|supabase|from\(/i);
  assert.doesNotMatch(routeSectionSource, /fetch\(|XMLHttpRequest|navigator\.|window\.|document\.|canvas|getUserMedia/i);
  assert.doesNotMatch(routeSectionSource, /localStorage|sessionStorage|process\.env|NEXT_PUBLIC/i);
  assert.doesNotMatch(routeSectionSource, /\.(insert|update|delete|put|bulkPut|clear)\s*\(/);
  assert.doesNotMatch(
    routeSectionSource,
    /getSignedUrl|signedUrl\s*\(|signed_url\s*\(|createPresignedPost|S3Client|PutObjectCommand|GetObjectCommand/i
  );
});

runTest('route section is mounted in owner market detail but not staff market detail', () => {
  assert.match(marketDetailSource, /import \{ SalesPhotoEvidenceOwnerAlbumRouteSection \}/);
  assert.match(marketDetailSource, /<SalesPhotoEvidenceOwnerAlbumRouteSection/);
  assert.doesNotMatch(staffMarketDetailSource, /SalesPhotoEvidenceOwnerAlbumRouteSection/);

  const staffReturnIndex = marketDetailSource.indexOf('if (isStaff) {');
  const albumSectionIndex = marketDetailSource.indexOf('<SalesPhotoEvidenceOwnerAlbumRouteSection');

  assert.ok(staffReturnIndex > 0, 'staff return must exist');
  assert.ok(albumSectionIndex > staffReturnIndex, 'owner album section must be after staff route return');
});

runTest('owner market detail passes only scoped props into the route section', () => {
  assert.match(
    marketDetailSource,
    /<SalesPhotoEvidenceOwnerAlbumRouteSection[\s\S]*actorRole=\{isStaff \? 'staff' : 'owner'\}[\s\S]*ownerId=\{ownerSalesPhotoEvidenceAlbumOwnerId\}[\s\S]*marketId=\{marketId\}[\s\S]*rows=\{ownerSalesPhotoEvidenceRows\}/
  );
  assert.match(marketDetailSource, /isRoleReady=\{!isRoleLoading\}/);
  assert.match(marketDetailSource, /dealEvents=\{dealEvents\}/);
  assert.match(marketDetailSource, /onRefresh=\{loadOwnerSalesPhotoEvidenceAlbumRows\}/);
});

runTest('plan records Slice 9C and Slice 9F route mounting boundaries', () => {
  assert.match(planSource, /Slice 9C Status/);
  assert.match(planSource, /prop-driven owner-only route section/);
  assert.match(planSource, /Slice 9F Status/);
  assert.match(planSource, /mounted in `app\/markets\/\[id\]\/page\.tsx`/);
  assert.match(planSource, /does not fetch rows, request signed read URLs, render private images, call R2, write Supabase, mutate expiration, upload, execute cleanup, or enable runtime enqueue/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-owner-album-route-section\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence owner album route section tests failed`);
  }
}

main();
