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
  const { ensureScheduledMarkets, reviseOperationScheduleFromDate } = await import('../lib/recurring-operations');
  await db.open();
  await recordEvent('venue_created', { venueId: 'v', name: '固定店', status: 'active' }, 'v-event');
  await recordEvent('operation_schedule_created', {
    scheduleId: 's', venueId: 'v', timezone: 'Asia/Taipei', recurrence: { frequency: 'weekly', interval: 1, weekdays: [5], startDate: '2026-08-01' },
    startTime: '10:00', endTime: '18:00', endsNextDay: false, defaults: { boothCost: 100 }, status: 'active', revision: 1,
  }, 's-event');
  await ensureScheduledMarkets({ ownerId: 'local', isOwner: true, now: new Date('2026-08-14T04:00:00Z') });
  const before = await db.markets.where('scheduleId').equals('s').toArray();
  await reviseOperationScheduleFromDate('s', '2026-08-21', {
    recurrence: { frequency: 'weekly', interval: 1, weekdays: [6], startDate: '2026-08-01' },
    startTime: '11:00', endTime: '19:00', endsNextDay: false,
  }, { ownerId: 'local', isOwner: true });
  const historical = await db.markets.get(before.find(market => market.startDate === '2026-08-14')!.id!);
  assert.equal(historical?.startTime, '10:00');
  assert.equal(historical?.scheduleRevision, 1);
  const removed = await db.markets.get(before.find(market => market.startDate === '2026-08-21')!.id!);
  assert.equal(removed?.scheduleOccurrenceState, 'rule_removed');
  const saturday = (await db.markets.where('scheduleId').equals('s').toArray()).find(market => market.startDate === '2026-08-22');
  assert.equal(saturday?.startTime, '11:00');
  assert.equal(saturday?.scheduleRevision, 2);
  db.close(); await Dexie.delete('MarketPulseDB');
}
run().then(() => console.log('recurring operations future revision tests passed')).catch(error => { console.error(error); process.exitCode = 1; });
