/**
 * 市集查詢函數（支援員工模式）
 * 
 * 使用 staff_accessible_markets 視圖自動處理權限
 */

import { supabase } from './client';
import type { MarketWithAccess } from '@/types/staff';

/**
 * 查詢可訪問的市集（包含員工權限）
 * 
 * 此函數使用 staff_accessible_markets 視圖，會自動：
 * - 返回用戶作為老闆的市集
 * - 返回用戶作為員工可訪問的市集
 * - 添加 access_type 和 permissions 欄位
 * 
 * @returns 市集列表（包含權限信息）
 */
export async function getAccessibleMarkets(): Promise<MarketWithAccess[]> {
  const { data, error } = await supabase
    .from('staff_accessible_markets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('查詢市集失敗:', error);
    throw error;
  }

  // 在客戶端過濾已刪除的市集
  return ((data || []) as MarketWithAccess[]).filter(m => !m.is_deleted);
}

/**
 * 查詢單個市集（檢查權限）
 * 
 * @param marketId - 市集 ID
 * @returns 市集對象（包含權限信息）
 */
export async function getAccessibleMarket(marketId: string): Promise<MarketWithAccess | null> {
  const { data, error } = await supabase
    .from('staff_accessible_markets')
    .select('*')
    .eq('id', marketId);

  if (error) {
    console.error('查詢市集失敗:', error);
    throw error;
  }

  // 如果沒有數據或數據為空
  if (!data || data.length === 0) {
    return null;
  }

  // 取第一筆記錄（優先 owner，其次 staff）
  const market = data.sort((a: any, b: any) => {
    if (a.access_type === 'owner') return -1;
    if (b.access_type === 'owner') return 1;
    return 0;
  })[0];

  // 檢查是否已刪除
  if (market && (market as any).is_deleted) {
    return null;
  }

  return market as MarketWithAccess;
}

/**
 * 查詢特定日期範圍的市集
 * 
 * @param startDate - 開始日期
 * @param endDate - 結束日期
 * @returns 市集列表
 */
export async function getAccessibleMarketsByDateRange(
  startDate: string,
  endDate: string
): Promise<MarketWithAccess[]> {
  const { data, error } = await supabase
    .from('staff_accessible_markets')
    .select('*')
    .gte('start_date', startDate)
    .lte('end_date', endDate)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('查詢市集失敗:', error);
    throw error;
  }

  // 在客戶端過濾已刪除的市集
  return ((data || []) as MarketWithAccess[]).filter(m => !m.is_deleted);
}

/**
 * 檢查用戶是否可以訪問某個市集
 * 
 * @param marketId - 市集 ID
 * @returns 是否可以訪問
 */
export async function canAccessMarket(marketId: string): Promise<boolean> {
  const market = await getAccessibleMarket(marketId);
  return market !== null;
}

/**
 * 獲取用戶作為老闆的市集
 * 
 * @returns 市集列表（只包含老闆身份的市集）
 */
export async function getOwnedMarkets(): Promise<MarketWithAccess[]> {
  const { data, error } = await supabase
    .from('staff_accessible_markets')
    .select('*')
    .eq('access_type', 'owner')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('查詢市集失敗:', error);
    throw error;
  }

  // 在客戶端過濾已刪除的市集
  return ((data || []) as MarketWithAccess[]).filter(m => !m.is_deleted);
}

/**
 * 獲取用戶作為員工可訪問的市集
 * 
 * @returns 市集列表（只包含員工身份的市集）
 */
export async function getStaffMarkets(): Promise<MarketWithAccess[]> {
  const { data, error } = await supabase
    .from('staff_accessible_markets')
    .select('*')
    .eq('access_type', 'staff')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('查詢市集失敗:', error);
    throw error;
  }

  // 在客戶端過濾已刪除的市集
  return ((data || []) as MarketWithAccess[]).filter(m => !m.is_deleted);
}

// ============================================
// 向後兼容的函數（建議逐步遷移到新函數）
// ============================================

/**
 * @deprecated 請使用 getAccessibleMarkets() 代替
 */
export async function getMarkets(): Promise<MarketWithAccess[]> {
  console.warn('getMarkets() 已過時，請使用 getAccessibleMarkets()');
  return getAccessibleMarkets();
}

/**
 * @deprecated 請使用 getAccessibleMarket() 代替
 */
export async function getMarket(marketId: string): Promise<MarketWithAccess | null> {
  console.warn('getMarket() 已過時，請使用 getAccessibleMarket()');
  return getAccessibleMarket(marketId);
}
