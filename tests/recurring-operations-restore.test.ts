import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  const {
    ensureScheduledMarkets,
    pauseOperationSchedule,
    restoreSkippedScheduledOccurrence,
    reviseOperationScheduleFromDate,
    skipScheduledOccurrence,
  } = await import('../lib/recurring-operations');
  await db.open();

  await recordEvent('venue_created', {
    venueId: 'restore-venue', name: '固定店', status: 'active',
  }, 'restore-venue-event');
  await recordEvent('operation_schedule_created', {
    scheduleId: 'restore-schedule', venueId: 'restore-venue', timezone: 'Asia/Taipei',
    recurrence: { frequency: 'weekly', interval: 1, weekdays: [5], startDate: '2026-08-14' },
    startTime: '10:00', endTime: '18:00', endsNextDay: false,
    defaults: { boothCost: 100 }, status: 'active', revision: 1,
  }, 'restore-schedule-event');

  const materialized = await ensureScheduledMarkets({
    ownerId: 'local', isOwner: true, now: new Date('2026-08-14T04:00:00Z'),
  });
  const marketId = materialized.createdMarketIds[0]!;
  const originalCount = await db.markets.count();
  const authorization = { ownerId: 'local', isOwner: true, now: new Date('2026-08-14T04:00:00Z') };

  await skipScheduledOccurrence(marketId, authorization);
  await reviseOperationScheduleFromDate('restore-schedule', '2026-08-14', {
    defaults: { boothCost: 250 },
  }, authorization);
  assert.equal((await db.markets.get(marketId))?.scheduleOccurrenceState, 'skipped');

  await restoreSkippedScheduledOccurrence(marketId, authorization);
  const restored = await db.markets.get(marketId);
  assert.equal(restored?.scheduleOccurrenceState, 'scheduled');
  assert.equal(restored?.status, 'registered');
  assert.equal(restored?.boothCost, 250);
  assert.equal(restored?.scheduleRevision, 2);
  assert.equal(await db.markets.count(), originalCount);

  await skipScheduledOccurrence(marketId, authorization);
  await assert.rejects(
    restoreSkippedScheduledOccurrence(marketId, {
      ...authorization,
      now: new Date('2026-08-15T04:00:00Z'),
    }),
    /Past occurrence cannot be restored/,
  );
  await pauseOperationSchedule('restore-schedule', authorization);
  await assert.rejects(
    restoreSkippedScheduledOccurrence(marketId, authorization),
    /must be active/,
  );
  await assert.rejects(
    restoreSkippedScheduledOccurrence(marketId, { ownerId: 'staff', isOwner: false, now: authorization.now }),
    /Owner authorization/,
  );

  const detailSource = readFileSync('components/markets/MarketDetailScreen.tsx', 'utf8');
  assert.match(detailSource, /scheduleOccurrenceState === 'skipped'[\s\S]*恢復這一次/);
  assert.match(detailSource, /restoreSkippedScheduledOccurrence/);

  db.close();
  await Dexie.delete('MarketPulseDB');
}

run()
  .then(() => console.log('recurring operations restore tests passed'))
  .catch(error => { console.error(error); process.exitCode = 1; });
