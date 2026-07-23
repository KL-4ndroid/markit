/**
 * 用戶數據清除工具
 * 
 * 用於在登出或切換用戶時清除特定用戶的數據
 * ✅ 支援完整清除和選擇性清除
 */

import { db } from './index';
import { clearLastSyncTimestamp } from '@/lib/sync/sync-cursor-service';
import type { Event, Market, Product } from '@/types/db';

export interface ClearStaffLocalProjectionsOptions {
  staffUserId: string;
  ownerId?: string;
}

export interface ClearStaffLocalProjectionsResult {
  markets: number;
  products: number;
  events: number;
  dailyStats: number;
}

type StaffProjectionRecord = {
  access_type?: unknown;
  relationship_owner_id?: unknown;
  owner_id?: unknown;
};

export function isStaffLocalProjectionRecord(
  record: StaffProjectionRecord | null | undefined,
  ownerId?: string
): boolean {
  if (!record) return false;
  if (record.access_type !== 'staff') return false;
  if (!ownerId) return true;
  return record.relationship_owner_id === ownerId || record.owner_id === ownerId;
}

function getEventProjectionMarketId(event: Event): string | undefined {
  const payload = event.payload;
  if (event.market_id) return event.market_id;
  if (payload && typeof payload === 'object') {
    const record = payload as { market_id?: unknown; marketId?: unknown };
    if (typeof record.market_id === 'string') return record.market_id;
    if (typeof record.marketId === 'string') return record.marketId;
  }
  return undefined;
}

/**
 * Clear staff-scoped local projection rows after a role downgrade.
 *
 * P5-4c intentionally avoids a full database wipe:
 * - clears staff projection rows from markets / products
 * - clears events and dailyStats tied to those staff markets
 * - preserves settings and syncQueue
 * - does not delete the IndexedDB database or reload the page
 */
export async function clearStaffLocalProjections(
  options: ClearStaffLocalProjectionsOptions
): Promise<ClearStaffLocalProjectionsResult> {
  const { staffUserId, ownerId } = options;
  const deleted: ClearStaffLocalProjectionsResult = {
    markets: 0,
    products: 0,
    events: 0,
    dailyStats: 0,
  };

  console.log('[clearStaffLocalProjections] clearing staff local projections', {
    staffUserId: staffUserId.slice(0, 8),
    ownerId: ownerId?.slice(0, 8),
  });

  await db.transaction('rw', [db.markets, db.products, db.events, db.dailyStats], async () => {
    const staffMarkets = await db.markets
      .filter((market: Market) => isStaffLocalProjectionRecord(market, ownerId))
      .toArray();
    const staffMarketIds = new Set(
      staffMarkets
        .map((market) => market.id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    const staffProducts = await db.products
      .filter((product: Product) => {
        if (isStaffLocalProjectionRecord(product, ownerId)) return true;
        return Boolean(product.market_id && staffMarketIds.has(product.market_id));
      })
      .toArray();

    const staffEvents = await db.events
      .filter((event: Event) => {
        const marketId = getEventProjectionMarketId(event);
        return Boolean(marketId && staffMarketIds.has(marketId));
      })
      .toArray();

    const staffStats = await db.dailyStats
      .filter((stat) => Boolean(stat.marketId && staffMarketIds.has(stat.marketId)))
      .toArray();

    for (const event of staffEvents) {
      if (event.id) {
        await db.events.delete(event.id);
        deleted.events++;
      }
    }

    for (const stat of staffStats) {
      if (stat.id !== undefined) {
        await db.dailyStats.delete(stat.id);
        deleted.dailyStats++;
      }
    }

    for (const product of staffProducts) {
      if (product.id) {
        await db.products.delete(product.id);
        deleted.products++;
      }
    }

    for (const market of staffMarkets) {
      if (market.id) {
        await db.markets.delete(market.id);
        deleted.markets++;
      }
    }
  });

  console.log('[clearStaffLocalProjections] complete', deleted);
  return deleted;
}

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
 * Authenticated cache reset scope.
 * Defines which data should be cleared when identity changes.
 */
export type AuthCacheResetScope =
  /** Full clear: all authenticated tables + all cache (登出時) */
  | 'full'
  /** Role switch: all authenticated tables + sync cursors (身份切換時) */
  | 'role_switch';

/**
 * Reset authenticated cache based on scope.
 *
 * - 'full': clears all tables + all cache keys (sign-out path)
 * - 'role_switch': clears authenticated tables + sync cursors, preserves user preferences
 *
 * This replaces the current `clearOtherUsersData` logic for role switches.
 * The existing `clearAllData` function in `lib/db/index.ts` is preserved for
 * backwards compatibility.
 *
 * @param scope - Which scope of data to reset
 * @param userId - Current authenticated user ID (for logging only)
 */
export async function resetAuthenticatedCache(
  scope: AuthCacheResetScope,
  userId?: string
): Promise<void> {
  console.log(`🔒 resetAuthenticatedCache(scope=${scope}, userId=${userId?.slice(0, 8) ?? 'none'})`);

  // Always clear authenticated tables, including every table counted by
  // getLocalPendingWriteReport. Leaving one of these queues behind causes a
  // forced sign-out to immediately reopen the blocked-cache dialog.
  await db.transaction('rw', [
    db.events,
    db.markets,
    db.products,
    db.dailyStats,
    db.syncQueue,
    db.salesPhotoEvidencePendingCreations,
    db.salesPhotoEvidencePendingPayloads,
    db.productCoverPhotoPendingUploads,
    db.productCoverPhotoPendingPayloads,
  ], async () => {
    await db.events.clear();
    await db.markets.clear();
    await db.products.clear();
    await db.dailyStats.clear();
    await db.syncQueue.clear();
    await db.salesPhotoEvidencePendingCreations.clear();
    await db.salesPhotoEvidencePendingPayloads.clear();
    await db.productCoverPhotoPendingUploads.clear();
    await db.productCoverPhotoPendingPayloads.clear();
  });

  // Clear sync-related state
  await clearLastSyncTimestamp();

  if (typeof window !== 'undefined') {
    // Sync cursors
    localStorage.removeItem('lastSyncAt');
    localStorage.removeItem('hasCompletedInitialSync');
    // Role cache (always cleared on role switch)
    localStorage.removeItem('user_role_cache');
    // Pause flags
    localStorage.removeItem('sync_pause_until');
    sessionStorage.clear();

    // 'full' scope additionally clears user preferences
    if (scope === 'full') {
      localStorage.removeItem('logout_history');
    }
  }

  // Reset in-process sync identity guard (useSync.ts)
  try {
    const { resetInitialSyncFlag } = await import('@/hooks/useSync');
    resetInitialSyncFlag();
  } catch {
    // useSync may not be available (e.g., during initial render)
  }

  console.log(`✅ resetAuthenticatedCache(${scope}) complete`);
}

/**
 * @deprecated Use resetAuthenticatedCache('role_switch') instead.
 *   clearOtherUsersData only clears other users' data, not the full
 *   authenticated cache, leaving stale data from the previous role.
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
