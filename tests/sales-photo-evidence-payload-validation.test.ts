import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SALES_PHOTO_EVIDENCE_MAX_TOTAL_PAYLOAD_BYTES } from '../lib/sales/photo-evidence-model';
import {
  hasSalesPhotoEvidenceUploadMimeSignature,
  parseAndValidateSalesPhotoEvidenceUploadFormData,
  parseSalesPhotoEvidenceUploadFormData,
} from '../lib/sales/photo-evidence-upload-form-data';
import { SALES_PHOTO_EVIDENCE_PENDING_PAYLOAD_MAX_TOTAL_BYTES } from '../lib/sales/photo-evidence-pending-payload-storage';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function signatureFor(type: 'image/jpeg' | 'image/webp'): Uint8Array {
  return type === 'image/jpeg'
    ? new Uint8Array([0xff, 0xd8, 0xff])
    : new Uint8Array([
        0x52, 0x49, 0x46, 0x46,
        0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
      ]);
}

function signedBlob(
  signatureType: 'image/jpeg' | 'image/webp',
  declaredType: 'image/jpeg' | 'image/webp',
  size: number
): Blob {
  const signature = signatureFor(signatureType);
  assert.ok(size >= signature.byteLength);
  const signatureBytes = signature.buffer.slice(
    signature.byteOffset,
    signature.byteOffset + signature.byteLength
  ) as ArrayBuffer;
  return new Blob([
    signatureBytes,
    new ArrayBuffer(size - signature.byteLength),
  ], { type: declaredType });
}

function uploadFormData(image: Blob, thumbnail: Blob): FormData {
  const formData = new FormData();
  formData.set('ownerId', '11111111-1111-4111-8111-111111111111');
  formData.set('marketId', '22222222-2222-4222-8222-222222222222');
  formData.set('saleEventId', '33333333-3333-4333-8333-333333333333');
  formData.set('capturedAt', '2026-07-17T00:00:00.000Z');
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

console.log('\n=== Sales photo evidence payload validation ===');

runTest('shared total payload limit remains exactly 1,500,000 bytes', () => {
  assert.equal(SALES_PHOTO_EVIDENCE_MAX_TOTAL_PAYLOAD_BYTES, 1_500_000);
  assert.equal(
    SALES_PHOTO_EVIDENCE_PENDING_PAYLOAD_MAX_TOTAL_BYTES,
    SALES_PHOTO_EVIDENCE_MAX_TOTAL_PAYLOAD_BYTES
  );
});

runTest('synchronous parser accepts the exact combined limit and rejects one byte over', () => {
  const exact = uploadFormData(
    signedBlob('image/webp', 'image/webp', 900_000),
    signedBlob('image/webp', 'image/webp', 600_000)
  );
  assert.equal(parseSalesPhotoEvidenceUploadFormData(exact).ok, true);

  const over = uploadFormData(
    signedBlob('image/webp', 'image/webp', 900_001),
    signedBlob('image/webp', 'image/webp', 600_000)
  );
  const result = parseSalesPhotoEvidenceUploadFormData(over);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'invalid_upload_form_data');
  assert.match(result.message, /combined size limit/);
});

runTest('magic-byte helper recognizes JPEG and WebP and rejects MIME spoofing', async () => {
  assert.equal(
    await hasSalesPhotoEvidenceUploadMimeSignature(
      signedBlob('image/jpeg', 'image/jpeg', 16),
      'image/jpeg'
    ),
    true
  );
  assert.equal(
    await hasSalesPhotoEvidenceUploadMimeSignature(
      signedBlob('image/webp', 'image/webp', 16),
      'image/webp'
    ),
    true
  );
  assert.equal(
    await hasSalesPhotoEvidenceUploadMimeSignature(
      signedBlob('image/jpeg', 'image/webp', 16),
      'image/webp'
    ),
    false
  );
  assert.equal(
    await hasSalesPhotoEvidenceUploadMimeSignature(
      new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: 'image/webp' }),
      'image/webp'
    ),
    false
  );
});

runTest('async parser accepts valid signatures for both variants', async () => {
  const result = await parseAndValidateSalesPhotoEvidenceUploadFormData(uploadFormData(
    signedBlob('image/jpeg', 'image/jpeg', 32),
    signedBlob('image/webp', 'image/webp', 24)
  ));

  assert.equal(result.ok, true);
});

runTest('async parser fails closed when declared MIME and bytes disagree', async () => {
  const result = await parseAndValidateSalesPhotoEvidenceUploadFormData(uploadFormData(
    signedBlob('image/jpeg', 'image/webp', 32),
    signedBlob('image/webp', 'image/webp', 24)
  ));

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, 'invalid_upload_form_data');
  assert.match(result.message, /signature does not match/i);
});

runTest('full test manifest includes payload validation guardrail', () => {
  const manifest = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');
  assert.match(manifest, /tsx tests\/sales-photo-evidence-payload-validation\.test\.ts/);
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} sales photo evidence payload validation tests failed`);
  }
}

void main();
