# Féria - Data Access Audit

> **⚠️ ARCHIVED 2026-06-14 (部分取代)**
> 本文件為 C2.14A 資料讀取路徑盤點，**結構仍有效**但多項結論已被取代：
> - 「Staff sanitizer 散落」→ 已統一為 `PermissionGate`（C2.30C, commit `4ab4b1a`）
> - 「Market Detail 雙資料來源」→ 已由 C2.19B 統一（commit `8773e47`）
> - 「Owner missing market hydration 風險」→ 已修復（commit `b420068`）
> - 「Owner→Staff cache 切換殘留」→ 已修復（commit `31816d8`）
>
> 完整取代說明見 [`docs/CONVERGENCE_ARCHIVE.md`](./CONVERGENCE_ARCHIVE.md) §6。
> 禁止直接編輯本檔（僅可修 ARCHIVED 標記）。

> **Audit Date**: 2026-06-13
> **Project**: Féria (Local-First Event Sourcing Architecture)
> **Purpose**: Comprehensive audit of all data READ paths, identifying service candidates for extraction

---

## 1. Executive Summary

This audit documents all data read paths in the Féria application, categorizing them by data source, read mechanism, and tombstone handling. The codebase follows a **Local-First architecture** with Dexie.js (IndexedDB) as the primary data source and Supabase as a backup/sync layer.

### Key Findings

| Category | Count | Notes |
|----------|-------|-------|
| Pages reading from Dexie | 4 | markets, products, recovery, market detail |
| Components with direct DB access | 12+ | Including modals, charts, analytics |
| Custom Hooks (useLiveQuery) | 8 | useMarkets, useProducts, useMarket, useDailyStats, etc. |
| Service functions | 5+ | getMarketDetail, getActiveDealEvents, getActiveInteractionEvents |
| Projection cache reads (dailyStats) | 3 | DailyRevenueStats, useDateRangeStats, useDailyStats |
| Raw events reads | 4 | active-event-service, market detail page, analytics dashboard |

---

## 2. Data Access Matrix

| 功能 | 檔案 | 資料來源 | 讀取方式 | 處理 Tombstone | 風險 | 建議 |
|---|---|---|---|---|---|---|
| 市集列表 | `app/markets/page.tsx` | `db.markets` | `useMarkets` (useLiveQuery) | 否 (過濾 `isDeleted`) | 低 | 已遵循 Local-First |
| 單一市集詳情 | `app/markets/[id]/page.tsx` | `db.markets`, `db.events` | `useMarket`, `getMarketDetail`, `getActiveDealEventsForMarket`, `getActiveInteractionEventsForMarket` | 部分 (events 走 active-event-service) | 中 | 混合降級 Supabase 查詢，需注意 |
| 商品列表 | `app/products/page.tsx` | `db.products` | `useProducts` (useLiveQuery) | 否 | 低 | 已遵循 Local-First |
| 資料修復頁 | `app/recovery/page.tsx` | 面板組件 | 面板內部查詢 | N/A | 低 | 僅用於維修操作 |
| 每日收入統計 | `components/markets/DailyRevenueStats.tsx` | `db.dailyStats` | `useDateRangeStats` (useLiveQuery) | 否 | 中 | 依賴 Projection Cache，需確保同步 |
| 日期成交記錄 | `components/markets/DailyDealsModal.tsx` | `db.events` (props 傳入) | 由父組件過濾 | 由父組件處理 | 低 | Props-driven，職責清晰 |
| 成交詳情彈窗 | `components/markets/DealDetailModal.tsx` | `db.events` (props 傳入) | 由父組件過濾 | 由父組件處理 | 低 | Props-driven，無直接 DB 存取 |
| 當日流水帳 | `components/markets/DailyTransactionLog.tsx` | `db.events` | `getActiveDealEventsForDate`, `getActiveInteractionEventsForDate` | 是 (由 active-event-service 處理) | 低 | 已正確處理 Tombstone |
| 互動偏好圖 | `components/analytics/InteractionPreferenceChart.tsx` | `db.events` (props 傳入) | 由父組件過濾 | 由父組件處理 | 低 | Props-driven |
| 時序熱力圖 | `components/analytics/InteractionTimeHeatmap.tsx` | `db.events` (props 傳入) | 由父組件過濾 | 由父組件處理 | 低 | Props-driven |
| 智能洞察卡片 | `components/analytics/BehaviorInsightCard.tsx` | Props (已計算) | 無 | N/A | 低 | 純展示組件 |
| 分析儀表板 | `components/analytics/AnalyticsDashboard.tsx` | `db.markets`, `db.events` | 直接 `db.markets.get`, `computeMarketAnalytics` | 部分 (analytics service) | 中 | 需確保 analytics service 正確處理刪除事件 |
| KPI 卡片 | `components/analytics/KPICards.tsx` | Props (已計算) | 無 | N/A | 低 | 純展示組件 |
| 每日收入圖 | `components/analytics/DailyRevenueChart.tsx` | Props (Map) | 無 | N/A | 低 | 純展示組件 |
| 成交項目 | `components/markets/DealItem.tsx` | Props (Event) | 無 | 由父組件處理 | 低 | 純展示組件 |

