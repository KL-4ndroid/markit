import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { eventHandlers } from '../lib/db/events';
import type { DailyStats, DealClosedPayload, DealDeletedPayload, Event, Market } from '../types/db';

const TS = 1_700_000_000_000;

function productDeletedEvent(productId: string): Event<{ productId: string }> {
  return {
    id: `evt-delete-${productId}`,
    type: 'product_deleted',
    payload: { productId },
    timestamp: TS,
    actor_id: 'user-1',
    market_id: 'market-1',
  };
}

function manualDealEvent(payload: Partial<DealClosedPayload>): Event<DealClosedPayload> {
  return {
    id: 'evt-manual-deal',
    type: 'deal_closed',
    payload: {
      market_id: 'market-1',
      dealDate: '2026-06-11',
      isBackfill: true,
      isManualEntry: true,
      items: [],
      totalAmount: 1200,
      paymentMethod: 'cash',
      ...payload,
    } as DealClosedPayload,
    timestamp: TS,
    actor_id: 'user-1',
    market_id: 'market-1',
  };
}

function dealDeletedEvent(payload: Partial<DealDeletedPayload> & { marketId?: string }): Event<DealDeletedPayload> {
  return {
    id: 'evt-delete-deal',
    type: 'deal_deleted',
    payload: {
      eventId: 'evt-manual-deal',
      market_id: '',
      dealDate: '2026-06-11',
      totalAmount: 1200,
      totalCost: 0,
      dealCount: 1,
      productsSold: [],
      ...payload,
    } as DealDeletedPayload,
    timestamp: TS,
    actor_id: 'user-1',
    market_id: 'market-root',
  };
}

