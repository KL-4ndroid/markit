# Cursor / Codex 資料收斂任務交接手冊

更新日期：2026-06-13
用途：讓 Cursor 或 Codex 可隨時接手 Markit 資料收斂計畫，並以低風險、可驗證、可回滾的方式逐步完成。

## 一、接手前必讀

請先閱讀：

1. `docs/DATA_CONVERGENCE_PLAN.md`
2. `docs/CLOUD_FIRST_CACHE_AUDIT.md` ← C3.1A 新增
3. `docs/EVENT_HANDLER_CONVERGENCE_ANALYSIS.md`
4. `docs/STABILITY_OPTIMIZATION_FINAL_SUMMARY.md`
5. `docs/RECOVERY_USER_GUIDE.md`
6. `lib/events/event-read-model.ts`
7. `lib/db/event-tombstones.ts`
8. `hooks/useSync.ts`

## 一、接手前必讀（續）

目前核心問題：

- UI、sync、recovery、analytics 讀取資料的入口分散。
- `dailyStats` / `market totals` 是 projection cache，可能和 `events` 不一致。
- `deal_deleted` / `interaction_deleted` 是 tombstone，需要統一套用。
- Staff sync 會 sanitize，再 replay。若 event 已存在但 projection 沒更新，後續 sync 可能 skip，不會修正。
- 2026-06-13 起，後續主線改為 Cloud-first Authenticated Cache：Supabase 是唯一長期真相來源，IndexedDB 只作為登入後可丟棄快取與短暫 pending 操作緩衝。
- 不應再靠單點修補，也不應繼續擴大 IndexedDB 的長期資料庫責任。

新的架構決策：

```text
Supabase canonical source
  ↓
role-aware cloud pull
  ↓
normalize / sanitize / canonicalize
  ↓
replace authenticated local cache
  ↓
view models
  ↓
UI
```

請勿再新增 snapshot / long-lived local DB 功能。現有 IndexedDB 在過渡期保留，是為了讓 Dexie hooks 和既有 UI 可運作，不代表它仍是長期真相。

## 二、工作模式

每次任務都必須遵守：

- 先分析，再實作。
- 每次只做一件事。
- 不混入不相關檔案。
- 不碰使用者未提交的變更。
- 不做大規模重構。
- 不修改 Supabase schema / RLS / RPC，除非任務明確要求。
- 不刪除 events。
- 不直接修改雲端資料。
- 不新增 debug window API，正式修復入口放 `/recovery`。
- 不把 `owner_full` integrity 的 missing market 降級成 warning。
- 不使用市集日期 cutoff 猜測哪些資料要修。
- 不再恢復 snapshot sync / auto-create / manual create。
- 不在 sync 中自動用 partial local events 重建 revenue projection。

