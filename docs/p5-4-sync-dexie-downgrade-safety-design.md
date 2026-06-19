# P5-4: Sync / Dexie Downgrade Safety Design

> Status: P5-4 Design Only
> Risk: Red / Design Only（高敏感，因為是 B1 風險設計）
> Last Updated: 2026-06-19
> Author: Cursor (kl-4ndroid 委託)

---

## 0. 重要前提

**P5-4 不是「useUserRole export staffRole」**。該工作已在 P5-2（commit `03645fb`）完成。
**P5-4 的核心是 B1：降權後本地 cache / Dexie / sync 安全設計。**

| 階段 | 範圍 | 狀態 |
|------|------|------|
| P5-1 | 設計 | ✅ 完成（commit `db9e590`） |
| P5-2 | useUserRole read role | ✅ 完成（commit `03645fb`） |
| P5-3 | role-capabilities helper | ✅ 完成（commit `77be97c`） |
| **P5-4** | **Sync / Dexie downgrade safety** | **🔴 本文件（設計 only）** |
| P5-5 | operator write paths | 等待 P5-4 gate |
| P5-6 | manager write paths | 等待 P5-5 |
| P5-7 | StaffPermissionCard role-aware | 等待 P5-5/6 |

**本文件是 P5-5（operator 互動/成交寫入）實作前的必要 gate**。沒有 P5-4 的設計與實作，operator write 開關一旦打開，就會在降權情境下產生資料隔離風險。

### 0.1 本文件是什麼 / 不是什麼

本文件**是**：
- 一份「降權情境 + 現有失效機制 + 風險分級 + 候選策略 + 推薦策略 + 實作切分」的設計書
- 給 P5-4a / P5-4b / P5-4c / ... 實作階段遵循的契約

本文件**不是**：
- 不是 runtime 程式碼（不會修改任何 hooks / lib / components / app / migrations）
- 不是 P5-5 設計（P5-5 仍需獨立 design review）
- 不是角色矩陣（那是 `docs/staff-role-matrix.md` 的範疇）
- 不是 UI 改動計畫

### 0.2 不在 P5-4 範圍內

- ❌ 不開放任何 operator / manager 寫入能力
- ❌ 不修改 `useUserRole` / `useSync` / `useStaffStatusMonitor` / `useStaffPermissions`
- ❌ 不修改 `PermissionGate` / `role-fail-closed` / `role-capabilities`
- ❌ 不修改 `lib/db/*`（`clear-user-data.ts` 等）
- ❌ 不修改 components / app
- ❌ 不新增 migration
- ❌ 不修既有 `limit(1)` ambiguity（屬 R9 既有 bug，獨立 design）
- ❌ 不進 P5-5 / P5-6 / P5-7

---

## 1. Purpose

P5-4 處理的核心問題：

> 當 server 已把 operator / manager 員工降權為 viewer（或直接 revoke）後，
> 員工裝置上的 local cache / Dexie projection / sync 行為如何保持一致？
>
> 員工在離線時，是否會以過期的高權限繼續讀寫？
> 是否會殘留 L2（成本/利潤相關）資料？
> 多 tab / 多裝置如何同步角色狀態？

**P5-4 只回答「要怎麼設計」，不實作。**
P5-4 的具體實作會拆成 P5-4a ~ P5-4f 六個小階段（見 §7）。

### 1.1 為什麼這是 P5-5 的 hard gate

依 P5-1 文件 §R8「Offline write after role change」：

> 員工在離線狀態下，server 已降權但 local 仍以舊 role 運作。
> P5-4 必須設計明確的 offline write policy。
> Staff write actions 必須在 role stale 或離線時 fail-closed 或 queue with revalidation。
> **P5-5b MUST NOT ship before P5-4。**

換言之：沒 P5-4，operator write 不能開。

### 1.2 P5-4 與既有 C2 / C3 hardening 的關係

P5-4 建立在既有 C2.28 fail-closed、C2.30C PermissionGate、C2.30D 雲端補回脫敏、C3.6.1 員工被踢清理之上，但：

| 既有 C 階段 | 範圍 | P5-4 補完的部分 |
|---|---|---|
| C2.28 | fail-closed permission (loading/error/未登入) | ✅ 已涵蓋「查詢失敗時」降權 |
| C2.30C | PermissionGate 統一脫敏閘道 | ✅ 已涵蓋 pull/hydration sanitize |
| C2.30D | 雲端補回脫敏 | ✅ 已涵蓋 merge 時 sanitize |
| C3.6 / C3.6.1 | staff 被 revoke 清理 | ⚠️ 僅涵蓋 `status !== 'active'`，**未涵蓋 role 改變**（operator/manager → viewer） |
| **P5-4** | **降權後 sync / cache / UI 安全** | **🎯 補完 operator/manager → viewer / revoke 同步、role stale UI lock、write freshness gate** |

---

## 2. Current Mechanisms Audit

本節盤點 P5-4 設計需要仰賴 / 對接的現有 runtime 機制。

### 2.1 useUserRole cache

**檔案**：`hooks/useUserRole.ts`

| 項目 | 現況 | P5-4 設計意涵 |
|------|------|---------------|
| `ROLE_CACHE_KEY` | `'user_role_cache'`（localStorage） | 已有 cache 機制 |
| `ROLE_CACHE_TTL_MS` | `5 * 60 * 1000`（5 分鐘） | ⚠️ 太長；operator 寫入開啟後需要重新評估 |
| cache 內容 | `{ userId, role: UserRole, timestamp }` | 已在 P5-2 包含 `staffRole` |
| 讀取時機 | `useState` initial callback（mount 時） | 掛載瞬間可拿到 stale role |
| 寫入時機 | Supabase query 成功後 | 包含 owner / staff / fail-closed 三條路徑 |
| `invalidateRoleCache()` | 已 export（L90-92） | ✅ 已有 API，可被監控 hook 觸發 |
| `clearRoleCache()` | 已 export（L97-100） | ✅ 已有 API |
| 何時被呼叫 invalidate | 1. `useUserRole` 內部 `user` 變 null 時（L127）<br>2. `useStaffStatusMonitor` 偵測到 revoke 時（L126） | ⚠️ **僅在 revoke 觸發**；role 從 operator/manager → viewer **不會**觸發 |
| TTL 自然過期 | 5 分鐘後下次 mount 自動重新查 | 5 分鐘內若已被降權，仍會被本地視為高權限 |

**P5-4 缺口**：
1. `useUserRole` 不知道「role 從 operator/manager 改成 viewer」是一種降權
2. TTL 5 分鐘對 P5-5 operator 寫入開啟後過長
3. 沒有「cache hit 但 role 已 stale」的偵測機制

### 2.2 useSync / effectiveInfoLevel

**檔案**：`hooks/useSync.ts`、包裝者 `lib/sync-context.tsx`

| 項目 | 現況 | P5-4 設計意涵 |
|------|------|---------------|
| `roleInfoLevel` 來源 | `deriveSafeInfoLevel(userRole, isLoading, roleError)` via `SyncProvider` | ✅ fail-closed 推導 |
| `effectiveInfoLevel` 計算 | `L235: roleInfoLevel ?? 3` | 載入中預設 3（owner）但因為 `enabled: !isRoleLoading` 不會真的 sync |
| 是否在 infoLevel 改變時重新 sanitize | ⚠️ 需依賴 `useEffect` 內的依賴鏈；無「降權觸發 re-sanitize」邏輯 | **這是 P5-4 核心要處理的問題** |
| 是否知道 staffRole | ❌ 完全沒 import / 沒讀 `userRole.staffRole` | operator/manager 寫入 gate 還沒接 |
| 是否知道 role 降權 | ❌ 沒有任何「role 從 X 變 Y」的事件 hook | 需新增降權偵測 |
| 寫入前 sanitize | ✅ `sanitizeWritePayload` 對 markets/products 寫入前 gate | 已涵蓋 owner / staff 寫入 |
| 寫入前的 canEdit gate | ❌ 無 | P5-4 要設計 freshness gate |

**P5-4 缺口**：
1. `useSync` 對「role 降權」完全沒有感應
2. 沒有「infoLevel downgrade → 自動清掉 Dexie 中殘留的 L2 資料」邏輯
3. 沒有「write 動作需 fresh role」的 gate

