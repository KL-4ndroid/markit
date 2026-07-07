import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const designSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_R2_UPLOAD_TRANSPORT_DESIGN.md');
const routeSource = readProjectFile('app/api/sales-photo-evidence/upload/route.ts');
const packageJson = JSON.parse(readProjectFile('package.json')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence R2 upload transport design ===');

runTest('transport design chooses FormData server route first and defers pre-signed upload', () => {
  assert.match(designSource, /Use a server-side `multipart\/form-data` route first/);
  assert.match(designSource, /POST \/api\/sales-photo-evidence\/upload/);
  assert.match(designSource, /Why Not Pre-Signed Upload First/);
  assert.match(designSource, /increases orphan object risk before we have cleanup tooling/);
});

runTest('transport request shape keeps browser payload explicit and authorization server-owned', () => {
  assert.match(designSource, /Text fields:[\s\S]*`ownerId`[\s\S]*`marketId`[\s\S]*`saleEventId`[\s\S]*`capturedAt`/);
  assert.match(designSource, /File fields:[\s\S]*`image`[\s\S]*`thumbnail`/);
  assert.match(designSource, /`queueId` must not be trusted for authorization/);
  assert.match(designSource, /source of truth remains Supabase auth, sale event ownership, market ownership, staff relationship/);
});

runTest('transport order prevents uploaded metadata before both private object uploads', () => {
  assert.match(designSource, /Create or reuse metadata claim as `uploading`/);
  assert.match(designSource, /Upload image object to R2/);
  assert.match(designSource, /Upload thumbnail object to R2/);
  assert.match(designSource, /Finalize Supabase metadata row as `uploaded`/);
  assert.match(designSource, /must not mark `uploaded` before both R2 uploads succeed/);
});

runTest('failure semantics keep local payloads and defer cleanup execution', () => {
  assert.match(designSource, /Validation failure: no R2 upload, keep local payload/);
  assert.match(designSource, /Image upload failure: mark row `upload_failed` if possible, keep local payload, do not upload thumbnail/);
  assert.match(designSource, /Thumbnail upload failure:[\s\S]*orphan image as future cleanup candidate/);
  assert.match(designSource, /No automatic R2 deletion or cleanup executor is part of this transport slice/);
});

runTest('feature gates separate metadata claim enablement from future R2 upload execution', () => {
  assert.match(designSource, /SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ENABLED=1/);
  assert.match(designSource, /SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ALLOW_PRODUCTION=1/);
  assert.match(designSource, /Do not reuse the metadata claim route gate as the R2 upload gate/);
  assert.match(designSource, /SALES_PHOTO_EVIDENCE_R2_UPLOAD_ROUTE_ENABLED=1/);
  assert.match(routeSource, /SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ROUTE_ALLOW_PRODUCTION/);
});

runTest('transport design remains design-only with no R2 SDK or route FormData parsing', () => {
  assert.match(designSource, /Status: design-only/);
  assert.match(designSource, /Do not install an SDK or call real R2 until fake-adapter route ordering tests are stable/);
  assert.doesNotMatch(routeSource, /formData\s*\(/);

  const dependencyNames = [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ];
  assert.deepEqual(
    dependencyNames.filter(name => /@aws-sdk|aws-sdk|cloudflare|r2/i.test(name)),
    []
  );
});

runTest('transport guardrail is included in the full test manifest', () => {
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-r2-upload-transport-design\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence R2 upload transport design tests failed`);
  }
}

main();
