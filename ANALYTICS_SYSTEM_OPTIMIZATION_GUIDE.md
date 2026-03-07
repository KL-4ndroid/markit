# 分析系統運作機制與優化建議

## 📊 當前系統運作流程

### 1. 用戶進入分析頁面時的計算流程

```typescript
用戶進入 /analytics
  ↓
1. 載入所有市集數據（useMarkets hook）
  ↓
2. 根據日期範圍篩選市集（useMemo）
  ↓
3. 觸發多個 useLiveQuery 計算：
   ├─ quadrantData (象限分析)
   ├─ marketHealthScores (健康評分)
   ├─ topMarketOverview (市集總覽)
   ├─ affinityPairs (商品親和力)
   ├─ dailyRevenueData (每日收入)
   └─ topProductsData (商品排行)
  ↓
4. 同步計算（useMemo）：
   ├─ marketROIData (ROI 排行)
   └─ marketAOVData (客單價排行)
```

---

## 🔄 數據計算分類

### A. **靜態數據（可快取，不隨時間變動）**

這些數據一旦市集結束就不會改變：

#### 1. 市集基礎指標
```typescript
// 可以在市集結束後計算一次並儲存
{
  marketId: string,
  netProfit: number,           // 淨利潤
  hourlyProfit: number,        // 每小時淨利
  boothROI: number,            // 攤位費回收率
  operatingHours: number,      // 營業時數
  totalRevenue: number,        // 總收入
  totalDeals: number,          // 成交數
  aov: number,                 // 客單價
  conversionRate: number,      // 轉換率
}
```

**儲存時機：** 市集狀態變為 `completed` 時

**儲存位置：** 
- 方案 1：新增 `market.cachedMetrics` 欄位
- 方案 2：新增 `market_metrics` 表

---

### B. **相對靜態數據（可快取，但需要定期更新）**

這些數據會隨著新市集加入而改變，但不會頻繁變動：

#### 1. 健康評分（需要比較所有市集）
```typescript
{
  marketId: string,
  healthScore: number,         // 0-100 分
  grade: 'S' | 'A' | 'B' | 'C' | 'D',
  zScores: { ... },           // Z-score 標準化
}
```

**變動時機：** 新增市集時（影響平均值和標準差）

**快取策略：**
```typescript
// 快取鍵：包含市集總數
const cacheKey = `health_scores_${markets.length}`;
localStorage.setItem(cacheKey, JSON.stringify(scores));
```

#### 2. 象限分類
```typescript
{
  stars: Market[],
  potentials: Market[],
  precisies: Market[],
  observables: Market[],
  averages: { avgInteractions, avgConversionRate }
}
```

**變動時機：** 新增市集時（影響平均值）

---

### C. **動態數據（需要每次重新計算）**

這些數據會根據日期範圍變化：

#### 1. 日期範圍相關
```typescript
// 依賴於 startDate 和 endDate
- dailyRevenueData (每日收入趨勢)
- 篩選後的市集列表
- 商品排行（特定時間範圍）
```

**快取策略：**
```typescript
// 快取鍵：包含日期範圍
const cacheKey = `daily_revenue_${startDate}_${endDate}`;
sessionStorage.setItem(cacheKey, JSON.stringify(data));
```

#### 2. 跨市集關聯分析
```typescript
// 需要分析所有市集的交易記錄
- affinityPairs (商品親和力)
- topProductsData (商品排行)
```

**快取策略：**
```typescript
// 快取鍵：包含市集 ID 列表的 hash
const marketIds = markets.map(m => m.id).sort().join(',');
const cacheKey = `affinity_${hashCode(marketIds)}`;
```

---

## 🎯 優化建議

### 方案 1：分層快取架構

```typescript
// lib/analytics/cache-manager.ts

interface CacheLayer {
  // Layer 1: 永久快取（市集結束後不變）
  permanent: {
    key: `metrics_${marketId}`,
    storage: localStorage,
    invalidate: never,
  },
  
  // Layer 2: 會話快取（當前瀏覽會話有效）
  session: {
    key: `analysis_${dateRange}_${marketCount}`,
    storage: sessionStorage,
    invalidate: 'on_new_market' | 'on_date_change',
  },
  
  // Layer 3: 記憶體快取（頁面重新整理失效）
  memory: {
    key: WeakMap<Market, MarketMetrics>,
    storage: RAM,
    invalidate: 'on_page_reload',
  },
}
```

---

### 方案 2：智能快取策略

#### 實作範例：

