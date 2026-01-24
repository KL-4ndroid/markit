/**
 * 背景同步引擎
 * 
 * 實現離線優先的雙向同步機制
 * - Push: 上傳本地未同步的事件到雲端
 * - Pull: 從雲端下載新事件並重放到本地
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { recordEvent } from '@/lib/db/events';
import type { Event } from '@/types/db';

/**
 * 同步狀態
 */
export enum SyncStatus {
  IDLE = 'idle',           // 閒置
  SYNCING = 'syncing',     // 同步中
  SUCCESS = 'success',     // 同步成功
  ERROR = 'error',         // 同步失敗
  OFFLINE = 'offline',     // 離線
}

interface UseSyncOptions {
  enabled?: boolean;       // 是否啟用同步
  interval?: number;       // 同步間隔（毫秒）
  throttle?: number;       // 節流延遲（毫秒）
}

interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  pendingCount: number;
  error: string | null;
}

/**
 * 背景同步 Hook
 */
export function useSync(options: UseSyncOptions = {}) {
  const {
    enabled = true,
    interval = 30000,      // 預設 30 秒
    throttle = 5000,       // 預設 5 秒節流
  } = options;

  const { user, isConfigured } = useAuth();
  const [state, setState] = useState<SyncState>({
    status: SyncStatus.IDLE,
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
  });

  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const isSyncingRef = useRef(false);

  /**
   * 執行同步
   */
  const sync = useCallback(async () => {
    // 檢查條件
    if (!enabled || !isConfigured || !user || isSyncingRef.current) {
      return;
    }

    // 檢查網路狀態
    if (!navigator.onLine) {
      setState(prev => ({ ...prev, status: SyncStatus.OFFLINE }));
      return;
    }

    isSyncingRef.current = true;
    setState(prev => ({ ...prev, status: SyncStatus.SYNCING, error: null }));

    try {
      // 1. Push: 上傳本地未同步的事件
      await pushEvents(user.id);

      // 2. Pull: 下載雲端新事件
      await pullEvents(user.id);

      // 3. 更新狀態
      const pendingCount = await db.events
        .where('sync_status')
        .equals('pending')
        .count();

      setState({
        status: SyncStatus.SUCCESS,
        lastSyncAt: Date.now(),
        pendingCount,
        error: null,
      });

      console.log('✅ 同步完成');
    } catch (error: any) {
      console.error('❌ 同步失敗:', error);
      
      // ✅ 檢查是否為網路錯誤
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('ERR_CONNECTION') ||
          error.code === 'ECONNREFUSED') {
        console.warn('⚠️ 網路連線失敗，將在下次自動重試');
        setState(prev => ({
          ...prev,
          status: SyncStatus.OFFLINE,
          error: '網路連線失敗',
        }));
        return;
      }
      
      // 檢查是否為權限錯誤
      if (error.code === 'PGRST301' || error.message?.includes('403')) {
        await handlePermissionRevoked();
      }

      setState(prev => ({
        ...prev,
        status: SyncStatus.ERROR,
        error: error.message || '同步失敗',
      }));
    } finally {
      isSyncingRef.current = false;
    }
  }, [enabled, isConfigured, user]);

  /**
   * 節流同步
   */
  const throttledSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      sync();
    }, throttle);
  }, [sync, throttle]);

  /**
   * 手動觸發同步
   */
  const triggerSync = useCallback(() => {
    sync();
  }, [sync]);

  // 監聽網路狀態和即時同步事件
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 網路已連線，觸發同步');
      throttledSync();
    };

    const handleOffline = () => {
      console.log('📴 網路已斷線');
      setState(prev => ({ ...prev, status: SyncStatus.OFFLINE }));
    };

    // ✅ 監聽即時同步事件
    const handleTriggerSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { eventType, eventId } = customEvent.detail || {};
      console.log(`⚡ 即時同步觸發：${eventType} (ID: ${eventId?.substring(0, 8)}...)`);
      throttledSync();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('trigger-sync', handleTriggerSync);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('trigger-sync', handleTriggerSync);
    };
  }, [throttledSync]);

  // 定期同步
  useEffect(() => {
    if (!enabled || !isConfigured || !user) {
      return;
    }

    // 初始同步
    throttledSync();

    // 設置定期同步
    intervalRef.current = setInterval(() => {
      sync();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [enabled, isConfigured, user, interval, sync, throttledSync]);

  return {
    ...state,
    sync: triggerSync,
    isOnline: navigator.onLine,
  };
}

/**
 * Push: 上傳本地未同步的事件
 */
async function pushEvents(userId: string): Promise<void> {
  // 獲取待同步的事件
  const pendingEvents = await db.events
    .where('sync_status')
    .anyOf(['pending', 'local_only'])
    .toArray();

  if (pendingEvents.length === 0) {
    return;
  }

  // ✅ 時間順序嚴格化：按 timestamp 升序排序，確保 market_created 先執行
  const sortedEvents = pendingEvents.sort((a, b) => a.timestamp - b.timestamp);

  console.log(`📤 上傳 ${sortedEvents.length} 個事件...`);

  // 批次上傳
  for (const event of sortedEvents) {
    try {
      const { error } = await supabase
        .from('events')
        .upsert({
          id: event.id,
          type: event.type,
          payload: event.payload,
          actor_id: userId,
          market_id: event.market_id,
          timestamp: new Date(event.timestamp).toISOString(),
          metadata: event.metadata,
        }, {
          onConflict: 'id',
        });

      if (error) {
        // ✅ 防禦性程式碼：409 Conflict 代表雲端已有此 ID
        if (error.code === '23505') {
          console.log(`⚠️ 事件 ${event.id} 已存在於雲端，標記為已同步`);
          await db.events.update(event.id!, {
            sync_status: 'synced',
          });
          continue;
        }
        
        // ✅ 遞歸同步檢查：外鍵衝突時檢查 market_created 事件
        if (error.code === '23503' && error.message?.includes('events_market_id_fkey')) {
          console.warn(`⚠️ 外鍵衝突：market_id ${event.market_id} 不存在`);
          
          // 檢查是否有對應的 market_created 事件待同步
          const marketCreatedEvent = sortedEvents.find(
            e => e.type === 'market_created' && 
                 (e.market_id === event.market_id || e.payload?.marketId === event.market_id)
          );
          
          if (marketCreatedEvent && marketCreatedEvent.id !== event.id) {
            console.log(`🔄 發現 market_created 事件 ${marketCreatedEvent.id}，將優先處理`);
            // 跳過當前事件，等待下一輪同步
            continue;
          } else {
            console.error(`❌ 找不到對應的 market_created 事件，跳過此事件`);
            // 標記為錯誤狀態（可選）
            continue;
          }
        }
        
        throw error;
      } else {
        // 標記為已同步
        await db.events.update(event.id!, {
          sync_status: 'synced',
        });
      }
    } catch (error: any) {
      console.error(`❌ 上傳事件失敗: ${event.id}`, error);
      console.log('失敗的事件類型:', event.type);
      console.log('失敗的 Payload:', JSON.stringify(event.payload, null, 2));
      console.log('失敗的 market_id:', event.market_id);
      
      // ✅ 防禦性程式碼：不讓同步卡死，繼續處理下一個事件
      if (error.code === '23503') {
        console.warn(`⚠️ 跳過外鍵衝突事件，繼續同步其他事件`);
        continue;
      }
      
      // 其他錯誤也繼續處理
      continue;
    }
  }

  console.log(`✅ 上傳完成`);
}

/**
 * Pull: 下載雲端新事件
 */
async function pullEvents(userId: string): Promise<void> {
  // 獲取本地最後同步時間
  const lastSyncAt = await getLastSyncTimestamp();

  // 獲取用戶參與的市集
  const { data: memberMarkets, error: memberError } = await supabase
    .from('market_members')
    .select('market_id')
    .eq('user_id', userId);

  if (memberError) throw memberError;

  if (!memberMarkets || memberMarkets.length === 0) {
    return;
  }

  const marketIds = memberMarkets.map(m => m.market_id);

  // 查詢新事件
  let query = supabase
    .from('events')
    .select('*')
    .in('market_id', marketIds)
    .order('timestamp', { ascending: true });

  // 只拉取新事件
  if (lastSyncAt) {
    query = query.gt('timestamp', new Date(lastSyncAt).toISOString());
  }

  const { data: newEvents, error: eventsError } = await query;

  if (eventsError) throw eventsError;

  if (!newEvents || newEvents.length === 0) {
    return;
  }

  console.log(`📥 下載 ${newEvents.length} 個新事件...`);

  // 重放事件到本地
  for (const event of newEvents) {
    // 檢查是否已存在
    const existing = await db.events.get(event.id);

    if (!existing) {
      // 直接插入事件（不通過 recordEvent，避免重複處理）
      await db.events.add({
        id: event.id,
        type: event.type,
        payload: event.payload,
        actor_id: event.actor_id,
        market_id: event.market_id,
        timestamp: new Date(event.timestamp).getTime(),
        sync_status: 'synced',
        metadata: event.metadata,
      });

      // 本地也需要更新讀取模型（重放事件）
      const { eventHandlers } = await import('@/lib/db/events');
      const handler = eventHandlers[event.type];
      
      if (handler) {
        await handler({
          id: event.id,
          type: event.type,
          payload: event.payload,
          timestamp: new Date(event.timestamp).getTime(),
        } as Event, db);
      }
    }
  }

  // 更新最後同步時間
  await updateLastSyncTimestamp();

  console.log(`✅ 下載完成`);
}

/**
 * 獲取最後同步時間戳
 */
async function getLastSyncTimestamp(): Promise<number | null> {
  try {
    const settings = await db.settings.toArray();
    return settings[0]?.lastSyncAt || null;
  } catch {
    return null;
  }
}

/**
 * 更新最後同步時間戳
 */
async function updateLastSyncTimestamp(): Promise<void> {
  try {
    const settings = await db.settings.toArray();
    if (settings[0]) {
      await db.settings.update(settings[0].id!, {
        lastSyncAt: Date.now(),
      });
    }
  } catch (error) {
    console.error('更新同步時間戳失敗:', error);
  }
}

/**
 * 處理權限被撤銷（403 Forbidden）
 */
async function handlePermissionRevoked(): Promise<void> {
  console.warn('⚠️ 權限已被撤銷，清除本地協作資料');

  try {
    // 獲取所有協作市集
    const collaborativeMarkets = await db.markets
      .where('is_collaborative')
      .equals(true)
      .toArray();

    // 清除這些市集的資料
    for (const market of collaborativeMarkets) {
      if (market.id) {
        // 刪除市集
        await db.markets.delete(market.id);

        // 刪除相關商品
        await db.products.where('market_id').equals(market.id).delete();

        // 刪除相關事件
        await db.events.where('market_id').equals(market.id).delete();
      }
    }

    console.log(`✅ 已清除 ${collaborativeMarkets.length} 個協作市集的資料`);

    // 提示用戶
    if (typeof window !== 'undefined') {
      const { toast } = await import('sonner');
      toast.error('您已被移除出部分市集，相關資料已清除');
    }
  } catch (error) {
    console.error('清除協作資料失敗:', error);
  }
}


