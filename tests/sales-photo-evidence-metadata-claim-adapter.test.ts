import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  executeSalesPhotoEvidenceMetadataClaimAdapter,
  type SalesPhotoEvidenceCreateUploadingClaimInput,
  type SalesPhotoEvidenceMarkUploadingClaimInput,
  type SalesPhotoEvidenceMetadataClaimRepository,
} from '../lib/sales/photo-evidence-metadata-claim-adapter';
import type {
  SalesPhotoEvidenceClaimExistingRow,
  SalesPhotoEvidenceClaimSaleEvent,
} from '../lib/sales/photo-evidence-metadata-claim';

type TestFn = () => void | Promise<void>;

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

const adapterSource = readProjectFile('lib/sales/photo-evidence-metadata-claim-adapter.ts');
const executionPlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readProjectFile('scripts/test-files.txt');

function validSaleEvent(): SalesPhotoEvidenceClaimSaleEvent {
  return {
    id: IDS.saleId,
    type: 'deal_closed',
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    completedAt: '2026-07-07T01:02:03.000Z',
  };
}

function existingEvidence(status: SalesPhotoEvidenceClaimExistingRow['status'] = 'captured_local'): SalesPhotoEvidenceClaimExistingRow {
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

function createRepository(overrides: Partial<{
  saleEvent: SalesPhotoEvidenceClaimSaleEvent | null;
  evidence: SalesPhotoEvidenceClaimExistingRow | null;
  staffRelationshipActive: boolean;
  throwOnCreate: boolean;
  throwOnMark: boolean;
}> = {}): SalesPhotoEvidenceMetadataClaimRepository & {
  calls: {
    create: SalesPhotoEvidenceCreateUploadingClaimInput[];
    mark: SalesPhotoEvidenceMarkUploadingClaimInput[];
    staffRelationship: number;
  };
} {
  const calls = {
    create: [] as SalesPhotoEvidenceCreateUploadingClaimInput[],
    mark: [] as SalesPhotoEvidenceMarkUploadingClaimInput[],
    staffRelationship: 0,
  };
  const saleEvent = overrides.saleEvent === undefined ? validSaleEvent() : overrides.saleEvent;
  const evidence = overrides.evidence === undefined ? null : overrides.evidence;
  const staffRelationshipActive = overrides.staffRelationshipActive ?? false;

  return {
    calls,
    async getSaleEventForEvidenceClaim() {
      return saleEvent;
    },
    async getActiveEvidenceForSale() {
      return evidence;
    },
    async isStaffRelationshipActive() {
      calls.staffRelationship += 1;
      return staffRelationshipActive;
    },
    async createEvidenceUploadingClaim(input) {
      calls.create.push(input);
      if (overrides.throwOnCreate) throw new Error('create failed');
      return {
        id: IDS.evidenceId,
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        capturedByStaffId: input.capturedByStaffId,
        status: 'uploading',
      };
    },
    async markEvidenceUploading(input) {
      calls.mark.push(input);
      if (overrides.throwOnMark) throw new Error('mark failed');
      return {
        id: input.evidenceId,
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        capturedByStaffId: IDS.staffId,
        status: 'uploading',
      };
    },
  };
}

function baseInput(overrides = {}) {
  return {
    actorId: IDS.ownerId,
    actorRole: 'owner' as const,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleEventId: IDS.saleId,
    capturedByStaffId: IDS.staffId,
    capturedAt: '2026-07-07T01:05:00.000Z',
    hasLocalPayload: true,
    ...overrides,
  };
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence metadata claim adapter ===');

runTest('disabled adapter builds a valid plan but performs no metadata writes', async () => {
  const repository = createRepository();
  const result = await executeSalesPhotoEvidenceMetadataClaimAdapter(baseInput(), repository);

  assert.equal(result.action, 'metadata_claim_disabled');
  assert.equal(result.shouldKeepLocalPayload, true);
  assert.equal(result.shouldUploadAfterMetadataClaim, false);
  assert.equal(repository.calls.create.length, 0);
  assert.equal(repository.calls.mark.length, 0);
});

runTest('enabled owner adapter creates a new uploading claim only', async () => {
  const repository = createRepository();
  const result = await executeSalesPhotoEvidenceMetadataClaimAdapter(baseInput({ writeEnabled: true }), repository);

  assert.equal(result.action, 'metadata_claim_created');
  assert.equal(result.row.status, 'uploading');
  assert.equal(result.shouldKeepLocalPayloadUntilServerSuccess, true);
  assert.equal(result.shouldUploadAfterMetadataClaim, true);
  assert.equal(repository.calls.create.length, 1);
  assert.equal(repository.calls.mark.length, 0);
  assert.deepEqual(repository.calls.create[0], {
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    capturedByStaffId: IDS.staffId,
    status: 'uploading',
    saleCompletedAt: '2026-07-07T01:02:03.000Z',
    capturedAt: '2026-07-07T01:05:00.000Z',
  });
});

runTest('enabled staff adapter reuses own existing row after active relationship check', async () => {
  const repository = createRepository({
    evidence: existingEvidence(),
    staffRelationshipActive: true,
  });
  const result = await executeSalesPhotoEvidenceMetadataClaimAdapter(
    baseInput({
      actorId: IDS.staffId,
      actorRole: 'staff' as const,
      writeEnabled: true,
    }),
    repository
  );

  assert.equal(result.action, 'metadata_claim_reused');
  assert.equal(repository.calls.staffRelationship, 1);
  assert.equal(repository.calls.create.length, 0);
  assert.equal(repository.calls.mark.length, 1);
  assert.deepEqual(repository.calls.mark[0], {
    evidenceId: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    status: 'uploading',
    capturedAt: '2026-07-07T01:05:00.000Z',
  });
});

runTest('inactive staff relationship rejects without write calls', async () => {
  const repository = createRepository({
    evidence: existingEvidence(),
    staffRelationshipActive: false,
  });
  const result = await executeSalesPhotoEvidenceMetadataClaimAdapter(
    baseInput({
      actorId: IDS.staffId,
      actorRole: 'staff' as const,
      writeEnabled: true,
    }),
    repository
  );

  assert.equal(result.action, 'metadata_claim_rejected');
  assert.equal(result.plan.reason, 'permission_denied');
  assert.equal(repository.calls.create.length, 0);
  assert.equal(repository.calls.mark.length, 0);
});

runTest('uploaded existing row returns idempotent skip without metadata writes', async () => {
  const repository = createRepository({ evidence: existingEvidence('uploaded') });
  const result = await executeSalesPhotoEvidenceMetadataClaimAdapter(baseInput({ writeEnabled: true }), repository);

  assert.equal(result.action, 'metadata_claim_skipped_uploaded');
  assert.equal(result.evidenceId, IDS.evidenceId);
  assert.equal(result.shouldDeleteLocalPayloadAfterSuccess, true);
  assert.equal(result.shouldUploadAfterMetadataClaim, false);
  assert.equal(repository.calls.create.length, 0);
  assert.equal(repository.calls.mark.length, 0);
});

runTest('invalid sale source rejects without metadata writes', async () => {
  const repository = createRepository({
    saleEvent: {
      ...validSaleEvent(),
      type: 'interaction_recorded',
    },
  });
  const result = await executeSalesPhotoEvidenceMetadataClaimAdapter(baseInput({ writeEnabled: true }), repository);

  assert.equal(result.action, 'metadata_claim_rejected');
  assert.equal(result.plan.reason, 'source_invalid');
  assert.equal(repository.calls.create.length, 0);
  assert.equal(repository.calls.mark.length, 0);
});

runTest('repository create failure maps to metadata_claim_failed and keeps local payload', async () => {
  const repository = createRepository({ throwOnCreate: true });
  const result = await executeSalesPhotoEvidenceMetadataClaimAdapter(baseInput({ writeEnabled: true }), repository);

  assert.equal(result.action, 'metadata_claim_failed');
  assert.equal(result.reason, 'metadata_claim_failed');
  assert.equal(result.shouldKeepLocalPayload, true);
  assert.equal(result.shouldUploadAfterMetadataClaim, false);
  assert.equal(repository.calls.create.length, 1);
});

runTest('adapter source avoids route R2 env and direct Supabase imports', () => {
  const forbiddenPatterns = [
    /next\/server/,
    /from ['"].*supabase/i,
    /createClient/,
    /@aws-sdk/,
    /S3Client/,
    /PutObjectCommand/,
    /GetObjectCommand/,
    /process\.env/,
    /NEXT_PUBLIC/,
    /formData\s*\(/,
    /fetch\s*\(/,
    /deletePendingSalesPhotoEvidencePayload/,
    /drain/i,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(adapterSource, pattern);
  }
});

runTest('execution plan and package script include adapter guardrail', () => {
  assert.match(executionPlanSource, /Slice 7B-3C Status/);
  assert.match(executionPlanSource, /photo-evidence-metadata-claim-adapter\.ts/);
  assert.match(executionPlanSource, /dependency-injected metadata claim adapter/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-metadata-claim-adapter\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence metadata claim adapter tests failed`);
  }
}

main();
