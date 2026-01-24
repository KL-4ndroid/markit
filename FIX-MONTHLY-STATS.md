/**
 * 修復市集場次統計問題
 * 
 * 問題：useMonthlyStats 使用 dailyStats.marketId 來計算市集場次
 * 但 dailyStats 是按日期分組的，一天只有一筆記錄
 * 如果同一天有多個市集，只會記錄最後一個市集的 ID
 * 
 * 解決方案：直接從 markets 表統計本月的市集數量
 */

// 修改前的邏輯（錯誤）
export function useMonthlyStats_OLD() {
  return useLiveQuery(async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;
    
    const stats = await db.dailyStats
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
    
    const marketIds = new Set<string>();
    
    for (const stat of stats) {
      if (stat.marketId) {
        marketIds.add(stat.marketId);  // ❌ 問題：dailyStats 一天只有一筆，會漏掉同一天的其他市集
      }
    }
    
    return {
      marketCount: marketIds.size,  // ❌ 錯誤的市集數量
      // ...
    };
  }, []);
}

// 修改後的邏輯（正確）
export function useMonthlyStats() {
  return useLiveQuery(async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;
    
    // ✅ 方案 1：直接從 markets 表統計本月的市集
    const markets = await db.markets
      .where('startDate')
      .between(startDate, endDate, true, true)
      .toArray();
    
    const marketCount = markets.length;
    
    // ✅ 方案 2：從 markets 表累加統計數據（更準確）
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalDeals = 0;
    let totalInteractions = 0;
    
    for (const market of markets) {
      totalRevenue += market.totalRevenue || 0;
      totalProfit += market.totalProfit || 0;
      totalDeals += market.totalDeals || 0;
      totalInteractions += market.totalInteractions || 0;
    }
    
    return {
      marketCount,           // ✅ 正確的市集數量
      totalRevenue,          // ✅ 從 markets 表累加
      totalProfit,           // ✅ 從 markets 表累加
      totalDeals,            // ✅ 從 markets 表累加
      totalInteractions,     // ✅ 從 markets 表累加
    };
  }, []);
}
