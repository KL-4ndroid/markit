/**
 * 商品查詢函數（支援員工模式）
 * 
 * 使用 staff_accessible_products 視圖自動處理權限
 */

import { supabase } from './client';
import { productAccessRowToLocal } from '@/lib/data-mappers';
import type { ProductWithAccess } from '@/types/staff';

function mapProducts(data: unknown[] | null): ProductWithAccess[] {
  return (data || []).map(row => productAccessRowToLocal(row as Record<string, unknown>));
}

/**
 * 查詢可訪問的商品（包含員工權限）
 * 
 * 此函數使用 staff_accessible_products 視圖，會自動：
 * - 返回用戶作為老闆的商品
 * - 返回用戶作為員工可訪問的商品
 * - 添加 access_type 和 permissions 欄位
 * 
 * @param marketId - 可選的市集 ID（過濾特定市集的商品）
 * @returns 商品列表（包含權限信息）
 */
export async function getAccessibleProducts(marketId?: string): Promise<ProductWithAccess[]> {
  let query = supabase
    .from('staff_accessible_products')
    .select('*')
    .is('deleted_at', null);  // 排除已刪除的商品

  if (marketId) {
    query = query.eq('market_id', marketId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('查詢商品失敗:', error);
    throw error;
  }

  return mapProducts(data);
}

/**
 * 查詢單個商品（檢查權限）
 * 
 * @param productId - 商品 ID
 * @returns 商品對象（包含權限信息）
 */
export async function getAccessibleProduct(productId: string): Promise<ProductWithAccess | null> {
  const { data, error } = await supabase
    .from('staff_accessible_products')
    .select('*')
    .eq('id', productId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 找不到記錄（可能無權限或不存在）
      return null;
    }
    console.error('查詢商品失敗:', error);
    throw error;
  }

  return productAccessRowToLocal(data as Record<string, unknown>);
}

/**
 * 檢查用戶是否可以訪問某個商品
 * 
 * @param productId - 商品 ID
 * @returns 是否可以訪問
 */
export async function canAccessProduct(productId: string): Promise<boolean> {
  const product = await getAccessibleProduct(productId);
  return product !== null;
}

/**
 * 獲取用戶作為老闆的商品
 * 
 * @param marketId - 可選的市集 ID
 * @returns 商品列表（只包含老闆身份的商品）
 */
export async function getOwnedProducts(marketId?: string): Promise<ProductWithAccess[]> {
  let query = supabase
    .from('staff_accessible_products')
    .select('*')
    .eq('access_type', 'owner')
    .is('deleted_at', null);

  if (marketId) {
    query = query.eq('market_id', marketId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('查詢商品失敗:', error);
    throw error;
  }

  return mapProducts(data);
}

/**
 * 獲取用戶作為員工可訪問的商品
 * 
 * @param marketId - 可選的市集 ID
 * @returns 商品列表（只包含員工身份的商品）
 */
export async function getStaffProducts(marketId?: string): Promise<ProductWithAccess[]> {
  let query = supabase
    .from('staff_accessible_products')
    .select('*')
    .eq('access_type', 'staff')
    .is('deleted_at', null);

  if (marketId) {
    query = query.eq('market_id', marketId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('查詢商品失敗:', error);
    throw error;
  }

  return mapProducts(data);
}

/**
 * 查詢有庫存的商品
 * 
 * @param marketId - 可選的市集 ID
 * @returns 商品列表
 */
export async function getProductsWithStock(marketId?: string): Promise<ProductWithAccess[]> {
  let query = supabase
    .from('staff_accessible_products')
    .select('*')
    .is('deleted_at', null)
    .gt('stock', 0);

  if (marketId) {
    query = query.eq('market_id', marketId);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    console.error('查詢商品失敗:', error);
    throw error;
  }

  return mapProducts(data);
}

/**
 * 查詢缺貨的商品
 * 
 * @param marketId - 可選的市集 ID
 * @returns 商品列表
 */
export async function getOutOfStockProducts(marketId?: string): Promise<ProductWithAccess[]> {
  let query = supabase
    .from('staff_accessible_products')
    .select('*')
    .is('deleted_at', null)
    .lte('stock', 0);

  if (marketId) {
    query = query.eq('market_id', marketId);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    console.error('查詢商品失敗:', error);
    throw error;
  }

  return mapProducts(data);
}

// ============================================
// 向後兼容的函數（建議逐步遷移到新函數）
// ============================================

/**
 * @deprecated 請使用 getAccessibleProducts() 代替
 */
export async function getProducts(marketId?: string): Promise<ProductWithAccess[]> {
  console.warn('getProducts() 已過時，請使用 getAccessibleProducts()');
  return getAccessibleProducts(marketId);
}

/**
 * @deprecated 請使用 getAccessibleProduct() 代替
 */
export async function getProduct(productId: string): Promise<ProductWithAccess | null> {
  console.warn('getProduct() 已過時，請使用 getAccessibleProduct()');
  return getAccessibleProduct(productId);
}
