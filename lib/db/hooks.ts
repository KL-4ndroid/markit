/**
 * Market Pulse - 資料庫 React Hooks
 * 
 * 本檔案提供 React Hooks 供組件使用
 * 使用 Dexie React Hooks 實現響應式資料查詢
 */

'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './index';
import { recordEvent } from './events';
import type {
  Product,
  Settings,
  MarketStatus,
  MarketCreatedPayload,
  ProductCreatedPayload,
  InteractionType,
  DealClosedPayload,
} from '@/types/db';

// ==================== 市集相關 Hooks ====================

/**
 * 查詢所有市集
 * 
 * @param options - 查詢選項
 * @returns 市集列表（自動過濾已刪除的市集）
 */
export function useMarkets(options?: {
  status?: MarketStatus;
  orderBy?: 'startDate' | 'createdAt';
  order?: 'asc' | 'desc';
  includeDeleted?: boolean;  // ✅ 新增：是否包含已刪除的市集（預設 false）
}) {
  return useLiveQuery(async () => {
    try {
      let query = db.markets.toCollection();
      
      // 篩選狀態
      if (options?.status) {
        query = db.markets.where('status').equals(options.status);
      }
      
      // 排序
      const markets = await query.toArray();
      
      // ✅ 過濾已刪除的市集（除非明確要求包含）
      const filteredMarkets = options?.includeDeleted 
        ? markets 
        : markets.filter(m => !m.isDeleted);
      
      const orderBy = options?.orderBy || 'startDate';
      const order = options?.order || 'desc';
      
      return filteredMarkets.sort((a, b) => {
        const aValue = orderBy === 'startDate' ? new Date(a.startDate).getTime() : a.createdAt;
        const bValue = orderBy === 'startDate' ? new Date(b.startDate).getTime() : b.createdAt;
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      });
    } catch (error) {
      console.error('❌ useMarkets 查詢失敗:', error);
      return []; // 返回空數組而不是 undefined
    }
  }, [options?.status, options?.orderBy, options?.order, options?.includeDeleted]) || []; // 確保永遠不返回 undefined
}

/**
 * 查詢單一市集（UUID 版本）
 * 
 * @param id - 市集 ID（UUID）
 * @returns 市集資料
 */
export function useMarket(id: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!id) return undefined;
      return await db.markets.get(id);
    },
    [id]
  );
}

/**
 * 查詢即將到來的市集（包含進行中的市集）
 * 
 * @param limit - 限制數量
 * @returns 市集列表（自動過濾已刪除的市集）
 */
