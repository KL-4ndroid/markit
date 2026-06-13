# Market Detail View Model 設計

更新日期：2026-06-13
階段：C2.19A
狀態：分析完成

## 一、現況分析

### 1.1 市集詳情頁資料流向

`app/markets/[id]/page.tsx` 目前使用多個資料來源：

**Market 基本資料：**
- `useMarket(marketId)` — `useLiveQuery` 讀取 `db.markets`
- `getMarketDetail(marketId)` — 直接讀取 `db.markets`
- `supabaseMarket` — Staff 從 Supabase 直接讀取（透過 `shouldTrySupabaseFallback`）
- `selectMarketDetailRecord(supabaseMarket, effectiveLocalMarket)` — 混合降級

**Active Events（成交 + 互動）：**
- `getActiveDealEventsForMarket(marketId)` — 從 `active-event-service` 讀取（已套用 tombstone 過濾）
- `getActiveInteractionEventsForMarket(marketId)` — 從 `active-event-service` 讀取（已套用 tombstone 過濾）
- 這些 events 依 `marketDates` 做 client-side 日期過濾

**Projection Cache（每日收入）：**
- `DailyRevenueStats` 元件讀取 `db.dailyStats`（已由 C2.16B 統一）

### 1.2 現有 View Model / Service

| 檔案 | 函式 | 用途 |
|------|------|------|
| `lib/markets/detail-service.ts` | `getMarketDetail(marketId)` | 直接讀取 `db.markets`，無 cache |
| `lib/markets/detail-fallback.ts` | `selectMarketDetailRecord()` | 混合 Supabase 與本機資料 |
| `lib/markets/event-deletion-service.ts` | `deleteDealEvent()` | 刪除成交事件 |
| `lib/events/active-event-service.ts` | `getActiveDealEventsForMarket()` | 讀取 active deals（已過濾 tombstone） |
| `lib/events/active-event-service.ts` | `getActiveInteractionEventsForMarket()` | 讀取 active interactions |

### 1.3 現有 C2.16 Market Projection Cache 的關係

C2.16B 確認 `DailyRevenueStats` 讀取 `dailyStats` projection cache，但市集詳情頁本身**沒有**統一讀 projection cache。目前是：

- **收入數字**：直接從 `market.totalRevenue`（`db.markets`）
- **成交筆數**：從 `market.totalDeals`（`db.markets`）
- **成交明細**：從 `active-event-service`（raw events，已過濾 tombstone）
- **互動次數**：從 `market.totalInteractions` 或 raw events

這些數字理論上應該與 `dailyStats` 一致，但實際上可能因 replay 不完整或 snapshot 覆寫而不同步。

## 二、現有缺口

### 2.1 Market 基本資料的資料來源不一致

Owner 模式：
- `useMarket` 是 reactive（`useLiveQuery`）
- `getMarketDetail` 是 imperative（`db.markets.get`）
- 兩者讀同一張表，但觸發時機不同

Staff 模式：
- 從 Supabase 直接查詢 `markets` 表
- 繞過本機 IndexedDB cache

### 2.2 Active Events 的時序問題

`getActiveDealEventsForMarket` 是 async 函式，在以下幾處手動呼叫：
- `useEffect` 內的非同步抓取（line 408, 943）
- `marketDates` 依賴 `localMarket`，但 Supabase fallback 時可能取到不同的 `marketDates`

### 2.3 收入數字未與 Projection Cache 交叉驗證

`market.totalRevenue` 和 `dailyStats` 是獨立的 projection cache，兩者之間沒有交叉驗證。若 handler replay 順序有問題，可能造成兩者不一致，而 UI 只顯示其中一個。

### 2.4 Detail Fallback 的複雜性

`selectMarketDetailRecord` 混合了 Supabase 和本機資料，邏輯分支多，存在邊界情況未被充分測試。

## 三、View Model 設計方向

### 3.1 目標

將市集詳情頁的資料讀取統一為一個可測試、可推理的 view model：

```ts
// lib/markets/market-detail-view-model.ts

export interface MarketDetailViewModel {
  // Market 基本資料
  market: Market | null;

  // 預計算的統計（從 projection cache 讀取）
  totalRevenue: number;
  totalDeals: number;
  totalInteractions: number;

  // Active events（已過濾 tombstone）
  dealEvents: Event<DealClosedPayload>[];
  interactionEvents: Event<InteractionRecordedPayload>[];

  // 每日統計（從 dailyStats projection）
  dailyStats: DailyStat[];

  // 元數據
  isLoading: boolean;
  isStaff: boolean;
  hasLocalData: boolean;
  hasSupabaseData: boolean;
}

// Hook 包裝
export function useMarketDetailViewModel(marketId: string): MarketDetailViewModel;
```

