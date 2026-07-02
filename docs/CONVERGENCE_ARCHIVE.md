# Féria 資料收斂文件總檔（單一權威入口）

更新日期：2026-06-17（C2.30A 員工資料污染 auto-reset；C2.29 收斂 100% 達標）
建立目的：取代散落於 `docs/` 的 11 份歷史設計/覆核/審查文件，提供單一可搜尋的入口。

## 0. 如何閱讀

| 想找的內容 | 應該看哪裡 |
|---|---|
| 整體收斂主線、C2/C3 phase 狀態 | [`docs/DATA_CONVERGENCE_PLAN.md`](./DATA_CONVERGENCE_PLAN.md) |
| Cursor/Codex 接手任務、commit 切法驗證 | [`docs/CURSOR_DATA_CONVERGENCE_HANDOFF.md`](./CURSOR_DATA_CONVERGENCE_HANDOFF.md) |
| 各 phase 的「最終結論 + 對應 commit」 | **本文件**（`docs/CONVERGENCE_ARCHIVE.md`） |
| 員工權限加固細節（C2.23-C2.30） | [`docs/OWNER_STAFF_REVENUE_HARDENING_PLAN.md`](./OWNER_STAFF_REVENUE_HARDENING_PLAN.md) |
| 線上 Supabase 資料診斷 SQL | [`docs/CLOUD_DATA_CONSISTENCY_AUDIT.md`](./CLOUD_DATA_CONSISTENCY_AUDIT.md) |
| Staff sanitizer 欄位保護 | [`docs/STAFF_DATA_FLOW_AUDIT.md`](./STAFF_DATA_FLOW_AUDIT.md) |
| **C3.4 出問題時的追蹤 / Troubleshooting**（症狀 → 測試 → commit → 修復點） | [`docs/C3.4_REGRESSION_TROUBLESHOOTING.md`](./C3.4_REGRESSION_TROUBLESHOOTING.md) |

> **本文件不重複各 phase 的詳細設計/決策**——那些內容在原始 archive 文件中仍可讀，且內容凍結。
> 若發現原始 archive 與現況矛盾，**以本文件為準**，並請回報修正。

## 1. 已整合（過時，已被本檔/新設計取代）

| 原始文件 | 取代原因 | 取代後位置 |
|---|---|---|
| [`docs/OWNER_STAFF_REVENUE_HARDENING_PLAN.md`](./OWNER_STAFF_REVENUE_HARDENING_PLAN.md) | 階段表停留在 2026-06-12，**C2.26 / C2.30+ 整合未反映** | 本文件 §5 與原檔頂端 ARCHIVED 區塊；階段表已於 2026-06-14 補完 |
| [`docs/DATA_ACCESS_AUDIT.md`](./DATA_ACCESS_AUDIT.md) | 沒提 PermissionGate、C2.19B View Model 整合、DataSanitization 統一閘 | 本文件 §6（描述已被取代的範圍） |

## 2. Archive 保留（內容凍結，仍是有效歷史紀錄）

這些文件**仍有效**（描述的設計/覆核結論與現況一致），但**不再單獨維護**。
未來若需查閱「某個 phase 為什麼這樣決定」，讀對應 archive。

