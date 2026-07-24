import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createSalesPhotoEvidenceMetadataClaimSupabaseRepository,
  type SalesPhotoEvidenceFinalizeUploadedMetadataInput,
  type SalesPhotoEvidenceMarkUploadFailedMetadataInput,
  type SalesPhotoEvidenceMetadataClaimSupabaseClient,
  type SalesPhotoEvidenceServerMutationRepository,
} from '../lib/supabase/sales-photo-evidence-metadata-claim-repository';
import type {
  SalesPhotoEvidenceCreateUploadingClaimInput,
  SalesPhotoEvidenceMarkUploadingClaimInput,
} from '../lib/sales/photo-evidence-metadata-claim-adapter';

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

type QueryCall = {
  table: string;
  operation: 'select' | 'insert' | 'update';
  columns?: string;
  values?: Record<string, unknown>;
  filters: Array<{ column: string; value: string | null; operator: 'eq' | 'is' }>;
  terminal?: 'maybeSingle' | 'single';
};

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const repositorySource = readProjectFile('lib/supabase/sales-photo-evidence-metadata-claim-repository.ts');
const executionPlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readProjectFile('scripts/test-files.txt');

function createFakeClient(
  responses: Record<string, { data: unknown | null; error: unknown | null }>
): SalesPhotoEvidenceMetadataClaimSupabaseClient & { calls: QueryCall[] } {
  const calls: QueryCall[] = [];

  return {
    calls,
    from(table) {
      return {
        select(columns: string) {
          const call: QueryCall = { table, operation: 'select', columns, filters: [] };
          calls.push(call);
          return buildQuery(call);
        },
        insert(values: Record<string, unknown>) {
          const call: QueryCall = { table, operation: 'insert', values, filters: [] };
          calls.push(call);
          return buildQuery(call);
        },
        update(values: Record<string, unknown>) {
          const call: QueryCall = { table, operation: 'update', values, filters: [] };
          calls.push(call);
          return buildQuery(call);
        },
      };
    },
  };

  function buildQuery(call: QueryCall) {
    return {
      eq(column: string, value: string) {
        call.filters.push({ column, value, operator: 'eq' });
        return this;
      },
      is(column: string, value: null) {
        call.filters.push({ column, value, operator: 'is' });
        return this;
      },
      select(columns: string) {
        call.columns = columns;
        return this;
      },
      async maybeSingle() {
        call.terminal = 'maybeSingle';
        return responses[call.table] ?? { data: null, error: null };
      },
      async single() {
        call.terminal = 'single';
        return responses[`${call.table}:${call.operation}`] ?? responses[call.table] ?? { data: null, error: null };
      },
    };
  }
}

function evidenceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: IDS.evidenceId,
    owner_id: IDS.ownerId,
    market_id: IDS.marketId,
    sale_id: IDS.saleId,
    captured_by_staff_id: IDS.staffId,
    status: 'captured_local',
    deleted_at: null,
    ...overrides,
  };
}

type MutationCalls = {
  create: SalesPhotoEvidenceCreateUploadingClaimInput[];
  mark: SalesPhotoEvidenceMarkUploadingClaimInput[];
  finalize: SalesPhotoEvidenceFinalizeUploadedMetadataInput[];
  fail: SalesPhotoEvidenceMarkUploadFailedMetadataInput[];
};

