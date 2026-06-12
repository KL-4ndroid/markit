# Markit 資料存取盤點

更新日期：2026-06-12
階段：C2.14A
狀態：完成第一輪盤點

## 一、盤點目的

本文件盤點目前 Markit 專案中 UI、同步、修復工具與分析功能如何讀取資料，目標是找出資料分裂來源，並為後續 Active Event Service、Market Projection Service、View Model 收斂建立邊界。

目前核心問題不是單一 bug，而是同一個業務事實存在多個讀取入口：

- `events`：事件歷史與 tombstone。
- `dailyStats`：每日統計 projection。
- `markets.totalRevenue` / `markets.totalDeals`：市集總計 projection。
- Supabase `events` / snapshots / staff views：雲端來源。
- UI component 內部自行 filter / reduce / 組資料。

這些入口沒有完全統一，導致：

- 每日收入卡片有金額，但成交列表空白。
- 本機修復後正常，下一次同步又重新累加。
- Owner 刪除成交後 Staff 仍看到補登記錄。
- Staff recovery 出現 `deal_deleted invalid totalCost` 或 deleted target missing。

## 二、主要資料來源分類

| 資料來源 | 角色 | 是否真相來源 | 主要用途 | 風險 |
|---|---|---:|---|---|
| `db.events` | local event store | 是 | 成交、互動、刪除 tombstone、replay | 若 UI 各自 filter，容易口徑不一 |
| `db.dailyStats` | local projection | 否 | 每日收入、成交數、分析資料 | 可能 stale、重複累加、缺 tombstone 扣除 |
| `db.markets.totalRevenue` / `totalDeals` | local projection | 否 | 市集卡片、詳情總計、分析 | 可能和 events 不一致 |
| `db.products` | local snapshot | 部分 | 商品列表、成交 item 補資訊、庫存 | Staff sanitizer 可能移除成本，product_deleted replay 可能缺商品 |
| Supabase `events` | cloud event store | 是 | Owner sync、push/pull | backfilled timestamp / created_at cursor 曾造成漏拉 |
| Supabase snapshots | cloud projection snapshot | 否 | Owner 快速載入 | 若 snapshot projection 污染，會把錯誤帶回本機 |
| `staff_accessible_*` views | staff cloud view | 派生 | Staff 全量拉取授權資料 | view 若漏 tombstone，Staff projection 不會扣除 |

## 三、功能讀取路徑盤點

