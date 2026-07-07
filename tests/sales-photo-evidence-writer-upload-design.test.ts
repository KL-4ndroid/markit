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

runTest('writer upload design is design-only and keeps runtime cloud writes blocked', () => {
  assert.match(designSource, /Status: design-only/);
  assert.match(designSource, /does not implement routes, R2 clients, Supabase mutations, signed URLs, queue drain wiring, runtime enqueue enablement, cleanup execution, or production recovery behavior/);
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
  assert.match(designSource, /Slice 7B-6: Manual Local\/Staging Enablement/);
  assert.match(designSource, /Slice 7B-7: Production Enablement/);
  assert.match(designSource, /Requires separate approval after local\/staging evidence/);
});

runTest('execution plan records 7B-0 and keeps next step pure service types', () => {
  assert.match(executionPlanSource, /Slice 7B-0 Status/);
  assert.match(executionPlanSource, /writer\/upload design/);
  assert.match(executionPlanSource, /recommended next implementation slice is `Slice 7B-1: Pure Service Types`/);
  assert.match(executionPlanSource, /does not implement runtime routes, R2 clients, Supabase mutations, signed URLs, queue drain wiring, runtime enqueue enablement, cleanup execution, or production recovery behavior/);
});

runTest('package test includes design guardrail without adding R2 SDK dependency', () => {
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-writer-upload-design\.test\.ts/);

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
