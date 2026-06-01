# 角色存取模型（Role Access Model）

> 文件版本：2026-06-01 v3
> 用途：記錄目前老闆 / 員工角色系統的設計意圖與已知技術債，供後續修正參照。

---

## 1. 角色來源

### 1.1 遠端事實來源：Supabase

- **資料表**：`staff_relationships`
- **查詢条件**：`staff_id = <current_user_id> AND status = 'active'`
- 若有一筆符合記錄 → 身份為 **staff**，並取得 `owner_id`、`owner_email`、`permissions`
- 若無符合記錄 → 身份為 **owner**

### 1.2 前端唯一角色判斷來源：`useUserRole()`

```ts
// hooks/useUserRole.ts
export function useUserRole(): {
  userRole: UserRole;      // { isStaff, ownerId, ownerEmail, permissions }
  isStaff: boolean;
  isOwner: boolean;
  canEdit: boolean;        // 目前硬編碼為 !isStaff
  canViewSensitiveData: boolean; // 目前硬編碼為 !isStaff
  isLoading: boolean;
}
```

**原則**：`useUserRole()` 是 UI 層和同步 Context 層的單一角色來源，任何需要判斷身份的程式碼應呼叫此 hook，而非直接讀取其他來源。

### 1.3 同步層的角色來源：SyncProvider 傳入的 roleMode

- **類型**：`RoleMode = 'owner' | 'staff'`（`lib/auth/role-mode.ts`）
- **取值方式**：`resolveRoleMode(userRole)`
- **傳入**：`SyncProvider` → `useSync({ roleMode })`
- **Phase 6A-1 完成**：同步路徑已完全由 `roleMode` 決定，不再 fallback 到 `feature_staff_mode`

### 1.4 角色快取

- **位置**：`localStorage['user_role_cache']`
- **TTL**：5 分鐘（`ROLE_CACHE_TTL_MS = 5 * 60 * 1000`，Phase 5B-1 修正）
- **內容**：`{ userId, role: UserRole, timestamp }`
- **觸發清除**：
  - 登出時（`clearRoleCache()`）
  - 接受員工邀請成功後（`invalidateRoleCache()`，Phase 5B-2）
- **風險**：員工被老闆移除後，最長 5 分鐘內員工端仍保持員工身份（已從 24 小時縮短，但仍存在）
- **待設計**：員工被移除後的即時失效機制（`revokeStaff` / `removeStaff` service 中尚未呼叫 `invalidateRoleCache()`）

---

## 2. 身份種類定義

| 身份 | 判斷條件 | ownerId 來源 | 備註 |
|---|---|---|---|
| **owner**（老闆） | `staff_relationships` 無 `staff_id = user.id` 且 `status = 'active'` 的記錄 | `user.id`（本人） | 預設身份 |
| **staff**（員工） | `staff_relationships` 有 `staff_id = user.id` 且 `status = 'active'` 的記錄 | `userRole.ownerId`（老闆的 user.id） | 員工只能看到一個老闆的資料（目前一次只能是一個老闆的員工）|
| **unauthenticated**（未登入） | `user` 為 `null` | 無 | |
| **offline-with-local-data**（離線有本地資料） | IndexedDB 有本地資料但 Supabase 無法驗證 | 依本地快取的身份 | 目前無專門處理，會 fallback 為 owner 或 staff 取決於快取 |

---

## 3. ownerId 決策規則

所有資料查詢統一使用：

```ts
const currentOwnerId = isStaff ? userRole.ownerId : user?.id;
```

| 身份 | currentOwnerId | 查詢範圍 |
|---|---|---|
| owner | `user.id` | 本人的市集、本人的商品、本人的統計 |
| staff | `userRole.ownerId` | 老闆的市集、老闆的商品（唯讀）|
| unauthenticated | `undefined` | 無法查詢任何有所有權的資料 |

### 3.1 目前實作位置

- `app/page.tsx`
- `app/markets/page.tsx`
- `lib/db/hooks.ts`（`useMarkets()`、`useMonthlyStats()`）

### 3.2 安全邊界說明

> ⚠️ **重要**：前端 `ownerId` 過濾是 UI 顯示邏輯，不是安全邊界。
>
> - IndexedDB 資料的 `owner_id` 欄位篩選，只防止錯誤顯示，不防止資料存取。
> - 真正安全依賴 **Supabase RLS（Row Level Security）** 和 **RPC 權限驗證**。
> - 前端從不應該作為安全防護的最後一道防線。

---

## 4. 員工可做與不可做事項

### 4.1 目前權限矩陣