async function main(): Promise<void> {
  const handler = eventHandlers.product_deleted;
  assert.ok(handler, 'product_deleted handler should be registered');

  const originalUpdate = db.products.update.bind(db.products);
  const originalWarn = console.warn;
  const warnings: unknown[][] = [];

  try {
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };

    db.products.update = ((_id: string, _changes: Record<string, unknown>) =>
      Promise.resolve(0)) as typeof db.products.update;

    await handler(productDeletedEvent('missing-product'), db);

    assert.equal(warnings.length, 1, 'missing product tombstone should warn once');
    assert.match(
      String(warnings[0][0]),
      /Product not found for product_deleted/,
      'warning should describe the idempotent tombstone',
    );

    console.log('PASS product_deleted missing product is idempotent');

    let updatedId: unknown;
    let updatedChanges: Record<string, unknown> | undefined;

    db.products.update = ((id: string, changes: Record<string, unknown>) => {
      updatedId = id;
      updatedChanges = changes;
      return Promise.resolve(1);
    }) as typeof db.products.update;

    await handler(productDeletedEvent('product-1'), db);

    assert.equal(updatedId, 'product-1', 'existing product should be updated');
    assert.deepEqual(
      updatedChanges,
      { isActive: false, updatedAt: TS },
      'product_deleted should mark an existing product inactive',
    );

    console.log('PASS product_deleted existing product marks inactive');
  } finally {
    db.products.update = originalUpdate;
    console.warn = originalWarn;
  }

  const dealHandler = eventHandlers.deal_closed;
  assert.ok(dealHandler, 'deal_closed handler should be registered');

  const originalMarketGet = db.markets.get.bind(db.markets);
  const originalMarketUpdate = db.markets.update.bind(db.markets);
  const originalDailyStatsWhere = db.dailyStats.where.bind(db.dailyStats);
  const originalDailyStatsAdd = db.dailyStats.add.bind(db.dailyStats);
  const originalDailyStatsUpdate = db.dailyStats.update.bind(db.dailyStats);

  try {
    let marketUpdate: Partial<Market> | undefined;
    let dailyStatAdd: Record<string, unknown> | undefined;

    db.markets.get = ((id: string) =>
      Promise.resolve({
        id,
        name: 'Market',
        startDate: '2026-06-11',
        endDate: '2026-06-11',
        totalRevenue: 0,
        totalProfit: 0,
        totalDeals: 0,
        totalInteractions: 0,
      } as Market)) as typeof db.markets.get;

    db.markets.update = ((_id: string, changes: Partial<Market>) => {
      marketUpdate = changes;
      return Promise.resolve(1);
    }) as typeof db.markets.update;

    db.dailyStats.where = (() => ({
      equals: () => ({
        first: () => Promise.resolve(undefined),
      }),
    })) as unknown as typeof db.dailyStats.where;

    db.dailyStats.add = ((stat: Record<string, unknown>) => {
      dailyStatAdd = stat;
      return Promise.resolve(1);
    }) as unknown as typeof db.dailyStats.add;

    await dealHandler(manualDealEvent({
      dealDate: undefined,
      deal_date: '2026-06-12',
      isManualEntry: false,
      is_manual_entry: true,
      totalAmount: undefined,
      total_amount: 1200,
      manual_revenue: 1200,
      manual_cost: 100,
      manual_deal_count: 3,
    } as Partial<DealClosedPayload>), db);

    assert.equal(marketUpdate?.totalRevenue, 1200);
    assert.equal(marketUpdate?.totalProfit, 1100);
    assert.equal(marketUpdate?.totalDeals, 3);
    assert.equal(dailyStatAdd?.date, '2026-06-12');
    assert.equal(dailyStatAdd?.revenue, 1200);
    assert.equal(dailyStatAdd?.cost, 100);
    assert.equal(dailyStatAdd?.profit, 1100);
    assert.equal(dailyStatAdd?.dealCount, 3);

    console.log('PASS deal_closed manual entry accepts snake_case projection');
  } finally {
    db.markets.get = originalMarketGet;
    db.markets.update = originalMarketUpdate;
    db.dailyStats.where = originalDailyStatsWhere;
    db.dailyStats.add = originalDailyStatsAdd;
  }

  const dealDeletedHandler = eventHandlers.deal_deleted;
  assert.ok(dealDeletedHandler, 'deal_deleted handler should be registered');

  try {
    let marketUpdate: Partial<Market> | undefined;
    let dailyStatUpdate: Partial<DailyStats> | undefined;

    db.markets.get = ((id: string) =>
      Promise.resolve({
        id,
        name: 'Market',
        startDate: '2026-06-11',
        endDate: '2026-06-11',
        totalRevenue: 1200,
        totalProfit: 1200,
        totalDeals: 1,
        totalInteractions: 0,
      } as Market)) as typeof db.markets.get;

    db.markets.update = ((_id: string, changes: Partial<Market>) => {
      marketUpdate = changes;
      return Promise.resolve(1);
    }) as typeof db.markets.update;

    db.dailyStats.where = (() => ({
      equals: () => ({
        first: () => Promise.resolve({
          id: 1,
          date: '2026-06-11',
          marketId: 'market-root',
          touchCount: 0,
          inquiryCount: 0,
          dealCount: 2,
          revenue: 1500,
          cost: 0,
          profit: 1500,
          productsSold: [],
          updatedAt: TS,
        } as DailyStats),
      }),
    })) as unknown as typeof db.dailyStats.where;

    db.dailyStats.update = ((_id: number, changes: Partial<DailyStats>) => {
      dailyStatUpdate = changes;
      return Promise.resolve(1);
    }) as unknown as typeof db.dailyStats.update;

    await dealDeletedHandler(dealDeletedEvent({ marketId: 'market-root' }), db);

    assert.equal(marketUpdate?.totalRevenue, 0);
    assert.equal(marketUpdate?.totalDeals, 0);
    assert.equal(dailyStatUpdate?.revenue, 300);
    assert.equal(dailyStatUpdate?.dealCount, 1);

    console.log('PASS deal_deleted handler accepts camelCase marketId tombstones');

    marketUpdate = undefined;
    dailyStatUpdate = undefined;

    await dealDeletedHandler(dealDeletedEvent({
      marketId: 'market-root',
      totalCost: undefined as unknown as number,
    }), db);

    const sanitizedMarketUpdate = marketUpdate as Partial<Market> | undefined;
    const sanitizedDailyStatUpdate = dailyStatUpdate as Partial<DailyStats> | undefined;

    assert.equal(sanitizedMarketUpdate?.totalRevenue, 0);
    assert.equal(sanitizedMarketUpdate?.totalProfit, 0);
    assert.equal(sanitizedDailyStatUpdate?.cost, 0);
    assert.equal(sanitizedDailyStatUpdate?.profit, 300);

    console.log('PASS deal_deleted handler accepts staff-sanitized missing totalCost');
  } finally {
    db.markets.get = originalMarketGet;
    db.markets.update = originalMarketUpdate;
    db.dailyStats.where = originalDailyStatsWhere;
    db.dailyStats.update = originalDailyStatsUpdate;
  }
}

main().catch((error) => {
  console.error('FAIL event handlers');
  throw error;
});