| 文件 | 對應 phase | 最終結論 | 對應 commit |
|---|---|---|---|
| [`docs/EVENT_HANDLER_CONVERGENCE_ANALYSIS.md`](./EVENT_HANDLER_CONVERGENCE_ANALYSIS.md) | C1（event handler 拆分） | Step 1（純函式）、Step 2（手動補登分支替換）、Step 3（item projection 純函式）、Step 4A（handler regression tests）、C1（handler-compatible item helper）皆已完成；**Step 4（接入 handler）仍未決定** | `f5b852a`, `bb97027`, `64f8e38`, `83767f3`, `c0bf681` |
| [`docs/RECOVERY_PROJECTION_DESIGN.md`](./RECOVERY_PROJECTION_DESIGN.md) | C2.17A | Recovery 頁 Projection Rebuild **已完整實作**，無需修改 production code | `e799e36`（C2.18B）前相關 |
| [`docs/MARKET_DETAIL_VIEW_MODEL_DESIGN.md`](./MARKET_DETAIL_VIEW_MODEL_DESIGN.md) | C2.19A | 設計完成；C2.19B（市場詳情頁接入 view model）與 C3.5（列表頁）已實作 | `8773e47`, `a92a348`, `e8f317d` |
| [`docs/SYNC_RECONCILIATION_DESIGN.md`](./SYNC_RECONCILIATION_DESIGN.md) | C2.18A/B | `projection-reconciliation.ts` 已實作並整合至 `useSync.ts`；**所有 sync 路徑均為 observation-only**（不自動修） | `86569d8`, `f03f839`, `8c32b86` 等 |
| [`docs/MARKET_PROJECTION_CACHE_DESIGN.md`](./MARKET_PROJECTION_CACHE_DESIGN.md) | C2.16A | 現有 Hook 足夠，**無需新增 service**；C2.16B 實作：DailyRevenueStats 統一讀 `dailyStats` projection | `8773e47` |
| [`docs/ACTIVE_EVENT_SERVICE_DESIGN.md`](./ACTIVE_EVENT_SERVICE_DESIGN.md) | C2.15A | 服務已足夠，**無需重構** | `da69556` |
| [`docs/OWNER_MARKET_HYDRATION_DESIGN.md`](./OWNER_MARKET_HYDRATION_DESIGN.md) | C3.3A | 方案 B（Batch Hydration）已實作 | `b420068` |
| [`docs/LOGIN_CACHE_RESET_DESIGN.md`](./LOGIN_CACHE_RESET_DESIGN.md) | C3.2A | `resetAuthenticatedCache(scope)` 已實作並接入 `auth-context.tsx` | `31816d8` |
| [`docs/CLOUD_FIRST_CACHE_AUDIT.md`](./CLOUD_FIRST_CACHE_AUDIT.md) | C3.1A | 審查完成；架構決策：Supabase 為唯一長期真相，IndexedDB 降級為 authenticated cache | —（僅文件） |

## 3. 獨立工具（與收斂主線無依賴）

| 文件 | 用途 | 是否仍維護 |
|---|---|---|
| [`docs/CLOUD_DATA_CONSISTENCY_AUDIT.md`](./CLOUD_DATA_CONSISTENCY_AUDIT.md) | 唯讀 SQL 診斷工具集（A-G 七段查詢） | ✅ 仍是有效的 SQL 工具，無需更新 |
| [`docs/STAFF_DATA_FLOW_AUDIT.md`](./STAFF_DATA_FLOW_AUDIT.md) | Staff sanitizer 欄位保護審查報告 | ✅ 仍有效（補充：2026-06-14 起 C2.30D 又加一層「補回脫敏」防線，見本文件 §7） |

## 4. C2.30+ 員工權限加固收斂（PermissionGate 主軸）

由 `OWNER_STAFF_REVENUE_HARDENING_PLAN.md` 與 `DATA_CONVERGENCE_PLAN.md` 共同負責追蹤。本文件**僅做整合視角**：

### 4.1 階段對照

