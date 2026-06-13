# C3.2A Login / Role Switch Cache Reset 設計

更新日期：2026-06-13
任務類型：純分析 / 設計
狀態：設計完成，待使用者確認後實作

## 一、現況分析

### 現有 cache reset 邏輯

目前 `auth-context.tsx` 中有三個清除入口：

| 入口 | 觸發時機 | 呼叫函式 | 清除範圍 | 符合 C3 |
|------|---------|---------|---------|:-------:|
| 被動登出 | Supabase token 過期 | `clearUserData('passive_signout')` | `db.*` 全清 + localStorage | ✅ |
| 主動登出 | 用戶按登出按鈕 | `clearUserData('manual_signout')` | `db.*` 全清 + localStorage | ✅ |
| 用戶切換 | `SIGNED_IN` + `previousUserId !== newUserId` | `clearOtherUsersData(newUserId)` | 只清別人、不清自己 | ❌ |

### 缺口一：`clearOtherUsersData` 只清別人的資料

```ts:lib/db/clear-user-data.ts (行 133–196)
// 現有邏輯：清除 owner_id ≠ currentUserId 的資料
export async function clearOtherUsersData(currentUserId: string): Promise<void> {
  // markets: owner_id !== currentUserId  → 清除
  // products: owner_id !== currentUserId  → 清除
  // events: actor_id !== currentUserId   → 清除
  // dailyStats: 依 marketId 是否存在判斷  → 清除孤立 stats
}
```

**問題**：

- Staff 的 `owner_id` 永遠是 staff 自己的 ID（不是 owner 的 ID）
- Staff 的 `db.markets` 存的是 owner 的市場，但 `owner_id = ownerId`（owner 的 ID）
- 因此 `clearOtherUsersData(staffId)` **會正確清除** owner 的市場
- 但 Staff 作為自己的資料（如 Staff 自己創建的事件）**不會被清除**

若 Staff 切換到另一個 owner，或同一瀏覽器從 Staff 切換回 Owner，`clearOtherUsersData(currentUserId)` 會清除：
- `owner_id = oldOwnerId` 的 markets ✅
- `owner_id = oldOwnerId` 的 products ✅
- `actor_id = oldOwnerId` 的 events ✅

但若同一瀏覽器之前是 Owner（userId = ownerId），現在變成 Staff（userId = staffId）：
- `clearOtherUsersData(staffId)` 清除的是 `owner_id = staffId` 的資料
- **Owner 的 `owner_id = ownerId` 的資料不會被清除** ❌

### 缺口二：Owner→Staff 切換後沒有清除 `lastSyncAt`

`auth-context.tsx` 行 220–227：

```ts
// 用戶切換：清除前一個用戶的數據
if (previousUserId && newUserId && previousUserId !== newUserId) {
  await clearOtherUsersData(newUserId); // 只清別人
  // ❌ 沒有清除 lastSyncAt
}
```

`lastSyncAt` 存在於 `db.settings` 表（`settings[0].lastSyncAt`）和 `localStorage['lastSyncAt']`。若不重置，Owner 的 sync cursor 會殘留，可能污染 Staff 的增量 sync。

### 缺口三：Owner→Staff 切換後 role cache TTL 可能造成讀到舊角色

`useUserRole.ts` 行 28：`ROLE_CACHE_TTL_MS = 5 * 60 * 1000`（5 分鐘）。若 Staff→Owner 切換後，舊的 role cache 還未過期，`initializeDatabaseSafely({ profile: isStaff ? 'staff_scoped' : 'owner_full' })` 中的 `isStaff` 判斷可能讀到過期值。

### 缺口四：沒有清除 Staff 自己的 scoped 資料

若同一用戶瀏覽器從「老闆帳號」切換到「員工帳號」（不同 Supabase auth userId），`clearOtherUsersData(newUserId)` 會清除新員工帳號的 owner 資料，但**不會清除新員工帳號自己之前作為 Staff 的殘留資料**（如果曾用同一瀏覽器登入過）。

