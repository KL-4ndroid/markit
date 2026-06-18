/**
 * 員工管理查詢函數
 * 
 * 用於管理員工關係、邀請和權限
 */

import { supabase } from './client';
import type { StaffRelationship, StaffInviteForm, StaffPermissions, StaffRole } from '@/types/staff';

/**
 * 員工列表 UI 顯示型別
 * 與 StaffManagement 組件的 UI 需求對齊
 */
export interface StaffMember {
  id: string;
  email: string;
  status: 'pending' | 'active' | 'revoked';
  permissions: {
    can_view: boolean;
    can_edit: boolean;
  };
  role?: StaffRole;
  relationship_id?: string;
  joined_at: string;
}

/**
 * 045 後 get_my_staff() 額外回傳 relationship_id 欄位
 * 保留 StaffRelationship 對外型別不變，只在內部加 optional 欄位
 */
type StaffRelationshipWithRelationshipId = StaffRelationship & {
  relationship_id?: string;
};

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
  const staffList = await getMyStaff();

  return staffList
    .filter(s => s.status !== 'revoked')
    .map(s => ({
    id: s.staff_id,
    email: s.staff_email || '未知',
    status: s.status,
    permissions: s.permissions || { can_view: true, can_edit: false },
    role: s.role,
    relationship_id: s.relationship_id,
    joined_at: s.created_at || new Date().toISOString(),
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
 * 邏輯：
 * 1. 查詢用戶是否存在
 * 2. 檢查雙方是否已有 staff_relationships 記錄
 *    - 有 revoked 記錄 → 復原為 pending（重新邀請）
 *    - 有 pending / active 記錄 → 擋住（已是員工）
 * 3. 無記錄 → 新增 pending 記錄
 * 4. 保留 23505 fallback 作為 race condition 最後防線
 *
 * @param inviteData - 邀請數據
 * @returns 創建的員工關係記錄
 */
export async function inviteStaff(inviteData: StaffInviteForm): Promise<StaffRelationship> {
  // 0. 獲取當前用戶
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('請先登入');
  }

  // 1. 查詢用戶是否存在
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', inviteData.staff_email.toLowerCase())
    .single();

  if (userError || !userData) {
    throw new Error('找不到此用戶，請確認 Email 是否正確');
  }

  // 2. 檢查是否已有 staff_relationships 記錄
  const { data: existing, error: existingError } = await supabase
    .from('staff_relationships')
    .select('id, status')
    .eq('owner_id', user.id)
    .eq('staff_id', userData.id)
    .limit(1);

  if (existingError) {
    console.error('查詢員工關係失敗:', existingError);
    throw existingError;
  }

  if (existing && existing.length > 0) {
    const record = existing[0];

    if (record.status === 'revoked') {
      // 3a. revoked → 復原為 pending（重新邀請）
      const { data, error: updateError } = await supabase
        .from('staff_relationships')
        .update({
          status: 'pending',
          accepted_at: null,
          staff_email: inviteData.staff_email.toLowerCase(),
          permissions: inviteData.permissions || { can_view: true, can_edit: false, infoLevel: 0 },
        })
        .eq('id', record.id)
        .select()
        .single();

      if (updateError) {
        console.error('重新邀請員工失敗:', updateError);
        throw updateError;
      }

      return data as StaffRelationship;
    }

    // 3b. pending / active → 擋住
    throw new Error('此用戶已經是你的員工');
  }

  // 4. 無記錄 → 新增 pending 記錄
  const { data, error } = await supabase
    .from('staff_relationships')
    .insert({
      owner_id: user.id,
      staff_id: userData.id,
      staff_email: inviteData.staff_email.toLowerCase(),
      status: 'pending',
      permissions: inviteData.permissions || { can_view: true, can_edit: false, infoLevel: 0 },
    })
    .select()
    .single();

  if (error) {
    console.error('邀請員工失敗:', error);

    // 5. 23505 fallback — race condition 最後防線
    if (error.code === '23505') {
      throw new Error('此用戶已經是你的員工');
    }

    throw error;
  }

  return data as StaffRelationship;
}

/**
 * 接受員工邀請
 * 
 * @param relationshipId - 員工關係 ID
 * @returns 更新後的員工關係記錄
 */
export async function acceptInvitation(relationshipId: string): Promise<StaffRelationship> {
  const { data, error } = await supabase
    .from('staff_relationships')
    .update({
      status: 'active',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', relationshipId)
    .eq('status', 'pending')  // 只能接受待處理的邀請
    .select()
    .single();

  if (error) {
    console.error('接受邀請失敗:', error);
    throw error;
  }

  return data as StaffRelationship;
}

/**
 * 撤銷員工權限
 * 
 * @param relationshipId - 員工關係 ID
 * @returns 更新後的員工關係記錄
 */
export async function revokeStaff(relationshipId: string): Promise<StaffRelationship> {
  const { data, error } = await supabase
    .from('staff_relationships')
    .update({
      status: 'revoked',
    })
    .eq('id', relationshipId)
    .select()
    .single();

  if (error) {
    console.error('撤銷員工權限失敗:', error);
    throw error;
  }

  return data as StaffRelationship;
}

/**
 * 移除員工（revoke + 清除 market_members 存取權）
 *
 * 流程：查 staff_relationships → revoke → 刪除 market_members
 *
 * @param staffId - 員工 user_id
 */
export async function removeStaff(staffId: string): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('請先登入');
  }

  const { data: relationships, error: relError } = await supabase
    .from('staff_relationships')
    .select('id')
    .eq('owner_id', user.id)
    .eq('staff_id', staffId)
    .in('status', ['pending', 'active'])
    .limit(1);

  if (relError) {
    console.error('查詢員工關係失敗:', relError);
    throw relError;
  }

  if (!relationships || relationships.length === 0) {
    throw new Error('找不到此員工關係');
  }

  await revokeStaff(relationships[0].id);

  const { data: markets, error: marketsError } = await supabase
    .from('markets')
    .select('id')
    .eq('owner_id', user.id);

  if (marketsError) {
    console.error('查詢市集失敗:', marketsError);
    throw marketsError;
  }

  if (!markets || markets.length === 0) {
    return;
  }

  const marketIds = markets.map(m => m.id);

  const { error: membersError } = await supabase
    .from('market_members')
    .delete()
    .eq('user_id', staffId)
    .eq('role', 'staff')
    .in('market_id', marketIds);

  if (membersError) {
    console.error('刪除 market_members 失敗:', membersError);
    throw membersError;
  }
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
  const { data, error } = await supabase
    .from('staff_relationships')
    .update({
      permissions,
    })
    .eq('id', relationshipId)
    .select()
    .single();

  if (error) {
    console.error('更新員工權限失敗:', error);
    throw error;
  }

  return data as StaffRelationship;
}

/**
 * 刪除員工關係（永久刪除）
 * 
 * @param relationshipId - 員工關係 ID
 */
export async function deleteStaffRelationship(relationshipId: string): Promise<void> {
  const { error } = await supabase
    .from('staff_relationships')
    .delete()
    .eq('id', relationshipId);

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
