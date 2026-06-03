import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { eventHandlers } from '../lib/db/events';
import type { Market } from '../types/db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CloudEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  actor_id: string;
  market_id: string;
  timestamp: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

const OWNER_ID = 'user-owner-1';
const MARKET_ID = '5bfb9ff4-15b3-4b5e-831c-d96439b4d0bb';

function makeCloudEvents(ids: string[]): CloudEvent[] {
  return ids.map((id, i) => ({
    id,
    type: 'deal_closed',
    payload: {
      market_id: MARKET_ID,
      totalAmount: 34911,
      dealDate: '2025-12-01',
      isManualEntry: true,
      manualRevenue: 34911,
      manualCost: 0,
      manualDealCount: 1,
    },
    actor_id: OWNER_ID,
    market_id: MARKET_ID,
    timestamp: new Date(2025, 11, i + 1, 12, 0, 0).toISOString(),
    created_at: new Date(2026, 4, 20, 10, 0, 0).toISOString(),
    metadata: {},
  }));
}

function fixtureMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: MARKET_ID,
    name: 'Test Market',
    location: 'Taipei',
    startDate: '2025-12-01',
    endDate: '2025-12-01',
    status: 'completed',
    registrationFee: 0,
    boothCost: 0,
    owner_id: OWNER_ID,
    is_collaborative: false,
    sync_status: 'synced',
    totalRevenue: 0,
    totalProfit: 0,
    totalInteractions: 0,
    totalDeals: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Supabase mock factory
// ---------------------------------------------------------------------------

interface CloudMarketStats {
  total_revenue: number;
  total_deals: number;
}

const DEFAULT_STATS: CloudMarketStats = {
  total_revenue: 69822,
  total_deals: 2,
};

/**
 * Returns a plain object with a `from` method — matches SupabaseClientLike interface.
 *
 * Query chains used:
 * - markets: client.from('markets').select(...).eq(...).single()  → Promise<{ data, error }>
 * - events:  client.from('events').select(...).eq(...).eq(...).order(...)
 *            → Promise<{ data: CloudEvent[] | null, error }>
 */
