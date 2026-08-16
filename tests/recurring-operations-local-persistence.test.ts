import assert from 'node:assert/strict';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';
import { parseBackupData } from '../lib/db/integrity';

(globalThis as typeof globalThis & { indexedDB: IDBFactory }).indexedDB = indexedDB;
(globalThis as typeof globalThis & { IDBKeyRange: typeof IDBKeyRange }).IDBKeyRange = IDBKeyRange;

const legacyMarket = {
  id: 'legacy-market',
  name: 'Legacy Market',
  location: 'Taipei',
  startDate: '2026-08-01',
  endDate: '2026-08-01',
  status: 'registered',
  registrationFee: 0,
  boothCost: 0,
  createdAt: 1,
  updatedAt: 1,
};

async function createVersion7Database(): Promise<void> {
  const { default: Dexie } = await import('dexie');
  Dexie.dependencies.indexedDB = indexedDB;
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
  const legacyDb = new Dexie('MarketPulseDB');
  legacyDb.version(7).stores({
    events: 'id, type, timestamp, actor_id, market_id, sync_status',
    markets: 'id, status, name, startDate, endDate, owner_id, is_collaborative, sync_status, isDeleted',
    products: 'id, category, name, isActive, market_id, owner_id',
    dailyStats: '++id, [date+marketId], date, marketId',
    settings: '++id',
    syncQueue: 'id, status, created_at',
    salesPhotoEvidencePendingCreations: 'queueId, saleEventId, ownerId, marketId, status, updatedAt, createdAt',
    salesPhotoEvidencePendingPayloads: 'queueId, ownerId, marketId, updatedAt, createdAt',
    productCoverPhotoPendingUploads: 'productId, status, updatedAt, createdAt',
    productCoverPhotoPendingPayloads: 'productId, updatedAt',
  });
  await legacyDb.open();
  await legacyDb.table('markets').add(legacyMarket);
  legacyDb.close();
}

async function run(): Promise<void> {
  const { default: Dexie } = await import('dexie');
  Dexie.dependencies.indexedDB = indexedDB;
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
  await Dexie.delete('MarketPulseDB');
  await createVersion7Database();

  const { clearAllData, db, exportData, importData } = await import('../lib/db');
  const { rebuildSnapshots, recordEvent } = await import('../lib/db/events');
  await db.open();

  assert.equal((await db.markets.get('legacy-market'))?.name, 'Legacy Market');
  assert.equal(await db.venues.count(), 0);
  assert.equal(await db.operationSchedules.count(), 0);

  const v1 = parseBackupData(JSON.stringify({
    version: 1,
    exportedAt: 1,
    events: [],
    markets: [legacyMarket],
    products: [],
    dailyStats: [],
    settings: [],
  }));
  assert.deepEqual(v1.venues, []);
  assert.deepEqual(v1.operationSchedules, []);
  await importData(JSON.stringify(v1));
  assert.equal(await db.venues.count(), 0);
  assert.equal(await db.operationSchedules.count(), 0);

  await clearAllData();
  await recordEvent('venue_created', {
    venueId: 'venue-1',
    name: '華山市集',
    status: 'active',
  }, 'event-venue-created');
  await recordEvent('operation_schedule_created', {
    scheduleId: 'schedule-1',
    venueId: 'venue-1',
    name: '每週六場次',
    timezone: 'Asia/Taipei',
    recurrence: {
      frequency: 'weekly',
      interval: 1,
      weekdays: [6],
      startDate: '2026-08-01',
    },
    startTime: '10:00',
    endTime: '18:00',
    endsNextDay: false,
    defaults: { boothCost: 500 },
    status: 'active',
    revision: 1,
  }, 'event-schedule-created');
  await recordEvent('market_created', {
    market_id: 'scheduled-market-1',
    name: '華山市集 2026-08-01',
    location: '華山',
    dates: ['2026-08-01'],
    startDate: '2026-08-01',
    endDate: '2026-08-01',
    registrationFee: 0,
    boothCost: 500,
    venueId: 'venue-1',
    scheduleId: 'schedule-1',
    sessionOrigin: 'schedule',
    scheduleOccurrenceKey: 'local:schedule-1:2026-08-01',
    scheduleRevision: 1,
    scheduleOccurrenceState: 'scheduled',
    isScheduleOverride: false,
  }, 'event-market-created');

  const exported = parseBackupData(await exportData());
  assert.equal(exported.version, 2);
  assert.equal(exported.venues?.length, 1);
  assert.equal(exported.operationSchedules?.length, 1);
  assert.equal(exported.markets[0]?.scheduleOccurrenceKey, 'local:schedule-1:2026-08-01');

  await db.transaction('rw', [db.markets, db.venues, db.operationSchedules], async () => {
    await db.markets.clear();
    await db.venues.clear();
    await db.operationSchedules.clear();
  });
  await rebuildSnapshots();

  assert.equal((await db.venues.get('venue-1'))?.name, '華山市集');
  assert.equal((await db.operationSchedules.get('schedule-1'))?.revision, 1);
  assert.equal((await db.markets.get('scheduled-market-1'))?.scheduleId, 'schedule-1');

  db.close();
  await Dexie.delete('MarketPulseDB');
}

run()
  .then(() => console.log('recurring operations local persistence tests passed'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
