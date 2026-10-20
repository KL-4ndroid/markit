/**
 * 員工管理查詢函數
 * 
 * 用於管理員工關係、邀請和權限
 */

import { supabase } from './client';
import type {
  StaffRelationship,
  StaffInviteForm,
  StaffPermissions,
  StaffRelationshipStatus,
  StaffRole,
} from '@/types/staff';

/**
 * 員工列表 UI 顯示型別
 * 與 StaffManagement 組件的 UI 需求對齊
 */
export interface StaffMember {
  id: string;
  email: string;
  status: StaffRelationshipStatus;
  permissions: {
    can_view: boolean;
    can_edit: boolean;
  };
  role?: StaffRole;
  relationship_id?: string;
  joined_at: string;
}

function unwrapStaffRelationshipRpc(data: unknown): StaffRelationship {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') {
    throw new Error('伺服器未回傳有效的員工關係資料');
  }
  return row as StaffRelationship;
}

/**
 * 045 後 get_my_staff() 額外回傳 relationship_id 欄位
 * 保留 StaffRelationship 對外型別不變，只在內部加 optional 欄位
 */
type StaffRelationshipWithRelationshipId = StaffRelationship & {
  relationship_id?: string;
};

export type StaffRelationshipIdentityRow = Pick<
  StaffRelationship,
  'id' | 'staff_id' | 'status'
>;

export function hydrateMissingStaffRelationshipIds(
  staffList: StaffRelationshipWithRelationshipId[],
  identityRows: readonly StaffRelationshipIdentityRow[]
): StaffRelationshipWithRelationshipId[] {
  const identityByStaffAndStatus = new Map(
    identityRows.map(row => [`${row.staff_id}:${row.status}`, row.id])
  );

  return staffList.map(staff => ({
    ...staff,
    relationship_id:
      staff.relationship_id ??
      identityByStaffAndStatus.get(`${staff.staff_id}:${staff.status}`),
  }));
}

/**
 * 獲取我的員工列表（作為老闆）
 *
 * @returns 員工列表（含 relationship_id 供 update_staff_role 使用）
 */
export async function getMyStaff(): Promise<StaffRelationshipWithRelationshipId[]> {
  const { data, error } = await supabase
    .rpc('get_my_staff');

  if (error) {
    console.error('查詢員工列表失敗:', error);
    throw error;
  }

  return (data || []) as StaffRelationshipWithRelationshipId[];
}

/**
 * 獲取我的員工列表（對齊 UI 顯示型別）
 *
 * 包裝 getMyStaff()，將 RPC 回傳的欄位映射為 StaffManagement 所需的格式。
 * joined_at 對齊 StaffManagement 的邏輯：
 *   pending → created_at（邀請時間）
 *   active  → created_at（加入時間）
 *
 * 045 之後 mapping 保留 relationship_id（staff_relationships.id 主鍵），
 * 供未來 updateStaffRole() 呼叫 update_staff_role RPC 使用。
 *
 * @returns 員工列表（UI 顯示格式）
 */
export async function getMyStaffMembers(): Promise<StaffMember[]> {
  let staffList = await getMyStaff();

  const missingRelationshipStaffIds = Array.from(new Set(
    staffList
      .filter(staff => !staff.relationship_id)
      .map(staff => staff.staff_id)
      .filter(Boolean)
  ));

  if (missingRelationshipStaffIds.length > 0) {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (!authError && authData.user) {
      const { data: identityRows, error: identityError } = await supabase
        .from('staff_relationships')
        .select('id, staff_id, status')
        .eq('owner_id', authData.user.id)
        .in('staff_id', missingRelationshipStaffIds);

      if (identityError) {
        console.warn('補查員工關係識別碼失敗:', identityError);
      } else {
        staffList = hydrateMissingStaffRelationshipIds(
          staffList,
          (identityRows || []) as StaffRelationshipIdentityRow[]
        );
      }
    }
  }

  return staffList
    .filter(s => s.status !== 'revoked')
    .map(s => ({
    id: s.staff_id,
    email: s.staff_email || '未知',
    status: s.status,
    permissions: s.permissions || { can_view: true, can_edit: false },
    role: s.role,
    relationship_id: s.relationship_id,
    joined_at: s.accepted_at || s.invited_at || s.created_at || new Date().toISOString(),
  }));
}

/**
 * 獲取我的老闆列表（作為員工）
 * 
 * @returns 老闆列表
 */
export async function getMyOwners(): Promise<Array<{
  owner_id: string;
  owner_email: string;
  permissions: StaffPermissions;
  accepted_at: string;
}>> {
  const { data, error } = await supabase
    .rpc('get_my_owners');

  if (error) {
    console.error('查詢老闆列表失敗:', error);
    throw error;
  }

  return data || [];
}

