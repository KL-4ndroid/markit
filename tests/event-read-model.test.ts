import assert from 'node:assert/strict';
import {
  getDealEventCost,
  getDealEventCount,
  getDealEventDate,
  getDealEventRevenue,
  getDealItemCost,
  getDealItemPrice,
  getDealItemProductId,
  getEventMarketId,
  getPayloadPreferredEventMarketId,
  getTombstoneTargetEventId,
  isBackfillDealEvent,
  isManualDealEvent,
} from '../lib/events/event-read-model';

const TS = new Date('2026-06-11T10:30:00+08:00').getTime();

function main(): void {
  assert.equal(
    getEventMarketId({
      market_id: 'root-market',
      payload: { market_id: 'payload-snake', marketId: 'payload-camel' },
    }),
    'root-market'
  );
  assert.equal(getEventMarketId({ payload: { market_id: 'payload-snake' } }), 'payload-snake');
  assert.equal(getEventMarketId({ payload: { marketId: 'payload-camel' } }), 'payload-camel');
  assert.equal(
    getPayloadPreferredEventMarketId({
      market_id: 'root-market',
      payload: { market_id: 'payload-snake', marketId: 'payload-camel' },
    }),
    'payload-snake'
  );
  assert.equal(
    getPayloadPreferredEventMarketId({
      market_id: 'root-market',
      payload: { marketId: 'payload-camel' },
    }),
    'payload-camel'
  );

  assert.equal(getTombstoneTargetEventId({ payload: { eventId: 'camel-id' } }), 'camel-id');
  assert.equal(getTombstoneTargetEventId({ payload: { event_id: 'snake-id' } }), 'snake-id');

  assert.equal(getDealEventDate({ timestamp: TS, payload: {} }), '2026-06-11');
  assert.equal(getDealEventDate({ timestamp: TS, payload: { deal_date: '2026-05-01' } }), '2026-05-01');
  assert.equal(getDealEventDate({ timestamp: TS, payload: { dealDate: '2026-05-02' } }), '2026-05-02');

  assert.equal(getDealEventRevenue({ payload: { total_amount: 100 } }), 100);
  assert.equal(getDealEventRevenue({ payload: { totalAmount: 200 } }), 200);
  assert.equal(getDealEventRevenue({ payload: { manual_revenue: 300 } }), 300);
  assert.equal(getDealEventRevenue({ payload: { manualRevenue: 400 } }), 400);
  assert.equal(getDealEventRevenue({
    payload: {
      items: [
        { price_at_time_of_sale: 120, quantity: 2 },
        { price: 30, quantity: 3 },
      ],
    },
  }), 330);

  assert.equal(getDealEventCost({ payload: { total_cost: 10 } }), 10);
  assert.equal(getDealEventCost({ payload: { totalCost: 20 } }), 20);
  assert.equal(getDealEventCost({ payload: { manual_cost: 30 } }), 30);
  assert.equal(getDealEventCost({ payload: { manualCost: 40 } }), 40);
  assert.equal(getDealEventCost({
    payload: {
      items: [
        { cost_at_time_of_sale: 5, quantity: 2 },
        { cost: 3, quantity: 4 },
      ],
    },
  }), 22);

  assert.equal(getDealEventCount({ payload: { manual_deal_count: 3 } }), 3);
  assert.equal(getDealEventCount({ payload: { manualDealCount: 4 } }), 4);
  assert.equal(getDealEventCount({ payload: {} }), 1);

  assert.equal(getDealItemProductId({ product_id: 'snake-product' } as any), 'snake-product');
  assert.equal(getDealItemProductId({ productId: 'camel-product' } as any), 'camel-product');
  assert.equal(getDealItemPrice({ price_at_time_of_sale: 55 } as any), 55);
  assert.equal(getDealItemPrice({ priceAtTimeOfSale: 66 } as any), 66);
  assert.equal(getDealItemCost({ cost_at_time_of_sale: 7 } as any), 7);
  assert.equal(getDealItemCost({ costAtTimeOfSale: 8 } as any), 8);
  assert.equal(isManualDealEvent({ payload: { isManualEntry: true } }), true);
  assert.equal(isManualDealEvent({ payload: { is_manual_entry: true } }), true);
  assert.equal(isManualDealEvent({ payload: { isManualEntry: false } }), false);
  assert.equal(isBackfillDealEvent({ payload: { isBackfill: true } }), true);
  assert.equal(isBackfillDealEvent({ payload: { is_backfill: true } }), true);
  assert.equal(isBackfillDealEvent({ payload: { isBackfill: false } }), false);

  console.log('PASS event read model helpers');
}

main();
