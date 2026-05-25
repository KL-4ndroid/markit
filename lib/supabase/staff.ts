/**
 * 員工管理查詢函數
 * 
 * 用於管理員工關係、邀請和權限
 */

import { supabase } from './client';
import type { StaffRelationship, StaffInviteForm, StaffPermissions } from '@/types/staff';

/**
 * 獲取我的員工列表（作為老闆）
 * 
 * @returns 員工列表
 */
export async function getMyStaff(): Promise<StaffRelationship[]> {
  const { data, error } = await supabase
    .rpc('get_my_staff');

  if (error) {
    console.error('查詢員工列表失敗:', error);
    throw error;
  }

  return (data || []) as StaffRelationship[];
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

  // 2. 創建員工關係（包含 owner_id）
  const { data, error } = await supabase
    .from('staff_relationships')
    .insert({
      owner_id: user.id,  // ✅ 修復：添加 owner_id
      staff_id: userData.id,
      staff_email: inviteData.staff_email.toLowerCase(),
      status: 'pending',
      permissions: inviteData.permissions || { can_view: true, can_edit: false },
    })
    .select()
    .single();

  if (error) {
    console.error('邀請員工失敗:', error);
    
    // 處理重複邀請
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
