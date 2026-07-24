/**
 * 員工邀請管理函數
 * 
 * 用於管理透過連結邀請員工的功能
 */

import { supabase } from './client';
import { nanoid } from 'nanoid';
import { getDeepLinkPort } from '@/lib/platform/interaction-capabilities';

/**
 * 邀請資訊
 */
export interface StaffInvitation {
  id: string;
  owner_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

/**
 * 邀請驗證結果
 */
export interface InvitationVerification {
  is_valid: boolean;
  owner_id: string | null;
  owner_email: string | null;
  expires_at: string | null;
}

/**
 * 產生邀請連結
 * 
 * @returns 邀請資訊（包含 token）
 */
export async function createInvitation(): Promise<StaffInvitation> {
  // 1. 產生唯一的 token（使用 nanoid，更短且安全）
  const token = nanoid(32);
  
  // 2. 計算過期時間（3 天後）
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 3);
  
  // 3. 獲取當前用戶 ID
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('未登入，無法建立邀請');
  }
  
  // 4. 寫入資料庫
  const { data, error } = await supabase
    .from('staff_invitations')
    .insert({
      owner_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('建立邀請失敗:', error);
    throw error;
  }
  
  return data as StaffInvitation;
}

/**
 * 獲取我的邀請列表（作為老闆）
 * 
 * @returns 邀請列表
 */
export async function getMyInvitations(): Promise<StaffInvitation[]> {
  // ✅ 獲取當前用戶 ID
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('未登入，無法查詢邀請列表');
  }
  
  // ✅ 只查詢當前用戶創建的邀請
  const { data, error } = await supabase
    .from('staff_invitations')
    .select('*')
    .eq('owner_id', user.id)  // ✅ 關鍵：過濾 owner_id
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('查詢邀請列表失敗:', error);
    throw error;
  }
  
  return (data || []) as StaffInvitation[];
}

/**
 * 刪除邀請（手動清理）
 * 
 * @param invitationId - 邀請 ID
 */
export async function deleteInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from('staff_invitations')
    .delete()
    .eq('id', invitationId);
  
  if (error) {
    console.error('刪除邀請失敗:', error);
    throw error;
  }
}

/**
 * 驗證邀請 Token（未登入用戶也可調用）
 * 
 * @param token - 邀請 Token
 * @returns 驗證結果
 */
export async function verifyInvitationToken(token: string): Promise<InvitationVerification> {
  const { data, error } = await supabase
    .rpc('verify_invitation_token', { p_token: token });
  
  if (error) {
    console.error('驗證邀請 Token 失敗:', error);
    throw error;
  }
  
  // RPC 返回的是陣列，取第一個元素
  const result = Array.isArray(data) ? data[0] : data;
  
  return result as InvitationVerification;
}

/**
 * 接受邀請並自動綁定員工關係
 * 
 * @param token - 邀請 Token
 * @param staffId - 員工的 user_id
 * @returns 綁定結果
 */
export async function acceptInvitationAndBind(
  token: string,
  staffId: string
): Promise<{
  success: boolean;
  message: string;
  relationship_id: string | null;
}> {
  const { data, error } = await supabase
    .rpc('accept_invitation_and_bind', {
      p_token: token,
      p_staff_id: staffId,
    });
  
  if (error) {
    console.error('接受邀請失敗:', error);
    throw error;
  }
  
  // RPC 返回的是陣列，取第一個元素
  const result = Array.isArray(data) ? data[0] : data;
  
  return result;
}

/**
 * 清理過期的邀請（手動觸發）
 * 
 * @returns 清理的數量
 */
export async function cleanupExpiredInvitations(): Promise<number> {
  const { data, error } = await supabase
    .rpc('cleanup_expired_invitations');
  
  if (error) {
    console.error('清理過期邀請失敗:', error);
    throw error;
  }
  
  return data as number;
}

/**
 * 產生邀請網址
 * 
 * @param token - 邀請 Token
 * @returns 完整的邀請網址
 */
export function generateInvitationUrl(token: string): string {
  return getDeepLinkPort().createAppUrl(`/join?token=${encodeURIComponent(token)}`);
}

/**
 * 計算剩餘時間（人類可讀格式）
 * 
 * @param expiresAt - 過期時間
 * @returns 剩餘時間文字
 */
export function formatRemainingTime(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();
  
  if (diff <= 0) {
    return '已過期';
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days} 天 ${hours} 小時`;
  } else if (hours > 0) {
    return `${hours} 小時 ${minutes} 分鐘`;
  } else {
    return `${minutes} 分鐘`;
  }
}