function createFakeMutationRepository(options: { throwOnCreate?: boolean } = {}):
  SalesPhotoEvidenceServerMutationRepository & { calls: MutationCalls } {
  const calls: MutationCalls = {
    create: [],
    mark: [],
    finalize: [],
    fail: [],
  };

  return {
    calls,
    async createEvidenceUploadingClaim(input) {
      calls.create.push(input);
      if (options.throwOnCreate) {
        throw new Error('Sales photo evidence metadata claim insert failed.');
      }
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
      return {
        id: input.evidenceId,
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        capturedByStaffId: IDS.staffId,
        status: 'uploading',
      };
    },
    async finalizeEvidenceUploaded(input) {
      calls.finalize.push(input);
      return {
        id: input.evidenceId,
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        capturedByStaffId: IDS.staffId,
        status: 'uploaded',
      };
    },
    async markEvidenceUploadFailed(input) {
      calls.fail.push(input);
      return {
        id: input.evidenceId,
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        capturedByStaffId: IDS.staffId,
        status: 'upload_failed',
      };
    },
  };
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Supabase sales photo evidence metadata claim repository ===');

runTest('sale event lookup uses deal owner market filters and maps joined owner', async () => {
  const client = createFakeClient({
    events: {
      data: {
        id: IDS.saleId,
        type: 'deal_closed',
        market_id: IDS.marketId,
        timestamp: '2026-07-07T01:02:03.000Z',
        markets: { owner_id: IDS.ownerId },
      },
      error: null,
    },
  });
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(
    client,
    createFakeMutationRepository()
  );
  const event = await repository.getSaleEventForEvidenceClaim({
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleEventId: IDS.saleId,
  });

  assert.deepEqual(event, {
    id: IDS.saleId,
    type: 'deal_closed',
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    completedAt: '2026-07-07T01:02:03.000Z',
  });
  assert.deepEqual(client.calls[0].filters, [
    { column: 'id', value: IDS.saleId, operator: 'eq' },
    { column: 'market_id', value: IDS.marketId, operator: 'eq' },
    { column: 'type', value: 'deal_closed', operator: 'eq' },
  ]);
});

runTest('sale event lookup defers staff-scoped validation to the server mutation RPC', async () => {
  const client = createFakeClient({
    events: { data: null, error: null },
  });
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(
    client,
    createFakeMutationRepository()
  );
  const event = await repository.getSaleEventForEvidenceClaim({
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleEventId: IDS.saleId,
    saleCompletedAt: '2026-07-07T01:02:03.000Z',
  });

  assert.deepEqual(event, {
    id: IDS.saleId,
    type: 'deal_closed',
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    completedAt: '2026-07-07T01:02:03.000Z',
  });
  assert.equal(client.calls.length, 1);
  assert.doesNotMatch(repositorySource, /client\.rpc\('is_sale_photo_evidence_sale_event'/);
});

runTest('active evidence lookup filters owner market sale and not-deleted row', async () => {
  const client = createFakeClient({
    sale_photo_evidence: { data: evidenceRow(), error: null },
  });
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(
    client,
    createFakeMutationRepository()
  );
  const row = await repository.getActiveEvidenceForSale({
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleEventId: IDS.saleId,
  });

  assert.equal(row?.id, IDS.evidenceId);
  assert.equal(row?.status, 'captured_local');
  assert.deepEqual(client.calls[0].filters, [
    { column: 'owner_id', value: IDS.ownerId, operator: 'eq' },
    { column: 'market_id', value: IDS.marketId, operator: 'eq' },
    { column: 'sale_id', value: IDS.saleId, operator: 'eq' },
    { column: 'deleted_at', value: null, operator: 'is' },
  ]);
});

runTest('staff relationship lookup requires active relationship', async () => {
  const client = createFakeClient({
    staff_relationships: { data: { owner_id: IDS.ownerId }, error: null },
  });
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(
    client,
    createFakeMutationRepository()
  );
  const active = await repository.isStaffRelationshipActive({
    ownerId: IDS.ownerId,
    staffId: IDS.staffId,
  });

  assert.equal(active, true);
  assert.deepEqual(client.calls[0].filters, [
    { column: 'owner_id', value: IDS.ownerId, operator: 'eq' },
    { column: 'staff_id', value: IDS.staffId, operator: 'eq' },
    { column: 'status', value: 'active', operator: 'eq' },
  ]);
});

runTest('create uploading claim delegates only to the server mutation repository', async () => {
  const client = createFakeClient({});
  const mutations = createFakeMutationRepository();
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client, mutations);
  const input: SalesPhotoEvidenceCreateUploadingClaimInput = {
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    capturedByStaffId: IDS.staffId,
    status: 'uploading',
    saleCompletedAt: '2026-07-07T01:02:03.000Z',
    capturedAt: '2026-07-07T01:05:00.000Z',
  };
  const row = await repository.createEvidenceUploadingClaim(input);

  assert.equal(row.status, 'uploading');
  assert.deepEqual(mutations.calls.create, [input]);
  assert.equal(client.calls.length, 0);
});

runTest('mark uploading claim delegates scoped input only to the server mutation repository', async () => {
  const client = createFakeClient({});
  const mutations = createFakeMutationRepository();
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client, mutations);
  const input: SalesPhotoEvidenceMarkUploadingClaimInput = {
    evidenceId: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    status: 'uploading',
    capturedAt: '2026-07-07T01:05:00.000Z',
  };
  const row = await repository.markEvidenceUploading(input);

  assert.equal(row.status, 'uploading');
  assert.deepEqual(mutations.calls.mark, [input]);
  assert.equal(client.calls.length, 0);
});

