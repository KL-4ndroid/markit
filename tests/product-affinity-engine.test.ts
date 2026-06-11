import assert from 'node:assert/strict';
import {
  calculateDailyRevenue,
  calculateProductAffinityFromEvents,
} from '../lib/analytics/product-affinity-engine';
import type { DealClosedPayload, Event, Market } from '../types/db';

const timestamp = new Date('2026-06-11T10:30:00+08:00').getTime();

function deal(
  id: string,
  payload: Partial<DealClosedPayload>,
  market_id?: string
): Event<DealClosedPayload> {
  return {
    id,
    type: 'deal_closed',
    actor_id: 'owner-1',
    market_id,
    timestamp,
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

function makeDb(events: Array<Event<DealClosedPayload>>) {
  return {
    events: {
      where: () => ({
        equals: () => ({
          filter: (predicate: (event: Event<DealClosedPayload>) => boolean) => ({
            toArray: async () => events.filter(predicate),
          }),
        }),
      }),
    },
  } as any;
}

async function main(): Promise<void> {
  const events = [
    deal('deal-1', {
      marketId: 'market-1',
      items: [
        { product_id: 'product-a', product_name: '商品 A', quantity: 1, price_at_time_of_sale: 100 } as any,
        { productId: 'product-b', quantity: 1, price: 200 } as any,
      ],
    } as any),
    deal('deal-2', {
      items: [
        { productId: 'product-b', quantity: 1, price: 200 } as any,
        { productId: 'product-c', productName: '商品 C', quantity: 1, price: 300 } as any,
      ],
    }, 'market-1'),
    deal('manual', {
      isManualEntry: true,
      manualRevenue: 999,
    }, 'market-1'),
    deal('other-market', {
      items: [
        { productId: 'product-a', productName: '商品 A', quantity: 1, price: 100 } as any,
        { productId: 'product-c', productName: '商品 C', quantity: 1, price: 300 } as any,
      ],
    }, 'market-2'),
  ];

  const pairs = await calculateProductAffinityFromEvents(
    events,
    new Set(['market-1']),
    async (productId) => productId === 'product-b' ? '商品 B' : undefined
  );

  assert.equal(pairs.length, 2);
  assert.deepEqual(
    pairs.map((pair) => [pair.productA, pair.productB, pair.coOccurrences]),
    [
      ['商品 A', '商品 B', 1],
      ['商品 B', '商品 C', 1],
    ]
  );

  const markets: Market[] = [{
    id: 'market-1',
    name: 'Market 1',
    location: 'Taipei',
    startDate: '2026-06-11',
    endDate: '2026-06-11',
    dates: ['2026-06-11'],
    status: 'completed',
    createdAt: timestamp,
    updatedAt: timestamp,
  } as Market];

  const revenue = await calculateDailyRevenue(
    markets,
    makeDb([
      deal('revenue-1', { deal_date: '2026-06-10', totalAmount: undefined, total_amount: 300 } as any, 'market-1'),
      deal('revenue-2', { dealDate: '2026-06-11', manualRevenue: 500 }, 'market-1'),
      deal('revenue-3', { dealDate: '2026-06-11', totalAmount: 999 }, 'market-2'),
    ]),
    '2026-06-10',
    '2026-06-11'
  );

  assert.equal(revenue.get('2026-06-10'), 300);
  assert.equal(revenue.get('2026-06-11'), 500);
  assert.equal(revenue.size, 2);

  console.log('PASS product affinity engine');
}

main().catch((error) => {
  console.error('FAIL product affinity engine');
  throw error;
});