### 2.3 Dexie / local DB

**檔案**：`lib/db/index.ts`（`MarketPulseDB` class）、`lib/db/clear-user-data.ts`

| 表 | owner 視角內容 | staff (L2) 視角內容 | 降權後殘留風險 |
|----|----------------|---------------------|----------------|
| `events` | 全部 events（含成本 / 收入 / 互動） | 經 `sanitizeEventsWithLevel` 過濾後的事件；可能含成本 events 已被 `shouldBlockEvent` 阻擋 | ⚠️ L2 events 已寫入；降權後**不會自動重新過濾** |
| `markets` | 全部欄位（含 totalCost / totalProfit / netProfit / deposit / commissionRate / costBreakdown / averageCost / costPerItem） | 經 `marketGateForLevel(infoLevel).sanitizeMarketProjection` 移除 BASE_FIELDS | ⚠️ L2 markets 投影已寫入；降權後**不會自動重脫敏** |
| `products` | 全部欄位（含 cost / supplierInfo / profitMargin / grossMargin） | 經 `sanitizeWithLevel` 移除敏感欄位 | ⚠️ 同上 |
| `dailyStats` | 全部 stats | 經 `PermissionGate.sanitizeDailyStatsProjection` 處理 | ⚠️ 同上 |
| `settings` | 用戶偏好 | 用戶偏好 | ✅ 不受 role 影響 |
| `syncQueue` | 待同步事件 | 待同步事件 | ⚠️ 員工 queued 的事件若在降權後上傳，需被 server 拒絕；不是 local 端能保證的 |

**P5-4 缺口**：
1. 沒有「降權 → 清掉 staff L2 projection」邏輯
2. 沒有「降權 → 重新 pull 並以新 infoLevel sanitize」的邏輯
3. 現有 `resetAuthenticatedCache('full')` 是 coarse 全清（含 owner 資料），不適合降權情境

### 2.4 Staff status monitor

**檔案**：`hooks/useStaffStatusMonitor.ts`

| 項目 | 現況 | P5-4 設計意涵 |
|------|------|---------------|
| 監控頻率 | Polling 180 秒一次（`DEFAULT_STAFF_POLL_INTERVAL_MS`） | ✅ 已有成本可控的 polling |
| 監控條件 | `enabled && user && isStaff && userRole.ownerId` | 只在 staff session 啟動 |
| 查詢內容 | `count from staff_relationships where staff_id=... and owner_id=... and status='active'` | ⚠️ **未查 `role` 欄位** |
| 偵測到 revoke | count=0 → `handleRevoked('poll')` | ⚠️ **未偵測 role 改變** |
| handleRevoked 動作 | invalidateRoleCache + resetAuthenticatedCache('full') + deleteDatabase + sessionStorage.clear + resetInitialSyncFlag + reload | 對 revoke 是合理的（要清掉所有 staff local data），但對降權（operator/manager → viewer）可能過於 aggressive |
| 觸發清除 | `window.location.href = '/'` | 強制 reload |

**P5-4 缺口**：
1. **未監控 `role` 欄位變更**（這是 P5-4 核心要補的）
2. 對降權（不是 revoke）使用與 revoke 相同的「full deleteDatabase + reload」流程，可能太激進
3. 沒有降權 vs revoke 兩種情境的差異化處理

### 2.5 PermissionGate sanitize

**檔案**：`lib/permissions/PermissionGate.ts`

| 項目 | 現況 | P5-4 設計意涵 |
|------|------|---------------|
| Sanitize 時機 | Pull / hydration / merge / replay 時 | ✅ write-time sanitize 完整 |
| 是否支援 read-time re-sanitize | ❌ | 既有資料降權後**不會**自動重新過濾 |
| 能否「降級 sanitize」現有資料 | ⚠️ 純函式可呼叫，但沒有「整個 Dexie re-sanitize」的 batch helper | P5-4 需設計此 helper（或明確決定不做） |
| canViewSensitiveData 行為 | 依 `isOwner` 計算，fail-closed | ✅ UI 顯示會即時反映新 role（每次 re-render） |
| canPerformSensitiveAction | 依 infoLevel 計算 | ✅ UI 同上 |

**P5-4 缺口**：
1. 沒有「整表 re-sanitize 到新 infoLevel」的 batch helper
2. 沒有「降權後自動 trigger 整表 re-sanitize」的 lifecycle hook
3. （可選）若要 re-sanitize，需先定義「重算 infoLevel」的輸入來自 `useUserRole` 的 `userRole.staffRole` 對應的 `permissions.infoLevel`（目前 `deriveSafeInfoLevel` 會用 `permissions.infoLevel ?? 2`，但 P5-4 設計需確認此預設值在降權後仍合理）

### 2.6 RoleLoadingFallback

**檔案**：`components/auth/RoleLoadingFallback.tsx`

| 項目 | 現況 | P5-4 設計意涵 |
|------|------|---------------|
| 功能 | 純 skeleton 組件（C2.28B） | 設計上是「role 載入中」的中性畫面 |
| 用途 | 防止 owner 預設渲染洩漏給員工 | ✅ fail-closed UX |
| 是否適用於「降權後鎖定」 | ⚠️ 可以延伸使用 | P5-4 設計「lock until resync」時可考慮重用 |
| 是否可顯示訊息 | 純文字「正在確認身分...」 | 可延伸為「角色已變更，正在重新同步...」 |

**P5-4 缺口**：
1. RoleLoadingFallback 沒有明確的「stale role detected」狀態入口
2. 沒有「降權後需要重新整理」的主動 UI 提示
3. 沒有「lock until resync」的安全鎖定組件

### 2.7 既有 5 分鐘 role cache TTL 是否足夠

依 P5-1 §R8：

> The role cache 5-minute TTL is acceptable for P5-2 / P5-3 but
> must be reconsidered in P5-4 (see §9.3 Q3).

**P5-4 評估**：
- 在 P5-5 之前：operator 沒有寫入能力，最壞情況是「被降權的 operator 仍可看到 L2 資訊 5 分鐘」。這是 read-only 風險，可接受。
- 在 P5-5 之後：operator 有寫入能力，最壞情況是「被降權的 operator 仍可執行 write 動作 5 分鐘」。這是 write 風險，**不可接受**。

**結論**：P5-4 必須搭配「role freshness gate for write actions」或「降權觸發立即清理」來覆蓋 5 分鐘視窗。

---

## 3. Downgrade Scenarios

本節分析 P5-4 必須覆蓋的 5 個降權情境。每個情境包含「事件時序」「本地狀態」「風險」三段。

### D1. operator → viewer，員工在線

**事件時序**：
```text
T0   員工裝置：userRole = { isStaff: true, staffRole: 'operator' }
      Dexie：markets / products / events / dailyStats 為 L2 投影
      localStorage：user_role_cache TTL 還剩 4:30
T0   server：admin 把 operator 改成 viewer
T1   員工打開新分頁（role 重新查詢）
      useUserRole 重新查 Supabase → 新 role = viewer
      但 staff cache 可能仍在 TTL 內，下一次 mount 才會重新查
T2   員工繼續使用舊分頁
      該分頁仍持有 userRole = { staffRole: 'operator' }
      Dexie L2 投影仍可見
T3   180 秒後 useStaffStatusMonitor 觸發 polling
      查詢：count where staff_id, owner_id, status='active'
      count > 0（status 仍是 active，role 從 operator 變 viewer）
      ⚠️ **useStaffStatusMonitor 不會偵測到這個改變**
      ⚠️ **不會觸發 invalidateRoleCache**
      ⚠️ **Dexie L2 投影不會清除**
T4   5 分鐘後 role cache TTL 過期
      下次 mount 才會重新查 → 看到新 role = viewer
      ⚠️ 但 Dexie L2 投影仍存在於本地，直到下次 pull 才會被新 infoLevel 重新 sanitize
```

## P5-4c Implementation Addendum

Date: 2026-06-19
Author: Codex

Scope: clear staff-scoped local projections on role downgrade.

