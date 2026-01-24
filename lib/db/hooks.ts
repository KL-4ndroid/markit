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
  Market,
  Product,
  DailyStats,
  Settings,
  Event,
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
 * @returns 市集列表
 */
export function useMarkets(options?: {
  status?: MarketStatus;
  orderBy?: 'startDate' | 'createdAt';
  order?: 'asc' | 'desc';
}) {
  return useLiveQuery(async () => {
    let query = db.markets.toCollection();
    
    // 篩選狀態
    if (options?.status) {
      query = db.markets.where('status').equals(options.status);
    }
    
    // 排序
    const markets = await query.toArray();
    const orderBy = options?.orderBy || 'startDate';
    const order = options?.order || 'desc';
    
    return markets.sort((a, b) => {
      const aValue = orderBy === 'startDate' ? new Date(a.startDate).getTime() : a.createdAt;
      const bValue = orderBy === 'startDate' ? new Date(b.startDate).getTime() : b.createdAt;
      return order === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [options?.status, options?.orderBy, options?.order]);
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
 * 查詢即將到來的市集
 * 
 * @param limit - 限制數量
 * @returns 市集列表
 */
export function useUpcomingMarkets(limit: number = 5) {
  return useLiveQuery(async () => {
    const now = new Date().toISOString().split('T')[0];
    
    const markets = await db.markets
      .where('startDate')
      .aboveOrEqual(now)
      .toArray();
    
    return markets
      .filter(m => m.status !== 'cancelled' && m.status !== 'completed')
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
 */
export async function recordDeal(data: DealClosedPayload): Promise<void> {
  // 結帳前庫存檢查
  for (const item of data.items) {
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
  
  // ✅ 將 marketId 轉換為 market_id（統一使用底線式）
  const payload = {
    ...data,
    market_id: data.marketId,
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
 * @returns 本月統計
 */
export function useMonthlyStats() {
  return useLiveQuery(async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-31`;
    
    const stats = await db.dailyStats
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
    
    // 彙總統計
    const summary = {
      totalRevenue: 0,
      totalProfit: 0,
      totalDeals: 0,
      totalInteractions: 0,
      marketCount: 0,
    };
    
    const marketIds = new Set<string>();
    
    for (const stat of stats) {
      summary.totalRevenue += stat.revenue;
      summary.totalProfit += stat.profit;
      summary.totalDeals += stat.dealCount;
      summary.totalInteractions += stat.touchCount + stat.inquiryCount;
      
      if (stat.marketId) {
        marketIds.add(stat.marketId);
      }
    }
    
    summary.marketCount = marketIds.size;
    
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
