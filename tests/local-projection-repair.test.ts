import assert from 'node:assert/strict';
import { db } from '../lib/db';
import {
  rebuildMarketStatsFromEvents,
  repairLocalMarketProjections,
  type LocalProjectionRepairResult,
} from '../lib/sync/local-projection-repair';
import type { DailyStats, DealClosedPayload, Event, Market } from '../types/db';

const MARKET_ID = 'market-projection-1';
const OTHER_MARKET_ID = 'market-other-1';

const tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];

function runTest(name: string, fn: () => Promise<void> | void): void {
  tests.push({ name, fn });
}

function market(overrides: Partial<Market> = {}): Market {
  return {
    id: MARKET_ID,
    name: 'Projection Market',
    location: 'Taipei',
    startDate: '2026-05-01',
    endDate: '2026-05-02',
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
    date: '2026-05-01',
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

function deal(
  id: string,
  payload: Partial<DealClosedPayload>,
  timestamp = new Date(2026, 4, 1, 12, 0, 0).getTime()
): Event<DealClosedPayload> {
  return {
    id,
    type: 'deal_closed',
    market_id: MARKET_ID,
    actor_id: 'owner-1',
    timestamp,
    sync_status: 'synced',
    payload: {
      market_id: MARKET_ID,
      items: [],
      totalAmount: 0,
      paymentMethod: 'cash',
      ...payload,
    } as DealClosedPayload,
  };
}

function interaction(
  id: string,
  type: string,
  timestamp = new Date(2026, 4, 1, 13, 0, 0).getTime()
): Event {
  return {
    id,
    type: 'interaction_recorded',
    market_id: MARKET_ID,
    actor_id: 'owner-1',
    timestamp,
    sync_status: 'synced',
    payload: {
      market_id: MARKET_ID,
      type,
    },
  } as Event;
}

function tombstone(
  id: string,
  type: 'deal_deleted' | 'interaction_deleted',
  eventId: string,
  timestamp = new Date(2026, 4, 1, 14, 0, 0).getTime()
): Event {
  return {
    id,
    type,
    market_id: MARKET_ID,
    actor_id: 'owner-1',
    timestamp,
    sync_status: 'synced',
    payload: {
      eventId,
      market_id: MARKET_ID,
      dealDate: '2026-05-01',
      totalAmount: 100,
      totalCost: 0,
      dealCount: 1,
      interactionType: 'touch',
    },
  } as Event;
}

function snakeTombstone(
  id: string,
  type: 'deal_deleted' | 'interaction_deleted',
  eventId: string,
  timestamp = new Date(2026, 4, 1, 14, 0, 0).getTime()
): Event {
  const event = tombstone(id, type, eventId, timestamp);
  event.payload = {
    ...event.payload,
    eventId: undefined,
    event_id: eventId,
  };
  return event;
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
      eventsAdded: 0,
      eventsDeleted: 0,
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

async function withMockDb<T>(
  store: ReturnType<typeof makeStore>,
  fn: () => Promise<T>
): Promise<T> {
  const origMarketsGet = (db.markets as any).get.bind(db.markets);
  const origMarketsToArray = (db.markets as any).toArray.bind(db.markets);
  const origMarketsUpdate = (db.markets as any).update.bind(db.markets);
  const origDailyStatsWhere = (db.dailyStats as any).where.bind(db.dailyStats);
  const origDailyStatsAdd = (db.dailyStats as any).add.bind(db.dailyStats);
  const origDailyStatsDelete = (db.dailyStats as any).delete.bind(db.dailyStats);
  const origEventsWhere = (db.events as any).where.bind(db.events);
  const origEventsAdd = (db.events as any).add.bind(db.events);
  const origEventsDelete = (db.events as any).delete?.bind(db.events);
  const origTransaction = db.transaction.bind(db);

  try {
    (db.markets as any).get = async (id: string) => store.markets.get(id);
    (db.markets as any).toArray = async () => Array.from(store.markets.values());
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
    (db.events as any).add = async () => {
      store.writes.eventsAdded += 1;
      throw new Error('repairLocalMarketProjections must not add events');
    };
    if ((db.events as any).delete) {
      (db.events as any).delete = async () => {
        store.writes.eventsDeleted += 1;
        throw new Error('repairLocalMarketProjections must not delete events');
      };
    }
    (db as any).transaction = async (_mode: string, _tables: unknown[], callback: () => Promise<void>) => {
      await callback();
    };

    return await fn();
  } finally {
    (db.markets as any).get = origMarketsGet;
    (db.markets as any).toArray = origMarketsToArray;
    (db.markets as any).update = origMarketsUpdate;
    (db.dailyStats as any).where = origDailyStatsWhere;
    (db.dailyStats as any).add = origDailyStatsAdd;
    (db.dailyStats as any).delete = origDailyStatsDelete;
    (db.events as any).where = origEventsWhere;
    (db.events as any).add = origEventsAdd;
    if (origEventsDelete) {
      (db.events as any).delete = origEventsDelete;
    }
    (db as any).transaction = origTransaction;
  }
}

function assertRepair(result: LocalProjectionRepairResult): LocalProjectionRepairResult['repaired'][number] {
  assert.equal(result.skipped.length, 0);
  assert.equal(result.repaired.length, 1);
  return result.repaired[0];
}

runTest('dry-run computes repaired projection without writing', async () => {
  const store = makeStore(
    [market({ totalRevenue: 300, totalDeals: 3 })],
    [stat({ id: 1, revenue: 300, dealCount: 3 })],
    [
      deal('d1', {
        isManualEntry: true,
        manualRevenue: 100,
        manualCost: 10,
        manualDealCount: 1,
        totalAmount: 100,
      }),
    ]
  );

  const result = await withMockDb(store, () =>
    repairLocalMarketProjections({ marketIds: [MARKET_ID], dryRun: true })
  );
  const item = assertRepair(result);

  assert.equal(item.before.marketTotalRevenue, 300);
  assert.equal(item.before.dailyStatsRevenue, 300);
  assert.equal(item.after.marketTotalRevenue, 100);
  assert.equal(item.after.dailyStatsRevenue, 100);
  assert.equal(item.after.marketTotalDeals, 1);
  assert.equal(store.writes.marketUpdates, 0);
  assert.equal(store.writes.statsAdded, 0);
  assert.equal(store.writes.statsDeleted, 0);
  assert.equal(store.writes.eventsAdded, 0);
});

runTest('execute repairs triple-counted projection from local events', async () => {
  const store = makeStore(
    [market({ totalRevenue: 181176, totalDeals: 120 })],
    [
      stat({ id: 1, date: '2026-05-01', revenue: 100000, dealCount: 70 }),
      stat({ id: 2, date: '2026-05-02', revenue: 81176, dealCount: 50 }),
    ],
    [
      deal('d1', {
        dealDate: '2026-05-01',
        isManualEntry: true,
        manualRevenue: 30000,
        manualCost: 1000,
        manualDealCount: 20,
        totalAmount: 30000,
      }),
      deal('d2', {
        dealDate: '2026-05-02',
        isManualEntry: true,
        manualRevenue: 30392,
        manualCost: 2000,
        manualDealCount: 20,
        totalAmount: 30392,
      }),
    ]
  );

  const result = await withMockDb(store, () =>
    repairLocalMarketProjections({ marketIds: [MARKET_ID], dryRun: false })
  );
  const item = assertRepair(result);
  const repairedMarket = store.markets.get(MARKET_ID)!;
  const repairedStats = store.getDailyStatsByMarket(MARKET_ID);

  assert.equal(item.before.dailyStatsRevenue, 181176);
  assert.equal(item.after.dailyStatsRevenue, 60392);
  assert.equal(repairedMarket.totalRevenue, 60392);
  assert.equal(repairedMarket.totalDeals, 40);
  assert.equal(repairedMarket.totalProfit, 57392);
  assert.equal(repairedStats.length, 2);
  assert.equal(repairedStats.reduce((sum, item) => sum + item.revenue, 0), 60392);
  assert.equal(repairedStats.reduce((sum, item) => sum + item.dealCount, 0), 40);
  assert.equal(store.writes.statsDeleted, 2);
  assert.equal(store.writes.statsAdded, 2);
  assert.equal(store.writes.eventsAdded, 0);
  assert.equal(store.events.length, 2);
});

runTest('market not found skips', async () => {
  const store = makeStore([], [], []);

  const result = await withMockDb(store, () =>
    repairLocalMarketProjections({ marketIds: [MARKET_ID], dryRun: true })
  );

  assert.equal(result.repaired.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, 'local_market_not_found');
});

runTest('no deal events skips without writing', async () => {
  const store = makeStore(
    [market({ totalRevenue: 123, totalDeals: 1 })],
    [stat({ revenue: 123, dealCount: 1 })],
    []
  );

  const result = await withMockDb(store, () =>
    repairLocalMarketProjections({ marketIds: [MARKET_ID], dryRun: false })
  );

  assert.equal(result.repaired.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, 'no_deal_events');
  assert.equal(store.writes.marketUpdates, 0);
  assert.equal(store.writes.statsDeleted, 0);
});

runTest('dailyStats are grouped by local date', async () => {
  const store = makeStore(
    [market({ totalRevenue: 999, totalDeals: 9 })],
    [stat({ id: 1, revenue: 999, dealCount: 9 })],
    [
      deal('d1', {
        isManualEntry: true,
        manualRevenue: 100,
        manualCost: 0,
        manualDealCount: 1,
        totalAmount: 100,
      }, new Date(2026, 4, 1, 10).getTime()),
      deal('d2', {
        isManualEntry: true,
        manualRevenue: 200,
        manualCost: 0,
        manualDealCount: 1,
        totalAmount: 200,
      }, new Date(2026, 4, 2, 10).getTime()),
    ]
  );

  await withMockDb(store, () =>
    repairLocalMarketProjections({ marketIds: [MARKET_ID], dryRun: false })
  );

  const repairedStats = store.getDailyStatsByMarket(MARKET_ID);
  assert.deepEqual(
    repairedStats.map(item => [item.date, item.revenue, item.dealCount]),
    [
      ['2026-05-01', 100, 1],
      ['2026-05-02', 200, 1],
    ]
  );
});

runTest('manualRevenue and manualCost are used when present', async () => {
  const store = makeStore(
    [market({ totalRevenue: 999, totalDeals: 9 })],
    [stat({ revenue: 999, dealCount: 9 })],
    [
      deal('d1', {
        isManualEntry: true,
        manualRevenue: 500,
        manualCost: 125,
        manualDealCount: 4,
        totalAmount: 9999,
      }),
    ]
  );

  await withMockDb(store, () =>
    repairLocalMarketProjections({ marketIds: [MARKET_ID], dryRun: false })
  );

  const repairedMarket = store.markets.get(MARKET_ID)!;
  const repairedStats = store.getDailyStatsByMarket(MARKET_ID);
  assert.equal(repairedMarket.totalRevenue, 500);
  assert.equal(repairedMarket.totalDeals, 4);
  assert.equal(repairedMarket.totalProfit, 375);
  assert.equal(repairedStats[0].cost, 125);
  assert.equal(repairedStats[0].profit, 375);
});

runTest('items revenue cost and productsSold are rebuilt', async () => {
  const store = makeStore(
    [market({ totalRevenue: 999, totalDeals: 9 })],
    [stat({ revenue: 999, dealCount: 9, productsSold: [] })],
    [
      deal('d1', {
        items: [
          {
            productId: 'p1',
            quantity: 2,
            price: 100,
            price_at_time_of_sale: 120,
            cost_at_time_of_sale: 30,
          },
          {
            productId: 'p1',
            quantity: 1,
            price: 100,
            price_at_time_of_sale: 80,
            cost_at_time_of_sale: 20,
          },
        ],
        totalAmount: 9999,
        paymentMethod: 'cash',
      }),
    ]
  );

  await withMockDb(store, () =>
    repairLocalMarketProjections({ marketIds: [MARKET_ID], dryRun: false })
  );

  const repairedMarket = store.markets.get(MARKET_ID)!;
  const repairedStats = store.getDailyStatsByMarket(MARKET_ID);
  assert.equal(repairedMarket.totalRevenue, 320);
  assert.equal(repairedMarket.totalDeals, 1);
  assert.equal(repairedMarket.totalProfit, 240);
  assert.deepEqual(repairedStats[0].productsSold, [
    { productId: 'p1', quantity: 3, revenue: 320 },
  ]);
});

runTest('only requested markets are repaired', async () => {
  const store = makeStore(
    [
      market({ id: MARKET_ID, totalRevenue: 300, totalDeals: 3 }),
      market({ id: OTHER_MARKET_ID, totalRevenue: 900, totalDeals: 9 }),
    ],
    [
      stat({ id: 1, marketId: MARKET_ID, revenue: 300, dealCount: 3 }),
      stat({ id: 2, marketId: OTHER_MARKET_ID, revenue: 900, dealCount: 9 }),
    ],
    [
      deal('d1', {
        isManualEntry: true,
        manualRevenue: 100,
        manualCost: 0,
        manualDealCount: 1,
        totalAmount: 100,
      }),
      {
        ...deal('d2', {
          isManualEntry: true,
          manualRevenue: 400,
          manualCost: 0,
          manualDealCount: 1,
          totalAmount: 400,
        }),
        market_id: OTHER_MARKET_ID,
        payload: {
          ...deal('d2', {
            isManualEntry: true,
            manualRevenue: 400,
            manualCost: 0,
            manualDealCount: 1,
            totalAmount: 400,
          }).payload,
          market_id: OTHER_MARKET_ID,
        },
      },
    ]
  );

  await withMockDb(store, () =>
    repairLocalMarketProjections({ marketIds: [MARKET_ID], dryRun: false })
  );

  assert.equal(store.markets.get(MARKET_ID)!.totalRevenue, 100);
  assert.equal(store.markets.get(OTHER_MARKET_ID)!.totalRevenue, 900);
  assert.equal(store.getDailyStatsByMarket(OTHER_MARKET_ID)[0].revenue, 900);
});

runTest('auto-detect repairs inflated markets without explicit marketIds', async () => {
  const store = makeStore(
    [
      market({ id: MARKET_ID, totalRevenue: 300, totalDeals: 3 }),
      market({ id: OTHER_MARKET_ID, totalRevenue: 200, totalDeals: 2 }),
    ],
    [
      stat({ id: 1, marketId: MARKET_ID, revenue: 300, dealCount: 3 }),
      stat({ id: 2, marketId: OTHER_MARKET_ID, revenue: 200, dealCount: 2 }),
    ],
    [
      deal('d1', {
        isManualEntry: true,
        manualRevenue: 100,
        manualCost: 0,
        manualDealCount: 1,
        totalAmount: 100,
      }),
      {
        ...deal('d2', {
          isManualEntry: true,
          manualRevenue: 200,
          manualCost: 0,
          manualDealCount: 2,
          totalAmount: 200,
        }),
        market_id: OTHER_MARKET_ID,
        payload: {
          ...deal('d2', {
            isManualEntry: true,
            manualRevenue: 200,
            manualCost: 0,
            manualDealCount: 2,
            totalAmount: 200,
          }).payload,
          market_id: OTHER_MARKET_ID,
        },
      },
    ]
  );

  const result = await withMockDb(store, () =>
    repairLocalMarketProjections({ dryRun: true })
  );

  assert.equal(result.repaired.length, 1);
  assert.equal(result.repaired[0].marketId, MARKET_ID);
  assert.equal(result.repaired[0].before.marketTotalRevenue, 300);
  assert.equal(result.repaired[0].after.marketTotalRevenue, 100);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].marketId, OTHER_MARKET_ID);
  assert.equal(result.skipped[0].reason, 'already_consistent');
});

runTest('already consistent projection is skipped', async () => {
  const store = makeStore(
    [market({ totalRevenue: 100, totalDeals: 1 })],
    [stat({ revenue: 100, dealCount: 1 })],
    [
      deal('d1', {
        isManualEntry: true,
        manualRevenue: 100,
        manualCost: 0,
        manualDealCount: 1,
        totalAmount: 100,
      }),
    ]
  );

  const result = await withMockDb(store, () =>
    repairLocalMarketProjections({ marketIds: [MARKET_ID], dryRun: false })
  );

  assert.equal(result.repaired.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, 'already_consistent');
  assert.equal(store.writes.marketUpdates, 0);
  assert.equal(store.writes.statsDeleted, 0);
});

runTest('projection lower than events is skipped for safety', async () => {
  const store = makeStore(
    [market({ totalRevenue: 50, totalDeals: 1 })],
    [stat({ revenue: 50, dealCount: 1 })],
    [
      deal('d1', {
        isManualEntry: true,
        manualRevenue: 100,
        manualCost: 0,
        manualDealCount: 1,
        totalAmount: 100,
      }),
    ]
  );

  const result = await withMockDb(store, () =>
    repairLocalMarketProjections({ marketIds: [MARKET_ID], dryRun: false })
  );

  assert.equal(result.repaired.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, 'projection_lower_than_events');
  assert.equal(store.writes.marketUpdates, 0);
  assert.equal(store.writes.statsDeleted, 0);
});

runTest('falls back to payload market_id when market_id index has no matches', async () => {
  const event = deal('d1', {
    isManualEntry: true,
    manualRevenue: 250,
    manualCost: 25,
    manualDealCount: 2,
    totalAmount: 250,
  });
  const store = makeStore(
    [market({ totalRevenue: 750, totalDeals: 6 })],
    [stat({ revenue: 750, dealCount: 6 })],
    [
      {
        ...event,
        market_id: undefined,
        payload: {
          ...event.payload,
          market_id: MARKET_ID,
        },
      } as Event,
    ]
  );

  const result = await withMockDb(store, () =>
    repairLocalMarketProjections({ marketIds: [MARKET_ID], dryRun: false })
  );
  const item = assertRepair(result);

  assert.equal(item.after.marketTotalRevenue, 250);
  assert.equal(item.after.marketTotalDeals, 2);
  assert.equal(store.markets.get(MARKET_ID)!.totalRevenue, 250);
  assert.equal(store.getDailyStatsByMarket(MARKET_ID)[0].revenue, 250);
});

runTest('rebuildMarketStatsFromEvents rebuilds interaction totals', async () => {
  const store = makeStore(
    [market({ totalRevenue: 0, totalDeals: 0, totalInteractions: 9 })],
    [stat({ revenue: 0, dealCount: 0, touchCount: 6, inquiryCount: 3 })],
    [
      interaction('i1', 'touch'),
      interaction('i2', 'inquiry'),
      interaction('i3', 'photo'),
    ]
  );

  const result = await withMockDb(store, () =>
    rebuildMarketStatsFromEvents(MARKET_ID, { dryRun: false })
  );
  const repairedMarket = store.markets.get(MARKET_ID)!;
  const repairedStats = store.getDailyStatsByMarket(MARKET_ID);

  assert.ok(result);
  assert.equal(result?.after.marketTotalInteractions, 3);
  assert.equal(repairedMarket.totalInteractions, 3);
  assert.equal(repairedStats.length, 1);
  assert.equal(repairedStats[0].touchCount, 1);
  assert.equal(repairedStats[0].inquiryCount, 1);
  assert.deepEqual(repairedStats[0].extraInteractions, { photo: 1 });
  assert.equal(store.writes.eventsAdded, 0);
  assert.equal(store.writes.eventsDeleted, 0);
});

runTest('rebuildMarketStatsFromEvents excludes deleted deal and interaction events', async () => {
  const store = makeStore(
    [market({ totalRevenue: 600, totalDeals: 6, totalInteractions: 6 })],
    [stat({ revenue: 600, dealCount: 6, touchCount: 6 })],
    [
      deal('d1', {
        isManualEntry: true,
        manualRevenue: 100,
        manualCost: 0,
        manualDealCount: 1,
        totalAmount: 100,
      }),
      deal('d2', {
        isManualEntry: true,
        manualRevenue: 200,
        manualCost: 0,
        manualDealCount: 1,
        totalAmount: 200,
      }),
      tombstone('td1', 'deal_deleted', 'd1'),
      interaction('i1', 'touch'),
      interaction('i2', 'touch'),
      tombstone('ti1', 'interaction_deleted', 'i1'),
    ]
  );

  const result = await withMockDb(store, () =>
    rebuildMarketStatsFromEvents(MARKET_ID, { dryRun: false })
  );
  const repairedMarket = store.markets.get(MARKET_ID)!;
  const repairedStats = store.getDailyStatsByMarket(MARKET_ID);

  assert.ok(result);
  assert.equal(repairedMarket.totalRevenue, 200);
  assert.equal(repairedMarket.totalDeals, 1);
  assert.equal(repairedMarket.totalInteractions, 1);
  assert.equal(repairedStats[0].revenue, 200);
  assert.equal(repairedStats[0].dealCount, 1);
  assert.equal(repairedStats[0].touchCount, 1);
});

runTest('rebuildMarketStatsFromEvents excludes snake_case tombstone target ids', async () => {
  const store = makeStore(
    [market({ totalRevenue: 300, totalDeals: 3 })],
    [stat({ revenue: 300, dealCount: 3 })],
    [
      deal('d1', {
        isManualEntry: true,
        manualRevenue: 100,
        manualCost: 0,
        manualDealCount: 1,
        totalAmount: 100,
      }),
      deal('d2', {
        isManualEntry: true,
        manualRevenue: 200,
        manualCost: 0,
        manualDealCount: 1,
        totalAmount: 200,
      }),
      snakeTombstone('td1', 'deal_deleted', 'd1'),
    ]
  );

  const result = await withMockDb(store, () =>
    rebuildMarketStatsFromEvents(MARKET_ID, { dryRun: false })
  );
  const repairedMarket = store.markets.get(MARKET_ID)!;
  const repairedStats = store.getDailyStatsByMarket(MARKET_ID);

  assert.ok(result);
  assert.equal(repairedMarket.totalRevenue, 200);
  assert.equal(repairedMarket.totalDeals, 1);
  assert.equal(repairedStats[0].revenue, 200);
  assert.equal(repairedStats[0].dealCount, 1);
});

runTest('rebuildMarketStatsFromEvents does not write events', async () => {
  const store = makeStore(
    [market({ totalRevenue: 300, totalDeals: 3 })],
    [stat({ revenue: 300, dealCount: 3 })],
    [
      deal('d1', {
        isManualEntry: true,
        manualRevenue: 100,
        manualCost: 0,
        manualDealCount: 1,
        totalAmount: 100,
      }),
    ]
  );

  await withMockDb(store, () =>
    rebuildMarketStatsFromEvents(MARKET_ID, { dryRun: false })
  );

  assert.equal(store.writes.eventsAdded, 0);
  assert.equal(store.writes.eventsDeleted, 0);
  assert.equal(store.events.length, 1);
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`ok - ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`not ok - ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
    throw new Error(`${failed} local projection repair tests failed`);
  }

  console.log(`${tests.length} local projection repair tests passed`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
