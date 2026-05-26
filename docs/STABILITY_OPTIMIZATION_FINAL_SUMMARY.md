# Stability Optimization Final Summary

**Last updated:** 2026-05-26
**Status:** Phase 3–5 complete, Phase 6 partially complete (~35%)
**Overall stability estimate:** 90–92%

---

## 1. 本輪優化目標

根據 `docs/CURSOR_HANDOFF_PLAN.md` 中的 Phase 3–6 規劃，本輪旨在以安全、小步、可驗證的方式完成以下目標：

- 將市場與商品 detail 頁面的讀取邏輯抽取為可測試的服務層
- 將資料庫初始化錯誤處理標準化至所有高風險頁面
- 將事件同步狀態更新集中至一個可測試的服務
- 為修復與 replay 邏輯建立單元測試覆蓋網

**核心原則：** 不重寫事件系統、不改變資料庫 schema、不引入新的測試框架，每個 commit 皆可独立驗證。

---

## 2. 已完成階段

### Phase 3: Safe Detail Data Services — 完成 ✅

**目標：** 將 detail 頁面的讀取邏輯抽取為可測試的服務，杜絕空白 ID 進入 Dexie。

**已完成 commit：**

| Commit | 內容 |
|---|---|
| `404c336` | `fix: guard market detail route id` |
| `e444012` | `fix: stabilize market detail loading` |
| `4247414` | `fix: stabilize product detail loading` |
| `33629c1` | `refactor: add market detail read service` |
| `62c36ec` | `refactor: add product detail read service` |
| `16fc049` | `test: cover detail read services` |
| `9d13371` | `test: cover market detail fallback decisions` |
| `8ab281f` | `refactor: centralize market event deletion` |
| `7f9c33d` | `test: cover market event deletion payloads` |
| `fd23bc7` | `test: reject duplicate event tombstones` |

**Definition of done 已滿足：**
- `getMarketDetail()` / `getProductDetail()` 已抽取至 `lib/markets/detail-service.ts` / `lib/products/detail-service.ts`
- 空白 ID 在抵達 Dexie 前被 reject，不產生查詢
- Fallback 決策邏輯有測試覆蓋

---

### Phase 4: Safer Database Initialization Adoption — 完成 ✅

**目標：** 高風險頁面在 IndexedDB 初始化失敗時顯示清楚的恢復導向狀態，而非繼續寫入操作。

**已完成 commit：**

| Commit | 內容 |
|---|---|
| `1daa2b3` | `refactor: adopt safe init in product detail` |
| `4b47033` | `refactor: adopt safe init in market detail` |
| `377d550` | `fix: include market detail fallback refactor` |
| `fbaca7e` | `fix: prevent market fallback before db init` |
| `1d9cdc5` | `refactor: adopt safe init in products list` |
| `a9a7c01` | `refactor: adopt safe init in markets list` |
| `9722757` | `fix: adjust market list filters and ordering` |

**Definition of done 已滿足：**
- `initializeDatabaseSafely()` 已推廣至：商品 detail、市集 detail、市集列表、商品列表
- 事件刪除服務亦已採用安全初始化
- 現有 build 與測試均通過

---

### Phase 5: Sync Service Cleanup — 完成 ✅

**目標：** 將事件同步狀態的變更集中至一個可測試的服務杜絕 payload / timestamp 被意外修改。

**已完成 commit：**

| Commit | 內容 |
|---|---|
| `932d6b8` | `refactor: use sync service for event status updates` |
| `a39cc94` | `refactor: use sync service for event actor binding` |
| `f472c18` | `refactor: use sync service for blocked events` |
| `415dce1` | `test: add event sync status service` |

**Definition of done 已滿足：**
- `markEventSynced` / `markEventLocalOnly` / `markEventBlocked` / `bindEventActor` 均已抽取至 `lib/sync/event-sync-service.ts`
- 測試驗證：payload 不變、event type 不變、timestamp 不變，僅 sync metadata 被更新

---

### Phase 6: Completed Fixtures — 部分完成 (~35%)