### 3.2 職責邊界

View Model 的職責：
- 統一收集 market 基本資料
- 統一收集 active events（透過 `active-event-service`）
- 統一收集 dailyStats（透過 `useDailyStats` 或直接讀 `db.dailyStats`）
- 處理 Owner/Staff 模式的資料來源切換

View Model **不做**：
- 不直接寫入任何資料
- 不執行 event handlers
- 不處理刪除邏輯（仍由 `event-deletion-service` 處理）

### 3.3 資料來源策略

**Owner 模式：**
- 基本資料：`db.markets`（`useLiveQuery`）
- 統計：從 `market.*` projection + `db.dailyStats` 交叉確認
- Active events：`active-event-service`

**Staff 模式：**
- 基本資料：從 Supabase `markets` 表（staff_accessible_markets view）
- 統計：從 `dailyStats`（由 handlers 維護）或從 Supabase summary
- Active events：`active-event-service`（本機 cache + staff view）

### 3.4 與 Projection Cache 的整合

Market View Model 應以 `dailyStats` 作為收入數字的終極來源（而非 `market.totalRevenue`），原因：
- `dailyStats` 是逐日維護的細粒度 projection
- `market.totalRevenue` 是聚合後的快照，可能因 handler 執行順序而不同步
- C2.16B 已確認 `DailyRevenueStats` 讀取 `dailyStats`，市集詳情頁應與之看齊

具體做法：
- View Model 從 `dailyStats` 計算 `totalRevenue = stats.reduce((sum, s) => sum + s.revenue, 0)`
- 或者，若 `market.totalRevenue` 與 `dailyStats` 總和有差異，顯示 warning（或由 reconciliation 修）

## 四、實作路徑

### 第一步：拆出 View Model（不做 UI 改動）

1. 新增 `lib/markets/market-detail-view-model.ts`
2. 實作 `getMarketDetailViewModel(marketId)` — 收集所有必要資料
3. 不修改任何 UI，確認 view model 可正常運作
4. 產出：MarketDetailViewModel 介面 + 實作

### 第二步：建立 Hook 包裝

1. 新增 `useMarketDetailViewModel(marketId)` Hook
2. 統一 Owner/Staff 資料來源邏輯
3. 確保 reactive 更新（`useLiveQuery` 驅動）

### 第三步：逐步接入 UI（不重構樣式）

1. 先在市集詳情頁中引入 view model
2. 逐步移除舊的 `useMarket` / `getMarketDetail` / `supabaseMarket` 邏輯
3. 確認 `DailyDealsModal` / `DailyTransactionLog` 等子元件行為不變

## 五、風險與限制

### 5.1 Staff 從 Supabase 讀取 market 基本資料

Staff 目前從 Supabase 直接查詢 `markets` 表（或 view），這繞過了本機 IndexedDB。View Model 應對此保持現狀（不試圖將 staff 改為讀本機 cache），因為 staff 的資料本來就由雲端 scope 控制。

### 5.2 Active events 的時序依賴

`getActiveDealEventsForMarket` 是 async，在 `useEffect` 中呼叫時有時序問題。View Model 應將此封裝為 Promise 或 `useLiveQuery`，避免 UI 依賴時序。

### 5.3 不修改 Snapshot 功能

View Model 實作應假設 snapshot 功能已暫停（依 C2.18E），不需處理 snapshot 覆寫 projection 的場景。

## 六、與其他模組的關係

| 模組 | 關係 |
|------|------|
| `active-event-service` | View Model 依賴其提供 filtered events |
| `dailyStats` projection | View Model 從 projection cache 讀取每日統計 |
| `detail-fallback` | View Model 接管其混合邏輯 |
| `market-projection-service` | View Model 可使用其做 projection 交叉驗證 |
| `reconciliation` | 獨立的 sync 後檢查，不影響 View Model |

## 七、結論

C2.19A 分析確認市集詳情頁需要一個統一 view model，但**並非高緊急性**。現有架構（`active-event-service` + `useMarket` + `detail-fallback`）在正常情境下可以運作。

View Model 的核心價值：
1. **可測試性**：將複雜的資料來源邏輯集中於一處
2. **一致性**：確保 Owner 和 Staff 使用相同的資料處理邏輯
3. **Projection 統一**：與 C2.16 的 `dailyStats` 讀取策略保持一致

**建議**：可做為 C3.5 Cloud Summary View Model 的一部分，在有 cloud summary API 時一併實作，或作為獨立的 medium 優先級任務。
