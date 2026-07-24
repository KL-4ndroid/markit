import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const designSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_LOCAL_BINARY_PENDING_STORAGE_DESIGN.md');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence local binary pending storage design ===');

runTest('design keeps local binary pending storage design-only', () => {
  assert.match(designSource, /Status: Design-only/);
  assert.match(designSource, /No Dexie schema migration, IndexedDB blob write, browser capture runtime, Supabase write, R2 upload, signed URL, queue drain, or production runtime wiring is implemented/);
  assert.match(designSource, /This document does not approve the runtime implementation/);
});

runTest('design keeps binary payloads separate from pending creation queue', () => {
  assert.match(designSource, /salesPhotoEvidencePendingCreations/);
  assert.match(designSource, /Binary photo payloads should not be embedded into that queue row/);
  assert.match(designSource, /salesPhotoEvidencePendingPayloads/);
  assert.match(designSource, /`queueId` should equal `saleEventId`/);
});

runTest('design blocks unsafe storage formats and cloud writes', () => {
  assert.match(designSource, /store `Blob` values in IndexedDB through Dexie/);
  assert.match(designSource, /do not store base64 strings/);
  assert.match(designSource, /do not store object URLs/);
  assert.match(designSource, /do not store original camera file/);
  assert.match(designSource, /no Supabase call/);
  assert.match(designSource, /no R2 upload/);
  assert.match(designSource, /no event creation/);
});

runTest('design requires compressed image thumbnail validation before write', () => {
  assert.match(designSource, /image MIME type is WebP or JPEG/);
  assert.match(designSource, /thumbnail MIME type is WebP or JPEG/);
  assert.match(designSource, /content hashes are non-empty/);
  assert.match(designSource, /image\.fileSizeBytes \+ thumbnail\.fileSizeBytes <= 1_500_000/);
});

runTest('design integrates local payloads into clear-local precheck without claiming cloud recovery', () => {
  assert.match(designSource, /pending_sales_photo_evidence_payload/);
  assert.match(designSource, /blocking local-only data/);
  assert.match(designSource, /will be lost/);
  assert.match(designSource, /cloud rebuild can recover these local blobs/);
});

runTest('execution plan records Slice 6D as design-only', () => {
  assert.match(planSource, /Slice 6D Status/);
  assert.match(planSource, /local binary pending storage design document/);
  assert.match(planSource, /does not implement Dexie schema migration, IndexedDB blob writes, browser capture runtime, upload, signed read, R2, Supabase writes, queue drain, or runtime enqueue/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-local-binary-pending-storage-design\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence local binary pending storage design tests failed`);
  }
}

main();