Changed:
- `lib/db/clear-user-data.ts`
  - Added `clearStaffLocalProjections()`.
  - Deletes staff-marked `markets` / `products` plus related `events` / `dailyStats`.
  - Preserves `settings` and `syncQueue`.
  - Does not call `deleteDatabase`, reload the page, or full-wipe Dexie.
- `hooks/useStaffStatusMonitor.ts`
  - Downgrade path now invalidates role cache, clears staff projections, then dispatches the existing `trigger-sync` event for re-pull.
  - Revoke path remains unchanged: full cleanup + reload.
- `tests/p5-4c-dexie-projection-cleanup.test.ts`
  - Adds predicate and static boundary tests.

Not changed:
- `useSync` behavior.
- `PermissionGate` / `role-fail-closed` / `role-capabilities`.
- `canEdit` / `canViewSensitiveData` / `infoLevel` semantics.
- operator / manager write actions.
- migrations.
- UI.

Next: P5-4c post-implementation audit, then P5-4d freshness gate.

**風險**：
- 在 T0 → T4 之間（最長 5 分鐘），員工仍可看到 L2 投影
- 若 useStaffStatusMonitor 是唯一的「role change」偵測器，它**完全不會**觸發（D1 情境）
- 在 P5-5 開啟 operator 寫入後，這個視窗內 operator 可能繼續寫入 → server 拒絕 → 產生 pending events 堆積

**P5-4 必須回答的問題**：
1. 如何在 180 秒 polling 內偵測 `role` 改變（而不是只看 status）？
2. 偵測後應執行什麼動作？僅 invalidateRoleCache 還是不夠？
3. 是否需要縮短 polling 間隔？
4. 是否需要「local write 觸發時順便檢查 fresh role」？

### D2. manager → viewer，員工離線

**事件時序**：
```text
T0   員工裝置離線（網路斷）
      useUserRole 已載入：userRole = { isStaff: true, staffRole: 'manager' }
      Dexie：markets / products / events / dailyStats 為 L2 投影
      localStorage：user_role_cache TTL 還剩 4:30
      useSync disabled（離線）
      useStaffStatusMonitor 仍嘗試 polling → 失敗（無網路）
T1   server：admin 把 manager 改成 viewer
T2   員工繼續使用 app（離線）
      可看到 L2 markets / products（L2 投影仍可見）
      可執行 L2 寫入（若 P5-5 開啟 manager 寫入）
T3   員工上線
      useSync 重新啟用
      useStaffStatusMonitor polling 成功
      但只檢查 status='active' → count > 0 → 不觸發清理
      Dexie L2 投影仍存在，直到下次 pull 才會重新 sanitize
T4   5 分鐘後 role cache TTL 過期 + 下次 mount → 新 role = viewer
      Dexie L2 投影仍可能存在（取決於 P5-4 設計）
```

**風險**：
- 離線期間員工可能以舊 role 讀取 / 寫入 L2 資料
- 上線後若 P5-4 沒設計「降權後立即清 / re-sanitize」，L2 資料殘留更久
- 在 P5-5 開啟 operator/manager 寫入後，離線期間的寫入會被 server 拒絕（因為已降權），但 client 不知道 → 會 push 失敗 → pending events 堆積 → user 困惑

**P5-4 必須回答的問題**：
1. 離線時 P5-4 能做什麼？（幾乎只有「下次上線時偵測並補救」）
2. 上線後的補救流程是什麼？自動 full wipe？自動 re-sanitize？自動 reload？
3. 是否需要「離線時禁止 staff write」？（fail-closed）

### D3. operator / manager → revoked

**事件時序**：
```text
T0   員工裝置：userRole = { isStaff: true, staffRole: 'operator' }
      Dexie：L2 投影
T0   server：admin revoke staff_relationship（status = 'revoked'）
T1   180 秒後 useStaffStatusMonitor polling
      count = 0 → handleRevoked('poll')
      → invalidateRoleCache
      → resetAuthenticatedCache('full')
      → deleteDatabase('MarketPulseDB')
      → sessionStorage.clear
      → resetInitialSyncFlag
      → window.location.href = '/'
```

**風險**：
- 既有 useStaffStatusMonitor 流程對 revoke 已完整
- 180 秒視窗是已知 trade-off（成本 vs UX）
- ⚠️ 但 `resetAuthenticatedCache('full')` 對「曾經是 owner 的員工切換」會誤清 owner 資料嗎？
  - 答案：不會。`useStaffStatusMonitor` 只在 `isStaff` 為 true 時啟動，且它清的是「這個 session 累積的 staff 投影」+ 整個 cache。
  - 但若 owner 曾在同個瀏覽器先以 staff 身份登入，再切回 owner，登入時 `useUserRole` 會重新查 → owner → `isStaff: false` → 但 `useStaffStatusMonitor` 已被 disable → 不會觸發清理。
  - 這代表 owner 切回時，Dexie 仍殘留前一個 staff session 的資料嗎？
  - 答案：依 `resetAuthenticatedCache` 邏輯（L150-189），它**只會在顯式呼叫時清**。owner session 切換不會自動呼叫 resetAuthenticatedCache。
  - ⚠️ **這是既有 bug**（不在 P5-4 範圍，應另開 issue），但 P5-4 設計時應注意「staff → owner 切換」也應清 staff 投影。

**P5-4 必須回答的問題**：
1. revoke 流程既有，是否需在 P5-4 加強？
2. staff → owner 切換的 Dexie 清理是否屬於 P5-4 範圍？還是既有 bug？
3. revoke 流程的 180 秒視窗是否可接受？需不需要把 status + role 一起查？

### D4. viewer → operator / manager（升權）

**事件時序**：
```text
T0   員工裝置：userRole = { isStaff: true, staffRole: 'viewer' }
      Dexie：L0 投影（已脫敏到 viewer 等級）
T0   server：admin 把 viewer 升級為 operator
T1   180 秒後 useStaffStatusMonitor polling
      count > 0（status 仍是 active）→ 不觸發
      員工仍以 viewer 身份運作
T2   5 分鐘後 role cache TTL 過期
      下次 mount 重新查 → 新 role = operator
      useSync 下次 pull 會以新 infoLevel 重新 sanitize
      Dexie 投影會被 upgrade（從 L0 → L2）
```

**風險**：
- 升權情境**沒有安全風險**（viewer 拿不到 owner-only 資料）
- 升權延遲最多 5 分鐘，UX 略差但不影響安全
- 升權後 Dexie 投影會在下一次 pull 時自動 upgrade，**不需 P5-4 額外設計**

**P5-4 必須回答的問題**：
1. 升權是否需要主動通知員工？（UX 考量）
2. 升權後是否需要「立即 resync」以縮短升權延遲？
3. 答案：升權不屬於安全風險，P5-4 可選擇**不主動處理升權**，僅依賴 5 分鐘 TTL + 下次 pull 自動 upgrade。

### D5. 多 tab / 多裝置

**事件時序**：
```text
T0   員工裝置：tab A 載入 userRole = { staffRole: 'operator' }
      tab B 載入 userRole = { staffRole: 'operator' }
      Dexie：L2 投影
T0   server：admin 把 operator 改成 viewer
T1   tab A 仍在使用（180s 內）
      tab B 仍在使用（180s 內）
      兩個 tab 都不知道 role 已改
T2   180 秒後，tab A 和 tab B 各自 polling
      各自觸發 handleRevoked
      → 各自動 deleteDatabase + reload
      → 兩個 tab 同步重整
```

**風險**：
- 兩個 tab 同時 reload 沒問題（都重整到 `/`）
- 若一個 tab 已 reload 完，另一個 tab 還在 reload 中，會有短暫的不一致（但 reload 後都會一致）
- 若用戶在多裝置（手機 + 平板），每個裝置的 polling 各自獨立，互不知道

**P5-4 必須回答的問題**：
1. 是否需要 BroadcastChannel 跨 tab 通知？
2. 答案建議：**暫不需要**。每個 tab 各自的 polling + reload 已足夠。
3. 但若未來加入「降權時鎖定 UI 而非 reload」，就需要 BroadcastChannel（否則一個 tab 鎖定，其他 tab 仍可操作）

### 3.1 情境總結表

