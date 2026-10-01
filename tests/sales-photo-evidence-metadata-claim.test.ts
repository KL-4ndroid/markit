import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createSalesPhotoEvidenceMetadataClaimPlan,
  type SalesPhotoEvidenceMetadataClaimInput,
} from '../lib/sales/photo-evidence-metadata-claim';
import type { SalesPhotoEvidenceStatus } from '../lib/sales/photo-evidence-model';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

const IDS = {
  ownerId: '11111111-1111-4111-8111-111111111111',
  staffId: '22222222-2222-4222-8222-222222222222',
  marketId: '33333333-3333-4333-8333-333333333333',
  saleId: '44444444-4444-4444-8444-444444444444',
  evidenceId: '55555555-5555-4555-8555-555555555555',
};

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const claimSource = readProjectFile('lib/sales/photo-evidence-metadata-claim.ts');
const executionPlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readProjectFile('scripts/test-files.txt');

function baseInput(overrides: Partial<SalesPhotoEvidenceMetadataClaimInput> = {}): SalesPhotoEvidenceMetadataClaimInput {
  return {
    actorId: IDS.ownerId,
    actorRole: 'owner',
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleEventId: IDS.saleId,
    capturedByStaffId: IDS.staffId,
    staffRelationshipActive: false,
    hasLocalPayload: true,
    saleEvent: {
      id: IDS.saleId,
      type: 'deal_closed',
      ownerId: IDS.ownerId,
      marketId: IDS.marketId,
      completedAt: '2026-07-07T01:02:03.000Z',
    },
    existingEvidence: null,
    ...overrides,
  };
}