---

## 3. Deep Dive Analysis

### 3.1 Pages Reading from `db.dailyStats` vs `db.events`

#### Reading from `db.dailyStats` (Projection Cache)

| 組件/位置 | Hook/函數 | 用途 |
|---------|----------|------|
| `components/markets/DailyRevenueStats.tsx` | `useDateRangeStats()` | 顯示每日收入、利潤、成交數 |
| `lib/db/hooks.ts` - `useDateRangeStats()` | useLiveQuery → `db.dailyStats.where('date').between()` | 查詢日期範圍內的每日統計 |
| `lib/db/hooks.ts` - `useDailyStats()` | useLiveQuery → `db.dailyStats.where('[date+marketId]')` | 查詢特定市集特定日期的統計 |

#### Reading from `db.events` directly

| 組件/位置 | 函數 | 用途 |
|---------|------|------|
| `app/markets/[id]/page.tsx` | `getActiveDealEventsForMarket()` | 載入互動事件和成交事件 |
| `components/markets/DailyTransactionLog.tsx` | `getActiveDealEventsForDate()`, `getActiveInteractionEventsForDate()` | 當日流水帳 |
| `lib/events/active-event-service.ts` | `getActiveDealEventsForMarket()` 等 | 過濾已刪除事件的核心服務 |
| `components/analytics/AnalyticsDashboard.tsx` | `db.markets.toArray()`, `computeMarketAnalytics()` | 分析計算 |

---

### 3.2 Components Dependent on `useLiveQuery` from Dexie

The following custom hooks are built on `useLiveQuery` and provide reactive data to components:

| Hook | 返回類型 | 主要使用者 |
|------|---------|----------|
| `useMarkets(options?)` | `Market[]` | `app/markets/page.tsx`, `app/analytics/page.tsx` |
| `useMarket(id)` | `Market \| undefined` | `app/markets/[id]/page.tsx` |
| `useProducts(options?)` | `Product[]` | `app/products/page.tsx` |
| `useProduct(id)` | `Product \| undefined` | (ProductCard 等) |
| `useUpcomingMarkets(limit)` | `Market[]` | (Home dashboard 等) |
| `useDailyStats(date, marketId)` | `DailyStat \| undefined` | (Stats components) |
| `useDateRangeStats(startDate, endDate)` | `DailyStat[]` | `DailyRevenueStats` |
| `useMonthlyStats(ownerId)` | `MonthlySummary` | (Stats components) |
| `useSettings()` | `Settings \| undefined` | (Settings page) |
| `useEvents()` | `Event[]` | (Event history components) |
| `useRecentEvents(limit)` | `Event[]` | (Activity feed) |
| `useMarketEvents(marketId)` | `Event[]` | (Market event log) |
| `useDatabaseStats()` | `DatabaseStats` | (Recovery page) |

---

### 3.3 Services Providing Pre-Aggregated Data

These service modules abstract complex data transformations and provide computed results:

#### Core Event Services

| 服務檔案 | 函數 | 輸出 |
|---------|------|------|
| `lib/events/active-event-service.ts` | `getActiveDealEventsForMarket(marketId)` | `Event<DealClosedPayload>[]` (已過濾 Tombstones) |
| | `getActiveDealEventsForDate(marketId, date)` | 當日成交事件 |
| | `getActiveInteractionEventsForMarket(marketId)` | 市集互動事件 (已過濾) |
| | `getActiveInteractionEventsForDate(marketId, date)` | 當日互動事件 |
| | `getDealSummaryFromEvents(marketId)` | `DealSummary` (包含按日期分組) |

