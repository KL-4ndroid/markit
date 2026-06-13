# Markit 資料存取收斂計畫

更新日期：2026-06-13
狀態：C2.14 資料存取盤點已完成；C2.15 Active Event Service 已建立；C2.16 Market Projection Service 正式入口已建立；C2.17 Recovery 已接入 projection service；C2.18 Sync Reconciliation 已降級為只偵測不自動修復；C2.18B Projection rebuild 已加入本機事件完整性防護；C2.18C owner revenue gap repair 已從 snapshot sync 移除，僅允許 /recovery 手動 dry-run 後執行；C2.18D snapshot hydration 曾嘗試補齊明細 events，但已由 C2.18E 取代；C2.18E snapshot sync / auto-create / manual create 已暫停，Owner/Staff 均回到事件同步路徑；C2.19 主要 UI active event 讀取已接入；C2.20 Staff tombstone sanitizer replay 欄位測試已補齊，Staff view 唯讀審查 SQL 已整理；C2.21 Cloud data consistency 唯讀審查 SQL 已整理；C2.23 Owner / Staff revenue hardening 已建立子計畫並開始執行；C2.30A Integrity Profile 基礎層已完成；C2.30B Staff sync preflight 已接入；C3 Cloud-first Authenticated Cache 成為後續主線
目標：逐步消除 Owner / Staff、events / dailyStats / market totals、tombstone / projection 之間的資料分裂。2026-06-13 起，後續主方向調整為：Supabase 是唯一長期真相來源，IndexedDB 降級為登入後可丟棄的本機快取與短暫操作緩衝，不再擴大本機長期資料庫責任。

## 一、問題摘要

目前專案已經具備事件溯源與本機 IndexedDB projection 架構，但資料存取路徑逐步分散，導致同一個業務事實可能從不同地方取得不同結果。實際產品使用情境已更接近「登入後從雲端取得資料；沒有網路時無法完整使用」，因此不應再把 IndexedDB 當作長期真相資料庫繼續擴張。

典型問題：

- 市集每日收入卡片讀 `dailyStats`，但點日期後的成交記錄讀 `deal_closed events`。
- `deal_deleted` 是 tombstone，但有些 UI 讀 active events，有些 UI 讀 projection cache。
- Owner sync 和 Staff sync 來源不同；目前 Owner 不再讀 snapshots，Owner 讀 `events`，Staff 讀 `staff_accessible_*` views。
- Staff sync 會 sanitize，再 replay handler，若 event 已存在但 projection 沒正確更新，後續 sync 會 skip existing event，不會重跑 handler。
- 本機修復工具只修 local projection，若 sync 再次 replay 或 cloud snapshot 有舊 projection，問題可能復發。
- `marketId` / `market_id`、`eventId` / `event_id`、`totalAmount` / `total_amount` 已逐步 canonicalize，但仍需要統一入口避免新舊格式再次分裂。

舊 C2 核心方向：

```text
Cloud events / staff views
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

新 C3 核心方向：

```text
Supabase canonical data
        ↓
authenticated pull by role
        ↓
normalize / sanitize / canonicalize
        ↓
replace local authenticated cache
        ↓
view model services
        ↓
