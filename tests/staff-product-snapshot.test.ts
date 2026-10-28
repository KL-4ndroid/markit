import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { eventHandlers } from '../lib/db/events';
import { syncProductsToIndexedDB, syncMarketsToIndexedDB, syncEventsToIndexedDB } from '../lib/sync/local-cache-writer';
import { rebuildStaffProductSales } from '../lib/sync/staff-product-sales';

const actor = 'staff-fixture', owner = 'owner-fixture', marketId = 'market-fixture', productId = 'product-fixture';
const market = { id: marketId, name: 'Fixture', owner_id: owner, relationship_owner_id: owner, access_type: 'staff', status: 'ongoing', start_date: '2026-10-28', end_date: '2026-10-28' };
const product = { id: productId, owner_id: owner, relationship_owner_id: owner, access_type: 'staff', name: 'Fixture', price: 120, cost: 40, stock: 2, total_sold: 2, is_active: true };
const event = (id: string, type: string, payload: object, time = 1000) => ({ id, type, payload: { market_id: marketId, ...payload }, market_id: marketId, actor_id: actor, timestamp: new Date(1793152800000 + time).toISOString(), sync_status: 'synced' });
const sale = (id: string, extra = {}) => event(id, 'deal_closed', { items: [{ productId, quantity: 1, price: 120 }], totalAmount: 120, isBackfill: false, ...extra });
const cloud = [sale('s1'), sale('s2')];
async function pull(events: any[], snapshot = product, level: 0 | 2 = 2) {
  await syncMarketsToIndexedDB([market], actor, level);
  await syncProductsToIndexedDB([snapshot], actor, level);
  await syncEventsToIndexedDB(events, level);
  await rebuildStaffProductSales([productId], [marketId], level);
}
async function main() {
  await db.open();
  await Promise.all([db.events.clear(), db.products.clear(), db.markets.clear(), db.dailyStats.clear()]);
  try {
    await pull(cloud);
    assert.equal((await db.products.get(productId))?.stock, 2, 'cloud stock must not be deducted again by old sales');
    assert.equal((await db.products.get(productId))?.totalSold, 2);
    assert.equal((await db.products.get(productId))?.cost, undefined);
    await pull(cloud);
    assert.equal((await db.products.get(productId))?.stock, 2);
    assert.equal((await db.products.get(productId))?.totalSold, 2, 'repeated full pull must not reset sold count');
    assert.equal((await db.events.count()), 2);
    await pull([...cloud, event('old-product-update', 'product_updated', { productId, updates: { price: 1, stock: 99 } })]);
    assert.equal((await db.products.get(productId))?.price, 120, 'old product metadata cannot overwrite the current snapshot');
    assert.equal((await db.products.get(productId))?.stock, 2);
    const deletion = event('d1', 'deal_deleted', { eventId: 's1', totalAmount: 120, totalCost: 0, dealCount: 1, productsSold: [{ productId, quantity: 1, revenue: 120 }], dealDate: '2026-10-28' }, 2000);
    await pull([...cloud, deletion], { ...product, stock: 3, total_sold: 1 });
    assert.equal((await db.products.get(productId))?.stock, 3, 'remote deletion must not restore stock twice');
    assert.equal((await db.products.get(productId))?.totalSold, 1);
    const pending = { ...sale('pending', { productSnapshot: true }), timestamp: 1793152803000, sync_status: 'pending' as const };
    await db.events.add(pending as any);
    await eventHandlers.deal_closed!(pending as any, db);
    assert.equal((await db.products.get(productId))?.stock, 2, 'ordinary local transactions still deduct stock');
    await pull([...cloud, deletion], { ...product, stock: 3, total_sold: 1 });
    assert.equal((await db.products.get(productId))?.stock, 2, 'unacknowledged local product changes are preserved');
    assert.equal((await db.products.get(productId))?.totalSold, 2, 'pending visible sale remains in the read model');
    assert.equal((await db.events.get('pending'))?.sync_status, 'pending');
    await pull([...cloud, deletion, sale('pending')], { ...product, stock: 2, total_sold: 2 });
    await pull([...cloud, deletion, sale('pending')], { ...product, stock: 2, total_sold: 2 });
    assert.equal((await db.products.get(productId))?.stock, 2);
    assert.equal((await db.products.get(productId))?.totalSold, 2);
    await rebuildStaffProductSales([productId], ['different-market'], 2);
    assert.equal((await db.products.get(productId))?.totalSold, 0, 'unassigned markets cannot contribute');
    await pull(cloud, product, 0);
    const restricted = await db.products.get(productId);
    assert.equal(restricted?.stock, undefined);
    assert.equal(restricted?.price, 0);
    assert.equal(restricted?.totalSold, 0);
    assert.equal(restricted?.staffSalesProjectionReady, false);
    console.log('PASS staff snapshot stock, idempotent sold counts, remote deletions, pending preservation, scope and downgrade redaction');
  } finally {
    await Promise.all([db.events.clear(), db.products.clear(), db.markets.clear(), db.dailyStats.clear()]);
    db.close();
  }
}
void main();
