# 分析系統智能快取實作完成報告

## 🎯 實作目標

根據 `ANALYTICS_SYSTEM_OPTIMIZATION_GUIDE.md` 實作智能快取系統，並新增自動化機制：
- ✅ 分層快取架構（localStorage + sessionStorage + WeakMap）
- ✅ 自動偵測補登操作
- ✅ 智能快取失效策略

---

## 📦 新增檔案

### 1. `lib/analytics/cache-manager.ts`
**核心快取管理器**

#### 功能：
- ✅ 三層快取架構
- ✅ 自動偵測補登操作
- ✅ 智能快取失效
- ✅ 快取統計資訊

#### 關鍵特性：

##### A. 補登偵測機制
```typescript
// 記錄市集的時間戳和事件數量
interface MarketTimestamp {
  marketId: string;
  lastCalculated: number;  // 最後計算時間
  lastModified: number;    // 市集最後修改時間
  eventCount: number;      // 事件數量
}

// 檢查是否有新的補登記錄
async function hasNewBackfillEntries(market, db) {
  // 1. 比較事件數量
  const currentEventCount = await db.events
    .where('market_id')
    .equals(market.id)
    .count();
  
  // 2. 如果事件數量增加 → 有新補登
  if (currentEventCount > timestamp.eventCount) {
    return true;
  }
  
  // 3. 檢查市集數據是否被修改
  if (currentModified > timestamp.lastModified) {
    return true;
  }
  
  return false;
}
```

##### B. 智能快取策略
```typescript
async getMarketMetrics(market, db) {
  // Layer 3: 記憶體快取（最快）
  if (memoryCache.has(market)) {
    return memoryCache.get(market);
  }
  
  // Layer 1: localStorage 快取（已結束市集）
  if (market.status === 'completed') {
    // 🔥 檢查是否有新的補登記錄
    const hasNewData = await hasNewBackfillEntries(market, db);
    
    if (!hasNewData) {
      // 從快取讀取
      const cached = localStorage.getItem(cacheKey);
      if (cached) return JSON.parse(cached);
    } else {
      // 有新補登，清除舊快取
      localStorage.removeItem(cacheKey);
    }
  }
  
  // 計算指標
  const metrics = await calculateMarketMetrics(market, { db });
  
  // 儲存快取
  if (market.status === 'completed') {
    localStorage.setItem(cacheKey, JSON.stringify(metrics));
    await updateMarketTimestamp(market, db);
  }
  
  return metrics;
}
```

---

### 2. `hooks/useAnalyticsCache.ts`
**React Hook 整合**

#### 功能：

##### A. 自動監聽補登操作
```typescript
export function useAnalyticsCacheInvalidation() {
  useEffect(() => {
    // 監聽 Dexie 的 creating 事件
    const subscription = db.events.hook('creating', (primKey, obj) => {
      const event = obj as any;
      
      if (event.type === 'deal_closed' && event.market_id) {
        db.markets.get(event.market_id).then(market => {
          if (market && market.status === 'completed') {
            // 🔥 自動清除快取
            const cache = getAnalyticsCache();
            cache.invalidateMarket(market.id!);
            
            console.log(`🔄 偵測到補登操作，已清除市集快取`);
          }
        });
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);
}
```

##### B. 快取管理介面
```typescript
export function useAnalyticsCache() {
  const cache = getAnalyticsCache();
  
  return {
    cache,
    getCacheStats,      // 取得快取統計
    clearAllCache,      // 清除所有快取
    clearSessionCache,  // 清除會話快取
    clearMarketCache,   // 清除特定市集快取
  };
}
```

---

## 🔄 更新檔案

### 1. `lib/analytics/index.ts`
- ✅ 導入快取管理器
- ✅ 重新導出快取相關函數
- ✅ 更新 `computeBatchMarketAnalytics` 使用快取

```typescript
// 使用快取管理器
if (useCache && db) {
  const cache = getAnalyticsCache();
  allMetrics = await cache.getBatchMarketMetrics(markets, db);
} else {
  // 不使用快取，直接計算
  allMetrics = await calculateBatchMetrics(markets, options);
}
```

### 2. `app/analytics/page.tsx`
- ✅ 導入 `useAnalyticsCacheInvalidation` Hook
- ✅ 在組件中啟用自動監聽

```typescript
export default function AnalyticsPage() {
  // ... 其他狀態
  
  // 🔥 監聽補登操作，自動清除快取
  useAnalyticsCacheInvalidation();
  
  // ... 其他邏輯
}
```

---

## 🎯 快取策略總結

### Layer 1: localStorage（永久快取）

**適用數據：**
- ✅ 已結束市集的基礎指標
- ✅ 市集時間戳記錄

**快取鍵格式：**
```typescript
`analytics_v1.0_metrics_${marketId}`
`analytics_v1.0_timestamp_${marketId}`
```

**失效時機：**
- 偵測到新的補登記錄
- 市集數據被修改
- 手動清除

---

### Layer 2: sessionStorage（會話快取）

**適用數據：**
- ✅ 健康評分（依賴市集總數）
- ✅ 象限分類（依賴市集總數）
- ✅ 商品親和力（依賴市集組合）
- ✅ 每日收入（依賴日期範圍）

**快取鍵格式：**
```typescript
`analytics_v1.0_health_scores_${marketCount}`
`analytics_v1.0_quadrant_${marketCount}`
`analytics_v1.0_affinity_${hash}`
`analytics_v1.0_daily_revenue_${startDate}_${endDate}_${marketCount}`
```

