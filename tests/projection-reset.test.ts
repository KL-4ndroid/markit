import assert from 'node:assert/strict';
import {
  resetMarketProjectionFields,
  resetProductProjectionFields,
  MARKET_ACCUMULATIVE_PROJECTION_FIELDS,
  PRODUCT_ACCUMULATIVE_PROJECTION_FIELDS,
} from '../lib/sync/projection-reset';
import type { Market, Product } from '../types/db';

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const baseMarket: Market = {
  id: 'market-1',
  name: '水水市集',
  location: '台北市信義區',
  startDate: '2026-04-11',
  endDate: '2026-04-13',
  status: 'paid',
  operationPhase: 'closing',
  createdAt: 1000,
  updatedAt: 2000,
  totalRevenue: 999999,
  totalProfit: 500000,
  totalDeals: 88,
  totalInteractions: 250,
  registrationFee: 1000,
  boothCost: 500,
};

const baseProduct: Product = {
  id: 'product-1',
  name: '手工飾品',
  category: 'accessory',
  price: 350,
  cost: 100,
  isActive: true,
  createdAt: 1000,
  updatedAt: 2000,
  stock: 50,
  totalSold: 30,
};

runTest('resetMarketProjectionFields clears totalRevenue/totalProfit/totalDeals/totalInteractions', () => {
  const result = resetMarketProjectionFields({ ...baseMarket });
  assert.equal(result.totalRevenue, 0);
  assert.equal(result.totalProfit, 0);
  assert.equal(result.totalDeals, 0);
  assert.equal(result.totalInteractions, 0);
});

runTest('resetMarketProjectionFields preserves all other market fields', () => {
  const result = resetMarketProjectionFields({ ...baseMarket });
  assert.equal(result.id, 'market-1');
  assert.equal(result.name, '水水市集');
  assert.equal(result.startDate, '2026-04-11');
  assert.equal(result.endDate, '2026-04-13');
  assert.equal(result.status, 'paid');
  assert.equal(result.registrationFee, 1000);
  assert.equal(result.boothCost, 500);
  assert.equal(result.createdAt, 1000);
  assert.equal(result.updatedAt, 2000);
});

runTest('resetMarketProjectionFields does not mutate the input', () => {
  const input: Market = { ...baseMarket };
  const originalRevenue = input.totalRevenue;
  resetMarketProjectionFields(input);
  assert.equal(input.totalRevenue, originalRevenue, 'input should not be mutated');
});

runTest('resetMarketProjectionFields returns null/undefined unchanged', () => {
  assert.equal(resetMarketProjectionFields(null), null);
  assert.equal(resetMarketProjectionFields(undefined), undefined);
});

runTest('resetMarketProjectionFields clears all fields declared in MARKET_ACCUMULATIVE_PROJECTION_FIELDS', () => {
  // 安全網：若未來新增累加型欄位到清單，測試自動覆蓋
  const dirty: Market = { ...baseMarket };
  for (const field of MARKET_ACCUMULATIVE_PROJECTION_FIELDS) {
    (dirty as unknown as Record<string, unknown>)[field] = 999;
  }
  const result = resetMarketProjectionFields(dirty);
  for (const field of MARKET_ACCUMULATIVE_PROJECTION_FIELDS) {
    assert.equal(
      (result as unknown as Record<string, unknown>)[field],
      0,
      `${field} should be reset to 0`
    );
  }
});

runTest('resetProductProjectionFields clears totalSold but preserves stock', () => {
  const result = resetProductProjectionFields({ ...baseProduct });
  assert.equal(result.totalSold, 0, 'totalSold 應被歸零');
  assert.equal(result.stock, 50, 'stock 應保留（雲端 truth source）');
});

runTest('resetProductProjectionFields preserves all other product fields', () => {
  const result = resetProductProjectionFields({ ...baseProduct });
  assert.equal(result.id, 'product-1');
  assert.equal(result.name, '手工飾品');
  assert.equal(result.price, 350);
  assert.equal(result.cost, 100);
  assert.equal(result.isActive, true);
  assert.equal(result.createdAt, 1000);
  assert.equal(result.updatedAt, 2000);
});

runTest('resetProductProjectionFields does not mutate the input', () => {
  const input: Product = { ...baseProduct };
  const originalTotalSold = input.totalSold;
  resetProductProjectionFields(input);
  assert.equal(input.totalSold, originalTotalSold, 'input should not be mutated');
});

