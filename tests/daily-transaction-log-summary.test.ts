import assert from 'node:assert/strict';
import { summarizeDailyDealEvents } from '../lib/markets/daily-transaction-log-summary';
import type { DealClosedPayload, Event } from '../types/db';

let eventId = 0;

function deal(payload: Partial<DealClosedPayload>): Event<DealClosedPayload> {
  return {
    id: `deal-${eventId += 1}`,
    type: 'deal_closed',
    timestamp: new Date('2026-06-13T10:00:00+08:00').getTime(),
    payload: {
      market_id: 'market-1',
      totalAmount: 0,
      paymentMethod: 'cash',
      items: [],
      ...payload,
    },
  };
}

function main(): void {
  assert.deepEqual(summarizeDailyDealEvents([]), {
    revenue: 0,
    dealCount: 0,
  });

  assert.deepEqual(
    summarizeDailyDealEvents([
      deal({ totalAmount: 300 }),
      deal({ manualRevenue: 700, manualDealCount: 4 }),
      deal({ manual_revenue: 500, manual_deal_count: 2 } as Partial<DealClosedPayload>),
    ]),
    {
      revenue: 1500,
      dealCount: 7,
    }
  );

  console.log('PASS daily transaction log summary');
}

main();
