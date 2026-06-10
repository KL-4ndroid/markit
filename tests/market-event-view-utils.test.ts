import assert from 'node:assert/strict';
import {
  getDealEventDate,
  getDealEventRevenue,
  getDealItemProductName,
  getDealItemRevenue,
  getDealItems,
  getDealPaymentMethod,
  getEventMarketId,
  getLocalDateStringFromTimestamp,
} from '../lib/markets/event-view-utils';
import type { DealClosedPayload, Event } from '../types/db';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test('getEventMarketId prefers root market_id', () => {
  assert.equal(
    getEventMarketId({
      market_id: 'root-market',
      payload: { market_id: 'snake-market', marketId: 'camel-market' },
    } as Event),
    'root-market'
  );
});

test('getEventMarketId falls back to snake_case payload', () => {
  assert.equal(
    getEventMarketId({
      payload: { market_id: 'snake-market' },
    } as Event),
    'snake-market'
  );
});

test('getEventMarketId falls back to camelCase payload', () => {
  assert.equal(
    getEventMarketId({
      payload: { marketId: 'camel-market' },
    } as Event),
    'camel-market'
  );
});

test('getDealEventDate prefers dealDate then deal_date then timestamp', () => {
  const baseEvent = {
    type: 'deal_closed',
    timestamp: new Date(2026, 4, 24, 12, 30).getTime(),
    actor_id: 'user-1',
    payload: {
      market_id: 'market-1',
      items: [],
      totalAmount: 100,
      paymentMethod: 'cash',
    },
  } as Event<DealClosedPayload>;

  assert.equal(getDealEventDate({
    ...baseEvent,
    payload: { ...baseEvent.payload, dealDate: '2026-05-22' },
  }), '2026-05-22');

  assert.equal(getDealEventDate({
    ...baseEvent,
    payload: { ...baseEvent.payload, deal_date: '2026-05-23' } as DealClosedPayload & { deal_date: string },
  }), '2026-05-23');

  assert.equal(getDealEventDate(baseEvent), getLocalDateStringFromTimestamp(baseEvent.timestamp));
});

test('deal view helpers support legacy snake_case deal payloads', () => {
  const event = {
    id: 'deal-legacy',
    type: 'deal_closed',
    timestamp: new Date('2026-05-24T12:00:00Z').getTime(),
    payload: {
      market_id: 'market-1',
      deal_date: '2026-05-24',
      total_amount: 1200,
      payment_method: 'mobile',
      items: [
        {
          product_id: 'product-1',
          product_name: '手作耳環',
          quantity: 2,
          price_at_time_of_sale: 600,
        },
      ],
    },
  } as unknown as Event<DealClosedPayload>;

  const items = getDealItems(event);

  assert.equal(getDealEventDate(event), '2026-05-24');
  assert.equal(getDealEventRevenue(event), 1200);
  assert.equal(getDealPaymentMethod(event), 'mobile');
  assert.equal(items.length, 1);
  assert.equal(getDealItemProductName(items[0]), '手作耳環');
  assert.equal(getDealItemRevenue(items[0]), 1200);
});

test('deal view helpers prefer manual revenue when present', () => {
  const event = {
    id: 'deal-manual',
    type: 'deal_closed',
    timestamp: Date.now(),
    payload: {
      market_id: 'market-1',
      manual_revenue: 500,
      total_amount: 999,
      payment_method: 'cash',
      items: [],
    },
  } as unknown as Event<DealClosedPayload>;

  assert.equal(getDealEventRevenue(event), 500);
});