| Phase | 目標 | 狀態 | Commit | 詳見 |
|---|---|---|---|---|
| C2.23 | Deal mode flags 明確化 | ✅ | — | hardening plan |
| C2.24A | Staff 刪除入口封鎖 | ✅ | — | hardening plan |
| C2.24B | 刪除 service 權限防護 | ✅ | — | hardening plan |
| C2.25 | DailyTransactionLog 成交筆數修正 | ✅ | — | hardening plan |
| C2.26 | Staff 敏感財務欄位 UI 審查 | ✅ **透過 C2.30C 實質完成** | `4ab4b1a` | 見本文件 §5 |
| C2.30C | PermissionGate 統一脫敏層 | ✅ | `4ab4b1a` | 見本文件 §6 |
| C2.30D | Cloud→local 補回脫敏 | ✅ | `342bed3`, `280c2fa` | 見本文件 §6 |
| C2.31 | 衝突解決脫敏 | ✅ | `799b8ab`, `2fd23c8` | 見本文件 §6 |
| C2.27 | Staff local-first detail 檢查 | ✅ **已透過 StaffMarketDetailView 重構 + 三層防線實質完成**（2026-06-15） | `ed79a23`, `727de49`, `c5cacfa` | [`docs/C2.27_REANALYSIS_2026_06_15.md`](./C2.27_REANALYSIS_2026_06_15.md) |
| C2.28 | Role fail-closed 評估 | 🟡 **已分析，P0 fail-closed 修補中**（2026-06-15：sync-context + role error；頁面 render guard 待 C2.28B） | `94f9fc5` | [`docs/C2.28_REANALYSIS_2026_06_15.md`](./C2.28_REANALYSIS_2026_06_15.md) |
| C2.29 | Supabase view / RLS hardening 草稿 | ✅ **C2.29 收斂 100% 達標**（2026-06-16）：C2.29B-1 + 1.1 + 2.1 + 2.2 + 2.3 全部完成。8 個攻擊面全部消除，E1-E5 全部通過 | `439f97f`（039）+ `8ff6b09`（040）+ `54ac823`（041）| [`docs/C2.29_REANALYSIS_2026_06_15.md`](./C2.29_REANALYSIS_2026_06_15.md) §C2.29B-1/1.1 Apply + [`docs/C2.29B-2_1_RLS_MIGRATION_DRAFT_2026_06_16.md`](./C2.29B-2_1_RLS_MIGRATION_DRAFT_2026_06_16.md) + [`docs/C2.29B-2.2_STAFF_TYPED_CLIENT_2026_06_16.md`](./C2.29B-2.2_STAFF_TYPED_CLIENT_2026_06_16.md) + [`docs/C2.29B-2_VERIFICATION_2026_06_16.md`](./C2.29B-2_VERIFICATION_2026_06_16.md) |
| **C3.4** | **Projection 二次累加修復（水水市集問題）** | ✅ **完成**（2026-06-14） | `f7155fb` (P0) + `c6de385` (P1) + `7b6590f` (P2) + `89dec72` (P3) | [`docs/PROJECTION_DOUBLECOUNT_FIX_PLAN.md`](./PROJECTION_DOUBLECOUNT_FIX_PLAN.md) + [`docs/C3.4_REGRESSION_TROUBLESHOOTING.md`](./C3.4_REGRESSION_TROUBLESHOOTING.md) |

### 4.2 為什麼 C2.26 透過 C2.30C 實質完成

C2.26 原意是「Staff 不顯示成本、利潤、毛利率、費用、供應商資訊」。

實作方式不是新增 UI 條件式判斷，而是：

1. 引入 `lib/permissions/PermissionGate.ts` 作為**單一脫敏真相來源**（`infoLevel`: 0/1/2 = 員工漸進，3 = 老闆）
2. 所有 UI 元件（MarketCard、ProductCard、DailyTransactionLog、TopNavigation…）改呼叫 `canViewSensitiveData()` 判斷
3. Provider 從 `useUserRole()` 取得 staff 身分，自動決定 `infoLevel`

**語意達成 C2.26**（Staff 看不到敏感欄位），但**實作超越 C2.26 原計畫**（不是逐欄位判斷，而是脫敏閘道）。原計畫標「待開始」已**過時**。

### 4.3 統一脫敏三層防線

| 層 | 何時套用 | 檔案 | Commit |
|---|---|---|---|
| **第 1 層：Cloud → local hydration** | 雲端補回的 market/product 寫入 IndexedDB 前 | `useSync.ts` 補回路徑 + `recovery.ts` | `342bed3` + `280c2fa` |
| **第 2 層：Conflict resolution** | `detectAndResolveConflict` 的 remote/merge 策略寫入前 | `useSync.ts` conflict 路徑 | `799b8ab` + `2fd23c8` |
| **第 3 層：UI 顯示** | 任何敏感欄位在 JSX 渲染前 | 各 components（MarketCard 等） + `PermissionGate.canViewSensitiveData()` | `4ab4b1a` |

### 4.4 員工視角下的特殊邏輯

在 C2.31 衝突解決脫敏中：

- **`merge` 策略**下，員工視角以脫敏後的雲端值做 `Math.max`，避免 `cost/supplier` 污染合併
- **`merge` 策略**下，員工視角**跳過 `stock` 的 Math.min 保守合併**（理由：員工看不到 stock 真相，保守合併會誤算庫存）
- **`local` 策略**下，員工視角不觸發任何寫入