function activeExistingRow(
  status: SalesPhotoEvidenceStatus = 'captured_local'
): NonNullable<SalesPhotoEvidenceMetadataClaimInput['existingEvidence']> {
  return {
    id: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    capturedByStaffId: IDS.staffId,
    status,
    deletedAt: null,
  };
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence metadata claim model ===');

runTest('owner can prepare a new metadata claim plan for a valid deal sale', () => {
  const plan = createSalesPhotoEvidenceMetadataClaimPlan(baseInput());

  assert.equal(plan.action, 'prepare_metadata_claim');
  assert.equal(plan.mode, 'create_then_mark_uploading');
  assert.equal(plan.evidenceId, null);
  assert.equal(plan.ownerId, IDS.ownerId);
  assert.equal(plan.marketId, IDS.marketId);
  assert.equal(plan.saleId, IDS.saleId);
  assert.equal(plan.transition.claimStatus, 'uploading');
  assert.equal(plan.transition.successStatus, 'uploaded');
  assert.equal(plan.transition.failureStatus, 'upload_failed');
  assert.equal(plan.shouldKeepLocalPayloadUntilServerSuccess, true);
  assert.equal(plan.shouldUploadAfterMetadataClaim, true);
});

runTest('staff can prepare a claim only for their own active relationship and row', () => {
  const plan = createSalesPhotoEvidenceMetadataClaimPlan(baseInput({
    actorId: IDS.staffId,
    actorRole: 'staff',
    staffRelationshipActive: true,
    existingEvidence: activeExistingRow(),
  }));

  assert.equal(plan.action, 'prepare_metadata_claim');
  assert.equal(plan.mode, 'reuse_then_mark_uploading');
  assert.equal(plan.evidenceId, IDS.evidenceId);
});

runTest('an uploading row reaches the authoritative RPC so its lease can be renewed or reclaimed', () => {
  const plan = createSalesPhotoEvidenceMetadataClaimPlan(baseInput({
    existingEvidence: activeExistingRow('uploading'),
  }));

  assert.equal(plan.action, 'prepare_metadata_claim');
  assert.equal(plan.mode, 'reuse_then_mark_uploading');
  assert.equal(plan.evidenceId, IDS.evidenceId);
});

runTest('staff without active relationship is denied before metadata writes', () => {
  const plan = createSalesPhotoEvidenceMetadataClaimPlan(baseInput({
    actorId: IDS.staffId,
    actorRole: 'staff',
    staffRelationshipActive: false,
    existingEvidence: activeExistingRow(),
  }));

  assert.equal(plan.action, 'reject_metadata_claim');
  assert.equal(plan.reason, 'permission_denied');
  assert.equal(plan.shouldKeepLocalPayload, true);
  assert.equal(plan.shouldWriteCloudMetadata, false);
});

runTest('invalid sale event scope rejects without upload', () => {
  const plan = createSalesPhotoEvidenceMetadataClaimPlan(baseInput({
    saleEvent: {
      id: IDS.saleId,
      type: 'interaction_recorded',
      ownerId: IDS.ownerId,
      marketId: IDS.marketId,
      completedAt: '2026-07-07T01:02:03.000Z',
    },
  }));

  assert.equal(plan.action, 'reject_metadata_claim');
  assert.equal(plan.reason, 'source_invalid');
  assert.equal(plan.shouldUploadAfterMetadataClaim, false);
});

runTest('mismatched existing evidence row rejects before reuse', () => {
  const plan = createSalesPhotoEvidenceMetadataClaimPlan(baseInput({
    existingEvidence: {
      ...activeExistingRow(),
      marketId: '66666666-6666-4666-8666-666666666666',
    },
  }));

  assert.equal(plan.action, 'reject_metadata_claim');
  assert.equal(plan.reason, 'source_invalid');
});

runTest('uploaded existing row is idempotent and does not request another upload', () => {
  const plan = createSalesPhotoEvidenceMetadataClaimPlan(baseInput({
    existingEvidence: activeExistingRow('uploaded'),
  }));

  assert.equal(plan.action, 'skip_metadata_claim');
  assert.equal(plan.reason, 'already_uploaded');
  assert.equal(plan.evidenceId, IDS.evidenceId);
  assert.equal(plan.shouldDeleteLocalPayloadAfterSuccess, true);
  assert.equal(plan.shouldUploadAfterMetadataClaim, false);
});

runTest('missing local payload rejects and keeps local deletion blocked', () => {
  const plan = createSalesPhotoEvidenceMetadataClaimPlan(baseInput({
    hasLocalPayload: false,
    existingEvidence: activeExistingRow(),
  }));

  assert.equal(plan.action, 'reject_metadata_claim');
  assert.equal(plan.reason, 'payload_missing');
  assert.equal(plan.shouldKeepLocalPayload, true);
  assert.equal(plan.shouldWriteCloudMetadata, false);
});

runTest('terminal evidence status rejects without metadata write', () => {
  const plan = createSalesPhotoEvidenceMetadataClaimPlan(baseInput({
    existingEvidence: activeExistingRow('waived_by_owner'),
  }));

  assert.equal(plan.action, 'reject_metadata_claim');
  assert.equal(plan.reason, 'status_not_uploadable');
  assert.equal(plan.shouldWriteCloudMetadata, false);
});

runTest('claim model stays dependency-free and does not implement Supabase or R2 mutation', () => {
  const forbiddenPatterns = [
    /from ['"].*supabase/i,
    /createClient/,
    /sale_photo_evidence/,
    /insert\s*\(/,
    /update\s*\(/,
    /upsert\s*\(/,
    /fetch\s*\(/,
    /formData\s*\(/,
    /@aws-sdk/,
    /S3Client/,
    /PutObjectCommand/,
    /process\.env/,
    /NEXT_PUBLIC/,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(claimSource, pattern);
  }
});

runTest('execution plan and package test script record 7B-3A boundary', () => {
  assert.match(executionPlanSource, /Slice 7B-3A Status/);
  assert.match(executionPlanSource, /photo-evidence-metadata-claim\.ts/);
  assert.match(executionPlanSource, /pure metadata claim plan model/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-metadata-claim\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence metadata claim tests failed`);
  }
}

main();