UI
```

IndexedDB 的角色改為：

- 登入後快取授權資料。
- 讓 Dexie live query / 現有 UI 在過渡期可繼續工作。
- 儲存短暫 pending local operations。
- 可被清空並從雲端重新建立。

IndexedDB 不再應承擔：

- 跨帳號長期真相。
- 舊 snapshot projection 回放。
- 以 partial local events 自動修正雲端資料。
- 在沒有雲端確認時維護永久歷史。

## 二、收斂原則

1. Supabase 是唯一長期真相來源。
2. IndexedDB 是 authenticated cache，不是跨登入、跨帳號的長期資料庫。
3. 登入 / 切換帳號後，本機 cache 必須可安全清空並重建。
4. `dailyStats`、`market.totalRevenue`、`market.totalDeals` 是 projection / summary cache，不應被當作唯一真相。
5. UI 不直接處理 tombstone，不直接拼 raw payload。
6. Owner / Staff 可有不同雲端來源，但進入本機 cache 前必須 canonicalize / sanitize。
7. Staff sanitizer 不應破壞 replay 或顯示必要欄位。
8. 修復工具優先修本機 cache，不刪 events、不改雲端；雲端修正必須由獨立 SQL/RPC 任務處理。
9. 每個階段只做一件事，小 commit，小測試，小風險。

## 三、整體階段表

| Phase | 名稱 | 目標 | 主要產出 | 風險 | 優先 |
|---|---|---|---|---|---|
| C2.14 | 資料存取盤點 | 找出所有直接讀 DB / projection / raw events 的地方 | `DATA_ACCESS_AUDIT.md` | 低 | 完成 |
| C2.15 | Active Event Service | 統一 active deals / interactions / tombstones 讀取 | `active-event-service.ts` + tests | 中 | 已建立，待 UI 接入 |
| C2.16 | Market Projection Service | 從 active events 重建單一 market projection | `market-projection-service.ts` + tests | 中 | 已建立，待 Recovery / Sync 接入 |
| C2.17 | Recovery 接入 Projection Rebuild | 讓 `/recovery` 只用 projection service 修本機統計 | UI dry-run / execute | 中 | 已接入 |
| C2.18 | Sync 後 Reconciliation | sync 完成後檢查 touched markets，但不在 sync 中自動重建 projection | sync reconciliation hook | 中高 | 已降級為 observation-only |
| C2.18B | Projection Rebuild 完整性防護 | 只有明顯 2x/3x 重複累加時才允許本機 events 重建 projection；疑似 partial events 時跳過 | projection service + repair tests | 中高 | 已完成 |
| C2.18C | Owner Revenue Gap Repair 手動化 | 移除 snapshot sync 中的自動 revenue repair，避免登入/同步時以不完整 events 覆寫 projection | useSync snapshot path | 高 | 已完成 |
| C2.18D | Snapshot 明細事件 Hydration | 曾嘗試在 snapshot 後補齊缺失成交明細 events，但仍保留 snapshot projection-only 風險 | owner detail hydration | 中高 | 已由 C2.18E 取代 |
| C2.18E | Snapshot 功能暫停 | 停用 snapshot load、auto-create、beforeunload create 與設定頁手動 create；底層 snapshot module 暫留供未來重新設計 | useSync + settings | 中 | 已完成 |
| C2.19 | UI View Model 收斂 | 市集詳情、每日成交、分析頁改讀 view model | `market-detail-view-model.ts` 等 | 中 | 市集詳情、每日收入、每日記錄、分析頁 active events 已接入 |
| C2.20 | Staff Data Flow 加固 | 確保 Staff tombstone / sanitized events 可正確 replay | tests + service guard | 中高 | sanitizer 欄位保護已測，staff view SQL 已整理待線上驗證 |
| C2.21 | 舊資料雲端一致性審查 | 確認 cloud events / snapshots / projection 是否仍有污染 | SQL 診斷報告 | 中 | SQL 已整理，待線上執行 |
| C2.22 | 完整文件與操作手冊 | 建立未來維護規範 | docs | 低 | P2 |
| C2.23 | Owner / Staff 收入權限加固 | 將外部加固需求併入主收斂計畫，先處理 deal mode flags、Staff 刪除入口、成交筆數與敏感欄位 | `OWNER_STAFF_REVENUE_HARDENING_PLAN.md` | 中 | 進行中 |
| C2.30A | Integrity Profile 基礎層 | 將 owner full data 與 staff scoped data 的完整性檢查分流；staff 局部資料的 out-of-scope references 不再當作 fatal | `integrity.ts`, high-risk pages | 中 | 已完成 |
| C2.30B | Staff Sync Preflight | Staff sync 寫入與 replay 前先檢查本機 scoped dataset 是否具備必要 market/product，避免 orphan event 造成 handler fatal | `staff-event-preflight.ts`, `useSync.ts` | 中 | 已完成 |
| C3.1 | Cloud-first 架構決策落地 | 明確禁止繼續擴大 IndexedDB 長期真相責任，將本機資料改為 authenticated cache | docs + sync design | 低 | 下一步 |
| C3.2 | Login / account switch cache reset | 登入、登出、切換 Owner/Staff 時清空不屬於目前使用者的 local cache，避免跨帳號殘留 | auth/sync boundary | 中 | P0 |
| C3.3 | Full cloud pull → replace cache | Owner / Staff 從雲端拉授權資料後，以 replace-cache 方式寫入本機，而非和舊本機資料長期 merge | `useSync.ts` / cache service | 高 | P0 |
| C3.4 | Owner missing market hydration | Owner events 匯入前確保對應 markets 存在；若雲端也不存在才視為 fatal | sync preflight/service | 中 | P0 |
| C3.5 | Cloud summary view model | UI 優先讀雲端已授權 summary 或本機 normalized cache，不再依賴不完整 local replay 自動修 projection | view model services | 中高 | P1 |
| C3.6 | Pending local operations boundary | 若未來保留離線/弱網操作，只允許 pending operations 暫存；成功 push 後由 cloud pull 重建 cache | operation queue | 中高 | P1 |

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

2026-06-12 修正：Sync reconciliation 已改為 observation-only。原因是 snapshot / staff-view / historical backfill 可能讓本機 event store 只有部分事件；若此時直接用本機 events 重建 projection，會把正確的舊收入覆寫成只剩新增事件。自動重建必須等到能證明該 market 的本機 events 完整後才可恢復。

2026-06-12 追加 C2.18B：Projection rebuild 加入保守完整性防護。當現有 projection 高於本機 active events，但差異不像整數倍重複累加（例如不是 2x / 3x），系統會視為 `local_events_incomplete` 並跳過修復。這避免 snapshot 載入 projection 但 local events 只含少數新補登事件時，把正確總收入覆寫成 partial events 的小額總和。

2026-06-12 追加 C2.18C：`repairOwnerRevenueGaps()` 已從 snapshot sync path 移除。此工具只能由 `/recovery` 以 dry-run / confirm 方式手動執行。原因是 snapshot path 可能先載入正確 projection，但本機 events 還不是完整歷史；若在此時自動 replay 或 reset projection，會讓舊市集收入被 partial local events 覆寫。

2026-06-12 追加 C2.18D：snapshot sync 重新加入「安全明細事件 hydration」。這不是 repair：只有在本機 market / dailyStats projection 已經等於雲端 totals、但本機缺少部分 `deal_closed` 明細 events 時，才把缺失 events 存進 IndexedDB。此流程不執行 event handler、不重建 projection、不修改雲端，目的只是讓每日收入明細能點開看到成交記錄。

2026-06-12 追加 C2.18E：snapshot 功能已先暫停。原因是目前 snapshot 主要保存 projection tables，缺少完整 event history，容易造成「畫面總額正確但明細 events 不完整」或「載入 projection 後再 replay partial events」的資料分裂。正式流程已停用 snapshot load、auto-create、beforeunload create 與設定頁手動 create；`lib/db/snapshot.ts` 暫時保留，未來若重新設計，必須以完整 events 或可驗證 hydration 為前提。

建議做法：

```text
sync import events
  ↓
