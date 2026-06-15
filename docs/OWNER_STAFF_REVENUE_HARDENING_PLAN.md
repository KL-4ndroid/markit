# Owner / Staff 收入與權限加固計畫

> **⚠️ 維護中（本檔仍在追蹤 C2.27-C2.29）**
> 階段表於 2026-06-14 補完（C2.26 透過 C2.30C 實質完成；C2.30C / C2.30D / C2.31 新增）。
> 整體計畫單一權威入口見 [`docs/CONVERGENCE_ARCHIVE.md`](./CONVERGENCE_ARCHIVE.md) §4。
> 本檔**保留維護**（C2.27-C2.29 仍待分析），格式應與 `DATA_CONVERGENCE_PLAN.md` 對齊。
>
> **2026-06-14 補充**：C3.4（Projection 二次累加修復計畫）已另開檔 [`docs/PROJECTION_DOUBLECOUNT_FIX_PLAN.md`](./PROJECTION_DOUBLECOUNT_FIX_PLAN.md) 追蹤，**不**併入本檔。理由：C3.4 是 sync/projection 收斂主線，與本檔「員工脫敏」主題不同。

更新日期：2026-06-12

## 目標

本文件是 `DATA_CONVERGENCE_PLAN.md` 的安全加固子計畫，不另開第二條資料收斂主線。目標是降低 Owner / Staff 在收入、補登、刪除、敏感財務欄位與同步顯示上的分裂風險。

## 執行原則

1. 先補測試，再改行為。
2. 每次只處理一個可驗證風險點。
3. 不同時修改 UI、sync、RLS、migration。
4. Supabase migration 只先做審查與草稿，未經確認不套用。
5. Staff 權限採 fail-closed：不確定時不顯示 Owner-only UI。

## 階段表

