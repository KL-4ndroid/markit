# Markit 資料存取收斂計畫

更新日期：2026-06-12
狀態：C2.14 資料存取盤點已完成；C2.15 Active Event Service 已建立；C2.16 Market Projection Service 正式入口已建立；C2.17 Recovery 已接入 projection service；C2.18 Sync Reconciliation 已接入 Owner / Staff sync；C2.19 主要 UI active event 讀取已接入；C2.20 Staff tombstone sanitizer replay 欄位測試已補齊，Staff view 唯讀審查 SQL 已整理
目標：逐步消除 Owner / Staff、events / dailyStats / market totals、tombstone / projection 之間的資料分裂，讓 UI、同步、修復工具都透過一致的資料讀取與投影規則運作。

## 一、問題摘要

目前專案已經具備事件溯源與本機 IndexedDB projection 架構，但資料存取路徑逐步分散，導致同一個業務事實可能從不同地方取得不同結果。

典型問題：

- 市集每日收入卡片讀 `dailyStats`，但點日期後的成交記錄讀 `deal_closed events`。
- `deal_deleted` 是 tombstone，但有些 UI 讀 active events，有些 UI 讀 projection cache。
- Owner sync 和 Staff sync 來源不同，Owner 讀 `events` / snapshots，Staff 讀 `staff_accessible_*` views。
- Staff sync 會 sanitize，再 replay handler，若 event 已存在但 projection 沒正確更新，後續 sync 會 skip existing event，不會重跑 handler。
- 本機修復工具只修 local projection，若 sync 再次 replay 或 cloud snapshot 有舊 projection，問題可能復發。
- `marketId` / `market_id`、`eventId` / `event_id`、`totalAmount` / `total_amount` 已逐步 canonicalize，但仍需要統一入口避免新舊格式再次分裂。

核心方向：

```text
Cloud events / snapshots / staff views
        ↓
sync import
        ↓
canonicalization
        ↓
local event store
        ↓
active event read model
        ↓
projection rebuild / reconciliation
        ↓
view model services
        ↓
UI
```

UI 不應直接自行判斷資料真相；它應該讀取穩定的 view model。

## 二、收斂原則

1. Events 是歷史事實，projection 是可重建快取。
2. `dailyStats`、`market.totalRevenue`、`market.totalDeals` 不應被當作唯一真相。
3. UI 不直接處理 tombstone，不直接拼 raw payload。
4. Owner / Staff 可有不同雲端來源，但進入 IndexedDB 後應走同一套 canonical event model。
5. Staff sanitizer 不應破壞 replay 必要欄位。
6. 修復工具優先重建 projection，不刪 events、不改雲端。
7. 每個階段只做一件事，小 commit，小測試，小風險。

## 三、整體階段表

| Phase | 名稱 | 目標 | 主要產出 | 風險 | 優先 |
|---|---|---|---|---|---|
| C2.14 | 資料存取盤點 | 找出所有直接讀 DB / projection / raw events 的地方 | `DATA_ACCESS_AUDIT.md` | 低 | 完成 |
| C2.15 | Active Event Service | 統一 active deals / interactions / tombstones 讀取 | `active-event-service.ts` + tests | 中 | 已建立，待 UI 接入 |
| C2.16 | Market Projection Service | 從 active events 重建單一 market projection | `market-projection-service.ts` + tests | 中 | 已建立，待 Recovery / Sync 接入 |
| C2.17 | Recovery 接入 Projection Rebuild | 讓 `/recovery` 只用 projection service 修本機統計 | UI dry-run / execute | 中 | 已接入 |
| C2.18 | Sync 後 Reconciliation | sync 完成後檢查 touched markets 並自動重建不一致 projection | sync reconciliation hook | 中高 | Owner / Staff sync 已接入 |
| C2.19 | UI View Model 收斂 | 市集詳情、每日成交、分析頁改讀 view model | `market-detail-view-model.ts` 等 | 中 | 市集詳情、每日收入、每日記錄、分析頁 active events 已接入 |
| C2.20 | Staff Data Flow 加固 | 確保 Staff tombstone / sanitized events 可正確 replay | tests + service guard | 中高 | sanitizer 欄位保護已測，staff view SQL 已整理待線上驗證 |
| C2.21 | 舊資料雲端一致性審查 | 確認 cloud events / snapshots / projection 是否仍有污染 | SQL 診斷報告 | 中 | P2 |
| C2.22 | 完整文件與操作手冊 | 建立未來維護規範 | docs | 低 | P2 |

## 四、詳細執行順序

### C2.14：資料存取盤點

目的：在改程式之前，完整列出資料讀取路徑。

只讀分析範圍：