| 情境 | 現有保護 | 缺口 | P5-4 必修？ |
|------|----------|------|------------|
| D1 operator→viewer 在線 | useStaffStatusMonitor status 監控（無效） | role 改變未偵測 | ✅ |
| D2 manager→viewer 離線 | TTL 過期（5 min） | 離線期間無保護 + 上線後未立即清理 | ✅ |
| D3 operator/manager→revoked | useStaffStatusMonitor 完整 | 既有；可能加強 | 🟡 可選 |
| D4 viewer→operator/manager | TTL 過期 + 下次 pull | 升權延遲（無安全風險） | ❌ 不必修 |
| D5 多 tab / 多裝置 | 各 tab 獨立 polling + reload | 跨 tab 通知 | 🟡 可選 |

---

## 4. Risk Classification

本節把 P5-4 必須覆蓋的風險分級。每項有 severity / likelihood / mitigation / 是否阻擋 P5-5。

### R1. 降權後 localStorage role cache 延遲

```text
Description:
  server 已降權但 localStorage user_role_cache 仍在 5 分鐘 TTL 內。
  下次 mount 前 useUserRole 仍會用舊 role 渲染。

Severity:  Medium（read-only 視窗）→ High（write 視窗，P5-5 後）
Likelihood: High（每次降權都會觸發）

Affected:  P5-5

Mitigation:
  - 既有 TTL 自然過期（5 分鐘）
  - 搭配 useStaffStatusMonitor 偵測 role 改變時立即 invalidateRoleCache
  - 搭配 role freshness gate for write actions（即使 cache stale 也禁止寫入）

阻擋 P5-5: 否（搭配 R4 即可覆蓋 write 視窗）
```

### R2. 降權後 Dexie L2 projections 殘留

```text
Description:
  operator/manager 期間，markets / products / events / dailyStats 含 L2 投影。
  降權為 viewer 後，Dexie 內的 L2 投影仍殘留。

Severity:  Medium（敏感欄位殘留）→ High（員工仍可讀 L2 資料）
Likelihood: High

Affected:  P5-5

Mitigation:
  - 降權觸發時清 staff local projections（重新 pull 將以新 infoLevel 重新 sanitize）
  - 或者：保留 Dexie 投影但 UI 層仍以新 infoLevel 渲染（PermissionGate 已是如此）
  - 警告：若只靠 UI 層 render-time gate，Dexie 內的 L2 資料「存在但沒顯示」；
    員工若用 DevTools 直接讀 IndexedDB，仍可取得 L2 資料

阻擋 P5-5: 是（必須在 P5-5 之前有明確設計）
```

### R3. 降權後 events / dailyStats 殘留

```text
Description:
  類似 R2，但 events / dailyStats 是事件流與聚合統計。
  降權後可能殘留成本 events（已被 shouldBlockEvent 阻擋的成本 events 在 staff
  期間從未被寫入，但仍可能有「已被脫敏但未完全清除」的事件）。

Severity:  Medium
Likelihood: Medium

Affected:  P5-5

Mitigation:
  - 降權時一併清 events / dailyStats
  - 或者：replay 整個 event stream 並以新 infoLevel 重新過 shouldBlockEvent
  - 簡化版：直接清 events（event sourcing 可從 owner cloud 重新 pull）

阻擋 P5-5: 是
```

### R4. 離線時 server 已降權但 local 仍可寫 future actions

```text
Description:
  員工離線，server 降權，但本地仍以舊 role 持有 future capability
  （operator 寫入互動、manager 寫入基本資料）。
  本地寫入後 queued，待上線時 push 被 server 拒絕。

Severity:  High（資料隔離風險 + UX 困擾）
Likelihood: Medium（取決於離線頻率與降權頻率）

Affected:  P5-5（operator 寫入開啟後才有效）

Mitigation:
  - 離線時禁止 staff write（fail-closed）
  - 或者：允許本地 write + 上線時由 server 拒絕 + 標記 user 訊息
  - P5-4 推薦前者（fail-closed）

阻擋 P5-5: 是
```

### R5. 離線時 server 已降權但 local 仍可讀 L2

```text
Description:
  員工離線，server 降權，本地仍持有 L2 投影，可讀到成本/利潤欄位。

Severity:  Medium（read-only 風險）
Likelihood: Medium

Affected:  P5-5

Mitigation:
  - 離線時以最近一次 known role 為準（無法解決）
  - 上線時立即偵測並清除 L2 投影
  - 或者：縮短 role cache TTL + 增加 polling 頻率

阻擋 P5-5: 否（搭配 R2 即可覆蓋上線後的補救）
```

### R6. 多 tab / 多裝置 role 不一致

```text
Description:
  tab A 已知新 role，tab B 仍持有舊 role。
  兩個 tab 看到不同資料。

Severity:  Low（短暫不一致；reload 後一致）
Likelihood: Low

Affected:  P5-5

Mitigation:
  - 各 tab 獨立 polling + reload 已足夠
  - 進階：BroadcastChannel 跨 tab 通知
  - P5-4 推薦延後到 P5-7+ 處理

阻擋 P5-5: 否
```

### R7. full Dexie wipe 造成 owner / staff 切換資料遺失或 UX 問題

```text
Description:
  useStaffStatusMonitor.handleRevoked 對 revoke 採用「deleteDatabase + reload」。
  若員工曾經也是 owner（在同裝置上切換），wipe 會清掉 owner 資料。

Severity:  Low（既有 bug；切換場景少見）
Likelihood: Low

Affected:  P5-5（既有 C3.6 流程）

Mitigation:
  - 既有 useStaffStatusMonitor 只在 isStaff session 啟用，不會清 owner 資料
  - 但 staff → owner 切換的清理是既有 bug，應另開 issue
  - P5-4 不處理此 bug

阻擋 P5-5: 否
```

### R8. 過度 aggressive wipe 造成離線可用性下降

```text
Description:
  降權時若採用 full wipe + reload，會打斷離線工作。
  員工可能正在離線狀態下查看市集，wipe 後要等 sync 才能看到資料。

Severity:  Medium（UX 風險）
Likelihood: Medium

Affected:  P5-5

Mitigation:
  - 降權 vs revoke 採不同策略：
    * revoke → full wipe（既有，保留）
    * 降權（operator/manager → viewer）→ re-sanitize 而非 wipe
  - 降權時不清 events / settings，只清 markets / products / dailyStats
    然後 trigger 重新 pull 重新以新 infoLevel 寫入
  - 或者：只 invalidateRoleCache + 觸發下次 pull
  - P5-4 推薦後者（invalidate + re-pull，不 wipe）

阻擋 P5-5: 是（必須區分降權 vs revoke）
```

### 4.1 風險總表

| ID | Description | Severity | Likelihood | 阻擋 P5-5 |
|----|-------------|----------|------------|------------|
| R1 | localStorage role cache 延遲 | Medium→High | High | 否（搭配 R4） |
| R2 | Dexie L2 projections 殘留 | Medium→High | High | ✅ 是 |
| R3 | events / dailyStats 殘留 | Medium | Medium | ✅ 是 |
| R4 | 離線 write future actions | High | Medium | ✅ 是 |
| R5 | 離線讀 L2 | Medium | Medium | 否（搭配 R2） |
| R6 | 多 tab / 多裝置 | Low | Low | 否 |
| R7 | staff → owner 切換 wipe | Low | Low | 否（既有 bug） |
| R8 | 過度 aggressive wipe | Medium | Medium | ✅ 是（區分降權 vs revoke） |

---

## 5. Candidate Strategies

本節評估 5 個候選策略。

### Strategy A：TTL-only

**描述**：完全依賴 `ROLE_CACHE_TTL_MS = 5 * 60 * 1000` 自然過期，不做任何額外清理。

**優點**：
- 零額外程式碼
- 零效能成本
- 既有機制已驗證穩定

**缺點**：
- 5 分鐘視窗內員工可繼續以舊 role 讀 L2 資料
- 在 P5-5 開啟 operator 寫入後，5 分鐘視窗內 operator 可繼續寫入（server 拒絕 + pending events 堆積）
- 不可接受

**判斷**：**❌ 不足**。必須搭配其他策略覆蓋 TTL 視窗內的寫入風險（R4）。