**已完成 commit：**

| Commit | 內容 |
|---|---|
| `3a449d0` | `test: add recovery helper fixtures` — `normalizeProductsSold`, `toNonNegativeNumber`, `toNumber` |
| `c8c9930` | `test: add dailyStats repair fixture` — `repairInvalidDailyStats` 單一 dirty stat 修復 |
| `cfb2a6d` | `test: add productsSold merge fixtures` — `mergeProductsSold`, `subtractProductsSold` |

**待完成：**
- Legacy backup with missing optional fields
- Product sale → deal deletion → rebuild 端到端 replay
- Local-only market detail fixture
- Staff-accessible market row fixture
- Import rollback / rejected import fixture

---

## 3. 已完成的主要安全改善

| 改善項目 | 說明 |
|---|---|
| ID 護欄 | 空白 ID、無效 ID 在抵達 Dexie 前被攔截，無效查詢消除 |
| 資料庫安全初始化 | IndexedDB 初始化失敗不再靜默崩潰，導向恢復頁面 |
| 事件同步元資料集中化 | 同步狀態更新統一在 `event-sync-service.ts`，禁止改動 event payload |
| 事件刪除服務抽取 | `resolveDealDeletionResult` / `assertEventCanBeDeleted` 可獨立測試 |
| Detail 讀取服務抽取 | `getMarketDetail()` / `getProductDetail()` 可單獨驗證，消除了 page component 中的直接 db 呼叫 |
| DailyStats 修復工具 | `repairInvalidDailyStats` 有測試覆蓋，修復邏輯可預期 |
| ProductsSold 操作純函式化 | `mergeProductsSold` / `subtractProductsSold` 已 export 並建立測試網 |
| Fallback 決策測試覆蓋 | 市集 detail 頁面在網路/離線/fresh local 等場景下的 fallback 行為有測試 |

---

## 4. 已新增的測試檔案與覆蓋內容

| 檔案 | 覆蓋內容 |
|---|---|
| `tests/integrity.test.ts` | 備份完整性驗證、legacy 欄位缺失處理、tombstone 有效性、duplicate 剔除 |
| `tests/market-detail-loading.test.ts` | 市集 detail 載入護欄 |
| `tests/event-deletion-service.test.ts` | `resolveDealDeletionResult`、`assertEventCanBeDeleted`、手動補登與商品模式 |
| `tests/detail-service.test.ts` | 空白 ID reject、ID 格式驗證 |
| `tests/detail-fallback.test.ts` | 市集 detail fallback 決策邏輯 |
| `tests/event-sync-service.test.ts` | `markEventSynced`、`markEventLocalOnly`、`bindEventActor`、`markEventBlocked` |
| `tests/recovery-helpers.test.ts` | `normalizeProductsSold`、`toNonNegativeNumber`、`toNumber` |
| `tests/daily-stats-repair.test.ts` | `repairInvalidDailyStats`：NaN revenue → 0、負數 cost → 0、空白 productId 過濾、updatedAt 修復 |
| `tests/products-sold-helpers.test.ts` | `mergeProductsSold`：空輸入保留、quantity/revenue 合併、多 productId；`subtractProductsSold`：部分扣減、完全扣減移除 key、超額扣減 clamp to 0 |

**總計：** 43 個測試案例，全部通過。

---

## 5. 目前整體穩定性評估

**90–92%**

評估依據：
- Phase 3–5 definition of done 已全部滿足
- Phase 6 已完成核心 helper 與 repair fixture（約 1/3）
- 高風險區（`lib/db/events.ts`、`hooks/useSync.ts`）未進行任意修改
- 所有現有測試通過、TypeScript clean、lint clean、build 成功

尚未覆蓋的剩餘風險：
- 端到端事件 replay（rebuildSnapshots 未測試）
- Supabase 多人協作環境中的 RLS/RPC 行為
- 實際瀏覽器 IndexedDB 在低效能設備上的 race condition
- Import rollback 流程

---

## 6. 尚未完成但建議暫緩的任務

