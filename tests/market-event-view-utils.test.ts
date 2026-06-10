import assert from 'node:assert/strict';
import {
  getDealEventDate,
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