| 功能 | 檔案 | 目前資料來源 | 是否直接讀 db | 是否處理 tombstone | 風險 | 建議收斂方向 |
|---|---|---|---:|---:|---|---|
| 首頁統計 | `app/page.tsx` | `useMarkets()` / `useMonthlyStats()` | 間接 | 否 | 讀 `market.totalRevenue` projection，若 projection stale 會顯示錯誤 | 改讀 summary view model，必要時標示 projection status |
| 市集列表卡片 | `app/markets/page.tsx`, `components/markets/MarketCard.tsx` | `useMarkets()` + market totals | 間接 | 否 | 列表收入依賴 `market.totalRevenue` | 後續可改讀 market list view model |
| 市集詳情總計 | `app/markets/[id]/page.tsx` | `useMarket()` / `market.totalRevenue` / `market.totalDeals` | 間接 | 否 | projection stale 時總計錯誤 | 改由 market detail view model 提供 |
| 市集詳情互動 / 成交事件 | `app/markets/[id]/page.tsx` | `getActiveInteractionEvents()` / `getActiveDealEvents()` | 間接 | 是 | component 內自行再 filter market/date，可能與其他 UI 口徑不同 | 改讀 active event service |
| 每日收入卡片 | `components/markets/DailyRevenueStats.tsx` | `useDateRangeStats()` + `market.totalRevenue` | 間接 | 部分，只對互動讀 active events | 收入讀 `dailyStats`，成交列表讀 events，可能分裂 | 改讀 projection/view model，同一來源產生 daily rows 和 deal list |
| 每日成交 Modal | `components/markets/DailyDealsModal.tsx` | 父層傳入 active deals | 否 | 父層處理 | 若父層 active deals 被 tombstone fallback 誤藏，Modal 會空白 | 改由 `getActiveDealEventsForDate()` 直接產生資料 |
| 每日交易流水 | `components/markets/DailyTransactionLog.tsx` | `getActiveDealEvents()` / `getActiveInteractionEvents()` | 間接 | 是 | 與 `DailyRevenueStats` 分開讀，可能 dailyStats 有金額但流水缺 event | 改讀同一 daily transaction view model |
| 成交詳情 | `components/markets/DealDetailModal.tsx` | `DealClosedPayload` + read model helper | 否 | 否 | 依賴上游傳入 active deal；若上游缺 event 就無法顯示 | 保留，但輸入應來自 active event service |
| 補登收入 | `components/markets/AddRevenueDialog.tsx` | `recordDeal()` | 間接寫入 | 否 | 寫入 events 後 projection 由 handler 更新；若 replay/sync 後重複，projection 可能加倍 | 後續由 sync reconciliation 防止復發 |
| 刪除成交 | `app/markets/[id]/page.tsx`, `lib/markets/event-deletion-service.ts` | `deleteDealEvent()` -> `deal_deleted` | 間接寫入 | 建立 tombstone | Owner local 會扣 projection；Staff 若 tombstone 未 replay 或已存在 skip，會不一致 | sync 後 reconciliation 必須覆蓋 |
| 分析頁總覽 | `app/analytics/page.tsx` | `useMarkets()` / `useProducts()` / `getActiveDealEvents()` / `db.dailyStats` | 是 | 部分 | 同頁混用 market totals、events、dailyStats，分析口徑可能不一致 | 建立 analytics view model |
| Analytics detail list | `components/analytics/MarketDetailList.tsx` | `db.events` + market totals | 是 | 不明確 | 可能未套用 active tombstone | 改讀 active event service 或 analytics view model |
| Analytics engines | `lib/analytics/*` | 多數讀 market totals / dailyStats / productsSold | 部分 | 多數否 | 若 projection stale，建議會被污染 | 以 projection comparison 或 active event summary 作為輸入 |
| Live metrics | `components/sales/LiveMetrics.tsx`, `lib/sales/live-metrics.ts` | active deal helpers | 間接 | 是 | 較接近正確口徑，但仍不統一於 projection service | 後續接 active event service |
| Quick interaction / transaction | `components/sales/*` | `recordEvent` / `recordDeal` / `useProducts` | 間接 | 否 | 寫入後依賴 handler 更新 projection | 保留寫入入口，但 sync 後需 reconciliation |
| Recovery integrity | `components/common/DatabaseRecoveryPanel.tsx` | integrity / recovery services | 間接 | 視 service | 目前多為資料修補，非統一 projection rebuild | 改用 projection service |
| Local projection repair | `components/common/LocalProjectionRepairPanel.tsx` | 本機 events / dailyStats / markets | 間接 | 依 service | 已接近目標，但需確認是否使用統一 active event rules | 重構為 Market Projection Service UI |
| Owner revenue gap repair | `lib/sync/owner-revenue-gap-repair.ts` | Supabase events + local db | 是 | 部分 | 針對特定 gap，非通用 projection rebuild | 保留為特殊修復，避免取代通用 service |
| Data canonicalization | `components/settings/DataCanonicalizationPanel.tsx`, `lib/db/data-canonicalization.ts` | events / dailyStats | 是 | 否 | 格式收斂有幫助，但不解 projection stale | 保留，作為 import/sync 前後格式修正 |
| Snapshot load | `lib/db/snapshot.ts` | Supabase snapshot tables | 是 | 否 | snapshot projection 若污染，會導入錯誤 totals | load 後需 reconciliation |
| Owner sync | `hooks/useSync.ts` | Supabase `events` / snapshots | 是 | replay handler | `created_at` cursor 已修漏拉，但 snapshot + incremental 仍需 projection check | 加 touched market reconciliation |
| Staff sync | `hooks/useSync.ts` | `staff_accessible_markets/products/events` | 是 | replay handler | existing event skip 不重跑 handler；sanitize 後 cost 欄位缺失 | 加 tombstone-safe reconciliation |

## 四、目前直接讀取 `dailyStats` 的位置

主要用途：

- 每日收入明細。
- 分析資料。
- recovery / integrity。
- sync 後 staff projection sanitization。

重要檔案：

- `components/markets/DailyRevenueStats.tsx`
- `lib/db/hooks.ts` 的 `useDailyStats()` / `useDateRangeStats()`
- `app/analytics/page.tsx`
- `lib/db/recovery.ts`
- `lib/db/integrity.ts`
- `hooks/useSync.ts` 的 `sanitizeStaffProjectionsAfterReplay()`
- `components/common/LocalProjectionRepairPanel.tsx`

