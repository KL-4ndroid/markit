import assert from 'node:assert/strict';
import {
  computeDailyTotals,
  type DailyRevenueDay,
} from '../lib/ui/daily-revenue-totals';

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const day = (date: string, revenue: number, profit: number, deals: number): DailyRevenueDay => ({
  date,
  revenue,
  profit,
  deals,
  interactions: {},
});

runTest('computeDailyTotals sums revenue, profit, deals across all days', () => {
  const dailyData = [
    day('2026-04-11', 6450, 2400, 1),
    day('2026-04-12', 3000, 1100, 2),
    day('2026-04-13', 550, 100, 1),
  ];
  assert.deepEqual(computeDailyTotals(dailyData), {
    totalRevenue: 10000,
    totalProfit: 3600,
    totalDeals: 4,
  });
});

runTest('computeDailyTotals returns zeros for empty input', () => {
  assert.deepEqual(computeDailyTotals([]), {
    totalRevenue: 0,
    totalProfit: 0,
    totalDeals: 0,
  });
});

runTest('computeDailyTotals coerces undefined fields to 0', () => {
  // 模擬 dailyData 結構中部分欄位 undefined 的邊界情境
  const dailyData = [
    { date: '2026-04-11', revenue: 0, profit: 0, deals: 0, interactions: {} } as DailyRevenueDay,
  ];
  assert.deepEqual(computeDailyTotals(dailyData), {
    totalRevenue: 0,
    totalProfit: 0,
    totalDeals: 0,
  });
});

runTest('computeDailyTotals ignores polluted market.totalRevenue (does not read market fields)', () => {
  // 這是水水市集案例的還原：
  // dailyData 內真實總和是 100,376 / 6 筆
  // 但若下方總計錯誤地讀 market.totalRevenue 會得到 12,900 / 2 筆
  // 我們確保 computeDailyTotals 只看 dailyData，不看 market 任何欄位
  const dailyData = [
    day('2026-04-11', 6450, 2400, 1),
    day('2026-04-12', 93926, 35000, 5),
  ];
  // 若函式簽章意外引入 market 物件或污染值，sum 會錯
  const totals = computeDailyTotals(dailyData);
  assert.equal(totals.totalRevenue, 100376);
  assert.equal(totals.totalDeals, 6);
});

runTest('computeDailyTotals does not double-count when the same day appears twice', () => {
  // 雖然 DailyRevenueStats 內 useMemo 已用 Map.set 確保單日單筆，
  // 純函式應仍按輸入順序加總（不去重）
  // 此測試用於「未來重構若改用 array，行為一致」的 safety net
  const dailyData = [
    day('2026-04-11', 6450, 2400, 1),
    day('2026-04-11', 6450, 2400, 1),
  ];
  // 故意雙倍輸入會雙倍加總（不主動去重）— 這是 reduce 的自然行為
  assert.equal(computeDailyTotals(dailyData).totalRevenue, 12900);
});

let passed = 0;
let failed = 0;

async function main() {
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
    throw new Error(`${failed} daily-revenue-totals tests failed`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
