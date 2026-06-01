/**
 * 角色模式解析器
 *
 * 提供單一、確定性的角色語意轉譯。
 * 所有需要判斷當前為老闆或員工模式的程式碼，應使用此 helper，
 * 而非直接比較 `useUserRole().isStaff` 或讀取 `feature_staff_mode`。
 *
 * ## 設計原則
 *
 * - **唯一真相來源**：`resolveRoleMode()` 以 `useUserRole()` 的回傳值（`UserRole`）為輸入，
 *   完全基於 Supabase `staff_relationships` 表的遠端事實，不依賴本地 localStorage。
 *
 * - **未來取代目標**：
 *   目前同步層（`hooks/useSync.ts`）使用獨立的 `feature_staff_mode`（localStorage）判斷同步路徑，
 *   此 flag 應在 Phase 3 被移除，改由 `resolveRoleMode()` 推導同步角色。
 *   `feature_staff_mode` 在過渡期可作為 fallback（當 `userRole` 尚未載入時），但不得作為主要邏輯。
 *
 * ## 與 feature_staff_mode 的關係
 *
 * ```
 * useUserRole()              feature_staff_mode
 *     │                              │
 *     └──────────┬───────────────────┘
 *                ▼
 *       resolveRoleMode()      ← 單一入口
 * ```
 *
 * @module role-mode
 */

import type { UserRole } from '@/hooks/useUserRole';

/**
 * 角色模式
 *
 * - `owner`：老闆，以自己的 `user.id` 作為所有資料的 ownerId
 * - `staff`：員工，以老闆的 `userRole.ownerId` 作為所有資料的 ownerId
 */
export type RoleMode = 'owner' | 'staff';

/**
 * 從 `useUserRole()` 的回傳值解析出角色模式。
 *
 * ## 解析規則
 *
 * | 條件 | 結果 |
 * |---|---|
 * | `isStaff === true` 且 `ownerId` 存在 | `'staff'` |
 * | 其他所有情況（老闆、未登入、載入中、isStaff 但無 ownerId）| `'owner'` |
 *
 * ## 使用範例
 *
 * ```ts
 * import { resolveRoleMode } from '@/lib/auth/role-mode';
 * import { useUserRole } from '@/hooks/useUserRole';
 *
 * function MyComponent() {
 *   const { userRole } = useUserRole();
 *   const roleMode = resolveRoleMode(userRole);
 *
 *   // 查詢時使用
 *   const ownerId = roleMode === 'staff' ? userRole.ownerId : user?.id;
 * }
 * ```
 *
 * ## 與 feature_staff_mode 的取代計画
 *
 * 目前同步層 (`useSync.ts`) 仍直接讀取 `feature_staff_mode`。
 * 未來應改為：
 *
 * ```ts
 * // 過渡：現階段
 * const roleMode = resolveRoleMode(userRole);
 * const isStaffSync = roleMode === 'staff';
 *
 * // 完成：Phase 3 後，feature_staff_mode 移除
 * // 直接以 roleMode === 'staff' 取代所有 isStaffModeEnabled() 呼叫
 * ```
 *
 * @param userRole - `useUserRole()` 回傳的使用者角色物件
 * @returns 角色模式
 */
export function resolveRoleMode(userRole: UserRole | null | undefined): RoleMode {
  if (userRole?.isStaff && userRole?.ownerId) {
    return 'staff';
  }
  return 'owner';
}

/**
 * 推導同步用的 staff 標記。
 *
 * 此函式是 `resolveRoleMode()` 在同步層的語義等價物。
 * 目前內部仍參考 `feature_staff_mode` 作為載入期的 fallback；
 * 當 Phase 3 完成後，此 fallback 應被移除。
 *
 * ## 注意事項
 *
 * - **不要**在 UI 層邏輯中使用此函式；請直接使用 `resolveRoleMode()`。
 * - **不要**將此函式作為判斷身份的主要依據；它僅供同步層內部使用。
 *
 * @param userRole - `useUserRole()` 回傳的使用者角色物件
 * @returns 若角色為 staff 或 `feature_staff_mode` 啟用中，回傳 `true`
 */
export function deriveSyncStaffMode(userRole: UserRole): boolean {
  if (resolveRoleMode(userRole) === 'staff') {
    return true;
  }

  // Fallback：當 userRole 尚未載入（isStaff = false 且無 ownerId）時，
  // 保守地參考 feature_staff_mode，避免員工在載入期間走錯同步路徑。
  // TODO (Phase 3): 移除此 fallback，改由上層保證 userRole 已就緒
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem('feature_staff_mode') === 'true';
    } catch {
      return false;
    }
  }

  return false;
}
