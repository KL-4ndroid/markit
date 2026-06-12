# Cursor / Codex 資料收斂任務交接手冊

更新日期：2026-06-12
用途：讓 Cursor 或 Codex 可隨時接手 Markit 資料收斂計畫，並以低風險、可驗證、可回滾的方式逐步完成。

## 一、接手前必讀

請先閱讀：

1. `docs/DATA_CONVERGENCE_PLAN.md`
2. `docs/EVENT_HANDLER_CONVERGENCE_ANALYSIS.md`
3. `docs/STABILITY_OPTIMIZATION_FINAL_SUMMARY.md`
4. `docs/RECOVERY_USER_GUIDE.md`
5. `lib/events/event-read-model.ts`
6. `lib/db/event-tombstones.ts`
7. `hooks/useSync.ts`

目前核心問題：

- UI、sync、recovery、analytics 讀取資料的入口分散。
- `dailyStats` / `market totals` 是 projection cache，可能和 `events` 不一致。
- `deal_deleted` / `interaction_deleted` 是 tombstone，需要統一套用。
- Staff sync 會 sanitize，再 replay。若 event 已存在但 projection 沒更新，後續 sync 可能 skip，不會修正。
- 不應再靠單點修補。應逐步建立 active event service、projection service、view model。

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

任務類型：只分析
允許修改：新增 `docs/SYNC_RECONCILIATION_DESIGN.md`
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

## 六、可直接貼給 Cursor 的下一個 Prompt

```text
請執行 C2.14A：資料存取盤點。

重要：
- 只分析，不修改程式碼。
- 只允許新增或更新 docs/DATA_ACCESS_AUDIT.md。
- 不要新增測試。
- 不要更新其他文件。
- 不要 commit，除非我確認。
- 不要修改 Supabase / RLS / migration。

請閱讀：
- docs/DATA_CONVERGENCE_PLAN.md
- app/markets/[id]/page.tsx
- components/markets/DailyRevenueStats.tsx
- components/markets/DailyDealsModal.tsx
- components/markets/DailyTransactionLog.tsx
- components/markets/DealDetailModal.tsx
- lib/db/event-tombstones.ts
- lib/events/event-read-model.ts
- lib/db/hooks.ts
- hooks/useSync.ts
- app/recovery/page.tsx

請在 docs/DATA_ACCESS_AUDIT.md 中建立表格：

| 功能 | 檔案 | 目前資料來源 | 是否直接讀 db | 是否處理 tombstone | 風險 | 建議收斂方向 |

必須回答：
1. 哪些 UI 讀 dailyStats？
2. 哪些 UI 讀 db.events？
3. 哪些 UI 讀 market.totalRevenue / totalDeals？
4. 哪些地方處理 deal_deleted / interaction_deleted？
5. Owner sync 和 Staff sync 的資料流差異？
6. 哪些地方可能造成 dailyStats 與 events 不一致？
7. 下一步應抽出的 active event service API 清單。
8. 下一步應抽出的 market projection service API 清單。

完成後只執行：
- git diff --check
- git status -sb

回報：
- 修改檔案
- 主要發現
- 建議下一步
- git diff --check 結果
- git status -sb
```
