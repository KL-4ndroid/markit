/**
 * Use Analytics Cache Hook
 * 
 * 🎯 功能：
 * - 監聽補登操作，自動清除相關快取
 * - 提供快取管理介面
 * - 顯示快取統計資訊
 */

import { useEffect } from 'react';
import { getAnalyticsCache } from '@/lib/analytics';
import { db } from '@/lib/db';

/**
 * 監聽補登操作的 Hook
 * 
 * 當偵測到補登操作時，自動清除相關市集的快取
 */
export function useAnalyticsCacheInvalidation() {
  useEffect(() => {
    // 監聽 Dexie 的變更事件
    const hookFunction = (primKey: any, obj: any, transaction: any) => {
      // 檢查是否為補登操作
      const event = obj as any;
      
      if (event.type === 'deal_closed' && event.market_id) {
        // 取得市集資訊
        db.markets.get(event.market_id).then(market => {
          if (market && market.status === 'completed') {
            // 如果是已結束的市集，清除快取
            const cache = getAnalyticsCache();
            cache.invalidateMarket(market.id!);
            
            console.log(`🔄 偵測到補登操作，已清除市集 ${market.name} 的快取`);
          }
        });
      }
    };
    
    // 註冊 hook 並保存返回的 unsubscribe 函數
    db.events.hook('creating', hookFunction);
    
    return () => {
      // 清理訂閱
      db.events.hook('creating').unsubscribe(hookFunction);
    };
  }, []);
}

/**
 * 快取管理 Hook
 * 
 * 提供快取管理功能和統計資訊
 */
export function useAnalyticsCache() {
  const cache = getAnalyticsCache();
  
  // 取得快取統計
  const getCacheStats = () => {
    return cache.getCacheStats();
  };
  
  // 清除所有快取
  const clearAllCache = () => {
    cache.clearAllCache();
    console.log('🗑️ 已清除所有分析快取');
  };
  
  // 清除會話快取
  const clearSessionCache = () => {
    cache.invalidateSessionCache();
    console.log('🗑️ 已清除會話快取');
  };
  
  // 清除特定市集快取
  const clearMarketCache = (marketId: string) => {
    cache.invalidateMarket(marketId);
    console.log(`🗑️ 已清除市集 ${marketId} 的快取`);
  };
  
  return {
    cache,
    getCacheStats,
    clearAllCache,
    clearSessionCache,
    clearMarketCache,
  };
}
