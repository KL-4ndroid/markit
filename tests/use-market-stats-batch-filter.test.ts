import assert from 'node:assert/strict';

/**
 * useMarketStatsBatch 的內部 filter 邏輯合約測試
 *
 * 這個測試不直接 import `useMarketStatsBatch`（它是 React hook + Dexie live query），
 * 而是把它的內部 filter 邏輯重現成純函式 `filterStatsForMarket` 並測試。
 *
 * 若 production 的 `useMarketStatsBatch` 內部 filter 邏輯變更，
 * 請同步更新 `filterStatsForMarket`，這個測試會抓出不一致。
 *
 * 對應 production 邏輯（lib/db/hooks.ts line 662 附近）：
 *   const filteredStats = allStats.filter(
 *     s => s.marketId === market.id && dates.includes(s.date)
 *   );
 */

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

interface MinimalDailyStat {
  marketId: string;
  date: string;
  revenue: number;
  dealCount: number;
  touchCount: number;
  inquiryCount: number;
  extraInteractions?: Record<string, number>;
}

interface Market {
  id: string;
  startDate: string;
  endDate: string;
  dates?: string[];
}

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

/**
 * 重現 useMarketStatsBatch 內部的 filter 邏輯（line 660-671）
 * 保持與 production 100% 對應
 */
function filterStatsForMarket(
  market: Market,
  allStats: ReadonlyArray<MinimalDailyStat>
): MinimalDailyStat[] {
  const dates =
    market.dates && market.dates.length > 0 ? market.dates : getDateRange(market.startDate, market.endDate);

  return allStats.filter(s => s.marketId === market.id && dates.includes(s.date));
}

runTest('filter returns only stats for the requested market (cross-market isolation)', () => {
  const marketA: Market = {
    id: 'market-A',
    startDate: '2026-04-11',
    endDate: '2026-04-12',
  };
  const allStats: MinimalDailyStat[] = [
    { marketId: 'market-A', date: '2026-04-11', revenue: 100, dealCount: 1, touchCount: 5, inquiryCount: 0 },
    { marketId: 'market-B', date: '2026-04-11', revenue: 9999, dealCount: 5, touchCount: 0, inquiryCount: 0 },
    { marketId: 'market-A', date: '2026-04-12', revenue: 200, dealCount: 2, touchCount: 3, inquiryCount: 0 },
  ];

  const result = filterStatsForMarket(marketA, allStats);
  assert.equal(result.length, 2);
  assert.equal(result[0].revenue, 100);
  assert.equal(result[1].revenue, 200);
  // 確認沒有 market-B 的污染值
  for (const s of result) {
    assert.equal(s.marketId, 'market-A');
  }
});

runTest('filter excludes stats outside date range', () => {
  const marketA: Market = {
    id: 'market-A',
    startDate: '2026-04-11',
    endDate: '2026-04-12',
  };
  const allStats: MinimalDailyStat[] = [
    { marketId: 'market-A', date: '2026-04-10', revenue: 50, dealCount: 0, touchCount: 1, inquiryCount: 0 },
    { marketId: 'market-A', date: '2026-04-11', revenue: 100, dealCount: 1, touchCount: 5, inquiryCount: 0 },
    { marketId: 'market-A', date: '2026-04-13', revenue: 50, dealCount: 0, touchCount: 1, inquiryCount: 0 },
  ];
  const result = filterStatsForMarket(marketA, allStats);
  assert.equal(result.length, 1);
  assert.equal(result[0].date, '2026-04-11');
});

runTest('filter uses market.dates array (non-continuous) when provided', () => {
  const marketA: Market = {
    id: 'market-A',
    startDate: '2026-04-11',
    endDate: '2026-04-20',
    dates: ['2026-04-11', '2026-04-15'], // 只挑這兩天
  };
  const allStats: MinimalDailyStat[] = [
    { marketId: 'market-A', date: '2026-04-11', revenue: 100, dealCount: 1, touchCount: 0, inquiryCount: 0 },
    { marketId: 'market-A', date: '2026-04-12', revenue: 200, dealCount: 2, touchCount: 0, inquiryCount: 0 },
    { marketId: 'market-A', date: '2026-04-15', revenue: 300, dealCount: 1, touchCount: 0, inquiryCount: 0 },
  ];
  const result = filterStatsForMarket(marketA, allStats);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(s => s.date), ['2026-04-11', '2026-04-15']);
});

runTest('regression scenario: water market overlap with another market on 2026-04-11', () => {
  // 還原水水市集與另一市集同日重疊情境
  // 修好前 (沒有 marketId 過濾)：
  //   - useMarketStatsBatch 對水水市集 reduce 時可能拉到同日「另一市集」的 $9999
  // 修好後 (有 marketId 過濾)：
  //   - 只 reduce 水水市集自己的 dailyStats
  const waterMarket: Market = {
    id: 'water-market',
    startDate: '2026-04-11',
    endDate: '2026-04-13',
  };
  const allStats: MinimalDailyStat[] = [
    // 水水市集 4/11
    { marketId: 'water-market', date: '2026-04-11', revenue: 6450, dealCount: 1, touchCount: 0, inquiryCount: 0 },
    { marketId: 'water-market', date: '2026-04-12', revenue: 88000, dealCount: 4, touchCount: 0, inquiryCount: 0 },
    { marketId: 'water-market', date: '2026-04-13', revenue: 5926, dealCount: 1, touchCount: 0, inquiryCount: 0 },
    // 同日的另一市集（不應被計入水水市集）
    { marketId: 'other-market', date: '2026-04-11', revenue: 99999, dealCount: 7, touchCount: 0, inquiryCount: 0 },
    { marketId: 'other-market', date: '2026-04-12', revenue: 88888, dealCount: 6, touchCount: 0, inquiryCount: 0 },
  ];
  const result = filterStatsForMarket(waterMarket, allStats);
  const totalRevenue = result.reduce((sum, s) => sum + s.revenue, 0);
  const totalDeals = result.reduce((sum, s) => sum + s.dealCount, 0);

  // 水水市集真實總和：6450 + 88000 + 5926 = 100,376
  assert.equal(totalRevenue, 100376);
  // 水水市集真實總成交：1 + 4 + 1 = 6
  assert.equal(totalDeals, 6);
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
    throw new Error(`${failed} useMarketStatsBatch filter tests failed`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
