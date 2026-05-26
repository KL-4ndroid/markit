import assert from 'node:assert/strict';
import { buildActionableAnalytics } from '../lib/analytics/actionable-insights';
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

function manualDealEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'deal-1',
    type: 'deal_closed',
    market_id: 'market-1',
    timestamp,
    payload: {
      market_id: 'market-1',
      totalAmount: 3000,
      paymentMethod: 'cash',
      isManualEntry: true,
      manualRevenue: 3000,
      manualCost: 1200,
      manualDealCount: 1,
      items: [],
    },
    ...overrides,
  };
}

async function main(): Promise<void> {
  const summaryOnly = buildActionableAnalytics({
    markets: [market()],
    dailyStats: [dailyStat()],
    events: [manualDealEvent()],
  });

  assert.equal(summaryOnly.dataCompleteness.level, 'summary_only');
  assert.equal(summaryOnly.confidence, 'low');
  assert.equal(summaryOnly.productInsights.length, 0);
  assert.equal(summaryOnly.cards.some((card) => card.kind === 'product_suggestion' && card.blockedBy?.includes('product_level_sales')), true);
  assert.equal(summaryOnly.topAction.kind, 'market_decision');

  const costPressure = buildActionableAnalytics({
    markets: [
      market({
        totalRevenue: 2000,
        totalProfit: 1600,
        boothCost: 900,
        registrationFee: 200,
        tableRental: 200,
      }),
    ],
  });

  assert.equal(costPressure.topAction.kind, 'cost_pressure');
  assert.equal(costPressure.topAction.tone, 'warning');
  assert.match(costPressure.topAction.headline, /固定成本偏高/);

  const productDetail = buildActionableAnalytics({
    markets: [market({ totalDeals: 6 })],
    products: [product()],
    dailyStats: [
      dailyStat({
        dealCount: 6,
        productsSold: [{ productId: 'product-1', quantity: 8, revenue: 960 }],
      }),
    ],
  });

  assert.equal(productDetail.dataCompleteness.level, 'product_detail');
  assert.equal(productDetail.productInsights.length, 1);
  assert.equal(productDetail.productInsights[0].productName, 'Herbal Tea');
  assert.equal(productDetail.productInsights[0].action, 'restock');
  assert.equal(productDetail.cards.some((card) => card.kind === 'product_suggestion' && card.blockedBy === undefined), true);

  const mediumConfidence = buildActionableAnalytics({
    markets: [
      market({ id: 'market-1' }),
      market({ id: 'market-2' }),
      market({ id: 'market-3' }),
    ],
  });

  assert.equal(mediumConfidence.confidence, 'medium');

  const highConfidence = buildActionableAnalytics({
    markets: Array.from({ length: 8 }, (_, index) => market({ id: `market-${index + 1}` })),
  });

  assert.equal(highConfidence.confidence, 'high');

  console.log('PASS actionable analytics insight rules');
}

main().catch((error) => {
  console.error('FAIL actionable analytics insight rules');
  throw error;
});