#### Market Detail Services

| 服務檔案 | 函數 | 輸出 |
|---------|------|------|
| `lib/markets/detail-service.ts` | `getMarketDetail(marketId)` | `Market \| undefined` |
| `lib/markets/event-deletion-service.ts` | `deleteDealEvent()`, `deleteInteractionEventById()` | 刪除並更新投影 |

#### Analytics Services

| 服務檔案 | 函數 | 輸出 |
|---------|------|------|
| `lib/analytics/` | `computeMarketAnalytics(market, options)` | `MarketAnalytics` (含 metrics, healthScore, diagnosis) |
| | `calculateProductAffinity(markets, db)` | `ProductPair[]` |

#### Tombstone Handling

| 服務檔案 | 函數 | 用途 |
|---------|------|------|
| `lib/db/event-tombstones.ts` | `getDeletedEventIds()` | 獲取所有刪除事件 ID |
| | `getActiveDealEvents()` | 過濾已刪除的成交事件 |
| | `getActiveInteractionEvents()` | 過濾已刪除的互動事件 |
| | `withoutDeletedDealEvents()` | 語義刪除邏輯 (semantic delete) |

---

### 3.4 C2.15 / C2.16 Service Candidates

Based on the audit, the following service extractions are recommended:

#### C2.15: Market Events Read Model Service

**Current Location**: `lib/events/active-event-service.ts`, `app/markets/[id]/page.tsx`

**Current Problem**: Market detail page directly calls multiple event services and manually filters/transforms data.

**Recommended Extraction**:

```typescript
// lib/services/market-events-read-model.ts
export class MarketEventsReadModel {
  constructor(private db: Dexie) {}

  async getMarketDeals(marketId: string): Promise<DealEvent[]> { ... }
  async getMarketInteractions(marketId: string): Promise<InteractionEvent[]> { ... }
  async getDealsByDate(marketId: string, date: string): Promise<DealEvent[]> { ... }
  async getInteractionsByDate(marketId: string, date: string): Promise<InteractionEvent[]> { ... }
  async getDealSummary(marketId: string): Promise<DealSummary> { ... }
  async getDailySummary(marketId: string, date: string): Promise<DailySummary> { ... }
}
```

#### C2.16: Market Projection Cache Service

**Current Location**: `lib/db/hooks.ts` (useDateRangeStats, useDailyStats), `components/markets/DailyRevenueStats.tsx`

**Current Problem**: Components directly query `db.dailyStats` without validation against raw events.

**Recommended Extraction**:

```typescript
// lib/services/market-projection-cache.ts
export class MarketProjectionCache {
  constructor(private db: Dexie) {}

  async getDateRangeStats(startDate: string, endDate: string): Promise<DailyStat[]> { ... }
  async getDailyStats(date: string, marketId: string): Promise<DailyStat \| undefined> { ... }

  // Projection validation
  async validateProjectionIntegrity(marketId: string): Promise<ProjectionGap[]> { ... }
  async repairProjection(marketId: string): Promise<void> { ... }
}
```

#### Additional Service Candidates

| 候選服務 | 當前位置 | 職責 |
|---------|---------|------|
| `MarketAnalyticsComputeService` | `lib/analytics/`, `AnalyticsDashboard` | 封裝 `computeMarketAnalytics` 邏輯 |
| `DailyTransactionLogService` | `DailyTransactionLog.tsx` | 流水帳資料聚合邏輯 |
| `InteractionStatsService` | `app/markets/[id]/page.tsx` | 互動統計計算 |

---

## 4. Tombstone Handling Analysis

### 4.1 Current Implementation

The codebase implements **event sourcing with tombstones** for soft-delete semantics:

| 刪除類型 | Tombstone Event | 過濾位置 |
|---------|-----------------|---------|
| 成交刪除 | `deal_deleted` | `lib/db/event-tombstones.ts` - `getActiveDealEvents()` |
| 互動刪除 | `interaction_deleted` | `lib/db/event-tombstones.ts` - `getActiveInteractionEvents()` |
| 市集刪除 | `isDeleted` flag | `useMarkets()` hook 內過濾 |
| 商品刪除 | `isActive` flag | `useProducts()` hook 內過濾 |

