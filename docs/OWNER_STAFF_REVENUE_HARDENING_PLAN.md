# Owner / Staff 收入與權限加固計畫

> **⚠️ 維護中（本檔仍在追蹤 C2.27-C2.29）**
> 階段表於 2026-06-14 補完（C2.26 透過 C2.30C 實質完成；C2.30C / C2.30D / C2.31 新增）。
> 整體計畫單一權威入口見 [`docs/CONVERGENCE_ARCHIVE.md`](./CONVERGENCE_ARCHIVE.md) §4。
> 本檔**保留維護**（C2.27-C2.29 仍待分析），格式應與 `DATA_CONVERGENCE_PLAN.md` 對齊。
>
> **2026-06-14 補充**：C3.4（Projection 二次累加修復計畫）已另開檔 [`docs/PROJECTION_DOUBLECOUNT_FIX_PLAN.md`](./PROJECTION_DOUBLECOUNT_FIX_PLAN.md) 追蹤，**不**併入本檔。理由：C3.4 是 sync/projection 收斂主線，與本檔「員工脫敏」主題不同。

更新日期：2026-06-16（C2.29B-2.1 已套用 + C2.28B 收尾文件）

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
| C2.28 | Role fail-closed 評估 | role loading / error / unknown 期間不可視為 owner；infoLevel 必須是 0 | `useUserRole`, `sync-context`, PermissionGate | ✅ **C2.28 P0 fail-closed 修補 + C2.28B 頁面 render guard 已完成**（5 個 page + BottomNavigation 已實作）。詳見 [`docs/C2.28_REANALYSIS_2026_06_15.md`](./C2.28_REANALYSIS_2026_06_15.md) + [`docs/C2.28B_RENDER_GUARD_2026_06_16.md`](./C2.28B_RENDER_GUARD_2026_06_16.md)（commit `94f9fc5`） |
| C2.29 | Supabase view / RLS hardening 草稿 | ✅ **C2.29B-1 已套用 Supabase，驗證通過**（view 層脫敏）。✅ **C2.29B-1.1（040）已套用 Supabase，驗證通過**（view scope 修補）。✅ **C2.29B-2.1（041）已套用 Supabase，驗證通過**（底表 SELECT RLS 收緊：Staff direct SELECT = 0，Owner 不 regression）。⚠️ C2.29B-2.2（type-level guard）和 C2.29B-2.3（E1-E5）仍待實作。詳見 [`docs/C2.29_REANALYSIS_2026_06_15.md`](./C2.29_REANALYSIS_2026_06_15.md) §C2.29B-1 Apply Result + §C2.29B-1.1 Apply Result + §C2.29B-2.1 Apply Result + [`docs/C2.29B-2_1_RLS_MIGRATION_DRAFT_2026_06_16.md`](./C2.29B-2_1_RLS_MIGRATION_DRAFT_2026_06_16.md) |
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
- C2.29 已完成只讀分析（2026-06-15），發現 4 個 Supabase view / RLS fail-open 攻擊面（staff_accessible_* view 仍回傳 m.* / p.* / e.*），詳見 [`docs/C2.29_REANALYSIS_2026_06_15.md`](./C2.29_REANALYSIS_2026_06_15.md)。套用待 C2.29B（仍只做只讀）。

### 2026-06-15（C2.29B-1 套用紀錄）

- **C2.29B-1 套用結果**：🟢 **已套用 Supabase，驗證通過**。
- 套用 commit：`439f97f`（`supabase/migrations/039_staff_view_hardening.sql`）。
- 套用方式：Supabase SQL Editor，**整段包進 transaction**（`BEGIN;` ... `COMMIT;`）。
- 套用過程遇到的小問題：草稿用 `NULL::numeric` 通用型別，與線上 `numeric(10,2)` / `numeric(5,2)` 精確 typmod 不對齊 → 已在 `439f97f` 修正（9 處 NULL cast）。
- Staff 驗證（攻擊面 #1-#3 全部消除）：
  - `staff_accessible_markets`：`booth_cost` / `commission_rate` / `total_profit` / 4 個 rental / `registration_fee` 全部為 NULL
  - `staff_accessible_products`：`cost` 為 NULL
  - `staff_accessible_events.payload`：top-level 敏感 key（`boothCost` / `cost` / `supplierInfo` / `profitMargin` / `totalProfit` 等）全部不存在；`items[]` 巢狀結構敏感 key 也已脫敏
  - Tombstone（`deal_deleted` / `interaction_deleted`）仍可見
- Owner 驗證（無 regression）：Owner 仍可看到完整 financial fields / `cost` / 完整 `payload`。
- ⚠️ **C2.29B-1 範圍限制**：
  - 只修 `staff_accessible_*` view 層（3 個攻擊面 #1/#2/#3 消除）
  - **沒修底表 RLS**（攻擊面 #4 仍存在：E2 證明 Staff 透過底表 RLS 直接 SELECT `markets` 仍可拉到 `booth_cost` / `total_profit`）
  - **沒改前端查詢路徑**（員工 DevTools 仍可繞過 view 攻擊底表）
- **C2.29B-2 待辦**（仍**未實作**）：
  1. 底表 RLS 收緊（草稿 B 見 `C2.29_REANALYSIS_2026_06_15.md` §7.2）
  2. 前端查詢路徑收斂（改走 `staff_accessible_*` view 或 owner-only view）
  3. 或全面改走 SECURITY DEFINER RPC
