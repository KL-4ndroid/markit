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
const marketDetailSource = readProjectFile('app/markets/[id]/page.tsx');
const staffMarketDetailSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence owner album route section ===');

runTest('route section is prop-driven and uses the approved read model plus shell', () => {
  assert.match(routeSectionSource, /interface SalesPhotoEvidenceOwnerAlbumRouteSectionProps/);
  assert.match(routeSectionSource, /rows\?: readonly SalesPhotoEvidenceAlbumSourceRow\[\]/);
  assert.match(routeSectionSource, /buildSalesPhotoEvidenceOwnerAlbumViewModel/);
  assert.match(routeSectionSource, /SalesPhotoEvidenceOwnerAlbumShell/);
  assert.match(routeSectionSource, /viewModel=\{decision\.viewModel\}/);
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

runTest('route section is not mounted into owner or staff market detail yet', () => {
  assert.doesNotMatch(marketDetailSource, /SalesPhotoEvidenceOwnerAlbumRouteSection/);
  assert.doesNotMatch(staffMarketDetailSource, /SalesPhotoEvidenceOwnerAlbumRouteSection/);
});

runTest('plan records Slice 9C as unmounted prop-driven route section only', () => {
  assert.match(planSource, /Slice 9C Status/);
  assert.match(planSource, /prop-driven owner-only route section/);
  assert.match(planSource, /not mounted into `app\/markets\/\[id\]\/page\.tsx`/);
  assert.match(planSource, /does not fetch rows, request signed read URLs, render private images, call R2, write Supabase, mutate expiration, upload, execute cleanup, or enable runtime enqueue/);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-owner-album-route-section\.test\.ts/);
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
