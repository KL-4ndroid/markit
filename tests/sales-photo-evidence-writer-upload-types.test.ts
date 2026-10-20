import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  classifySalesPhotoEvidenceWriterUploadFailure,
  createSalesPhotoEvidenceMetadataTransitionPlan,
  type SalesPhotoEvidenceWriterUploadFailureCode,
} from '../lib/sales/photo-evidence-writer-upload-types';
import type { SalesPhotoEvidenceStatus } from '../lib/sales/photo-evidence-model';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const typeSource = readProjectFile('lib/sales/photo-evidence-writer-upload-types.ts');
const executionPlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readProjectFile('scripts/test-files.txt');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence writer upload types ===');

runTest('uploadable statuses prepare an uploading to uploaded transition when local payload exists', () => {
  const statuses: Array<SalesPhotoEvidenceStatus | null> = [
    null,
    'pending_capture',
    'capture_skipped',
    'captured_local',
    'uploading',
    'upload_failed',
  ];

  for (const currentStatus of statuses) {
    const plan = createSalesPhotoEvidenceMetadataTransitionPlan({
      currentStatus,
      hasLocalPayload: true,
    });

    assert.equal(plan.action, 'prepare_upload_transition');
    assert.equal(plan.fromStatus, currentStatus);
    assert.equal(plan.claimStatus, 'uploading');
    assert.equal(plan.successStatus, 'uploaded');
    assert.equal(plan.failureStatus, 'upload_failed');
    assert.equal(plan.shouldUploadImage, true);
    assert.equal(plan.shouldUploadThumbnail, true);
    assert.equal(plan.shouldDeleteLocalPayloadAfterSuccess, true);
    assert.equal(plan.requiresExistingEvidenceRow, currentStatus !== null);
  }
});

runTest('missing local payload rejects upload and preserves local deletion boundary', () => {
  const plan = createSalesPhotoEvidenceMetadataTransitionPlan({
    currentStatus: 'captured_local',
    hasLocalPayload: false,
  });

  assert.equal(plan.action, 'reject_upload_transition');
  assert.equal(plan.reason, 'payload_missing');
  assert.equal(plan.shouldUploadImage, false);
  assert.equal(plan.shouldUploadThumbnail, false);
  assert.equal(plan.shouldDeleteLocalPayloadAfterSuccess, false);
  assert.equal(plan.requiresExistingEvidenceRow, true);
});

runTest('uploaded status is idempotent and permits local payload cleanup without another upload', () => {
  const plan = createSalesPhotoEvidenceMetadataTransitionPlan({
    currentStatus: 'uploaded',
    hasLocalPayload: true,
  });

  assert.equal(plan.action, 'skip_upload_transition');
  assert.equal(plan.reason, 'already_uploaded');
  assert.equal(plan.shouldUploadImage, false);
  assert.equal(plan.shouldUploadThumbnail, false);
  assert.equal(plan.shouldDeleteLocalPayloadAfterSuccess, true);
  assert.equal(plan.requiresExistingEvidenceRow, true);
});

runTest('terminal statuses reject upload without deleting local payload', () => {
  const statuses: SalesPhotoEvidenceStatus[] = [
    'not_required',
    'expired',
    'waived_by_owner',
  ];

  for (const currentStatus of statuses) {
    const plan = createSalesPhotoEvidenceMetadataTransitionPlan({
      currentStatus,
      hasLocalPayload: true,
    });

    assert.equal(plan.action, 'reject_upload_transition');
    assert.equal(plan.reason, 'status_not_uploadable');
    assert.equal(plan.shouldUploadImage, false);
    assert.equal(plan.shouldUploadThumbnail, false);
    assert.equal(plan.shouldDeleteLocalPayloadAfterSuccess, false);
    assert.equal(plan.requiresExistingEvidenceRow, true);
  }
});

runTest('blocked failures do not attempt R2 upload and keep local payload', () => {
  const blockedCodes: SalesPhotoEvidenceWriterUploadFailureCode[] = [
    'permission_denied',
    'source_invalid',
    'metadata_claim_failed',
    'payload_missing',
    'payload_invalid',
    'status_not_uploadable',
  ];

  for (const code of blockedCodes) {
    const classification = classifySalesPhotoEvidenceWriterUploadFailure(code);
    assert.equal(classification.severity, 'blocked');
    assert.equal(classification.shouldKeepLocalPayload, true);
    assert.equal(classification.shouldMarkEvidenceUploadFailed, false);
    assert.equal(classification.shouldAttemptR2Upload, false);
  }
});

runTest('cloud-side failures remain retryable and preserve local payload', () => {
  const retryableCodes: SalesPhotoEvidenceWriterUploadFailureCode[] = [
    'r2_image_upload_failed',
    'r2_thumbnail_upload_failed',
    'metadata_finalize_failed',
  ];

  for (const code of retryableCodes) {
    const classification = classifySalesPhotoEvidenceWriterUploadFailure(code);
    assert.equal(classification.severity, 'retryable');
    assert.equal(classification.shouldKeepLocalPayload, true);
    assert.equal(classification.shouldMarkEvidenceUploadFailed, true);
  }

  assert.equal(classifySalesPhotoEvidenceWriterUploadFailure('r2_image_upload_failed').shouldAttemptR2Upload, true);
  assert.equal(classifySalesPhotoEvidenceWriterUploadFailure('r2_thumbnail_upload_failed').shouldAttemptR2Upload, true);
  assert.equal(classifySalesPhotoEvidenceWriterUploadFailure('metadata_finalize_failed').shouldAttemptR2Upload, false);
});

runTest('already uploaded classification is idempotent and does not keep local payload', () => {
  const classification = classifySalesPhotoEvidenceWriterUploadFailure('already_uploaded');

  assert.equal(classification.severity, 'idempotent');
  assert.equal(classification.shouldKeepLocalPayload, false);
  assert.equal(classification.shouldMarkEvidenceUploadFailed, false);
  assert.equal(classification.shouldAttemptR2Upload, false);
});

runTest('writer upload types stay pure and do not import runtime cloud or browser primitives', () => {
  const forbiddenPatterns = [
    /from ['"].*db/,
    /from ['"].*supabase/,
    /\bfetch\b/,
    /\bXMLHttpRequest\b/,
    /\bFormData\b/,
    /\bBlob\b/,
    /\bFile\b/,
    /\bS3Client\b/,
    /\bPutObjectCommand\b/,
    /\bGetObjectCommand\b/,
    /\bcreatePresignedPost\b/,
    /\bgetSignedUrl\b/,
    /@aws-sdk/,
    /\bR2\b/,
    /process\.env/,
    /NEXT_PUBLIC/,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(typeSource, pattern);
  }
});

runTest('execution plan and package test script include 7B-1 guardrails', () => {
  assert.match(executionPlanSource, /Slice 7B-1 Status/);
  assert.match(executionPlanSource, /photo-evidence-writer-upload-types\.ts/);
  assert.match(executionPlanSource, /does not implement runtime routes, R2 clients, Supabase mutations, signed URLs, queue drain wiring, runtime enqueue enablement, cleanup execution, or production recovery behavior/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-writer-upload-types\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence writer upload type tests failed`);
  }
}

main();
