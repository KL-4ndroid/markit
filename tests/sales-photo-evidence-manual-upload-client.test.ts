import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildSalesPhotoEvidenceManualUploadFormData,
  selectCanonicalSalesPhotoEvidenceSaleEventId,
  uploadPendingSalesPhotoEvidenceManually,
} from '../lib/sales/photo-evidence-manual-upload-client';
import type { LocalPendingSalesPhotoEvidencePayload } from '../lib/sales/photo-evidence-pending-payload-storage';
import type { SalesPhotoEvidencePendingCreationListItem } from '../lib/sales/photo-evidence-pending-creation-read-model';
import type { Event } from '../types/db';

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
const ownerPageSource = readProjectFile('components/markets/MarketDetailScreen.tsx');
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

function localSaleEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: item.saleEventId,
    type: 'deal_closed',
    payload: {
      market_id: item.marketId,
      totalAmount: 1,
    },
    timestamp: Date.parse(item.saleCompletedAt),
    actor_id: item.capturedByStaffId!,
    market_id: item.marketId,
    sync_status: 'local_only',
    ...overrides,
  } as Event;
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
    fetchImpl: async (url, init) => {
      calls.push(`fetch:${String(url)}:${init?.method}:${(init?.headers as Record<string, string>).Authorization}`);
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
    'fetch:/api/sales-photo-evidence/upload:POST:Bearer token',
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

runTest('manual upload never retries POST transport failures and keeps the local payload', async () => {
  let attempts = 0;
  let retryMarked = 0;
  const result = await uploadPendingSalesPhotoEvidenceManually(item, {
    getPayload: async () => payload(),
    waitForSaleEventSync: async () => true,
    getAccessToken: async () => 'token',
    fetchImpl: async () => {
      attempts += 1;
      throw new Error('offline detail must not escape');
    },
    markRetryableFailure: async () => {
      retryMarked += 1;
      return item;
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'network_error');
  assert.equal(result.shouldKeepLocalPayload, true);
  assert.equal(attempts, 1);
  assert.equal(retryMarked, 1);
});

runTest('permanent authentication rejection is not recorded as retryable', async () => {
  let retryMarked = false;
  const result = await uploadPendingSalesPhotoEvidenceManually(item, {
    getPayload: async () => payload(),
    waitForSaleEventSync: async () => true,
    getAccessToken: async () => 'token',
    fetchImpl: async () => new Response(JSON.stringify({
      ok: false,
      code: 'authentication_required',
      message: 'internal text is ignored',
      retryable: false,
    }), { status: 401 }),
    markRetryableFailure: async () => {
      retryMarked = true;
      return item;
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'authentication_required');
  assert.equal(retryMarked, false);
});

runTest('mobile upload uses the explicit HTTPS Vercel API origin', async () => {
  const previousBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const previousTarget = process.env.NEXT_PUBLIC_APP_BUILD_TARGET;
  let requestedUrl = '';
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://app.example.test';
  process.env.NEXT_PUBLIC_APP_BUILD_TARGET = 'mobile';
  try {
    const result = await uploadPendingSalesPhotoEvidenceManually(item, {
      getPayload: async () => payload(),
      waitForSaleEventSync: async () => true,
      getAccessToken: async () => 'token',
      fetchImpl: async input => {
        requestedUrl = String(input);
        return new Response(JSON.stringify({
          ok: true,
          evidenceId: 'evidence-id',
          shouldDeleteLocalPayloadAfterSuccess: false,
        }), { status: 200 });
      },
      markCreated: async () => item,
    });
    assert.equal(result.ok, true);
    assert.equal(requestedUrl, 'https://app.example.test/api/sales-photo-evidence/upload');
  } finally {
    if (previousBase === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = previousBase;
    if (previousTarget === undefined) delete process.env.NEXT_PUBLIC_APP_BUILD_TARGET;
    else process.env.NEXT_PUBLIC_APP_BUILD_TARGET = previousTarget;
  }
});

runTest('manual upload falls through to the server authority when the local sale sync marker stays stale', async () => {
  let fetchCalled = 0;
  const result = await uploadPendingSalesPhotoEvidenceManually(item, {
    getPayload: async () => payload(),
    waitForSaleEventSync: async () => false,
    resolveCanonicalSaleEventId: async () => null,
    getAccessToken: async () => 'token',
    fetchImpl: async () => {
      fetchCalled += 1;
      return new Response(JSON.stringify({
        ok: true,
        evidenceId: '55555555-5555-4555-8555-555555555555',
        shouldDeleteLocalPayloadAfterSuccess: true,
      }), { status: 200 });
    },
    deletePayload: async () => undefined,
    markCreated: async () => item,
  });

  assert.equal(result.ok, true);
  assert.equal(fetchCalled, 1);
});

runTest('server source rejection after a stale local marker keeps the photo and reports sync pending', async () => {
  let payloadDeleted = false;
  const result = await uploadPendingSalesPhotoEvidenceManually(item, {
    getPayload: async () => payload(),
    waitForSaleEventSync: async () => false,
    resolveCanonicalSaleEventId: async () => null,
    getAccessToken: async () => 'token',
    fetchImpl: async () => new Response(JSON.stringify({
      ok: false,
      code: 'source_invalid',
      message: 'internal source detail is ignored',
      retryable: false,
      shouldKeepLocalPayload: true,
    }), { status: 400 }),
    deletePayload: async () => {
      payloadDeleted = true;
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'source_invalid');
  assert.equal(result.message, '成交資料仍在同步，照片已保留在此裝置。請確認網路後稍候再試。');
  assert.equal(result.shouldKeepLocalPayload, true);
  assert.equal(payloadDeleted, false);
});

runTest('canonical sale selection requires one exact market, type, actor, and millisecond match', () => {
  const event = localSaleEvent();
  const exact = {
    id: '66666666-6666-4666-8666-666666666666',
    type: 'deal_closed',
    market_id: item.marketId,
    actor_id: item.capturedByStaffId,
    timestamp: item.saleCompletedAt,
  };

  assert.equal(selectCanonicalSalesPhotoEvidenceSaleEventId(item, event, [exact]), exact.id);
  assert.equal(selectCanonicalSalesPhotoEvidenceSaleEventId(item, event, []), null);
  assert.equal(selectCanonicalSalesPhotoEvidenceSaleEventId(item, event, [exact, {
    ...exact,
    id: '77777777-7777-4777-8777-777777777777',
  }]), null);
  assert.equal(selectCanonicalSalesPhotoEvidenceSaleEventId(item, event, [{
    ...exact,
    actor_id: '88888888-8888-4888-8888-888888888888',
  }]), null);
  assert.equal(selectCanonicalSalesPhotoEvidenceSaleEventId(item, event, [{
    ...exact,
    timestamp: '2026-07-01T00:00:00.001Z',
  }]), null);
});

runTest('stale local sale id uploads once with the unique canonical cloud id and keeps the queue id', async () => {
  const canonicalSaleEventId = '66666666-6666-4666-8666-666666666666';
  let requestedSaleEventId = '';
  let requestedQueueId = '';
  const result = await uploadPendingSalesPhotoEvidenceManually(item, {
    getPayload: async () => payload(),
    waitForSaleEventSync: async () => false,
    resolveCanonicalSaleEventId: async () => canonicalSaleEventId,
    getAccessToken: async () => 'token',
    fetchImpl: async (_url, init) => {
      const body = init?.body as FormData;
      requestedSaleEventId = String(body.get('saleEventId'));
      requestedQueueId = String(body.get('queueId'));
      return new Response(JSON.stringify({
        ok: true,
        evidenceId: '55555555-5555-4555-8555-555555555555',
        shouldDeleteLocalPayloadAfterSuccess: true,
      }), { status: 200 });
    },
    deletePayload: async () => undefined,
    markCreated: async () => item,
  });

  assert.equal(result.ok, true);
  assert.equal(requestedSaleEventId, canonicalSaleEventId);
  assert.equal(requestedQueueId, item.queueId);
});

runTest('manual upload reports invalid remote API configuration without making a request', async () => {
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalConsoleError = console.error;
  let fetchCalled = false;
  let retryCode: string | null = null;

  process.env.NEXT_PUBLIC_API_BASE_URL = '/relative-api';
  console.error = () => undefined;
  try {
    const result = await uploadPendingSalesPhotoEvidenceManually(item, {
      getPayload: async () => payload(),
      waitForSaleEventSync: async () => true,
      getAccessToken: async () => 'token',
      fetchImpl: async () => {
        fetchCalled = true;
        return new Response(null, { status: 500 });
      },
      markRetryableFailure: async input => {
        retryCode = input.code;
        return item;
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, 'api_base_url_invalid');
    assert.equal(retryCode, 'api_base_url_invalid');
    assert.equal(fetchCalled, false);
  } finally {
    console.error = originalConsoleError;
    if (originalApiBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    }
  }
});

runTest('client and UI reuse existing route and stay out of R2 SDK storage internals', () => {
  assert.match(clientSource, /buildAppApiUrl\('\/api\/sales-photo-evidence\/upload'\)/);
  assert.match(clientSource, /isAppApiUrlError/);
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