- `app/markets/[id]/page.tsx`
- `components/markets/*`
- `app/analytics/*`
- `lib/db/hooks.ts`
- `lib/db/event-tombstones.ts`
- `lib/events/event-read-model.ts`
- `hooks/useSync.ts`
- `/recovery` 相關元件與 services

產出：

- 新增或更新 `docs/DATA_ACCESS_AUDIT.md`

需要列出：

| 功能 | 目前資料來源 | 是否讀 raw db | 是否處理 tombstone | 風險 |
|---|---|---:|---:|---|
| 每日收入卡片 | `dailyStats` | 是 | 否 | projection stale |
| 每日成交列表 | `getActiveDealEvents()` | 間接 | 是 | tombstone fallback 可能誤藏 |
| Staff sync | `staff_accessible_events` | 是 | replay | existing event skip 不重跑 handler |
| 分析頁 | `dailyStats` / events | 是 | 不一致 | 數據口徑不同 |

完成條件：

- 不修改程式碼。
- 清楚列出下一階段要抽出的 service。
- 驗證：`git diff --check`。

### C2.15：Active Event Service

目的：把 active event 讀取邏輯集中，避免 UI 各自 filter。

建議新增：

```text
lib/events/active-event-service.ts
tests/active-event-service.test.ts
```

API 草案：

```ts
getActiveDealEventsForMarket(marketId: string): Promise<Event<DealClosedPayload>[]>
getActiveDealEventsForDate(marketId: string, date: string): Promise<Event<DealClosedPayload>[]>
getActiveInteractionEventsForMarket(marketId: string): Promise<Event<InteractionRecordedPayload>[]>
getDeletedDealEventIds(): Promise<Set<string>>
getDealSummaryFromEvents(marketId: string): Promise<DealSummary>
```

必要規則：

- 只用 `event-read-model.ts` 讀 payload。
- Tombstone id matching 優先。
- Semantic tombstone fallback 必須可測，且要避免誤刪多筆。
- full backfill / simple backfill / normal deal 都走同一套判斷。

完成條件：

- 原本 `getActiveDealEvents()` 邏輯仍相容。
- 新 service 有 unit tests。
- 尚不大量改 UI，只先建立服務。

### C2.16：Market Projection Service

目的：建立「從 active events 重建單一 market 統計」的唯一工具。

建議新增：

```text
lib/projections/market-projection-service.ts
tests/market-projection-service.test.ts
```

API 草案：

```ts
compareMarketProjectionWithEvents(marketId: string): Promise<ProjectionComparison>
rebuildMarketStatsFromEvents(marketId: string): Promise<ProjectionRebuildResult>
rebuildMarketDailyStatsFromEvents(marketId: string): Promise<DailyStatsRebuildResult>
```

重建範圍：

- `market.totalRevenue`
- `market.totalDeals`
- `market.totalInteractions`
- `dailyStats`

明確不做：

- 不新增 events。
- 不刪除 events。
- 不修改雲端。
- 不修改商品庫存。
- 不直接改成本敏感資料規則。

重建來源：

- active `deal_closed`
- active `interaction_recorded`
- 已套用 `deal_deleted` / `interaction_deleted` tombstone

完成條件：

- 單一 market 可 dry-run 比對。
- 單一 market 可 execute 重建 projection。
- 測試覆蓋：
  - 正常成交
  - 完整補登
  - 手動補登
  - deal_deleted
  - interaction_deleted
  - tombstone target missing semantic fallback

### C2.17：Recovery 接入 Projection Rebuild

目的：把現有救火式修復收斂為 projection service。

建議修改：

```text
app/recovery/page.tsx
components/common/*ProjectionRepairPanel.tsx
```

功能要求：

- Owner-only guard。
- 說明清楚：只修本機 projection，不修改雲端，不刪 events。
- dry-run 顯示：
  - marketId
  - 市集名稱
  - event revenue
  - current market revenue
  - current dailyStats revenue
  - mismatch type
- execute 只修 dry-run 中確認過的 markets。
- confirm dialog。

完成條件：

- 使用者不需要手動指定 marketId 才能掃描。
- 但 execute 必須只針對 dry-run 結果執行。
- 不混入 debug tools。

### C2.18：Sync 後 Reconciliation

目的：解決「修復後正常，但下一次自動同步又復發」。

建議做法：

```text
sync import events
  ↓
collect touched marketIds
  ↓
compare projection
  ↓
if mismatch: rebuild projection
```

接入點候選：

- Owner `pullAllEvents`
- Owner `pullIncrementalEvents`
- Staff `syncEventsToIndexedDB`

注意事項：

- 不要每次全量掃描所有 markets。
- 只針對 touched market ids。
- 如果 staff sanitizer 移除 cost，reconciliation 不應因 cost 缺失 fatal。
- existing event skip 後仍需考慮 tombstone 是否已存在但 projection 未套用。

完成條件：

