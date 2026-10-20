import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { calculateBasicProductRankingFromEvents } from '../lib/analytics/basic-product-ranking';
import { buildRecentMarketRevenuePreview } from '../lib/analytics/recent-market-revenue-preview';
import type { DealClosedPayload, Event, Market } from '../types/db';

const TS = Date.parse('2026-07-29T10:00:00+08:00');

function market(overrides: Partial<Market>): Market {
  return {
    id: 'market-default',
    name: 'Default Market',
    location: 'Taipei',
    startDate: '2026-07-01',
    endDate: '2026-07-01',
    status: 'completed',
    registrationFee: 0,
    boothCost: 0,
    totalRevenue: 0,
    createdAt: TS,
    updatedAt: TS,
    ...overrides,
  };
}

function deal(
  id: string,
  marketId: string,
  items: DealClosedPayload['items'],
  isManualEntry = false,
): Event<DealClosedPayload> {
  return {
    id,
    type: 'deal_closed',
    market_id: marketId,
    timestamp: TS,
    payload: {
      marketId,
      paymentMethod: 'cash',
      totalAmount: 0,
      items,
      is_manual_entry: isManualEntry,
    } as DealClosedPayload,
  };
}

async function main(): Promise<void> {
  const preview = buildRecentMarketRevenuePreview([
    market({ id: 'm4', name: 'Fourth', startDate: '2026-07-22', totalRevenue: 4000 }),
    market({ id: 'm1', name: 'First', startDate: '2026-07-01', totalRevenue: 1000 }),
    market({ id: 'm3', name: 'Third', startDate: '2026-07-15', totalRevenue: 3000 }),
    market({ id: 'm2', name: 'Second', startDate: '2026-07-08', totalRevenue: 2000 }),
    market({ id: 'cancelled', status: 'cancelled', startDate: '2026-07-29', totalRevenue: 99999 }),
  ]);

  assert.deepEqual(preview.points.map(point => point.marketId), ['m2', 'm3', 'm4']);
  assert.equal(preview.direction, 'up');
  assert.match(preview.summary, /增加/);
  assert.deepEqual(
    Object.keys(preview.points[0]).sort(),
    ['date', 'marketId', 'marketName', 'revenue'],
  );

  const ranking = await calculateBasicProductRankingFromEvents(
    [
      deal('d1', 'm2', [
        {
          product_id: 'product-a',
          product_name: '商品 A',
          quantity: 3,
          price_at_time_of_sale: 1,
          cost_at_time_of_sale: 9999,
        } as never,
        {
          productId: 'product-b',
          quantity: 2,
          price: 99999,
          cost: 0,
        } as never,
      ]),
      deal('manual', 'm2', [], true),
      deal('other-market', 'm9', [{ product_id: 'product-z', quantity: 999 } as never]),
    ],
    new Set(['m2']),
    async productId => productId === 'product-b' ? '商品 B' : undefined,
  );

  assert.deepEqual(ranking, { productName: '商品 A', quantity: 3 });

  const root = join(__dirname, '..');
  const rankingSource = readFileSync(join(root, 'lib/analytics/basic-product-ranking.ts'), 'utf8');
  const previewComponentSource = readFileSync(
    join(root, 'components/analytics/RecentMarketRevenuePreview.tsx'),
    'utf8',
  );
  const manifestSource = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');

  assert.doesNotMatch(rankingSource, /getDealItemPrice|getDealItemCost|revenue|profit/i);
  assert.doesNotMatch(previewComponentSource, /淨利|固定成本|下一步/);
  assert.match(manifestSource, /tsx tests\/analytics-free-preview\.test\.ts/);

  console.log('PASS Free recent-three analytics preview');
}

main().catch(error => {
  console.error('FAIL Free recent-three analytics preview');
  throw error;
});
