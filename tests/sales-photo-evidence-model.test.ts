import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildSalesPhotoEvidenceObjectKey,
  canTransitionSalesPhotoEvidenceStatus,
  createSalesPhotoEvidenceRequirementDecision,
  findActiveSalesPhotoEvidenceForSale,
  getAllowedSalesPhotoEvidenceTransitions,
  getSalesPhotoEvidenceExpiresAt,
  isSalesPhotoEvidenceObjectKeyBoundToIdentity,
  isSalesPhotoEvidenceStatus,
  SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY,
  SALES_PHOTO_EVIDENCE_MAX_TOTAL_PAYLOAD_BYTES,
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
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';
const SALE_EVENT_ID = '33333333-3333-4333-8333-333333333333';
const STAFF_ID = '44444444-4444-4444-8444-444444444444';

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

runTest('R2 object key binding requires the exact evidence identity kind and extension', () => {
  const identity = {
    ownerId: 'owner_1',
    marketId: 'market_2',
    saleId: 'sale_3',
    evidenceId: 'evidence_4',
    kind: 'image' as const,
  };

  assert.equal(isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    ...identity,
    key: 'sales-evidence/7d/owner_1/market_2/sale_3/evidence_4.webp',
  }), true);
  assert.equal(isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    ...identity,
    key: 'sales-evidence/7d/owner_1/market_2/sale_3/evidence_4.jpg',
  }), true);
  assert.equal(isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    ...identity,
    kind: 'thumbnail',
    key: 'sales-evidence-thumbs/7d/owner_1/market_2/sale_3/evidence_4.jpeg',
  }), true);
  assert.equal(isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    ...identity,
    key: 'sales-evidence/7d/another_owner/market_2/sale_3/evidence_4.webp',
  }), false);
  assert.equal(isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    ...identity,
    key: 'sales-evidence/7d/owner_1/another_market/sale_3/evidence_4.webp',
  }), false);
  assert.equal(isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    ...identity,
    key: 'sales-evidence/7d/owner_1/market_2/another_sale/evidence_4.webp',
  }), false);
  assert.equal(isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    ...identity,
    key: 'sales-evidence/7d/owner_1/market_2/sale_3/another_evidence.webp',
  }), false);
  assert.equal(isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    ...identity,
    kind: 'thumbnail',
    key: 'sales-evidence/7d/owner_1/market_2/sale_3/evidence_4.webp',
  }), false);
  assert.equal(isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    ...identity,
    key: 'sales-evidence/7d/owner_1/market_2/sale_3/evidence_4.png',
  }), false);
  assert.equal(isSalesPhotoEvidenceObjectKeyBoundToIdentity({
    ...identity,
    key: 'sales-evidence/7d/owner_1/market_2/sale_3/evidence_4.webp/extra',
  }), false);
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
  assert.equal(SALES_PHOTO_EVIDENCE_MAX_TOTAL_PAYLOAD_BYTES, 1_500_000);
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.targetMaxEdgePx, 2048);
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.fallbackMaxEdgePx, 1800);
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.thumbnailMaxEdgePx, 320);
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.startQuality, 0.82);
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.minQuality, 0.65);
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.preferredMimeType, 'image/webp');
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.fallbackMimeType, 'image/jpeg');
  assert.equal(SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.stripExif, true);
});

runTest('post-sale requirement decision does nothing when market does not require evidence', () => {
  assert.deepEqual(
    createSalesPhotoEvidenceRequirementDecision({
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
      saleEventId: SALE_EVENT_ID,
      saleCompletedAt: '2026-07-04T10:00:00.000Z',
      marketRequiresEvidence: false,
      capturedByStaffId: STAFF_ID,
      now: '2026-07-04T10:00:01.000Z',
    }),
    {
      action: 'not_required',
      reason: 'market_not_required',
    }
  );
});

runTest('post-sale requirement decision creates a pending metadata draft only', () => {
  assert.deepEqual(
    createSalesPhotoEvidenceRequirementDecision({
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
      saleEventId: SALE_EVENT_ID,
      saleCompletedAt: '2026-07-04T10:00:00.000Z',
      marketRequiresEvidence: true,
      capturedByStaffId: STAFF_ID,
      now: '2026-07-04T10:00:01.000Z',
    }),
    {
      action: 'create_pending',
      reason: 'market_requires_evidence',
      draft: {
        owner_id: OWNER_ID,
        market_id: MARKET_ID,
        sale_id: SALE_EVENT_ID,
        captured_by_staff_id: STAFF_ID,
        status: 'pending_capture',
        sale_completed_at: '2026-07-04T10:00:00.000Z',
        created_at: '2026-07-04T10:00:01.000Z',
        updated_at: '2026-07-04T10:00:01.000Z',
        deleted_at: null,
      },
    }
  );
});

runTest('post-sale requirement decision skips active existing evidence for idempotency', () => {
  const existingEvidence = {
    id: '55555555-5555-4555-8555-555555555555',
    sale_id: SALE_EVENT_ID,
    status: 'pending_capture' as const,
    deleted_at: null,
  };

  assert.equal(findActiveSalesPhotoEvidenceForSale([existingEvidence], SALE_EVENT_ID), existingEvidence);
  assert.deepEqual(
    createSalesPhotoEvidenceRequirementDecision({
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
      saleEventId: SALE_EVENT_ID,
      saleCompletedAt: '2026-07-04T10:00:00.000Z',
      marketRequiresEvidence: true,
      now: '2026-07-04T10:00:01.000Z',
      existingEvidence: [existingEvidence],
    }),
    {
      action: 'skip_existing',
      reason: 'active_evidence_exists',
      existingEvidence,
    }
  );
});

runTest('post-sale requirement decision ignores soft-deleted evidence rows', () => {
  const decision = createSalesPhotoEvidenceRequirementDecision({
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    saleEventId: SALE_EVENT_ID,
    saleCompletedAt: 1783159200000,
    marketRequiresEvidence: true,
    now: new Date('2026-07-04T10:00:01.000Z'),
    existingEvidence: [
      {
        sale_id: SALE_EVENT_ID,
        status: 'waived_by_owner',
        deleted_at: '2026-07-04T10:01:00.000Z',
      },
    ],
  });

  assert.equal(decision.action, 'create_pending');
});

runTest('post-sale requirement decision requires committed UUID identifiers before creating a draft', () => {
  assert.throws(
    () =>
      createSalesPhotoEvidenceRequirementDecision({
        ownerId: OWNER_ID,
        marketId: MARKET_ID,
        saleEventId: '',
        saleCompletedAt: '2026-07-04T10:00:00.000Z',
        marketRequiresEvidence: true,
      }),
    /saleEventId is required/
  );
  assert.throws(
    () =>
      createSalesPhotoEvidenceRequirementDecision({
        ownerId: OWNER_ID,
        marketId: MARKET_ID,
        saleEventId: 'local-temp-id',
        saleCompletedAt: '2026-07-04T10:00:00.000Z',
        marketRequiresEvidence: true,
      }),
    /saleEventId must be a UUID/
  );
  assert.throws(
    () =>
      createSalesPhotoEvidenceRequirementDecision({
        ownerId: OWNER_ID,
        marketId: MARKET_ID,
        saleEventId: SALE_EVENT_ID,
        saleCompletedAt: 'invalid-date',
        marketRequiresEvidence: true,
      }),
    /saleCompletedAt must be a valid date/
  );
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
