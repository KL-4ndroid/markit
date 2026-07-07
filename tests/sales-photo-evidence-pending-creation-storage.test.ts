import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '../lib/db';
import {
  createDexieSalesPhotoEvidencePendingCreationStorage,
  enqueuePendingSalesPhotoEvidenceCreation,
} from '../lib/sales/photo-evidence-pending-creation-storage';
import {
  createLocalPendingSalesPhotoEvidenceCreation,
  markPendingSalesPhotoEvidenceCreationRetryableFailure,
  type LocalPendingSalesPhotoEvidenceCreation,
} from '../lib/sales/photo-evidence-pending-creation';
import type { Event } from '../types/db';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const dbSource = readFileSync(join(projectRoot, 'lib/db/index.ts'), 'utf8');
const storageSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-pending-creation-storage.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';
const SALE_EVENT_ID = '33333333-3333-4333-8333-333333333333';
const SECOND_SALE_EVENT_ID = '55555555-5555-4555-8555-555555555555';
const STAFF_ID = '44444444-4444-4444-8444-444444444444';

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function makeItem(
  saleEventId = SALE_EVENT_ID,
  now = '2026-07-05T10:00:00.000Z'
): LocalPendingSalesPhotoEvidenceCreation {
  return createLocalPendingSalesPhotoEvidenceCreation({
    saleEventId,
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    capturedByStaffId: STAFF_ID,
    saleCompletedAt: '2026-07-05T09:59:00.000Z',
    now,
  });
}

function makeQueueTable(
  rows: LocalPendingSalesPhotoEvidenceCreation[] = [],
  calls: string[] = []
) {
  const store = new Map(rows.map(row => [row.queueId, row]));

  return {
    store,
    table: {
      get: async (id: string) => {
        calls.push(`queue.get:${id}`);
        return store.get(id);
      },
      add: async (item: LocalPendingSalesPhotoEvidenceCreation) => {
        calls.push(`queue.add:${item.queueId}`);
        if (store.has(item.queueId)) throw new Error('duplicate queue id');
        store.set(item.queueId, item);
        return item.queueId;
      },
      put: async (item: LocalPendingSalesPhotoEvidenceCreation) => {
        calls.push(`queue.put:${item.status}`);
        store.set(item.queueId, item);
        return item.queueId;
      },
      where: (field: string) => {
        calls.push(`queue.where:${field}`);
        return {
          anyOf: (statuses: string[]) => {
            calls.push(`queue.anyOf:${statuses.join('|')}`);
            return {
              sortBy: async (sortField: string) => {
                calls.push(`queue.sortBy:${sortField}`);
                return Array.from(store.values())
                  .filter(row => statuses.includes(row.status))
                  .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
              },
            };
          },
        };
      },
    },
  };
}

function makeEventsTable(events: Event[], calls: string[] = []) {
  const store = new Map(events.map(event => [event.id, event]));

  return {
    get: async (id: string) => {
      calls.push(`events.get:${id}`);
      return store.get(id);
    },
  };
}

async function withMockedDb<T>(
  setup: { queueRows?: LocalPendingSalesPhotoEvidenceCreation[]; events?: Event[]; calls?: string[] },
  fn: (ctx: { calls: string[]; queueStore: Map<string, LocalPendingSalesPhotoEvidenceCreation> }) => Promise<T>
): Promise<T> {
  const calls = setup.calls ?? [];
  const originalQueue = (db as any).salesPhotoEvidencePendingCreations;
  const originalEvents = (db as any).events;
  const queue = makeQueueTable(setup.queueRows, calls);

  (db as any).salesPhotoEvidencePendingCreations = queue.table;
  (db as any).events = makeEventsTable(setup.events ?? [], calls);

  try {
    return await fn({ calls, queueStore: queue.store });
  } finally {
    (db as any).salesPhotoEvidencePendingCreations = originalQueue;
    (db as any).events = originalEvents;
  }
}

console.log('\n=== Sales photo evidence pending creation Dexie storage ===');