collect touched marketIds
  ↓
compare projection
  ↓
if mismatch: log / report only
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

- Owner / Staff sync 完成後，不會因不完整本機 events 自動覆寫 projection。
- Tombstone 已存在但 projection stale 的情境仍需透過 `/recovery` projection rebuild 修復。
- 若未來要恢復自動修復，必須先新增 market event completeness guard。

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

審查文件：

```text
docs/CLOUD_DATA_CONSISTENCY_AUDIT.md
```

只做 SQL 診斷，不直接修：

- cloud `markets.total_revenue` vs `events deal_closed - deal_deleted`
- snapshots 是否含污染 projection
- staff view 是否缺 tombstone
- deleted target 是否 missing
- duplicate semantic deals 是否疑似重複寫入

產出：

```text
docs/CLOUD_DATA_CONSISTENCY_AUDIT.md
```

### C2.30A：Integrity Profile 基礎層

目的：避免把「Owner 完整備份」與「Staff 授權範圍資料」套用同一套 fatal integrity 規則。

背景：

- `events[x] 指向不存在的 market_id` 對 Owner full backup 是嚴重錯誤。
- 但對 Staff scoped dataset，這可能代表該事件的 market/product 不在目前授權範圍或尚未同步完成。
- `deal_deleted references event not in snapshot` 已經是 warning，不能讓這類 tombstone warning 阻斷員工進入頁面。

