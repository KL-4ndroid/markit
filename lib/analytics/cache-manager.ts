/**
 * Analytics Cache Manager - 分析系統快取管理器
 * 
 * 🎯 設計理念：
 * - Layer 1: localStorage（永久快取 - 已結束市集）
 * - Layer 2: sessionStorage（會話快取 - 比較性指標）
 * - Layer 3: WeakMap（記憶體快取 - 當前頁面）
 * 
 * 🔥 自動化機制：
 * - 偵測補登操作，自動標記需要重新計算
 * - 智能失效策略，確保數據即時性
 */

import type { Market } from '@/types/db';
import type { MarketMetrics, MarketHealthScore } from './types';
import { calculateMarketMetrics } from './metrics-engine';
import type { MarketPulseDB } from '@/lib/db';

// ==================== 快取版本管理 ====================

const CACHE_VERSION = 'v1.0';
const CACHE_PREFIX = `analytics_${CACHE_VERSION}_`;

// ==================== 補登追蹤 ====================

/**
 * 記錄市集的最後更新時間戳
 * 用於偵測補登操作
 */
interface MarketTimestamp {
  marketId: string;
  lastCalculated: number;  // 最後計算時間
  lastModified: number;    // 市集最後修改時間
  eventCount: number;      // 事件數量
}

/**
 * 檢查市集是否有新的補登記錄
 */
async function hasNewBackfillEntries(
  market: Market,
  db: MarketPulseDB
): Promise<boolean> {
  const timestampKey = `${CACHE_PREFIX}timestamp_${market.id}`;
  const cached = localStorage.getItem(timestampKey);
  
  if (!cached) return true; // 沒有快取，需要計算
  
  const timestamp: MarketTimestamp = JSON.parse(cached);
  
  // 檢查事件數量是否改變
  const currentEventCount = await db.events
    .where('market_id')
    .equals(market.id!)
    .count();
  
  // 如果事件數量增加，表示有新的補登
  if (currentEventCount > timestamp.eventCount) {
    console.log(`🔄 偵測到市集 ${market.name} 有新的補登記錄`);
    return true;
  }
  
  // 檢查市集數據是否被修改
  const currentModified = market.updated_at 
    ? new Date(market.updated_at).getTime() 
    : Date.now();
  
  if (currentModified > timestamp.lastModified) {
    console.log(`🔄 偵測到市集 ${market.name} 數據已更新`);
    return true;
  }
  
  return false;
}

/**
 * 更新市集時間戳
 */
async function updateMarketTimestamp(
  market: Market,
  db: MarketPulseDB
): Promise<void> {
  const timestampKey = `${CACHE_PREFIX}timestamp_${market.id}`;
  
  const eventCount = await db.events
    .where('market_id')
    .equals(market.id!)
    .count();
  
  const timestamp: MarketTimestamp = {
    marketId: market.id!,
    lastCalculated: Date.now(),
    lastModified: market.updated_at 
      ? new Date(market.updated_at).getTime() 
      : Date.now(),
    eventCount,
  };
  
  localStorage.setItem(timestampKey, JSON.stringify(timestamp));
}

// ==================== 快取管理器 ====================

export class AnalyticsCache {
  private memoryCache: WeakMap<Market, MarketMetrics>;
  
  constructor() {
    this.memoryCache = new WeakMap();
  }
  
  // ==================== Layer 1: 永久快取（localStorage）====================
  
  /**
   * 檢查市集是否已結束
   */
  private isMarketCompleted(market: Market): boolean {
    return market.status === 'completed';
  }
  
