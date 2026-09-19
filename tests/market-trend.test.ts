import assert from 'node:assert/strict';
import { buildMarketTrend } from '../lib/analytics/market-trend';
import type { Market } from '../types/db';

const timestamp = new Date('2026-01-01T10:00:00+08:00').getTime();

function market(overrides: Partial<Market> = {}): Market {
  return {
    id: 'market-1',
    name: 'Weekend Market',
    location: 'Taipei',
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    status: 'completed',
    registrationFee: 100,
    boothCost: 500,
    totalRevenue: 3000,
    totalProfit: 1800,
    totalDeals: 12,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

async function main(): Promise<void> {
  const emptyTrend = buildMarketTrend([]);
  assert.equal(emptyTrend.direction, 'not_enough_data');
  assert.equal(emptyTrend.points.length, 0);

  const singleTrend = buildMarketTrend([
    market({
      id: 'market-1',
      startDate: '2026-01-10',
      totalRevenue: 3000,
      totalProfit: 1800,
    }),
  ]);
  assert.equal(singleTrend.direction, 'not_enough_data');
  assert.equal(singleTrend.points.length, 1);

  const improvingTrend = buildMarketTrend([
    market({
      id: 'market-1',
      startDate: '2026-01-01',
      totalRevenue: 2500,
      totalProfit: 1200,
    }),
    market({
      id: 'market-2',
      startDate: '2026-01-08',
      totalRevenue: 6000,
      totalProfit: 4200,
    }),
  ]);
  assert.equal(improvingTrend.direction, 'improving');

  const decliningTrend = buildMarketTrend([
    market({
      id: 'market-1',
      startDate: '2026-01-01',
      totalRevenue: 6000,
      totalProfit: 4200,
    }),
    market({
      id: 'market-2',
      startDate: '2026-01-08',
      totalRevenue: 2500,
      totalProfit: 1200,
    }),
  ]);
  assert.equal(decliningTrend.direction, 'declining');

  const flatTrend = buildMarketTrend([
    market({
      id: 'market-1',
      startDate: '2026-01-01',
      totalRevenue: 4000,
      totalProfit: 2500,
    }),
    market({
      id: 'market-2',
      startDate: '2026-01-08',
      totalRevenue: 4200,
      totalProfit: 2600,
    }),
  ]);
  assert.equal(flatTrend.direction, 'flat');

  const unorderedTrend = buildMarketTrend([
    market({
      id: 'market-late',
      name: 'Late Market',
      startDate: '2026-02-01',
      totalRevenue: 6000,
      totalProfit: 4200,
    }),
    market({
      id: 'market-early',
      name: 'Early Market',
      startDate: '2026-01-01',
      totalRevenue: 2000,
      totalProfit: 1200,
    }),
  ]);
  assert.equal(unorderedTrend.points[0].marketId, 'market-early');
  assert.equal(unorderedTrend.points[1].marketId, 'market-late');

  const ignoredTrend = buildMarketTrend([
    market({ id: 'cancelled', status: 'cancelled', totalRevenue: 10000, totalProfit: 9000 }),
    market({ id: 'deleted', isDeleted: true, totalRevenue: 10000, totalProfit: 9000 }),
    market({ id: 'no-revenue', totalRevenue: 0, totalProfit: 0 }),
  ]);
  assert.equal(ignoredTrend.points.length, 0);

  console.log('PASS market trend analytics');
}

main().catch((error) => {
  console.error('FAIL market trend analytics');
  throw error;
});
