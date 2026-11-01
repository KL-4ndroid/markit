import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { liveQuery } from 'dexie';
import { db, clearAllData } from '../lib/db';
import { readOwnerMarketActivity } from '../lib/markets/market-activity-reading';
import type { Market, Event, DealClosedPayload, InteractionRecordedPayload } from '../types/db';

type Activity = Awaited<ReturnType<typeof readOwnerMarketActivity>>;
async function main() {
  await db.open(); await clearAllData(); await db.settings.clear();
  const date = '2026-10-30';
  const market = { id: 'm', owner_id: 'owner-a', name: 'isolated activity', location: 'isolated', startDate: date, endDate: date,
    status: 'completed', createdAt: 1, updatedAt: 1 } as Market;
  const deal: Event<DealClosedPayload> = { id: 'sale', actor_id: 'owner-a', market_id: 'm', type: 'deal_closed', sync_status: 'synced',
    timestamp: Date.parse(`${date}T12:00:00+08:00`), payload: { market_id: 'm', dealDate: date, isManualEntry: true, manualRevenue: 50,
      manualCost: 0, manualDealCount: 1, items: [], totalAmount: 50, paymentMethod: 'cash' } };
  const interaction: Event<InteractionRecordedPayload> = { id: 'interaction', actor_id: 'owner-a', market_id: 'm',
    type: 'interaction_recorded', sync_status: 'synced', timestamp: deal.timestamp, payload: { market_id: 'm', type: 'interest' } };
  let latest: Activity | undefined;
  const waiters = new Set<{ predicate: (value: Activity) => boolean; resolve: (value: Activity) => void }>();
  const observation = liveQuery(() => readOwnerMarketActivity('owner-a', 'm', [date])).subscribe({
    next: value => { latest = value; for (const waiter of waiters) if (waiter.predicate(value)) { waiters.delete(waiter); waiter.resolve(value); } },
  });
  const waitFor = (predicate: (value: Activity) => boolean) => {
    if (latest && predicate(latest)) return Promise.resolve(latest);
    return new Promise<Activity>((resolve, reject) => {
      const waiter = { predicate, resolve: (value: Activity) => { clearTimeout(timer); resolve(value); } };
      const timer = setTimeout(() => { waiters.delete(waiter); reject(new Error('Live activity did not update')); }, 5000);
      waiters.add(waiter);
    });
  };
  try {
    await waitFor(value => !value.localReady);
    await db.markets.put(market);
    const empty = await waitFor(value => value.localReady);
    assert.equal(empty.historyVerified, false, 'An empty partial cache must not claim verified zero records');
    const originalMarket = JSON.stringify(await db.markets.get('m'));
    await db.events.put(deal);
    await waitFor(value => value.deals.length === 1);
    await db.events.put(interaction);
    await waitFor(value => value.interactions.length === 1);
    assert.equal(JSON.stringify(await db.markets.get('m')), originalMarket, 'No market update or DOM notification is needed for new cloud events');
    console.log('PASS staged cloud activity appears automatically after initial empty read without market mutation or DOM events');

    await db.events.put({ ...deal, id: 'legacy', market_id: undefined });
    await waitFor(value => value.deals.length === 2);
    await db.events.put({ ...deal, id: 'another-market', market_id: 'other', payload: { ...deal.payload, market_id: 'other' } });
    await db.events.put({ ...deal, id: 'outside-day', payload: { ...deal.payload, dealDate: '2026-11-01' } });
    assert.equal((await readOwnerMarketActivity('owner-a', 'm', [date])).deals.length, 2);
    await db.events.put({ id: 'remove-sale', type: 'deal_deleted', actor_id: 'owner-a', market_id: 'm', timestamp: deal.timestamp + 1,
      sync_status: 'synced', payload: { eventId: 'sale', market_id: 'm', dealDate: date, totalAmount: 50, totalCost: 0, dealCount: 1 } });
    await waitFor(value => value.deals.length === 1);
    await db.events.put({ id: 'remove-interaction', type: 'interaction_deleted', actor_id: 'owner-a', market_id: 'm', timestamp: deal.timestamp + 2,
      sync_status: 'synced', payload: { eventId: 'interaction', market_id: 'm' } });
    await waitFor(value => value.interactions.length === 0);
    console.log('PASS legacy payload market IDs, date/market filters and streamed deletion tombstones');

    await db.settings.put({ id: 1, theme: 'auto', language: 'zh-TW', defaultCurrency: 'TWD', enableNotifications: false, autoBackup: false,
      updatedAt: 1, ownerReplayRevision: 'owner-a:dependency-order-v2-product-owners:paid', lastSyncAt: 1000 });
    await waitFor(value => value.historyVerified);
    await db.markets.update('m', { owner_id: 'owner-b' });
    const denied = await waitFor(value => !value.localReady);
    assert.deepEqual(denied.deals, []); assert.deepEqual(denied.interactions, []);
    await db.markets.put({ ...market, access_type: 'staff' });
    assert.equal((await readOwnerMarketActivity('owner-a', 'm', [date])).localReady, false);
    console.log('PASS verified history readiness updates reactively and foreign/staff cache rows fail closed');
  } finally { observation.unsubscribe(); db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; db.close(); });
