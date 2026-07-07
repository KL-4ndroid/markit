import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const designSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ADAPTER_DESIGN.md');
const executionPlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence metadata claim adapter design ===');

runTest('adapter design remains design-only and blocks runtime cloud writes', () => {
  assert.match(designSource, /Status: design-only/);
  assert.match(designSource, /does not implement a Supabase client, metadata writes, route wiring, R2 upload, signed URLs, queue drain wiring, cleanup execution, or production recovery behavior/);
});

runTest('adapter design uses dependency injection and avoids global client creation', () => {
  assert.match(designSource, /receive all dependencies by injection/);
  assert.match(designSource, /must not create a global Supabase client internally/);
  assert.match(designSource, /authenticated actor id and role/);
  assert.match(designSource, /Supabase-like repository object/);
  assert.match(designSource, /feature gate for write enablement/);
});

runTest('repository boundary stays narrow and excludes upload cleanup and sync behavior', () => {
  for (const operation of [
    'getSaleEventForEvidenceClaim',
    'getActiveEvidenceForSale',
    'isStaffRelationshipActive',
    'createEvidenceUploadingClaim',
    'markEvidenceUploading',
  ]) {
    assert.match(designSource, new RegExp(operation));
  }

  assert.match(designSource, /no R2 object upload/);
  assert.match(designSource, /no signed URL issuance/);
  assert.match(designSource, /no local IndexedDB access/);
  assert.match(designSource, /no payload deletion/);
  assert.match(designSource, /no queue drain/);
});

runTest('write semantics never mark uploaded before R2 and metadata finalize', () => {
  assert.match(designSource, /insert one row directly as `uploading`/);
  assert.match(designSource, /update only that row to `uploading`/);
  assert.match(designSource, /return idempotent success/);
  assert.match(designSource, /The adapter must never mark `uploaded`/);
  assert.match(designSource, /after both R2 object uploads and metadata finalize succeed/);
});

runTest('feature gate defaults disabled and prevents write calls', () => {
  assert.match(designSource, /must default disabled/);
  assert.match(designSource, /it must not call `createEvidenceUploadingClaim\(\)`/);
  assert.match(designSource, /it must not call `markEvidenceUploading\(\)`/);
});

runTest('adapter design records the next approval boundary and recommended answers', () => {
  assert.match(designSource, /Actual Supabase metadata writes are the next sensitive boundary/);
  assert.match(designSource, /Whether the first adapter is allowed to insert rows directly as `uploading`/);
  assert.match(designSource, /allow direct `uploading` claim only inside the future server route/);
  assert.match(designSource, /require staff uploads to match `captured_by_staff_id = auth.uid\(\)`/);
});

runTest('execution plan and package script include 7B-3B design guardrail', () => {
  assert.match(executionPlanSource, /Slice 7B-3B Status/);
  assert.match(executionPlanSource, /SALES_PHOTO_EVIDENCE_METADATA_CLAIM_ADAPTER_DESIGN\.md/);
  assert.match(executionPlanSource, /Actual Supabase metadata writes remain blocked/);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-metadata-claim-adapter-design\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence metadata claim adapter design tests failed`);
  }
}

main();
