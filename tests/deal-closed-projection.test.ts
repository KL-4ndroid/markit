import assert from 'node:assert/strict';
import {
  getDealClosedItemProjection,
  getDealClosedItemsProjection,
  getDealClosedManualProjection,
  getDealClosedMode,
  getDealClosedTransactionDate,
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

  console.log('PASS deal closed projection helpers');
}

run();
