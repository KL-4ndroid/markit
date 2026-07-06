import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  classifySalesPhotoEvidenceCompressionOutput,
  planSalesPhotoEvidenceCaptureCompression,
  SALES_PHOTO_EVIDENCE_CAPTURE_SOURCE_MIME_TYPES,
  SALES_PHOTO_EVIDENCE_MAX_SOURCE_FILE_SIZE_BYTES,
} from '../lib/sales/photo-evidence-capture-compression';
import {
  SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY,
} from '../lib/sales/photo-evidence-model';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const captureCompressionSource = readProjectFile('lib/sales/photo-evidence-capture-compression.ts');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence capture compression model ===');

runTest('supported capture source types are explicit', () => {
  assert.deepEqual(SALES_PHOTO_EVIDENCE_CAPTURE_SOURCE_MIME_TYPES, [
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);
});

runTest('supported capture creates primary fallback and thumbnail variant plan', () => {
  const decision = planSalesPhotoEvidenceCaptureCompression({
    mimeType: 'image/jpeg',
    fileSizeBytes: 4_500_000,
    width: 4032,
    height: 3024,
  });

  assert.equal(decision.action, 'prepare_compression');
  assert.equal(decision.reason, 'supported_image');

  if (decision.action !== 'prepare_compression') throw new Error('expected compression plan');

  assert.deepEqual(decision.plan.source, {
    mimeType: 'image/jpeg',
    fileSizeBytes: 4_500_000,
    width: 4032,
    height: 3024,
  });
  assert.deepEqual(decision.plan.primary, {
    kind: 'image',
    maxEdgePx: SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.targetMaxEdgePx,
    mimeType: 'image/webp',
    startQuality: SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.startQuality,
    minQuality: SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.minQuality,
    maxFileSizeBytes: SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes,
    stripExif: true,
  });
  assert.equal(decision.plan.fallback.mimeType, 'image/jpeg');
  assert.equal(decision.plan.fallback.maxEdgePx, SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.fallbackMaxEdgePx);
  assert.equal(decision.plan.thumbnail.kind, 'thumbnail');
  assert.equal(decision.plan.thumbnail.maxEdgePx, SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.thumbnailMaxEdgePx);
});

runTest('unsupported and unsafe source images fail closed before browser processing', () => {
  assert.deepEqual(
    planSalesPhotoEvidenceCaptureCompression({
      mimeType: 'image/gif',
      fileSizeBytes: 100_000,
      width: 640,
      height: 480,
    }),
    {
      action: 'reject_capture',
      reason: 'unsupported_mime_type',
      message: 'Captured image type is not supported for sales photo evidence.',
    }
  );

  assert.equal(
    planSalesPhotoEvidenceCaptureCompression({
      mimeType: 'image/jpeg',
      fileSizeBytes: SALES_PHOTO_EVIDENCE_MAX_SOURCE_FILE_SIZE_BYTES + 1,
      width: 640,
      height: 480,
    }).reason,
    'source_file_too_large'
  );

  assert.equal(
    planSalesPhotoEvidenceCaptureCompression({
      mimeType: 'image/jpeg',
      fileSizeBytes: 100_000,
      width: 0,
      height: 480,
    }).reason,
    'invalid_image_dimensions'
  );
});

runTest('compressed output classifier accepts only policy-compliant images', () => {
  assert.deepEqual(
    classifySalesPhotoEvidenceCompressionOutput({
      mimeType: 'image/webp',
      fileSizeBytes: 850_000,
      width: 1800,
      height: 1350,
    }),
    {
      accepted: true,
      reason: 'within_policy',
    }
  );

  assert.equal(
    classifySalesPhotoEvidenceCompressionOutput({
      mimeType: 'image/webp',
      fileSizeBytes: SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes + 1,
      width: 1800,
      height: 1350,
    }).reason,
    'output_too_large'
  );

  assert.equal(
    classifySalesPhotoEvidenceCompressionOutput({
      mimeType: 'image/png',
      fileSizeBytes: 850_000,
      width: 1800,
      height: 1350,
    }).reason,
    'unsupported_output_mime_type'
  );
});

runTest('capture compression model is pure and does not touch browser db cloud or storage runtime', () => {
  assert.doesNotMatch(captureCompressionSource, /@\/lib\/db|db\.|Dexie|indexedDB/i);
  assert.doesNotMatch(captureCompressionSource, /@\/lib\/supabase|supabase|from\(/i);
  assert.doesNotMatch(captureCompressionSource, /fetch\(|XMLHttpRequest|navigator\.|window\.|document\.|canvas|getUserMedia/i);
  assert.doesNotMatch(captureCompressionSource, /localStorage|sessionStorage|process\.env|NEXT_PUBLIC/);
  assert.doesNotMatch(captureCompressionSource, /\.(insert|update|delete|put|bulkPut|clear)\s*\(/);
  assert.doesNotMatch(captureCompressionSource, /signedUrl|signed_url|\bR2\b|upload/i);
});

runTest('risk-reduced merged plan records Phase A and keeps runtime boundaries closed', () => {
  assert.match(planSource, /Risk-Reduced Merged Execution Plan/);
  assert.match(planSource, /Phase A: Capture \+ Compression Local Capability/);
  assert.match(planSource, /Phase B: Upload Contract \+ Signed Access Design/);
  assert.match(planSource, /Phase C: Pending Evidence Active Flow/);
  assert.match(planSource, /Phase D: Owner Review \+ Expiration/);
  assert.match(planSource, /Slice 6A Status/);
  assert.match(planSource, /does not call camera APIs, canvas, Supabase, R2, upload, signed URLs, or production runtime enqueue/);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-capture-compression\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence capture compression tests failed`);
  }
}

main();