### Strategy B：invalidate role cache only

**描述**：在 role change（status / role 任一改變）後呼叫 `invalidateRoleCache()`，強制下次 mount 重新查 Supabase。**不動 Dexie**。

**優點**：
- 最小改動（只動 polling 邏輯）
- 既有 `invalidateRoleCache()` API 已存在
- 5 分鐘視窗可縮短到下一次 mount（通常 < 1 秒）

**缺點**：
- Dexie 內 L2 投影仍殘留
- 員工仍可用 DevTools 讀 IndexedDB 取得 L2 資料
- 必須搭配其他策略處理 Dexie

**判斷**：**🟡 部分足夠**。能覆蓋 UI 渲染的 role staleness，但不能覆蓋 Dexie 殘留（R2/R3）。

### Strategy C：on role downgrade, clear staff-owned local projections

**描述**：偵測 role / infoLevel 下降後，清 staff 視角的 Dexie projections（markets / products / events / dailyStats），然後要求重新 sync。

**子問題**：
- 要清哪些表？
  - 必須清：markets / products / dailyStats（含 L2 敏感投影）
  - 必須清：events（event stream 也可能含 L2 過濾前的事件）
  - 不可清：settings（用戶偏好）
  - 不可清：syncQueue（pending 事件要在下個 lifecycle 處理）
- 是否需保留 owner local data？
  - 員工 session 期間，Dexie 內的資料**都是 staff 視角**（owner 的 L3 投影在 staff session 不會被 pull）
  - 換言之：清 Dexie 不會影響 owner 資料
  - 除非：員工在同裝置先以 owner 身份登入過，再以 staff 登入（罕見）
- 如何避免誤清 owner 資料？
  - 在 staff session 內，Dexie 內資料都是 staff 投影 → 清掉是安全的
  - 若要更嚴謹，可加 `userRole.ownerId` 標記確保只清「這個 owner 的 staff 投影」

**優點**：
- 覆蓋 R2（markets / products 殘留）
- 覆蓋 R3（events / dailyStats 殘留）
- 比 full wipe 更精準（不影響 settings）
- 重新 pull 會以新 infoLevel 自動重新 sanitize

**缺點**：
- 需新增「role change 偵測」機制（useStaffStatusMonitor 需擴充）
- 需新增「Dexie partial clear」API（不能用既有 `resetAuthenticatedCache('full')`，因為它會清 sync cursors）
- 需新增「clear → re-pull」orchestration
- 仍需搭配 Strategy B（invalidateRoleCache）才能讓 UI 重新讀 role

**判斷**：**✅ 必要**。是 P5-4 核心策略。

### Strategy D：lock UI until role refresh / sync complete

**描述**：role stale 或偵測到 downgrade 時，先顯示 RoleLoadingFallback 或安全鎖定畫面，直到 role refresh + sync 完成。

**子問題**：
- 什麼情境需要 lock？
  - 偵測到 role downgrade 瞬間
  - 偵測到 role 從 owner 變 staff（罕見，但可能發生在「老闆把自己降為 viewer 測試」）
  - role stale + 嘗試 write action（R4 配套）
- 鎖定期間能做什麼？
  - 不可：執行任何 write action
  - 可：顯示「角色已變更，正在重新同步」訊息
  - 可：繼續讀取本地資料（但 UI 應提示資料即將過期）
- 鎖定多久？
  - 直到 `useUserRole` 重新查完 + `useSync` 重新 pull 完
  - 預期 < 5 秒
- 如何避免無限鎖定（網路斷時）？
  - 設定 timeout（例如 30 秒）
  - 超時後降級為「離線狀態 + 禁止 write」

**優點**：
- UX 明確：使用者知道「正在重新整理」
- 安全：鎖定期間所有 write 都被擋
- 與既有 `RoleLoadingFallback` 組件可共用設計語言

**缺點**：
- 需新增「lock」狀態管理（Zustand 或 React Context）
- 需擴充既有 `RoleLoadingFallback` 或新增 `RoleLockedScreen` 組件
- 與「降權時直接 wipe + reload」是 trade-off：
  - wipe + reload：UX 較差（白屏 → 首頁），但簡單
  - lock + refresh：UX 較好（顯示訊息），但需新增狀態管理

**判斷**：**🟡 推薦用於 P5-4 早期**。先做簡單版（wipe + reload）；P5-5 後再做 lock UI。

### Strategy E：write actions require fresh role

**描述**：所有 staff write actions 必須在執行前確認 role 是 fresh（不是來自 stale cache）。

**子問題**：
- 「fresh role」怎麼定義？
  - 定義 A：role 來自 Supabase query（在最近 N 秒內），不是 localStorage cache
  - 定義 B：role + infoLevel 與本地 Dexie 投影一致
  - 推薦 A（簡單 + 可測試）
- 怎麼實作？
  - 在 `recordEvent` 或 `useSync.sync()` 內加入 freshness check
  - 若 role stale → 拋出 `RoleStaleError` → UI 顯示「角色狀態已變更，請重新整理」
  - 或者：role stale → 自動 refresh role → 若 refresh 成功才執行 write
- 離線時的行為？
  - 定義 A：離線時無法 refresh role → role 視為 stale → 禁止 write（fail-closed）
  - 這正是 P5-4 推薦的「離線禁止 staff write」

**優點**：
- 從根本上解決 R4（離線 write future actions）
- 與既有 `recordEvent` 流程整合
- 失敗模式明確（RoleStaleError）

**缺點**：
- 需修改 `recordEvent` 與 `useSync.sync()` 的入口（這是 P5-4 必須做的）
- 需定義「fresh role」的具體時間視窗
- 離線時所有 staff write 會失敗（這是預期行為，但要 UI 明確告知）

**判斷**：**✅ 必要**。是 P5-4 核心策略，搭配 Strategy C 一起做。

### 5.1 候選策略總結

| 策略 | 覆蓋風險 | 推薦 |
|------|----------|------|
| A. TTL-only | R1（小部分） | ❌ 不足 |
| B. invalidate role cache only | R1, R6 | 🟡 必要但不足 |
| C. clear staff local projections | R2, R3, R5, R8 | ✅ 核心 |
| D. lock UI until resync | R1（短暫）, R4 | 🟡 推薦 P5-5 後再做 |
| E. write requires fresh role | R4 | ✅ 核心 |

**推薦組合**：B + C + E（D 延後）

---

## 6. Recommended Strategy

> **P5-4 Cursor 評估結果：同意 user 偏好的方向。**

### 6.1 短期 P5-4 推薦策略（Cursor 同意）

```text
1. 不依賴 TTL-only（策略 A）—— 不足
2. role 降權時必須 invalidate role cache（策略 B）
3. 偵測 infoLevel downgrade 時清 staff local projections（策略 C）
4. staff write actions 必須要求 fresh role（策略 E）
5. role stale / 離線時先 fail closed，不允許 staff write
6. P5-5 第一版不支援 offline staff write queue
```

### 6.2 不同意 user 偏好的部分

**無**。user 列出的 6 項全部同意，並補充以下細節：

```text
7. 區分降權（operator/manager → viewer）vs revoke（status='revoked'）：
   - 降權：invalidateRoleCache + clear staff projections + re-pull（精準清理）
   - revoke：保留既有 handleRevoked 流程（full wipe + reload）
8. 既有 useStaffStatusMonitor 擴充：
   - 在現有 status='active' count 查詢外，加上 role 欄位查詢
   - 比較上次 known role，若降權 → 觸發「降權清理」流程
   - 若 revoke（count=0）→ 觸發既有 handleRevoked 流程
9. P5-4 不實作 BroadcastChannel 跨 tab 通知（R6 延後到 P5-7+）
10. P5-4 不處理 staff → owner 切換的既有 bug（R7 另開 issue）
```

### 6.3 推薦策略的具體行為