---

## 二、設計目標

1. **身份改變時，清除所有 authenticated cache**，讓下一個身份從乾淨狀態開始
2. **不改變** `db.settings`（使用者偏好、theme 等跨身份保留）
3. **不改變** localStorage 中與身份無關的設定（如 UI 偏好）
4. **不改變** `sessionStorage`（只在特定場景由 `clearUserData` 清除）
5. **最小改動**：只新增一個匯出函式，不重構現有 `clearUserData` 邏輯

---

## 三、匯出新的統一 reset 函式

### `lib/db/clear-user-data.ts`

新增一個 scope-based reset 函式：

```ts
/**
 * Authenticated cache reset scope.
 * Defines which data should be cleared when identity changes.
 */
export type AuthCacheResetScope =
  /** Full clear: all authenticated tables + all cache (登出時) */
  | 'full'
  /** Role switch: all authenticated tables + sync cursors (身份切換時) */
  | 'role_switch';

/**
 * Reset authenticated cache based on scope.
 *
 * - 'full': clears all tables + all cache keys
 * - 'role_switch': clears authenticated tables + sync cursors, preserves user preferences
 *
 * This replaces the current `clearOtherUsersData` logic for role switches.
 * The existing `clearAllData` function is preserved for backwards compatibility
 * in the manual sign-out path.
 *
 * @param scope - Which scope of data to reset
 * @param userId - Current authenticated user ID (for logging only)
 */
export async function resetAuthenticatedCache(
  scope: AuthCacheResetScope,
  userId?: string
): Promise<void> {
  console.log(`🔒 resetAuthenticatedCache(scope=${scope}, userId=${userId?.slice(0, 8) ?? 'none'})`);

  // Always clear authenticated tables
  await db.transaction('rw', [db.events, db.markets, db.products, db.dailyStats], async () => {
    await db.events.clear();
    await db.markets.clear();
    await db.products.clear();
    await db.dailyStats.clear();
  });

  // Clear sync-related in-memory state
  if (typeof window !== 'undefined') {
    // Sync cursors
    localStorage.removeItem('lastSyncAt');
    localStorage.removeItem('hasCompletedInitialSync');
    // Role cache (always cleared on role switch)
    localStorage.removeItem('user_role_cache');
    // Pause flags
    localStorage.removeItem('sync_pause_until');
    sessionStorage.clear();

    // 'full' scope additionally clears user preferences
    if (scope === 'full') {
      localStorage.removeItem('logout_history');
    }
  }

  // Reset in-process sync identity guard (useSync.ts)
  const { resetInitialSyncFlag } = await import('@/hooks/useSync');
  resetInitialSyncFlag();

  console.log(`✅ resetAuthenticatedCache(${scope}) complete`);
}
```

### 匯出 `clearOtherUsersData` 標記廢棄

```ts
/**
 * @deprecated Use resetAuthenticatedCache('role_switch') instead.
 *   clearOtherUsersData only clears other users' data, not the full
 *   authenticated cache, leaving stale data from the previous role.
 */
export async function clearOtherUsersData(currentUserId: string): Promise<void> {
  // Keep existing implementation for now; will be replaced by callers
  // ...
}
```

---

## 四、`auth-context.tsx` 的接入點

### 接入點 A：被動登出（被動清除，token 過期）

現有：`clearUserData('passive_signout')` → `clearAllData()` + localStorage keys

改為：直接呼叫 `resetAuthenticatedCache('full')`

```tsx:lib/supabase/auth-context.tsx (行 ~176)
if (event === 'SIGNED_OUT') {
  // 被動登出：完整清除（full scope）
  await resetAuthenticatedCache('full');
  // 不再用 clearUserData
}
```

### 接入點 B：用戶切換（身份改變）

現有：`clearOtherUsersData(newUserId)`

改為：`resetAuthenticatedCache('role_switch')`

