# BoothBook / 出攤本 Sync 架構改造分析與執行計畫

建立日期：2026-06-20
狀態：分析與計畫階段，尚未開始實作同步邏輯改造

## 0. 文件目的

本文件用來評估 BoothBook 目前 sync 架構，並制定一個可逐步執行、可測試、低風險的同步系統改造計畫。

本計畫的核心原則是：

1. 先鎖住現有 owner / staff 行為，再拆分架構。
2. 先做無行為改變的 service extraction，再引入新同步模型。
3. 任何資料庫 schema、RLS、cache replace、legacy replay 移除，都必須獨立確認。
4. 不在未驗證前改變正式使用者的資料同步路徑。

## 1. 目前 sync 架構觀察

### 1.1 主要同步入口

目前同步核心集中在 `hooks/useSync.ts`。這個檔案同時負責：

- React hook orchestration。
- 全域 sync runtime state。
- 初始同步、定時同步、online event、手動 trigger。
- pending/local events push。
- owner event pull。
- staff view pull。
- IndexedDB cache 寫入。
- event replay。
- projection reconciliation。
- conflict merge helper。
- permission / RLS error handling。

這讓 `useSync.ts` 目前不是單純 hook，而是 sync orchestrator、service、cache writer、permission policy、projection repair 的混合體。

### 1.2 Push 邏輯現況

`pushEvents(userId)` 目前從 IndexedDB `events` 取出 `sync_status in ['pending', 'local_only']` 的 event。

主要安全邏輯：

- actor 為目前登入 user 或 `local` 才允許送出。
- actor 不符時會 block，不會上傳。
- `local` actor 會在 push 前綁定為目前登入 user。
- 上傳前會先檢查雲端是否已有相同 `id`。
- unique violation 會視為已同步。
- 外鍵缺 market 時，會嘗試保留順序或標記 local-only。
- RLS / permission error 會降級為 local-only，避免無限衝撞。

此路徑目前承擔了離線事件、成交收入、note/checklist 等 event-based 功能的上傳。

### 1.3 Owner pull 邏輯現況

owner 或高權限使用者透過 `pullAllEvents` 從 `public.events` 拉資料。

主要特性：

- 使用 `settings.lastSyncAt` 搭配 `events.created_at` 作為 cursor。
- 會查 owner 可存取的 market / team member 範圍。
- 會 hydrate 缺失的 markets。
- 會把 events 寫入 IndexedDB。
- 會 replay events 到本地 projection。
- 會更新 `lastSyncAt`。
- 會執行 projection reconciliation。

這條路徑仍依賴 event replay 與本地 projection。

### 1.4 Staff pull 邏輯現況

staff 權限使用者會進入 `pullEventsFromViews`。

主要資料來源：

- `staff_accessible_markets`
- `staff_accessible_products`
- `staff_accessible_events`

重要特性：

- staff pull 目前採 full view pull，不使用 `lastSyncAt` cursor。
- 原因是 staff 權限範圍可能改變，cursor 容易被其他路徑污染。
- markets/products/events 都會經過 staff 權限與 projection sanitizer。
- staff replay 後會再進行 projection sanitize。
- projection reconciliation 在 `staff-view` context 下是 observation-only，不會自動修復。

這條路徑比 owner 路徑更接近「cloud view as source of truth」，但仍會寫入 IndexedDB 並 replay。

### 1.5 Projection / reconciliation 現況

`lib/sync/projection-reconciliation.ts` 目前會依 context 決定是否自動修復。

可修復 context：

- `owner-full`
- `owner-incremental`
- `manual`

不可修復、只觀察 context：

- `staff-view`
- `snapshot`

這個設計是合理的安全邊界：staff 由 view 提供資料，不應以 partial local replay 自動修復 projection。

### 1.6 Legacy conflict helper 現況

`detectAndResolveConflict` / `resolveMarketConflict` / `resolveProductConflict` 目前主要出現在測試中，尚未看到主同步路徑直接呼叫。

這代表 legacy conflict helper 可能已經變成低使用度包袱，但不能直接移除，因為：

- 測試可能仍視其為契約。
- 未來隱性 import 或外部工具可能依賴。
- 需要先用 audit test 證明主流程不依賴它。

