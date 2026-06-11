import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { eventHandlers } from '../lib/db/events';
import type { DailyStats, DealClosedPayload, DealDeletedPayload, Event, Market, Product } from '../types/db';

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

  // =========================================================
  // Regression tests: deal_closed product mode (NOT manual entry)
  // These tests lock down existing handler behavior for product-mode deals.
  // =========================================================

  // Test 1: camelCase item with all required fields
  {
    const originalProductGet = db.products.get.bind(db.products);
    const originalProductUpdate = db.products.update.bind(db.products);
    let marketUpdate: Partial<Market> | undefined;
    let dailyStatAdd: Record<string, unknown> | undefined;
    let productUpdateId: unknown;
    let productUpdateChanges: Record<string, unknown> | undefined;

    try {
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

      db.products.get = ((id: string) =>
        Promise.resolve({
          id,
          name: '手作耳環',
          category: 'accessory' as const,
          price: 320,
          cost: 80,
          stock: 10,
          unlimitedStock: false,
          isActive: true,
          totalSold: 0,
          createdAt: TS,
          updatedAt: TS,
        } as Product)) as typeof db.products.get;

      db.products.update = ((id: string, changes: Record<string, unknown>) => {
        productUpdateId = id;
        productUpdateChanges = changes;
        return Promise.resolve(1);
      }) as typeof db.products.update;

      const productEvent = {
        id: 'evt-product-deal-1',
        type: 'deal_closed' as const,
        payload: {
          market_id: 'market-1',
          dealDate: '2026-06-11',
          items: [
            {
              productId: 'product-1',
              quantity: 2,
              price: 300,
            },
          ],
          totalAmount: 600,
          paymentMethod: 'cash' as const,
        } as DealClosedPayload,
        timestamp: TS,
        actor_id: 'user-1',
        market_id: 'market-1',
      };

      await dealHandler(productEvent as Event<DealClosedPayload>, db);

      assert.equal(marketUpdate?.totalRevenue, 600, 'market totalRevenue should accumulate');
      assert.equal(marketUpdate?.totalProfit, 440, 'market totalProfit should be revenue - cost (600 - 160)');
      assert.equal(marketUpdate?.totalDeals, 1, 'market totalDeals should increment by 1');
      assert.equal(dailyStatAdd?.date, '2026-06-11', 'dailyStats date should match dealDate');
      assert.equal(dailyStatAdd?.revenue, 600, 'dailyStats revenue should accumulate');
      assert.equal(dailyStatAdd?.dealCount, 1, 'dailyStats dealCount should be 1');
      assert.equal(productUpdateId, 'product-1', 'product update should target correct product');
      assert.equal(productUpdateChanges?.totalSold, 2, 'product totalSold should increase by quantity');
      assert.equal(productUpdateChanges?.stock, 8, 'product stock should decrease by quantity');

      const productsSold = dailyStatAdd?.productsSold as DailyStats['productsSold'] | undefined;
      assert.ok(Array.isArray(productsSold), 'productsSold should be an array');
      assert.equal(productsSold.length, 1, 'productsSold should have one entry');
      assert.equal(productsSold[0]?.productId, 'product-1', 'productsSold productId should match');
      assert.equal(productsSold[0]?.quantity, 2, 'productsSold quantity should match');
      assert.equal(productsSold[0]?.revenue, 600, 'productsSold revenue should be price * quantity');

      console.log('PASS deal_closed product mode camelCase item projects correctly');
    } finally {
      db.markets.get = originalMarketGet;
      db.markets.update = originalMarketUpdate;
      db.dailyStats.where = originalDailyStatsWhere;
      db.dailyStats.add = originalDailyStatsAdd;
      db.products.get = originalProductGet;
      db.products.update = originalProductUpdate;
    }
  }

  // Test 2: product snapshot fallback when item.price is missing
  {
    const originalProductGet = db.products.get.bind(db.products);
    const originalProductUpdate = db.products.update.bind(db.products);
    let marketUpdate: Partial<Market> | undefined;

    try {
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
          first: () => Promise.resolve({
            id: 1,
            date: '2026-06-11',
            marketId: 'market-1',
            touchCount: 0,
            inquiryCount: 0,
            dealCount: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            productsSold: [],
            updatedAt: TS,
          } as DailyStats),
        }),
      })) as unknown as typeof db.dailyStats.where;

      db.dailyStats.update = (() => {
        return ((_id: number, _changes: Partial<DailyStats>) =>
          Promise.resolve(1)) as unknown as typeof db.dailyStats.update;
      })() as unknown as typeof db.dailyStats.update;

      db.products.get = ((id: string) =>
        Promise.resolve({
          id,
          name: '貼紙',
          category: 'stationery' as const,
          price: 180,
          cost: 40,
          stock: 5,
          unlimitedStock: false,
          isActive: true,
          totalSold: 0,
          createdAt: TS,
          updatedAt: TS,
        } as Product)) as typeof db.products.get;

      db.products.update = ((_id: string, _changes: Record<string, unknown>) =>
        Promise.resolve(1)) as typeof db.products.update;

      const productEvent = {
        id: 'evt-product-deal-2',
        type: 'deal_closed' as const,
        payload: {
          market_id: 'market-1',
          dealDate: '2026-06-11',
          items: [{ productId: 'product-2', quantity: 1 }],
          totalAmount: 180,
          paymentMethod: 'cash' as const,
        } as DealClosedPayload,
        timestamp: TS,
        actor_id: 'user-1',
        market_id: 'market-1',
      };

      await dealHandler(productEvent as Event<DealClosedPayload>, db);

      // Handler trusts payload.totalAmount; the items loop computes cost from product.cost.
      assert.equal(marketUpdate?.totalRevenue, 180, 'revenue comes from payload.totalAmount');
      // Cost is computed as product.cost * quantity in the loop.
      assert.equal(marketUpdate?.totalProfit, 140, 'profit = totalAmount(180) - cost(40)');

      console.log('PASS deal_closed product mode uses payload.totalAmount; cost from product.cost');
    } finally {
      db.markets.get = originalMarketGet;
      db.markets.update = originalMarketUpdate;
      db.dailyStats.where = originalDailyStatsWhere;
      db.dailyStats.update = originalDailyStatsUpdate;
      db.products.get = originalProductGet;
      db.products.update = originalProductUpdate;
    }
  }

  // Test 3: isBackfill does NOT deduct stock
  {
    const originalProductGet = db.products.get.bind(db.products);
    const originalProductUpdate = db.products.update.bind(db.products);
    let marketUpdate: Partial<Market> | undefined;
    let productUpdateId: unknown;
    let productUpdateChanges: Record<string, unknown> | undefined;

    try {
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

      db.dailyStats.add = ((_stat: Record<string, unknown>) =>
        Promise.resolve(1)) as unknown as typeof db.dailyStats.add;

      db.products.get = ((id: string) =>
        Promise.resolve({
          id,
          name: '測試商品',
          category: 'handmade' as const,
          price: 100,
          cost: 20,
          stock: 5,
          unlimitedStock: false,
          isActive: true,
          totalSold: 0,
          createdAt: TS,
          updatedAt: TS,
        } as Product)) as typeof db.products.get;

      db.products.update = ((id: string, changes: Record<string, unknown>) => {
        productUpdateId = id;
        productUpdateChanges = changes;
        return Promise.resolve(1);
      }) as typeof db.products.update;

      const backfillEvent = {
        id: 'evt-backfill-deal',
        type: 'deal_closed' as const,
        payload: {
          market_id: 'market-1',
          dealDate: '2026-06-11',
          isBackfill: true,
          items: [
            {
              productId: 'product-backfill',
              quantity: 3,
              price: 100,
            },
          ],
          totalAmount: 300,
          paymentMethod: 'cash' as const,
        } as DealClosedPayload,
        timestamp: TS,
        actor_id: 'user-1',
        market_id: 'market-1',
      };

      await dealHandler(backfillEvent as Event<DealClosedPayload>, db);

      assert.equal(marketUpdate?.totalRevenue, 300, 'backfill should still accumulate market revenue');
      assert.equal(marketUpdate?.totalDeals, 1, 'backfill should still increment totalDeals');
      assert.equal(productUpdateId, 'product-backfill', 'product update should still be called');
      assert.equal(productUpdateChanges?.totalSold, 3, 'backfill should still increase totalSold');
      assert.equal(productUpdateChanges?.stock, undefined, 'backfill should NOT deduct stock');
      assert.ok(!('stock' in (productUpdateChanges ?? {})), 'stock key should not be in updates for backfill');

      console.log('PASS deal_closed isBackfill does NOT deduct stock');
    } finally {
      db.markets.get = originalMarketGet;
      db.markets.update = originalMarketUpdate;
      db.dailyStats.where = originalDailyStatsWhere;
      db.dailyStats.add = originalDailyStatsAdd;
      db.products.get = originalProductGet;
      db.products.update = originalProductUpdate;
    }
  }

  // Test 4: normal deal throws when stock is insufficient
  {
    const originalProductGet = db.products.get.bind(db.products);
    let insufficientStockError: unknown;

    try {
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

      db.dailyStats.where = (() => ({
        equals: () => ({
          first: () => Promise.resolve(undefined),
        }),
      })) as unknown as typeof db.dailyStats.where;

      db.dailyStats.add = ((_stat: Record<string, unknown>) =>
        Promise.resolve(1)) as unknown as typeof db.dailyStats.add;

      // Product with only 2 in stock
      db.products.get = ((id: string) =>
        Promise.resolve({
          id,
          name: '限量商品',
          category: 'other' as const,
          price: 500,
          cost: 100,
          stock: 2,
          unlimitedStock: false,
          isActive: true,
          totalSold: 0,
          createdAt: TS,
          updatedAt: TS,
        } as Product)) as typeof db.products.get;

      const insufficientEvent = {
        id: 'evt-insufficient-stock',
        type: 'deal_closed' as const,
        payload: {
          market_id: 'market-1',
          dealDate: '2026-06-11',
          items: [
            {
              productId: 'product-limited',
              quantity: 5,
              price: 500,
            },
          ],
          totalAmount: 2500,
          paymentMethod: 'cash' as const,
        } as DealClosedPayload,
        timestamp: TS,
        actor_id: 'user-1',
        market_id: 'market-1',
      };

      try {
        await dealHandler(insufficientEvent as Event<DealClosedPayload>, db);
        assert.fail('handler should throw when stock is insufficient');
      } catch (err) {
        insufficientStockError = err;
        assert.match(
          String((err as Error).message),
          /庫存不足/,
          'error message should mention insufficient stock',
        );
      }

      assert.ok(insufficientStockError instanceof Error, 'should throw an Error');
      console.log('PASS deal_closed normal deal throws when stock insufficient');
    } finally {
      db.markets.get = originalMarketGet;
      db.dailyStats.where = originalDailyStatsWhere;
      db.dailyStats.add = originalDailyStatsAdd;
      db.products.get = originalProductGet;
    }
  }

  // Test 5: productsSold shape is maintained
  {
    const originalProductGet = db.products.get.bind(db.products);
    const originalProductUpdate = db.products.update.bind(db.products);

    try {
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

      db.markets.update = ((_id: string, _changes: Partial<Market>) =>
        Promise.resolve(1)) as typeof db.markets.update;

      db.dailyStats.where = (() => ({
        equals: () => ({
          first: () => Promise.resolve(undefined),
        }),
      })) as unknown as typeof db.dailyStats.where;

      db.dailyStats.add = ((stat: Record<string, unknown>) =>
        Promise.resolve(1)) as unknown as typeof db.dailyStats.add;

      db.products.get = ((id: string) =>
        Promise.resolve({
          id,
          name: '商品',
          category: 'other' as const,
          price: 150,
          cost: 30,
          stock: 99,
          unlimitedStock: false,
          isActive: true,
          totalSold: 0,
          createdAt: TS,
          updatedAt: TS,
        } as Product)) as typeof db.products.get;

      db.products.update = ((_id: string, _changes: Record<string, unknown>) =>
        Promise.resolve(1)) as typeof db.products.update;

      const multiItemEvent = {
        id: 'evt-multi-item',
        type: 'deal_closed' as const,
        payload: {
          market_id: 'market-1',
          dealDate: '2026-06-13',
          items: [
            { productId: 'p-a', quantity: 1, price: 150 },
            { productId: 'p-b', quantity: 3, price: 120 },
          ],
          totalAmount: 510,
          paymentMethod: 'card' as const,
        } as DealClosedPayload,
        timestamp: TS,
        actor_id: 'user-1',
        market_id: 'market-1',
      };

      let addedDailyStat: Record<string, unknown> | undefined;
      db.dailyStats.add = ((stat: Record<string, unknown>) => {
        addedDailyStat = stat;
        return Promise.resolve(1);
      }) as unknown as typeof db.dailyStats.add;

      await dealHandler(multiItemEvent as Event<DealClosedPayload>, db);

      const productsSold = addedDailyStat?.productsSold as DailyStats['productsSold'] | undefined;
      assert.ok(Array.isArray(productsSold), 'productsSold should be an array');
      assert.equal(productsSold.length, 2, 'productsSold should have 2 entries for 2 items');

      for (const entry of productsSold) {
        assert.ok('productId' in entry, 'productsSold entry must have productId');
        assert.ok('quantity' in entry, 'productsSold entry must have quantity');
        assert.ok('revenue' in entry, 'productsSold entry must have revenue');
        assert.equal(typeof entry.productId, 'string', 'productId should be string');
        assert.equal(typeof entry.quantity, 'number', 'quantity should be number');
        assert.equal(typeof entry.revenue, 'number', 'revenue should be number');
      }

      const entryA = productsSold.find((e: { productId: string }) => e.productId === 'p-a');
      assert.equal(entryA?.quantity, 1, 'p-a quantity should be 1');
      assert.equal(entryA?.revenue, 150, 'p-a revenue should be 150');

      const entryB = productsSold.find((e: { productId: string }) => e.productId === 'p-b');
      assert.equal(entryB?.quantity, 3, 'p-b quantity should be 3');
      assert.equal(entryB?.revenue, 360, 'p-b revenue should be 120 * 3');

      console.log('PASS deal_closed productsSold shape is maintained correctly');
    } finally {
      db.markets.get = originalMarketGet;
      db.markets.update = originalMarketUpdate;
      db.dailyStats.where = originalDailyStatsWhere;
      db.dailyStats.add = originalDailyStatsAdd;
      db.products.get = originalProductGet;
      db.products.update = originalProductUpdate;
    }
  }

  // =========================================================
  // Handler regression tests: edge cases (C2.5)
  // These lock down existing handler behavior at the handler level.
  // =========================================================

  // H1: item.price = 0 falls back to product.price in handler
  // handler: item.price || product.price → 0 is falsy → use product.price
  {
    const originalProductGet = db.products.get.bind(db.products);
    const originalProductUpdate = db.products.update.bind(db.products);

    try {
      db.markets.get = ((id: string) =>
        Promise.resolve({
          id, name: 'Market',
          startDate: '2026-06-14', endDate: '2026-06-14',
          totalRevenue: 0, totalProfit: 0, totalDeals: 0, totalInteractions: 0,
        } as Market)) as typeof db.markets.get;

      db.markets.update = ((_id: string, changes: Partial<Market>) =>
        Promise.resolve(1)) as typeof db.markets.update;

      db.dailyStats.where = (() => ({
        equals: () => ({ first: () => Promise.resolve(undefined) }),
      })) as unknown as typeof db.dailyStats.where;

      db.dailyStats.add = ((stat: Record<string, unknown>) =>
        Promise.resolve(1)) as unknown as typeof db.dailyStats.add;

      db.products.get = ((id: string) =>
        Promise.resolve({
          id, name: '耳環', category: 'accessory' as const,
          price: 200, cost: 50,
          stock: 99, unlimitedStock: false,
          isActive: true, totalSold: 0,
          createdAt: TS, updatedAt: TS,
        } as Product)) as typeof db.products.get;

      db.products.update = ((_id: string, _changes: Record<string, unknown>) =>
        Promise.resolve(1)) as typeof db.products.update;

      const zeroPriceEvent = {
        id: 'evt-zero-price',
        type: 'deal_closed' as const,
        payload: {
          market_id: 'market-1',
          dealDate: '2026-06-14',
          items: [{ productId: 'product-zero', quantity: 2, price: 0 }], // price = 0
          totalAmount: 400,
          paymentMethod: 'cash' as const,
        } as DealClosedPayload,
        timestamp: TS,
        actor_id: 'user-1',
        market_id: 'market-1',
      };

      let addedDailyStat: Record<string, unknown> | undefined;
      let productUpdateId: unknown;
      let productUpdateChanges: Record<string, unknown> | undefined;

      db.dailyStats.add = ((stat: Record<string, unknown>) => {
        addedDailyStat = stat;
        return Promise.resolve(1);
      }) as unknown as typeof db.dailyStats.add;

      db.products.update = ((id: string, changes: Record<string, unknown>) => {
        productUpdateId = id;
        productUpdateChanges = changes;
        return Promise.resolve(1);
      }) as typeof db.products.update;

      await dealHandler(zeroPriceEvent as Event<DealClosedPayload>, db);

      const productsSold = addedDailyStat?.productsSold as DailyStats['productsSold'] | undefined;
      assert.ok(productsSold, 'productsSold should exist');
      assert.equal(productsSold[0]?.productId, 'product-zero');
      assert.equal(productsSold[0]?.quantity, 2);
      assert.equal(productsSold[0]?.revenue, 400,
        'handler falls back: 0 || 200 = 200, revenue = 200 * 2 = 400');
      assert.equal(productUpdateChanges?.totalSold, 2,
        'product.totalSold should be incremented');
      assert.equal(addedDailyStat?.dealCount, 1);

      console.log('PASS handler edge: item.price=0 falls back to product.price');
    } finally {
      db.markets.get = originalMarketGet;
      db.markets.update = originalMarketUpdate;
      db.dailyStats.where = originalDailyStatsWhere;
      db.dailyStats.add = originalDailyStatsAdd;
      db.products.get = originalProductGet;
      db.products.update = originalProductUpdate;
    }
  }

  // H2: product.cost = 0 → handler skips cost accumulation
  // handler: if (product.cost) → 0 is falsy → skip → totalCost stays 0
  {
    const originalProductGet = db.products.get.bind(db.products);

    try {
      db.markets.get = ((id: string) =>
        Promise.resolve({
          id, name: 'Market',
          startDate: '2026-06-15', endDate: '2026-06-15',
          totalRevenue: 0, totalProfit: 0, totalDeals: 0, totalInteractions: 0,
        } as Market)) as typeof db.markets.get;

      db.markets.update = ((_id: string, changes: Partial<Market>) =>
        Promise.resolve(1)) as typeof db.markets.update;

      db.dailyStats.where = (() => ({
        equals: () => ({ first: () => Promise.resolve(undefined) }),
      })) as unknown as typeof db.dailyStats.where;

      db.dailyStats.add = ((stat: Record<string, unknown>) =>
        Promise.resolve(1)) as unknown as typeof db.dailyStats.add;

      db.products.get = ((id: string) =>
        Promise.resolve({
          id, name: '免費贈品', category: 'other' as const,
          price: 150, cost: 0, // cost = 0
          stock: 99, unlimitedStock: false,
          isActive: true, totalSold: 0,
          createdAt: TS, updatedAt: TS,
        } as Product)) as typeof db.products.get;

      db.products.update = ((_id: string, _changes: Record<string, unknown>) =>
        Promise.resolve(1)) as typeof db.products.update;

      const zeroCostEvent = {
        id: 'evt-zero-cost',
        type: 'deal_closed' as const,
        payload: {
          market_id: 'market-1',
          dealDate: '2026-06-15',
          items: [{ productId: 'product-zero-cost', quantity: 3, price: 150 }],
          totalAmount: 450,
          paymentMethod: 'cash' as const,
        } as DealClosedPayload,
        timestamp: TS,
        actor_id: 'user-1',
        market_id: 'market-1',
      };

      let marketUpdate: Partial<Market> | undefined;
      db.markets.update = ((_id: string, changes: Partial<Market>) => {
        marketUpdate = changes;
        return Promise.resolve(1);
      }) as typeof db.markets.update;

      await dealHandler(zeroCostEvent as Event<DealClosedPayload>, db);

      assert.equal(marketUpdate?.totalRevenue, 450);
      assert.equal(marketUpdate?.totalProfit, 450,
        'profit = totalAmount(450) - totalCost(0) = 450');
      assert.equal(marketUpdate?.totalDeals, 1);

      console.log('PASS handler edge: product.cost=0 is skipped in totalCost accumulation');
    } finally {
      db.markets.get = originalMarketGet;
      db.markets.update = originalMarketUpdate;
      db.dailyStats.where = originalDailyStatsWhere;
      db.dailyStats.add = originalDailyStatsAdd;
      db.products.get = originalProductGet;
    }
  }

  // H3: multiple items, one missing product → only existing product is processed
  {
    const originalProductGet = db.products.get.bind(db.products);
    const originalProductUpdate = db.products.update.bind(db.products);

    try {
      db.markets.get = ((id: string) =>
        Promise.resolve({
          id, name: 'Market',
          startDate: '2026-06-16', endDate: '2026-06-16',
          totalRevenue: 0, totalProfit: 0, totalDeals: 0, totalInteractions: 0,
        } as Market)) as typeof db.markets.get;

      db.markets.update = ((_id: string, changes: Partial<Market>) =>
        Promise.resolve(1)) as typeof db.markets.update;

      db.dailyStats.where = (() => ({
        equals: () => ({ first: () => Promise.resolve(undefined) }),
      })) as unknown as typeof db.dailyStats.where;

      db.dailyStats.add = ((stat: Record<string, unknown>) =>
        Promise.resolve(1)) as unknown as typeof db.dailyStats.add;

      // Only product-1 exists; nonexistent-product does not
      db.products.get = ((id: string) => {
        if (id === 'product-1') {
          return Promise.resolve({
            id, name: '耳環', category: 'accessory' as const,
            price: 200, cost: 50,
            stock: 99, unlimitedStock: false,
            isActive: true, totalSold: 0,
            createdAt: TS, updatedAt: TS,
          } as Product);
        }
        return Promise.resolve(undefined); // nonexistent-product → undefined
      }) as typeof db.products.get;

      db.products.update = ((id: string, changes: Record<string, unknown>) =>
        Promise.resolve(1)) as typeof db.products.update;

      const mixedItemsEvent = {
        id: 'evt-mixed-items',
        type: 'deal_closed' as const,
        payload: {
          market_id: 'market-1',
          dealDate: '2026-06-16',
          items: [
            { productId: 'product-1', quantity: 2, price: 200 },        // exists
            { productId: 'nonexistent-product', quantity: 5, price: 100 }, // does not exist
          ],
          totalAmount: 400,
          paymentMethod: 'cash' as const,
        } as DealClosedPayload,
        timestamp: TS,
        actor_id: 'user-1',
        market_id: 'market-1',
      };

      let addedDailyStat: Record<string, unknown> | undefined;
      db.dailyStats.add = ((stat: Record<string, unknown>) => {
        addedDailyStat = stat;
        return Promise.resolve(1);
      }) as unknown as typeof db.dailyStats.add;

      await dealHandler(mixedItemsEvent as Event<DealClosedPayload>, db);

      const productsSold = addedDailyStat?.productsSold as DailyStats['productsSold'] | undefined;
      assert.ok(productsSold, 'productsSold should exist');
      assert.equal(productsSold.length, 1,
        'only existing product should appear in productsSold');
      assert.equal(productsSold[0]?.productId, 'product-1',
        'only product-1 should be processed');
      assert.equal(productsSold[0]?.quantity, 2);
      assert.equal(productsSold[0]?.revenue, 400);
      assert.equal(addedDailyStat?.dealCount, 1);

      console.log('PASS handler edge: missing product item is skipped, only existing product processed');
    } finally {
      db.markets.get = originalMarketGet;
      db.markets.update = originalMarketUpdate;
      db.dailyStats.where = originalDailyStatsWhere;
      db.dailyStats.add = originalDailyStatsAdd;
      db.products.get = originalProductGet;
      db.products.update = originalProductUpdate;
    }
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
