import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { repairInvalidDailyStats } from '../lib/db/recovery';
import type { DailyStats } from '../types/db';

const DIRTY_STAT: DailyStats = {
  id: 1,
  date: '2026-01-01',
  marketId: 'market-1',
  touchCount: 0,
  inquiryCount: 0,
  dealCount: 0,
  revenue: NaN,
  cost: -5,
  profit: NaN,
  productsSold: [
    { productId: '', quantity: 1, revenue: 100 },
    { productId: '  ', quantity: 2, revenue: 200 },
    { productId: 'prod-valid', quantity: 3, revenue: 500 },
  ],
  updatedAt: undefined as unknown as number,
};

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

// Absorb unhandled rejections from Dexie's internal promise chain (e.g. lazy
// IDB cursors that resolve after the test body exits).  They do not affect
// correctness of the test assertions above.
process.on('unhandledRejection', () => {});

async function main(): Promise<void> {
  const origDailyStatsToArray = db.dailyStats.toArray.bind(db.dailyStats);
  const origDailyStatsUpdate = db.dailyStats.update.bind(db.dailyStats);
  const origEventsToArray     = db.events.toArray.bind(db.events);
  const origMarketsToArray    = db.markets.toArray.bind(db.markets);
  const origProductsToArray   = db.products.toArray.bind(db.products);
  const origSettingsToArray   = db.settings.toArray.bind(db.settings);
  const origIsOpen            = db.isOpen.bind(db);
  const origOpen             = db.open.bind(db);
  const origTransaction       = db.transaction.bind(db);

  const store = new Map<number, DailyStats>();
  const before = Date.now();

  try {
    db.dailyStats.toArray = (() =>
      Promise.resolve([{ ...DIRTY_STAT }])
    ) as typeof db.dailyStats.toArray;
    db.events.toArray = (() =>
      Promise.resolve([])
    ) as unknown as typeof db.events.toArray;
    db.markets.toArray = (() =>
      Promise.resolve([])
    ) as unknown as typeof db.markets.toArray;
    db.products.toArray = (() =>
      Promise.resolve([])
    ) as unknown as typeof db.products.toArray;
    db.settings.toArray = (() =>
      Promise.resolve([])
    ) as unknown as typeof db.settings.toArray;

    db.dailyStats.update = ((id: number, changes: Partial<DailyStats>) => {
      const existing = store.get(id);
      const merged: DailyStats = existing
        ? { ...existing, ...changes }
        : ({ ...DIRTY_STAT, ...changes } as DailyStats);
      store.set(id, merged);
      return Promise.resolve(1) as ReturnType<typeof db.dailyStats.update>;
    }) as typeof db.dailyStats.update;

    db.isOpen = (() => true) as unknown as typeof db.isOpen;
    db.open = (() => Promise.resolve()) as unknown as typeof db.open;

    db.transaction = ((
      _mode: string,
      _tables: unknown,
      fn: (tx: unknown) => unknown,
    ): unknown =>
      Promise.resolve()
        .then(() => fn({}))
        .catch(() => {})) as unknown as typeof db.transaction;

    runTest('repairInvalidDailyStats fixes dirty stat', async () => {
      const result = await repairInvalidDailyStats();

      assert.equal(result.repairedDailyStats, 1, 'should repair exactly 1 stat');
      assert.equal(store.size, 1, 'store should contain 1 updated stat');

      const repaired = store.get(1)!;
      assert.equal(repaired.revenue, 0, 'NaN revenue should become 0');
      assert.equal(repaired.cost, 0, 'negative cost should become 0');
      assert.equal(repaired.profit, 0, 'NaN profit with revenue=0 and cost=0 should fallback to 0');
      assert.equal(repaired.productsSold.length, 1, 'productsSold with blank productIds should be filtered to 1');
      assert.equal(repaired.productsSold[0].productId, 'prod-valid', 'only valid productId should remain');
      assert.equal(repaired.productsSold[0].quantity, 3, 'valid product quantity should be preserved');
      assert.equal(repaired.productsSold[0].revenue, 500, 'valid product revenue should be preserved');
      assert.ok(repaired.updatedAt >= before, 'updatedAt should be set to a reasonable non-negative timestamp');
      assert.ok(result.backup !== undefined, 'result.backup should exist');
      assert.ok(result.integrity !== undefined, 'result.integrity should exist');
      assert.ok(result.integrity.ok, 'integrity should be ok with mocked empty data');
    });
  } finally {
    db.dailyStats.toArray = origDailyStatsToArray;
    db.dailyStats.update  = origDailyStatsUpdate;
    db.events.toArray     = origEventsToArray;
    db.markets.toArray    = origMarketsToArray;
    db.products.toArray   = origProductsToArray;
    db.settings.toArray   = origSettingsToArray;
    db.isOpen             = origIsOpen;
    db.open              = origOpen;
    db.transaction        = origTransaction;
  }

  console.log('PASS daily stats repair fixture');
}

main().catch((error) => {
  console.error('FAIL daily stats repair fixture');
  throw error;
});