```typescript
// lib/analytics/smart-cache.ts

export class AnalyticsCache {
  // 檢查市集是否已結束
  private isMarketCompleted(market: Market): boolean {
    return market.status === 'completed';
  }
  
  // 取得市集基礎指標（永久快取）
  async getMarketMetrics(market: Market): Promise<MarketMetrics> {
    const cacheKey = `metrics_${market.id}`;
    
    // 如果市集已結束，嘗試從 localStorage 讀取
    if (this.isMarketCompleted(market)) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    
    // 計算指標
    const metrics = await calculateMarketMetrics(market, { db });
    
    // 如果市集已結束，儲存到 localStorage
    if (this.isMarketCompleted(market)) {
      localStorage.setItem(cacheKey, JSON.stringify(metrics));
    }
    
    return metrics;
  }
  
  // 取得健康評分（會話快取）
  async getHealthScores(markets: Market[]): Promise<MarketHealthScore[]> {
    const cacheKey = `health_scores_${markets.length}`;
    
    // 嘗試從 sessionStorage 讀取
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      
      // 快取有效期：5 分鐘
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data;
      }
    }
    
    // 計算健康評分
    const scores = await calculateHealthScores(markets);
    
    // 儲存到 sessionStorage
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: scores,
      timestamp: Date.now(),
    }));
    
    return scores;
  }
  
  // 取得每日收入（日期範圍快取）
  async getDailyRevenue(
    markets: Market[],
    startDate: string,
    endDate: string
  ): Promise<Map<string, number>> {
    const cacheKey = `daily_revenue_${startDate}_${endDate}_${markets.length}`;
    
    // 嘗試從 sessionStorage 讀取
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { data } = JSON.parse(cached);
      return new Map(Object.entries(data));
    }
    
    // 計算每日收入
    const revenueMap = await calculateDailyRevenue(markets, db, startDate, endDate);
    
    // 儲存到 sessionStorage
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: Object.fromEntries(revenueMap),
    }));
    
    return revenueMap;
  }
  
  // 清除快取（當新增市集時）
  invalidateOnNewMarket(): void {
    // 清除會話快取（健康評分、象限分析等）
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('health_scores_') || 
          key.startsWith('quadrant_') ||
          key.startsWith('affinity_')) {
        sessionStorage.removeItem(key);
      }
    });
  }
  
  // 清除快取（當日期範圍改變時）
  invalidateOnDateChange(): void {
    // 清除日期相關快取
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('daily_revenue_')) {
        sessionStorage.removeItem(key);
      }
    });
  }
}
```

---

## 📊 當前系統的問題與解決方案

### 問題 1：重複計算

**現況：**
```typescript
// 每次切換日期範圍，所有數據都重新計算
const quadrantData = useLiveQuery(async () => {
  // 重新計算所有市集的 metrics
  for (const market of markets) {
    const metrics = await calculateMarketMetrics(market, { db });
    // ...
  }
}, [markets]); // markets 改變就重新計算
```

**問題：**
- 已結束的市集指標不會改變，但每次都重新計算
- 切換日期範圍時，不需要重新計算市集基礎指標

**解決方案：**
```typescript
// 使用智能快取
const quadrantData = useLiveQuery(async () => {
  const cache = new AnalyticsCache();
  
  // 使用快取取得 metrics（已結束的市集會從 localStorage 讀取）
  const marketMetrics = [];
  for (const market of markets) {
    const metrics = await cache.getMarketMetrics(market);
    marketMetrics.push({ market, metrics });
  }
  
  return calculateQuadrants(marketMetrics);
}, [markets]);
```

---

### 問題 2：日期範圍切換效能

**現況：**
```typescript
// 切換日期範圍時，所有 useLiveQuery 都重新執行
const markets = useMemo(() => {
  return allMarkets.filter(market => {
    // 日期篩選邏輯
  });
}, [allMarkets, startDate, endDate]);
```

**問題：**
- 日期範圍改變 → markets 改變 → 所有 useLiveQuery 重新執行
- 但市集基礎指標不需要重新計算

**解決方案：**
```typescript
// 分離「市集列表」和「日期範圍」的依賴
const allMarketsMetrics = useLiveQuery(async () => {
  const cache = new AnalyticsCache();
  
  // 計算所有市集的基礎指標（不依賴日期範圍）
  const metrics = [];
  for (const market of allMarkets) {
    metrics.push({
      market,
      metrics: await cache.getMarketMetrics(market),
    });
  }
  return metrics;
}, [allMarkets]); // 只依賴 allMarkets

// 根據日期範圍篩選（快速，不需要重新計算）
const filteredMetrics = useMemo(() => {
  return allMarketsMetrics?.filter(({ market }) => {
    // 日期篩選邏輯
  });
}, [allMarketsMetrics, startDate, endDate]);
```