風險：

`dailyStats` 是 projection，不是事件真相。若 `deal_closed` 被 replay 多次、或 `deal_deleted` 沒 replay，`dailyStats` 會變成錯誤快取。任何 UI 若只看 `dailyStats`，會誤以為資料正確。

## 五、目前直接或間接讀取 `db.events` 的位置

主要用途：

- active deals / interactions。
- analytics。
- sync import/export。
- tombstone 判斷。
- recovery / projection repair。

重要檔案：

- `lib/db/event-tombstones.ts`
- `app/markets/[id]/page.tsx`
- `components/markets/DailyTransactionLog.tsx`
- `app/analytics/page.tsx`
- `components/analytics/MarketDetailList.tsx`
- `hooks/useSync.ts`
- `lib/db/snapshot.ts`
- `lib/db/data-canonicalization.ts`
- `lib/sync/owner-revenue-gap-repair.ts`

風險：

不同地方對 events 的 filter 條件不完全一致。部分讀 active events，部分直接讀 raw events，會導致刪除 tombstone 套用不一致。

## 六、目前讀取 `market.totalRevenue` / `market.totalDeals` 的位置

主要用途：

- 首頁。
- 市集列表卡片。
- 市集詳情總計。
- Staff 市集詳情。
- 分析頁與 analytics engine。

重要檔案：

- `app/page.tsx`
- `app/markets/page.tsx`
- `components/markets/MarketCard.tsx`
- `app/markets/[id]/page.tsx`
- `components/markets/StaffMarketDetailView.tsx`
- `components/markets/DailyRevenueStats.tsx`
- `app/analytics/page.tsx`
- `lib/analytics/*`
- `lib/export-utils.ts`

風險：

`market.totalRevenue` / `totalDeals` 是 projection cache。若 cloud snapshot 或 local replay 污染，它會在多個 UI 位置被放大使用。

## 七、Tombstone 處理路徑

目前 tombstone event types：

- `deal_deleted`
- `interaction_deleted`

集中讀取：

- `lib/db/event-tombstones.ts`

寫入：

- `lib/markets/event-deletion-service.ts`

handler projection：

- `lib/db/events.ts`

主要風險：

1. `withoutDeletedDealEvents()` 在 target id 不存在時使用 semantic fallback。
2. Semantic fallback key 是 `marketId | date | revenue | dealCount`。
3. 如果舊 tombstone target missing，且剛好有同日期同金額同筆數的補登，它可能隱藏一筆 active deal。
4. Staff sync 若已經把 tombstone 寫入 local `db.events`，但 handler 當次失敗，之後 sync 會因 event id 已存在而 skip，不會重跑 projection。

## 八、Owner Sync 與 Staff Sync 差異

| 項目 | Owner | Staff | 風險 |
|---|---|---|---|
| 雲端來源 | Supabase `events` / snapshots | `staff_accessible_*` views | 來源不同，欄位可能不同 |
| cursor | `created_at` for normal event sync；snapshot incremental 用 `timestamp` | staff views 全量拉取 | Staff 每次全量但 existing event skip |
| canonicalize | `createCanonicalSyncedEvent()` | `sanitizeEvents()` 後 `createCanonicalSyncedEvent()` | Staff sanitizer 可能移除 replay 需要的成本欄位 |
| projection | handler replay | handler replay + projection sanitizer | Staff projection 更容易因 sanitize / skip 變 stale |
| existing event | skip | skip | 若 event 已存在但 projection 未套用，錯誤會留住 |
| tombstone | 從 cloud events 進來 | 從 staff view 進來 | view 若漏 `deal_deleted`，Staff 永遠不會扣除 |

## 九、目前最大資料分裂風險

### 1. 收入卡片與成交明細來源不同

每日收入卡片讀 `dailyStats`，成交明細讀 active `deal_closed` events。

結果：

- `dailyStats` 有收入，但 events 被 tombstone 隱藏，成交列表會空白。
- events 正確，但 `dailyStats` stale，卡片會顯示錯誤金額。

### 2. Projection 被當成真相

多個 UI 和 analytics engine 直接讀 `market.totalRevenue` / `dailyStats.revenue`。

結果：

- double / triple revenue 會被所有分析與卡片放大。
- projection 修復後，如果 sync 再 replay，仍可能復發。

