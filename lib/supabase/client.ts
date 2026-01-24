/**
 * Supabase Client 初始化
 * 
 * 使用環境變數配置 Supabase 連線
 * 支援離線優先架構
 */

import { createClient } from '@supabase/supabase-js';

// 從環境變數讀取配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase 環境變數未設置，多人協作功能將無法使用');
}

/**
 * Supabase 客戶端實例
 * 
 * 配置說明：
 * - auth.persistSession: true - 持久化登入狀態
 * - auth.autoRefreshToken: true - 自動刷新 Token
 * - auth.detectSessionInUrl: true - 從 URL 檢測 Session（用於 Magic Link）
 */
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * 檢查 Supabase 是否已配置
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

/**
 * 測試 Supabase 連線
 */
export async function testSupabaseConnection(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    
    // PGRST116 = 表不存在或無權限（正常，因為可能還沒有資料）
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase 連線測試失敗:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase 連線測試失敗:', error);
    return false;
  }
}

/**
 * 獲取當前用戶
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('獲取用戶失敗:', error);
    return null;
  }
  
  return user;
}

/**
 * 登出
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('登出失敗:', error);
    throw error;
  }
}
