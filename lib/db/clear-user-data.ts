/**
 * 用戶數據清除工具
 * 
 * 用於在登出或切換用戶時清除特定用戶的數據
 * ✅ 支援完整清除和選擇性清除
 */

import { db } from './index';

/**
 * 清除特定用戶的數據
 * 
 * @param userId - 要清除的用戶 ID（如果為 null，清除所有數據）
 * @param options - 清除選項
 */
export async function clearUserData(
  userId: string | null,
  options: {
    clearMarkets?: boolean;
    clearProducts?: boolean;
    clearEvents?: boolean;
    clearStats?: boolean;
  } = {}
): Promise<void> {
  const {
    clearMarkets = true,
    clearProducts = true,
    clearEvents = true,
    clearStats = true,
  } = options;

  console.log('🧹 開始清除用戶數據...', {
    userId: userId?.substring(0, 8) || 'ALL',
    options,
  });

  try {
    // 如果 userId 為 null，清除所有數據
    if (!userId) {
      console.log('⚠️ 清除所有數據（無用戶 ID）');
      
      if (clearMarkets) await db.markets.clear();
      if (clearProducts) await db.products.clear();
      if (clearEvents) await db.events.clear();
      if (clearStats) await db.dailyStats.clear();
      
      console.log('✅ 所有數據已清除');
      return;
    }

    // 清除特定用戶的數據
    const deletedCount = {
      markets: 0,
      products: 0,
      events: 0,
      stats: 0,
    };

    // 1. 清除市集（owner_id = userId）
    if (clearMarkets) {
      const marketsToDelete = await db.markets
        .where('owner_id')
        .equals(userId)
        .toArray();
      
      for (const market of marketsToDelete) {
        if (market.id) {
          await db.markets.delete(market.id);
          deletedCount.markets++;
        }
      }
    }

    // 2. 清除商品（owner_id = userId）
    if (clearProducts) {
      const productsToDelete = await db.products
        .where('owner_id')
        .equals(userId)
        .toArray();
      
      for (const product of productsToDelete) {
        if (product.id) {
          await db.products.delete(product.id);
          deletedCount.products++;
        }
      }
    }

    // 3. 清除事件（actor_id = userId）
    if (clearEvents) {
      const eventsToDelete = await db.events
        .where('actor_id')
        .equals(userId)
        .toArray();
      
      for (const event of eventsToDelete) {
        if (event.id) {
          await db.events.delete(event.id);
          deletedCount.events++;
        }
      }
    }

    // 4. 清除統計（關聯到已刪除的市集）
    if (clearStats && clearMarkets) {
      const allStats = await db.dailyStats.toArray();
      
      for (const stat of allStats) {
        // 檢查市集是否還存在
        if (stat.marketId) {
          const marketExists = await db.markets.get(stat.marketId);
          if (!marketExists && stat.id) {
            await db.dailyStats.delete(stat.id);
            deletedCount.stats++;
          }
        }
      }
    }

    console.log('✅ 用戶數據清除完成', deletedCount);
  } catch (error) {
    console.error('❌ 清除用戶數據失敗:', error);
    throw error;
  }
}

/**
 * 清除非當前用戶的數據
 * 
 * @param currentUserId - 當前用戶 ID
 */
export async function clearOtherUsersData(currentUserId: string): Promise<void> {
  console.log('🧹 清除其他用戶的數據...', {
    currentUserId: currentUserId.substring(0, 8),
  });

  try {
    const deletedCount = {
      markets: 0,
      products: 0,
      events: 0,
      stats: 0,
    };

    // 1. 清除其他用戶的市集
    const allMarkets = await db.markets.toArray();
    for (const market of allMarkets) {
      if (market.owner_id && market.owner_id !== currentUserId && market.owner_id !== 'local') {
        if (market.id) {
          await db.markets.delete(market.id);
          deletedCount.markets++;
        }
      }
    }

    // 2. 清除其他用戶的商品
    const allProducts = await db.products.toArray();
    for (const product of allProducts) {
      if (product.owner_id && product.owner_id !== currentUserId && product.owner_id !== 'local') {
        if (product.id) {
          await db.products.delete(product.id);
          deletedCount.products++;
        }
      }
    }

    // 3. 清除其他用戶的事件
    const allEvents = await db.events.toArray();
    for (const event of allEvents) {
      if (event.actor_id && event.actor_id !== currentUserId && event.actor_id !== 'local') {
        if (event.id) {
          await db.events.delete(event.id);
          deletedCount.events++;
        }
      }
    }

    // 4. 清除孤立的統計數據
    const allStats = await db.dailyStats.toArray();
    for (const stat of allStats) {
      if (stat.marketId) {
        const marketExists = await db.markets.get(stat.marketId);
        if (!marketExists && stat.id) {
          await db.dailyStats.delete(stat.id);
          deletedCount.stats++;
        }
      }
    }

    console.log('✅ 其他用戶數據清除完成', deletedCount);
  } catch (error) {
    console.error('❌ 清除其他用戶數據失敗:', error);
    throw error;
  }
}

/**
 * 驗證數據隔離性
 * 
 * @param expectedUserId - 預期的用戶 ID
 * @returns 是否存在其他用戶的數據
 */
export async function validateDataIsolation(expectedUserId: string): Promise<{
  isValid: boolean;
  violations: string[];
}> {
  const violations: string[] = [];

  try {
    // 檢查市集
    const foreignMarkets = await db.markets
      .filter(m => Boolean(m.owner_id && m.owner_id !== expectedUserId && m.owner_id !== 'local'))
      .toArray();
    
    if (foreignMarkets.length > 0) {
      violations.push(`發現 ${foreignMarkets.length} 個其他用戶的市集`);
    }

    // 檢查商品
    const foreignProducts = await db.products
      .filter(p => Boolean(p.owner_id && p.owner_id !== expectedUserId && p.owner_id !== 'local'))
      .toArray();
    
    if (foreignProducts.length > 0) {
      violations.push(`發現 ${foreignProducts.length} 個其他用戶的商品`);
    }

    // 檢查事件
    const foreignEvents = await db.events
      .filter(e => Boolean(e.actor_id && e.actor_id !== expectedUserId && e.actor_id !== 'local'))
      .toArray();
    
    if (foreignEvents.length > 0) {
      violations.push(`發現 ${foreignEvents.length} 個其他用戶的事件`);
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  } catch (error) {
    console.error('❌ 驗證數據隔離性失敗:', error);
    return {
      isValid: false,
      violations: ['驗證過程發生錯誤'],
    };
  }
}
