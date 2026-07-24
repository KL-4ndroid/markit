import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createSalesPhotoEvidenceSignedReadContract,
  createSalesPhotoEvidenceUploadContract,
  SALES_PHOTO_EVIDENCE_SIGNED_READ_MAX_TTL_SECONDS,
} from '../lib/sales/photo-evidence-upload-contract';
import { SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY } from '../lib/sales/photo-evidence-model';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const contractSource = readProjectFile('lib/sales/photo-evidence-upload-contract.ts');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';
const SALE_ID = '33333333-3333-4333-8333-333333333333';
const EVIDENCE_ID = '44444444-4444-4444-8444-444444444444';
const STAFF_ID = '55555555-5555-4555-8555-555555555555';
const OTHER_STAFF_ID = '66666666-6666-4666-8666-666666666666';

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence upload contract ===');

function validUploadInput() {
  return {
    actorId: STAFF_ID,
    actorRole: 'staff' as const,
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    saleId: SALE_ID,
    evidenceId: EVIDENCE_ID,
    capturedByStaffId: STAFF_ID,
    currentStatus: 'captured_local' as const,
    image: {
      kind: 'image' as const,
      mimeType: 'image/webp',
      fileSizeBytes: 820_000,
      width: 1800,
      height: 1350,
    },
    thumbnail: {
      kind: 'thumbnail' as const,
      mimeType: 'image/webp',
      fileSizeBytes: 80_000,
      width: 320,
      height: 240,
    },
  };
}

runTest('upload contract prepares private object keys for one image and one thumbnail', () => {
  const decision = createSalesPhotoEvidenceUploadContract(validUploadInput());

  assert.equal(decision.action, 'prepare_upload_contract');
  assert.equal(decision.reason, 'upload_allowed_by_contract');

  if (decision.action !== 'prepare_upload_contract') throw new Error('expected upload contract');

  assert.equal(
    decision.contract.imageObjectKey,
    `sales-evidence/7d/${OWNER_ID}/${MARKET_ID}/${SALE_ID}/${EVIDENCE_ID}.webp`
  );
  assert.equal(
    decision.contract.thumbnailObjectKey,
    `sales-evidence-thumbs/7d/${OWNER_ID}/${MARKET_ID}/${SALE_ID}/${EVIDENCE_ID}.webp`
  );
  assert.deepEqual(decision.contract.acceptedMimeTypes, ['image/webp', 'image/jpeg']);
  assert.equal(decision.contract.maxFileSizeBytes, SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes);
});

runTest('upload contract allows owner-owned capture and staff-owned capture only', () => {
  assert.equal(
    createSalesPhotoEvidenceUploadContract({
      ...validUploadInput(),
      actorId: OWNER_ID,
      actorRole: 'owner',
      capturedByStaffId: null,
    }).action,
    'prepare_upload_contract'
  );

  assert.equal(
    createSalesPhotoEvidenceUploadContract({
      ...validUploadInput(),
      actorId: OTHER_STAFF_ID,
      capturedByStaffId: STAFF_ID,
    }).reason,
    'unauthorized_actor'
  );
});

runTest('upload contract fails closed unless evidence is captured local', () => {
  assert.equal(
    createSalesPhotoEvidenceUploadContract({
      ...validUploadInput(),
      currentStatus: 'pending_capture',
    }).reason,
    'evidence_not_captured_local'
  );

  assert.equal(
    createSalesPhotoEvidenceUploadContract({
      ...validUploadInput(),
      currentStatus: 'uploaded',
    }).reason,
    'evidence_not_captured_local'
  );
});