runTest('Dexie schema defines version 5 pending creation table without changing existing stores', () => {
  assert.match(dbSource, /salesPhotoEvidencePendingCreations!: Table<LocalPendingSalesPhotoEvidenceCreation, string>/);
  assert.match(dbSource, /this\.version\(5\)\.stores\(\{[\s\S]*events: 'id, type, timestamp, actor_id, market_id, sync_status'/);
  assert.match(dbSource, /salesPhotoEvidencePendingCreations: 'queueId, saleEventId, ownerId, marketId, status, updatedAt, createdAt'/);
  assert.match(dbSource, /syncQueue: 'id, status, created_at'/);
});

runTest('enqueue creates one queue row and is idempotent for the same sale event', async () => {
  await withMockedDb({}, async ({ calls, queueStore }) => {
    const first = await enqueuePendingSalesPhotoEvidenceCreation({
      saleEventId: SALE_EVENT_ID,
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
      capturedByStaffId: STAFF_ID,
      saleCompletedAt: '2026-07-05T09:59:00.000Z',
      now: '2026-07-05T10:00:00.000Z',
    });
    const second = await enqueuePendingSalesPhotoEvidenceCreation({
      saleEventId: SALE_EVENT_ID,
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
      capturedByStaffId: STAFF_ID,
      saleCompletedAt: '2026-07-05T09:59:00.000Z',
      now: '2026-07-05T10:01:00.000Z',
    });

    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(queueStore.size, 1);
    assert.equal(second.item.createdAt, '2026-07-05T10:00:00.000Z');
    assert.deepEqual(calls, [
      `queue.get:${SALE_EVENT_ID}`,
      `queue.add:${SALE_EVENT_ID}`,
      `queue.get:${SALE_EVENT_ID}`,
    ]);
  });
});

runTest('storage lists runnable queue rows by status and updatedAt order', async () => {
  const waiting = makeItem(SALE_EVENT_ID, '2026-07-05T10:00:00.000Z');
  const retryable = markPendingSalesPhotoEvidenceCreationRetryableFailure(
    makeItem(SECOND_SALE_EVENT_ID, '2026-07-05T09:00:00.000Z'),
    {
      code: 'network_error',
      message: 'temporary outage',
      now: '2026-07-05T09:01:00.000Z',
    }
  );
  const created = { ...makeItem('66666666-6666-4666-8666-666666666666'), status: 'created' as const };

  await withMockedDb({ queueRows: [waiting, retryable, created] }, async ({ calls }) => {
    const storage = createDexieSalesPhotoEvidencePendingCreationStorage();
    const rows = await storage.listRunnableCreations({ limit: 2 });

    assert.deepEqual(rows.map(row => row.saleEventId), [SECOND_SALE_EVENT_ID, SALE_EVENT_ID]);
    assert.deepEqual(calls, [
      'queue.where:status',
      'queue.anyOf:waiting_for_event_sync|failed_retryable',
      'queue.sortBy:updatedAt',
    ]);
  });
});

runTest('storage returns source deal event identity and sync status from local events table', async () => {
  const item = makeItem();
  const event: Event = {
    id: SALE_EVENT_ID,
    type: 'deal_closed',
    payload: {},
    timestamp: Date.now(),
    actor_id: STAFF_ID,
    market_id: MARKET_ID,
    sync_status: 'synced',
  };

  await withMockedDb({ queueRows: [item], events: [event] }, async ({ calls }) => {
    const storage = createDexieSalesPhotoEvidencePendingCreationStorage();
    const source = await storage.getSourceDealEvent(item);
    const missing = await storage.getSourceDealEvent({ ...item, saleEventId: SECOND_SALE_EVENT_ID });

    assert.deepEqual(source, {
      id: SALE_EVENT_ID,
      type: 'deal_closed',
      sync_status: 'synced',
    });
    assert.equal(missing, null);
    assert.deepEqual(calls, [`events.get:${SALE_EVENT_ID}`, `events.get:${SECOND_SALE_EVENT_ID}`]);
  });
});

runTest('storage status updates are model-based and write back through the queue table', async () => {
  const item = makeItem();

  await withMockedDb({ queueRows: [item] }, async ({ calls, queueStore }) => {
    const storage = createDexieSalesPhotoEvidencePendingCreationStorage();

    await storage.markCreating(item, '2026-07-05T10:01:00.000Z');
    await storage.markRetryableFailure(item, {
      code: 'network_error',
      message: 'temporary outage',
      now: '2026-07-05T10:02:00.000Z',
    });
    await storage.markBlocked(item, {
      code: 'source_invalid',
      message: 'bad source',
      now: '2026-07-05T10:03:00.000Z',
    });
    await storage.markCreated(item, '2026-07-05T10:04:00.000Z');

    assert.equal(queueStore.get(item.queueId)?.status, 'created');
    assert.deepEqual(calls, [
      'queue.put:creating',
      'queue.put:failed_retryable',
      'queue.put:blocked_invalid_source',
      'queue.put:created',
    ]);
  });
});

runTest('storage leaves existing evidence lookup injectable and does not query Supabase', async () => {
  const item = makeItem();
  let lookupCalled = false;

  await withMockedDb({ queueRows: [item] }, async () => {
    const emptyStorage = createDexieSalesPhotoEvidencePendingCreationStorage();
    const injectedStorage = createDexieSalesPhotoEvidencePendingCreationStorage({
      listExistingEvidenceForSale: async existingItem => {
        lookupCalled = true;
        return [{ sale_id: existingItem.saleEventId, deleted_at: null, status: 'pending_capture' }];
      },
    });

    assert.deepEqual(await emptyStorage.listExistingEvidenceForSale(item), []);
    assert.equal((await injectedStorage.listExistingEvidenceForSale(item)).length, 1);
    assert.equal(lookupCalled, true);
  });
});

runTest('storage adapter remains disconnected from production enqueue drain and cloud writes', () => {
  assert.doesNotMatch(storageSource, /@\/lib\/supabase|supabase|from\(/);
  assert.doesNotMatch(storageSource, /recordEvent|recordDeal|getUserMedia|uploadEvidence|signedUrl|signed_url|R2/i);
  assert.doesNotMatch(storageSource, /fetch\(|window\.|document\./);

  const productionFiles = [
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
    'components/markets/SalesPhotoEvidenceOperatingCard.tsx',
    'components/markets/StaffMarketDetailView.tsx',
    'app/markets/[id]/page.tsx',
  ];

  const matches = productionFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /photo-evidence-pending-creation-storage|enqueuePendingSalesPhotoEvidenceCreation|createDexieSalesPhotoEvidencePendingCreationStorage/.test(source);
  });

  assert.deepEqual(matches, []);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-pending-creation-storage\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence pending creation storage tests failed`);
  }
}

main();
