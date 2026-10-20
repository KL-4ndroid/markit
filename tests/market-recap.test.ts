import assert from 'node:assert/strict';
import { buildMarketRecapReport } from '../lib/analytics/market-recap';
import type { DailyStats, Event, Market, Product } from '../types/db';

const timestamp = new Date('2026-01-10T10:00:00+08:00').getTime();

function market(overrides: Partial<Market> = {}): Market {
  return {
    id: 'market-1',
    name: 'Weekend Market',
    location: 'Taipei',
    startDate: '2026-01-10',
    endDate: '2026-01-10',
    status: 'completed',
    registrationFee: 100,
    boothCost: 500,
    totalRevenue: 3000,
    totalProfit: 1800,
    totalDeals: 0,
    totalInteractions: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function dailyStat(overrides: Partial<DailyStats> = {}): DailyStats {
  return {
    id: 1,
    date: '2026-01-10',
    marketId: 'market-1',
    touchCount: 0,
    inquiryCount: 0,
    dealCount: 0,
    revenue: 3000,
    cost: 1200,
    profit: 1800,
    productsSold: [],
    updatedAt: timestamp,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Herbal Tea',
    category: 'food',
    price: 120,
    cost: 40,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function interactionEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'interaction-1',
    type: 'interaction_recorded',
    market_id: 'market-1',
    timestamp,
    payload: {
      market_id: 'market-1',
      type: 'inquiry',
    },
    ...overrides,
  };
}

function dealEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'deal-1',
    type: 'deal_closed',
    market_id: 'market-1',
    timestamp: timestamp + 1,
    payload: {
      market_id: 'market-1',
      totalAmount: 960,
      paymentMethod: 'cash',
      items: [{ productId: 'product-1', quantity: 8, price: 120 }],
    },
    ...overrides,
  };
}

async function main(): Promise<void> {
  const emptyReport = buildMarketRecapReport({});

  assert.equal(emptyReport.resultLabel, 'not_enough_data');
  assert.equal(emptyReport.dataLevel, 'summary_only');
  assert.equal(emptyReport.confidence, 'low');
  assert.equal(emptyReport.opportunities.some((text) => text.includes('商品層級資料不足')), true);

  const strongSummaryReport = buildMarketRecapReport({
    markets: [market()],
    dailyStats: [dailyStat()],
  });

  assert.equal(strongSummaryReport.resultLabel, 'strong');
  assert.equal(strongSummaryReport.dataLevel, 'summary_only');
  assert.equal(strongSummaryReport.title, 'Weekend Market 回顧');
  assert.equal(strongSummaryReport.highlights.length > 0, true);
  assert.equal(strongSummaryReport.opportunities.some((text) => text.includes('商品層級資料不足')), true);

  const costPressureReport = buildMarketRecapReport({
    markets: [
      market({
        totalRevenue: 2000,
        totalProfit: 1600,
        boothCost: 1000,
        registrationFee: 300,
      }),
    ],
  });

  assert.equal(costPressureReport.resultLabel, 'watch');
  assert.equal(costPressureReport.opportunities.some((text) => text.includes('成本')), true);

  const productReport = buildMarketRecapReport({
    markets: [market({ totalDeals: 8, totalInteractions: 2 })],
    products: [product()],
    events: [interactionEvent(), dealEvent()],
    dailyStats: [
      dailyStat({
        dealCount: 8,
        touchCount: 2,
        productsSold: [{ productId: 'product-1', quantity: 8, revenue: 960 }],
      }),
    ],
  });

  assert.equal(productReport.dataLevel, 'full_behavior');
  assert.equal(productReport.highlights.some((text) => text.includes('Herbal Tea')), true);
  assert.equal(productReport.nextActions.length > 0, true);

  const multiMarketReport = buildMarketRecapReport({
    markets: [market({ id: 'market-1' }), market({ id: 'market-2', name: 'Second Market' })],
  });

  assert.equal(multiMarketReport.title, '市集回顧：2 場');

  console.log('PASS market recap rules');
}

main().catch((error) => {
  console.error('FAIL market recap rules');
  throw error;
});