| 動作 | 目前實作 | 依據 |
|---|---|---|
| 查看市集列表 | ✅ 可 | `ownerId` 過濾 |
| 查看市集詳情 | ✅ 可 | 所有頁面未限制 |
| 記錄互動 | ✅ 可 | UI 無鎖 |
| 記錄成交 | ✅ 可 | UI 無鎖 |
| 查看商品列表 | ✅ 可 | `ownerId` 過濾 |
| 編輯市集 | ❌ 不行 | `canEdit = !isStaff` 硬鎖 |
| 刪除市集 | ❌ 不行 | UI 無操作入口 |
| 編輯商品 | ❌ 不行 | `canEdit = !isStaff` 硬鎖 |
| 刪除商品 | ❌ 不行 | UI 無操作入口 |
| 新增市集 | ❌ 不行 | UI 無操作入口 |
| 新增商品 | ❌ 不行 | UI 無操作入口 |
| 查看成本（商品成本、市集成本）| ❌ 不行 | `SensitiveDataMask` DOM 遮罩 |
| 查看利潤 | ❌ 不行 | `SensitiveDataMask` DOM 遮罩 |
| 查看月收入統計 | ❌ 不行 | `SensitiveDataMask` DOM 遮罩 |
| 管理員工（新增/移除/編輯）| ❌ 不行 | UI 無操作入口 |
| 同步資料 | ✅ 可 | SyncProvider 無身份限制 |
| 接受老闆的員工邀請 | ✅ 可 | `/join` 頁面 |

### 4.2 `permissions` 欄位未生效

`staff_relationships.permissions` 結構如下：

```ts
type StaffPermissions = {
  can_view: boolean;
  can_edit: boolean;
};
```

此欄位已存在於資料庫，但目前 `useUserRole()` 的回傳值 `canEdit` 硬編碼為 `!isStaff`，完全繞過了 `permissions.can_edit`。

**設計意圖**：老闆可以針對不同員工給予不同權限（僅查看 / 可編輯）。
**目前狀態**：尚未實作，`can_edit` 永遠被忽略。

---

## 5. 敏感資料定義

### 5.1 敏感欄位清單

```ts
const SENSITIVE_FIELDS = {
  product:    ['cost', 'profit_margin', 'supplier_info'],
  market:     ['total_cost', 'net_profit', 'profit_margin'],
  deal:       ['cost', 'profit', 'profit_margin'],
  event:      ['cost', 'total_cost'],
  stats:      ['total_cost', 'net_profit', 'profit_margin', 'cost_breakdown'],
};
```

### 5.2 目前遮罩機制

| 機制 | 實作位置 | 說明 |
|---|---|---|
| DOM 元件替換 | `components/staff/SensitiveDataMask.tsx` | 直接在 UI 層用 Lock/EyeOff icon 替換內容 |
| 資料層脫敏 | `lib/data-sanitization.ts` | `sanitizeObject()` / `sanitizeArray()` 定義了但**幾乎沒有任何地方呼叫** |

### 5.3 風險

- 敏感資料遮罩目前只在 **DOM 層** 執行，攻擊者仍可透過 DevTools 或 API 攔截取得原始資料。
- `data-sanitization.ts` 定義完整但閒置，應評估將其整合至資料流向的源頭。
- **真正保護敏感資料的防線是 Supabase RLS**，前端遮罩只是 UX 手段。

---

## 6. 同步模式（Phase 6A 完成）

### 6.1 同步流程架構

```
SyncProvider
  └─ useSync({ enabled: !!user && isConfigured, roleMode })
       └─ roleMode === 'staff'  → pullEventsFromViews()
       │    從 staff_accessible_markets/products/events 視圖拉資料
       │    用 access_type 和 relationship_owner_id 過濾
       └─ roleMode === 'owner' → pullEventsWithSnapshot()
            使用快照 + 增量事件（老闆路徑）
```

### 6.2 Phase 6A 完成摘要

| 變更 | 狀態 |
|---|---|
| Phase 6A-1：`useSync.ts` 移除 `feature_staff_mode` fallback | ✅ 已完成 |
| Phase 6A-2：`app/join/page.tsx` 移除 `enableStaffMode()` 呼叫 | ✅ 已完成 |
| Phase 6A-2：`role-mode.ts` 移除 `deriveSyncStaffMode()` | ✅ 已完成 |
| Phase 6A-2：`feature-flags.ts` | 保留（`enableStaffMode()` 仍被 `LoginModal` 和 `StaffInvitationDialog` 使用）|

### 6.3 `feature_staff_mode` 殘留說明

`lib/db/feature-flags.ts` 中的 `enableStaffMode()` 仍被以下元件呼叫：
- `components/auth/LoginModal.tsx`
- `components/staff/StaffInvitationDialog.tsx`

