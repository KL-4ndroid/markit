import assert from 'node:assert/strict';
import { analyzeDataCompleteness } from '../lib/analytics/data-completeness';
import type { DailyStats, Event, Market } from '../types/db';

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
    totalProfit: 1200,
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
    cost: 1000,
    profit: 2000,
    productsSold: [],
    updatedAt: timestamp,
    ...overrides,
  };
}

function dealEvent(overrides: Partial<Event<any>> = {}): Event<any> {
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
      manualCost: 1000,
      manualDealCount: 1,
      items: [],
    },
    ...overrides,
  };
}

function interactionEvent(overrides: Partial<Event<any>> = {}): Event<any> {
  return {
    id: 'interaction-1',
    type: 'interaction_recorded',
    market_id: 'market-1',
    timestamp: timestamp + 1,
    payload: {
      market_id: 'market-1',
      type: 'inquiry',
    },
    ...overrides,
  };
}

async function main(): Promise<void> {
  const summaryOnly = analyzeDataCompleteness({
    markets: [market()],
    events: [dealEvent()],
    dailyStats: [dailyStat()],
  });

  assert.equal(summaryOnly.level, 'summary_only');
  assert.equal(summaryOnly.capabilities.marketPerformance, true);
  assert.equal(summaryOnly.capabilities.costPressure, true);
  assert.equal(summaryOnly.capabilities.rejoinGuidance, true);
  assert.equal(summaryOnly.capabilities.productRanking, false);
  assert.equal(summaryOnly.capabilities.restockSuggestion, false);
  assert.equal(summaryOnly.capabilities.pricingSuggestion, false);
  assert.equal(summaryOnly.capabilities.interactionConversion, false);
  assert.equal(summaryOnly.capabilities.timeOfDayInsight, false);
  assert.ok(summaryOnly.missingSignals.includes('product_level_sales'));

  const transactionAmount = analyzeDataCompleteness({
    markets: [market({ totalDeals: 3 })],
    dailyStats: [dailyStat({ dealCount: 3 })],
  });

  assert.equal(transactionAmount.level, 'transaction_amount');
  assert.equal(transactionAmount.capabilities.averageOrderValue, true);
  assert.equal(transactionAmount.capabilities.productRanking, false);

  const productDetail = analyzeDataCompleteness({
    markets: [market({ totalDeals: 2 })],
    events: [
      dealEvent({
        payload: {
          market_id: 'market-1',
          totalAmount: 500,
          paymentMethod: 'cash',
          items: [
            {
              productId: 'product-1',
              quantity: 2,
              price: 250,
            },
          ],
        },
      }),
    ],
    dailyStats: [
      dailyStat({
        dealCount: 2,
        productsSold: [{ productId: 'product-1', quantity: 2, revenue: 500 }],
      }),
    ],
  });

  assert.equal(productDetail.level, 'product_detail');
  assert.equal(productDetail.capabilities.productRanking, true);
  assert.equal(productDetail.capabilities.restockSuggestion, true);
  assert.equal(productDetail.capabilities.pricingSuggestion, true);
  assert.equal(productDetail.capabilities.interactionConversion, false);

  const fullBehavior = analyzeDataCompleteness({
    markets: [market({ totalDeals: 2, totalInteractions: 1 })],
    events: [
      interactionEvent(),
      dealEvent({
        id: 'deal-2',
        timestamp: timestamp + 2,
        payload: {
          market_id: 'market-1',
          totalAmount: 500,
          paymentMethod: 'cash',
          items: [
            {
              productId: 'product-1',
              quantity: 2,
              price: 250,
            },
          ],
        },
      }),
    ],
    dailyStats: [
      dailyStat({
        dealCount: 2,
        touchCount: 1,
        productsSold: [{ productId: 'product-1', quantity: 2, revenue: 500 }],
      }),
    ],
  });

  assert.equal(fullBehavior.level, 'full_behavior');
  assert.equal(fullBehavior.capabilities.interactionConversion, true);
  assert.equal(fullBehavior.capabilities.timeOfDayInsight, true);

  const emptyData = analyzeDataCompleteness({});

  assert.equal(emptyData.level, 'summary_only');
  assert.equal(emptyData.capabilities.marketPerformance, false);
  assert.equal(emptyData.capabilities.costPressure, false);
  assert.equal(emptyData.capabilities.averageOrderValue, false);

  console.log('PASS analytics data completeness rules');
}

main().catch((error) => {
  console.error('FAIL analytics data completeness rules');
  throw error;
});