### 1.7 直接雲端 API 現況

除了 event sync，專案也有多個直接 Supabase API：

- user settings。
- staff accessible markets/products 查詢。
- staff invitation / member management。
- 部分 cloud-first read helpers。

因此 sync 改造不能只處理 `events`。需要明確分辨：

- event-sourced write。
- direct Supabase write。
- cloud view read。
- local IndexedDB cache。
- derived projection。

## 2. 主要問題與風險評估

### 2.1 目前主要問題

1. `useSync.ts` 責任過重，任何修改都可能牽動 owner / staff / offline / projection。
2. owner pull 和 staff pull 的資料模型不同，卻混在同一個 hook 中。
3. event replay 與 projection repair 仍承擔太多 UI summary 的正確性責任。
4. local event `sync_status` 同時代表 pending、local-only、blocked/error，語意開始不夠精確。
5. staff full pull 比較安全，但 cache replace 尚未被獨立 service 化。
6. direct Supabase API 與 event sync 邊界沒有集中記錄，後續改造容易漏路徑。

### 2.2 高風險區域

以下事項在執行前必須停下來人工確認：

- 新增或修改 Supabase schema，例如 `pending_operations`。
- 修改 RLS policy、view definition、security definer function。
- 將 staff 或 owner 正式路徑改為 replace-cache。
- 改變 owner `lastSyncAt` cursor 語意。
- 移除 event replay、snapshot、legacy conflict helper。
- 讓任何 manager/staff 權限直接寫入更多資料類型。
- 自動刪除 IndexedDB 既有 events、markets、products、dailyStats。
- 改變收入、成交、庫存、financial projection 的來源。

## 3. 建議目標架構

### 3.1 分層方向

長期目標是將 sync 拆成以下層級：

1. `useSync`：只負責 React lifecycle、trigger、loading state、error surface。
2. Sync orchestrator：決定何時 push / pull / reconcile。
3. Push service：處理本地 pending event / operation 上傳。
4. Pull service：依 owner/staff 權限拉取雲端資料。
5. Cache writer：只負責 IndexedDB transaction、replace、merge。
6. Permission sanitizer：依 infoLevel / role 清理敏感欄位。
7. Projection service：處理 summary / local derived state。
8. Audit logger / sync diagnostics：記錄可觀察結果，不影響資料。

### 3.2 寫入模型方向

短期保持既有 event sync，不立即切換。

中期引入 `pending_operations` 作為更清楚的 pending write model：

- local-first operation。
- idempotency key。
- role snapshot。
- explicit retry state。
- explicit failure reason。
- 不直接混用 event `sync_status` 代表所有 pending 意義。

### 3.3 讀取模型方向

staff 應逐步走 cloud view / replace-cache。

owner 可以先保留 incremental event pull，但 summary/view model 要逐步 cloud-first，降低本地 replay 對營收、庫存、summary 的長期責任。

## 4. 分階段執行計畫

### Phase 0：完成分析與安全邊界

狀態：本文件即為 Phase 0 產出。

目標：

- 記錄目前 sync 架構。
- 標出高風險決策點。
- 定義後續每階段不可跨越的界線。

不做：

- 不修改 `useSync.ts`。
- 不修改 migration。
- 不修改 Supabase policy。
- 不修改正式 sync 行為。

完成條件：

- 計畫文件完成。
- 使用者確認是否接受此改造順序。

### Phase 1：加入 sync audit tests，鎖住現有行為

目標：

在任何重構前，用測試固定現有 owner/staff 行為，避免 service extraction 時無意改變資料流。

建議測試範圍：

1. Push audit tests
   - pending event 會被送出。
   - `local` actor 會綁定目前 user。
   - actor mismatch 會被 blocked。
   - unique violation 會標記 synced。
   - RLS / permission error 會降級 local-only。

2. Owner pull audit tests
   - owner 使用 `created_at > lastSyncAt`。
   - pull 後更新 `settings.lastSyncAt`。
   - 缺 market 時會 hydrate。
   - event 寫入後會 replay。
   - projection reconciliation 使用 owner context。

3. Staff pull audit tests
   - staff 使用 accessible views。
   - staff 不依賴 `lastSyncAt`。
   - staff market/product projection 被 sanitize。
   - staff event 經過 preflight。
   - staff reconciliation 維持 observation-only。