這 2 個元件屬於 `components/` 層，不在 Phase 6A 清理範圍內。待 `LoginModal` 和 `StaffInvitationDialog` 的 UI 需求確認後，可視需求移除其 `enableStaffMode()` 呼叫。

`feature_staff_mode` 殘留寫入點：
- `enableStaffMode()` — 寫入 `localStorage['feature_staff_mode'] = 'true'`
- `disableStaffMode()` — 移除 key（目前無任何 consumer 呼叫）
- `toggleStaffMode()` — toggle（目前無任何 consumer 呼叫）

`isStaffModeEnabled()` — 目前無任何 consumer（`useSync` fallback 已移除）。

| 情境 | useUserRole | feature_staff_mode | 結果 |
|---|---|---|---|
| 老闆已接受員工邀請，但從未開過員工模式 | `isStaff = true` | `false` | UI 顯示員工介面，但同步走老闆路徑（快照）→ 可能失敗 |
| 員工已關閉 feature_staff_mode | `isStaff = true` | `false` | UI 顯示員工介面，但同步走老闆路徑 → 資料錯誤 |
| 老闆故意關閉 feature_staff_mode | `isStaff = false` | `false` | 一致，OK |
| 員工啟用 feature_staff_mode | `isStaff = true` | `true` | 一致，OK |

**根本問題**：`feature_staff_mode` 應由 `useUserRole().isStaff` 推導，而非獨立的 localStorage flag。

---

## 7. Phase 6A 完成狀態

### 7.1 變更摘要

| 檔案 | 變更 |
|---|---|
| `hooks/useSync.ts` | 移除 `isStaffModeEnabled` import；`effectiveStaffMode` 改為 `roleMode === 'staff'` |
| `app/join/page.tsx` | 移除 `enableStaffMode()` 呼叫，保留 `invalidateRoleCache()` |
| `lib/auth/role-mode.ts` | 移除 `deriveSyncStaffMode()`；移除所有 `feature_staff_mode` 相關 comments |
| `lib/db/feature-flags.ts` | 保留（`enableStaffMode` 仍被 UI 元件使用）|

### 7.2 殘留說明

- `enableStaffMode()` 寫入 `localStorage['feature_staff_mode'] = 'true'`，被 `LoginModal` 和 `StaffInvitationDialog` 呼叫
- `isStaffModeEnabled()` 無任何 consumer，但檔案保留以避免破壞 UI 元件編譯
- `disableStaffMode()` 和 `toggleStaffMode()` 無任何 consumer，純 dead code

---

## 8. StaffManagement 與 staff service 雙軌問題

### 8.1 現況

| 操作 | `lib/supabase/staff.ts`（service）| `components/settings/StaffManagement.tsx`（直接操作）|
|---|---|---|
| 查詢員工列表 | `getMyStaff()` 使用 RPC `get_my_staff` | 直接查 `staff_relationships` + `profiles` |
| 邀請員工 | `inviteStaff()` | 直接 `supabase.from('staff_relationships').insert()` |
| 接受邀請 | `acceptInvitation()` | 直接 `supabase.from('staff_relationships').update()` |
| 移除員工 | `revokeStaff()` / `deleteStaffRelationship()` | 直接 `supabase.from('staff_relationships').delete()` |

### 8.2 問題

- 元件完全繞過 service，程式碼重複且維護困難。
- 未來若 `staff_relationships` schema 變更，需同步修改兩處。
- 元件直接組裝 SQL 查詢邏輯，違反關注點分離原則。

### 8.3 修正方向

StaffManagement.tsx 應逐步收斂至呼叫 `lib/supabase/staff.ts` 的 service 函式，每次只搬遷一個操作。

---

## 9. delete vs revoked 未統一問題

### 9.1 現況

`lib/supabase/staff.ts` 提供兩種移除員工的方式：

| 函式 | 語意 | 實作 |
|---|---|---|
| `revokeStaff(relationshipId)` | **軟刪除**（撤銷）| `UPDATE status = 'revoked'` |
| `deleteStaffRelationship(relationshipId)` | **物理刪除** | `DELETE FROM staff_relationships` |

`components/settings/StaffManagement.tsx` 目前使用 **`delete`**（物理刪除），不使用 `revoke`。

### 9.2 語意差異

| 語意 | 優點 | 缺點 |
|---|---|---|
| **revoke（軟刪除）** | 可保留歷史紀錄、可稽核、被撤銷的員工可重新接受邀請 | 資料庫留存、隱私考量 |
| **delete（物理刪除）** | 資料庫乾淨、隱私合規 | 無法稽核、員工重新接受需重新建立關係記錄 |

### 9.3 已確認決策

