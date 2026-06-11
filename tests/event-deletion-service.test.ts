import assert from 'node:assert/strict';
import {
  assertEventCanBeDeleted,
  recordDealDeletedEvent,
  resolveDealDeletionResult,
} from '../lib/markets/event-deletion-service';
import type { DealClosedPayload, Event } from '../types/db';

const timestamp = new Date('2026-01-15T10:30:00+08:00').getTime();

function dealEvent(overrides: Partial<Event<DealClosedPayload>> = {}): Event<DealClosedPayload> {
  const payload: DealClosedPayload = {
    market_id: 'market-1',
    totalAmount: 300,
    paymentMethod: 'cash',
    items: [
      {
        productId: 'product-1',
        quantity: 3,
        price: 100,
        price_at_time_of_sale: 100,
        cost_at_time_of_sale: 40,
      },
    ],
    ...overrides.payload,
  };

  return {
    id: 'deal-1',
    type: 'deal_closed',
    timestamp,
    ...overrides,
    payload,
  };
}

async function main(): Promise<void> {
  const manualResult = await resolveDealDeletionResult(dealEvent({
    payload: {
      market_id: 'market-1',
      totalAmount: 999,
      paymentMethod: 'cash',
      items: [],
      isManualEntry: true,
      manualRevenue: 500,
      manualCost: 150,
      manualDealCount: 4,
      dealDate: '2026-01-20',
    },
  }));

  assert.equal(manualResult.totalAmount, 500);
  assert.equal(manualResult.totalCost, 150);
  assert.equal(manualResult.dealCount, 4);
  assert.equal(manualResult.dealDate, '2026-01-20');
  assert.deepEqual(manualResult.productsSold, []);

  const manualFallbackResult = await resolveDealDeletionResult(dealEvent({
    market_id: 'market-root',
    payload: {
      market_id: '',
      totalAmount: 800,
      paymentMethod: 'cash',
      items: [],
      isManualEntry: true,
      dealDate: '2026-01-21',
    },
  }));

  assert.equal(manualFallbackResult.marketId, 'market-root');
  assert.equal(manualFallbackResult.totalAmount, 800);
  assert.equal(manualFallbackResult.totalCost, 0);
  assert.equal(manualFallbackResult.dealCount, 1);
  assert.equal(manualFallbackResult.dealDate, '2026-01-21');

  const productResult = await resolveDealDeletionResult(
    dealEvent({
      payload: {
        market_id: 'market-1',
        totalAmount: 450,
        paymentMethod: 'cash',
        items: [
          {
            productId: 'product-1',
            quantity: 2,
            price: 100,
            price_at_time_of_sale: 120,
            cost_at_time_of_sale: 50,
          },
          {
            productId: 'product-2',
            quantity: 1,
            price: 200,
          },
        ],
      },
    }),
    async (productId) => productId === 'product-2' ? 80 : undefined
  );

  assert.equal(productResult.totalAmount, 450);
  assert.equal(productResult.totalCost, 180);
  assert.equal(productResult.dealCount, 1);
  assert.equal(productResult.dealDate, '2026-01-15');
  assert.deepEqual(productResult.productsSold, [
    { productId: 'product-1', quantity: 2, revenue: 240 },
    { productId: 'product-2', quantity: 1, revenue: 200 },
  ]);

  const legacyProductResult = await resolveDealDeletionResult(
    dealEvent({
      payload: {
        market_id: 'market-1',
        totalAmount: 240,
        paymentMethod: 'cash',
        items: [
          {
            product_id: 'legacy-product',
            quantity: 2,
            price_at_time_of_sale: 120,
            price: 999,
          } as DealClosedPayload['items'][number] & { product_id: string },
        ],
      },
    }),
    async () => 50
  );

  assert.equal(legacyProductResult.totalCost, 100);
  assert.deepEqual(legacyProductResult.productsSold, [
    { productId: 'legacy-product', quantity: 2, revenue: 240 },
  ]);

  let recordedType: string | undefined;
  let recordedPayload: Record<string, unknown> | undefined;

  await recordDealDeletedEvent(manualFallbackResult, async (type: string, payload: unknown) => {
    recordedType = type;
    recordedPayload = payload as Record<string, unknown>;
    return 'tombstone-1';
  });

  assert.equal(recordedType, 'deal_deleted');
  assert.equal(recordedPayload?.market_id, 'market-root');
  assert.equal(recordedPayload?.marketId, 'market-root');
  assert.equal(recordedPayload?.totalAmount, 800);

  await assert.rejects(
    () => resolveDealDeletionResult(dealEvent({ id: undefined })),
    /without an event id/
  );

  await assert.rejects(
    () => resolveDealDeletionResult(dealEvent({
      payload: {
        market_id: '',
        totalAmount: 100,
        paymentMethod: 'cash',
        items: [],
      },
    })),
    /missing market_id/
  );

  assert.equal(assertEventCanBeDeleted('deal-1', new Set()), 'deal-1');

  assert.throws(
    () => assertEventCanBeDeleted('deal-1', new Set(['deal-1'])),
    /already deleted/
  );

  assert.throws(
    () => assertEventCanBeDeleted(undefined, new Set()),
    /without an event id/
  );

  console.log('PASS event deletion service payload calculation');
}

main().catch((error) => {
  console.error('FAIL event deletion service payload calculation');
  throw error;
});
