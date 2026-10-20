import assert from 'node:assert/strict';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';

(globalThis as typeof globalThis & { indexedDB: IDBFactory }).indexedDB = indexedDB;
(globalThis as typeof globalThis & { IDBKeyRange: typeof IDBKeyRange }).IDBKeyRange = IDBKeyRange;

async function run(): Promise<void> {
  const { default: Dexie } = await import('dexie');
  Dexie.dependencies.indexedDB = indexedDB;
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
  await Dexie.delete('MarketPulseDB');

  const { db } = await import('../lib/db');
  const { recordEvent } = await import('../lib/db/events');
  const { ensureScheduledMarkets } = await import('../lib/recurring-operations');
  await db.open();

  await recordEvent('venue_created', {
    venueId: 'venue-materializer', name: '週末店', address: '台北', status: 'active',
  }, 'event-venue-materializer');
  await recordEvent('operation_schedule_created', {
    scheduleId: 'schedule-materializer', venueId: 'venue-materializer', timezone: 'Asia/Taipei',
    recurrence: { frequency: 'weekly', interval: 1, weekdays: [1, 5], startDate: '2026-08-01' },
    startTime: '10:00', endTime: '18:00', endsNextDay: false,
    defaults: { boothCost: 200 }, status: 'active', revision: 1,
  }, 'event-schedule-materializer');

  const first = await ensureScheduledMarkets({ ownerId: 'local', isOwner: true, now: new Date('2026-08-14T04:00:00Z') });
  assert.equal(first.createdMarketIds.length, 16);
  assert.equal(first.conflicts.length, 0);
  assert.equal(await db.markets.count(), 16);

  const retry = await ensureScheduledMarkets({ ownerId: 'local', isOwner: true, now: new Date('2026-08-14T04:00:00Z') });
  assert.equal(retry.createdMarketIds.length, 0);
  assert.equal(retry.existingMarketIds.length, 16);
  assert.equal(await db.markets.count(), 16);
  await assert.rejects(
    ensureScheduledMarkets({ ownerId: 'local', isOwner: false, now: new Date('2026-08-14T04:00:00Z') }),
    /Owner authorization/,
  );

  const generated = await db.markets.toArray();
  assert.ok(generated.every(market => market.sessionOrigin === 'schedule'));
  assert.ok(generated.every(market => market.status === 'registered'));
  assert.ok(generated.every(market => market.boothCost === 200));
  assert.ok(generated.every(market => market.scheduleOccurrenceState === 'scheduled'));

  db.close();
  await Dexie.delete('MarketPulseDB');
}

run()
  .then(() => console.log('recurring operations materializer tests passed'))
  .catch(error => { console.error(error); process.exitCode = 1; });