/**
 * 檢查是否為某老闆的員工
 * 
 * @param ownerId - 老闆的 user_id
 * @returns 是否為員工
 */
export async function isStaffOf(ownerId: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('is_staff_of', { p_owner_id: ownerId });

  if (error) {
    console.error('檢查員工關係失敗:', error);
    return false;
  }

  return data === true;
}

/**
 * 邀請員工
 *
 * 寫入由 invite_staff_member RPC 原子處理，並在資料庫驗證 Team entitlement。
 * revoked 關係可重新邀請；suspended_by_plan 關係必須由擁有者明確恢復。
 *
 * @param inviteData - 邀請數據
 * @returns 創建的員工關係記錄
 */
export async function inviteStaff(inviteData: StaffInviteForm): Promise<StaffRelationship> {
  const { data, error } = await supabase.rpc('invite_staff_member', {
    p_staff_email: inviteData.staff_email.trim().toLowerCase(),
  });

  if (error) {
    console.error('邀請員工失敗:', error);
    if (error.code === '23505' || error.message?.includes('already')) {
      throw new Error('此用戶已經是你的員工');
    }
    if (error.code === 'P0002') {
      throw new Error('找不到此用戶，請確認 Email 是否正確');
    }
    throw error;
  }

  return unwrapStaffRelationshipRpc(data);
}

/**
 * 接受員工邀請
 * 
 * @param relationshipId - 員工關係 ID
 * @returns 更新後的員工關係記錄
 */
export async function acceptInvitation(relationshipId: string): Promise<StaffRelationship> {
  const { data, error } = await supabase.rpc('accept_staff_email_invitation', {
    p_relationship_id: relationshipId,
  });

  if (error) {
    console.error('接受邀請失敗:', error);
    throw error;
  }

  return unwrapStaffRelationshipRpc(data);
}

export async function declineInvitation(relationshipId: string): Promise<void> {
  const { error } = await supabase.rpc('decline_staff_email_invitation', {
    p_relationship_id: relationshipId,
  });

  if (error) {
    console.error('拒絕邀請失敗:', error);
    throw error;
  }
}

/**
 * 撤銷員工權限
 * 
 * @param relationshipId - 員工關係 ID
 * @returns 更新後的員工關係記錄
 */
export async function revokeStaff(relationshipId: string): Promise<StaffRelationship> {
  const { data, error } = await supabase.rpc('revoke_staff_relationship', {
    p_relationship_id: relationshipId,
  });

  if (error) {
    console.error('撤銷員工權限失敗:', error);
    throw error;
  }

  return unwrapStaffRelationshipRpc(data);
}

/**
 * 移除員工（revoke + 清除 market_members 存取權）
 *
 * 流程由 revoke_staff_member RPC 原子處理，降級後仍允許擁有者清理。
 *
 * @param staffId - 員工 user_id
 */
export async function removeStaff(staffId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_staff_member', {
    p_staff_id: staffId,
  });

  if (error) {
    console.error('移除員工失敗:', error);
    throw error;
  }
}

export async function restoreStaffRelationship(relationshipId: string): Promise<StaffRelationship> {
  const { data, error } = await supabase.rpc('restore_staff_relationship', {
    p_relationship_id: relationshipId,
  });

  if (error) {
    console.error('恢復員工關係失敗:', error);
    throw error;
  }

  return unwrapStaffRelationshipRpc(data);
}

/**
 * 更新員工權限
 * 
 * @param relationshipId - 員工關係 ID
 * @param permissions - 新的權限設定
 * @returns 更新後的員工關係記錄
 */
export async function updateStaffPermissions(
  relationshipId: string,
  permissions: StaffPermissions
): Promise<StaffRelationship> {
  const { data, error } = await supabase.rpc('update_staff_permissions', {
    p_relationship_id: relationshipId,
    p_permissions: permissions,
  });

  if (error) {
    console.error('更新員工權限失敗:', error);
    throw error;
  }

  return unwrapStaffRelationshipRpc(data);
}

/**
 * 永久刪除已撤銷的員工關係
 * 
 * @param relationshipId - 員工關係 ID
 */
export async function deleteStaffRelationship(relationshipId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_revoked_staff_relationship', {
    p_relationship_id: relationshipId,
  });

  if (error) {
    console.error('刪除員工關係失敗:', error);
    throw error;
  }
}

/**
 * 獲取待處理的邀請（作為員工）
 * 
 * @returns 待處理的邀請列表
 */