| 情境 | 行為 |
|------|------|
| 員工在線，降權 | useStaffStatusMonitor 180s 內偵測到 role 改變 → invalidateRoleCache + 清 markets/products/events/dailyStats + 觸發 re-pull（infoLevel 會以新 role 計算） |
| 員工離線，降權 | local 仍持有 L2 投影；上線後 useStaffStatusMonitor 偵測到 → 觸發降權清理 |
| 員工在線，revoke | useStaffStatusMonitor 偵測到 count=0 → 既有 handleRevoked 流程（full wipe + reload） |
| 員工離線，revoke | 上線後 useStaffStatusMonitor 偵測到 → 既有 handleRevoked 流程 |
| 員工離線，嘗試 write | recordEvent 入口檢查 role freshness → 拋出 RoleStaleError 或自動 refresh → 失敗則禁止 write |
| 員工在線，但 role cache stale | 下次 mount 重新查 → 新 role 生效 |
| 升權（viewer → operator/manager） | TTL 過期後下次 mount 重新查 → 新 role 生效 + 下次 pull 自動升級 Dexie 投影 |

### 6.4 為什麼不推薦 lock UI（策略 D）

P5-4 階段推薦「wipe + reload」或「re-sanitize + re-pull」而非「lock UI」：

| 比較 | lock UI | wipe + reload | re-sanitize + re-pull |
|------|---------|---------------|----------------------|
| 實作成本 | 高（需新增狀態管理） | 低（既有） | 中（需新增 helper） |
| UX | 好（顯示訊息） | 差（白屏） | 中（短暫 loading） |
| 安全 | 最高 | 高 | 高 |
| 與既有整合 | 需新增組件 | 既有 handleRevoked | 需新增 helper |

**P5-4 推薦**：降權用 re-sanitize + re-pull（精準清理），revoke 沿用既有 handleRevoked（full wipe + reload）。
**P5-5 / P5-6 後**：可考慮加 lock UI 改善 UX。

---

## 7. Implementation Split

P5-4 實作拆成 6 個小階段。本階段（design）不實作，僅列出切分計畫。

### P5-4a：Downgrade Detection Audit / Helper Design

```text
範圍：
  - 擴充 useStaffStatusMonitor：除了查 status='active'，也查 role 欄位
  - 比較上次 known role，若有改變 → 觸發對應的清理流程
  - 新增 helper：getLastKnownRole() / setLastKnownRole()（localStorage 持久化）

風險等級：Yellow（既有 hook 擴充）
是否可自動做：是（user 批准即可）
是否需要人工 gate：是（需 user 確認擴充邏輯）
會碰哪些檔案：
  - hooks/useStaffStatusMonitor.ts（修改）
  - hooks/useUserRole.ts（可能新增 getLastKnownRole / setLastKnownRole）
  - 不可碰：其他
```

### P5-4b：Role cache invalidation design

```text
範圍：
  - 確認既有 invalidateRoleCache() / clearRoleCache() API 足夠
  - 設計降權觸發後的 invalidation timing
  - 設計 localStorage role cache 結構是否需擴充（含 known role 歷史）

風險等級：Green（API 已有）
是否可自動做：是
是否需要人工 gate：是
會碰哪些檔案：
  - hooks/useUserRole.ts（可能小幅擴充）
  - 不可碰：其他
```

### P5-4c：Dexie staff projection cleanup design

```text
範圍：
  - 新增 helper：clearStaffLocalProjections(userId) 
    精準清 markets / products / events / dailyStats（保留 settings / syncQueue）
  - 不影響 owner local data（在 staff session 內 Dexie 只有 staff 投影）
  - 觸發後：觸發 useSync 重新 pull

風險等級：Red（直接操作 Dexie）
是否可自動做：需 user 批准
是否需要人工 gate：是
會碰哪些檔案：
  - lib/db/clear-user-data.ts（新增 clearStaffLocalProjections helper）
  - hooks/useSync.ts（可能新增 trigger 重新 pull 的 API）
  - 不可碰：其他
```

### P5-4d：Role freshness gate design for future writes

```text
範圍：
  - 修改 recordEvent 入口：加入 role freshness check
  - 新增 helper：isRoleFresh() 判斷 role 是否來自 Supabase query
  - 新增 error class：RoleStaleError
  - 離線時自動視為 role stale

風險等級：Red（影響所有 staff write）
是否可自動做：需 user 批准
是否需要人工 gate：是
會碰哪些檔案：
  - lib/db/events.ts（修改 recordEvent 入口）
  - hooks/useSync.ts（可能新增 isRoleFresh helper）
  - 不可碰：其他
```

### P5-4e：UI lock / fallback design

```text
範圍：
  - 延後到 P5-5 / P5-6 後
  - 設計 RoleLockedScreen 組件
  - 設計 lock state（Zustand 或 React Context）
  - 整合 RoleLoadingFallback + 新 lock 狀態

風險等級：Red（UX 變更）
是否可自動做：否
是否需要人工 gate：是
會碰哪些檔案：
  - components/auth/RoleLoadingFallback.tsx（可能擴充）
  - 新增 components/auth/RoleLockedScreen.tsx
  - 不可碰：其他

備註：P5-4 不實作 P5-4e
```

### P5-4f：Tests plan

```text
範圍：
  - 設計測試計畫（不寫測試）
  - 至少涵蓋：
    1. role cache downgrade test
    2. infoLevel downgrade test
    3. Dexie projection cleanup test
    4. offline downgrade behavior test
    5. write action requires fresh role test
    6. owner local data not wiped test
    7. viewer → operator upgrade does not wipe unnecessarily test
    8. multi-tab stale role test（標記為 known limitation）
  - 輸出：tests/p5-4-downgrade-safety.test-plan.md

風險等級：Green（僅規劃）
是否可自動做：是
是否需要人工 gate：是
會碰哪些檔案：
  - tests/p5-4-downgrade-safety.test-plan.md（新增）
  - 不可碰：其他
```

### 7.1 切分順序建議

```text
P5-4a → P5-4b → P5-4c → P5-4d → P5-4f（先後順序）
P5-4e（延後到 P5-5 / P5-6 後）

每一階段都是獨立 commit + 獨立 audit + 獨立 push。
```

### 7.2 每一階段的 commit 訊息建議

```text
P5-4a: feat(staff): detect role downgrade in status monitor
P5-4b: refactor(staff): expose role cache invalidation lifecycle
P5-4c: feat(staff): clear staff local projections on downgrade
P5-4d: feat(staff): gate staff writes on role freshness
P5-4e: feat(staff): add role locked screen（延後）
P5-4f: test(staff): plan downgrade safety tests（僅規劃文件）
```

---

## 8. Required Tests Plan

P5-4 實作階段需設計的測試。本文件不寫測試，僅列出測試計畫。

### 8.1 role cache downgrade test

```text
目標：驗證 role 從 operator 變 viewer 後，localStorage role cache 被 invalidate
測試方式：
  - mock supabase：先回 operator，下次回 viewer
  - 觸發 useStaffStatusMonitor polling
  - 驗證 invalidateRoleCache() 被呼叫
  - 驗證 localStorage user_role_cache 被清掉
```

### 8.2 infoLevel downgrade test

```text
目標：驗證 infoLevel 從 2 變 0 後，Dexie L2 投影被清掉
測試方式：
  - 預先塞 L2 投影到 Dexie（markets 含 totalCost / totalProfit）
  - 觸發降權清理
  - 驗證 markets 表被清空（或 L2 欄位被移除）
  - 驗證 events 表被清空
  - 驗證 dailyStats 表被清空
  - 驗證 settings 表沒被清
```

### 8.3 Dexie projection cleanup test

```text
目標：驗證 clearStaffLocalProjections helper 正確運作
測試方式：
  - 預先塞測試資料到 Dexie
  - 呼叫 clearStaffLocalProjections(userId)
  - 驗證 markets / products / events / dailyStats 被清
  - 驗證 settings / syncQueue 沒被清
  - 驗證 owner 標記的資料沒被誤清
```

### 8.4 offline downgrade behavior test

```text
目標：驗證離線時 staff write 被擋
測試方式：
  - mock supabase 離線（fetch throw）
  - 模擬 role 從 operator 變 viewer（mock supabase 在線時）
  - 員工斷網
  - 員工嘗試 recordEvent
  - 驗證拋出 RoleStaleError
  - 驗證事件未被寫入 Dexie（或被標記為 pending 但有 stale 標記）
```

### 8.5 write action requires fresh role test

