# Owner / Staff 收入與權限加固計畫

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
| C2.25 | DailyTransactionLog 成交筆數修正 | 成交筆數使用 `getDealEventCount()`，支援 `manualDealCount` | `components/markets/DailyTransactionLog.tsx` | 待開始 |
| C2.26 | Staff 敏感財務欄位 UI 審查 | Staff 不顯示成本、利潤、毛利率、費用、供應商資訊 | Staff detail / sales UI | 待開始 |
| C2.27 | Staff local-first detail 檢查 | Staff 詳情頁優先使用已 sanitize 的本機資料，避免 remote row 曝露敏感欄位 | market detail / staff view | 待分析 |
| C2.28 | Role fail-closed 評估 | role loading / error 不可 fallback 成 Owner UI | `useUserRole`, guarded UI | 待分析 |
| C2.29 | Supabase view / RLS hardening 草稿 | 只產生 migration 草稿與驗證 SQL，不直接套用 | `supabase/migrations/*` | 待分析 |

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