- Owner / Staff sync 完成後，projection 不會因 replay 重複累加。
- Tombstone 已存在但 projection stale 的情境可被修復。

### C2.19：UI View Model 收斂

目的：UI 不直接讀 raw DB / projection cache。

建議新增：

```text
lib/markets/market-detail-view-model.ts
lib/analytics/analytics-view-model.ts
```

優先改：

1. 市集詳情每日收入卡片。
2. 每日成交 modal。
3. DailyTransactionLog。
4. 首頁收入摘要。
5. 分析頁。

View model 應回傳：

```ts
{
  market,
  dailyRevenueRows,
  activeDealsByDate,
  activeInteractionsByDate,
  projectionStatus,
  warnings,
}
```

完成條件：

- UI 不再各自呼叫 `db.events.where(...)`。
- UI 不再自己處理 tombstone。
- UI 顯示與 recovery dry-run 的口徑一致。

### C2.20：Staff Data Flow 加固

目的：讓 Staff 看到的資料與 Owner 授權資料一致，且刪除 tombstone 正確生效。

審查文件：

```text
docs/STAFF_DATA_FLOW_AUDIT.md
```

重點：

- Repo 定義已確認 `staff_accessible_events` 使用 `e.*`，理論上包含 `deal_deleted` / `interaction_deleted`。
- 已整理 Supabase 唯讀 SQL，用於確認線上 `staff_accessible_events` 是否與 repo 定義一致。
- 已整理 Supabase 唯讀 SQL，用於確認 `deal_deleted.market_id` / `interaction_deleted.market_id` 不為 null。
- 已補測試確認 sanitizer 不會移除 replay 必要欄位：
  - `eventId`
  - `event_id`
  - `marketId`
  - `market_id`
  - `dealDate`
  - `deal_date`
  - `totalAmount`
  - `total_amount`
  - `dealCount`
  - `deal_count`
- 已補測試確認 staff sanitizer 仍會移除敏感成本欄位：
  - `totalCost`
  - `total_cost`
- 如果 event 已存在但 projection stale，sync reconciliation 必須修。

完成條件：

- Owner 補登 → Staff 可見。（已由 active events + sync reconciliation 支撐，仍需瀏覽器 smoke test）
- Owner 刪除補登 → Staff 不再顯示，統計也扣除。（sanitizer 欄位保護已測，仍需確認 `staff_accessible_events` view 含 tombstone）
- Staff 無成本欄位時，不產生 fatal integrity error。（已有 integrity / handler / sanitizer 測試覆蓋）

### C2.21：舊資料雲端一致性審查

目的：確認是否還有 cloud snapshot 或 cloud projection 污染。

只做 SQL 診斷，不直接修：

- cloud `markets.total_revenue` vs `events deal_closed - deal_deleted`
- snapshots 是否含污染 projection
- staff view 是否缺 tombstone
- deleted target 是否 missing

產出：

```text
docs/CLOUD_DATA_CONSISTENCY_AUDIT.md
```

### C2.22：文件與維護規範

目的：讓未來任何 AI 或開發者都遵循同一資料口徑。

更新：

- `docs/DATA_CONVERGENCE_PLAN.md`
- `docs/CURSOR_DATA_CONVERGENCE_HANDOFF.md`
- `docs/RECOVERY_USER_GUIDE.md`

內容：

- 哪些 service 是唯一入口。
- UI 禁止直接處理 tombstone。
- sync 後必須 reconciliation。
- repair 工具不可修改 cloud events。

## 五、禁止事項

除非使用者明確要求，否則不要做：

- 直接刪除 IndexedDB events。
- 直接修改 Supabase events。
- 直接改 RLS / schema。
- 用市集日期 cutoff 猜要修哪些舊資料。
- 在 UI 裡用臨時判斷掩蓋資料問題。
- 一次重構整個 `useSync.ts`。
- 一次大改 `lib/db/events.ts` 多個 handler。

## 六、每階段驗證要求

每個實作階段完成後都必須執行：

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
git diff --check
```

分析 / 純文件階段至少執行：

```powershell
git diff --check
```

## 七、建議 Commit 切法

每個 commit 只做一個概念：

```text
docs: audit data access paths
refactor(events): add active event service
test(events): cover active deal tombstones
refactor(projections): add market projection rebuild service
test(projections): cover market stats rebuild
fix(recovery): use projection rebuild service
fix(sync): reconcile touched market projections after sync
refactor(markets): read daily deals through view model
docs: update data convergence progress
```

## 八、目前建議下一步

下一步應執行：

```text
C2.14：資料存取盤點
```

原因：

- 風險最低。
- 不改現有行為。
- 可以清楚界定 C2.15 / C2.16 的 service 邊界。
- 避免繼續用猜測方式修補資料問題。

完成 C2.14 後，再開始 C2.15 Active Event Service。
