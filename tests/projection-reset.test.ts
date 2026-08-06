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

runTest('user-supplied scenario: cloud total 69822 + events total 69822 → replay 後仍是 69822 (不可 139644)', () => {
  // 還原使用者截圖的真實情境
  // 5/22 (15348) + 5/23 (54474) = 69822
  // 假設雲端 markets.total_revenue = 69822（雲端 handler 已累加）
  // 雲端有兩筆 deal_closed，總額也是 69822
  //
  // 修好前：hydrate 帶入 69822 → replay 69822 → 69822 + 69822 = 139,644（倍增）
  // 修好前另一條路：hydrate 帶入 69822（已污染）→ 不 replay → 仍是 69822 → 但與 dailyStats 不一致
  // 修好後：hydrate 帶入 0 → replay 69822 → 69822（正確）
  const cloudMarket: Market = {
    ...baseMarket,
    totalRevenue: 69822,
    totalDeals: 2,
  };
  const hydrated = resetMarketProjectionFields(cloudMarket);

  // 模擬 2 筆 deal_closed replay
  // 為簡化：把 2 筆合併成單一 totalAmount = 69822
  const eventsTotalAmount = 69822;
  const eventsTotalDealCount = 2;
  const replayedTotalRevenue = (hydrated.totalRevenue || 0) + eventsTotalAmount;
  const replayedTotalDeals = (hydrated.totalDeals || 0) + eventsTotalDealCount;

  assert.equal(replayedTotalRevenue, 69822, 'replay 後應等於雲端累積值（不能 139644）');
  assert.equal(replayedTotalDeals, 2, 'replay 後應等於雲端累積值');
  assert.notEqual(replayedTotalRevenue, 139644, '絕對不能倍增');
  assert.notEqual(replayedTotalRevenue, 146246, '絕對不能等於使用者截圖的 146246（已污染值）');
});

runTest('user-supplied scenario: 修好後本地修復後再 sync 不再污染', () => {
  // 還原使用者「本地修復可以暫時修正，但每一次重新抓取雲端資料後又會再次發生」症狀
  // 修好前：sync → hydrate 帶入雲端污染值 → 倍增 → 污染復發
  // 修好後：sync → hydrate reset 0 → replay 正確值 → 始終是雲端 events 累加值
  const cloudMarketPolluted: Market = {
    ...baseMarket,
    // 模擬雲端 markets 表本身有污染（owner 之前手動污染或多次 sync 累積）
    totalRevenue: 200000,
    totalDeals: 5,
  };
  const hydrated = resetMarketProjectionFields(cloudMarketPolluted);

  // 模擬雲端 events 真實累積是 69822
  const eventsTotalAmount = 69822;
  const eventsTotalDealCount = 2;
  const replayedTotalRevenue = (hydrated.totalRevenue || 0) + eventsTotalAmount;

  assert.equal(replayedTotalRevenue, 69822, '即使雲端本身污染，本地仍應是 events 真實累積值');
  assert.notEqual(replayedTotalRevenue, 200000, '不應被雲端污染值覆蓋');
  assert.notEqual(replayedTotalRevenue, 269822, '不應雲端 200000 + events 69822 累加');
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