詳見 `tests/conflict-sanitization.test.ts`（6 個新測試）。

## 5. C2.23-C2.25 細節（仍見 hardening plan）

C2.23 / C2.24A / C2.24B / C2.25 細節見 [`docs/OWNER_STAFF_REVENUE_HARDENING_PLAN.md`](./OWNER_STAFF_REVENUE_HARDENING_PLAN.md) 第 30-77 行，內容已完整、無過時。

## 6. C2.30C / C2.30D / C2.31 — 統一脫敏三層

### 6.1 取代 `DATA_ACCESS_AUDIT.md` 的範圍

原 `DATA_ACCESS_AUDIT.md`（2026-06-13）盤點的「C2.15 / C2.16 候選服務」、「C2.30A / C2.30B 之前的完整性分流」等**仍有效**。

但以下幾點**已過時**，本節取代：

1. **「Staff sanitizer 散落」** → 已統一為 `PermissionGate`
2. **「Market Detail 雙資料來源」** → 已由 C2.19B 統一為 view model
3. **「DailyRevenueStats 混合讀 projection 與 raw events」** → 已由 `8773e47` 統一讀 `dailyStats.extraInteractions`
4. **「Owner missing market hydration 風險」** → 已由 `b420068` 修復
5. **「Owner→Staff cache 切換殘留」** → 已由 `31816d8` 修復

詳見 `docs/DATA_CONVERGENCE_PLAN.md` 的 Phase 表。

### 6.2 `PermissionGate` 設計要點

`infoLevel` 模型（4 階）：

| Level | 對象 | 可見敏感欄位 |
|---:|---|---|
| 0 | Staff 完全唯讀 | ❌ 成本/利潤/毛利率/費用/供應商 |
| 1 | Staff 進階 | ⚠️ 部分成本欄位（限被授權） |
| 2 | Staff 管理 | ⚠️ 成本（但無 supplier 個資） |
| 3 | Owner | ✅ 全部 |

`PermissionGate.canViewSensitiveData(userRole, resourceContext?)` 是**唯一**的脫敏判斷入口。Provider 從 `useUserRole()` 取得身分，UI 元件呼叫 gate 決定顯示與否。

### 6.3 測試覆蓋

| 測試檔 | 場景數 | 對應 commit |
|---|---:|---|
| `tests/data-sanitization.test.ts` | 11 | 既有 |
| `tests/semantic-event-dedupe.test.ts` | 多 | `da69556` |
| `tests/recovery-helpers.test.ts` + `tests/daily-stats-repair.test.ts` + `tests/products-sold-helpers.test.ts` | 多 | `8c32b86` |
| `tests/data-canonicalization.test.ts` | 多 | — |
| `tests/sync-reconciliation.test.ts` | 6+ | `86569d8` |
| `tests/conflict-sanitization.test.ts` | 6 | `799b8ab` + `2fd23c8` |
| `tests/staff-event-preflight.test.ts` | 多 | C2.30B |
| `tests/integrity-profile.test.ts` | 多 | C2.30A |

## 7. 員工脫敏的「互補防線」

[C2.30D 補回脫敏] + [C2.31 衝突解決脫敏] + [C2.30C PermissionGate] 形成**三層防線**：

```text
Cloud (Supabase)               Local (IndexedDB)             UI
    │                              │                          │
    │  雲端資料 = 真相（可能含敏感欄位）                       │
    ▼                              │                          │
[Layer 1: 補回脫敏]                │                          │
useSync hydration 寫入前脫敏        │                          │
    │                              │                          │
    ├─────────────────────────────▶│  本地 cache 永不含敏感     │
    │                              │                          │
[Owner 衝突解決]                   │                          │
[Layer 2: 衝突脫敏]                │                          │
remote/merge 策略寫入前脫敏         │                          │
    │                              │                          │
    ▼                              ▼                          │
[任何角色寫入到本地]                │                          │
                                   │                          │
                                   ▼                          │
                            [UI 顯示]                        │
                                   │                          │
                            [Layer 3: 渲染脫敏]              │
                            PermissionGate.canViewSensitive  │
                                   │                          │
                                   ▼                          │
                                 JSX 輸出（員工視角乾淨）      │
```