### 3. Staff sync existing event skip

Staff sync 先寫 event，再跑 handler。若 handler 曾失敗，後續看到 event 已存在就 skip。

結果：

- local event store 有 tombstone。
- projection 沒扣除。
- UI 仍顯示刪除前統計。

### 4. Staff sanitizer 與 replay 欄位衝突

Staff sanitizer 會移除成本欄位，這對隱私正確，但不能讓 integrity 或 replay fatal。

結果：

- `deal_deleted invalid totalCost`
- `dailyStats cost 無效`
- Staff recovery 顯示錯誤但資料可能只是被脫敏。

### 5. Snapshot projection 污染

Owner 首次或重新登入可能載入 snapshot projection。如果 snapshot 內 totals 已被污染，即使 events 正確，本機也會先得到錯誤 projection。

結果：

- 無痕或新裝置同步後再次看到 double revenue。
- 本機 repair 只能暫時修正。

## 十、下一階段 Service 邊界建議

### C2.15 Active Event Service

建議檔案：

```text
lib/events/active-event-service.ts
tests/active-event-service.test.ts
```

建議 API：

```ts
getActiveDealEventsForMarket(marketId: string): Promise<Event<DealClosedPayload>[]>
getActiveDealEventsForDate(marketId: string, date: string): Promise<Event<DealClosedPayload>[]>
getActiveInteractionEventsForMarket(marketId: string): Promise<Event<InteractionRecordedPayload>[]>
getActiveInteractionEventsForDate(marketId: string, date: string): Promise<Event<InteractionRecordedPayload>[]>
getDealSummaryFromEvents(marketId: string): Promise<{
  dealCount: number;
  revenue: number;
  byDate: Array<{ date: string; dealCount: number; revenue: number }>;
}>
```

規則：

- 所有 deal / interaction UI 都經由此 service。
- 不讓 UI 自己處理 tombstone。
- 保留既有 `event-read-model.ts` 作為 payload 讀取底層。

### C2.16 Market Projection Service

建議檔案：

```text
lib/projections/market-projection-service.ts
tests/market-projection-service.test.ts
```

建議 API：

```ts
compareMarketProjectionWithEvents(marketId: string): Promise<ProjectionComparison>
rebuildMarketStatsFromEvents(marketId: string): Promise<ProjectionRebuildResult>
rebuildMarketDailyStatsFromEvents(marketId: string): Promise<DailyStatsRebuildResult>
```

規則：

- 只重建 `market` totals 與 `dailyStats`。
- 不修改 events。
- 不修改 cloud。
- 不修改 product stock / totalSold。
- 使用 Active Event Service 作為唯一事件輸入。

### C2.18 Sync Reconciliation

建議接入點：

- Owner `pullAllEvents`
- Owner `pullIncrementalEvents`
- Staff `syncEventsToIndexedDB`
- Snapshot load 後

規則：

- 收集 touched market ids。
- sync 完成後 compare projection。
- mismatch 時 rebuild projection。
- reconciliation 失敗不應讓登入卡死，但要記錄錯誤並可在 recovery 顯示。

## 十一、建議優先修正順序

1. C2.15A：設計 active event service。
2. C2.15B：實作 active event service 與 tombstone tests。
3. C2.16A：設計 market projection service。
4. C2.16B：實作 projection rebuild service。
5. C2.17A：Recovery 接入 projection rebuild。
6. C2.18A：設計 sync reconciliation。
7. C2.18B：Owner sync reconciliation。
8. C2.18C：Staff sync reconciliation。
9. C2.19：UI view model 收斂。

## 十二、目前不建議做的事

- 不建議用日期 cutoff 修舊資料。
- 不建議在 UI 裡針對特定 market 補判斷。
- 不建議直接刪除 local events。
- 不建議直接修改 cloud events。
- 不建議一次大改 `hooks/useSync.ts`。
- 不建議在沒有 active event service 前改多個 UI。

## 十三、C2.14 結論

資料分裂的主因是：

```text
UI read model 不統一
+ projection cache 被當成真相
+ tombstone 套用位置分散
+ Owner / Staff sync 進入 IndexedDB 後缺少 projection reconciliation
```

下一步應先建立 Active Event Service，讓所有成交與互動資料的讀取口徑收斂；再建立 Market Projection Service，讓 projection 可以從 active events 穩定重建。此順序風險最低，也最能阻止同類問題反覆發生。
