import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '../lib/db';
import {
  deletePendingSalesPhotoEvidencePayload,
  deletePendingSalesPhotoEvidencePayloads,
  getPendingSalesPhotoEvidencePayload,
  putPendingSalesPhotoEvidencePayload,
  SALES_PHOTO_EVIDENCE_PENDING_PAYLOAD_MAX_TOTAL_BYTES,
  validatePendingSalesPhotoEvidencePayloadInput,
  type LocalPendingSalesPhotoEvidencePayload,
  type SalesPhotoEvidencePendingPayloadVariant,
} from '../lib/sales/photo-evidence-pending-payload-storage';
import { createLocalPendingSalesPhotoEvidenceCreation } from '../lib/sales/photo-evidence-pending-creation';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const dbSource = readFileSync(join(projectRoot, 'lib/db/index.ts'), 'utf8');
const storageSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-pending-payload-storage.ts'), 'utf8');
const localPendingWriteReportSource = readFileSync(join(projectRoot, 'lib/sync/local-pending-write-report.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

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

function makeBlob(size: number, type = 'image/webp'): Blob {
  return new Blob([new Uint8Array(size)], { type });
}

function makeVariant(
  overrides: Partial<SalesPhotoEvidencePendingPayloadVariant> = {}
): SalesPhotoEvidencePendingPayloadVariant {
  const size = overrides.fileSizeBytes ?? 1000;
  const mimeType = overrides.mimeType ?? 'image/webp';
  return {
    blob: overrides.blob ?? makeBlob(size, mimeType),
    mimeType,
    fileSizeBytes: size,
    width: overrides.width ?? 800,
    height: overrides.height ?? 600,
    contentHash: overrides.contentHash ?? 'hash-value',
  };
}

function makePayloadTable(rows: LocalPendingSalesPhotoEvidencePayload[] = [], calls: string[] = []) {
  const store = new Map(rows.map(row => [row.queueId, row]));

  return {
    store,
    table: {
      get: async (id: string) => {
        calls.push(`payload.get:${id}`);
        return store.get(id);
      },
      put: async (item: LocalPendingSalesPhotoEvidencePayload) => {
        calls.push(`payload.put:${item.queueId}`);
        store.set(item.queueId, item);
        return item.queueId;
      },
      delete: async (id: string) => {
        calls.push(`payload.delete:${id}`);
        store.delete(id);
      },
      bulkDelete: async (ids: string[]) => {
        calls.push(`payload.bulkDelete:${ids.join('|')}`);
        for (const id of ids) store.delete(id);
      },
    },
  };
}

async function withMockedPayloadTable<T>(
  rows: LocalPendingSalesPhotoEvidencePayload[],
  fn: (ctx: { calls: string[]; store: Map<string, LocalPendingSalesPhotoEvidencePayload> }) => Promise<T>
): Promise<T> {
  const calls: string[] = [];
  const originalPayloads = (db as any).salesPhotoEvidencePendingPayloads;
  const payloads = makePayloadTable(rows, calls);

  (db as any).salesPhotoEvidencePendingPayloads = payloads.table;

  try {
    return await fn({ calls, store: payloads.store });
  } finally {
    (db as any).salesPhotoEvidencePendingPayloads = originalPayloads;
  }
}

console.log('\n=== Sales photo evidence pending payload storage ===');

runTest('Dexie schema defines version 6 payload table without replacing the queue table', () => {
  assert.match(dbSource, /salesPhotoEvidencePendingPayloads!: Table<LocalPendingSalesPhotoEvidencePayload, string>/);
  assert.match(dbSource, /this\.version\(6\)\.stores\(\{[\s\S]*salesPhotoEvidencePendingCreations: 'queueId, saleEventId, ownerId, marketId, status, updatedAt, createdAt'/);
  assert.match(dbSource, /salesPhotoEvidencePendingPayloads: 'queueId, ownerId, marketId, updatedAt, createdAt'/);
  assert.match(dbSource, /this\.version\(5\)\.stores\(\{/);
});

runTest('validation accepts compressed image and thumbnail within the local cap', () => {
  const decision = validatePendingSalesPhotoEvidencePayloadInput({
    queueItem: makeQueueItem(),
    image: makeVariant({ fileSizeBytes: 900_000 }),
    thumbnail: makeVariant({ fileSizeBytes: 100_000 }),
    now: '2026-07-06T10:02:00.000Z',
  });

  assert.deepEqual(decision, { valid: true });
  assert.equal(SALES_PHOTO_EVIDENCE_PENDING_PAYLOAD_MAX_TOTAL_BYTES, 1_500_000);
});

runTest('validation rejects unsafe payloads before any IndexedDB write', () => {
  assert.equal(validatePendingSalesPhotoEvidencePayloadInput({
    queueItem: { ...makeQueueItem(), queueId: 'different' },
    image: makeVariant(),
    thumbnail: makeVariant(),
  }).valid, false);

  assert.equal(validatePendingSalesPhotoEvidencePayloadInput({
    queueItem: makeQueueItem(),
    image: makeVariant({ mimeType: 'image/png', blob: makeBlob(1000, 'image/png') }),
    thumbnail: makeVariant(),
  }).valid, false);

  assert.equal(validatePendingSalesPhotoEvidencePayloadInput({
    queueItem: makeQueueItem(),
    image: makeVariant({ blob: makeBlob(1000, 'image/jpeg'), mimeType: 'image/webp' }),
    thumbnail: makeVariant(),
  }).valid, false);

  assert.equal(validatePendingSalesPhotoEvidencePayloadInput({
    queueItem: makeQueueItem(),
    image: makeVariant({ contentHash: '' }),
    thumbnail: makeVariant(),
  }).valid, false);

  assert.equal(validatePendingSalesPhotoEvidencePayloadInput({
    queueItem: makeQueueItem(),
    image: makeVariant({ fileSizeBytes: 1_400_000 }),
    thumbnail: makeVariant({ fileSizeBytes: 200_000 }),
  }).valid, false);
});

runTest('put stores a scoped payload row and preserves createdAt on replacement', async () => {
  await withMockedPayloadTable([], async ({ calls, store }) => {
    const queueItem = makeQueueItem();
    const first = await putPendingSalesPhotoEvidencePayload({
      queueItem,
      image: makeVariant({ contentHash: 'first-image' }),
      thumbnail: makeVariant({ contentHash: 'first-thumb' }),
      now: '2026-07-06T10:02:00.000Z',
    });
    const second = await putPendingSalesPhotoEvidencePayload({
      queueItem,
      image: makeVariant({ contentHash: 'second-image' }),
      thumbnail: makeVariant({ contentHash: 'second-thumb' }),
      now: '2026-07-06T10:03:00.000Z',
    });

    assert.equal(store.size, 1);
    assert.equal(first.queueId, SALE_EVENT_ID);
    assert.equal(second.createdAt, '2026-07-06T10:02:00.000Z');
    assert.equal(second.updatedAt, '2026-07-06T10:03:00.000Z');
    assert.equal(second.image.contentHash, 'second-image');
    assert.deepEqual(calls, [
      `payload.get:${SALE_EVENT_ID}`,
      `payload.put:${SALE_EVENT_ID}`,
      `payload.get:${SALE_EVENT_ID}`,
      `payload.put:${SALE_EVENT_ID}`,
    ]);
  });
});

runTest('get and delete operations are narrow and idempotent', async () => {
  const queueItem = makeQueueItem();
  const existing: LocalPendingSalesPhotoEvidencePayload = {
    queueId: queueItem.queueId,
    saleEventId: queueItem.saleEventId,
    ownerId: queueItem.ownerId,
    marketId: queueItem.marketId,
    capturedByStaffId: queueItem.capturedByStaffId,
    image: makeVariant(),
    thumbnail: makeVariant(),
    createdAt: '2026-07-06T10:02:00.000Z',
    updatedAt: '2026-07-06T10:02:00.000Z',
  };

  await withMockedPayloadTable([existing], async ({ calls, store }) => {
    assert.equal((await getPendingSalesPhotoEvidencePayload(SALE_EVENT_ID))?.queueId, SALE_EVENT_ID);
    assert.equal(await getPendingSalesPhotoEvidencePayload(''), null);

    await deletePendingSalesPhotoEvidencePayload(SALE_EVENT_ID);
    await deletePendingSalesPhotoEvidencePayload('');
    assert.equal(store.has(SALE_EVENT_ID), false);

    store.set(SALE_EVENT_ID, existing);
    await deletePendingSalesPhotoEvidencePayloads([SALE_EVENT_ID, SALE_EVENT_ID, '']);
    assert.equal(store.has(SALE_EVENT_ID), false);

    assert.deepEqual(calls, [
      `payload.get:${SALE_EVENT_ID}`,
      `payload.delete:${SALE_EVENT_ID}`,
      `payload.bulkDelete:${SALE_EVENT_ID}`,
    ]);
  });
});

runTest('payload storage stays local-only and disconnected from upload or sync paths', () => {
  assert.doesNotMatch(storageSource, /@\/lib\/supabase|createClient|SupabaseClient/);
  assert.doesNotMatch(storageSource, /recordEvent|recordDeal|getUserMedia|uploadEvidence|signedUrl|signed_url|R2/i);
  assert.doesNotMatch(storageSource, /fetch\(|window\.|document\.|localStorage|sessionStorage/);
  assert.match(localPendingWriteReportSource, /pendingSalesPhotoEvidencePayloadCount/);
  assert.match(localPendingWriteReportSource, /salesPhotoEvidencePendingPayloads\.toArray\(\)/);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-pending-payload-storage\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence pending payload storage tests failed`);
  }
}

main();
