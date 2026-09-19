import assert from 'node:assert/strict';
import { buildProductRecommendations } from '../lib/analytics/product-recommendations';
import type { DailyStats, Product } from '../types/db';

const timestamp = new Date('2026-01-10T10:00:00+08:00').getTime();

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Herbal Tea',
    category: 'food',
    price: 120,
    cost: 40,
    stock: 2,
    isActive: true,
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
    revenue: 0,
    cost: 0,
    profit: 0,
    productsSold: [],
    updatedAt: timestamp,
    ...overrides,
  };
}

async function main(): Promise<void> {
  const empty = buildProductRecommendations({
    dailyStats: [],
    products: [],
    confidence: 'low',
  });
  assert.equal(empty.length, 0);

  const restock = buildProductRecommendations({
    dailyStats: [
      dailyStat({
        productsSold: [{ productId: 'product-1', quantity: 8, revenue: 960 }],
      }),
    ],
    products: [product({ stock: 2 })],
    confidence: 'medium',
  });
  assert.equal(restock.length, 1);
  assert.equal(restock[0].productName, 'Herbal Tea');
  assert.equal(restock[0].action, 'restock');
  assert.equal(restock[0].isEstimated, false);

  const estimatedRestock = buildProductRecommendations({
    dailyStats: [
      dailyStat({
        productsSold: [{ productId: 'product-1', quantity: 8, revenue: 960 }],
      }),
    ],
    products: [product({ stock: undefined })],
    confidence: 'medium',
  });
  assert.equal(estimatedRestock[0].action, 'restock');
  assert.equal(estimatedRestock[0].isEstimated, true);
  assert.match(estimatedRestock[0].estimatedReason ?? '', /庫存/);

  const promoteUnlimited = buildProductRecommendations({
    dailyStats: [
      dailyStat({
        productsSold: [{ productId: 'product-1', quantity: 8, revenue: 960 }],
      }),
    ],
    products: [product({ unlimitedStock: true, stock: undefined })],
    confidence: 'medium',
  });
  assert.equal(promoteUnlimited[0].action, 'promote');

  const watch = buildProductRecommendations({
    dailyStats: [
      dailyStat({
        productsSold: [{ productId: 'product-1', quantity: 1, revenue: 120 }],
      }),
    ],
    products: [product({ stock: 20 })],
    confidence: 'low',
  });
  assert.equal(watch[0].action, 'watch');

  const mergedAndSorted = buildProductRecommendations({
    dailyStats: [
      dailyStat({
        productsSold: [
          { productId: 'product-2', quantity: 2, revenue: 300 },
          { productId: 'product-1', quantity: 3, revenue: 360 },
        ],
      }),
      dailyStat({
        id: 2,
        productsSold: [
          { productId: 'product-2', quantity: 4, revenue: 600 },
          { productId: ' ', quantity: 9, revenue: 999 },
        ],
      }),
    ],
    products: [
      product({ id: 'product-1', name: 'Herbal Tea' }),
      product({ id: 'product-2', name: 'Cookie Set', stock: 0 }),
    ],
    confidence: 'high',
  });
  assert.equal(mergedAndSorted.length, 2);
  assert.equal(mergedAndSorted[0].productId, 'product-2');
  assert.equal(mergedAndSorted[0].quantity, 6);
  assert.equal(mergedAndSorted[1].productId, 'product-1');

  console.log('PASS product recommendation rules');
}

main().catch((error) => {
  console.error('FAIL product recommendation rules');
  throw error;
});