---

### 問題 3：商品親和力計算效能

**現況：**
```typescript
// 每次都重新查詢所有交易記錄
const affinityPairs = useLiveQuery(async () => {
  const allEvents = await db.events
    .where('market_id')
    .anyOf(marketIds)
    .filter(event => event.type === 'deal_closed')
    .toArray();
  
  // 計算親和力...
}, [markets]);
```

**問題：**
- 交易記錄不會改變，但每次都重新查詢和計算
- 計算複雜度高（O(n²)）

**解決方案：**
```typescript
// 使用增量計算 + 快取
const affinityPairs = useLiveQuery(async () => {
  const cache = new AnalyticsCache();
  
  // 檢查快取
  const marketIds = markets.map(m => m.id).sort().join(',');
  const cached = cache.getAffinityPairs(marketIds);
  if (cached) return cached;
  
  // 計算並快取
  const pairs = await calculateProductAffinity(markets, db);
  cache.setAffinityPairs(marketIds, pairs);
  
  return pairs;
}, [markets]);
```

---

## 🎯 建議的快取策略總結

### 1. 永久快取（localStorage）

**適用數據：**
- ✅ 已結束市集的基礎指標
- ✅ 已結束市集的商品銷售統計

**快取鍵：**
```typescript
`metrics_${marketId}`
`products_${marketId}`
```

**失效時機：** 永不失效（除非手動清除）

---

### 2. 會話快取（sessionStorage）

**適用數據：**
- ✅ 健康評分（依賴市集總數）
- ✅ 象限分類（依賴市集總數）
- ✅ 商品親和力（依賴市集組合）
- ✅ 每日收入（依賴日期範圍）

**快取鍵：**
```typescript
`health_scores_${marketCount}`
`quadrant_${marketCount}`
`affinity_${marketIdsHash}`
`daily_revenue_${startDate}_${endDate}_${marketCount}`
```

**失效時機：**
- 新增市集時
- 切換日期範圍時
- 瀏覽器關閉時

---

### 3. 記憶體快取（WeakMap）

**適用數據：**
- ✅ 當前頁面的計算結果
- ✅ React 組件的 useMemo 結果

**快取鍵：**
```typescript
WeakMap<Market, MarketMetrics>
```

**失效時機：** 頁面重新整理時

---

## 📈 預期效能提升

### 優化前：
```
進入分析頁面：計算 100 個市集 × 10 種指標 = 1000 次計算
切換日期範圍：重新計算 1000 次
新增 1 個市集：重新計算 1010 次
```

### 優化後：
```
進入分析頁面：
  - 已結束市集（90 個）：從 localStorage 讀取 = 0 次計算
  - 進行中市集（10 個）：計算 10 × 10 = 100 次計算
  
切換日期範圍：
  - 基礎指標：0 次計算（使用快取）
  - 日期相關：僅重新計算每日收入 = 10 次計算
  
新增 1 個市集：
  - 新市集：計算 1 × 10 = 10 次計算
  - 健康評分：重新計算（需要比較所有市集）= 101 次計算
  - 其他：使用快取 = 0 次計算
```

**效能提升：** 約 80-90% 的計算可以被快取

---

## 🚀 實作優先級

### Phase 1：基礎快取（立即實作）
1. ✅ 為已結束市集的基礎指標新增 localStorage 快取
2. ✅ 為日期範圍相關數據新增 sessionStorage 快取

### Phase 2：智能快取（短期實作）
1. ✅ 實作 AnalyticsCache 類別
2. ✅ 整合到現有的 useLiveQuery 中
3. ✅ 新增快取失效機制

### Phase 3：進階優化（長期實作）
1. ✅ 實作增量計算（只計算新增的數據）
2. ✅ 實作背景計算（Web Worker）
3. ✅ 實作預測性快取（預先計算可能需要的數據）

---

## 💡 結論

**核心原則：**
1. **靜態數據永久快取** - 已結束市集的指標不會改變
2. **動態數據會話快取** - 依賴其他市集的比較性指標
3. **日期相關數據按需計算** - 但快取結果避免重複計算

**快取策略：**
- 使用 localStorage 儲存永久數據
- 使用 sessionStorage 儲存會話數據
- 使用 WeakMap 儲存記憶體快取

**預期效果：**
- 首次載入速度提升 50%
- 切換日期範圍速度提升 90%
- 新增市集後重新計算速度提升 80%

這樣的架構既能保證數據的即時性，又能大幅提升效能！