4. Trigger/orchestration tests
   - initial sync。
   - manual `trigger-sync`。
   - online event。
   - permission pause。

安全要求：

- 只增加測試，不改正式程式行為。
- 測試名稱應清楚標示是 audit / characterization tests。
- 若測試暴露既有 bug，先記錄，不能在同一 commit 混修架構。

建議驗證：

```bash
npm test
npm run lint
npm run build
```

### Phase 2：拆出純 service，不改行為

目標：

把 `useSync.ts` 的非 React 邏輯拆到 service，但輸入、輸出、錯誤處理、資料寫入結果都不改變。

建議拆分順序：

1. `lib/sync/sync-runtime-state.ts`
   - sync lock。
   - initial sync flag。
   - active identity。
   - pause until。

2. `lib/sync/sync-push-service.ts`
   - `pushEvents`。
   - actor validation。
   - cloud insert / duplicate handling。
   - RLS downgrade。

3. `lib/sync/owner-pull-service.ts`
   - `pullAllEvents` owner branch。
   - owner accessible market/member lookup。
   - cursor update。

4. `lib/sync/staff-pull-service.ts`
   - `pullEventsFromViews`。
   - accessible views read。
   - staff full pull behavior。

5. `lib/sync/local-cache-writer.ts`
   - `syncMarketsToIndexedDB`。
   - `syncProductsToIndexedDB`。
   - `syncEventsToIndexedDB`。

6. `lib/sync/sync-cursor-service.ts`
   - `getLastSyncTimestamp`。
   - `updateLastSyncTimestamp`。

7. `lib/sync/sync-error-policy.ts`
   - permission error classification。
   - pause sync。
   - local-only downgrade。

安全要求：

- 每次只拆一小段。
- 每個 commit 前看 diff，確認沒有混入行為改變。
- 不改 function semantic。
- 不改 DB schema。
- 不改 RLS。
- 不改 event type。
- 不改 UI。

完成條件：

- audit tests 維持通過。
- build/lint/test 通過。
- `useSync.ts` 只保留 orchestration，或至少大幅降低混雜責任。

### Phase 3：設計 pending operations，但先不接正式路徑

目標：

建立比 `events.sync_status` 更明確的 pending write 模型，但先以文件、型別、測試或本地-only prototype 方式驗證，不立即影響正式同步。

建議 operation 欄位：

- `operation_id`
- `operation_type`
- `entity_type`
- `entity_id`
- `market_id`
- `payload`
- `idempotency_key`
- `actor_id`
- `role_snapshot`
- `created_at`
- `updated_at`
- `status`
- `retry_count`
- `last_error_code`
- `last_error_message`

建議 status：

- `pending`
- `processing`
- `synced`
- `failed_retryable`
- `failed_permanent`
- `blocked_permission`

安全要求：

- 不先改正式 Supabase schema。
- 若需要 migration，必須單獨提出並人工確認。
- 不移除既有 event pending 行為。
- 不讓 financial write 第一個試用。

適合試點：

- field notes / checklist 這類低財務敏感功能。
- user settings 這類可重送、可覆蓋功能。

不適合第一波試點：

- 成交收入。
- 庫存扣減。
- market/product ownership。
- role/member permission。

### Phase 4：Pull 端導入 replace-cache service，先限 staff 或測試模式

目標：

把 staff full view pull 的 cache 寫入改造成獨立 replace-cache service，但先 behind flag 或 test mode，不直接全面替換正式路徑。

建議流程：

1. 從 staff views 拉 authorized records。
2. normalize / sanitize。
3. 在 transaction 中 staging。
4. 比對 local pending records，避免覆蓋未同步操作。
5. replace authorized scope cache。
6. replay 或 projection refresh。
7. audit summary。

安全要求：

- 不刪除 pending/local-only events。
- 不刪除使用者仍有權限外但本地可能待同步的資料。
- role downgrade 後必須確認敏感資料被清除。
- 必須可 fallback 到 legacy staff pull。

人工確認門檻：

- 是否允許正式 staff 路徑啟用 replace-cache。
- replace scope 是 market-level 還是全 staff accessible scope。
- role downgrade 時是否立即 purge 不可見資料。