| 任務 | 建議暫緩原因 |
|---|---|
| `rebuildSnapshots()` replay fixture | 需要完整事件鏈重放，觸發所有 handler，mock 複雜度極高；應在 Phase 6 輕量 fixture 完成後再分步進行 |
| Sync service 全量採用 | 需遍歷 `hooks/useSync.ts` 所有 call site，風險高於回報 |
| `lib/db/events.ts` 大幅重構 | Handoff plan 明確標記為高風險區，任意修改可能破壞事件溯源不變性 |
| Supabase RLS / RPC 變更 | 需要真實 Supabase 環境才能驗證，目前本地無法模擬 |
| 自動 CI 部署 | 目前無 GitHub Actions，每日需手動執行驗證命令 |

---

## 7. 未來若要繼續，建議順序

### 立即可做（低風險）

1. **Phase 6 輕量 fixture** — 不需觸發 handler 的測試
   - `legacy backup with missing optional fields`
   - `import rollback / rejected import`

2. **`rebuildSnapshots` 分步測試（Step 1–2）**
   - 先單測單一 handler 的 snapshot 更新邏輯（Mock：`dailyStats.get` / `dailyStats.update` / `products.get`）
   - 再做 2–3 個 handler 的簡單序列

### 中期可做（中風險）

3. **`rebuildSnapshots` 完整端到端測試（Step 3–4）**
   - 10+ 事件序列覆蓋所有 handler
   - 需要完整 db mock 層

4. **事件刪除服務整合測試**
   - 覆蓋 `market_deleted`、`product_deleted`、`interaction_deleted` 的 payload 解析

### 長期可做（高風險，應有充分理由才動）

5. `hooks/useSync.ts` 全量改用 sync service
6. `lib/db/events.ts` 中的 handler 重構
7. 任何涉及 Supabase RLS / RPC 的變更

---

## 8. 驗證命令

在每個 commit 前執行以下命令，確認全部通過後再 commit：

```powershell
npm.cmd test
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
npm.cmd run build
git diff --check
```

**預期結果：** 全部成功（`exit code 0`）。

> Build 可能顯示 `Supabase 環境變數未設置，多人協作功能將無法使用`，此為已知警告，不影響本輪優化目標。

---

## 9. 注意事項

### 不要碰 `.git_commit_msg.txt`

此檔案可能出現在 git status 中顯示為 deleted。**不要 restore、不要 commit、不要刪除。** 若有疑慮，請先確認 `.git_commit_msg.txt` 的原始內容是否為必要的專案文件。

### `rebuildSnapshots` Fixture 是高風險任務

原因：
- 需完整事件鏈重放，幾乎所有 event handler 都會被觸發
- `deal_closed` handler 內有 `db.products.get()`、`db.markets.get()` 等多層鏈式呼叫
- 在 Node.js（無 IndexedDB）中執行需要大量 db mock
- 若 mock 不完整，可能產生假性通過，掩蓋實際 bug

建議拆分方式：
1. **Step 1** — 純函式隔離測試（`normalizeProductsSold` 等，已有）
2. **Step 2** — 單一 handler 獨立測試（只 mock `dailyStats.*`、`products.get`）
3. **Step 3** — 2–3 個 handler 簡單序列（`market_created` → `product_created` → `deal_closed`）
4. **Step 4** — 完整 `rebuildSnapshots`（10+ 事件，所有 handler）

每步均為可獨立驗證的 commit。

### Supabase RLS/RPC 需要真實環境驗證

目前本地無 Supabase 環境，以下任務無法在本地完整驗證：
- RLS 策略變更
- RPC 端點修改
- 多人協作下的 conflict resolution

若需變更，應在具有完整 Supabase 專案存取的環境中進行，並建立對應的整合測試。

---

## 驗證結果摘要（2026-05-26）

| 檢查 | 結果 |
|---|---|
| `npm.cmd test` | 43/43 PASS |
| `npx.cmd tsc --noEmit --incremental false` | pass |
| `npm.cmd run lint` | pass |
| `npm.cmd run build` | pass |
| `git diff --check` | pass |
