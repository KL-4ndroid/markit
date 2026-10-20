/**
 * DailyRevenueStats 總計計算
 *
 * 把每日卡片加總成總收入 / 總利潤 / 總成交。
 *
 * 重要：這個函式是 UI 內部一致性的唯一真相來源。
 * 詳情頁下方總計**必須**使用此函式，**不能**直接讀
 * `market.totalRevenue / market.totalProfit / market.totalDeals`，
 * 因為這些欄位是 event projection snapshot，
 * 可能被雲端 hydrate 後又經 event replay 二次累加（見 PROJECTION_DOUBLECOUNT_FIX_PLAN.md C3.4）。
 *
 * dailyData 來源：`DailyRevenueStats` 內 useMemo 已用
 * `stat.marketId === market.id && dateRange.includes(stat.date)` 過濾後的結果。
 */

export interface DailyRevenueDay {
  date: string;
  revenue: number;
  profit: number;
  deals: number;
  interactions: Record<string, number>;
}

export interface DailyRevenueTotals {
  totalRevenue: number;
  totalProfit: number;
  totalDeals: number;
}

export function computeDailyTotals(
  dailyData: ReadonlyArray<DailyRevenueDay>
): DailyRevenueTotals {
  return {
    totalRevenue: dailyData.reduce((sum, d) => sum + (d.revenue || 0), 0),
    totalProfit: dailyData.reduce((sum, d) => sum + (d.profit || 0), 0),
    totalDeals: dailyData.reduce((sum, d) => sum + (d.deals || 0), 0),
  };
}