export function useUpcomingMarkets(limit: number = 5) {
  return useLiveQuery(async () => {
    const now = new Date().toISOString().split('T')[0];
    
    const markets = await db.markets.toArray();
    
    return markets
      .filter(m => {
        // 過濾已刪除、已取消、已完成的市集
        if (m.isDeleted || m.status === 'cancelled' || m.status === 'completed') {
          return false;
        }
        
        // ✅ 修復：檢查市集日期區間是否包含今天或未來
        // 只要 endDate >= 今天，就應該顯示
        return m.endDate >= now;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, limit);
  }, [limit]);
}

/**
 * 建立市集（UUID 版本）
 * 
 * @param data - 市集資料
 * @returns 市集 ID（UUID）
 */
export async function createMarket(data: MarketCreatedPayload): Promise<string> {
  return await recordEvent('market_created', data);
}

/**
 * 更新市集狀態（UUID 版本）
 * 
 * @param marketId - 市集 ID（UUID）
 * @param newStatus - 新狀態
 * @param reason - 變更原因（可選）
 */
export async function updateMarketStatus(
  marketId: string,
  newStatus: MarketStatus,
  reason?: string
): Promise<void> {
  const market = await db.markets.get(marketId);
  if (!market) {
    throw new Error(`市集不存在：ID ${marketId.substring(0, 8)}...`);
  }
  
  await recordEvent('market_status_changed', {
    market_id: marketId,  // ✅ 統一使用 market_id
    oldStatus: market.status,
    newStatus,
    reason,
  });
}

/**
 * 開始市集營業（UUID 版本）
 * 
 * @param marketId - 市集 ID（UUID）
 */
export async function startMarket(marketId: string): Promise<void> {
  await recordEvent('market_started', { market_id: marketId });  // ✅ 統一使用 market_id
}

/**
 * 結束市集營業（UUID 版本）
 * 
 * @param marketId - 市集 ID（UUID）
 */
export async function endMarket(marketId: string): Promise<void> {
  await recordEvent('market_ended', { market_id: marketId });  // ✅ 統一使用 market_id
}

/**
 * 刪除市集（軟刪除，UUID 版本）
 * 
 * @param marketId - 市集 ID（UUID）
 * @param reason - 刪除原因（可選）
 */
export async function deleteMarket(marketId: string, reason?: string): Promise<void> {
  await recordEvent('market_deleted', { marketId, reason });
}

// ==================== 商品相關 Hooks ====================

/**
 * 查詢所有商品
 * 
 * @param options - 查詢選項
 * @returns 商品列表
 */
export function useProducts(options?: {
  category?: string;
  isActive?: boolean;
}) {
  return useLiveQuery(async () => {
    let query = db.products.toCollection();
    
    if (options?.category) {
      query = db.products.where('category').equals(options.category);
    }
    
    const products = await query.toArray();
    
    if (options?.isActive !== undefined) {
      return products.filter(p => p.isActive === options.isActive);
    }
    
    return products;
  }, [options?.category, options?.isActive]);
}

/**
 * 查詢單一商品（UUID 版本）
 * 
 * @param id - 商品 ID（UUID）
 * @returns 商品資料
 */
export function useProduct(id: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!id) return undefined;
      return await db.products.get(id);
    },
    [id]
  );
}

/**
 * 建立商品（UUID 版本）
 * 
 * @param data - 商品資料
 * @returns 商品 ID（UUID）
 */
export async function createProduct(data: ProductCreatedPayload): Promise<string> {
  return await recordEvent('product_created', data);
}

/**
 * 更新商品（UUID 版本）
 * 
 * @param productId - 商品 ID（UUID）
 * @param updates - 更新資料
 */
export async function updateProduct(
  productId: string,
  updates: Partial<Product>
): Promise<void> {
  await recordEvent('product_updated', { productId, updates });
}

/**
 * 刪除商品（軟刪除，UUID 版本）
 * 
 * @param productId - 商品 ID（UUID）
 */
export async function deleteProduct(productId: string): Promise<void> {
  await recordEvent('product_deleted', { productId });
}

// ==================== 互動與交易相關 Hooks ====================

/**
 * 記錄互動（UUID 版本）
 * 
 * @param marketId - 市集 ID（UUID）
 * @param type - 互動類型
 * @param productIds - 相關商品 ID（UUID，可選）
 * @param notes - 備註（可選）
 */
export async function recordInteraction(
  marketId: string,
  type: InteractionType,
  productIds?: string[],
  notes?: string
): Promise<void> {
  await recordEvent('interaction_recorded', {
    market_id: marketId,  // ✅ 統一使用 market_id
    type,
    productIds,
    notes,
  });
}

/**
 * 記錄成交
 * 
 * @param data - 成交資料
 * @param dealDate - 可選：指定交易日期（用於補登收入），格式：YYYY-MM-DD
 */
export async function recordDeal(data: DealClosedPayload, dealDate?: string): Promise<void> {
  const isBackfill = !!dealDate || data.isBackfill;
  const isManualEntry = data.isManualEntry || false;
  
  // ✅ 補登時跳過庫存檢查（簡化模式或完整模式）
  if (!isBackfill && !isManualEntry) {
    // 結帳前庫存檢查（只在正常交易時檢查）
    for (const item of data.items || []) {
      const product = await db.products.get(item.productId);
      
      if (!product) {
        throw new Error(`商品不存在：ID ${item.productId}`);
      }
      
      // 只檢查「有限庫存」商品
      if (!product.unlimitedStock) {
        const currentStock = product.stock || 0;
        
        if (currentStock < item.quantity) {
          throw new Error(
            `${product.name} 庫存不足！\n目前庫存：${currentStock}，需要：${item.quantity}`
          );
        }
      }
    }
  }
  
  // ✅ 將 marketId 轉換為 market_id（統一使用底線式）
  // ✅ 添加交易日期（用於多天市集的每日收入記錄）
  const payload = {
    ...data,
    market_id: data.marketId,
    dealDate: dealDate || data.dealDate || new Date().toISOString().split('T')[0],
    isBackfill: isBackfill,
  };
  
  // 庫存檢查通過，記錄成交事件
  await recordEvent('deal_closed', payload);
}

