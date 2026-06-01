# 角色存取模型（Role Access Model）

> 文件版本：2026-06-01
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

### 1.3 同步層的輔助開關：`feature_staff_mode`

- **儲存位置**：`localStorage['feature_staff_mode']`
- **設計意圖**：Feature flag，控制員工同步路徑是否啟用
- **使用範圍**：僅用於 `hooks/useSync.ts` 中的路徑分支
- **風險**：`useUserRole().isStaff`（Supabase 事實）與 `feature_staff_mode`（localStorage）可能不一致，見第 7 節

### 1.4 角色快取

- **位置**：`localStorage['user_role_cache']`
- **TTL**：24 小時
- **內容**：`{ userId, role: UserRole, timestamp }`
- **觸發清除**：登出時（`clearRoleCache()`）
- **風險**：員工被老闆移除後，最長 24 小時內員工端仍保持員工身份

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

## 6. 同步模式目前風險

### 6.1 同步流程架構

```
SyncProvider
  └─ useSync({ enabled: !!user && isConfigured })
       ├─ feature_staff_mode = false → pullEventsWithSnapshot()
       │    使用快照 + 增量事件（老闆路徑）
       └─ feature_staff_mode = true  → pullAllEvents()
            ├─ pullEventsFromViews()
            │    從 staff_accessible_markets/products/events 視圖拉資料
            │    用 access_type 和 relationship_owner_id 過濾
            └─ 跳過快照（快照不含權限資訊）
```

### 6.2 風險：雙軌不同步

`useUserRole().isStaff`（Supabase 事實）可能與 `feature_staff_mode`（localStorage）不一致：

| 情境 | useUserRole | feature_staff_mode | 結果 |
|---|---|---|---|
| 老闆已接受員工邀請，但從未開過員工模式 | `isStaff = true` | `false` | UI 顯示員工介面，但同步走老闆路徑（快照）→ 可能失敗 |
| 員工已關閉 feature_staff_mode | `isStaff = true` | `false` | UI 顯示員工介面，但同步走老闆路徑 → 資料錯誤 |
| 老闆故意關閉 feature_staff_mode | `isStaff = false` | `false` | 一致，OK |
| 員工啟用 feature_staff_mode | `isStaff = true` | `true` | 一致，OK |

**根本問題**：`feature_staff_mode` 應由 `useUserRole().isStaff` 推導，而非獨立的 localStorage flag。

---

## 7. `feature_staff_mode` 與 `useUserRole()` 雙軌問題

### 7.1 現況

| 來源 | 類型 | 依據 | 使用範圍 |
|---|---|---|---|
| `useUserRole()` | Supabase 查詢（遠端事實）| `staff_relationships` 表 | 所有 UI 元件、SyncContext |
| `feature_staff_mode` | localStorage（本地狀態）| Feature flag | 僅 `useSync.ts` 的路徑分支 |

### 7.2 問題

1. **地位相同，無優先順序**：兩者無從屬關係，`useSync` 不參考 `useUserRole`，兩者可同時為 true 或 false，無法保證同步路徑與 UI 身份一致。
2. **使用者可任意切換**：`feature_staff_mode` 由使用者透過 Settings 頁面 toggle，等同於讓使用者自行決定同步時的身份路由，而非由系統角色事實決定。
3. **缺乏 fallback**：當 `useUserRole()` 載入中時（`isLoading = true`），`feature_staff_mode` 的值是唯一的參考，導致載入期間同步行為不穩定。

### 7.3 修正方向

同步層的角色應完全由 `useUserRole()` 推導，不再依賴獨立的 `feature_staff_mode`。`feature_staff_mode` 可降級為「已棄用」的狀態，保留但不再作為邏輯判斷依據。

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

### Phase 2：新增角色模式解析 helper
- 新增 `lib/auth/role-mode.ts`
- 實作 `resolveRoleMode(userRole): 'owner' | 'staff'`
- `feature_staff_mode` 降級為 fallback，不作為主要判斷依據
- **不刪除** `feature_staff_mode`

### Phase 3：SyncProvider 接入角色語意
- `useSync()` 接收由 `useUserRole()` 推導的角色參數
- 同步層不再直接讀取 `feature_staff_mode`
- **不重寫** `useSync` 整體演算法

### Phase 4：收斂 StaffManagement 至 service 層
- 查詢員工列表 → 改用 `getMyStaff()`
- 邀請員工 → 改用 `inviteStaff()`
- 移除員工 → **先確認語意**（revoke 或 delete）

### Phase 5：角色快取 TTL 優化
- 評估將 24 小時 TTL 縮短至 5–15 分鐘
- 加入 `clearRoleCache()` 觸發點：登出、接受邀請成功、被移除員工

### Phase 6：建立安全驗證清單
- 建立 `docs/ROLE_SECURITY_CHECKLIST.md`
- 驗證 RLS 各表的 staff 存取控制
- 驗證敏感資料在 API 層的保護

---

## 附錄：關鍵檔案索引

| 檔案 | 角色 |
|---|---|
| `hooks/useUserRole.ts` | **核心**：唯一前端角色判斷來源 |
| `hooks/useSync.ts` | 同步引擎，目前使用 `feature_staff_mode` |
| `lib/db/feature-flags.ts` | `feature_staff_mode` 的讀寫 |
| `lib/supabase/staff.ts` | 員工 CRUD service 函式 |
| `lib/supabase/staff-invitations.ts` | 邀請連結管理 |
| `components/settings/StaffManagement.tsx` | 員工管理 UI，目前直接操作 Supabase |
| `app/join/page.tsx` | 員工接受邀請頁面 |
| `lib/sync-context.tsx` | 全域同步 Context，消費 `useUserRole()` |
| `lib/data-sanitization.ts` | 敏感資料脫敏（目前閒置）|
| `components/staff/SensitiveDataMask.tsx` | DOM 層敏感資料遮罩元件 |
| `types/staff.ts` | 員工系統 TypeScript 類型定義 |
| `types/db.ts` | 資料庫類型，含 Market 與 staff 相關欄位 |