> ✅ **已確認（2026-06-01）**：移除員工的長期語意採用 **`revoke`**（軟刪除）。
>
> - 將 `staff_relationships.status` 設為 `'revoked'`，保留審計紀錄。
> - 被撤銷的員工日後若重新被同一老闆邀請，透過 `acceptInvitation()` 重新啟用關係，無需重建記錄。
> - `StaffManagement.tsx` 的移除邏輯將在 Phase 4 收斂至 service 時一併修正。

### 9.4 修正方向

Phase 4 將修改 `StaffManagement.tsx` 的 `handleRemove()`，由直接呼叫 `supabase.from('staff_relationships').delete()` 改為呼叫 `revokeStaff(relationshipId)`。

---

## 10. 後續修正路線

### Phase 1（本文件）
建立角色存取模型文件，確認設計語意。

### Phase 2：新增角色模式解析 helper ✅（已完成）
- 新增 `lib/auth/role-mode.ts`
- 實作 `resolveRoleMode(userRole): 'owner' | 'staff'`
- `deriveSyncStaffMode()` 已於 Phase 6A-2 移除

### Phase 3：SyncProvider 接入角色語意 ✅（已完成）
- `useSync()` 接收由 `useUserRole()` 推導的角色參數
- 同步層不再直接讀取 `feature_staff_mode`
- **不重寫** `useSync` 整體演算法

### Phase 4：收斂 StaffManagement 至 service 層
- 查詢員工列表 → 改用 `getMyStaff()`
- 邀請員工 → 改用 `inviteStaff()`
- 移除員工 → **先確認語意**（revoke 或 delete）

### Phase 5：角色快取 TTL 優化（Phase 5B-1、5B-2 已完成）

#### Phase 5A：分析與設計 ✅（已完成）
- 評估 TTL 縮短的 UX 影響
- 確認 `feature_staff_mode` fallback 的必要性

#### Phase 5B-1：縮短 TTL + 新增失效 API ✅（已完成）
- TTL 從 24 小時縮短至 5 分鐘（`ROLE_CACHE_TTL_MS = 5 * 60 * 1000`）
- 新增 `invalidateRoleCache()` export

#### Phase 5B-2：接受邀請後失效快取 ✅（已完成）
- `app/join/page.tsx` 的 `handleAcceptInvitation()` 在成功後呼叫 `invalidateRoleCache()`

#### Phase 5B-3：移除員工後失效快取（待執行）
- 老闆端無法直接清除員工裝置上的 localStorage role cache，員工被移除後的即時失效仍需另行設計
- 目前靠 5 分鐘 TTL 降低風險，最長 5 分鐘後員工端角色會自動失效
- 未來可考慮以下方向：
  - Supabase Realtime 監聽 `staff_relationships` 變化並推送失效訊息
  - 同步時收到 permission error 後觸發角色重新驗證
  - 其他 client-side role revalidation 機制

### Phase 6：建立安全驗證清單（Phase 6A 已完成）

#### Phase 6A：清理 feature_staff_mode fallback ✅（已完成）

| 項目 | 狀態 |
|---|---|
| Phase 6A-1：`useSync.ts` 移除 `isStaffModeEnabled` fallback | ✅ 已完成 |
| Phase 6A-2：`app/join/page.tsx` 移除 `enableStaffMode()` | ✅ 已完成 |
| Phase 6A-2：`role-mode.ts` 移除 `deriveSyncStaffMode()` | ✅ 已完成 |
| Phase 6A-2：清理 `feature_staff_mode` 相關文件 | ✅ 已完成 |
| Phase 6A-2：刪除 `feature-flags.ts` | ⏸️ 擱置（`enableStaffMode` 仍被 `LoginModal` / `StaffInvitationDialog` 使用）|

#### Phase 6B：清理 `enableStaffMode` 殘留呼叫（待執行）
- 評估並移除 `components/auth/LoginModal.tsx` 的 `enableStaffMode()` 呼叫
- 評估並移除 `components/staff/StaffInvitationDialog.tsx` 的 `enableStaffMode()` 呼叫
- 確認移除後是否影響 UI 流程
- 確認後刪除 `lib/db/feature-flags.ts`
- 驗證敏感資料在 API 層的保護
- 確認 `revoke` 語意落地（`staff_relationships.status = 'revoked'` 而非物理刪除）

---

## 附錄：關鍵檔案索引

| 檔案 | 角色 |
|---|---|
| `hooks/useUserRole.ts` | **核心**：唯一前端角色判斷來源 |
| `hooks/useSync.ts` | 同步引擎，角色由 `roleMode` 參數決定（Phase 6A-1） |
| `lib/db/feature-flags.ts` | `feature_staff_mode` 讀寫，`enableStaffMode` 仍被 UI 元件呼叫 |
| `lib/auth/role-mode.ts` | `resolveRoleMode()` 單一入口，`deriveSyncStaffMode` 已移除 |