Profile 規則：

| Profile | 用途 | out-of-scope market/product reference |
|---|---|---|
| `owner_full` | 匯入、完整備份、Owner 完整資料庫 | error |
| `staff_scoped` | Staff 本機 DB、Staff sync 後頁面初始化 | warning |

已完成項目：

- `checkBackupIntegrity(data, { profile })` 支援 `owner_full` / `staff_scoped`。
- 預設 profile 仍是 `owner_full`，避免降低匯入與完整備份安全性。
- `initializeDatabaseSafely({ profile })` 與 `checkCurrentDatabaseIntegrity({ profile })` 支援 profile。
- 市集列表、商品列表、市集詳情已等角色判斷完成後，以 Staff 身分使用 `staff_scoped` 初始化。
- 新增 `tests/integrity-profile.test.ts`。

後續觀察：

- 評估商品詳情是否也需要 role-aware initialization。
- Recovery 頁可增加 profile 顯示，讓使用者知道哪些是 fatal errors、哪些是 scoped warnings。

### C2.30B：Staff Sync Preflight

目的：Staff 從 `staff_accessible_events` 拉取 partial/scoped events 時，不再把必定孤兒化的事件寫入本機並交給 handler replay。

背景：

- Staff view 可能包含 tombstone 或 projection event，但對應 market/product 不在本機授權範圍。
- `staff_scoped` integrity profile 可以讓這類資料不阻斷頁面，但更好的方向是在 sync 寫入前先跳過明確不可 replay 的事件。
- Tombstone 不應因 target event 缺失而被過度跳過；`deal_deleted` 在本計畫中只要求 market 可用。

Preflight 規則：

| 類型 | 規則 |
|---|---|
| market-scoped events | 缺 marketId 或本機沒有該 market 時跳過 |
| product_updated / product_deleted | 缺 productId 或本機沒有該 product 時跳過 |
| deal_deleted | market 存在即可匯入；不因 target event 缺失而跳過 |
| deal_closed | market 存在即可匯入；不因 items 中 product 不在本機而跳過 |
| global events | 不要求 market/product |

已完成項目：

- 新增 `lib/sync/staff-event-preflight.ts`。
- Staff `syncEventsToIndexedDB()` 在 `db.events.add()` 與 handler replay 前執行 preflight。
- 新增 `tests/staff-event-preflight.test.ts`，鎖定保守 skip 與不過度 skip 的邊界。

後續觀察：

- 若 staff view 後續改為完全 SQL 層過濾，preflight 仍可保留作為本機安全網。
- 若未來 product tombstone 需要在缺 product 時仍匯入，必須先確認 handler 不會 fatal，並補測試。

### C3.1：Cloud-first 架構決策落地

目的：停止把 IndexedDB 當成長期真相資料庫繼續補強，改成「Supabase canonical source + authenticated local cache」。

決策：

- 沒網路時不承諾完整使用。
- 本機資料可被清空並從雲端重新建立。
- Local projection repair 只處理暫時 cache，不代表雲端真相已被修正。
- 未來若要恢復 PWA 離線啟動，必須另開計畫，不能混入本收斂主線。

允許：

- 新增文件與小型 service 邊界。
- 將登入 / 登出 / 切換帳號與 cache lifecycle 明確化。
- 將 UI 文案從「離線優先」改為「本機儲存 / 登入後雲端備份」。

禁止：

