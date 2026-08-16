import assert from 'node:assert/strict';
import { db } from '../lib/db';
import {
  compareMarketProjectionWithEvents,
  rebuildMarketStatsFromEvents,
} from '../lib/projections/market-projection-service';
import type { DailyStats, DealClosedPayload, Event, Market } from '../types/db';

const MARKET_ID = 'market-projection-service-1';

type Store = ReturnType<typeof makeStore>;

function runTest(name: string, fn: () => Promise<void> | void): void {
  tests.push({ name, fn });
}

const tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];

function market(overrides: Partial<Market> = {}): Market {
  return {
    id: MARKET_ID,
    name: 'Projection Service Market',
    location: 'Taipei',
    startDate: '2026-06-01',
    endDate: '2026-06-01',
    status: 'completed',
    registrationFee: 0,
    boothCost: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalInteractions: 0,
    totalDeals: 0,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function stat(overrides: Partial<DailyStats> = {}): DailyStats {
  return {
    id: 1,
    date: '2026-06-01',
    marketId: MARKET_ID,
    touchCount: 0,
    inquiryCount: 0,
    dealCount: 1,
    revenue: 100,
    cost: 0,
    profit: 100,
    productsSold: [],
    updatedAt: 1,
    ...overrides,
  };
}

function deal(overrides: Partial<Event<DealClosedPayload>> = {}): Event<DealClosedPayload> {
  return {
    id: 'deal-1',
    type: 'deal_closed',
    market_id: MARKET_ID,
    actor_id: 'owner-1',
    timestamp: new Date('2026-06-01T12:00:00+08:00').getTime(),
    sync_status: 'synced',
    payload: {
      market_id: MARKET_ID,
      dealDate: '2026-06-01',
      isManualEntry: true,
      items: [],
      totalAmount: 100,
      manualRevenue: 100,
      manualDealCount: 1,
      paymentMethod: 'cash',
    },
    ...overrides,
  };
}

function makeStore(
  initialMarkets: Market[],
  initialStats: DailyStats[],
  initialEvents: Event[]
) {
  const markets = new Map<string, Market>(
    initialMarkets.map(item => [item.id!, { ...item }])
  );
  const dailyStats = new Map<number, DailyStats>(
    initialStats.map(item => [item.id!, { ...item }])
  );
  const events = initialEvents.map(item => ({ ...item }));
  let nextStatId = 100;

  return {
    markets,
    dailyStats,
    events,
    writes: {
      marketUpdates: 0,
      statsAdded: 0,
      statsDeleted: 0,
    },
    getDailyStatsByMarket(marketId: string): DailyStats[] {
      return Array.from(dailyStats.values()).filter(item => item.marketId === marketId);
    },
    getEventsByMarket(marketId: string): Event[] {
      return events.filter(item => item.market_id === marketId);
    },
    addDailyStat(item: DailyStats): number {
      const id = nextStatId++;
      dailyStats.set(id, { ...item, id });
      this.writes.statsAdded += 1;
      return id;
    },
    deleteDailyStat(id: number): void {
      dailyStats.delete(id);
      this.writes.statsDeleted += 1;
    },
    updateMarket(id: string, changes: Partial<Market>): void {
      const current = markets.get(id);
      if (!current) return;
      markets.set(id, { ...current, ...changes });
      this.writes.marketUpdates += 1;
    },
  };
}

async function withMockDb<T>(store: Store, fn: () => Promise<T>): Promise<T> {
  const origMarketsGet = (db.markets as any).get.bind(db.markets);
  const origMarketsUpdate = (db.markets as any).update.bind(db.markets);
  const origDailyStatsWhere = (db.dailyStats as any).where.bind(db.dailyStats);
  const origDailyStatsAdd = (db.dailyStats as any).add.bind(db.dailyStats);
  const origDailyStatsDelete = (db.dailyStats as any).delete.bind(db.dailyStats);
  const origEventsWhere = (db.events as any).where.bind(db.events);
  const origTransaction = db.transaction.bind(db);

  try {
    (db.markets as any).get = async (id: string) => store.markets.get(id);
    (db.markets as any).update = async (id: string, changes: Partial<Market>) => {
      store.updateMarket(id, changes);
      return 1;
    };
    (db.dailyStats as any).where = () => ({
      equals: (marketId: string) => ({
        toArray: async () => store.getDailyStatsByMarket(marketId),
      }),
    });
    (db.dailyStats as any).add = async (item: DailyStats) => store.addDailyStat(item);
    (db.dailyStats as any).delete = async (id: number) => {
      store.deleteDailyStat(id);
    };
    (db.events as any).where = (field: string) => ({
      equals: (value: string) => ({
        and: (predicate: (event: Event) => boolean) => ({
          toArray: async () => {
            const base =
              field === 'market_id'
                ? store.getEventsByMarket(value)
                : store.events.filter(event => (event as any)[field] === value);
            return base.filter(predicate);
          },
        }),
      }),
    });
    (db as any).transaction = async (_mode: string, _tables: unknown[], callback: () => Promise<void>) => {
      await callback();
    };

    return await fn();
  } finally {
    (db.markets as any).get = origMarketsGet;
    (db.markets as any).update = origMarketsUpdate;
    (db.dailyStats as any).where = origDailyStatsWhere;
    (db.dailyStats as any).add = origDailyStatsAdd;
    (db.dailyStats as any).delete = origDailyStatsDelete;
    (db.events as any).where = origEventsWhere;
    (db as any).transaction = origTransaction;
  }
}

runTest('compareMarketProjectionWithEvents detects inflated projection', async () => {
  const store = makeStore(
    [market({ totalRevenue: 300, totalDeals: 3 })],
    [stat({ revenue: 300, dealCount: 3 })],
    [deal()]
  );

  await withMockDb(store, async () => {
    const comparison = await compareMarketProjectionWithEvents(MARKET_ID);

    assert.equal(comparison.status, 'inflated');
    assert.equal(comparison.before?.marketTotalRevenue, 300);
    assert.equal(comparison.after?.marketTotalRevenue, 100);
  });
});

runTest('compareMarketProjectionWithEvents detects incomplete local events', async () => {
  const store = makeStore(
    [market({ totalRevenue: 56287, totalDeals: 25 })],
    [stat({ revenue: 56287, dealCount: 25 })],
    [
      deal({
        payload: {
          market_id: MARKET_ID,
          dealDate: '2026-06-01',
          isManualEntry: true,
          items: [],
          totalAmount: 2111,
          manualRevenue: 2111,
          manualDealCount: 2,
          paymentMethod: 'cash',
        },
      }),
    ]
  );

  await withMockDb(store, async () => {
    const comparison = await compareMarketProjectionWithEvents(MARKET_ID);

    assert.equal(comparison.status, 'local_events_incomplete');
    assert.equal(comparison.before?.marketTotalRevenue, 56287);
    assert.equal(comparison.after?.marketTotalRevenue, 2111);
  });
});

runTest('compareMarketProjectionWithEvents detects consistent projection', async () => {
  const store = makeStore(
    [market({ totalRevenue: 100, totalDeals: 1 })],
    [stat({ revenue: 100, dealCount: 1 })],
    [deal()]
  );

  await withMockDb(store, async () => {
    const comparison = await compareMarketProjectionWithEvents(MARKET_ID);

    assert.equal(comparison.status, 'consistent');
  });
});

runTest('compareMarketProjectionWithEvents reports missing market or events', async () => {
  const store = makeStore([], [], []);

  await withMockDb(store, async () => {
    const comparison = await compareMarketProjectionWithEvents(MARKET_ID);

    assert.equal(comparison.status, 'missing_or_no_events');
  });
});

runTest('rebuildMarketStatsFromEvents updates market and dailyStats projection only', async () => {
  const store = makeStore(
    [market({ totalRevenue: 300, totalDeals: 3 })],
    [stat({ revenue: 300, dealCount: 3 })],
    [deal()]
  );

  await withMockDb(store, async () => {
    const result = await rebuildMarketStatsFromEvents(MARKET_ID, { dryRun: false });
    const repairedMarket = store.markets.get(MARKET_ID)!;
    const repairedStats = store.getDailyStatsByMarket(MARKET_ID);

    assert.equal(result?.after.marketTotalRevenue, 100);
    assert.equal(repairedMarket.totalRevenue, 100);
    assert.equal(repairedMarket.totalDeals, 1);
    assert.equal(repairedStats.length, 1);
    assert.equal(repairedStats[0].revenue, 100);
    assert.equal(store.writes.marketUpdates, 1);
    assert.equal(store.writes.statsDeleted, 1);
    assert.equal(store.writes.statsAdded, 1);
  });
});

async function main(): Promise<void> {
  let failed = 0;
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} market projection service tests failed`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