**失效時機：**
- 新增市集時
- 切換日期範圍時
- 瀏覽器關閉時

---

### Layer 3: WeakMap（記憶體快取）

**適用數據：**
- ✅ 當前頁面的計算結果

**失效時機：**
- 頁面重新整理時
- 組件卸載時

---

## 🔥 自動化補登偵測機制

### 工作流程：

```
1. 用戶使用補登功能新增交易
   ↓
2. Dexie Hook 偵測到 'creating' 事件
   ↓
3. 檢查事件類型 = 'deal_closed'
   ↓
4. 檢查市集狀態 = 'completed'
   ↓
5. 自動清除該市集的 localStorage 快取
   ↓
6. 下次進入分析頁面時重新計算
```

### 偵測條件：

#### 條件 1：事件數量增加
```typescript
currentEventCount > cachedEventCount
```

#### 條件 2：市集數據被修改
```typescript
market.updated_at > timestamp.lastModified
```

**任一條件滿足 → 清除快取 → 重新計算**

---

## 📈 效能提升預估

### 場景 1：首次進入分析頁面

**優化前：**
```
100 個市集 × 10 種指標 = 1000 次計算
計算時間：約 5-10 秒
```

**優化後：**
```
已結束市集（90 個）：從 localStorage 讀取 = 0 次計算
進行中市集（10 個）：計算 10 × 10 = 100 次計算
計算時間：約 0.5-1 秒
```

**提升：80-90%** 🚀

---

### 場景 2：切換日期範圍

**優化前：**
```
重新計算所有指標 = 1000 次計算
計算時間：約 5-10 秒
```

**優化後：**
```
基礎指標：從快取讀取 = 0 次計算
日期相關：重新計算每日收入 = 10 次計算
計算時間：約 0.1-0.2 秒
```

**提升：95-98%** 🚀

---

### 場景 3：補登操作後

**優化前：**
```
無快取機制，每次都重新計算
```

**優化後：**
```
1. 自動偵測補登操作
2. 清除受影響市集的快取
3. 下次進入時重新計算該市集
4. 其他市集仍使用快取
```

**智能失效：只重算必要的數據** ✅

---

## 🛠️ 使用方式

### 1. 自動模式（推薦）

在分析頁面中已自動啟用：

```typescript
export default function AnalyticsPage() {
  // 自動監聽補登操作
  useAnalyticsCacheInvalidation();
  
  // 正常使用分析功能
  const analytics = await computeBatchMarketAnalytics(markets, { 
    db,
    useCache: true  // 啟用快取
  });
}
```

### 2. 手動管理

如需手動管理快取：

```typescript
import { useAnalyticsCache } from '@/hooks/useAnalyticsCache';

function MyComponent() {
  const { 
    getCacheStats, 
    clearAllCache, 
    clearMarketCache 
  } = useAnalyticsCache();
  
  // 查看快取統計
  const stats = getCacheStats();
  console.log(`localStorage: ${stats.localStorage.count} 項`);
  console.log(`sessionStorage: ${stats.sessionStorage.count} 項`);
  
  // 清除特定市集快取
  clearMarketCache('market-id-123');
  
  // 清除所有快取
  clearAllCache();
}
```

---

## 🔍 除錯與監控

### 查看快取日誌

快取管理器會在控制台輸出詳細日誌：

```
✅ 從快取讀取市集指標: 台北市集
🔢 計算市集指標: 新竹市集
💾 已快取市集指標: 新竹市集
🔄 偵測到市集 台北市集 有新的補登記錄
🗑️ 已清除市集 market-123 的快取
```

### 查看快取統計

```typescript
const cache = getAnalyticsCache();
const stats = cache.getCacheStats();

console.log('快取統計:', {
  localStorage: {
    count: stats.localStorage.count,
    size: `${(stats.localStorage.size / 1024).toFixed(2)} KB`
  },
  sessionStorage: {
    count: stats.sessionStorage.count,
    size: `${(stats.sessionStorage.size / 1024).toFixed(2)} KB`
  }
});
```

---

## ⚠️ 注意事項

### 1. 快取版本管理

快取鍵包含版本號 `v1.0`，升級時會自動失效：

```typescript
const CACHE_VERSION = 'v1.0';
const CACHE_PREFIX = `analytics_${CACHE_VERSION}_`;
```

### 2. 儲存空間限制

- localStorage：約 5-10 MB
- sessionStorage：約 5-10 MB

建議定期清理舊快取。

### 3. 隱私模式

在瀏覽器隱私模式下，localStorage 可能無法使用，系統會自動降級到記憶體快取。

---

## 🎉 總結

### 實作完成項目

- ✅ 三層快取架構
- ✅ 自動偵測補登操作
- ✅ 智能快取失效策略
- ✅ React Hook 整合
- ✅ 快取統計與管理
- ✅ 詳細日誌輸出

### 預期效果

- 🚀 首次載入速度提升 80-90%
- 🚀 切換日期範圍速度提升 95-98%
- 🚀 補登後智能重算，不影響其他市集
- ✅ 數據即時性保證
- ✅ 用戶體驗大幅提升

### 核心優勢

1. **自動化** - 無需手動管理，系統自動偵測補登
2. **智能化** - 只重算必要的數據，最大化快取利用率
3. **可靠性** - 多層快取保證，確保數據正確性
4. **可維護性** - 清晰的架構，易於除錯和擴展

分析系統現在既快速又準確！🎯