### Phase 5：Summary / view model 逐步 cloud-first

目標：

降低本地 event replay projection 對營收、庫存、summary 的責任，讓重要 summary 優先使用雲端或 authorized view。

建議順序：

1. 先盤點 UI 哪些 summary 目前讀 IndexedDB projection。
2. 為 staff summary 建立 cloud-first read contract。
3. owner summary 保留現況，但新增 audit compare。
4. 財務/庫存 summary 只在驗證後切換。

安全要求：

- 不一次切全部 summary。
- 不讓 staff 透過本地 projection 看到超權限資訊。
- 不讓 owner 因 partial cache 看到錯誤營收。

### Phase 6：移除 legacy conflict / snapshot / replay 包袱

目標：

只有在新架構已覆蓋現有使用情境後，才移除舊邏輯。

移除前必要條件：

- 有測試證明主流程不再使用該 helper。
- 有 migration / rollback 策略。
- production user cache 不需要舊格式。
- owner/staff/manual sync 都已通過回歸測試。

必須人工確認：

- 是否移除 legacy conflict helper。
- 是否移除 snapshot reconciliation。
- 是否停用 event replay 的某些 projection side effects。

## 5. Commit 前安全檢查清單

每一個 commit 前必須確認：

1. 本次修改是否只屬於單一 phase。
2. 是否有修改 Supabase migration / RLS / schema。
3. 是否有修改 owner/staff 權限判斷。
4. 是否有改變 financial / inventory 資料來源。
5. 是否有刪除、覆蓋或重建 IndexedDB cache。
6. 是否有改變 `lastSyncAt` cursor 語意。
7. 是否有改變 event replay 順序。
8. 是否有改變 staff sanitizer / preflight。
9. 是否有新增未測試的 direct Supabase write。
10. 是否有超出本階段範圍的 incidental refactor。

若任何答案為「是」，且不是本階段明確目標，應停止並拆 commit 或回到人工確認。

## 6. 建議測試矩陣

### 自動測試

每階段至少執行：

```bash
npm test
npm run lint
npm run build
```

針對 sync 改造應新增 targeted tests：

- push audit。
- owner pull audit。
- staff pull audit。
- cache writer audit。
- permission sanitizer audit。
- projection reconciliation context audit。

### 手動 QA

每個會影響 sync 行為的 phase，需要測：

1. Owner
   - 建立市集。
   - 建立商品。
   - 建立成交紀錄。
   - 查看營收與庫存。
   - 重新整理後資料仍一致。

2. Manager
   - 查看市集詳情。
   - 建立 field note。
   - 建立 checklist。
   - 修改自己有權限的資料。
   - 無法修改禁止欄位。

3. Operator
   - 可查看 note/checklist。
   - 可勾選 checklist。
   - 不可新增/刪除 note/checklist。
   - 可進行既有成交/收入寫入。

4. View
   - 可查看授權內容。
   - 不可操作 note/checklist。
   - 不可看到敏感資料。

5. Role downgrade
   - manager 降為 operator/view 後，UI 與 cache 不保留超權限能力。

6. Offline / retry
   - 離線建立可允許資料。
   - 回線後同步。
   - RLS error 不造成無限 retry。

## 7. 建議下一步

建議下一步只執行 Phase 1：

> 新增 sync audit tests，鎖住 owner/staff 現有行為，不修改正式 sync 邏輯。

這是目前最低風險、最高價值的起點。原因是 `useSync.ts` 目前耦合度高，若沒有 characterization tests，直接拆 service 容易發生「程式看起來只是搬家，但資料同步語意被改掉」的問題。

Phase 1 完成並通過測試後，才建議進入 Phase 2 的純 service extraction。

## 8. 目前決策狀態

目前尚未取得執行確認，因此：

- 不開始修改 `useSync.ts`。
- 不建立 `pending_operations` migration。
- 不改 staff/owner 正式同步路徑。
- 不改 cache replace 策略。
- 不移除 legacy replay/conflict/snapshot 邏輯。

需要使用者確認後才能開始的第一個實作項目：

> 是否批准進入 Phase 1：只新增 sync audit tests，不改正式同步行為。