```text
目標：驗證 staff write 必須有 fresh role
測試方式：
  - localStorage role cache 有 stale 資料（timestamp 超過 N 秒）
  - 員工嘗試 recordEvent
  - 驗證拋出 RoleStaleError
  - 驗證自動 refresh role 機制被觸發
  - 驗證 refresh 成功後 write 可繼續
```

### 8.6 owner local data not wiped test

```text
目標：驗證降權清理不會影響 owner local data
測試方式：
  - 預先塞 owner 標記的資料到 Dexie
  - 觸發 staff session 降權清理
  - 驗證 owner 標記的資料沒被清
```

### 8.7 viewer → operator upgrade does not wipe unnecessarily test

```text
目標：驗證升權不會清掉 Dexie 資料
測試方式：
  - 預先塞 viewer 期間的 L0 投影到 Dexie
  - 模擬升權為 operator
  - 驗證 Dexie 資料沒被清
  - 驗證下次 pull 自動 upgrade 為 L2 投影
```

### 8.8 multi-tab stale role test

```text
目標：驗證多 tab 場景下 role 不一致
測試方式：
  - 兩個 tab 各自載入
  - 一個 tab 觸發降權清理
  - 驗證另一個 tab 是否能偵測到（Known limitation：暫不支援）
  - 驗證另一個 tab 自己的 polling 仍會在 180s 內觸發

備註：P5-4 不實作跨 tab 通知，僅記錄 known limitation
```

### 8.9 整合測試建議

```text
- 既有 tests/role-fail-closed.test.ts（18 個）→ 仍全綠
- 既有 tests/permission-gate.test.ts（47 個）→ 仍全綠
- 既有 tests/permission-gate.integration.test.ts（21 個）→ 仍全綠
- 既有 tests/role-mode.test.ts → 仍全綠
- 既有 tests/role-capabilities.test.ts（25 個）→ 仍全綠
- 新增 tests/role-cache-downgrade.test.ts（P5-4a/b 階段）
- 新增 tests/dexie-projection-cleanup.test.ts（P5-4c 階段）
- 新增 tests/role-freshness-gate.test.ts（P5-4d 階段）
- 新增 tests/offline-write-fail-closed.test.ts（P5-4d 階段）
- 既有 tests/staff-event-preflight.test.ts → 仍全綠
```

---

## 9. Open Questions

需要 user 決策的問題。

### Q1. P5-5 是否允許 staff offline write？

```text
選項：
  A. 禁止（fail-closed）—— P5-5 推薦
  B. 允許本地 write + 上線時由 server 拒絕 + 顯示 user 訊息
  C. 允許本地 write + 上線時自動 revalidate + 自動修正

推薦：A（最安全、最簡單）
```

### Q2. 降權是否要 full Dexie wipe，還是只清 staff projections？

```text
選項：
  A. Full wipe（既有 handleRevoked 行為）
  B. 只清 staff projections（精準清理；P5-4 推薦）
  C. 不清，僅 invalidateRoleCache + 重新 pull（依賴 PermissionGate 重新 sanitize）

推薦：B（精準；保留 settings）
```

### Q3. role cache TTL 是否從 5 分鐘縮短？

```text
選項：
  A. 維持 5 分鐘（搭配 invalidateRoleCache + freshness gate）
  B. 縮短到 60 秒
  C. 縮短到 30 秒
  D. 改用「stale-while-revalidate」：cache 立即可用，但背景 refresh

推薦：A 或 D
  - A：簡單，搭配 invalidateRoleCache 已足夠覆蓋已知降權
  - D：UX 最佳但需設計背景 refresh
```

### Q4. role change 後是否要通知 staff？

```text
選項：
  A. 不通知（依賴下次 mount 自動更新）
  B. Toast 通知（owner 改完後，員工下次打開 app 看到）
  C. Banner 提示（員工登入後看到「你的權限已變更」）
  D. 強制 reload（既有 handleRevoked 行為）

推薦：C（員工登入時顯示 banner，5 秒後自動消失）
  - B 也可以，但需在 polling 命中時觸發
```

### Q5. 是否要做 toast / banner / forced reload？

```text
- P5-4 不做 UI 改動
- 降權觸發後，由 useStaffStatusMonitor 觸發 reload（既有 handleRevoked 行為）
- P5-4c 階段新增「re-sanitize + re-pull」路徑（不 reload，而是 in-place 重新整理）
- P5-5 / P5-6 後可考慮加 banner 通知
```

### Q6. 多 tab 是否需要 BroadcastChannel？

```text
選項：
  A. 不做（每 tab 獨立 polling + reload；P5-4 推薦）
  B. 做（跨 tab 立即同步）

推薦：A（簡單，UX 略差但可接受）
  - 多 tab 場景罕見
  - 每 tab 獨立 polling 已能在 180s 內同步
```

### Q7. useStaffStatusMonitor 擴充後的 polling 成本？

```text
現有：每 180s 一次 count where staff_id, owner_id, status='active'（極輕量）
擴充後：需多查 role 欄位（count 變 select role，傳輸量微增）

成本評估：
  - select role 而非 count：傳輸量從 < 100 bytes 變 < 200 bytes（微增）
  - 索引走 (staff_id, status) 複合索引，已涵蓋 role 查詢
  - DB CPU 增加 < 5%

結論：可接受
```

### Q8. role freshness 視窗應為多長？

```text
選項：
  A. 30 秒（太短，可能誤判網路慢的情況）
  B. 5 分鐘（與現有 TTL 一致）
  C. 與 polling 間隔一致（180 秒）

推薦：C（與 polling 間隔一致）
  - 超過 180 秒未 refresh → role 視為 stale → 禁止 staff write
  - polling 命中後自動 refresh → role 視為 fresh
```

### Q9. 既有 C3.6 useStaffStatusMonitor 流程是否要區分降權 vs revoke？

```text
選項：
  A. 是（降權用精準清理，revoke 用 full wipe；P5-4 推薦）
  B. 否（兩者都用 full wipe）

推薦：A
  - 降權：operator/manager → viewer，員工仍是員工，只是 role 降了
  - revoke：status='revoked'，員工不再是員工
  - 兩者處理邏輯應不同
```

### Q10. staff → owner 切換的 Dexie 清理是否屬於 P5-4？

```text
P5-4 評估：否
  - 既有 C3.6 流程僅在 isStaff session 啟用
  - staff → owner 切換時，Dexie 內的 staff 投影可能殘留
  - 但這是既有 bug，與 P5-4 降權情境不同
  - 應另開 issue

備註：P5-4c 的 clearStaffLocalProjections helper 設計時應考慮未來
     「staff → owner 切換」也呼叫此 helper
```

---

## 10. Recommendation / Gate

### 10.1 P5-5 operator interaction 是否可在 P5-4 實作前開始？

**❌ 否**。P5-4 必須先有設計審查 + 實作完成，P5-5 才能開始。

理由：
1. P5-1 §R8 明確指出 P5-5b MUST NOT ship before P5-4
2. R2（R3 / R4 / R8）阻擋 P5-5（operator 寫入開啟後會觸發這些風險）
3. 沒有 P5-4 的降權保護，operator 一旦被降權，繼續以舊 role 寫入會污染資料

### 10.2 P5-4 是否需要先做 design review？

**✅ 是**。本文件是 design review 的一部分。User 需明確批准以下幾點：

```text
1. 同意 §6 推薦策略（invalidate + clear staff projections + write freshness gate）
2. 同意 §7 實作切分（P5-4a/b/c/d/f；P5-4e 延後）
3. 回答 §9 Open Questions 至少 Q1 / Q2 / Q3 / Q8
4. 確認 P5-4 不實作 §0.2 列出的禁止事項
5. 確認 P5-4 不修既有 limit(1) ambiguity（R9）
```

### 10.3 哪一個風險是 P5-5 hard blocker？

**R2 + R3 + R4 + R8** 是 P5-5 hard blocker：