### 4.2 Components Correctly Handling Tombstones

- `DailyTransactionLog.tsx` - Uses `getActiveDealEventsForDate`, `getActiveInteractionEventsForDate`
- `app/markets/[id]/page.tsx` - Uses `getActiveDealEventsForMarket`, `getActiveInteractionEventsForMarket`
- `AnalyticsDashboard.tsx` - Relies on analytics service which reads events

### 4.3 Components NOT Handling Tombstones (Risk)

| 組件 | 問題 | 建議 |
|-----|------|------|
| `DailyRevenueStats.tsx` | 直接讀 `db.dailyStats`，依賴 Projection Cache | 需驗證 Projection 同步 |
| `useDateRangeStats()` | 同上 | 需提供 Projection 驗證 Hook |

---

## 5. Risk Assessment

### 5.1 High Priority Risks

| 風險 | 描述 | 緩解建議 |
|-----|------|---------|
| Projection Cache Staleness | `dailyStats` projection 可能落後於 raw events | 添加 `validateProjectionIntegrity()` 方法 |
| Supabase Fallback | 員工模式直接讀 Supabase，不走 Local-First | 統一資料流經 Dexie |
| Missing Tombstone in Stats | `DailyRevenueStats` 不處理刪除的成交 | 驗證或修復 Projection |

### 5.2 Medium Priority Risks

| 風險 | 描述 | 緩解建議 |
|-----|------|---------|
| Analytics Computation | `computeMarketAnalytics` 需確保讀取已過濾事件 | 檢查 analytics service 實作 |
| Dual Data Source | 市集詳情頁混合 `useMarket` 和 `getMarketDetail` | 統一為一個 Hook |

---

## 6. Recommendations

### 6.1 Immediate Actions

1. **Extract `MarketEventsReadModel` Service** (C2.15)
   - Move event filtering logic from page component to service
   - Ensure consistent tombstone handling

2. **Extract `MarketProjectionCache` Service** (C2.16)
   - Add projection validation methods
   - Provide cache repair capabilities

3. **Unify Market Detail Data Access**
   - Replace `useMarket` + `getMarketDetail` hybrid with single source

### 6.2 Long-term Architecture

1. **Event Read Model Pattern**
   - All event reads should go through read model services
   - Read models handle tombstone filtering automatically

2. **Projection Validation**
   - Add integrity check between projection cache and raw events
   - Provide automatic repair mechanisms

3. **Local-First Enforcement**
   - Remove Supabase direct reads from UI components
   - All data should flow through Dexie

---

## 7. Appendix: File Reference

### Core Database Files

| 檔案 | 描述 |
|------|------|
| `lib/db/index.ts` | Dexie 資料庫定義 |
| `lib/db/hooks.ts` | React Hooks 封裝 |
| `lib/db/events.ts` | Event sourcing 寫入邏輯 |
| `lib/db/event-tombstones.ts` | Tombstone 過濾邏輯 |

### Service Files

| 檔案 | 描述 |
|------|------|
| `lib/events/active-event-service.ts` | 活躍事件讀取服務 |
| `lib/markets/detail-service.ts` | 市集詳情服務 |
| `lib/markets/event-deletion-service.ts` | 事件刪除服務 |
| `lib/markets/event-view-utils.ts` | 事件視圖工具函數 |

### Key Pages

| 檔案 | 資料讀取模式 |
|------|-------------|
| `app/markets/page.tsx` | `useMarkets()` |
| `app/markets/[id]/page.tsx` | `useMarket()` + `getMarketDetail()` + `getActiveDealEventsForMarket()` |
| `app/products/page.tsx` | `useProducts()` |
| `app/recovery/page.tsx` | Recovery panels |

### Key Components

| 檔案 | 資料讀取模式 |
|------|-------------|
| `DailyRevenueStats.tsx` | `useDateRangeStats()` (Projection Cache) |
| `DailyTransactionLog.tsx` | `getActiveDealEventsForDate()` (Events) |
| `AnalyticsDashboard.tsx` | `db.markets.get()` + `computeMarketAnalytics()` |
