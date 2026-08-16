/**
 * 角色模式解析器
 *
 * 提供單一、確定性的角色語意轉譯。
 * 所有需要判斷當前為老闆或員工模式的程式碼，應使用此 helper，
 * 而非直接比較 `useUserRole().isStaff`。
 *
 * ## 設計原則
 *
 * - **唯一真相來源**：`resolveRoleMode()` 以 `useUserRole()` 的回傳值（`UserRole`）為輸入，
 *   完全基於 Supabase `staff_relationships` 表的遠端事實。
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
 * @param userRole - `useUserRole()` 回傳的使用者角色物件
 * @returns 角色模式
 */
export function resolveRoleMode(userRole: UserRole | null | undefined): RoleMode {
  if (userRole?.isStaff && userRole?.ownerId) {
    return 'staff';
  }
  return 'owner';
}
