import assert from 'node:assert/strict';
import {
  canonicalizeDailyStat,
  canonicalizeEvent,
} from '../lib/db/data-canonicalization';
import type { DailyStats, Event } from '../types/db';

const TS = 1_700_000_000_000;

function event(payload: Record<string, unknown>, overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    type: 'deal_deleted',
    payload,
    timestamp: TS,
    actor_id: 'owner-1',
    sync_status: 'local_only',
    ...overrides,
  } as Event;
}

function main(): void {
  const deleted = canonicalizeEvent(event({
    event_id: 'deal-1',
    marketId: 'market-1',
    deal_date: '2026-06-11',
    total_amount: 800,
    deal_count: 1,
  }));

  assert.equal(deleted.changed, true);
  assert.equal(deleted.event.market_id, 'market-1');
  assert.equal((deleted.event.payload as any).market_id, 'market-1');
  assert.equal((deleted.event.payload as any).eventId, 'deal-1');
  assert.equal((deleted.event.payload as any).event_id, 'deal-1');
  assert.equal((deleted.event.payload as any).dealDate, '2026-06-11');
  assert.equal((deleted.event.payload as any).totalAmount, 800);
  assert.equal((deleted.event.payload as any).dealCount, 1);

  const closed = canonicalizeEvent(event({
    market_id: 'market-1',
    total_amount: 500,
    manual_revenue: 500,
    manual_deal_count: 2,
    items: [
      {
        product_id: 'product-1',
        quantity: 1,
        price_at_time_of_sale: 500,
      },
    ],
  }, { type: 'deal_closed' }));

  assert.equal((closed.event.payload as any).totalAmount, 500);
  assert.equal((closed.event.payload as any).manualRevenue, 500);
  assert.equal((closed.event.payload as any).manualDealCount, 2);
  assert.equal((closed.event.payload as any).items[0].productId, 'product-1');
  assert.equal((closed.event.payload as any).items[0].price, 500);

  const stat: DailyStats = {
    id: 1,
    date: '2026-06-11',
    marketId: 'market-1',
    touchCount: -1,
    inquiryCount: 0,
    dealCount: Number.NaN,
    revenue: 1000,
    cost: undefined as unknown as number,
    profit: undefined as unknown as number,
    productsSold: [
      { productId: ' product-1 ', quantity: -2, revenue: Number.NaN },
      { productId: ' ', quantity: 1, revenue: 1 },
    ],
    updatedAt: Number.NaN,
  };

  const normalizedStat = canonicalizeDailyStat(stat);
  assert.equal(normalizedStat.changed, true);
  assert.equal(normalizedStat.stat.touchCount, 0);
  assert.equal(normalizedStat.stat.dealCount, 0);
  assert.equal(normalizedStat.stat.cost, 0);
  assert.equal(normalizedStat.stat.profit, 1000);
  assert.deepEqual(normalizedStat.stat.productsSold, [
    { productId: ' product-1 ', quantity: 0, revenue: 0 },
  ]);

  console.log('PASS data canonicalization helpers');
}

main();