function makeSupabaseMock(
  events: CloudEvent[],
  stats: CloudMarketStats = DEFAULT_STATS
): any {
  const from = (_table: string) => {
    const select = (_cols: string) => {
      const node = {
        eq: (_field: string, _value: unknown) => node,
        single: () =>
          Promise.resolve({ data: stats, error: null }),
        order: async () => ({ data: events, error: null }),
      };
      return node;
    };
    return { select };
  };
  return { from };
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

function runTest(
  name: string,
  fn: () => Promise<void> | void
): void {
  tests.push({ name, fn });
}

const tests: Array<{ name: string; fn: () => Promise<void> | void }> = [];

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

runTest('zero-to-cloud: repairs missing deal_closed', async () => {
  const localEvents = new Map<string, unknown>();
  let updatedMarketRevenue = 0;

  const origEventsWhere = (db.events as any).where.bind(
    db.events
  );
  const origEventsGet = (db.events as any).get.bind(
    db.events
  );
  const origEventsAdd = (db.events as any).add.bind(
    db.events
  );
  const origMarketsGet = (db.markets as any).get.bind(
    db.markets
  );
  const origMarketsBulkGet = (
    db.markets as any
  ).bulkGet.bind(db.markets);
  const origMarketsUpdate = (
    db.markets as any
  ).update.bind(db.markets);

  const origHandler = eventHandlers['deal_closed'];

  eventHandlers['deal_closed'] = async (event: unknown, dbHandle: unknown) => {
    const e = event as { market_id?: string; payload?: { market_id?: string; totalAmount?: number; manualRevenue?: number } };
    const mId =
      e.market_id ?? e.payload?.market_id;
    if (!mId) return;
    const market = await (dbHandle as { markets: { get: (id: string) => Promise<Market | undefined> } }).markets.get(mId);
    if (!market) return;
    const total =
      (market.totalRevenue ?? 0) +
      ((e.payload?.totalAmount ?? 0) ||
        (e.payload?.manualRevenue ?? 0));
    await (dbHandle as { markets: { update: (id: string, changes: Record<string, unknown>) => Promise<number> } }).markets.update(mId, {
      totalRevenue: total,
    });
  };

  const localMarkets = new Map([
    [MARKET_ID, fixtureMarket({ totalRevenue: 0 })],
  ]);

  try {
    (db.events as any).where = () => ({
      equals: () => ({
        and: () => ({ toArray: async () => Array.from(localEvents.values()) }),
      }),
    });

    (db.events as any).get = async (
      id: string
    ) => localEvents.get(id);

    (db.events as any).add = async (
      event: unknown
    ) => {
      const e = event as { id: string };
      localEvents.set(e.id, e);
      return e.id;
    };

    (db.markets as any).get = async (
      id: string
    ) => {
      const m = localMarkets.get(id);
      if (!m) return undefined;
      return { ...m, totalRevenue: updatedMarketRevenue };
    };

    (db.markets as any).bulkGet = async (
      ids: string[]
    ) => ids.map(id => localMarkets.get(id));

    (db.markets as any).update = async (
      id: string,
      changes: Record<string, unknown>
    ) => {
      const existing = localMarkets.get(id);
      if (existing) {
        localMarkets.set(id, { ...existing, ...changes } as Market);
        updatedMarketRevenue =
          (changes.totalRevenue as number) ?? updatedMarketRevenue;
      }
      return 1;
    };

    const { repairOwnerRevenueGaps } = await import(
      '../lib/sync/owner-revenue-gap-repair'
    );

    const result = await repairOwnerRevenueGaps({
      ownerId: OWNER_ID,
      marketIds: [MARKET_ID],
      supabaseClient: makeSupabaseMock(
        makeCloudEvents(['evt-c1', 'evt-c2'])
      ),
    });

    assert.equal(result.repaired.length, 1, 'should repair 1 market');
    assert.equal(result.repaired[0].cloudRevenue, 69822);
    assert.equal(result.repaired[0].cloudDeals, 2);
    assert.equal(result.repaired[0].localRevenueBefore, 0);
    assert.equal(result.repaired[0].replayedEvents, 2);
    assert.equal(result.skipped.length, 0);
  } finally {
    eventHandlers['deal_closed'] = origHandler;
    (db.events as any).where = origEventsWhere;
    (db.events as unknown as { get: unknown }).get = origEventsGet;
    (db.events as unknown as { add: unknown }).add = origEventsAdd;
    (db.markets as any).get = origMarketsGet;
    (db.markets as any).bulkGet = origMarketsBulkGet;
    (db.markets as any).update = origMarketsUpdate;
  }
});

runTest('dryRun does not replay', async () => {
  const localMarkets = new Map([
    [MARKET_ID, fixtureMarket({ totalRevenue: 0 })],
  ]);

  const origMarketsGet = (db.markets as any).get.bind(
    db.markets
  );
  const origMarketsBulkGet = (
    db.markets as any
  ).bulkGet.bind(db.markets);
  const origEventsWhere = (
    db.events as any
  ).where.bind(db.events);
  const origEventsAdd = (db.events as any).add.bind(
    db.events
  );

  try {
    (db.markets as any).get = async (id: string) =>
      localMarkets.get(id);
    (db.markets as any).bulkGet = async (
      ids: string[]
    ) => ids.map(id => localMarkets.get(id));
    (db.events as any).where = () => ({
      equals: () => ({ and: () => ({ toArray: async () => [] }) }),
    });
    (db.events as unknown as { add: unknown }).add = async () => {
      throw new Error('must not be called in dryRun');
    };

    const { repairOwnerRevenueGaps } = await import(
      '../lib/sync/owner-revenue-gap-repair'
    );

    const result = await repairOwnerRevenueGaps({
      ownerId: OWNER_ID,
      marketIds: [MARKET_ID],
      dryRun: true,
      supabaseClient: makeSupabaseMock(
        makeCloudEvents(['evt-c1', 'evt-c2'])
      ),
    });

    assert.equal(result.repaired.length, 1);
    assert.equal(
      result.repaired[0].localRevenueAfter,
      0,
      'dryRun: localRevenueAfter should stay at 0'
    );
    assert.equal(
      result.repaired[0].replayedEvents,
      0,
      'dryRun: replayedEvents should be 0'
    );
    assert.equal(result.skipped.length, 0);
  } finally {
    (db.markets as any).get = origMarketsGet;
    (db.markets as any).bulkGet = origMarketsBulkGet;
    (db.events as any).where = origEventsWhere;
    (db.events as unknown as { add: unknown }).add = origEventsAdd;
  }
});

runTest('localRevenue === cloudRevenue skips already_in_sync', async () => {
  const localMarkets = new Map([
    [MARKET_ID, fixtureMarket({ totalRevenue: 69822 })],
  ]);

  const origMarketsGet = (db.markets as any).get.bind(
    db.markets
  );
  const origMarketsBulkGet = (
    db.markets as any
  ).bulkGet.bind(db.markets);
  const origEventsWhere = (
    db.events as any
  ).where.bind(db.events);

  try {
    (db.markets as any).get = async (id: string) =>
      localMarkets.get(id);
    (db.markets as any).bulkGet = async (
      ids: string[]
    ) => ids.map(id => localMarkets.get(id));
    (db.events as any).where = () => ({
      equals: () => ({ and: () => ({ toArray: async () => [] }) }),
    });

    const { repairOwnerRevenueGaps } = await import(
      '../lib/sync/owner-revenue-gap-repair'
    );

    const result = await repairOwnerRevenueGaps({
      ownerId: OWNER_ID,
      marketIds: [MARKET_ID],
      supabaseClient: makeSupabaseMock(makeCloudEvents(['evt-c1'])),
    });

    assert.equal(result.repaired.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].reason, 'already_in_sync');
  } finally {
    (db.markets as any).get = origMarketsGet;
    (db.markets as any).bulkGet = origMarketsBulkGet;
    (db.events as any).where = origEventsWhere;
  }
});