每個實作任務完成後執行：

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
git diff --check
```

純分析 / 文件任務至少執行：

```powershell
git diff --check
```

Commit 前必須回報：

- 修改檔案
- 行為變更
- 測試結果
- `git status -sb`
- 是否有未處理的 unstaged changes

## 三、目前建議任務順序

> 重要：C2.14～C2.30B 已全部完成；C2.13A Bug Fixes 已完成並推送（commit 86569d8）；C3.1A Cloud-first Cache Boundary Audit 已完成（`docs/CLOUD_FIRST_CACHE_AUDIT.md`）；C3.2A Login/Role Switch Cache Reset 已完成並推送（commit 31816d8）；C3.3A Owner Missing Market Hydration 已完成並推送（commit b420068）；C2.14A 資料存取盤點已完成（`docs/DATA_ACCESS_AUDIT.md`）；C2.15A Active Event Service 設計已完成（`docs/ACTIVE_EVENT_SERVICE_DESIGN.md`）；C2.15B Active Event Service 實作已完成並推送（commit da69556）；C2.16A Market Projection Cache 設計已完成（`docs/MARKET_PROJECTION_CACHE_DESIGN.md`）；C2.16B Market Projection Cache 實作已完成並推送（commit 8773e47）；**C2.17A Recovery Projection Rebuild 分析已完成（`docs/RECOVERY_PROJECTION_DESIGN.md`）— 功能已完整實作，無需修改程式碼**；**C2.18A Sync Reconciliation 分析覆核已完成 — `projection-reconciliation.ts` 已整合，observation-only 模式**；**C2.19A Market Detail View Model 設計已完成（`docs/MARKET_DETAIL_VIEW_MODEL_DESIGN.md`）**。後續優先：C3.5（Cloud Summary View Model）或 C3.3 評估（replace cache 策略）。

### Task C3.1A：Cloud-first Cache Boundary 盤點

任務類型：只分析 / 文件
允許修改：`docs/DATA_CONVERGENCE_PLAN.md`、`docs/CURSOR_DATA_CONVERGENCE_HANDOFF.md`、可新增 `docs/CLOUD_FIRST_CACHE_AUDIT.md`
禁止修改：程式碼、測試、Supabase、RLS、UI

目標：

盤點目前哪些流程仍把 IndexedDB 當作長期真相資料庫，並設計最小改造順序，讓 IndexedDB 逐步降級為 authenticated cache。

必須檢查：

- `hooks/useSync.ts`
- `lib/db/clear-user-data.ts`
- `lib/db/hooks.ts`
- `lib/db/index.ts`
- `lib/sync/*`
- `app/markets/page.tsx`
- `app/markets/[id]/page.tsx`
- `app/products/page.tsx`
- `app/recovery/page.tsx`
- `lib/supabase/auth-context.tsx`
- `hooks/useUserRole.ts`

必須輸出：

```markdown
| 流程 | 目前是否依賴長期 IndexedDB | 風險 | Cloud-first 改造建議 | 優先級 |
|---|---:|---|---|---|
```

必須回答：

1. 登入 / 登出 / 切換帳號目前是否清理 authenticated cache？
2. 哪些表應在 user/role 改變時清空？
3. `lastSyncAt` 是否應跟 cache 一起 reset？
4. Owner pull 是否可能先寫 events、但缺 markets？
5. Staff pull 是否仍可能留下上一身份資料？
6. 哪些 UI 仍會把 stale local cache 當真相？
7. 最小 C3.2 實作應碰哪些檔案？

完成條件：

- 不改程式碼。
- 文件足以讓下一個任務直接實作 C3.2。
- 驗證：`git diff --check`。

建議 commit：

```text
docs: audit cloud-first cache boundaries
```

### Task C3.2A：Login / Account Switch Cache Reset 設計

任務類型：先分析，再等確認後實作
允許修改：初次任務只允許文件
禁止修改：程式碼、測試、Supabase、RLS、UI
**狀態：✅ 實作已完成並推送（commit 31816d8），見 `docs/LOGIN_CACHE_RESET_DESIGN.md`**

目標：

設計「身份改變時清空並重建 authenticated cache」的最小安全方案。

必須設計：

- 如何偵測 `previousUserId !== currentUserId`
- 如何偵測 `previousRoleMode !== currentRoleMode`
- 清理哪些 Dexie tables
- 是否保留 pending local events
- 如何 reset `settings.lastSyncAt`
- 清理後何時觸發 sync
- 同一使用者 refresh 時不可每次清空
- scope-based reset 函式設計

**設計產出：**

- `docs/LOGIN_CACHE_RESET_DESIGN.md`（已產出）
- 核心：`resetAuthenticatedCache(scope: 'full' | 'role_switch')` 統一所有清除場景
- 接入點：被動登出、主動登出、用戶切換共用同一函式

完成條件：

- 產出 C3.2 實作計畫。
- 列出 commit 切法與測試清單。
- 不修改程式碼，等使用者確認。

### Task C3.3A：Owner Missing Market Hydration 設計

任務類型：先分析，再等確認後實作
允許修改：初次任務只允許文件
禁止修改：程式碼、測試、Supabase、RLS、UI
**狀態：✅ 設計已完成，見 `docs/OWNER_MARKET_HYDRATION_DESIGN.md`**

目標：

設計「Owner pull 時，確保事件 replay 前 market 已寫入本地 cache」的安全方案。

**設計產出：**

- `docs/OWNER_MARKET_HYDRATION_DESIGN.md`（已產出）
- 核心：方案 B — `batchHydrateMarkets(marketIds)` 在 replay loop 前批次補寫 market
- 缺口分析：`pullAllEvents` 的 handler replay 依賴 market 存在於 `db.markets`

完成條件：

- 產出 C3.3 實作計畫。
- 列出 commit 切法與測試清單。
- 不修改程式碼，等使用者確認。

### Task C2.14A：資料存取盤點

任務類型：只分析 / 文件
允許修改：只允許新增或更新 `docs/DATA_ACCESS_AUDIT.md`
禁止修改：程式碼、測試、Supabase、RLS、UI

目標：

盤點專案中所有資料讀取路徑，找出 raw DB access、projection access、active event filtering、tombstone handling 的位置。

請檢查：

- `app/markets/[id]/page.tsx`
- `components/markets/DailyRevenueStats.tsx`
- `components/markets/DailyDealsModal.tsx`
- `components/markets/DailyTransactionLog.tsx`
- `components/markets/DealDetailModal.tsx`
- `app/analytics/*`
- `lib/db/hooks.ts`
- `lib/db/event-tombstones.ts`
- `lib/events/event-read-model.ts`
- `hooks/useSync.ts`
- `/recovery` 相關元件與 services

文件需包含表格：

```markdown
| 功能 | 檔案 | 目前資料來源 | 是否直接讀 db | 是否處理 tombstone | 風險 | 建議收斂方向 |
|---|---|---|---:|---:|---|---|
```

完成條件：

- 文件能回答「哪個畫面讀 events，哪個畫面讀 dailyStats，哪個畫面讀 market totals」。
- 文件列出 C2.15 / C2.16 要抽出的 service。
- 不改程式碼。

建議 commit：

```text
docs: audit data access paths
```

### Task C2.15A：設計 Active Event Service

任務類型：先分析，不實作
允許修改：可更新 `docs/DATA_ACCESS_AUDIT.md` 或新增 `docs/ACTIVE_EVENT_SERVICE_DESIGN.md`
禁止修改：程式碼、測試

目標：

設計統一 active events 讀取服務，明確 API 和 tombstone 規則。

需回答：

- `getActiveDealEvents()` 是否保留或包裝？
- semantic tombstone fallback 是否應拆為可測純函式？
- full backfill / simple backfill / normal deal 是否共用同一套判斷？
- UI 要改讀哪些 API？

建議 API：

```ts
getActiveDealEventsForMarket(marketId: string)
getActiveDealEventsForDate(marketId: string, date: string)
getActiveInteractionEventsForMarket(marketId: string)
getDealSummaryFromEvents(marketId: string)
```

完成條件：

- 產出可實作設計。
- 列出測試案例。
- 不改程式碼。

### Task C2.15B：實作 Active Event Service

任務類型：小型實作
允許修改：

- `lib/events/active-event-service.ts`
- `tests/active-event-service.test.ts`
- `package.json` 測試指令

禁止修改：

- UI
- sync
- Supabase
- `lib/db/events.ts`

必要測試：

- 正常 deal_closed 會出現。
- deal_deleted target id 存在時會隱藏 target。
- deal_deleted target id 不存在時 semantic fallback 只隱藏一筆相同語意成交。
- 不同 revenue/date/market 不會被誤藏。
- full backfill 會被視為 active deal。
- simple manual backfill 會被視為 active deal。

建議 commit：

```text
refactor(events): add active event service
test(events): cover active deal tombstones
```

### Task C2.16A：設計 Market Projection Service

**狀態：✅ 設計覆核已完成（`docs/MARKET_PROJECTION_CACHE_DESIGN.md`），現有 Projection Cache 架構已足夠，無需新增 service 檔案**

任務類型：先分析，不實作
允許修改：新增 `docs/MARKET_PROJECTION_SERVICE_DESIGN.md`
禁止修改：程式碼、測試

目標：

設計「從 active events 重建單一 market projection」的 service。

需回答：

- 哪些欄位重建？
- 是否重建商品庫存？答案應為否。
- 如何處理 cost 被 staff sanitizer 移除？
- 如何處理 missing product？
- 如何處理 tombstone target missing？

建議 API：

```ts
compareMarketProjectionWithEvents(marketId: string)
rebuildMarketStatsFromEvents(marketId: string)
```

### Task C2.16B：實作 Market Projection Service

**狀態：✅ DailyRevenueStats 統一讀取來源已完成並推送（commit 8773e47）**

任務類型：中型實作
允許修改：

- `lib/projections/market-projection-service.ts`
- `tests/market-projection-service.test.ts`
- `package.json`

禁止修改：

- sync
- UI
- Supabase
- `lib/db/events.ts`

重建範圍：

- `market.totalRevenue`
- `market.totalDeals`
- `market.totalInteractions`
- `dailyStats`

不重建：

- product stock
- product totalSold
- cloud records
- events

必要測試：

- normal deal
- manual backfill
- full backfill
- deal_deleted
- interaction_recorded
- interaction_deleted
- projection already correct
- projection double counted

建議 commit：

```text
refactor(projections): add market projection rebuild service
test(projections): cover market stats rebuild
```

### Task C2.17A：Recovery 接入 Projection Rebuild

**狀態：✅ 分析覆核完成（`docs/RECOVERY_PROJECTION_DESIGN.md`）— 功能已完整實作，無需修改程式碼**

任務類型：UI + service 接入
允許修改：

- `/recovery` 頁面
- 新增 projection repair panel
- 相關 service import

禁止修改：

- sync
- Supabase
- debug tools

功能要求：

- owner-only guard
- dry-run
- confirm
- execute only dry-run result
- 清楚說明只修本機 projection，不改雲端、不刪 events

建議 commit：

```text
fix(recovery): add projection rebuild repair panel
```

### Task C2.18A：Sync 後 Reconciliation 設計

**狀態：✅ 分析覆核完成（`docs/SYNC_RECONCILIATION_DESIGN.md` 已更新）— `projection-reconciliation.ts` 已整合至 `useSync.ts`，所有 sync 路徑均已接入 reconciliation（observation-only 模式）**

任務類型：只分析 / 文件覆核
允許修改：更新 `docs/SYNC_RECONCILIATION_DESIGN.md`
禁止修改：程式碼、測試

目標：

設計 sync 完成後如何只針對 touched market ids 做 projection comparison / rebuild。

需回答：

- Owner `pullAllEvents` 如何收集 market ids？
- Owner `pullIncrementalEvents` 如何收集 market ids？
- Staff `syncEventsToIndexedDB` 如何收集 market ids？
- existing event skip 時是否仍要加入 touched market ids？
- reconciliation 失敗是否阻斷 sync？

原則：

- 不全量掃描所有 markets。
- 不重跑所有 events。
- reconciliation error 應回報，但不應讓登入卡死。

### Task C2.18B：實作 Sync 後 Reconciliation

任務類型：高風險，小步實作
允許修改：

- `hooks/useSync.ts`
- projection service
- tests if service 可測

禁止修改：

- Supabase
- RLS
- UI 大改

建議拆三個 commit：

```text
refactor(sync): collect touched market ids during event import
fix(sync): reconcile touched market projections after owner sync
fix(sync): reconcile touched market projections after staff sync
```

### Task C2.19A：UI View Model 設計

**狀態：✅ 分析已完成（`docs/MARKET_DETAIL_VIEW_MODEL_DESIGN.md`）— 識別雙資料來源問題，設計 unified view model API，規劃 3 步實作路徑**

任務類型：只分析
目標：設計市集詳情 UI 的穩定 view model。

建議輸出：

```text
docs/MARKET_DETAIL_VIEW_MODEL_DESIGN.md
```

### Task C2.19B：市集詳情成交列表改讀 View Model

任務類型：小型 UI refactor
優先範圍：

- 每日成交 modal
- DailyTransactionLog

禁止：

- 改樣式大重構
- 改 sync

## 四、特別注意的已知風險

### 1. full backfill 有 dailyStats 但成交列表空白

可能原因：

- `deal_closed` event 不存在。
- `deal_closed` event 被 tombstone semantic fallback 隱藏。
- `dealDate` / `market_id` 不符合 UI 篩選。

不要用 UI hack 修。應透過 active event service 診斷。

### 2. Owner 刪除後 Staff 還看到補登

可能原因：

- Staff view 沒撈到 `deal_deleted`。
- Staff 本機有 `deal_deleted`，但 projection 沒 replay 成功。
- Staff sync 因 event id 已存在而 skip，不再重跑 handler。

不要直接刪 staff 本機 events。應用 projection reconciliation 修。

### 3. 收入 double / triple

可能原因：

- snapshot projection 已含收入，後續 events 又 replay。
- projection cache 被重複累加。
- cloud snapshot 曾含污染 projection。

不要用 cutoff 猜舊市集。應從 active events 重建 projection。

## 五、每次回報格式

請用以下格式回報：

```markdown
回報

修改檔案：
- path：變更摘要

行為變更：
- ...

測試：
- npm test：pass/fail
- npx tsc --noEmit：pass/fail
- npm run lint：pass/fail
- npm run build：pass/fail
- git diff --check：pass/fail

git status -sb：
```text
...
```

是否有未處理風險：
- ...

是否已 commit：
- 是 / 否
- commit hash:
```

## 六、可直接貼給 Cursor 的下一個 Prompt（C3.2A 實作）

```text
請執行 C3.3A：Owner Missing Market Hydration 實作。

重要：
- 只修改 docs/LOGIN_CACHE_RESET_DESIGN.md 中指定的檔案
- 允許修改 lib/db/clear-user-data.ts 和 lib/supabase/auth-context.tsx
- 不要修改 hooks/useSync.ts
- 不要新增測試
- 不要 commit，等我確認
- 不要修改 Supabase / RLS / migration
- 不要恢復 snapshot 功能
- 不要刪除 IndexedDB / Dexie
- 不要把 owner_full integrity missing market 降級成 warning

請閱讀：
- docs/OWNER_MARKET_HYDRATION_DESIGN.md
- hooks/useSync.ts
- lib/data-mappers.ts

實作：
1. 在 hooks/useSync.ts 新增 batchHydrateMarkets(marketIds) 函式
2. 在 pullAllEvents 的 replay loop 前呼叫 batchHydrateMarkets
3. 對 hydration-missing 的事件記錄 warning，但繼續處理其他事件
4. 執行 npm test、npx tsc --noEmit、npm run lint、npm run build
5. 執行 git diff --check

完成後報告：
- 修改的檔案
- 行為變更（首次同步或跨設備登入的市場 hydration 行為）
- 測試結果
```
