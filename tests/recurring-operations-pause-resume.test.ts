import assert from 'node:assert/strict';
import { IDBKeyRange, indexedDB } from 'fake-indexeddb';

(globalThis as typeof globalThis & { indexedDB: IDBFactory }).indexedDB = indexedDB;
(globalThis as typeof globalThis & { IDBKeyRange: typeof IDBKeyRange }).IDBKeyRange = IDBKeyRange;

async function run(): Promise<void> {
  const { default: Dexie } = await import('dexie');
  Dexie.dependencies.indexedDB = indexedDB; Dexie.dependencies.IDBKeyRange = IDBKeyRange;
  await Dexie.delete('MarketPulseDB');
  const { db } = await import('../lib/db');
  const { recordEvent } = await import('../lib/db/events');
  const { ensureScheduledMarkets, pauseOperationSchedule, resumeOperationSchedule } = await import('../lib/recurring-operations');
  await db.open();
  await recordEvent('venue_created', { venueId: 'v', name: '固定店', status: 'active' }, 'v-event');
  await recordEvent('operation_schedule_created', {
    scheduleId: 's', venueId: 'v', timezone: 'Asia/Taipei', recurrence: { frequency: 'weekly', interval: 1, weekdays: [6], startDate: '2026-08-15' },
    startTime: '10:00', endTime: '18:00', endsNextDay: false, defaults: {}, status: 'active', revision: 1,
  }, 's-event');
  await ensureScheduledMarkets({ ownerId: 'local', isOwner: true, now: new Date('2026-08-14T04:00:00Z') });
  const authorization = { ownerId: 'local', isOwner: true, now: new Date('2026-08-14T04:00:00Z') };
  await pauseOperationSchedule('s', authorization);
  assert.ok((await db.markets.toArray()).every(market => market.scheduleOccurrenceState === 'suppressed'));
  await resumeOperationSchedule('s', authorization);
  assert.ok((await db.markets.toArray()).every(market => market.scheduleOccurrenceState === 'scheduled'));
  db.close(); await Dexie.delete('MarketPulseDB');
}
run().then(() => console.log('recurring operations pause resume tests passed')).catch(error => { console.error(error); process.exitCode = 1; });