- 直接刪除雲端資料。
- 直接移除 IndexedDB / Dexie。
- 一次重寫 `useSync.ts`。
- 把 owner_full integrity missing market 降級為 warning。

完成條件：

- `docs/DATA_CONVERGENCE_PLAN.md` 和 `docs/CURSOR_DATA_CONVERGENCE_HANDOFF.md` 明確標示 C3 是後續主線。
- 後續任務不再新增 snapshot / long-lived local DB 功能。

### C3.2：Login / Account Switch Cache Reset

目的：解決「老闆登出後登入員工、或員工登出後登入老闆，本機仍殘留上一個身份資料」的根本風險。

建議流程：

```text
auth user changes
  ↓
detect previousUserId / previousRoleMode
  ↓
if identity changed:
  clear authenticated cache tables
  reset sync cursor
  pull authorized cloud data
  render
```

應清理：

- `markets`
- `products`
- `events`
- `dailyStats`
- `settings.lastSyncAt` 或與 sync cursor 相關欄位
- role cache 只可依既有 `invalidateRoleCache()` 規則處理，不要亂清所有 localStorage。

不應清理：

- app theme / UI preference，除非已證明與資料身份有關。
- pending operations，除非已有安全 push / discard 設計。

測試需求：

- Owner → Staff：不保留 owner-only markets/events。
- Staff → Owner：不保留 staff-sanitized projection 污染 owner cache。
- Same user refresh：不可每次都清空，避免不必要 loading。

### C3.3：Full Cloud Pull → Replace Cache

目的：避免本機舊資料與雲端資料長期 merge，造成 orphan events、missing markets、projection stale。

方向：

```text
fetch authorized markets/products/events
  ↓
normalize / sanitize
  ↓
validate cloud response shape
  ↓
transaction replace local cache
  ↓
compute / hydrate view model
```

Owner：

- Source: Supabase `markets`, `products`, `events` with owner/team scope.
- 必須先寫 `markets` / `products`，再寫 `events`。
- events 匯入前檢查 market 是否存在；缺 market 時先嘗試 hydration。

Staff：

- Source: `staff_accessible_markets`, `staff_accessible_products`, `staff_accessible_events`。
- 保留 sanitizer。
- 保留 staff preflight。
- 不以 staff local cache 反推雲端真相。

完成條件：

- 新增小型 cache replace service，而不是在 `useSync.ts` 裡散落清表與 put。
- 先做 dry-run / tests，確認 replace scope 只限目前 authenticated user。

### C3.4：Owner Missing Market Hydration

目的：修正 owner_full integrity 中「events 指向不存在 market_id」的本機 cache 缺口，不降低 owner_full 嚴格性。

流程：

```text
collect event.market_id from local events or incoming cloud events
  ↓
find ids missing in local db.markets
  ↓
fetch those markets from Supabase
  ↓
if found and authorized: put into db.markets
  ↓
if missing in cloud: keep fatal integrity error
```

安全規則：

- 不刪 events。
- 不修改雲端。
- 不自動重建收入。
- 不把 owner_full missing market 改成 warning。

完成條件：

- Owner 市集列表不再因「本機 events 比 markets 先存在」而卡住。
- 若雲端真的沒有該 market，仍保留錯誤並引導 `/recovery`。

### C3.5：Cloud Summary View Model

目的：逐步減少 UI 對本機 projection cache 的依賴。

優先頁面：

1. 市集列表卡片收入 / 成交數。
2. 市集詳情總收入。
3. 每日收入明細。
4. 分析頁。

策略：

- 先使用本機 normalized cache 對齊雲端 summary。
- 若 cloud 提供可靠 summary view，UI view model 可直接以 cloud summary 為主。
- active event 明細仍由 active event service 處理 tombstone。

### C3.6：Pending Local Operations Boundary

目的：保留未來弱網/短暫離線操作可能性，但不讓 pending 本機資料變成長期真相。

規則：

- 本機新操作先進 pending queue。
- push 成功後，不直接相信本機 projection。
- push 成功後由 cloud pull / replace cache 取得最新狀態。
- push 失敗時顯示明確 pending/error 狀態。

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