runTest(
  'localRevenue > cloudRevenue skips local_revenue_exceeds_cloud',
  async () => {
    const localMarkets = new Map([
      [MARKET_ID, fixtureMarket({ totalRevenue: 100000 })],
    ]);

    const origMarketsGet = (db.markets as any).get.bind(
      db.markets
    );
    const origMarketsBulkGet = (
      db.markets as any
    ).bulkGet.bind(db.markets);
    const origEventsWhere = (
      db.events as any
    ).where.bind(db.events);

    try {
      (db.markets as any).get = async (id: string) =>
        localMarkets.get(id);
      (db.markets as any).bulkGet = async (
        ids: string[]
      ) => ids.map(id => localMarkets.get(id));
      (db.events as any).where = () => ({
        equals: () => ({ and: () => ({ toArray: async () => [] }) }),
      });

      const { repairOwnerRevenueGaps } = await import(
        '../lib/sync/owner-revenue-gap-repair'
      );

      const result = await repairOwnerRevenueGaps({
        ownerId: OWNER_ID,
        marketIds: [MARKET_ID],
        supabaseClient: makeSupabaseMock([]),
      });

      assert.equal(result.repaired.length, 0);
      assert.equal(result.skipped.length, 1);
      assert.equal(
        result.skipped[0].reason,
        'local_revenue_exceeds_cloud'
      );
    } finally {
      (db.markets as any).get = origMarketsGet;
      (db.markets as any).bulkGet =
        origMarketsBulkGet;
      (db.events as any).where = origEventsWhere;
    }
  }
);

runTest(
  '0 < localRevenue < cloudRevenue skips partial_gap_not_supported',
  async () => {
    const localMarkets = new Map([
      [MARKET_ID, fixtureMarket({ totalRevenue: 10000 })],
    ]);

    const origMarketsGet = (db.markets as any).get.bind(
      db.markets
    );
    const origMarketsBulkGet = (
      db.markets as any
    ).bulkGet.bind(db.markets);
    const origEventsWhere = (
      db.events as any
  ).where.bind(db.events);

    try {
      (db.markets as any).get = async (id: string) =>
        localMarkets.get(id);
      (db.markets as any).bulkGet = async (
        ids: string[]
      ) => ids.map(id => localMarkets.get(id));
      (db.events as any).where = () => ({
        equals: () => ({ and: () => ({ toArray: async () => [] }) }),
      });

      const { repairOwnerRevenueGaps } = await import(
        '../lib/sync/owner-revenue-gap-repair'
      );

      const result = await repairOwnerRevenueGaps({
        ownerId: OWNER_ID,
        marketIds: [MARKET_ID],
        supabaseClient: makeSupabaseMock([]),
      });

      assert.equal(result.repaired.length, 0);
      assert.equal(result.skipped.length, 1);
      assert.equal(result.skipped[0].reason, 'partial_gap_not_supported');
    } finally {
      (db.markets as any).get = origMarketsGet;
      (db.markets as any).bulkGet =
        origMarketsBulkGet;
      (db.events as any).where = origEventsWhere;
    }
  }
);

runTest(
  'local deal_closed exists skips local_deal_events_exist',
  async () => {
    const localMarkets = new Map([
      [MARKET_ID, fixtureMarket({ totalRevenue: 0 })],
    ]);
    const localEvents = [
      { id: 'evt-local-1', type: 'deal_closed', market_id: MARKET_ID },
    ];

    const origMarketsGet = (db.markets as any).get.bind(
      db.markets
    );
    const origMarketsBulkGet = (
      db.markets as any
    ).bulkGet.bind(db.markets);
    const origEventsWhere = (
      db.events as any
    ).where.bind(db.events);

    try {
      (db.markets as any).get = async (id: string) =>
        localMarkets.get(id);
      (db.markets as any).bulkGet = async (
        ids: string[]
      ) => ids.map(id => localMarkets.get(id));
      (db.events as any).where = () => ({
        equals: () => ({
          and: () => ({ toArray: async () => localEvents }),
        }),
      });

      const { repairOwnerRevenueGaps } = await import(
        '../lib/sync/owner-revenue-gap-repair'
      );

      const result = await repairOwnerRevenueGaps({
        ownerId: OWNER_ID,
        marketIds: [MARKET_ID],
        supabaseClient: makeSupabaseMock(makeCloudEvents(['evt-c1'])),
      });

      assert.equal(result.repaired.length, 0);
      assert.equal(result.skipped.length, 1);
      assert.equal(
        result.skipped[0].reason,
        'local_deal_events_exist'
      );
    } finally {
      (db.markets as any).get = origMarketsGet;
      (db.markets as any).bulkGet =
        origMarketsBulkGet;
      (db.events as any).where = origEventsWhere;
    }
  }
);

