import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { eventHandlers } from '../lib/db/events';
import type { DailyStats, Event, InteractionDeletedPayload, Market } from '../types/db';

const TS = Date.UTC(2026, 5, 11, 12, 0, 0);
const MARKET_ID = 'market-1';

function interactionDeletedEvent(
  payload: Partial<InteractionDeletedPayload> = {}
): Event<InteractionDeletedPayload> {
  return {
    id: 'evt-interaction-deleted',
    type: 'interaction_deleted',
    payload: {
      eventId: 'interaction-1',
      market_id: MARKET_ID,
      interactionType: 'touch',
      ...payload,
    },
    timestamp: TS,
    actor_id: 'user-1',
    market_id: MARKET_ID,
  };
}

function market(overrides: Partial<Market> = {}): Market {
  return {
    id: MARKET_ID,
    name: 'Market',
    location: 'Taipei',
    startDate: '2026-06-11',
    endDate: '2026-06-11',
    status: 'upcoming',
    registrationFee: 0,
    boothCost: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalDeals: 0,
    totalInteractions: 1,
    ...overrides,
  } as Market;
}

function dailyStat(overrides: Partial<DailyStats> = {}): DailyStats {
  return {
    id: 1,
    date: '2026-06-11',
    marketId: MARKET_ID,
    touchCount: 1,
    inquiryCount: 0,
    dealCount: 0,
    revenue: 0,
    cost: 0,
    profit: 0,
    productsSold: [],
    updatedAt: TS - 1,
    ...overrides,
  };
}

async function runWithMocks(options: {
  event?: Event<InteractionDeletedPayload>;
  market?: Market | undefined;
  dailyStat?: DailyStats | undefined;
}): Promise<{
  marketUpdate: Partial<Market> | undefined;
  dailyStatUpdate: Partial<DailyStats> | undefined;
  dailyStatLookup: [string, string] | undefined;
}> {
  const handler = eventHandlers.interaction_deleted;
  assert.ok(handler, 'interaction_deleted handler should be registered');

  const originalMarketGet = db.markets.get.bind(db.markets);
  const originalMarketUpdate = db.markets.update.bind(db.markets);
  const originalDailyStatsWhere = db.dailyStats.where.bind(db.dailyStats);
  const originalDailyStatsUpdate = db.dailyStats.update.bind(db.dailyStats);

  let marketUpdate: Partial<Market> | undefined;
  let dailyStatUpdate: Partial<DailyStats> | undefined;
  let dailyStatLookup: [string, string] | undefined;

  try {
    db.markets.get = ((id: string) => {
      assert.equal(id, options.event?.payload.market_id ?? MARKET_ID);
      return Promise.resolve(options.market);
    }) as typeof db.markets.get;

    db.markets.update = ((_id: string, changes: Partial<Market>) => {
      marketUpdate = changes;
      return Promise.resolve(1);
    }) as typeof db.markets.update;

    db.dailyStats.where = (() => ({
      equals: (lookup: [string, string]) => {
        dailyStatLookup = lookup;
        return {
          first: () => Promise.resolve(options.dailyStat),
        };
      },
    })) as unknown as typeof db.dailyStats.where;

    db.dailyStats.update = ((_id: number, changes: Partial<DailyStats>) => {
      dailyStatUpdate = changes;
      return Promise.resolve(1);
    }) as unknown as typeof db.dailyStats.update;

    await handler(options.event ?? interactionDeletedEvent(), db);

    return { marketUpdate, dailyStatUpdate, dailyStatLookup };
  } finally {
    db.markets.get = originalMarketGet;
    db.markets.update = originalMarketUpdate;
    db.dailyStats.where = originalDailyStatsWhere;
    db.dailyStats.update = originalDailyStatsUpdate;
  }
}

async function main(): Promise<void> {
  {
    const result = await runWithMocks({
      market: market({ totalInteractions: 0 }),
      dailyStat: dailyStat({ touchCount: 0 }),
    });

    assert.equal(result.marketUpdate?.totalInteractions, 0);
    assert.equal(result.marketUpdate?.updatedAt, TS);
    assert.equal(result.dailyStatUpdate?.touchCount, 0);
    assert.equal(result.dailyStatUpdate?.updatedAt, TS);
    assert.deepEqual(result.dailyStatLookup, ['2026-06-11', MARKET_ID]);
  }

  {
    const result = await runWithMocks({
      event: interactionDeletedEvent({ interactionType: 'inquiry' }),
      market: market({ totalInteractions: 3 }),
      dailyStat: dailyStat({ inquiryCount: 2, touchCount: 0 }),
    });

    assert.equal(result.marketUpdate?.totalInteractions, 2);
    assert.equal(result.dailyStatUpdate?.inquiryCount, 1);
    assert.equal(result.dailyStatUpdate?.touchCount, undefined);
  }

  {
    const result = await runWithMocks({
      event: interactionDeletedEvent({ interactionType: 'photo' }),
      market: market({ totalInteractions: 4 }),
      dailyStat: dailyStat({
        touchCount: 0,
        extraInteractions: { photo: 2, chat: 4 },
      }),
    });

    assert.equal(result.marketUpdate?.totalInteractions, 3);
    assert.deepEqual(result.dailyStatUpdate?.extraInteractions, { photo: 1, chat: 4 });
  }

  {
    const result = await runWithMocks({
      event: interactionDeletedEvent({ interactionType: 'photo' }),
      market: market({ totalInteractions: 4 }),
      dailyStat: dailyStat({
        touchCount: 0,
        extraInteractions: { photo: 1, chat: 4 },
      }),
    });

    assert.deepEqual(result.dailyStatUpdate?.extraInteractions, { chat: 4 });
  }

  {
    const result = await runWithMocks({
      market: market({ totalInteractions: 2 }),
      dailyStat: undefined,
    });

    assert.equal(result.marketUpdate?.totalInteractions, 1);
    assert.equal(result.dailyStatUpdate, undefined);
  }

  console.log('PASS interaction_deleted handler characterization');
}

main().catch((error) => {
  console.error('FAIL interaction_deleted handler characterization');
  throw error;
});
