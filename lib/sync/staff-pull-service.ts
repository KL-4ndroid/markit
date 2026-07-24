import { supabase } from '@/lib/supabase/client';
import { collectProjectionMarketId } from '@/lib/sync/projection-reconciliation';
import { updateLastSyncTimestamp } from '@/lib/sync/sync-cursor-service';
import { reconcileSyncedProjectionMarkets } from '@/lib/sync/sync-projection-reconciliation-runner';
import {
  syncEventsToIndexedDB,
  syncMarketsToIndexedDB,
  syncProductsToIndexedDB,
} from '@/lib/sync/local-cache-writer';
import type { InfoLevel } from '@/lib/data-sanitization';

export async function pullEventsFromViews(
  userId: string,
  onProgress: (current: number, total: number, currentItem?: string, phase?: 'incremental') => void,
  infoLevel: InfoLevel
): Promise<void> {
  console.log('📊 從員工視圖拉取數據（完整同步，不使用 lastSyncAt）...', {
    userId: userId.substring(0, 8),
  });

  try {
    if (onProgress) {
      onProgress(1, 5, '拉取市集數據...', 'incremental');
    }

    const { data: marketsData, error: marketsError } = await supabase
      .from('staff_accessible_markets')
      .select('*');

    if (marketsError) {
      console.error('❌ 拉取市集視圖失敗:', marketsError);
      throw marketsError;
    }

    console.log(`📥 拉取到 ${marketsData?.length || 0} 個市集`);

    if (onProgress) {
      onProgress(2, 5, '拉取商品數據...', 'incremental');
    }

    const { data: productsData, error: productsError } = await supabase
      .from('staff_accessible_products')
      .select('*');

    if (productsError) {
      console.error('❌ 拉取商品視圖失敗:', productsError);
      throw productsError;
    }

    console.log(`📥 拉取到 ${productsData?.length || 0} 個商品`);

    if (onProgress) {
      onProgress(3, 5, '拉取事件數據...', 'incremental');
    }

    const { data: eventsData, error: eventsError } = await supabase
      .from('staff_accessible_events')
      .select('*')
      .order('timestamp', { ascending: true });

    if (eventsError) {
      console.error('❌ 拉取事件視圖失敗:', eventsError);
      throw eventsError;
    }

    console.log(`📥 拉取到 ${eventsData?.length || 0} 個事件`);

    if (onProgress) {
      onProgress(4, 5, '同步到本地數據庫...', 'incremental');
    }

    const touchedMarketIds = new Set<string>();
    for (const event of eventsData || []) {
      collectProjectionMarketId(touchedMarketIds, event);
    }

    await syncMarketsToIndexedDB(marketsData || [], userId, infoLevel);
    await syncProductsToIndexedDB(productsData || [], userId, infoLevel);
    await syncEventsToIndexedDB(eventsData || [], infoLevel);
    await reconcileSyncedProjectionMarkets(touchedMarketIds, infoLevel < 3 ? 'staff-view' : 'owner-full');

    if (eventsData && eventsData.length > 0) {
      const validCreatedAt = (eventsData || [])
        .map(e => new Date(e.created_at).getTime())
        .filter(ts => Number.isFinite(ts));
      if (validCreatedAt.length > 0) {
        await updateLastSyncTimestamp(Math.max(...validCreatedAt));
      }
    }

    if (onProgress) {
      onProgress(5, 5, '完成同步...', 'incremental');
    }

    try {
      const { validateDataIsolation } = await import('@/lib/db/clear-user-data');
      const validation = await validateDataIsolation(userId);

      if (!validation.isValid) {
        if (infoLevel >= 3) {
          console.warn('⚠️ Owner session 偵測到資料污染（請檢查 IndexedDB 是否殘留其他用戶資料）:', validation.violations);
        } else {
          console.log(`ℹ️ 員工 session：本地 ${validation.violations.length} 項「非當前用戶」資料為預期（員工看的市集 owner_id 必然為 Owner），已保留。`);
        }
      } else {
        console.log('✅ 數據隔離性驗證通過');
      }
    } catch (validationError) {
      console.error('⚠️ 數據隔離性驗證失敗:', validationError);
    }

    console.log('✅ 視圖數據同步完成');
  } catch (error) {
    console.error('❌ 視圖拉取失敗:', error);
    throw error;
  }
}