```tsx:lib/supabase/auth-context.tsx (行 ~214)
if (previousUserId && newUserId && previousUserId !== newUserId) {
  // 身份切換：角色開關 cache reset（role_switch scope）
  await resetAuthenticatedCache('role_switch', newUserId);
  // 不再用 clearOtherUsersData
}
```

### 接入點 C：主動登出

現有：`clearUserData('manual_signout')` → `clearAllData()` + keys

改為：`resetAuthenticatedCache('full')`

```tsx:lib/supabase/auth-context.tsx (行 ~356)
await resetAuthenticatedCache('full');
```

### 簡化的 `clearUserData` 函式

重構後 `clearUserData` 變成 thin wrapper：

```tsx:lib/supabase/auth-context.tsx (行 ~292)
const clearUserData = async (reason: string) => {
  console.log(`🔒 clearUserData(reason=${reason})`);
  await resetAuthenticatedCache('full');
};
```

---

## 五、現有 `clearUserData` 裡的手動清除邏輯如何處理

目前 `clearUserData`（行 292–339）手動列舉了 5 個 localStorage keys：

```ts
const keysToRemove = [
  'user_role_cache',
  'logout_history',
  'hasCompletedInitialSync',
  'staff_mode_enabled',
  'lastSyncAt',
];
```

遷移到 `resetAuthenticatedCache('full')` 後，`logout_history` 保留（有意義的使用記錄），其他都已被新函式處理。

---

## 六、不清除 `db.settings` 的理由

`db.settings` 存放：
- `theme`（auto/light/dark）
- `language`（zh-TW）
- `defaultCurrency`（TWD）
- `enableNotifications`
- `autoBackup`

這些是 UI 偏好，與身份無關。Staff 和 Owner 可以是同一人切換角色，不需要重新設定。`db.settings` 表本身無 `owner_id` 欄位，是單一實例設計，跨身份保留是正確行為。

---

## 七、反向兼容

| 現有匯出 | 新狀態 | 處理 |
|---------|--------|------|
| `clearAllData()` | 保留 | 由 `resetAuthenticatedCache('full')` 替代，未來可移除 |
| `clearUserData()` | 改為 wrapper | 現有 caller（`StaffInvitationDialog`）仍可呼叫 |
| `clearOtherUsersData()` | 廢棄標記 | 現有 caller（`auth-context.tsx`）替換後可移除 |

---

## 八、實作檔案清單

| 檔案 | 變更 |
|------|------|
| `lib/db/clear-user-data.ts` | 新增 `resetAuthenticatedCache()` + 廢棄標記 |
| `lib/supabase/auth-context.tsx` | 替換 3 個接入點 + 簡化 `clearUserData` |

**禁止修改：**
- `lib/db/index.ts`（`clearAllData` 仍匯出，不改）
- `hooks/useSync.ts`（`resetInitialSyncFlag` 已有匯出）
- 其他 UI 頁面

---

## 九、測試清單

1. **Owner→Staff 切換**：驗證 `db.markets/products/events/dailyStats` 全空
2. **Staff→Owner 切換**：驗證同上
3. **主動登出**：驗證同上 + `logout_history` 清除
4. **被動登出**：驗證同上
5. **Same user refresh**：驗證 `db.settings` 保留
6. **跨分頁同步**：驗證其他分頁收到 `SIGNED_OUT` 後正確重置
7. **`lastSyncAt` 清除**：驗證 `localStorage['lastSyncAt']` 為 `null`
8. **`user_role_cache` 清除**：驗證舊角色 cache 無殘留
9. **`staff_mode_enabled` 清除**：驗證舊模式標記無殘留

---

## 十、建議 commit 切法

```text
refactor(clear-user-data): add resetAuthenticatedCache(scope)
refactor(auth-context): use resetAuthenticatedCache for all sign-out and role-switch paths
deprecate(clear-user-data): mark clearOtherUsersData as deprecated
```
