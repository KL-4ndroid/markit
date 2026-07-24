import assert from 'node:assert/strict';

import {
  composeAdvancedMarketMetricsViewModel,
  composeMarketMetricsViewModel,
  type MarketMetricItem,
} from '../lib/analytics/market-metrics-view-model';
import type { MarketMetrics } from '../lib/analytics/types';
import type { Market } from '../types/db';

function market(id: string): Market {
  return {
    id,
    name: id,
    location: 'Taipei',
    startDate: '2026-07-01',
    endDate: '2026-07-01',
    status: 'completed',
    registrationFee: 0,
    boothCost: 0,
    createdAt: 1,
    updatedAt: 1,
  };
}

function metrics(overrides: Partial<MarketMetrics>): MarketMetrics {
  return {
    uniqueEngaged: 10,
    totalDeals: 2,
    totalRevenue: 1000,
    totalProfit: 700,
    netProfit: 500,
    conversionRate: 0.2,
    conversionRateRaw: 0.2,
    aov: 500,
    hourlyProfit: 100,
    boothROI: 200,
    operatingHours: 5,
    totalFixedCost: 500,
    totalVariableCost: 0,
    behavior1Count: 0,
    behavior2Count: 0,
    behavior3Count: 0,
    derivedMetrics: { interactionValue: 100, dealQualityIndex: 100, efficiencyIndex: 10 },
    confidenceScore: 0.2,
    confidenceLevel: '低',
    isValidForQuadrant: true,
    ...overrides,
  };
}

const items: MarketMetricItem[] = [
  { market: market('steady'), marketId: 'steady', metrics: metrics({ hourlyProfit: 120, boothROI: 150, aov: 400 }) },
  { market: market('winner'), marketId: 'winner', metrics: metrics({ hourlyProfit: 200, boothROI: 300, aov: 350 }) },
  { market: market('high-aov'), marketId: 'high-aov', metrics: metrics({ hourlyProfit: 50, aov: 900, conversionRate: 0.4 }) },
  { market: market('loss'), marketId: 'loss', metrics: metrics({ netProfit: -10, hourlyProfit: -2, aov: 1200 }) },
];

const viewModel = composeMarketMetricsViewModel(items);
assert.deepEqual(viewModel.profitableRanking.map(item => item.marketId), ['winner', 'steady', 'high-aov']);
assert.deepEqual(viewModel.averageOrderValueRanking.map(item => item.marketId), ['loss', 'high-aov', 'steady', 'winner']);
assert.equal(viewModel.averageConversionRate, 0.25);

const advanced = composeAdvancedMarketMetricsViewModel(viewModel);
assert.equal(advanced.healthScores.some(score => score.marketId === 'loss'), false);
assert.equal(
  advanced.quadrants.stars.length
    + advanced.quadrants.potentials.length
    + advanced.quadrants.precisies.length
    + advanced.quadrants.observables.length,
  4,
);

console.log('PASS shared market metrics view model');