任何一層失守，下一層仍能擋下。這是**fail-closed by design**。

## 8. 不變的禁令（沿用 DATA_CONVERGENCE_PLAN §五）

不論 archive 文件如何，**以下禁令永久有效**：

- ❌ 不刪 IndexedDB events
- ❌ 不直接改 Supabase events / RLS / schema
- ❌ 不用市集日期 cutoff 猜測舊資料
- ❌ 不在 sync 中自動用 partial local events 重建 projection
- ❌ 不把 `owner_full` integrity 的 missing market 降級成 warning
- ❌ 不恢復 snapshot 功能
- ❌ 不刪除 archive 原始文件（即使內容過時）

## 9. 未來維護約定

1. **新 phase** 開工時：在 `DATA_CONVERGENCE_PLAN.md` 加 phase 編號 + 在本文件 §2 加 archive 列
2. **archive 文件**只讀不寫，發現錯誤請用新文件記錄
3. **`OWNER_STAFF_REVENUE_HARDENING_PLAN.md`** 仍在維護（C2.27 ✅ / C2.28 ✅ / C2.28B ✅ / **C2.29B-1 view 層 ✅ / C2.29B-1.1 view scope ✅ / C2.29B-2 全部完成 ✅**），但格式應與 `DATA_CONVERGENCE_PLAN.md` 對齊
4. **`CLOUD_DATA_CONSISTENCY_AUDIT.md`** 是 SQL 工具，未來若新增診斷場景直接加章節
5. **每次 phase 完成**需跑： `npm test` + `npx tsc --noEmit` + `npm run lint` + `npm run build` + `git diff --check`

## 10. 相關文件總覽

```
docs/
├── DATA_CONVERGENCE_PLAN.md          ← 主計畫（C2/C3 phase 表 + 原則）
├── CURSOR_DATA_CONVERGENCE_HANDOFF.md ← 接手手冊（驗證清單 + commit 切法）
├── CONVERGENCE_ARCHIVE.md             ← 本文件（單一權威入口）
├── OWNER_STAFF_REVENUE_HARDENING_PLAN.md ← C2.23-C2.29 細節
├── CLOUD_DATA_CONSISTENCY_AUDIT.md   ← 線上 SQL 診斷（獨立工具）
├── STAFF_DATA_FLOW_AUDIT.md          ← Staff sanitizer 審查（已過時但保留）
├── PROJECTION_DOUBLECOUNT_FIX_PLAN.md ← C3.4 計畫（為什麼這樣改）
├── C3.4_REGRESSION_TROUBLESHOOTING.md ← C3.4 追蹤（出問題時怎麼查 / 怎麼修）
│
├── EVENT_HANDLER_CONVERGENCE_ANALYSIS.md  [archived]
├── RECOVERY_PROJECTION_DESIGN.md         [archived]
├── MARKET_DETAIL_VIEW_MODEL_DESIGN.md    [archived]
├── SYNC_RECONCILIATION_DESIGN.md         [archived]
├── MARKET_PROJECTION_CACHE_DESIGN.md     [archived]
├── ACTIVE_EVENT_SERVICE_DESIGN.md        [archived]
├── DATA_ACCESS_AUDIT.md                  [archived, 部分取代]
├── OWNER_MARKET_HYDRATION_DESIGN.md      [archived]
├── LOGIN_CACHE_RESET_DESIGN.md           [archived]
├── CLOUD_FIRST_CACHE_AUDIT.md            [archived]
│
├── ANALYTICS_PRODUCT_PLAN.md          (其他計畫，未整合)
├── ANALYTICS_IMPLEMENTATION_TASK_PLAN.md
├── DATA_SAFETY_REVIEW_PLAN.md
├── ENGINEERING_FIX_PLAN.md
├── ENGINEERING_FIX_SUMMARY.md
├── NEXT_OPTIMIZATION_PLAN.md
├── QUICK_START.md
├── RECOVERY_USER_GUIDE.md
├── ROLE_ACCESS_MODEL.md
├── ROLE_SECURITY_CHECKLIST.md
└── STABILITY_OPTIMIZATION_FINAL_SUMMARY.md
```

> `[archived]` = 本次整合後標記，內容凍結，僅供查閱歷史決策。
