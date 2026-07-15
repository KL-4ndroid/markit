import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildSalesPhotoEvidenceManualUploadFormData,
  uploadPendingSalesPhotoEvidenceManually,
} from '../lib/sales/photo-evidence-manual-upload-client';
import type { LocalPendingSalesPhotoEvidencePayload } from '../lib/sales/photo-evidence-pending-payload-storage';
import type { SalesPhotoEvidencePendingCreationListItem } from '../lib/sales/photo-evidence-pending-creation-read-model';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const clientSource = readProjectFile('lib/sales/photo-evidence-manual-upload-client.ts');
const dialogSource = readProjectFile('components/markets/SalesPhotoEvidenceFlowDialog.tsx');
const flowHookSource = readProjectFile('hooks/useSalesPhotoEvidenceFlow.ts');
const staffViewSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const ownerPageSource = readProjectFile('app/markets/[id]/page.tsx');
const actionSource = readProjectFile('components/markets/SalesPhotoEvidenceManualUploadAction.tsx');
const testManifestSource = readProjectFile('scripts/test-files.txt');

const item: SalesPhotoEvidencePendingCreationListItem = {
  queueId: '11111111-1111-4111-8111-111111111111',
  saleEventId: '11111111-1111-4111-8111-111111111111',
  ownerId: '22222222-2222-4222-8222-222222222222',
  marketId: '33333333-3333-4333-8333-333333333333',
  capturedByStaffId: '44444444-4444-4444-8444-444444444444',
  saleCompletedAt: '2026-07-01T00:00:00.000Z',
  idempotencyKey: 'sales-photo-evidence:11111111-1111-4111-8111-111111111111',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  status: 'waiting_for_event_sync',
  retryCount: 0,
  lastErrorCode: null,
  lastErrorMessage: null,
};

function blob(size: number, type = 'image/webp'): Blob {
  return new Blob([new Uint8Array(size)], { type });
}

function payload(): LocalPendingSalesPhotoEvidencePayload {
  return {
    queueId: item.queueId,
    saleEventId: item.saleEventId,
    ownerId: item.ownerId,
    marketId: item.marketId,
    capturedByStaffId: item.capturedByStaffId,
    image: {
      blob: blob(10),
      contentHash: 'image-hash',
      mimeType: 'image/webp',
      fileSizeBytes: 10,
      width: 100,
      height: 80,
    },
    thumbnail: {
      blob: blob(5),
      contentHash: 'thumb-hash',
      mimeType: 'image/webp',
      fileSizeBytes: 5,
      width: 40,
      height: 32,
    },
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:01:00.000Z',
  };
}

console.log('\n=== Sales photo evidence manual upload client ===');

runTest('builds the approved multipart form data from existing compressed local payload', () => {
  const formData = buildSalesPhotoEvidenceManualUploadFormData(item, payload());

  assert.equal(formData.get('ownerId'), item.ownerId);
  assert.equal(formData.get('marketId'), item.marketId);
  assert.equal(formData.get('saleEventId'), item.saleEventId);
  assert.equal(formData.get('saleCompletedAt'), item.saleCompletedAt);
  assert.equal(formData.get('capturedByStaffId'), item.capturedByStaffId);
  assert.equal(formData.get('capturedAt'), '2026-07-01T00:01:00.000Z');
  assert.ok(formData.get('image') instanceof Blob);
  assert.ok(formData.get('thumbnail') instanceof Blob);
  assert.deepEqual(JSON.parse(String(formData.get('imageMetadata'))), {
    kind: 'image',
    mimeType: 'image/webp',
    fileSizeBytes: 10,
    width: 100,
    height: 80,
  });
});

