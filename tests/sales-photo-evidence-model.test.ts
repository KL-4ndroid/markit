import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildSalesPhotoEvidenceObjectKey,
  canTransitionSalesPhotoEvidenceStatus,
  getAllowedSalesPhotoEvidenceTransitions,
  getSalesPhotoEvidenceExpiresAt,
  isSalesPhotoEvidenceStatus,
  SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY,
  SALES_PHOTO_EVIDENCE_RETENTION_DAYS,
  SALES_PHOTO_EVIDENCE_STATUSES,
} from '../lib/sales/photo-evidence-model';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const modelSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-model.ts'), 'utf8');

console.log('\n=== Sales photo evidence model ===');

runTest('status lifecycle stays explicit', () => {
  assert.deepEqual(SALES_PHOTO_EVIDENCE_STATUSES, [
    'not_required',
    'pending_capture',
    'capture_skipped',
    'captured_local',
    'uploading',
    'uploaded',
    'upload_failed',
    'expired',
    'waived_by_owner',
  ]);

  assert.equal(isSalesPhotoEvidenceStatus('uploaded'), true);
  assert.equal(isSalesPhotoEvidenceStatus('missing_photo'), false);
});

runTest('allowed transitions match the approved first implementation workflow', () => {
  assert.deepEqual(getAllowedSalesPhotoEvidenceTransitions('pending_capture'), [
    'capture_skipped',
    'captured_local',
    'waived_by_owner',
  ]);
  assert.deepEqual(getAllowedSalesPhotoEvidenceTransitions('capture_skipped'), [
    'captured_local',
    'waived_by_owner',
  ]);
  assert.deepEqual(getAllowedSalesPhotoEvidenceTransitions('captured_local'), [
    'uploading',
    'upload_failed',
  ]);
  assert.deepEqual(getAllowedSalesPhotoEvidenceTransitions('uploading'), [
    'uploaded',
    'upload_failed',
  ]);
  assert.deepEqual(getAllowedSalesPhotoEvidenceTransitions('upload_failed'), [
    'uploading',
    'captured_local',
    'waived_by_owner',
  ]);
  assert.deepEqual(getAllowedSalesPhotoEvidenceTransitions('uploaded'), [
    'expired',
    'captured_local',
  ]);
});

runTest('invalid shortcuts fail closed', () => {
  assert.equal(canTransitionSalesPhotoEvidenceStatus('pending_capture', 'uploaded'), false);
  assert.equal(canTransitionSalesPhotoEvidenceStatus('capture_skipped', 'uploaded'), false);
  assert.equal(canTransitionSalesPhotoEvidenceStatus('not_required', 'pending_capture'), false);
  assert.equal(canTransitionSalesPhotoEvidenceStatus('expired', 'uploaded'), false);
  assert.equal(canTransitionSalesPhotoEvidenceStatus('waived_by_owner', 'captured_local'), false);
});

runTest('R2 object keys are retention-scoped and split originals from thumbnails', () => {
  const baseInput = {
    ownerId: 'owner_1',
    marketId: 'market_2',
    saleId: 'sale_3',
    evidenceId: 'evidence_4',
  };

  assert.equal(
    buildSalesPhotoEvidenceObjectKey(baseInput),
    'sales-evidence/7d/owner_1/market_2/sale_3/evidence_4.webp'
  );
  assert.equal(
    buildSalesPhotoEvidenceObjectKey({ ...baseInput, kind: 'thumbnail' }),
    'sales-evidence-thumbs/7d/owner_1/market_2/sale_3/evidence_4.webp'
  );
});

runTest('R2 object key builder rejects path injection characters', () => {
  assert.throws(
    () =>
      buildSalesPhotoEvidenceObjectKey({
        ownerId: 'owner/1',
        marketId: 'market_2',
        saleId: 'sale_3',
        evidenceId: 'evidence_4',
      }),
    /ownerId contains invalid object-key characters/
  );

  assert.throws(
    () =>
      buildSalesPhotoEvidenceObjectKey({
        ownerId: 'owner_1',
        marketId: 'market_2',
        saleId: '..',
        evidenceId: 'evidence_4',
      }),
    /saleId contains invalid object-key characters/
  );

  assert.throws(
    () =>
      buildSalesPhotoEvidenceObjectKey({
        ownerId: 'owner_1',
        marketId: 'market_2',
        saleId: 'sale_3',
        evidenceId: 'evidence_4',
        extension: '../webp' as 'webp',
      }),
    /extension is not supported/
  );
});

runTest('expiration uses uploaded_at plus seven days', () => {
  assert.equal(SALES_PHOTO_EVIDENCE_RETENTION_DAYS, 7);
  assert.equal(
    getSalesPhotoEvidenceExpiresAt('2026-07-04T10:00:00.000Z'),
    '2026-07-11T10:00:00.000Z'
  );
  assert.throws(() => getSalesPhotoEvidenceExpiresAt('not-a-date'), /valid date/);
});

runTest('compression policy targets clear evidence under one megabyte', () => {
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes, 1_000_000);
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.targetMaxEdgePx, 2048);
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.fallbackMaxEdgePx, 1800);
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.thumbnailMaxEdgePx, 320);
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.startQuality, 0.82);
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.minQuality, 0.65);
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.preferredMimeType, 'image/webp');
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.fallbackMimeType, 'image/jpeg');
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.stripExif, true);
});

runTest('model remains pure and side-effect free for Slice 1', () => {
  assert.doesNotMatch(modelSource, /@\/lib\/db|db\.|Dexie|indexedDB/i);
  assert.doesNotMatch(modelSource, /@\/lib\/supabase|supabase|from\(/i);
  assert.doesNotMatch(modelSource, /fetch\(|XMLHttpRequest|navigator\.|window\.|document\./);
  assert.doesNotMatch(modelSource, /localStorage|sessionStorage|process\.env|NEXT_PUBLIC/);
  assert.doesNotMatch(modelSource, /insert\(|update\(|delete\(|put\(|bulkPut\(|clear\(/);
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
    throw new Error(`${failed} sales photo evidence model tests failed`);
  }
}

main();
