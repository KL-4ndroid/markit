import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  captureAndStoreSalesPhotoEvidenceWithFileInput,
  type SalesPhotoEvidenceDecodedImage,
} from '../lib/sales/photo-evidence-browser-adapter';
import { createLocalPendingSalesPhotoEvidenceCreation } from '../lib/sales/photo-evidence-pending-creation';
import type {
  LocalPendingSalesPhotoEvidencePayload,
  SalesPhotoEvidencePendingPayloadVariant,
} from '../lib/sales/photo-evidence-pending-payload-storage';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const adapterSource = readProjectFile('lib/sales/photo-evidence-browser-adapter.ts');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';
const SALE_EVENT_ID = '33333333-3333-4333-8333-333333333333';
const STAFF_ID = '44444444-4444-4444-8444-444444444444';

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function makeQueueItem() {
  return createLocalPendingSalesPhotoEvidenceCreation({
    saleEventId: SALE_EVENT_ID,
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    capturedByStaffId: STAFF_ID,
    saleCompletedAt: '2026-07-06T10:00:00.000Z',
    now: '2026-07-06T10:01:00.000Z',
  });
}

function makeFile(size = 2000, type = 'image/jpeg'): File {
  return new File([new Uint8Array(size)], 'receipt.jpg', { type });
}

function makeBlob(size: number, type = 'image/webp'): Blob {
  return new Blob([new Uint8Array(size)], { type });
}

function makeVariant(
  kind: 'image' | 'thumbnail',
  overrides: Partial<SalesPhotoEvidencePendingPayloadVariant> = {}
): SalesPhotoEvidencePendingPayloadVariant {
  const fileSizeBytes = overrides.fileSizeBytes ?? (kind === 'image' ? 1000 : 200);
  const mimeType = overrides.mimeType ?? 'image/webp';
  return {
    blob: overrides.blob ?? makeBlob(fileSizeBytes, mimeType),
    mimeType,
    fileSizeBytes,
    width: overrides.width ?? (kind === 'image' ? 900 : 240),
    height: overrides.height ?? (kind === 'image' ? 600 : 160),
    contentHash: overrides.contentHash ?? `${kind}-hash`,
  };
}

function readySnapshot() {
  return {
    secureContext: true,
    mediaCaptureAvailable: true,
    imageProcessingAvailable: true,
  };
}

function decodedImage(closeCalls: string[] = []): SalesPhotoEvidenceDecodedImage {
  return {
    width: 1200,
    height: 800,
    drawable: {} as CanvasImageSource,
    close: () => closeCalls.push('close'),
  };
}

function payloadFromInput(input: {
  queueItem: ReturnType<typeof makeQueueItem>;
  image: SalesPhotoEvidencePendingPayloadVariant;
  thumbnail: SalesPhotoEvidencePendingPayloadVariant;
  now?: string | number | Date;
}): LocalPendingSalesPhotoEvidencePayload {
  const now = new Date(input.now ?? '2026-07-06T10:02:00.000Z').toISOString();
  return {
    queueId: input.queueItem.queueId,
    saleEventId: input.queueItem.saleEventId,
    ownerId: input.queueItem.ownerId,
    marketId: input.queueItem.marketId,
    capturedByStaffId: input.queueItem.capturedByStaffId,
    image: input.image,
    thumbnail: input.thumbnail,
    createdAt: now,
    updatedAt: now,
  };
}

console.log('\n=== Sales photo evidence browser adapter runtime ===');

runTest('adapter captures decodes renders and stores a local payload through injected boundaries', async () => {
  const calls: string[] = [];
  const closeCalls: string[] = [];

  const result = await captureAndStoreSalesPhotoEvidenceWithFileInput(
    { queueItem: makeQueueItem(), now: '2026-07-06T10:02:00.000Z' },
    {
      getCapabilitySnapshot: readySnapshot,
      selectFile: async () => {
        calls.push('select');
        return makeFile();
      },
      decodeImage: async () => {
        calls.push('decode');
        return decodedImage(closeCalls);
      },
      renderVariant: async (_decoded, variant) => {
        calls.push(`render:${variant.kind}:${variant.mimeType}`);
        return makeVariant(variant.kind);
      },
      storePayload: async input => {
        calls.push(`store:${input.queueItem.queueId}`);
        return payloadFromInput(input);
      },
    }
  );

  assert.equal(result.action, 'capture_stored_locally');
  if (result.action !== 'capture_stored_locally') return;
  assert.equal(result.payload.queueId, SALE_EVENT_ID);
  assert.equal(result.payload.image.contentHash, 'image-hash');
  assert.equal(result.payload.thumbnail.contentHash, 'thumbnail-hash');
  assert.equal(result.readiness.ready, true);
  assert.deepEqual(calls, [
    'select',
    'decode',
    'render:image:image/webp',
    'render:thumbnail:image/webp',
    `store:${SALE_EVENT_ID}`,
  ]);
  assert.deepEqual(closeCalls, ['close']);
});

runTest('adapter keeps evidence pending when user cancels file selection', async () => {
  const result = await captureAndStoreSalesPhotoEvidenceWithFileInput(
    { queueItem: makeQueueItem() },
    {
      getCapabilitySnapshot: readySnapshot,
      selectFile: async () => null,
      storePayload: async input => payloadFromInput(input),
    }
  );

  assert.equal(result.action, 'capture_failed');
  if (result.action !== 'capture_failed') return;
  assert.equal(result.failure.reason, 'capture_cancelled');
  assert.equal(result.failure.shouldKeepEvidencePending, true);
  assert.equal(result.failure.shouldUploadObject, false);
});