- 詳細紀錄見 [`docs/C2.29_REANALYSIS_2026_06_15.md`](./C2.29_REANALYSIS_2026_06_15.md) §C2.29B-1 Apply Result。

### 2026-06-16（C2.29B-1.1 套用紀錄 + C2.29B-2 藍圖）

- **C2.29B-1.1 套用結果**：🟢 **已套用 Supabase，驗證通過**。
- 套用對象：`supabase/migrations/040_fix_staff_accessible_view_scope.sql`。
- 套用 commit：`8ff6b09`（`db(c2): draft staff accessible view scope fix`）。
- 套用方式：Supabase SQL Editor，**transactional apply**（`BEGIN;` ... `COMMIT;`）。
- 套用者：用戶（手動）。
- Staff 驗證（攻擊面 #A / #B / #C 全部消除）：
  - `staff_accessible_markets` 不再出現 `access_type = 'owner'`
  - `staff_accessible_markets` 不再有同一 market id 重複 staff / owner branch
  - `staff_accessible_markets` 不再包含 `is_deleted = true`（`COALESCE(m.is_deleted, false) = false` 過濾生效）
  - `staff_accessible_events` 不再出現 `access_type = 'owner'`（Branch 4 scope leak 修好）
  - Staff events payload 仍為 scrubbed（`boothCost` / `cost` / `supplierInfo` 等敏感 key 全部不存在；`items[]` 巢狀已脫敏）
- Owner 驗證（無 regression）：
  - Owner 仍可看到 `access_type = 'owner'`
  - Owner 仍可看到完整 financial fields
  - Owner 仍可看到完整 `events.payload`
- **040 解決**：
  - staff accessible view owner-branch bypass（用 `m.owner_id` 取代 `mm.user_id`）
  - deleted markets 進入 staff view（加 `is_deleted` 過濾）
  - staff / owner branch duplicated rows（owner branch 條件嚴格化後，UNION ALL 重複命中自動消失）
- **040 尚未解決**：
  - Staff 透過 DevTools 直接 SELECT 底表 `markets` / `products` / `events` 的 RLS 攻擊面（C2.29B-2.1 處理）
  - `market_id IS NULL` 的 global product events 是否應進 Staff events view（C2.29B-2 評估）
  - Staff 到底應該看 owner 旗下全部未刪除市集，還是只看指派 / 近期 / 有效場次（C2.29B-2 評估）
  - Staff full sync / replay 過量事件問題（C2.29B-2 / 性能優化評估）
- ⚠️ **C2.29B-1.1 範圍限制**：
  - 只修 `staff_accessible_*` view 結構（owner branch 條件 + is_deleted 過濾）
  - **沒修底表 RLS**（攻擊面 #4 仍存在）
  - **沒改前端查詢路徑**
  - **沒動 `staff_accessible_products`**（無 scope bug）
  - **沒刪除任何 view branch**（保守做法）
  - **沒新增 trigger / function / RPC**

- **C2.29B-2 藍圖建立**：🟡 **規劃中**（**未實作**）。
- 規劃文件：`docs/C2.29B-2_PLAN_2026_06_16.md`（715 行、14 章節）。
- 規劃 commit：`80ee8bb`（`docs(c2): add C2.29B-2 base table RLS plan`）。
- 3 個 Sub-Phase 階段式規劃：
  1. **C2.29B-2.1** 收緊底表 SELECT RLS（員工 SELECT 底表 = 0 row）
  2. **C2.29B-2.2** 前端查詢路徑收斂（Type-level guard，編譯期阻擋）
  3. **C2.29B-2.3** 全鏈路驗證 E1-E5
- 5 個關鍵決策：
  1. Owner 判斷式：`m.owner_id = auth.uid()`（不依賴 trigger）
  2. Staff SELECT 底表：完全拒絕（員工只能走 view）
  3. 前端路徑守衛：Type-level guard（編譯期阻擋，未來好維護）
  4. is_collaborative 場景：先試 `m.owner_id`，破壞則改 `mm.role = 'owner'`
  5. Service / Repair 程式碼：標註 Owner only + 顯式分流

- **C2.29B-2 前置條件**（同步更新）：
  ```text
  ✅ C2.29B-1.1 040 已套用並驗證通過
  ⏳ C2.29B-2.1 可進入實作規劃 / migration 草稿階段
  ```
- ⚠️ **C2.29B-2.1 尚未實作**。
- ⚠️ **尚未新增 041 migration**。
- ⚠️ **尚未改 RLS**。
- ⚠️ **尚未改前端**。

- 詳細紀錄見：
  - [`docs/C2.29B_VIEW_SCOPE_AUDIT_2026_06_15.md`](./C2.29B_VIEW_SCOPE_AUDIT_2026_06_15.md) §13（C2.29B-1.1 Apply Result）
  - [`docs/C2.29_REANALYSIS_2026_06_15.md`](./C2.29_REANALYSIS_2026_06_15.md) `C2.29B-1.1 Apply Result` 章節 + §9.8（C2.29B-2 狀態）
  - [`docs/C2.29B-2_PLAN_2026_06_16.md`](./C2.29B-2_PLAN_2026_06_16.md)（C2.29B-2 完整藍圖）
