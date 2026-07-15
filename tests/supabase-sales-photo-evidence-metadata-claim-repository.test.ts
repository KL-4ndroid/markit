import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createSalesPhotoEvidenceMetadataClaimSupabaseRepository,
  type SalesPhotoEvidenceMetadataClaimSupabaseClient,
} from '../lib/supabase/sales-photo-evidence-metadata-claim-repository';

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
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client);
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

runTest('sale event lookup falls back to the security definer validator for staff-scoped reads', async () => {
  const baseClient = createFakeClient({
    events: { data: null, error: null },
  });
  let rpcArgs: Record<string, string> | null = null;
  const client: SalesPhotoEvidenceMetadataClaimSupabaseClient = {
    ...baseClient,
    async rpc(_fn, args) {
      rpcArgs = args;
      return { data: true, error: null };
    },
  };
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client);
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
  assert.deepEqual(rpcArgs, {
    p_sale_id: IDS.saleId,
    p_market_id: IDS.marketId,
    p_owner_id: IDS.ownerId,
  });
});

runTest('active evidence lookup filters owner market sale and not-deleted row', async () => {
  const client = createFakeClient({
    sale_photo_evidence: { data: evidenceRow(), error: null },
  });
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client);
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
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client);
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

runTest('create uploading claim inserts only metadata status uploading', async () => {
  const client = createFakeClient({
    'sale_photo_evidence:insert': {
      data: evidenceRow({ status: 'uploading' }),
      error: null,
    },
  });
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client);
  const row = await repository.createEvidenceUploadingClaim({
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    capturedByStaffId: IDS.staffId,
    status: 'uploading',
    saleCompletedAt: '2026-07-07T01:02:03.000Z',
    capturedAt: '2026-07-07T01:05:00.000Z',
  });

  assert.equal(row.status, 'uploading');
  assert.deepEqual(client.calls[0].values, {
    owner_id: IDS.ownerId,
    market_id: IDS.marketId,
    sale_id: IDS.saleId,
    captured_by_staff_id: IDS.staffId,
    status: 'uploading',
    sale_completed_at: '2026-07-07T01:02:03.000Z',
    captured_at: '2026-07-07T01:05:00.000Z',
  });
});

runTest('mark uploading claim updates only matching scoped active row', async () => {
  const client = createFakeClient({
    'sale_photo_evidence:update': {
      data: evidenceRow({ status: 'uploading' }),
      error: null,
    },
  });
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client);
  const row = await repository.markEvidenceUploading({
    evidenceId: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    status: 'uploading',
    capturedAt: '2026-07-07T01:05:00.000Z',
  });

  assert.equal(row.status, 'uploading');
  assert.deepEqual(client.calls[0].values, {
    status: 'uploading',
    captured_at: '2026-07-07T01:05:00.000Z',
  });
  assert.deepEqual(client.calls[0].filters, [
    { column: 'id', value: IDS.evidenceId, operator: 'eq' },
    { column: 'owner_id', value: IDS.ownerId, operator: 'eq' },
    { column: 'market_id', value: IDS.marketId, operator: 'eq' },
    { column: 'sale_id', value: IDS.saleId, operator: 'eq' },
    { column: 'deleted_at', value: null, operator: 'is' },
  ]);
});

runTest('finalize uploaded updates only matching scoped metadata after R2 success', async () => {
  const client = createFakeClient({
    'sale_photo_evidence:update': {
      data: evidenceRow({ status: 'uploaded' }),
      error: null,
    },
  });
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client);

  const row = await repository.finalizeEvidenceUploaded({
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
  });

  assert.equal(row.status, 'uploaded');
  assert.deepEqual(client.calls[0].values, {
    status: 'uploaded',
    r2_object_key: 'sales-evidence/7d/a/b/c/d.webp',
    r2_thumbnail_key: 'sales-evidence-thumbs/7d/a/b/c/d.webp',
    mime_type: 'image/webp',
    width: 1200,
    height: 900,
    file_size_bytes: 4,
    captured_at: '2026-07-07T01:05:00.000Z',
    uploaded_at: '2026-07-07T02:00:00.000Z',
    expires_at: '2026-07-14T02:00:00.000Z',
    failure_reason: null,
  });
});

runTest('mark upload failed updates only matching scoped retry metadata', async () => {
  const client = createFakeClient({
    'sale_photo_evidence:update': {
      data: evidenceRow({ status: 'upload_failed' }),
      error: null,
    },
  });
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client);

  const row = await repository.markEvidenceUploadFailed({
    evidenceId: IDS.evidenceId,
    ownerId: IDS.ownerId,
    marketId: IDS.marketId,
    saleId: IDS.saleId,
    reason: 'r2_image_upload_failed',
  });

  assert.equal(row.status, 'upload_failed');
  assert.deepEqual(client.calls[0].values, {
    status: 'upload_failed',
    failure_reason: 'r2_image_upload_failed',
  });
});

runTest('repository throws on Supabase write errors without deleting local payloads', async () => {
  const client = createFakeClient({
    'sale_photo_evidence:insert': { data: null, error: { message: 'blocked' } },
  });
  const repository = createSalesPhotoEvidenceMetadataClaimSupabaseRepository(client);

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