runTest('resetProductProjectionFields returns null/undefined unchanged', () => {
  assert.equal(resetProductProjectionFields(null), null);
  assert.equal(resetProductProjectionFields(undefined), undefined);
});

runTest('resetProductProjectionFields clears all fields declared in PRODUCT_ACCUMULATIVE_PROJECTION_FIELDS', () => {
  const dirty: Product = { ...baseProduct };
  for (const field of PRODUCT_ACCUMULATIVE_PROJECTION_FIELDS) {
    (dirty as unknown as Record<string, unknown>)[field] = 999;
  }
  const result = resetProductProjectionFields(dirty);
  for (const field of PRODUCT_ACCUMULATIVE_PROJECTION_FIELDS) {
    assert.equal(
      (result as unknown as Record<string, unknown>)[field],
      0,
      `${field} should be reset to 0`
    );
  }
  // stock 不在 PRODUCT_ACCUMULATIVE_PROJECTION_FIELDS 中
  assert.equal(result.stock, 50, 'stock must never be reset by this function');
});

runTest('(integration) water market scenario: replay N events yields N-event total, not 2N', () => {
  // 還原水水市集案例：
  // 雲端 markets.total_revenue = 100,376 (6 筆 deal_closed 累加)
  // 雲端 events 6 筆 deal_closed（replay 時會一筆一筆 handler 跑）
  //
  // 修好前：hydrate 帶入 100,376 → 6 次 replay 後 market.totalRevenue = 100,376 + 100,376 = 200,752
  // 修好後：hydrate reset → market.totalRevenue = 0 → 6 次 replay 後 = 100,376
  const cloudMarket: Market = {
    ...baseMarket,
    totalRevenue: 100376,
    totalDeals: 6,
  };
  const hydrated = resetMarketProjectionFields(cloudMarket);

  // 模擬 6 筆 deal_closed replay（events.ts:850 的 (market.totalRevenue || 0) + totalAmount）
  // 為簡化：把 6 筆合併成單一 totalAmount = 100,376，總 dealCount = 6
  const totalAmountSum = 100376;
  const totalDealCount = 6;
  const replayedTotalRevenue = (hydrated.totalRevenue || 0) + totalAmountSum;
  const replayedTotalDeals = (hydrated.totalDeals || 0) + totalDealCount;

  assert.equal(replayedTotalRevenue, 100376, 'replay 後應等於雲端累積值（不倍增）');
  assert.equal(replayedTotalDeals, 6, 'replay 後應等於雲端累積值');
});

runTest('(integration) two consecutive sync cycles do not inflate totals', () => {
  // 模擬用戶重複按「立即同步」：第二次 sync 不應倍增
  // 情境：本地已有 1 筆 deal_closed event 已被 replay → market.totalRevenue = 1000
  // 用戶再按一次 sync，但無新 events
  // 修好前：hydrate 帶入 1000 → 對同 1 筆 event「replay 一次」（依 syncEventsToIndexedDB 實作而異）→ 可能 2000
  // 修好後：hydrate 帶入 reset 過的 0 → 對同 1 筆 event 若有重 replay，總和仍是 1000
  const cloudMarket: Market = {
    ...baseMarket,
    totalRevenue: 1000,
    totalDeals: 1,
  };
  const first = resetMarketProjectionFields(cloudMarket);
  // 假設 1 筆 deal_closed totalAmount=1000 → market.totalRevenue = 1000
  const afterFirstSync = (first.totalRevenue || 0) + 1000;
  assert.equal(afterFirstSync, 1000);

  // 第二次 sync：同樣從雲端拉，hydrate reset 0，再 replay 同一筆
  // （實際 handler 內 dedupe 由 syncEventsToIndexedDB / existingIds 處理，
  //   這裡只驗證「即使重 replay，projection 仍是 1000，不會倍增」）
  const second = resetMarketProjectionFields({ ...cloudMarket, totalRevenue: afterFirstSync });
  const afterSecondSync = (second.totalRevenue || 0) + 1000;
  assert.equal(afterSecondSync, 1000, '重複 sync 不應倍增');
});

async function main() {
  let passed = 0;
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
      passed++;
    } catch (error) {
      console.error(`FAIL ${name}`);
      console.error(error);
      failed++;
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    throw new Error(`${failed} projection-reset tests failed`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