// ==================== 統計相關 Hooks ====================

/**
 * 查詢每日統計
 * 
 * @param date - 日期（YYYY-MM-DD）
 * @returns 每日統計
 */
export function useDailyStats(date: string) {
  return useLiveQuery(
    async () => await db.dailyStats.get(date),
    [date]
  );
}

/**
 * 查詢日期範圍內的統計
 * 
 * @param startDate - 開始日期
 * @param endDate - 結束日期
 * @returns 統計列表
 */
export function useDateRangeStats(startDate: string, endDate: string) {
  return useLiveQuery(async () => {
    return await db.dailyStats
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }, [startDate, endDate]);
}

/**
 * 查詢本月統計摘要
 * 
 * @returns 本月統計（自動過濾已刪除的市集）
 */
export function useMonthlyStats() {
  return useLiveQuery(async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;
    
    // ✅ 修復：直接從 markets 表統計本月的市集
    // 原因：dailyStats 按日期分組，同一天多個市集會被覆蓋
    const markets = await db.markets
      .where('startDate')
      .between(startDate, endDate, true, true)
      .toArray();
    
    // ✅ 過濾已刪除的市集
    const activeMarkets = markets.filter(m => !m.isDeleted);
    
    // 彙總統計
    const summary = {
      totalRevenue: 0,
      totalProfit: 0,
      totalDeals: 0,
      totalInteractions: 0,
      marketCount: activeMarkets.length,  // ✅ 直接使用市集數量（已過濾刪除的）
    };
    
    // ✅ 從 markets 表累加統計（更準確）
    for (const market of activeMarkets) {
      summary.totalRevenue += market.totalRevenue || 0;
      summary.totalProfit += market.totalProfit || 0;
      summary.totalDeals += market.totalDeals || 0;
      summary.totalInteractions += market.totalInteractions || 0;
    }
    
    return summary;
  }, []);
}

// ==================== 設定相關 Hooks ====================

/**
 * 查詢設定
 * 
 * @returns 設定資料
 */
export function useSettings() {
  return useLiveQuery(async () => {
    const settings = await db.settings.toArray();
    return settings[0]; // 只有一筆設定記錄
  });
}

/**
 * 更新設定
 * 
 * @param updates - 更新資料
 */
export async function updateSettings(updates: Partial<Settings>): Promise<void> {
  await recordEvent('settings_updated', updates);
}

// ==================== 事件歷史 Hooks ====================

/**
 * 查詢所有事件
 * 
 * @returns 事件列表
 */
export function useEvents() {
  return useLiveQuery(async () => {
    return await db.events.toArray();
  });
}

/**
 * 查詢最近的事件
 * 
 * @param limit - 限制數量
 * @returns 事件列表
 */
export function useRecentEvents(limit: number = 20) {
  return useLiveQuery(async () => {
    return await db.events
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  }, [limit]);
}

/**
 * 查詢特定市集的事件（UUID 版本）
 * 
 * @param marketId - 市集 ID（UUID）
 * @returns 事件列表
 */
export function useMarketEvents(marketId: string) {
  return useLiveQuery(async () => {
    // 使用索引查詢（更高效）
    return await db.events.where('market_id').equals(marketId).toArray();
  }, [marketId]);
}

// ==================== 資料庫統計 Hooks ====================

/**
 * 查詢資料庫統計
 * 
 * @returns 資料庫統計資訊
 */
export function useDatabaseStats() {
  return useLiveQuery(async () => {
    return {
      events: await db.events.count(),
      markets: await db.markets.count(),
      products: await db.products.count(),
      dailyStats: await db.dailyStats.count(),
    };
  });
}