runTest('local market not found reports local_market_not_found', async () => {
  const origMarketsGet = (db.markets as any).get.bind(
    db.markets
  );
  const origMarketsBulkGet = (
    db.markets as any
  ).bulkGet.bind(db.markets);

  try {
    (db.markets as any).get = async () =>
      undefined;
    (db.markets as any).bulkGet = async () => [];

    const { repairOwnerRevenueGaps } = await import(
      '../lib/sync/owner-revenue-gap-repair'
    );

    const result = await repairOwnerRevenueGaps({
      ownerId: OWNER_ID,
      marketIds: [MARKET_ID],
    });

    assert.equal(result.repaired.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].reason, 'local_market_not_found');
  } finally {
    (db.markets as any).get = origMarketsGet;
    (db.markets as any).bulkGet =
      origMarketsBulkGet;
  }
});

runTest('cloud revenue <= 0 skips', async () => {
  const localMarkets = new Map([
    [MARKET_ID, fixtureMarket({ totalRevenue: 0 })],
  ]);

  const origMarketsGet = (db.markets as any).get.bind(
    db.markets
  );
  const origMarketsBulkGet = (
    db.markets as any
  ).bulkGet.bind(db.markets);
  const origEventsWhere = (
    db.events as any
  ).where.bind(db.events);

  try {
    (db.markets as any).get = async (id: string) =>
      localMarkets.get(id);
    (db.markets as any).bulkGet = async (
      ids: string[]
    ) => ids.map(id => localMarkets.get(id));
    (db.events as any).where = () => ({
      equals: () => ({ and: () => ({ toArray: async () => [] }) }),
    });

    const { repairOwnerRevenueGaps } = await import(
      '../lib/sync/owner-revenue-gap-repair'
    );

    const result = await repairOwnerRevenueGaps({
      ownerId: OWNER_ID,
      marketIds: [MARKET_ID],
      supabaseClient: makeSupabaseMock([], {
        total_revenue: 0,
        total_deals: 0,
      }),
    });

    assert.equal(result.repaired.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].reason, 'cloud_revenue_not_positive');
  } finally {
    (db.markets as any).get = origMarketsGet;
    (db.markets as any).bulkGet =
      origMarketsBulkGet;
    (db.events as any).where = origEventsWhere;
  }
});

runTest('cloud deal events empty skips', async () => {
  const localMarkets = new Map([
    [MARKET_ID, fixtureMarket({ totalRevenue: 0 })],
  ]);

  const origMarketsGet = (db.markets as any).get.bind(
    db.markets
  );
  const origMarketsBulkGet = (
    db.markets as any
  ).bulkGet.bind(db.markets);
  const origEventsWhere = (
    db.events as any
  ).where.bind(db.events);

  try {
    (db.markets as any).get = async (id: string) =>
      localMarkets.get(id);
    (db.markets as any).bulkGet = async (
      ids: string[]
    ) => ids.map(id => localMarkets.get(id));
    (db.events as any).where = () => ({
      equals: () => ({ and: () => ({ toArray: async () => [] }) }),
    });

    const { repairOwnerRevenueGaps } = await import(
      '../lib/sync/owner-revenue-gap-repair'
    );

    const result = await repairOwnerRevenueGaps({
      ownerId: OWNER_ID,
      marketIds: [MARKET_ID],
      supabaseClient: makeSupabaseMock([], {
        total_revenue: 69822,
        total_deals: 0,
      }),
    });

    assert.equal(result.repaired.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0].reason, 'cloud_deals_not_positive');
  } finally {
    (db.markets as any).get = origMarketsGet;
    (db.markets as any).bulkGet =
      origMarketsBulkGet;
    (db.events as any).where = origEventsWhere;
  }
});

runTest('blank ownerId throws', async () => {
  for (const blank of ['', '   ', '\t', '\n']) {
    await assert.rejects(
      () =>
        import('../lib/sync/owner-revenue-gap-repair').then(
          ({ repairOwnerRevenueGaps }) =>
            repairOwnerRevenueGaps({ ownerId: blank })
        ),
      /non-blank string/,
      `blank ownerId ${JSON.stringify(blank)} should throw`
    );
  }
});

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  let passed = 0;
  let failed = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
      passed++;
    } catch (error) {
      console.error(`FAIL ${name}`);
      console.error(
        error instanceof Error ? error.message : String(error)
      );
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch(error => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