runTest('successful manual upload deletes local payload only after server success and marks queue created', async () => {
  const calls: string[] = [];
  const result = await uploadPendingSalesPhotoEvidenceManually(item, {
    getPayload: async () => {
      calls.push('get_payload');
      return payload();
    },
    getAccessToken: async () => {
      calls.push('get_token');
      return 'token';
    },
    waitForSaleEventSync: async () => {
      calls.push('wait_for_sale_sync');
      return true;
    },
    fetchImpl: async (_url, init) => {
      calls.push(`fetch:${init?.method}:${(init?.headers as Record<string, string>).Authorization}`);
      assert.ok(init?.body instanceof FormData);
      return new Response(JSON.stringify({
        ok: true,
        evidenceId: '55555555-5555-4555-8555-555555555555',
        shouldDeleteLocalPayloadAfterSuccess: true,
      }), { status: 200 });
    },
    deletePayload: async queueId => {
      calls.push(`delete_payload:${queueId}`);
    },
    markCreated: async queueId => {
      calls.push(`mark_created:${queueId}`);
      return item;
    },
  });

  assert.deepEqual(result, {
    ok: true,
    evidenceId: '55555555-5555-4555-8555-555555555555',
    shouldDeleteLocalPayloadAfterSuccess: true,
  });
  assert.deepEqual(calls, [
    'get_payload',
    'wait_for_sale_sync',
    'get_token',
    'fetch:POST:Bearer token',
    `delete_payload:${item.queueId}`,
    `mark_created:${item.queueId}`,
  ]);
});

runTest('failed manual upload keeps local payload and marks retryable failure', async () => {
  const calls: string[] = [];
  const originalConsoleError = console.error;
  console.error = () => undefined;
  let result: Awaited<ReturnType<typeof uploadPendingSalesPhotoEvidenceManually>>;
  try {
    result = await uploadPendingSalesPhotoEvidenceManually(item, {
      getPayload: async () => payload(),
      waitForSaleEventSync: async () => true,
      getAccessToken: async () => 'token',
      fetchImpl: async () => new Response(JSON.stringify({
        ok: false,
        code: 'r2_image_upload_failed',
        message: 'R2 failed',
      }), { status: 500 }),
      deletePayload: async () => {
        calls.push('delete_payload');
      },
      markRetryableFailure: async input => {
        calls.push(`${input.queueId}:${input.code}:${input.message}`);
        return item;
      },
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(result.ok, false);
  assert.equal(result.code, 'r2_image_upload_failed');
  assert.equal(result.shouldKeepLocalPayload, true);
  assert.deepEqual(calls, [
    `${item.queueId}:r2_image_upload_failed:照片儲存服務上傳失敗，照片仍保留在此裝置，請稍後再試。`,
  ]);
});

runTest('manual upload waits for the sale event and keeps the photo local while sync is pending', async () => {
  let fetchCalled = false;
  const result = await uploadPendingSalesPhotoEvidenceManually(item, {
    getPayload: async () => payload(),
    waitForSaleEventSync: async () => false,
    getAccessToken: async () => 'token',
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response(null, { status: 500 });
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'sale_event_sync_pending');
  assert.equal(result.shouldKeepLocalPayload, true);
  assert.equal(fetchCalled, false);
});

runTest('client and UI reuse existing route and stay out of R2 SDK storage internals', () => {
  assert.match(clientSource, /fetchImpl\('\/api\/sales-photo-evidence\/upload'/);
  assert.match(clientSource, /deletePendingSalesPhotoEvidencePayload/);
  assert.match(clientSource, /markLocalPendingSalesPhotoEvidenceCreationCreated/);
  assert.match(clientSource, /markLocalPendingSalesPhotoEvidenceCreationRetryableFailure/);
  assert.match(clientSource, /trigger-sync/);
  assert.match(clientSource, /sale_event_sync_pending/);
  assert.doesNotMatch(clientSource, /@aws-sdk|S3Client|PutObjectCommand|R2_BUCKET|service_role/i);

  assert.match(actionSource, /export function SalesPhotoEvidenceManualUploadAction/);
  assert.match(dialogSource, /onUpload: \(/);
  assert.match(dialogSource, /onUpload\(state\.item, payload\)/);
  assert.doesNotMatch(dialogSource, /photo-evidence-manual-upload-client|fetch\(|supabase|@aws-sdk|R2_BUCKET|service_role/i);

  assert.match(flowHookSource, /uploadPendingSalesPhotoEvidenceManually\(item\)/);
  for (const source of [staffViewSource, ownerPageSource]) {
    assert.match(source, /useSalesPhotoEvidenceFlow/);
    assert.match(source, /onUpload=\{\(item, payload\) => void salesPhotoEvidenceFlow\.upload\(item, payload\)\}/);
    assert.doesNotMatch(source, /uploadPendingSalesPhotoEvidenceManually/);
  }
});

runTest('test manifest includes the manual upload client guardrail', () => {
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-manual-upload-client\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence manual upload client tests failed`);
  }
}

main();
