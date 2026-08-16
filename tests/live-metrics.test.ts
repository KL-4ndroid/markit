import assert from 'node:assert/strict';
import { calculateLiveMetrics } from '../lib/sales/live-metrics';
import type { Event } from '../types/db';

const TS = new Date('2026-06-11T12:00:00+08:00').getTime();

function event(overrides: Partial<Event>): Event {
  return {
    id: 'event-1',
    type: 'deal_closed',
    actor_id: 'owner-1',
    timestamp: TS,
    sync_status: 'synced',
    payload: {},
    ...overrides,
  } as Event;
}

function main(): void {
  const metrics = calculateLiveMetrics([
    event({
      id: 'deal-root',
      type: 'deal_closed',
      market_id: 'market-1',
      payload: {
        total_amount: 500,
        manual_deal_count: 2,
      },
    }),
    event({
      id: 'deal-payload-camel',
      type: 'deal_closed',
      payload: {
        marketId: 'market-1',
        manualRevenue: 300,
        manualDealCount: 1,
      },
    }),
    event({
      id: 'interaction-snake',
      type: 'interaction_recorded',
      payload: {
        market_id: 'market-1',
        type: 'touch',
      },
    }),
    event({
      id: 'other-market',
      type: 'deal_closed',
      market_id: 'market-2',
      payload: {
        totalAmount: 9999,
      },
    }),
  ], 'market-1');

  assert.equal(metrics.totalRevenue, 800);
  assert.equal(metrics.dealCount, 3);
  assert.equal(metrics.interactionCount, 1);
  assert.equal(metrics.averageOrderValue, 800 / 3);
  assert.equal(metrics.conversionRate, 75);

  assert.deepEqual(calculateLiveMetrics(undefined, 'market-1'), {
    totalRevenue: 0,
    dealCount: 0,
    interactionCount: 0,
    averageOrderValue: 0,
    conversionRate: 0,
  });

  console.log('PASS live metrics');
}

main();