runTest('adapter fails closed before selecting a file when browser capability is unavailable', async () => {
  let selected = false;
  const result = await captureAndStoreSalesPhotoEvidenceWithFileInput(
    { queueItem: makeQueueItem() },
    {
      getCapabilitySnapshot: () => ({
        secureContext: false,
        mediaCaptureAvailable: true,
        imageProcessingAvailable: true,
      }),
      selectFile: async () => {
        selected = true;
        return makeFile();
      },
    }
  );

  assert.equal(result.action, 'capture_failed');
  assert.equal(selected, false);
  if (result.action !== 'capture_failed') return;
  assert.equal(result.failure.reason, 'adapter_unavailable');
  assert.equal(result.readiness?.ready, false);
});

runTest('adapter rejects unsupported source images without storing local payloads', async () => {
  let stored = false;
  const result = await captureAndStoreSalesPhotoEvidenceWithFileInput(
    { queueItem: makeQueueItem() },
    {
      getCapabilitySnapshot: readySnapshot,
      selectFile: async () => makeFile(1000, 'image/gif'),
      decodeImage: async () => decodedImage(),
      renderVariant: async (_decoded, variant) => makeVariant(variant.kind),
      storePayload: async input => {
        stored = true;
        return payloadFromInput(input);
      },
    }
  );

  assert.equal(stored, false);
  assert.equal(result.action, 'capture_failed');
  if (result.action !== 'capture_failed') return;
  assert.equal(result.failure.reason, 'output_policy_rejected');
});

runTest('adapter falls back from primary webp image render to jpeg when primary fails', async () => {
  const calls: string[] = [];

  const result = await captureAndStoreSalesPhotoEvidenceWithFileInput(
    { queueItem: makeQueueItem(), now: '2026-07-06T10:02:00.000Z' },
    {
      getCapabilitySnapshot: readySnapshot,
      selectFile: async () => makeFile(),
      decodeImage: async () => decodedImage(),
      renderVariant: async (_decoded, variant) => {
        calls.push(`render:${variant.kind}:${variant.mimeType}`);
        if (variant.kind === 'image' && variant.mimeType === 'image/webp') {
          throw new Error('webp unsupported');
        }
        return makeVariant(variant.kind, { mimeType: variant.mimeType, blob: makeBlob(1000, variant.mimeType) });
      },
      storePayload: async input => payloadFromInput(input),
    }
  );

  assert.equal(result.action, 'capture_stored_locally');
  assert.deepEqual(calls, [
    'render:image:image/webp',
    'render:image:image/jpeg',
    'render:thumbnail:image/webp',
  ]);
});

runTest('runtime adapter stays cloud-free and is owned only by the shared flow hook', () => {
  assert.match(adapterSource, /type="file"|input\.type = 'file'/);
  assert.match(adapterSource, /accept = 'image\/\*'/);
  assert.match(adapterSource, /capture', 'environment'/);
  assert.match(adapterSource, /putPendingSalesPhotoEvidencePayload/);
  assert.doesNotMatch(adapterSource, /@\/lib\/supabase|createClient|SupabaseClient/i);
  assert.doesNotMatch(adapterSource, /fetch\(|XMLHttpRequest|uploadEvidence|signedUrl|signed_url|S3Client|PutObjectCommand|GetObjectCommand|\bR2\b/i);
  assert.doesNotMatch(adapterSource, /localStorage|sessionStorage|recordEvent|recordDeal|enqueuePendingSalesPhotoEvidenceCreation/);

  const blockedProductionFiles = [
    'components/markets/AddRevenueDialog.tsx',
    'components/markets/SalesPhotoEvidenceOperatingCard.tsx',
  ];

  const matches = blockedProductionFiles.filter(file => {
    const source = readProjectFile(file);
    return /captureAndStoreSalesPhotoEvidenceWithFileInput|photo-evidence-browser-adapter/.test(source);
  });

  assert.deepEqual(matches, []);

  const staffViewSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
  const ownerPageSource = readProjectFile('components/markets/MarketDetailScreen.tsx');
  const flowHookSource = readProjectFile('hooks/useSalesPhotoEvidenceFlow.ts');

  for (const source of [staffViewSource, ownerPageSource]) {
    assert.match(source, /useSalesPhotoEvidenceFlow/);
    assert.doesNotMatch(source, /captureAndStoreSalesPhotoEvidenceWithFileInput|uploadPendingSalesPhotoEvidenceManually/);
    assert.doesNotMatch(source, /getUserMedia|signedUrl|signed_url|\bR2\b|drainSalesPhotoEvidencePendingCreations/i);
  }

  assert.match(flowHookSource, /captureAndStoreSalesPhotoEvidenceWithFileInput/);
  assert.match(flowHookSource, /uploadPendingSalesPhotoEvidenceManually/);
  assert.doesNotMatch(flowHookSource, /getUserMedia|signedUrl|signed_url|\bR2\b|drainSalesPhotoEvidencePendingCreations/i);
});

runTest('execution plan and package test include the runtime adapter slice', () => {
  assert.match(planSource, /Slice 6F Status/);
  assert.match(planSource, /file-input browser capture adapter/);
  assert.match(planSource, /does not mount UI, upload, request signed reads, call R2, write Supabase, drain queues, or enable runtime enqueue/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-browser-adapter-runtime\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence browser adapter runtime tests failed`);
  }
}

main();
