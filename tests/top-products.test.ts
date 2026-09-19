import assert from 'node:assert/strict';
import { calculateTopProductsFromEvents } from '../lib/analytics/top-products';
import type { DealClosedPayload, Event } from '../types/db';

const TS = new Date('2026-06-11T12:00:00+08:00').getTime();

function deal(id: string, payload: Partial<DealClosedPayload>, market_id?: string): Event<DealClosedPayload> {
  return {
    id,
    type: 'deal_closed',
    market_id,
    actor_id: 'owner-1',
    timestamp: TS,
    sync_status: 'synced',
    payload: {
      market_id,
      paymentMethod: 'cash',
      totalAmount: 0,
      items: [],
      ...payload,
    } as DealClosedPayload,
  };
}

async function main(): Promise<void> {
  const result = await calculateTopProductsFromEvents(
    [
      deal('deal-1', {
        marketId: 'market-1',
        items: [
          {
            product_id: 'product-a',
            product_name: '商品 A',
            quantity: 2,
            price_at_time_of_sale: 120,
            cost_at_time_of_sale: 30,
          } as any,
          {
            productId: 'product-b',
            quantity: 1,
            price: 500,
            cost: 200,
          } as any,
        ],
      } as any),
      deal('deal-2', {
        is_manual_entry: true,
        manual_revenue: 9999,
        items: [],
      } as any, 'market-1'),
      deal('deal-3', {
        items: [
          {
            product_id: 'product-other',
            product_name: '其他市場',
            quantity: 99,
            price_at_time_of_sale: 999,
          } as any,
        ],
      }, 'market-2'),
    ],
    new Set(['market-1']),
    async (productId) => productId === 'product-b' ? '商品 B' : undefined
  );

  assert.deepEqual(result.topByQuantity, {
    productName: '商品 A',
    quantity: 2,
  });
  assert.deepEqual(result.topByRevenue, {
    productName: '商品 B',
    revenue: 500,
  });
  assert.deepEqual(result.topByProfit, {
    productName: '商品 B',
    profit: 300,
  });

  console.log('PASS top products analytics');
}

main().catch((error) => {
  console.error('FAIL top products analytics');
  throw error;
});
