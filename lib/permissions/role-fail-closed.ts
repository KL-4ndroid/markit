/**
 * Role Fail-Closed 純函式（C2.28）
 *
 * 設計目標：
 * - 角色載入中（isLoading=true）→ 視為員工最嚴格等級（infoLevel 0）
 * - 角色查詢錯誤（roleError != null）→ 視為員工最嚴格等級（infoLevel 0）
 * - 員工（isStaff=true）→ 視為員工（infoLevel 2，或 permissions.infoLevel）
 * - 老闆（isStaff=false，已載入且無錯誤）→ infoLevel 3
 *
 * 為什麼要 fail-closed：
 * - useUserRole() 初始值為 `{ isStaff: false }`，原 resolveInfoLevel 會回傳 3（owner）
 * - 在載入期間或錯誤時，UI 會被當作 owner，可能：
 *   1. useSync 寫入敏感欄位到員工 IndexedDB
 *   2. UI 元件渲染敏感資料
 *   3. canEdit / canViewSensitiveData 回傳 true
 *
 * 這個檔案**只放純函式**，方便測試；hook 端（useUserRole.ts）與
 * sync-context.tsx 會呼叫這些函式計算 fail-closed 的權限。
 *
 * @module role-fail-closed
 */

import type { UserRole } from '@/hooks/useUserRole';
import type { InfoLevel } from './PermissionGate';

export interface RoleSnapshot {
  /** useUserRole 回傳的 userRole（可能為 null） */
  userRole: UserRole | null | undefined;
  /** 角色查詢是否仍在進行中 */
  isLoading: boolean;
  /** 角色查詢是否失敗（不為 null 時代表失敗） */
  roleError: Error | null;
}

export interface RolePermissions {
  /** 是否為老闆（fail-closed：loading/error/未登入都為 false） */
  isOwner: boolean;
  /** 是否可編輯（fail-closed：同上） */
  canEdit: boolean;
  /** 是否可看敏感資料（fail-closed：同上） */
  canViewSensitiveData: boolean;
  /** 原始 isStaff（不 fail-closed，相容舊行為） */
  isStaff: boolean;
}

/**
 * 從 RoleSnapshot 計算 fail-closed 權限
 *
 * 規則：
 * - isLoading=true → 全部 false（不可編輯、不可看敏感）
 * - roleError != null → 全部 false
 * - userRole 為 null/undefined → 全部 false
 * - userRole.isStaff=true → 全部 false（員工本來就沒權限）
 * - userRole.isStaff=false → 全部 true（已確認為老闆）
 */
export function deriveRolePermissions(snapshot: RoleSnapshot): RolePermissions {
  const isStaff = snapshot.userRole?.isStaff ?? false;

  // Fail-closed：loading / error / 未登入 → 全部鎖住
  const isResolved = !snapshot.isLoading && !snapshot.roleError && snapshot.userRole != null;
  const isOwner = isResolved && !isStaff;

  return {
    isOwner,
    canEdit: isOwner,
    canViewSensitiveData: isOwner,
    isStaff,
  };
}

/**
 * 從 RoleSnapshot 計算 fail-closed 的 infoLevel
 *
 * 規則：
 * - isLoading=true → 0（最嚴格）
 * - roleError != null → 0
 * - userRole 為 null/undefined → 0
 * - userRole.isStaff=true → permissions.infoLevel ?? 2
 * - userRole.isStaff=false → 3
 */
export function deriveSafeInfoLevel(snapshot: RoleSnapshot): InfoLevel {
  // Fail-closed：loading / error / 未登入 → 0
  if (snapshot.isLoading || snapshot.roleError || snapshot.userRole == null) {
    return 0;
  }

  if (!snapshot.userRole.isStaff) {
    return 3; // 老闆
  }

  // 員工：從 permissions 讀取 infoLevel，預設 2
  return (snapshot.userRole.permissions as { infoLevel?: InfoLevel } | null)?.infoLevel ?? 2;
}

/**
 * 判斷 snapshot 視為「不安全 / fail-open」的狀態
 * - 用於日誌與監控
 */
export function isRoleInFailOpenState(snapshot: RoleSnapshot): boolean {
  return snapshot.isLoading || snapshot.roleError != null || snapshot.userRole == null;
}