  /**
   * 取得市集基礎指標（智能快取）
   * 
   * 🔥 自動化機制：
   * - 已結束市集：從 localStorage 讀取
   * - 偵測到補登：自動重新計算
   * - 進行中市集：每次重新計算
   */
  async getMarketMetrics(
    market: Market,
    db: MarketPulseDB,
    allMarkets?: Market[]
  ): Promise<MarketMetrics> {
    // Layer 3: 檢查記憶體快取
    const memCached = this.memoryCache.get(market);
    if (memCached) {
      return memCached;
    }
    
    const cacheKey = `${CACHE_PREFIX}metrics_${market.id}`;
    
    // Layer 1: 檢查 localStorage 快取（僅限已結束市集）
    if (this.isMarketCompleted(market)) {
      // 🔥 檢查是否有新的補登記錄
      const hasNewData = await hasNewBackfillEntries(market, db);
      
      if (!hasNewData) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const metrics = JSON.parse(cached);
            this.memoryCache.set(market, metrics);
            console.log(`✅ 從快取讀取市集指標: ${market.name}`);
            return metrics;
          } catch (error) {
            console.error('快取解析失敗:', error);
            localStorage.removeItem(cacheKey);
          }
        }
      } else {
        // 有新的補登，清除舊快取
        console.log(`🔄 清除市集 ${market.name} 的舊快取（偵測到補登）`);
        localStorage.removeItem(cacheKey);
      }
    }
    
    // 計算指標
    console.log(`🔢 計算市集指標: ${market.name}`);
    const metrics = await calculateMarketMetrics(market, {
      db,
      allMarkets,
      enableBatchEntryCorrection: true,
    });
    
    // 儲存到記憶體快取
    this.memoryCache.set(market, metrics);
    
    // 如果市集已結束，儲存到 localStorage
    if (this.isMarketCompleted(market)) {
      localStorage.setItem(cacheKey, JSON.stringify(metrics));
      
      // 更新時間戳
      await updateMarketTimestamp(market, db);
      
      console.log(`💾 已快取市集指標: ${market.name}`);
    }
    
    return metrics;
  }
  
  /**
   * 批次取得市集指標（優化版）
   */
  async getBatchMarketMetrics(
    markets: Market[],
    db: MarketPulseDB
  ): Promise<Array<{ market: Market; marketId: string; metrics: MarketMetrics }>> {
    const results = [];
    
    for (const market of markets) {
      const metrics = await this.getMarketMetrics(market, db, markets);
      results.push({
        market,
        marketId: market.id!,
        metrics,
      });
    }
    
    return results;
  }
  
  // ==================== Layer 2: 會話快取（sessionStorage）====================
  
  /**
   * 取得健康評分（會話快取）
   */
  getHealthScores(marketCount: number): MarketHealthScore[] | null {
    const cacheKey = `${CACHE_PREFIX}health_scores_${marketCount}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        
        // 快取有效期：5 分鐘
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          console.log(`✅ 從快取讀取健康評分 (${marketCount} 個市集)`);
          return data;
        }
      } catch (error) {
        console.error('快取解析失敗:', error);
        sessionStorage.removeItem(cacheKey);
      }
    }
    
    return null;
  }
  
  /**
   * 儲存健康評分
   */
  setHealthScores(marketCount: number, scores: MarketHealthScore[]): void {
    const cacheKey = `${CACHE_PREFIX}health_scores_${marketCount}`;
    
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: scores,
      timestamp: Date.now(),
    }));
    
    console.log(`💾 已快取健康評分 (${marketCount} 個市集)`);
  }
  
  /**
   * 取得象限分析（會話快取）
   */
  getQuadrantData(marketCount: number): any | null {
    const cacheKey = `${CACHE_PREFIX}quadrant_${marketCount}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        
        // 快取有效期：5 分鐘
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          console.log(`✅ 從快取讀取象限分析 (${marketCount} 個市集)`);
          return data;
        }
      } catch (error) {
        console.error('快取解析失敗:', error);
        sessionStorage.removeItem(cacheKey);
      }
    }
    
    return null;
  }
  
  /**
   * 儲存象限分析
   */
  setQuadrantData(marketCount: number, data: any): void {
    const cacheKey = `${CACHE_PREFIX}quadrant_${marketCount}`;
    
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
    
    console.log(`💾 已快取象限分析 (${marketCount} 個市集)`);
  }
  
  /**
   * 取得每日收入（日期範圍快取）
   */
  getDailyRevenue(
    startDate: string,
    endDate: string,
    marketCount: number
  ): Map<string, number> | null {
    const cacheKey = `${CACHE_PREFIX}daily_revenue_${startDate}_${endDate}_${marketCount}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { data } = JSON.parse(cached);
        console.log(`✅ 從快取讀取每日收入 (${startDate} ~ ${endDate})`);
        return new Map(Object.entries(data));
      } catch (error) {
        console.error('快取解析失敗:', error);
        sessionStorage.removeItem(cacheKey);
      }
    }
    
    return null;
  }
  
  /**
   * 儲存每日收入
   */
  setDailyRevenue(
    startDate: string,
    endDate: string,
    marketCount: number,
    revenueMap: Map<string, number>
  ): void {
    const cacheKey = `${CACHE_PREFIX}daily_revenue_${startDate}_${endDate}_${marketCount}`;
    
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: Object.fromEntries(revenueMap),
    }));
    
    console.log(`💾 已快取每日收入 (${startDate} ~ ${endDate})`);
  }
  
  /**
   * 取得商品親和力（市集組合快取）
   */
  getAffinityPairs(marketIds: string[]): any[] | null {
    const sortedIds = marketIds.sort().join(',');
    const hash = this.hashCode(sortedIds);
    const cacheKey = `${CACHE_PREFIX}affinity_${hash}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        
        // 快取有效期：10 分鐘
        if (Date.now() - timestamp < 10 * 60 * 1000) {
          console.log(`✅ 從快取讀取商品親和力 (${marketIds.length} 個市集)`);
          return data;
        }
      } catch (error) {
        console.error('快取解析失敗:', error);
        sessionStorage.removeItem(cacheKey);
      }
    }
    
    return null;
  }
  
  /**
   * 儲存商品親和力
   */
  setAffinityPairs(marketIds: string[], pairs: any[]): void {
    const sortedIds = marketIds.sort().join(',');
    const hash = this.hashCode(sortedIds);
    const cacheKey = `${CACHE_PREFIX}affinity_${hash}`;
    
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: pairs,
      timestamp: Date.now(),
    }));
    
    console.log(`💾 已快取商品親和力 (${marketIds.length} 個市集)`);
  }
  
  // ==================== 快取失效管理 ====================
  
  /**
   * 清除特定市集的快取（補登時使用）
   */
  invalidateMarket(marketId: string): void {
    const metricsKey = `${CACHE_PREFIX}metrics_${marketId}`;
    const timestampKey = `${CACHE_PREFIX}timestamp_${marketId}`;
    
    localStorage.removeItem(metricsKey);
    localStorage.removeItem(timestampKey);
    
    console.log(`🗑️ 已清除市集 ${marketId} 的快取`);
  }
  
  /**
   * 清除所有會話快取（新增市集時使用）
   */
  invalidateSessionCache(): void {
    const keys = Object.keys(sessionStorage);
    let count = 0;
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
        count++;
      }
    });
    
    console.log(`🗑️ 已清除 ${count} 個會話快取`);
  }
  
  /**
   * 清除日期相關快取（切換日期範圍時使用）
   */
  invalidateDateRangeCache(): void {
    const keys = Object.keys(sessionStorage);
    let count = 0;
    
    keys.forEach(key => {
      if (key.startsWith(`${CACHE_PREFIX}daily_revenue_`)) {
        sessionStorage.removeItem(key);
        count++;
      }
    });
    
    console.log(`🗑️ 已清除 ${count} 個日期範圍快取`);
  }
  
  /**
   * 清除所有快取（重置時使用）
   */
  clearAllCache(): void {
    // 清除 localStorage
    const localKeys = Object.keys(localStorage);
    localKeys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    
    // 清除 sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log(`🗑️ 已清除所有分析快取`);
  }
  
  // ==================== 工具函數 ====================
  
  /**
   * 簡單的字串 hash 函數
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  /**
   * 取得快取統計資訊
   */
  getCacheStats(): {
    localStorage: { count: number; size: number };
    sessionStorage: { count: number; size: number };
  } {
    const getStorageStats = (storage: Storage) => {
      const keys = Object.keys(storage).filter(key => key.startsWith(CACHE_PREFIX));
      const size = keys.reduce((total, key) => {
        return total + (storage.getItem(key)?.length || 0);
      }, 0);
      
      return { count: keys.length, size };
    };
    
    return {
      localStorage: getStorageStats(localStorage),
      sessionStorage: getStorageStats(sessionStorage),
    };
  }
}

// ==================== 單例模式 ====================

let cacheInstance: AnalyticsCache | null = null;

/**
 * 取得快取管理器實例（單例）
 */
export function getAnalyticsCache(): AnalyticsCache {
  if (!cacheInstance) {
    cacheInstance = new AnalyticsCache();
  }
  return cacheInstance;
}

/**
 * 重置快取管理器（測試用）
 */
export function resetAnalyticsCache(): void {
  if (cacheInstance) {
    cacheInstance.clearAllCache();
  }
  cacheInstance = null;
}