runTest('finalize uploaded delegates only to the server mutation repository', async () => {
  const client = createFakeClient({});
  const mutations = createFakeMutationRepository();
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client, mutations);
  const input: SalesPhotoEvidenceFinalizeUploadedMetadataInput = {
    evidenceId: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    imageObjectKey: 'sales-evidence/7d/a/b/c/d.webp',
    thumbnailObjectKey: 'sales-evidence-thumbs/7d/a/b/c/d.webp',
    mimeType: 'image/webp',
    width: 1200,
    height: 900,
    fileSizeBytes: 4,
    capturedAt: '2026-07-07T01:05:00.000Z',
    uploadedAt: '2026-07-07T02:00:00.000Z',
    expiresAt: '2026-07-14T02:00:00.000Z',
  };
  const row = await repository.finalizeEvidenceUploaded(input);

  assert.equal(row.status, 'uploaded');
  assert.deepEqual(mutations.calls.finalize, [input]);
  assert.equal(client.calls.length, 0);
});

runTest('mark upload failed delegates only to the server mutation repository', async () => {
  const client = createFakeClient({});
  const mutations = createFakeMutationRepository();
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client, mutations);
  const input: SalesPhotoEvidenceMarkUploadFailedMetadataInput = {
    evidenceId: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    reason: 'r2_image_upload_failed',
  };
  const row = await repository.markEvidenceUploadFailed(input);

  assert.equal(row.status, 'upload_failed');
  assert.deepEqual(mutations.calls.fail, [input]);
  assert.equal(client.calls.length, 0);
});

runTest('repository propagates sanitized server mutation failures without a user-client fallback', async () => {
  const client = createFakeClient({});
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(
    client,
    createFakeMutationRepository({ throwOnCreate: true })
  );

  await assert.rejects(
    () => repository.createEvidenceUploadingClaim({
      ownerId: IDS.ownerId,
      marketId: IDS.marketId,
      saleId: IDS.saleId,
      capturedByStaffId: IDS.staffId,
      status: 'uploading',
      saleCompletedAt: '2026-07-07T01:02:03.000Z',
      capturedAt: '2026-07-07T01:05:00.000Z',
    }),
    /metadata claim insert failed/
  );
  assert.equal(client.calls.length, 0);
});

runTest('repository source avoids route R2 signed URL and global client wiring', () => {
  const forbiddenPatterns = [
    /next\/server/,
    /from ['"].*client/,
    /@aws-sdk/,
    /S3Client/,
    /PutObjectCommand/,
    /GetObjectCommand/,
    /getSignedUrl/,
    /process\.env/,
    /NEXT_PUBLIC/,
    /formData\s*\(/,
    /deletePendingSalesPhotoEvidencePayload/,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(repositorySource, pattern);
  }
});

runTest('execution plan and package script include Supabase repository guardrail', () => {
  assert.match(executionPlanSource, /Slice 7B-3D Status/);
  assert.match(executionPlanSource, /sales-photo-evidence-metadata-claim-repository\.ts/);
  assert.match(executionPlanSource, /concrete Supabase metadata claim repository/);
  assert.match(testManifestSource, /tsx tests\/supabase-sales-photo-evidence-metadata-claim-repository\.test\.ts/);
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
    throw new Error(`${failed} Supabase sales photo evidence metadata claim repository tests failed`);
  }
}

main();