export async function getPendingInvitations(): Promise<StaffRelationship[]> {
  const { data, error } = await supabase
    .from('staff_relationships')
    .select('*')
    .eq('status', 'pending')
    .order('invited_at', { ascending: false });

  if (error) {
    console.error('查詢待處理邀請失敗:', error);
    throw error;
  }

  return (data || []) as StaffRelationship[];
}

/**
 * 檢查用戶是否為老闆（擁有自己的市集）
 * 
 * @param userId - 可選的用戶 ID，預設使用當前登入用戶
 * @returns 是否為老闆
 */
export async function isOwner(userId?: string): Promise<boolean> {
  // 獲取當前用戶 ID
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    targetUserId = user.id;
  }

  // ✅ 修復：檢查當前用戶是否為某市集的 owner
  const { data, error } = await supabase
    .from('market_members')
    .select('role')
    .eq('user_id', targetUserId)
    .eq('role', 'owner')
    .limit(1);

  if (error) {
    console.error('檢查老闆身份失敗:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

// ============================================================
// P4a-frontend：員工角色修改 wrapper
// ============================================================
// 對應 DB RPC：update_staff_role(p_relationship_id UUID, p_role TEXT)
// 045 production 已套用，get_my_staff() 已回傳 relationship_id
//
// P4a-frontend 只建立 wrapper + 錯誤碼 mapping，不接 UI 呼叫端。
// 未來 P4c 才會在 StaffManagement 內啟用「編輯角色」按鈕 + Dialog 確認 + toast。
//
// 錯誤碼對應（與 043_staff_role_foundation.sql / update_staff_role RPC 一致）：
//   22023  → invalid role（前端不應送錯，屬於內部錯誤）
//   42501  → not owner / staff cannot change own role
//   P0002  → staff relationship not found
//   P0001  → relationship status is not active
//   其他    → fallback
// ============================================================

/**
 * update_staff_role RPC 錯誤碼 → 中文使用者訊息
 * （P4a 階段僅建立 mapping；P4c 才會把訊息接到 toast）
 */
export const STAFF_ROLE_UPDATE_ERROR_CODE = {
  INVALID_ROLE: '22023',
  NOT_AUTHORIZED: '42501',
  NOT_FOUND: 'P0002',
  NOT_ACTIVE: 'P0001',
} as const;

export type StaffRoleUpdateErrorCode =
  (typeof STAFF_ROLE_UPDATE_ERROR_CODE)[keyof typeof STAFF_ROLE_UPDATE_ERROR_CODE];

/**
 * 把 Supabase RPC 錯誤轉成中文使用者訊息
 *
 * @param error - Supabase 拋出的 PostgrestError
 * @returns 對應的中文訊息
 */
export function mapStaffRoleUpdateError(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return '修改角色失敗，請稍後再試';

  switch (error.code) {
    case STAFF_ROLE_UPDATE_ERROR_CODE.INVALID_ROLE:
      return '角色類型無效，請重新整理後再試';
    case STAFF_ROLE_UPDATE_ERROR_CODE.NOT_AUTHORIZED:
      return '無法修改此員工的角色';
    case STAFF_ROLE_UPDATE_ERROR_CODE.NOT_FOUND:
      return '此員工關係已不存在，請重新整理';
    case STAFF_ROLE_UPDATE_ERROR_CODE.NOT_ACTIVE:
      return '僅可修改已接受邀請的員工角色';
    default:
      return '修改角色失敗，請稍後再試';
  }
}

/**
 * 更新員工角色（owner 對自己 active 員工）
 *
 * 對應 RPC：update_staff_role(p_relationship_id, p_role)
 * 043 / 045 已知 RPC 行為：
 *   - 只允許 owner 改自己團隊中 status='active' 的員工
 *   - 員工自己改自己會被擋（42501 self-change）
 *   - 同步更新 permissions JSON（can_view / can_edit / infoLevel）
 *
 * 本 wrapper：
 *   - 不讀取回傳的 staff_relationships record（P4a 不接 UI，不需要）
 *   - 失敗時 throw new Error(中文訊息)，由未來 UI 端 catch 後接 toast
 *   - 不寫入 Dexie / 不觸發 useSync
 *
 * @param relationshipId - staff_relationships.id（由 getMyStaffMembers 的 relationship_id 取得）
 * @param role - 目標角色（viewer / operator / manager）
 */
export async function updateStaffRole(
  relationshipId: string,
  role: StaffRole
): Promise<void> {
  if (!relationshipId) {
    throw new Error('缺少員工關係識別碼，請重新整理後再試');
  }

  const { error } = await supabase.rpc('update_staff_role', {
    p_relationship_id: relationshipId,
    p_role: role,
  });

  if (error) {
    console.error('更新員工角色失敗:', error);
    throw new Error(mapStaffRoleUpdateError(error));
  }
}