runTest('upload contract rejects unsafe variants before any route can use them', () => {
  assert.equal(
    createSalesPhotoEvidenceUploadContract({
      ...validUploadInput(),
      image: {
        ...validUploadInput().image,
        mimeType: 'image/png',
      },
    }).reason,
    'unsupported_mime_type'
  );

  assert.equal(
    createSalesPhotoEvidenceUploadContract({
      ...validUploadInput(),
      image: {
        ...validUploadInput().image,
        fileSizeBytes: SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes + 1,
      },
    }).reason,
    'invalid_file_size'
  );

  assert.equal(
    createSalesPhotoEvidenceUploadContract({
      ...validUploadInput(),
      thumbnail: {
        ...validUploadInput().thumbnail,
        kind: 'image',
      },
    }).reason,
    'invalid_variant_kind'
  );
});

runTest('signed read contract is short-lived and only for uploaded evidence', () => {
  const decision = createSalesPhotoEvidenceSignedReadContract({
    actorId: OWNER_ID,
    actorRole: 'owner',
    ownerId: OWNER_ID,
    capturedByStaffId: STAFF_ID,
    status: 'uploaded',
    objectKey: `sales-evidence/7d/${OWNER_ID}/${MARKET_ID}/${SALE_ID}/${EVIDENCE_ID}.webp`,
    variantKind: 'image',
    requestedTtlSeconds: SALES_PHOTO_EVIDENCE_SIGNED_READ_MAX_TTL_SECONDS,
  });

  assert.equal(decision.action, 'prepare_signed_read_contract');
  assert.equal(decision.reason, 'signed_read_allowed_by_contract');

  if (decision.action !== 'prepare_signed_read_contract') throw new Error('expected signed read contract');

  assert.equal(decision.contract.ttlSeconds, 300);
  assert.equal(decision.contract.mustReturnShortLivedUrl, true);
  assert.equal(decision.contract.mustNotReturnPublicUrl, true);

  assert.equal(
    createSalesPhotoEvidenceSignedReadContract({
      actorId: OWNER_ID,
      actorRole: 'owner',
      ownerId: OWNER_ID,
      capturedByStaffId: STAFF_ID,
      status: 'captured_local',
      objectKey: decision.contract.objectKey,
      variantKind: 'image',
      requestedTtlSeconds: 60,
    }).reason,
    'evidence_not_uploaded'
  );

  assert.equal(
    createSalesPhotoEvidenceSignedReadContract({
      actorId: OWNER_ID,
      actorRole: 'owner',
      ownerId: OWNER_ID,
      capturedByStaffId: STAFF_ID,
      status: 'uploaded',
      objectKey: decision.contract.objectKey,
      variantKind: 'image',
      requestedTtlSeconds: SALES_PHOTO_EVIDENCE_SIGNED_READ_MAX_TTL_SECONDS + 1,
    }).reason,
    'invalid_ttl'
  );
});

runTest('upload contract model is pure and does not implement cloud routes or storage clients', () => {
  assert.doesNotMatch(contractSource, /@\/lib\/db|db\.|Dexie|indexedDB/i);
  assert.doesNotMatch(contractSource, /@\/lib\/supabase|supabase|from\(/i);
  assert.doesNotMatch(
    contractSource,
    /fetch\(|XMLHttpRequest|navigator\.(mediaDevices|onLine)|window\.(document|navigator|localStorage|sessionStorage|indexedDB)|document\.(createElement|querySelector|body)|canvas|getUserMedia/i
  );
  assert.doesNotMatch(contractSource, /localStorage|sessionStorage|process\.env|NEXT_PUBLIC/);
  assert.doesNotMatch(contractSource, /\.(insert|update|delete|put|bulkPut|clear)\s*\(/);
  assert.doesNotMatch(contractSource, /S3Client|PutObjectCommand|GetObjectCommand|createPresignedPost|getSignedUrl/i);
});

runTest('Phase B plan records contract-only boundary and keeps runtime blocked', () => {
  assert.match(planSource, /Phase B: Upload Contract \+ Signed Access Design/);
  assert.match(planSource, /Slice 7A Status/);
  assert.match(planSource, /contract-only upload and signed-read model/);
  assert.match(planSource, /does not create routes, R2 clients, signed URLs, Supabase writes, upload execution, or runtime enqueue/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-upload-contract\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence upload contract tests failed`);
  }
}

main();
