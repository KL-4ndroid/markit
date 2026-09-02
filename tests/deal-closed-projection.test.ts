import assert from 'node:assert/strict';
import {
  getDealClosedItemProjection,
  getDealClosedItemsProjection,
  getDealClosedManualProjection,
  getDealClosedMode,
  getDealClosedTransactionDate,
  getDealClosedHandlerItemProjection,
  type ProductSnapshotForDealProjection,
} from '../lib/db/deal-closed-projection';
import type { DealClosedPayload, Event } from '../types/db';

const TS = new Date(2026, 5, 11, 10, 30, 0).getTime();

function deal(payload: Record<string, unknown>, timestamp = TS): Event<DealClosedPayload> {
  return {
    id: 'deal-1',
    type: 'deal_closed',
    market_id: 'market-1',
    actor_id: 'actor-1',
    timestamp,
    sync_status: 'synced',
    payload: {
      market_id: 'market-1',
      paymentMethod: 'cash',
      totalAmount: 0,
      items: [],
      ...payload,
    } as DealClosedPayload,
  };
}

function run() {
  const camelManual = deal({
    isManualEntry: true,
    dealDate: '2026-06-10',
    manualRevenue: 1200,
    manualCost: 250,
    manualDealCount: 4,
  });
  assert.equal(getDealClosedMode(camelManual), 'manual');
  assert.equal(getDealClosedTransactionDate(camelManual), '2026-06-10');
  assert.deepEqual(getDealClosedManualProjection(camelManual), {
    date: '2026-06-10',
    revenue: 1200,
    cost: 250,
    profit: 950,
    dealCount: 4,
  });

  const snakeManual = deal({
    is_manual_entry: true,
    deal_date: '2026-06-09',
    manual_revenue: 900,
    manual_cost: 100,
    manual_deal_count: 3,
  });
  assert.equal(getDealClosedMode(snakeManual), 'manual');
  assert.equal(getDealClosedTransactionDate(snakeManual), '2026-06-09');
  assert.deepEqual(getDealClosedManualProjection(snakeManual), {
    date: '2026-06-09',
    revenue: 900,
    cost: 100,
    profit: 800,
    dealCount: 3,
  });

  const timestampFallback = deal({
    isManualEntry: true,
    totalAmount: 500,
  });
  assert.equal(getDealClosedTransactionDate(timestampFallback), '2026-06-11');
  assert.deepEqual(getDealClosedManualProjection(timestampFallback), {
    date: '2026-06-11',
    revenue: 500,
    cost: 0,
    profit: 500,
    dealCount: 1,
  });

  assert.equal(getDealClosedMode(deal({ isBackfill: true })), 'backfill');
  assert.equal(getDealClosedMode(deal({ is_backfill: true })), 'backfill');
  assert.equal(getDealClosedMode(deal({})), 'normal');

  const product: ProductSnapshotForDealProjection = {
    id: 'product-1',
    name: '手作耳環',
    price: 320,
    cost: 80,
  };

  assert.deepEqual(getDealClosedItemProjection({
    productId: 'product-1',
    productName: '成交快照名稱',
    quantity: 2,
    priceAtTimeOfSale: 300,
    costAtTimeOfSale: 70,
    price: 999,
  } as any, product), {
    productId: 'product-1',
    productName: '成交快照名稱',
    quantity: 2,
    unitPrice: 300,
    unitCost: 70,
    revenue: 600,
    cost: 140,
    productsSold: {
      productId: 'product-1',
      quantity: 2,
      revenue: 600,
    },
  });

  assert.deepEqual(getDealClosedItemProjection({
    product_id: 'product-1',
    product_name: '舊格式耳環',
    quantity: 3,
    price_at_time_of_sale: 280,
    cost_at_time_of_sale: 60,
  } as any, product), {
    productId: 'product-1',
    productName: '舊格式耳環',
    quantity: 3,
    unitPrice: 280,
    unitCost: 60,
    revenue: 840,
    cost: 180,
    productsSold: {
      productId: 'product-1',
      quantity: 3,
      revenue: 840,
    },
  });

  assert.deepEqual(getDealClosedItemProjection({
    product_id: 'product-1',
    quantity: 1,
  } as any, product), {
    productId: 'product-1',
    productName: '手作耳環',
    quantity: 1,
    unitPrice: 320,
    unitCost: 80,
    revenue: 320,
    cost: 80,
    productsSold: {
      productId: 'product-1',
      quantity: 1,
      revenue: 320,
    },
  });

  assert.deepEqual(getDealClosedItemProjection({
    product_id: ' ',
    quantity: Number.NaN,
    price: 250,
    cost: 50,
  } as any), {
    productId: undefined,
    productName: '商品',
    quantity: 0,
    unitPrice: 250,
    unitCost: 50,
    revenue: 0,
    cost: 0,
    productsSold: undefined,
  });

  const itemsProjection = getDealClosedItemsProjection(deal({
    items: [
      {
        product_id: 'product-1',
        quantity: 2,
        price_at_time_of_sale: 300,
        cost_at_time_of_sale: 80,
      },
      {
        productId: 'product-2',
        quantity: 1,
        price: 150,
        cost: 30,
      },
    ],
  } as any), new Map([
    ['product-1', product],
    ['product-2', {
      id: 'product-2',
      name: '貼紙',
      price: 180,
      cost: 40,
    }],
  ]));

  assert.equal(itemsProjection.totalAmount, 750);
  assert.equal(itemsProjection.totalCost, 190);
  assert.deepEqual(itemsProjection.productsSold, [
    {
      productId: 'product-1',
      quantity: 2,
      revenue: 600,
    },
    {
      productId: 'product-2',
      quantity: 1,
      revenue: 150,
    },
  ]);

  // =========================================================
  // Handler-compatible item projection tests (C1)
  // These mirror deal_closed handler item loop semantics.
  // Revenue source of truth = payload.totalAmount (not items).
  // =========================================================

  // T1: camelCase item uses item.price
  {
    const result = getDealClosedHandlerItemProjection(
      deal({
        totalAmount: 600,
        items: [{ productId: 'product-1', quantity: 2, price: 300 }],
      } as any),
      new Map([['product-1', { id: 'product-1', name: '手作耳環', price: 320, cost: 80 }]])
    );

    assert.equal(result.projectedItems.length, 1);
    assert.equal(result.projectedItems[0].productId, 'product-1');
    assert.equal(result.projectedItems[0].quantity, 2);
    assert.equal(result.projectedItems[0].unitPrice, 300, 'should use item.price (not product.price)');
    assert.equal(result.projectedItems[0].unitCost, 80, 'should use product.cost');
    assert.equal(result.totalCost, 160, 'totalCost = product.cost * quantity');
    assert.equal(result.productsSold.length, 1);
    assert.equal(result.productsSold[0].productId, 'product-1');
    assert.equal(result.productsSold[0].quantity, 2);
    assert.equal(result.productsSold[0].revenue, 600, 'productsSold revenue = item.price * quantity');

    console.log('PASS handler-compatible: camelCase item uses item.price');
  }

  // T2: item missing price falls back to product.price
  {
    const result = getDealClosedHandlerItemProjection(
      deal({
        totalAmount: 640,
        items: [{ productId: 'product-1', quantity: 2 }],
      } as any),
      new Map([['product-1', { id: 'product-1', name: '手作耳環', price: 320, cost: 80 }]])
    );

    assert.equal(result.projectedItems.length, 1);
    assert.equal(result.projectedItems[0].unitPrice, 320, 'should fallback to product.price');
    assert.equal(result.projectedItems[0].unitCost, 80);
    assert.equal(result.totalCost, 160);
    assert.equal(result.productsSold[0].revenue, 640, 'revenue = product.price * quantity');
    assert.equal(result.productsSold[0].quantity, 2);

    console.log('PASS handler-compatible: item missing price falls back to product.price');
  }

  // T3: snapshot price is NOT used (item.price takes precedence)
  // item has price_at_time_of_sale=999, price=100, product.price=200
  // handler uses: item.price || product.price = 100
  {
    const result = getDealClosedHandlerItemProjection(
      deal({
        totalAmount: 200,
        items: [{
          productId: 'product-1',
          quantity: 2,
          price_at_time_of_sale: 999,
          price: 100,
        }],
      } as any),
      new Map([['product-1', { id: 'product-1', name: '手作耳環', price: 200, cost: 50 }]])
    );

    assert.equal(result.projectedItems[0].unitPrice, 100, 'should use item.price, NOT price_at_time_of_sale');
    assert.equal(result.projectedItems[0].unitCost, 50, 'should use product.cost, NOT cost_at_time_of_sale');
    assert.equal(result.productsSold[0].revenue, 200, 'revenue = item.price * quantity');

    console.log('PASS handler-compatible: item.price takes precedence over snapshot price');
  }

  // T4: product.cost takes precedence (item.cost_at_time_of_sale ignored)
  // item has cost_at_time_of_sale=999, product.cost=30
  // handler uses: product.cost = 30
  {
    const result = getDealClosedHandlerItemProjection(
      deal({
        totalAmount: 600,
        items: [{
          productId: 'product-1',
          quantity: 2,
          price: 300,
          cost_at_time_of_sale: 999,
        }],
      } as any),
      new Map([['product-1', { id: 'product-1', name: '手作耳環', price: 320, cost: 30 }]])
    );

    assert.equal(result.projectedItems[0].unitCost, 30, 'should use product.cost, NOT cost_at_time_of_sale');
    assert.equal(result.totalCost, 60, 'totalCost = product.cost * quantity');

    console.log('PASS handler-compatible: product.cost used, cost_at_time_of_sale ignored');
  }

  // T5: product not found → item is skipped (no undefined productId in productsSold)
  {
    const result = getDealClosedHandlerItemProjection(
      deal({
        totalAmount: 300,
        items: [{ productId: 'nonexistent', quantity: 5, price: 60 }],
      } as any),
      new Map() // empty map
    );

    assert.equal(result.projectedItems.length, 0, 'skipped product should not appear in projectedItems');
    assert.equal(result.productsSold.length, 0, 'skipped product should not appear in productsSold');
    assert.equal(result.totalCost, 0, 'skipped product should not contribute to totalCost');

    console.log('PASS handler-compatible: product not found is skipped');
  }

  // T6: productsSold shape is { productId, quantity, revenue } — no extra fields
  {
    const result = getDealClosedHandlerItemProjection(
      deal({
        totalAmount: 450,
        items: [
          { productId: 'p-a', quantity: 1, price: 150 },
          { productId: 'p-b', quantity: 3, price: 100 },
        ],
      } as any),
      new Map([
        ['p-a', { id: 'p-a', name: 'A商品', price: 150, cost: 30 }],
        ['p-b', { id: 'p-b', name: 'B商品', price: 100, cost: 20 }],
      ])
    );

    assert.equal(result.productsSold.length, 2);
    for (const entry of result.productsSold) {
      const keys = Object.keys(entry).sort();
      assert.deepEqual(keys, ['productId', 'quantity', 'revenue'],
        'productsSold entry must only have productId, quantity, revenue');
    }

    const entryA = result.productsSold.find((e) => e.productId === 'p-a');
    assert.equal(entryA?.quantity, 1);
    assert.equal(entryA?.revenue, 150);

    const entryB = result.productsSold.find((e) => e.productId === 'p-b');
    assert.equal(entryB?.quantity, 3);
    assert.equal(entryB?.revenue, 300);

    console.log('PASS handler-compatible: productsSold shape is { productId, quantity, revenue }');
  }

  // =========================================================
  // Edge cases: handler-compatible helper vs handler semantics (C2.5)
  // =========================================================

  // T7: item.price = 0 — documents HELPER behavior (DIFF from handler)
  // Helper uses ?? (nullish coalescing): 0 ?? product.price → 0 (0 is NOT nullish)
  // Handler uses || (logical OR): item.price || product.price → product.price (0 is falsy)
  // ⚠️ C3接入前需注意：若直接swap helper into handler, this 0 would propagate
  {
    const result = getDealClosedHandlerItemProjection(
      deal({
        totalAmount: 400,
        items: [{ productId: 'product-1', quantity: 2, price: 0 }],
      } as any),
      new Map([['product-1', { id: 'product-1', name: '手作耳環', price: 200, cost: 50 }]])
    );

    assert.equal(result.projectedItems.length, 1);
    assert.equal(result.projectedItems[0].unitPrice, 0,
      'helper: 0 ?? 200 = 0 (?? does NOT treat 0 as fallback trigger)');
    assert.equal(result.productsSold[0].revenue, 0,
      'helper revenue = 0 * 2 = 0 (not 400 like handler)');
    assert.equal(result.totalCost, 100,
      'totalCost = product.cost(50) * quantity(2) = 100 (cost unaffected by price diff)');

    console.log('NOTE handler-compatible edge: item.price=0 helper stays at 0 (DIFF from handler || behavior)');
  }

  // T8: product.cost = 0 → handler if(product.cost) skips, totalCost stays 0
  // handler: if (product.cost) → 0 is falsy → skip
  // helper: if (product.cost) → 0 is falsy → skip → unitCost = 0, totalCost = 0
  // Behavior is EQUIVALENT
  {
    const result = getDealClosedHandlerItemProjection(
      deal({
        totalAmount: 400,
        items: [{ productId: 'product-1', quantity: 2, price: 200 }],
      } as any),
      new Map([['product-1', { id: 'product-1', name: '免費贈品', price: 200, cost: 0 }]])
    );

    assert.equal(result.projectedItems.length, 1);
    assert.equal(result.projectedItems[0].unitCost, 0, 'product.cost = 0, not added to totalCost');
    assert.equal(result.totalCost, 0, 'product.cost is falsy, handler skips → totalCost = 0');

    console.log('PASS handler-compatible edge: product.cost=0 does not contribute to totalCost (equivalent)');
  }

  // T9: blank productId is skipped (empty string)
  // handler: db.products.get('') → falsy product → skipped
  // helper: !itemProductId || !itemProductId.trim() → continue
  // Behavior is EQUIVALENT
  {
    const result = getDealClosedHandlerItemProjection(
      deal({
        totalAmount: 600,
        items: [
          { productId: 'product-1', quantity: 2, price: 300 },
          { productId: '', quantity: 5, price: 100 },
        ],
      } as any),
      new Map([['product-1', { id: 'product-1', name: '正常商品', price: 300, cost: 80 }]])
    );

    assert.equal(result.projectedItems.length, 1, 'blank productId should be skipped');
    assert.equal(result.productsSold.length, 1, 'blank productId should not appear in productsSold');
    assert.equal(result.productsSold[0].productId, 'product-1');
    assert.equal(result.totalCost, 160);

    console.log('PASS handler-compatible edge: empty string productId is skipped (equivalent)');
  }

  // T10: snake_case product_id is resolved correctly
  // handler: db.products.get(item.productId) → reads camelCase, not product_id
  // helper: getDealItemProductId() → handles both camelCase and snake_case
  {
    const result = getDealClosedHandlerItemProjection(
      deal({
        totalAmount: 280,
        items: [{
          product_id: 'product-1', // snake_case
          quantity: 2,
          price: 140,
        }],
      } as any),
      new Map([['product-1', { id: 'product-1', name: '舊格式耳環', price: 140, cost: 35 }]])
    );

    assert.equal(result.projectedItems.length, 1, 'snake_case product_id should be resolved');
    assert.equal(result.projectedItems[0].productId, 'product-1');
    assert.equal(result.projectedItems[0].quantity, 2);
    assert.equal(result.projectedItems[0].unitPrice, 140);
    assert.equal(result.projectedItems[0].unitCost, 35);
    assert.equal(result.productsSold.length, 1);
    assert.equal(result.productsSold[0].productId, 'product-1');
    assert.equal(result.productsSold[0].revenue, 280);

    console.log('PASS handler-compatible edge: snake_case product_id resolved correctly');
  }

  // T11: quantity undefined → helper uses ?? 0 (documents helper behavior)
  // NOTE: This is helper behavior, NOT handler behavior.
  // Handler: item.quantity is used directly (produces NaN in handler math)
  // Helper: item.quantity ?? 0 → uses 0
  // This difference means helper CANNOT be blindly swapped into the handler.
  // See C2 analysis: Gap #1 (quantity防呆).
  {
    const result = getDealClosedHandlerItemProjection(
      deal({
        totalAmount: 0,
        items: [{ productId: 'product-1' }], // quantity is undefined
      } as any),
      new Map([['product-1', { id: 'product-1', name: '手作耳環', price: 200, cost: 50 }]])
    );

    assert.equal(result.projectedItems.length, 1);
    assert.equal(result.projectedItems[0].quantity, 0, 'helper uses ?? 0 for undefined quantity');
    assert.equal(result.projectedItems[0].unitPrice, 200);
    assert.equal(result.productsSold[0].quantity, 0);
    assert.equal(result.productsSold[0].revenue, 0);
    assert.equal(result.totalCost, 0);

    console.log('PASS handler-compatible edge: quantity undefined → helper uses 0 (C3接入前需注意)');
  }

  // T12: quantity NaN → ?? does NOT fall back to 0 (NaN is not null/undefined)
  // NOTE: This is helper behavior, NOT handler behavior.
  // Helper: NaN ?? 0 → NaN (?? only handles null/undefined, not NaN)
  // Handler: NaN * 2 → NaN (NaN propagates through multiplication)
  // Both produce NaN, so behavior is EQUIVALENT in practice.
  {
    const result = getDealClosedHandlerItemProjection(
      deal({
        totalAmount: 0,
        items: [{ productId: 'product-1', quantity: Number.NaN, price: 200 }],
      } as any),
      new Map([['product-1', { id: 'product-1', name: '手作耳環', price: 200, cost: 50 }]])
    );

    assert.equal(result.projectedItems.length, 1);
    assert.ok(Number.isNaN(result.projectedItems[0].quantity),
      'NaN ?? 0 is NaN (?? does not treat NaN as nullish)');
    assert.ok(Number.isNaN(result.productsSold[0].revenue),
      'revenue = NaN * 200 = NaN');
    assert.ok(Number.isNaN(result.totalCost) || result.totalCost === 0,
      'totalCost = NaN or 0 (NaN propagates)');

    console.log('PASS handler-compatible edge: quantity NaN → NaN (?? does not fall back, equivalent to handler in practice)');
  }

  console.log('PASS deal closed projection helpers');
}

run();
