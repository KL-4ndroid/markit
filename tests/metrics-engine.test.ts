import assert from 'node:assert/strict';
import { calculateMarketMetrics } from '../lib/analytics/metrics-engine';
import type { DealClosedPayload, Event, Market } from '../types/db';

function deal(id: string, marketId: string, payload: Partial<DealClosedPayload> = {}): Event<DealClosedPayload> {
  return {
    id,
    type: 'deal_closed',
    market_id: marketId,
    actor_id: 'actor-1',
    timestamp: new Date('2026-06-11T00:00:00.000Z').getTime(),
    payload: {
      market_id: marketId,
      paymentMethod: 'cash',
      totalAmount: 0,
      items: [],
      ...payload,
    } as DealClosedPayload,
  };
}

function market(id: string, totalDeals: number): Market {
  return {
    id,
    name: id,
    location: 'Test',
    startDate: '2026-06-11',
    endDate: '2026-06-11',
    status: 'completed',
    totalRevenue: 1200,
    totalProfit: 1200,
    totalDeals,
    totalInteractions: 20,
    registrationFee: 0,
    boothCost: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as unknown as Market;
}

function makeDb(currentDeals: Event<DealClosedPayload>[], historicalDeals: Event<DealClosedPayload>[]) {
  return {
    events: {
      where: () => ({
        anyOf: () => ({
          and: () => ({
            toArray: async () => historicalDeals,
          }),
        }),
        equals: () => ({
          and: () => ({
            toArray: async () => currentDeals,
          }),
        }),
      }),
    },
  } as any;
}

async function run() {
  const currentMarket = market('market-current', 2);
  const historyMarket = market('market-history', 10);
  const historicalDeals = Array.from({ length: 10 }, (_, index) =>
    deal(`history-${index}`, 'market-history', {
      totalAmount: 100,
      items: [{ productId: `p-${index}`, quantity: 1, price: 100 } as any],
      isBackfill: false,
      isManualEntry: false,
    })
  );
  const currentDeals = [
    deal('current-batch', 'market-current', {
      totalAmount: undefined,
      total_amount: 1200,
      is_backfill: true,
      is_manual_entry: true,
      manual_deal_count: 2,
    } as Partial<DealClosedPayload>),
  ];

  const metrics = await calculateMarketMetrics(currentMarket, {
    useCache: false,
    allMarkets: [currentMarket, historyMarket],
    db: makeDb(currentDeals, historicalDeals),
  });

  assert.equal(metrics.totalDeals, 12);
  assert.equal(metrics.batchEntryWarnings?.[0]?.originalDealCount, 2);
  assert.equal(metrics.batchEntryWarnings?.[0]?.estimatedDealCount, 12);
  console.log('PASS metrics engine uses shared deal count helper for batch correction');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
