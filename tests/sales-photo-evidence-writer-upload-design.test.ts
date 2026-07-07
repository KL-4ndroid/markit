import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const designSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_WRITER_UPLOAD_DESIGN.md');
const executionPlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as {
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence writer and upload design ===');

runTest('writer upload design records current route wiring while keeping R2 runtime blocked', () => {
  assert.match(designSource, /Status: architecture record/);
  assert.match(designSource, /Metadata-claim route wiring now exists behind local\/staging-safe feature gates/);
  assert.match(designSource, /does not implement R2 clients, signed URLs, queue drain wiring, runtime enqueue enablement, cleanup execution, or production recovery behavior/);
  assert.match(designSource, /This design does not cover:[\s\S]*post-sale runtime enqueue enablement[\s\S]*automatic background worker[\s\S]*broad queue drain[\s\S]*signed read URL implementation/);
});

runTest('recommended architecture uses a narrow server route and live permission recheck', () => {
  assert.match(designSource, /Use a narrow server route instead of direct browser-to-Supabase metadata mutation plus direct R2 credentials/);
  assert.match(designSource, /POST \/api\/sales-photo-evidence\/upload/);
  assert.match(designSource, /Authenticate current user/);
  assert.match(designSource, /Re-check live permission/);
  assert.match(designSource, /staff must be active under the owner/);
  assert.match(designSource, /staff upload must match `captured_by_staff_id` when present/);
  assert.match(designSource, /event type is `deal_closed`/);
});

runTest('upload ordering prevents false uploaded state before both R2 objects and metadata finalize', () => {
  assert.match(designSource, /Set metadata row to `uploading` before object upload/);
  assert.match(designSource, /Upload image object to R2/);
  assert.match(designSource, /Upload thumbnail object to R2/);
  assert.match(designSource, /Update metadata row to `uploaded`/);
  assert.match(designSource, /must not mark `uploaded` until both R2 uploads and metadata update are complete/);
  assert.match(designSource, /Only after the route returns success may the client delete the local pending payload/);
});

runTest('failure semantics keep local payloads and avoid broad cleanup execution', () => {
  assert.match(designSource, /Keep local payload/);
  assert.match(designSource, /Mark row `upload_failed`/);
  assert.match(designSource, /orphan candidates for future owner-only cleanup/);
  assert.match(designSource, /this design does not implement cleanup/);
  assert.match(designSource, /No R2 upload/);
});

runTest('R2 requirements keep credentials server-only and block public URLs', () => {
  for (const envName of [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
  ]) {
    assert.match(designSource, new RegExp(envName));
  }

  assert.match(designSource, /no `NEXT_PUBLIC_R2_\*`/);
  assert.match(designSource, /no client-side R2 credentials/);
  assert.match(designSource, /no raw object URL stored in Supabase/);
  assert.match(designSource, /no public URL stored in local IndexedDB/);
});

runTest('implementation slices defer route R2 client and production enablement', () => {
  assert.match(designSource, /Slice 7B-1: Pure Service Types/);
  assert.match(designSource, /Slice 7B-2: Server Route Skeleton Disabled/);
  assert.match(designSource, /rejects all requests with `501` or feature-disabled response/);
  assert.match(designSource, /Slice 7B-4: R2 Adapter Contract/);
  assert.match(designSource, /Slice 7B-4A: R2 Upload Transport Design Guardrail/);
  assert.match(designSource, /Slice 7B-6: Manual Local\/Staging Enablement/);
  assert.match(designSource, /Slice 7B-7: Production Enablement/);
  assert.match(designSource, /Requires separate approval after local\/staging evidence/);
});

runTest('execution plan records current R2 transport boundary and keeps next step fake route test only', () => {
  assert.match(executionPlanSource, /Slice 7B-0 Status/);
  assert.match(executionPlanSource, /writer\/upload design/);
  assert.match(executionPlanSource, /Slice 7B-4A Status/);
  assert.match(executionPlanSource, /R2 upload transport design/);
  assert.match(executionPlanSource, /Slice 7B-4B Status/);
  assert.match(executionPlanSource, /Slice 7B-4C Status/);
  assert.match(executionPlanSource, /recommended next implementation slice is `Slice 7B-4D: Fake Adapter Route Test`/);
  assert.match(executionPlanSource, /does not install an R2 SDK, parse `FormData`, call R2, issue signed URLs, delete local payloads, or enable production upload/);
});

runTest('package test includes design guardrail without adding R2 SDK dependency', () => {
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-writer-upload-design\.test\.ts/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-r2-upload-transport-design\.test\.ts/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-r2-upload-adapter\.test\.ts/);

  const dependencyNames = [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ];

  assert.deepEqual(
    dependencyNames.filter(name => /@aws-sdk|aws-sdk|cloudflare|r2/i.test(name)),
    []
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
    throw new Error(`${failed} sales photo evidence writer upload design tests failed`);
  }
}

main();
