import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseSalesPhotoEvidenceUploadFormData } from '../lib/sales/photo-evidence-upload-form-data';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

const IDS = {
  ownerId: '11111111-1111-4111-8111-111111111111',
  staffId: '22222222-2222-4222-8222-222222222222',
  marketId: '33333333-3333-4333-8333-333333333333',
  saleId: '44444444-4444-4444-8444-444444444444',
};

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const parserSource = readProjectFile('lib/sales/photo-evidence-upload-form-data.ts');
const routeSource = readProjectFile('app/api/sales-photo-evidence/upload/route.ts');
const executionPlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function createBlob(size: number, type: 'image/webp' | 'image/jpeg'): Blob {
  return new Blob([new Uint8Array(size)], { type });
}

function validFormData(): FormData {
  const image = createBlob(4, 'image/webp');
  const thumbnail = createBlob(2, 'image/webp');
  const formData = new FormData();

  formData.set('ownerId', IDS.ownerId);
  formData.set('marketId', IDS.marketId);
  formData.set('saleEventId', IDS.saleId);
  formData.set('capturedByStaffId', IDS.staffId);
  formData.set('capturedAt', '2026-07-08T01:02:03.000Z');
  formData.set('saleCompletedAt', '2026-07-08T01:00:00.000Z');
  formData.set('queueId', 'queue-1');
  formData.set('image', image);
  formData.set('thumbnail', thumbnail);
  formData.set('imageMetadata', JSON.stringify({
    kind: 'image',
    mimeType: image.type,
    fileSizeBytes: image.size,
    width: 1200,
    height: 900,
  }));
  formData.set('thumbnailMetadata', JSON.stringify({
    kind: 'thumbnail',
    mimeType: thumbnail.type,
    fileSizeBytes: thumbnail.size,
    width: 320,
    height: 240,
  }));

  return formData;
}

console.log('\n=== Sales photo evidence upload FormData parser ===');

runTest('parses a valid upload FormData fixture without touching route runtime', () => {
  const result = parseSalesPhotoEvidenceUploadFormData(validFormData());

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.request.ownerId, IDS.ownerId);
  assert.equal(result.request.marketId, IDS.marketId);
  assert.equal(result.request.saleEventId, IDS.saleId);
  assert.equal(result.request.capturedByStaffId, IDS.staffId);
  assert.equal(result.request.queueId, 'queue-1');
  assert.equal(result.request.saleCompletedAt, '2026-07-08T01:00:00.000Z');
  assert.equal(result.request.imageMetadata.kind, 'image');
  assert.equal(result.request.thumbnailMetadata.kind, 'thumbnail');
});

runTest('uses captured time as a backward-compatible sale time fallback', () => {
  const formData = validFormData();
  formData.delete('saleCompletedAt');

  const result = parseSalesPhotoEvidenceUploadFormData(formData);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.request.saleCompletedAt, '2026-07-08T01:02:03.000Z');
});

runTest('normalizes absent optional staff and queue fields to null', () => {
  const formData = validFormData();
  formData.delete('capturedByStaffId');
  formData.delete('queueId');

  const result = parseSalesPhotoEvidenceUploadFormData(formData);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.request.capturedByStaffId, null);
  assert.equal(result.request.queueId, null);
});

runTest('rejects missing required text or file fields', () => {
  const missingOwner = validFormData();
  missingOwner.delete('ownerId');
  assert.equal(parseSalesPhotoEvidenceUploadFormData(missingOwner).ok, false);

  const missingImage = validFormData();
  missingImage.delete('image');
  assert.equal(parseSalesPhotoEvidenceUploadFormData(missingImage).ok, false);
});

runTest('rejects duplicate required fields and non-file file fields', () => {
  const duplicateOwner = validFormData();
  duplicateOwner.append('ownerId', IDS.ownerId);
  assert.equal(parseSalesPhotoEvidenceUploadFormData(duplicateOwner).ok, false);

  const badImage = validFormData();
  badImage.set('image', 'not-a-file');
  assert.equal(parseSalesPhotoEvidenceUploadFormData(badImage).ok, false);
});

runTest('rejects invalid metadata and file metadata mismatch', () => {
  const invalidJson = validFormData();
  invalidJson.set('imageMetadata', '{');
  assert.equal(parseSalesPhotoEvidenceUploadFormData(invalidJson).ok, false);

  const wrongKind = validFormData();
  wrongKind.set('imageMetadata', JSON.stringify({
    kind: 'thumbnail',
    mimeType: 'image/webp',
    fileSizeBytes: 4,
    width: 1200,
    height: 900,
  }));
  assert.equal(parseSalesPhotoEvidenceUploadFormData(wrongKind).ok, false);

  const wrongSize = validFormData();
  wrongSize.set('imageMetadata', JSON.stringify({
    kind: 'image',
    mimeType: 'image/webp',
    fileSizeBytes: 999,
    width: 1200,
    height: 900,
  }));
  assert.equal(parseSalesPhotoEvidenceUploadFormData(wrongSize).ok, false);
});

runTest('parser source stays model-only and route parses FormData only behind the gated upload branch', () => {
  assert.doesNotMatch(parserSource, /@aws-sdk|aws-sdk|S3Client|PutObjectCommand|createPresignedPost|getSignedUrl/);
  assert.doesNotMatch(parserSource, /process\.env|NEXT_PUBLIC_R2|SERVICE_ROLE|service_role/);
  assert.doesNotMatch(parserSource, /NextResponse|createClient|supabase|fetch\s*\(/i);
  assert.match(routeSource, /isMultipartFormDataRequest\(request\)/);
  assert.match(routeSource, /wantsR2Upload && !isR2UploadEnabled\(\)/);
  assert.match(routeSource, /parseSalesPhotoEvidenceUploadFormData\(await request\.formData\(\)\)/);
});

runTest('execution plan and manifest record Slice 7B-4C', () => {
  assert.match(executionPlanSource, /Slice 7B-4C Status/);
  assert.match(executionPlanSource, /pure FormData parser model/);
  assert.match(executionPlanSource, /does not wire the route, call R2, install an SDK, finalize metadata, or delete local payloads/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-upload-form-data\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence upload FormData parser tests failed`);
  }
}

main();