```text
R2: 降權後 Dexie L2 projections 殘留
  → 員工降權後仍可讀 L2 資料（DevTools / 程式層級）
  → operator 寫入開啟後，這個殘留資料可能繼續被消費

R3: 降權後 events / dailyStats 殘留
  → 員工降權後仍可讀 L2 events / stats
  → 與 R2 同性質

R4: 離線時 server 已降權但 local 仍可寫 future actions
  → 這是 P5-5 operator 寫入的核心風險
  → 必須有 write freshness gate 才能開啟 operator 寫入

R8: 過度 aggressive wipe 造成離線可用性下降
  → 區分降權 vs revoke 是必要設計
  → 不解決此項，P5-4 實作可能採錯誤策略（統一 wipe）
```

**緩解順序建議**：
```text
P5-4a → P5-4b：先解決 R1 + R6（偵測 + invalidate）
P5-4c：解決 R2 + R3 + R5 + R8（Dexie 精準清理）
P5-4d：解決 R4（write freshness gate）
P5-4f：測試計畫
```

### 10.4 下一步應該是 P5-4a 還是先修既有 limit(1) ambiguity？

**P5-4a**。理由：

```text
1. limit(1) ambiguity 是 R9 既有 bug
2. R9 severity=Medium, likelihood=Low
3. P5-1 文件明確指出「R9 mitigation 應另開 design / bugfix，不應混入 P5-x」
4. P5-4a 是 P5-4 實作的第一階段，符合 P5 系列時程
5. limit(1) bug 可在 P5-4 全部完成後，或與 P5-7 一起處理
```

### 10.5 最終 gate 決策表

| 階段 | 是否可開始 | 條件 |
|------|------------|------|
| P5-4a | ✅ 是 | user 批准本 P5-4 設計文件 |
| P5-4b | ✅ 是 | P5-4a 通過 post-implementation audit |
| P5-4c | ✅ 是 | P5-4b 通過 post-implementation audit |
| P5-4d | ✅ 是 | P5-4c 通過 post-implementation audit |
| P5-4e | ⏸ 延後 | P5-5 / P5-6 後再評估 |
| P5-4f | ✅ 是 | 與 P5-4a-d 並行；僅文件 |
| P5-5 | ❌ 否 | P5-4a + P5-4b + P5-4c + P5-4d + P5-4f 全部完成 + audit 通過 |
| P5-6 | ❌ 否 | P5-5 通過 + audit |
| P5-7 | ❌ 否 | P5-5 + P5-6 通過 + audit |
| 修 limit(1) | ⏸ 獨立 | 另開 design / bugfix |

---

## 11. Change Log

```text
v0.1  2026-06-19  P5-4 initial design
                - Author: Cursor (kl-4ndroid 委託)
                - Scope: Sync / Dexie downgrade safety design
                - 包含：現有機制 audit、降權情境、8 個風險分級、5 個候選策略、6 階段實作切分
                - 不在範圍：runtime 實作、UI 改動、migration、P5-5+ 設計
                - 硬規則：P5-1 §R8（Offline write after role change）+ §R10（Owner not in StaffRole enum）+ §R11（helper duplication）
                - 後續：等待 user review + 批准 P5-4a

v0.2  2026-06-19  P5-4a: Downgrade Detection 設計
                - Author: Cursor (kl-4ndroid 委託)
                - Scope: 在 useStaffStatusMonitor 內新增 role downgrade 偵測
                - 變更：
                  * hooks/useStaffStatusMonitor.ts
                    - 新增 localStorage key: 'staff_status_monitor_known_role'
                    - 新增 STAFF_ROLE_RANK + classifyStaffRoleChange 純 helper
                    - 新增 readInfoLevelFromPermissions 純 helper
                    - 新增 readKnownRoleCache / writeKnownRoleCache 純 helper
                    - 新增 handleRoleChangeDetection 純 helper
                      （含 persist / onDowngrade / logger callback 注入點）
                    - checkStaffStatus 從 head:true 改為
                        .select('role, permissions', { count: 'exact' })
                      保留 .limit(1) 與既有三個 .eq 條件
                    - count === 0 → handleRevoked('poll') 既有流程完全不變
                - 新增：tests/p5-4a-downgrade-detection.test.ts（49 個 case 全綠）
                - 不變更：
                  * hooks/useUserRole.ts（保持零耦合）
                  * hooks/useSync.ts
                  * lib/permissions/PermissionGate.ts
                  * lib/permissions/role-fail-closed.ts
                  * lib/permissions/role-capabilities.ts
                  * lib/db/*
                  * lib/supabase/*
                  * components/*
                  * app/*
                  * types/*
                  * supabase/migrations/*
                - 不變更行為：
                  * canEdit
                  * canViewSensitiveData
                  * infoLevel 推導（deriveSafeInfoLevel）
                  * handleRevoked revoke 流程（full wipe + reload）
                  * useSync / Dexie
                - downgrade path 不呼叫：
                  * resetAuthenticatedCache
                  * deleteDatabase
                  * window.location.href
                  * clearUserData
                - downgrade path 只做：
                  * invalidateRoleCache()
                  * 寫入 knownRoleCache baseline
                  * console.warn 記錄
                - 不接 UI / 不新增 callback / 不改 public API
                - 不修 limit(1) ambiguity（屬 R9 既有 bug）
                - 不開 operator / manager 寫入（屬 P5-5+）
                - 後續：等待 user review + 批准 P5-4b

v0.3  2026-06-19  P5-4b: Role Cache Invalidation Revalidate
                - Author: Cursor (kl-4ndroid 委託)
                - Scope: 讓 invalidateRoleCache 通知已 mounted useUserRole
                - 變更：
                  * hooks/useUserRole.ts
                    - 新增 ROLE_CACHE_INVALIDATED_EVENT constant:
                        'boothbook:role-cache-invalidated'
                    - 新增 dispatchRoleCacheInvalidatedEvent() 內部 helper
                      （SSR 守衛 + try/catch）
                    - 新增 subscribeToRoleCacheInvalidation() exported helper
                      （SSR 守衛 + 回傳 unsubscribe function）
                    - invalidateRoleCache() 仍清 localStorage，額外 dispatch event
                    - 抽出 loadUserRole 為 stable function（從 useEffect 內部 closure）
                    - 新增第二個 useEffect 監聽 invalidation event
                      * 收到 event 後觸發 revalidate
                      * revalidationInFlightRef 防止重複查詢
                    - 既有 useEffect [user] 行為完全不變
                    - 既有 fail-closed catch 行為完全不變
                    - 既有 canEdit / canViewSensitiveData / isOwner 行為完全不變
                    - deriveRolePermissions / deriveSafeInfoLevel 行為完全不變
                - 新增：tests/p5-4b-role-cache-invalidation.test.ts
                  （27 個 case 全綠）
                - 不變更：
                  * hooks/useStaffStatusMonitor.ts（P5-4a 已呼叫 invalidateRoleCache；
                    P5-4b 從 invalidateRoleCache 內部擴充，不動 monitor）
                  * hooks/useSync.ts
                  * hooks/useStaffPermissions.ts
                  * lib/permissions/PermissionGate.ts
                  * lib/permissions/role-fail-closed.ts
                  * lib/permissions/role-capabilities.ts
                  * lib/db/*
                  * lib/supabase/*
                  * components/*
                  * app/*
                  * types/*
                  * supabase/migrations/*
                - 不變更行為：
                  * canEdit
                  * canViewSensitiveData
                  * infoLevel 推導（deriveSafeInfoLevel）
                  * PermissionGate 脫敏
                  * role-fail-closed fail-closed 規則
                  * useSync / Dexie
                  * 既有 revoke 流程
                  * 既有 owner profile 查詢
                - 不做的事：
                  * 不清 Dexie
                  * 不 reload
                  * 不接 UI
                  * 不新增 callback
                  * 不新增 React Context / global store
                  * 不修 limit(1) ambiguity
                  * 不開 operator / manager 寫入
                  * 不使用 storage event
                  * 不使用 BroadcastChannel
                - P5-4b 純靠：
                  * boothbook:role-cache-invalidated custom event
                - revalidate 期間 fail-closed：
                  * setIsLoading(true) → deriveSafeInfoLevel 自動回傳 0
                  * useSync enabled 變 false（sync-context.tsx line 52）
                  * canEdit / canViewSensitiveData / isOwner 全 false
                - revalidate 失敗走既有 fail-closed catch
                - 後續：等待 user review + 批准 P5-4c
```