| Phase | 名稱 | 目標 | 主要檔案 | 狀態 |
|---|---|---|---|---|
| C2.23 | Deal mode flags 明確化 | `deal_closed` 一律寫入明確 `isBackfill` / `isManualEntry` boolean，避免補登與正常成交語意模糊 | `lib/db/hooks.ts`, `tests/deal-mode-flags.test.ts` | 已完成 |
| C2.24A | Staff 刪除入口封鎖 | Staff 不顯示成交 / 互動刪除入口；`DailyTransactionLog` 預設唯讀，只有明確 `allowDelete` 才顯示刪除 | `DailyTransactionLog`, `daily-log-permissions` | 已完成 |
| C2.24B | 刪除 service 權限防護 | service 層加入明確 role / permission guard，避免非 UI 入口誤觸發 tombstone | `event-deletion-service` | 已完成 |
| C2.25 | DailyTransactionLog 成交筆數修正 | 成交筆數使用 `getDealEventCount()`，支援 `manualDealCount` | `components/markets/DailyTransactionLog.tsx` | 已完成 |
| C2.26 | Staff 敏感財務欄位 UI 審查 | Staff 不顯示成本、利潤、毛利率、費用、供應商資訊 | `lib/permissions/PermissionGate.ts` + 各 UI 元件 | ✅ **透過 C2.30C PermissionGate 整合實質完成**（不再逐欄位判斷，改用統一脫敏閘） |
| C2.27 | Staff local-first detail 檢查 | Staff 詳情頁優先使用已 sanitize 的本機資料，避免 remote row 曝露敏感欄位 | `components/markets/StaffMarketDetailView.tsx` + 三層防線 | ✅ **已透過 StaffMarketDetailView 重構 + 三層防線實質完成**（不再需要大改 production code，僅剩文件收尾與小型測試補強；詳見 [`docs/C2.27_REANALYSIS_2026_06_15.md`](./C2.27_REANALYSIS_2026_06_15.md)） |
| C2.28 | Role fail-closed 評估 | role loading / error / unknown 期間不可視為 owner；infoLevel 必須是 0 | `useUserRole`, `sync-context`, PermissionGate | 🟡 **已分析，已完成 sync-context / role error fail-closed 最小修補，頁面 render guard 待 C2.28B**（詳見 [`docs/C2.28_REANALYSIS_2026_06_15.md`](./C2.28_REANALYSIS_2026_06_15.md)，commit `94f9fc5`） |
| C2.29 | Supabase view / RLS hardening 草稿 | 只產生 migration 草稿與驗證 SQL，不直接套用 | `supabase/migrations/*` | 待分析 |
| C2.30C | PermissionGate 統一脫敏層 | 引入 `lib/permissions/PermissionGate.ts` 作為單一脫敏真相來源；`infoLevel`（0-2 員工漸進、3 老闆）取代散落 staff sanitizer | `lib/permissions/PermissionGate.ts`, components/* | ✅ 已完成（commit `4ab4b1a`） |
| C2.30D | Cloud→local 補回脫敏 | 雲端補回 market/product 寫入 IndexedDB 前一律過 PermissionGate；同樣適用 recovery 路徑 | `useSync.ts` hydration, `recovery.ts` | ✅ 已完成（commit `342bed3` + `280c2fa`，11 個新測試） |
| C2.31 | 衝突解決脫敏 | `detectAndResolveConflict` 的 remote/merge 策略寫入前脫敏；員工視角下以脫敏後雲端值做 Math.max，跳過 stock Math.min 保守合併 | `useSync.ts` conflict 路徑 | ✅ 已完成（commit `799b8ab` + `2fd23c8`，6 個新測試） |

## C2.23 詳細計畫

目的：固定成交模式語意。

風險背景：

- 正常商品成交：應扣庫存，刪除時應還原庫存。
- 現場手動成交：不應扣庫存，刪除時也不應還原庫存。
- 補登商品成交：不應扣庫存。
- 補登手動成交：不應扣庫存。

預期行為：

| 情境 | isBackfill | isManualEntry |
|---|---:|---:|
| 正常商品成交 | false | false |
| 現場手動成交 | false | true |
| 補登商品成交 | true | false |
| 補登手動成交 | true | true |

完成條件：

- `recordDeal()` 不再產生 `undefined` flags。
- 新增測試覆蓋四種成交模式。
- `npm test`、`tsc`、`lint`、`build` 通過。

## 目前進度紀錄

### 2026-06-12

- 建立本文件。
- C2.23 已完成。
- 新增 `resolveDealModeFlags()` 作為純函式入口。
- 新增 `tests/deal-mode-flags.test.ts`。
- `recordDeal()` 已改用 `resolveDealModeFlags()`，確保新寫入的 `deal_closed` payload 有明確 boolean flags。
- 驗證已通過：`npm test`、`npx tsc --noEmit`、`npm run lint`。
- C2.24A 已完成。
- 新增 `canDeleteDailyLogEntry()`，`DailyTransactionLog` 預設不顯示刪除入口。
- StaffMarketDetailView 使用 `DailyTransactionLog` 時未傳 `allowDelete`，因此 Staff 只能查看流水帳，不能刪除成交或互動記錄。
- 新增 `tests/daily-log-permissions.test.ts`。
- C2.24B 已完成。
- `event-deletion-service` 的刪除入口現在需要明確 `allowDelete: true`，未授權呼叫會在讀取 DB 或寫入 tombstone 前被拒絕。
- Owner 市集詳情頁呼叫 `deleteDealEvent()` 時傳入 `allowDelete: !isStaff`；`DailyTransactionLog` 也會把 `allowDelete` 傳入 service。
- `tests/event-deletion-service.test.ts` 已補上 permission guard 測試。
- C2.25 已完成。
- 新增 `summarizeDailyDealEvents()`，DailyTransactionLog 的總收入與成交筆數改由事件 read model 加總。
- `totalDeals` 不再使用 `deals.length`，補登事件的 `manualDealCount` / `manual_deal_count` 會正確反映在每日交易流水的成交筆數。
- 新增 `tests/daily-transaction-log-summary.test.ts`。

### 2026-06-14

- C2.26 狀態從「待開始」改為「✅ 透過 C2.30C PermissionGate 整合實質完成」。原計畫意圖（Staff 不顯示成本/利潤/毛利率/費用/供應商）以**統一脫敏閘**而非**逐欄位判斷**達成，更全面。
- 新增 C2.30C / C2.30D / C2.31 三行至階段表（皆已完成 + commit hash）。
- 整合入口新增：見 [`docs/CONVERGENCE_ARCHIVE.md`](./CONVERGENCE_ARCHIVE.md) §4 「C2.30+ 員工權限加固收斂」。
- 為什麼 C2.26 不在原計畫但被 PermissionGate 一併達成：`PermissionGate.canViewSensitiveData()` 是**唯一**脫敏判斷入口，UI 元件呼叫 gate 而不是用 `if (isStaff)` 散落判斷。這語意比原計畫更強——未來新增 UI 元件也自動獲得保護。
- 統一脫敏三層防線（見 `CONVERGENCE_ARCHIVE.md` §7）：
  1. **第 1 層（補回脫敏）**：雲端補回寫入 IndexedDB 前
  2. **第 2 層（衝突脫敏）**：conflict resolution 寫入前
  3. **第 3 層（渲染脫敏）**：UI 元件呼叫 PermissionGate
- C2.27 已透過 StaffMarketDetailView 重構 + 三層防線實質完成（不再需要大改 production code），詳見 [`docs/C2.27_REANALYSIS_2026_06_15.md`](./C2.27_REANALYSIS_2026_06_15.md)。
- C2.28 已完成 P0 fail-closed 最小修補（`hooks/useUserRole.ts` + `lib/sync-context.tsx`），頁面 render guard 留待 C2.28B；詳見 [`docs/C2.28_REANALYSIS_2026_06_15.md`](./C2.28_REANALYSIS_2026_06_15.md)。
- C2.29 仍待分析，未來需獨立排程。
