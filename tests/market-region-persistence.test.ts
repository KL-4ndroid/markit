import assert from 'node:assert/strict';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import { normalizeEventForCloud } from '../lib/data-mappers';
import type { Event } from '../types/db';

async function run() {
  const { default: Dexie } = await import('dexie');
  Dexie.dependencies.indexedDB = indexedDB;
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
  await Dexie.delete('MarketPulseDB');
  const { db } = await import('../lib/db');
  const { recordEvent } = await import('../lib/db/events');
  const { replayOwnerEvents } = await import('../lib/sync/owner-event-replay');
  const { ensureScheduledMarkets, reviseOperationScheduleFromDate } = await import('../lib/recurring-operations');
  process.env.NEXT_PUBLIC_MARKET_REGION_ENABLED = 'true';
  await db.open();
  try {
    await recordEvent('venue_created', { venueId: 'v', name: '固定店', address: '自由地點', regionCode: 'tw-tainan-city', status: 'active' });
    await recordEvent('operation_schedule_created', { scheduleId: 's', venueId: 'v', timezone: 'Asia/Taipei',
      recurrence: { frequency: 'weekly', interval: 1, weekdays: [5], startDate: '2026-10-01' },
      startTime: '10:00', endTime: '18:00', endsNextDay: false, defaults: { boothCost: 100 }, status: 'active', revision: 1 });
    await ensureScheduledMarkets({ ownerId: 'local', isOwner: true, now: new Date('2026-10-23T04:00:00Z') });
    const before = await db.markets.toArray();
    assert.ok(before.every(market => market.regionCode === 'tw-tainan-city'));
    const on = (date: string) => before.find(market => market.startDate === date)!.id!;
    await recordEvent('deal_closed', { market_id: on('2026-10-23'), items: [], totalAmount: 150,
      manualRevenue: 150, manualCost: 30, manualDealCount: 2, isManualEntry: true,
      isBackfill: true, dealDate: '2026-10-23', paymentMethod: 'cash' });
    const moneyBefore = await db.markets.get(on('2026-10-23'));
    const dailyBefore = await db.dailyStats.toArray();
    await recordEvent('market_updated', { market_id: on('2026-11-06'), updates: { regionCode: 'tw-chiayi-city', isScheduleOverride: true } });
    await recordEvent('market_started', { market_id: on('2026-11-13') });
    await recordEvent('venue_updated', { venueId: 'v', updates: { regionCode: 'tw-kaohsiung-city' } });
    assert.ok((await db.markets.toArray()).filter(market => !market.isScheduleOverride).every(market => market.regionCode === 'tw-tainan-city'), 'changing a Venue cannot rewrite materialized history');
    await reviseOperationScheduleFromDate('s', '2026-10-30', { defaults: { boothCost: 100 } }, { ownerId: 'local', isOwner: true });
    assert.equal((await db.markets.get(on('2026-10-23')))?.regionCode, 'tw-tainan-city', 'before effective date');
    assert.equal((await db.markets.get(on('2026-10-30')))?.regionCode, 'tw-kaohsiung-city', 'allowed future snapshot');
    assert.equal((await db.markets.get(on('2026-11-06')))?.regionCode, 'tw-chiayi-city', 'single occurrence override');
    assert.equal((await db.markets.get(on('2026-11-13')))?.regionCode, 'tw-tainan-city', 'started occurrence');
    await recordEvent('market_updated', { market_id: on('2026-10-23'), updates: { regionCode: null } });
    assert.equal((await db.markets.get(on('2026-10-23')))?.regionCode, null, 'explicit clear');
    const moneyAfter = await db.markets.get(on('2026-10-23'));
    assert.equal(moneyAfter?.totalRevenue, moneyBefore?.totalRevenue);
    assert.equal(moneyAfter?.totalDeals, moneyBefore?.totalDeals);
    assert.equal(moneyAfter?.totalProfit, moneyBefore?.totalProfit);
    assert.deepEqual(await db.dailyStats.toArray(), dailyBefore, 'region edits cannot duplicate or reclassify daily stats themselves');
    const financials = (await db.markets.toArray()).map(market => [market.id, market.totalRevenue, market.totalDeals, market.totalProfit]);
    const events = await db.events.toArray();
    assert.ok(events.every(event => event.sync_status === 'local_only'), 'offline queue retains region events');
    const wire = events.map(event => ({ ...normalizeEventForCloud(event), sync_status: 'synced' } as Event));
    await db.transaction('rw', [db.events, db.markets, db.venues, db.operationSchedules, db.dailyStats], async () => {
      await db.events.clear(); await db.markets.clear(); await db.venues.clear(); await db.operationSchedules.clear();
      await db.dailyStats.clear();
    });
    // Readers keep working if rollout is turned off after region data already exists.
    process.env.NEXT_PUBLIC_MARKET_REGION_ENABLED = 'false';
    await replayOwnerEvents(wire);
    assert.equal((await db.markets.get(on('2026-10-23')))?.regionCode, null);
    assert.equal((await db.markets.get(on('2026-11-06')))?.regionCode, 'tw-chiayi-city');
    assert.equal((await db.venues.get('v'))?.regionCode, 'tw-kaohsiung-city');
    assert.deepEqual((await db.markets.toArray()).map(market => [market.id, market.totalRevenue, market.totalDeals, market.totalProfit]), financials);
    await replayOwnerEvents(wire);
    assert.equal(await db.events.count(), events.length, 'idempotent cloud replay');
    // A revision with unchanged classifications remains usable during a paused rollout.
    await reviseOperationScheduleFromDate('s', '2026-10-30', { startTime: '11:00' }, { ownerId: 'local', isOwner: true });
    assert.equal((await db.markets.get(on('2026-10-30')))?.regionCode, 'tw-kaohsiung-city');
    await recordEvent('venue_created', { venueId: 'unclassified', name: '未分類據點', status: 'active' });
    process.env.NEXT_PUBLIC_MARKET_REGION_ENABLED = 'true';
    await reviseOperationScheduleFromDate('s', '2026-10-30', { venueId: 'unclassified' }, { ownerId: 'local', isOwner: true });
    assert.equal((await db.markets.get(on('2026-10-30')))?.regionCode, null, 'moving to an unclassified Venue clears the future snapshot');
    assert.equal((await db.markets.get(on('2026-11-06')))?.regionCode, 'tw-chiayi-city', 'override still preserved');
  } finally {
    db.close(); await Dexie.delete('MarketPulseDB');
  }
}
run().then(() => console.log('PASS offline region events, safe schedule snapshots, clear and cloud replay')).catch(error => { console.error(error); process.exitCode = 1; });
