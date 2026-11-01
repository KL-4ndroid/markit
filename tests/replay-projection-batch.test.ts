import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { replayOwnerEvents } from '../lib/sync/owner-event-replay';
import { eventHandlers } from '../lib/db/events';
import type { Event, Market, DailyStats } from '../types/db';

const day = '2026-10-30', timestamp = new Date(`${day}T08:00:00+08:00`).getTime();
function sale(id: string, market = 'a', date = day): Event {
  return { id, type: 'deal_closed', market_id: market, timestamp, sync_status: 'synced',
    payload: { market_id: market, items: [], totalAmount: 10, manualRevenue: 10, manualCost: 3, manualDealCount: 1,
      isManualEntry: true, isBackfill: true, dealDate: date } };
}
function interaction(id: string, type: string, market = 'a'): Event {
  return { id, type: 'interaction_recorded', market_id: market, timestamp, sync_status: 'synced', payload: { market_id: market, type } };
}
async function seed() {
  await db.delete(); await db.open();
  await db.markets.bulkPut(['a', 'b'].map(id => ({ id, owner_id: 'owner', name: id, startDate: day, endDate: '2026-10-31', totalRevenue: 0,
    totalProfit: 0, totalDeals: 0, totalInteractions: 0, notes: 'untouched metadata', dates: [day, '2026-10-31'] } as Market)));
}
async function snapshot() {
  const days = (await db.dailyStats.toArray()).map(row => ({ ...row, productsSold: row.productsSold ?? [] }));
  return { markets: await db.markets.orderBy('id').toArray(), days, events: await db.events.orderBy('id').toArray(), products: await db.products.orderBy('id').toArray() };
}
async function parity(events: Event[], before?: () => Promise<void>) {
  await seed(); await before?.();
  await replayOwnerEvents(structuredClone(events), { projectionBatching: false });
  const reference = await snapshot();
  await seed(); await before?.();
  await replayOwnerEvents(structuredClone(events));
  assert.deepEqual(await snapshot(), reference);
  return reference;
}
async function main() {
  try {
    const common = Array.from({ length: 173 }, (_, i) => i % 4 === 0 ? interaction(`i-${i}`, ['touch', 'inquiry', 'custom'][i % 3], i % 2 ? 'a' : 'b')
      : sale(`s-${i}`, i % 3 ? 'a' : 'b', i % 5 ? day : '2026-10-31'));
    await parity(common);
    await parity([{ id: 'legacy', type: 'deal_closed', timestamp, sync_status: 'synced', payload: { marketId: 'a', is_manual_entry: true,
      manual_revenue: 13, manual_cost: 2, manual_deal_count: 1, deal_date: '2026-10-31', items: [] } }, sale('modern')], async () => {
      await db.dailyStats.put({ id: 3, marketId: 'a', date: '2026-10-31', revenue: 20, cost: 4, profit: 16, dealCount: 2,
        touchCount: 0, inquiryCount: 0, productsSold: [], updatedAt: 1 });
    });
    const peculiar = [{ ...sale('negative'), payload: { ...sale('negative').payload, manualRevenue: -5, manualCost: -8, manualDealCount: -2 } },
      sale('unknown-market', 'missing'), interaction('custom', 'custom'), sale('after', 'a', '2026-10-31')];
    await parity(peculiar, async () => {
      const row = { date: day, marketId: 'a', touchCount: 0, inquiryCount: 0, dealCount: NaN, revenue: NaN, cost: -1, profit: -1,
        productsSold: [], updatedAt: 1 } as DailyStats;
      await db.dailyStats.bulkPut([{ ...row, id: 17 }, { ...row, id: 31, revenue: 99, cost: 0, profit: 99, dealCount: 1 }]);
    });
    console.log('PASS reference parity: multiple batches, dates, markets, custom interactions, invalid numeric counters, missing markets and duplicate daily rows');

    const product = { id: 'product', owner_id: 'owner', name: 'stock item', price: 20, cost: 4, stock: 10, totalSold: 0 };
    const productSale: Event = { id: 'product-sale', type: 'deal_closed', timestamp: timestamp + 1, market_id: 'a', sync_status: 'synced',
      payload: { market_id: 'a', items: [{ productId: 'product', quantity: 2, price: 20 }], totalAmount: 40, isBackfill: false } };
    const deleted: Event = { id: 'delete', type: 'deal_deleted', timestamp: timestamp + 2, market_id: 'a', sync_status: 'synced',
      payload: { market_id: 'a', eventId: productSale.id, totalAmount: 40, totalCost: 8, dealCount: 1,
        productsSold: [{ productId: 'product', quantity: 2, revenue: 40 }], dealDate: day } };
    const mixed = await parity([...common, productSale, deleted], async () => { await db.products.put(product as any); });
    assert.equal(mixed.products[0].stock, 10, 'product sale/deletion retains stock restoration');
    console.log('PASS mixed product and deletion batches retain the reference path and identical inventory/projections');

    await seed();
    const pending = { ...sale('pending'), sync_status: 'pending' as const, payload: { draft: 'keep' } };
    await db.events.put(pending);
    await replayOwnerEvents([sale('pending'), sale('new')], { refreshSyncedPayloads: true });
    assert.deepEqual(await db.events.get('pending'), pending);
    assert.equal((await db.markets.get('a'))?.totalRevenue, 10);
    await replayOwnerEvents([sale('pending'), sale('new')]);
    assert.equal((await db.markets.get('a'))?.totalRevenue, 10);
    console.log('PASS pending payloads, previously known IDs and repeated pulls do not double-apply projections');

    await seed();
    const bulkPut = db.markets.bulkPut;
    db.markets.bulkPut = async () => { throw new Error('flush failed'); };
    try { await assert.rejects(replayOwnerEvents([sale('one'), sale('two')]), /flush failed/); }
    finally { db.markets.bulkPut = bulkPut; }
    assert.equal(await db.events.count(), 0); assert.equal(await db.dailyStats.count(), 0);
    assert.equal((await db.markets.get('a'))?.totalRevenue, 0);
    await replayOwnerEvents([sale('one'), sale('two')]);
    assert.equal((await db.markets.get('a'))?.totalRevenue, 20);

    await seed();
    const handler = eventHandlers.deal_closed!;
    eventHandlers.deal_closed = async (event, local, context) => { await handler(event, local, context); if (event.id === 's-59') throw new Error('handler failed'); };
    try { await assert.rejects(replayOwnerEvents(Array.from({ length: 100 }, (_, i) => sale(`s-${i}`))), /handler failed/); }
    finally { eventHandlers.deal_closed = handler; }
    assert.equal(await db.events.count(), 50); assert.equal((await db.markets.get('a'))?.totalRevenue, 500);
    await replayOwnerEvents(Array.from({ length: 100 }, (_, i) => sale(`s-${i}`)));
    assert.equal(await db.events.count(), 100); assert.equal((await db.markets.get('a'))?.totalRevenue, 1000);

    await seed(); let active = true;
    eventHandlers.deal_closed = async (event, local, context) => { await handler(event, local, context); active = false; };
    try { await assert.rejects(replayOwnerEvents([sale('context')], { assertActive: () => { if (!active) throw new Error('inactive'); } }), /inactive/); }
    finally { eventHandlers.deal_closed = handler; }
    assert.equal(await db.events.count(), 0); assert.equal(await db.dailyStats.count(), 0);
    assert.equal((await db.markets.get('a'))?.totalRevenue, 0);
    console.log('PASS failed flush/handler and invalidated context roll back event IDs and projections; retry recovers atomically');
  } finally { await db.delete(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; db.close(); });
