import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { eventHandlers } from '../lib/db/events';
import { orderOwnerReplayEvents, replayOwnerEvents } from '../lib/sync/owner-event-replay';
import { verifyAndRepairOwnerHistory } from '../lib/sync/owner-pull-service';
import type { Event } from '../types/db';

const marketId = 'test-market';
const owner = 'test-owner';
function event(id: string, type: Event['type'], timestamp: number, payload: any): Event {
  return { id, type, timestamp, payload: { market_id: marketId, ...payload }, market_id: marketId, actor_id: owner, sync_status: 'synced' };
}
const sale = event('sale', 'deal_closed', 10, {
  items: [{ productId: 'product', quantity: 2, priceAtTimeOfSale: 100, costAtTimeOfSale: 40 }], totalAmount: 200, isBackfill: false, dealDate: '2026-10-22',
});
const source = event('source', 'deal_closed', 30, { items: [], totalAmount: 7, manualRevenue: 7, manualCost: 2, manualDealCount: 2, isManualEntry: true, isBackfill: true, dealDate: '2026-10-22' });
const deletion = event('delete', 'deal_deleted', 20, { eventId: 'source', totalAmount: 7, totalCost: 2, dealCount: 2, productsSold: [], dealDate: '2026-10-22' });
const manual = event('manual', 'deal_closed', 30, { items: [], totalAmount: 150, manualRevenue: 150, manualCost: 30, manualDealCount: 2, isManualEntry: true, isBackfill: true, dealDate: '2026-10-22' });
const rows = [sale, deletion, source, manual];
async function seed() {
  await Promise.all([db.events.clear(), db.markets.clear(), db.products.clear(), db.dailyStats.clear()]);
  await db.markets.put({ id: marketId, owner_id: owner, name: 'Test', dates: ['2026-10-22'], startDate: '2026-10-22', endDate: '2026-10-22', status: 'registered', totalDeals: 0, totalRevenue: 0, totalProfit: 0 } as any);
  await eventHandlers.product_created!(event('product-create', 'product_created', 1, { productId: 'product', name: 'Test', price: 100, cost: 40, stock: 10 }), db);
}
async function totals() {
  const market = await db.markets.get(marketId);
  const product = await db.products.get('product');
  return [market?.totalRevenue, market?.totalProfit, market?.totalDeals, product?.stock];
}

async function main() {
  try {
    await seed();
    assert.deepEqual(orderOwnerReplayEvents(rows).map(e => e.id), ['sale', 'source', 'delete', 'manual']);
    assert.deepEqual(orderOwnerReplayEvents([manual, { ...source, timestamp: 30 }]).map(e => e.id), ['manual', 'source'], 'equal timestamps preserve input order');
    assert.throws(() => orderOwnerReplayEvents([deletion]), /source/);
    assert.throws(() => orderOwnerReplayEvents([{ ...deletion, market_id: 'other' }, source]), /another market/);
    await replayOwnerEvents(rows);
    assert.deepEqual(await totals(), [350, 240, 3, 8]);
    await replayOwnerEvents(rows);
    assert.deepEqual(await totals(), [350, 240, 3, 8], 'repeated IDs do not replay');
    await replayOwnerEvents([{ ...deletion, id: 'second-delete' }]);
    assert.deepEqual(await totals(), [350, 240, 3, 8], 'repeated deletion target cannot subtract twice');

    await seed();
    await replayOwnerEvents([source]);
    await replayOwnerEvents([deletion]);
    assert.equal((await db.markets.get(marketId))?.totalDeals, 0, 'incremental deletion can depend on an existing original');

    await seed();
    const broken = event('broken', 'operation_schedule_updated', 40, { scheduleId: 'missing', updates: {} });
    await assert.rejects(replayOwnerEvents([...rows, broken]), /not found/);
    assert.equal(await db.events.count(), 0, 'failed batch rolls back IDs');
    assert.deepEqual(await totals(), [0, 0, 0, 10], 'failed batch rolls back projections and stock');
    await replayOwnerEvents(rows);
    assert.deepEqual(await totals(), [350, 240, 3, 8], 'a later retry can recover');
    await seed();
    await assert.rejects(replayOwnerEvents(rows, { assertActive: () => { throw new Error('inactive'); } }), /inactive/);
    assert.equal(await db.events.count(), 0);
    const created = event('market-create', 'market_created', 1, { name: 'outdated metadata' });
    await replayOwnerEvents([created, ...rows]);
    assert.equal((await db.markets.get(marketId))?.name, 'Test', 'hydrated creation is explicitly acknowledged without resetting metadata');
    assert.deepEqual(await totals(), [350, 240, 3, 8]);

    // Real old-cache underflow: timestamp-only replay produces 4 despite correct money.
    await seed();
    for (const row of rows) { await db.events.add(row); await eventHandlers[row.type]!(row, db); }
    assert.deepEqual(await totals(), [350, 240, 4, 8]);
    await verifyAndRepairOwnerHistory(owner, rows);
    assert.deepEqual(await totals(), [350, 240, 3, 8], 'complete cloud history repairs old cache without changing stock');
    await db.markets.update(marketId, { totalDeals: 4 });
    await verifyAndRepairOwnerHistory(owner, rows.slice(1));
    assert.equal((await db.markets.get(marketId))?.totalDeals, 4, 'partial cloud history cannot authorize repair');
    await db.events.update('sale', { sync_status: 'pending' });
    await verifyAndRepairOwnerHistory(owner, rows);
    assert.equal((await db.markets.get(marketId))?.totalDeals, 4, 'pending writes prevent repair');
    await db.events.update('sale', { sync_status: 'synced' });
    await verifyAndRepairOwnerHistory('other-owner', rows);
    assert.equal((await db.markets.get(marketId))?.totalDeals, 4, 'other owners cannot authorize repair');
    await seed();
    for (const row of [deletion, source]) { await db.events.add(row); await eventHandlers[row.type]!(row, db); }
    assert.equal((await db.markets.get(marketId))?.totalDeals, 2);
    await verifyAndRepairOwnerHistory(owner, [deletion, source]);
    assert.deepEqual(await totals(), [0, 0, 0, 10], 'a verified history containing only deleted sales can become empty');
    await seed();
    await replayOwnerEvents([sale, { ...sale, id: 'another-real-sale' }]);
    assert.deepEqual(await totals(), [400, 240, 2, 6], 'different canonical IDs with equal date and amount are distinct sales');
    const productCreation = event('new-product-creation', 'product_created', 100, { productId: 'new-product', name: 'new', price: 100, cost: 40, stock: 10 });
    const oldBackfill = event('old-backfill', 'deal_closed', 50, { ...sale.payload, isBackfill: true, items: [{ productId: 'new-product', quantity: 2, price: 100, cost: 40 }] });
    assert.deepEqual(orderOwnerReplayEvents([oldBackfill, productCreation]).map(e => e.id), ['new-product-creation', 'old-backfill']);
    console.log('PASS owner replay: dependency order, atomic rollback, idempotency, incremental deletes, old-cache verification and pending/owner boundaries');
  } finally { await db.delete(); }
}
void main();
