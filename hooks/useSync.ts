/**
 * 背景同步引擎
 * 
 * 實現離線優先的雙向同步機制
 * - Push: 上傳本地未同步的事件到雲端
 * - Pull: 從雲端下載新事件並重放到本地
 */

'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { recordEvent } from '@/lib/db/events';
import { getLatestSnapshot, loadSnapshot, autoCreateSnapshot } from '@/lib/db/snapshot';
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

/**
 * 全局標記：是否已執行初始同步
 * 使用模組級別變量，確保所有 useSync 實例共享同一個標記
 */
let hasExecutedInitialSync = false;

/**
 * 全局標記：是否已設置定期任務
 * 防止 React Strict Mode 導致的重複設置
 */
let hasSetupIntervals = false;

/**
 * ✅ 全局共享狀態：確保所有 useSync 實例使用同一個狀態
 * 這樣可以避免 React Strict Mode 雙重渲染導致的狀態不同步
 */
let globalSyncState: SyncState = {
  status: SyncStatus.IDLE,
  lastSyncAt: null,
  pendingCount: 0,
  error: null,
  uploadProgress: undefined,
  downloadProgress: undefined,
};

/**
 * ✅ 全局狀態更新監聽器
 */
const globalStateListeners = new Set<(state: SyncState) => void>();

/**
 * ✅ 更新全局狀態並通知所有監聽器
 */
function updateGlobalState(updater: (prev: SyncState) => SyncState) {
  globalSyncState = updater(globalSyncState);
  globalStateListeners.forEach(listener => listener(globalSyncState));
}

/**
 * 重置初始同步標記（用於測試或登出）
 */
export function resetInitialSyncFlag() {
  hasExecutedInitialSync = false;
  hasSetupIntervals = false;
  // ✅ 重置全局狀態
  updateGlobalState(() => ({
    status: SyncStatus.IDLE,
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
    uploadProgress: undefined,
    downloadProgress: undefined,
  }));
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
  uploadProgress?: { current: number; total: number; currentItem?: string };
  downloadProgress?: { current: number; total: number; currentItem?: string; phase?: 'snapshot' | 'incremental' };
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
  
  // ✅ 使用全局狀態，並訂閱更新
  const [state, setState] = useState<SyncState>(globalSyncState);

  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const snapshotCheckIntervalRef = useRef<NodeJS.Timeout>();
  const isSyncingRef = useRef(false);
  const lastSnapshotCheckFailedRef = useRef(false);
  const syncFnRef = useRef<() => Promise<void>>();
  const throttledSyncFnRef = useRef<() => void>();

  // ✅ 訂閱全局狀態更新
  useEffect(() => {
    const listener = (newState: SyncState) => {
      setState(newState);
    };
    
    globalStateListeners.add(listener);
    
    return () => {
      globalStateListeners.delete(listener);
    };
  }, []);

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
    updateGlobalState(prev => ({ ...prev, status: SyncStatus.SYNCING, error: null }));

    try {
      // 1. Push: 上傳本地未同步的事件
      const uploadedCount = await pushEvents(user.id, (current, total, currentItem) => {
        updateGlobalState(prev => ({
          ...prev,
          uploadProgress: { current, total, currentItem },
        }));
      });

      // 2. Pull: 下載雲端新事件（使用快照優化）
      const usedSnapshot = await pullEventsWithSnapshot(user.id, (current, total, currentItem, phase) => {
        updateGlobalState(prev => ({
          ...prev,
          downloadProgress: { current, total, currentItem, phase },
        }));
      });

      // 3. 更新狀態
      const pendingCount = await db.events
        .where('sync_status')
        .equals('pending')
        .count();
      
      updateGlobalState(prev => ({
        ...prev,
        status: SyncStatus.SUCCESS,
        lastSyncAt: Date.now(),
        pendingCount,
        error: null,
        uploadProgress: undefined,
        downloadProgress: undefined,
      }));

      // 4. 混合快照生成策略：
      // 策略 1（主要）：事件驅動 - 有上傳事件時立即檢查
      // 策略 2（備用）：定期檢查 - 每小時兜底一次（在 useEffect 中設置）
      // 策略 3（保險）：頁面關閉時強制檢查（在 beforeunload 中設置）
      
      if (usedSnapshot) {
        lastSnapshotCheckFailedRef.current = false;
      } else if (uploadedCount === 0 && !lastSnapshotCheckFailedRef.current) {
        // 沒有上傳新事件，跳過快照生成
      } else {
        // 延遲 3 秒，確保 UI 已更新
        setTimeout(() => {
          autoCreateSnapshot(user.id)
            .then(() => {
              lastSnapshotCheckFailedRef.current = false;
            })
            .catch(err => {
              console.error('後台生成快照失敗:', err);
              lastSnapshotCheckFailedRef.current = true; // 標記失敗，下次重試
            });
        }, 3000);
      }
    } catch (error: any) {
      console.error('❌ 同步失敗:', error);
      
      // ✅ 檢查是否為網路錯誤
      if (error.message?.includes('Failed to fetch') || 
          error.message?.includes('ERR_CONNECTION') ||
          error.code === 'ECONNREFUSED') {
        console.warn('⚠️ 網路連線失敗，將在下次自動重試');
        updateGlobalState(prev => ({
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

      updateGlobalState(prev => ({
        ...prev,
        status: SyncStatus.ERROR,
        error: error.message || '同步失敗',
      }));
    } finally {
      isSyncingRef.current = false;
    }
  }, [enabled, isConfigured, user]);

  // 將 sync 存儲到 ref 中
  syncFnRef.current = sync;

  /**
   * 節流同步
   */
  const throttledSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncFnRef.current?.();
    }, throttle);
  }, [throttle]);

  // 將 throttledSync 存儲到 ref 中
  throttledSyncFnRef.current = throttledSync;

  /**
   * 手動觸發同步
   */
  const triggerSync = useCallback(() => {
    syncFnRef.current?.();
  }, []);

  // 監聽網路狀態和即時同步事件
  useEffect(() => {
    const handleOnline = () => {
      throttledSyncFnRef.current?.();
    };

    const handleOffline = () => {
      updateGlobalState(prev => ({ ...prev, status: SyncStatus.OFFLINE }));
    };

    // ✅ 監聽即時同步事件
    const handleTriggerSync = (event: any) => {
      throttledSyncFnRef.current?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('trigger-sync', handleTriggerSync as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('trigger-sync', handleTriggerSync as EventListener);
    };
  }, []);

  // 定期同步
  useEffect(() => {
    if (!enabled || !isConfigured || !user) {
      return;
    }

    // ✅ 防止重複設置（全局鎖）
    if (hasSetupIntervals) {
      return;
    }

    hasSetupIntervals = true;

    // ✅ 初始同步（只執行一次）
    if (!hasExecutedInitialSync) {
      hasExecutedInitialSync = true;
      throttledSyncFnRef.current?.();
    }

    // 策略 1: 定期檢查待同步事件（每 5 分鐘）
    intervalRef.current = setInterval(async () => {
      const pendingCount = await db.events
        .where('sync_status')
        .anyOf(['pending', 'local_only'])
        .count();
      
      if (pendingCount > 0) {
        syncFnRef.current?.();
      }
    }, interval);

    // 策略 2: 定期快照檢查（每小時兜底一次）
    snapshotCheckIntervalRef.current = setInterval(() => {
      autoCreateSnapshot(user.id)
        .then(() => {
          lastSnapshotCheckFailedRef.current = false;
        })
        .catch(err => {
          console.error('定期快照檢查失敗:', err);
          lastSnapshotCheckFailedRef.current = true;
        });
    }, 60 * 60 * 1000);

    // 策略 3: 頁面關閉時強制檢查
    const handleBeforeUnload = () => {
      autoCreateSnapshot(user.id).catch(err => {
        console.error('頁面關閉時快照檢查失敗:', err);
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (snapshotCheckIntervalRef.current) {
        clearInterval(snapshotCheckIntervalRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, isConfigured, user, interval]);

  // ✅ 使用 useMemo 避免每次渲染都創建新對象
  return useMemo(() => ({
    ...state,
    sync: triggerSync,
    isOnline: navigator.onLine,
  }), [state, triggerSync]);
}

/**
 * 獲取本地待同步事件數量
 */
export async function getLocalPendingCount(): Promise<number> {
  try {
    return await db.events
      .where('sync_status')
      .anyOf(['pending', 'local_only'])
      .count();
  } catch {
    return 0;
  }
}

/**
 * 獲取雲端事件數量（估算）
 */
export async function getCloudEventCount(userId: string): Promise<number> {
  try {
    // 獲取用戶參與的市集
    const { data: memberMarkets } = await supabase
      .from('market_members')
      .select('market_id')
      .eq('user_id', userId);

    const marketIds = memberMarkets?.map(m => m.market_id) || [];

    // 查詢事件數量
    let query = supabase
      .from('events')
      .select('id', { count: 'exact', head: true });

    if (marketIds.length > 0) {
      query = query.or(`market_id.in.(${marketIds.join(',')}),and(actor_id.eq.${userId},market_id.is.null)`);
    } else {
      query = query.eq('actor_id', userId).is('market_id', null);
    }

    const { count } = await query;
    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Push: 上傳本地未同步的事件
 * @returns 成功上傳的事件數量
 */
async function pushEvents(
  userId: string, 
  onProgress?: (current: number, total: number, currentItem?: string) => void
): Promise<number> {
  // ✅ 確保用戶 profile 存在
  await ensureUserProfile(userId);
  
  // 獲取待同步的事件
  const pendingEvents = await db.events
    .where('sync_status')
    .anyOf(['pending', 'local_only'])
    .toArray();

  if (pendingEvents.length === 0) {
    return 0;
  }

  // ✅ 時間順序嚴格化：按 timestamp 升序排序，確保 market_created 先執行
  const sortedEvents = pendingEvents.sort((a, b) => a.timestamp - b.timestamp);
  const total = sortedEvents.length;

  console.log(`📤 開始上傳 ${total} 個事件...`);

  // 批次上傳
  let uploadedCount = 0;
  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    
    // ✅ 更新進度
    if (onProgress) {
      onProgress(i + 1, total, `${event.type} (${event.id?.substring(0, 8)}...)`);
    }
    
    try {
      const { data, error } = await supabase
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
        console.error(`❌ 上傳事件失敗: ${event.type} (${event.id?.substring(0, 8)}...)`, error);
        
        // ✅ PostgreSQL unique violation (事件已存在)
        if (error.code === '23505') {
          console.log(`⚠️ 事件 ${event.id} 已存在於雲端，標記為已同步`);
          await db.events.update(event.id!, {
            sync_status: 'synced',
          });
          continue;
        }
        
        // ✅ 外鍵衝突：market 不存在
        if (error.code === '23503' && error.message?.includes('events_market_id_fkey')) {
          console.warn(`⚠️ 外鍵衝突：market_id ${event.market_id} 不存在`);
          
          // 檢查是否有對應的 market_created 事件待同步
          const marketCreatedEvent = sortedEvents.find(
            e => e.type === 'market_created' && 
                 (e.market_id === event.market_id || e.payload?.marketId === event.market_id)
          );
          
          if (marketCreatedEvent && marketCreatedEvent.id !== event.id) {
            console.log(`🔄 發現 market_created 事件，將在下一輪同步時重試`);
            // 保持 pending 狀態，等待下一輪同步
            continue;
          } else {
            console.error(`❌ 找不到對應的 market_created 事件，標記為 local_only`);
            await db.events.update(event.id!, {
              sync_status: 'local_only',
            });
            continue;
          }
        }
        
        // ✅ RLS 政策錯誤（權限不足）- market_created 需要特殊處理
        if (error.code === '42501' && event.type === 'market_created' && event.market_id) {
          console.log(`🔄 RLS 阻止 market_created，嘗試先創建 market_members...`);
          
          // 先創建 market_members 記錄
          const memberCreated = await ensureMarketMember(userId, event.market_id);
          
          if (memberCreated) {
            // 重試上傳事件
            const { error: retryError } = await supabase
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
            
            if (!retryError) {
              console.log(`✅ 重試成功: ${event.type} (${event.id?.substring(0, 8)}...)`);
              await db.events.update(event.id!, {
                sync_status: 'synced',
              });
              continue;
            }
          }
          
          // 如果還是失敗，標記為 local_only
          console.error(`❌ RLS 政策阻止：${event.type}`, error.message);
          await db.events.update(event.id!, {
            sync_status: 'local_only',
          });
          continue;
        }
        
        // ✅ 其他 RLS 政策錯誤
        if (error.code === 'PGRST301' || error.code === '42501' || error.message?.includes('policy')) {
          console.error(`❌ RLS 政策阻止：${event.type}`, error.message);
          await db.events.update(event.id!, {
            sync_status: 'local_only',
          });
          continue;
        }
        
        // 其他錯誤：標記為 local_only，但不中斷同步
        console.error(`❌ 未知錯誤：${error.code} - ${error.message}`);
        await db.events.update(event.id!, {
          sync_status: 'local_only',
        });
        continue;
      }

      // ✅ 上傳成功
      await db.events.update(event.id!, {
        sync_status: 'synced',
      });
      
      uploadedCount++;
      
      // ✅ 如果是 market_created 事件，上傳成功後確保 market_members 記錄存在
      if (event.type === 'market_created' && event.market_id) {
        await ensureMarketMember(userId, event.market_id);
      }
      
    } catch (error: any) {
      console.error(`❌ 上傳事件異常: ${event.id}`, error);
      console.log('失敗的事件類型:', event.type);
      console.log('失敗的 Payload:', JSON.stringify(event.payload, null, 2));
      console.log('失敗的 market_id:', event.market_id);
      
      // 標記為錯誤，但繼續處理下一個事件
      await db.events.update(event.id!, {
        sync_status: 'local_only',
      });
      continue;
    }
  }

  console.log(`✅ 上傳完成：成功上傳 ${uploadedCount}/${total} 個事件`);
  return uploadedCount;
}

/**
 * Pull: 下載雲端新事件（使用快照優化）
 * 
 * 優化邏輯：
 * 1. 檢查本地是否為空（新設備）
 * 2. 如果是新設備，嘗試載入快照 + 增量事件
 * 3. 如果快照載入失敗，降級到全量同步
 * 4. 如果不是新設備，只下載增量事件
 * 
 * @returns 是否使用了快照同步（true = 使用快照，false = 全量同步）
 */
async function pullEventsWithSnapshot(
  userId: string,
  onProgress?: (current: number, total: number, currentItem?: string, phase?: 'snapshot' | 'incremental') => void
): Promise<boolean> {
  try {
    // 步驟 1: 檢查本地是否為空（新設備）
    const hasLocalData = await db.markets.count() > 0;

    if (!hasLocalData) {
      // 🚀 新設備：嘗試使用快照
      try {
        // 查詢最新快照
        const snapshot = await getLatestSnapshot(userId);
        
        if (snapshot) {
          // 步驟 2a: 載入快照
          if (onProgress) {
            onProgress(0, 1, '載入快照...', 'snapshot');
          }
          
          await loadSnapshot(snapshot);
          
          if (onProgress) {
            onProgress(1, 1, '快照載入完成', 'snapshot');
          }
          
          console.log('✅ 快照載入完成');
          
          // 步驟 2b: 下載快照之後的增量事件
          await pullIncrementalEvents(
            userId, 
            snapshot.snapshot_at,
            (current, total, currentItem) => {
              if (onProgress) {
                onProgress(current, total, currentItem, 'incremental');
              }
            }
          );
          
          return true; // ✅ 使用了快照
        }
      } catch (snapshotError) {
        console.error('⚠️ 快照載入失敗，切換至全量同步:', snapshotError);
      }
    }
    
    // 降級：沒有快照或已有本地數據，使用原邏輯
    await pullAllEvents(userId, onProgress);
    return false; // ❌ 沒有使用快照
    
  } catch (error) {
    console.error('❌ 快照同步失敗，切換至全量同步:', error);
    // 最終降級方案
    await pullAllEvents(userId, onProgress);
    return false; // ❌ 沒有使用快照
  }
}

/**
 * 下載增量事件（快照之後的事件）
 */
async function pullIncrementalEvents(
  userId: string,
  snapshotAt: string,
  onProgress?: (current: number, total: number, currentItem?: string) => void
): Promise<void> {
  // 獲取用戶參與的市集
  const { data: memberMarkets, error: memberError } = await supabase
    .from('market_members')
    .select('market_id')
    .eq('user_id', userId);

  if (memberError) throw memberError;

  const marketIds = memberMarkets?.map(m => m.market_id) || [];

  // 查詢快照之後的新事件
  let query = supabase
    .from('events')
    .select('*')
    .gt('timestamp', snapshotAt)
    .order('timestamp', { ascending: true });

  // 過濾條件：市集事件 OR 用戶自己的事件
  if (marketIds.length > 0) {
    query = query.or(`market_id.in.(${marketIds.join(',')}),and(actor_id.eq.${userId},market_id.is.null)`);
  } else {
    query = query.eq('actor_id', userId).is('market_id', null);
  }

  const { data: incrementalEvents, error: eventsError } = await query;

  if (eventsError) throw eventsError;

  const incrementalCount = incrementalEvents?.length || 0;

  if (incrementalCount === 0) {
    return;
  }

  // 重放增量事件
  await replayEvents(incrementalEvents, onProgress);
  
  // 更新最後同步時間
  await updateLastSyncTimestamp();
}

/**
 * 重放事件到本地數據庫
 */
async function replayEvents(
  events: any[],
  onProgress?: (current: number, total: number, currentItem?: string) => void
): Promise<void> {
  const total = events.length;
  let processedCount = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    if (onProgress) {
      onProgress(i + 1, total, `${event.type} (${event.id?.substring(0, 8)}...)`);
    }
    
    try {
      // 檢查是否已存在
      const existing = await db.events.get(event.id);
      if (existing) {
        continue;
      }

      // 插入事件
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

      // 重放事件處理器
      const { eventHandlers } = await import('@/lib/db/events');
      const handler = eventHandlers[event.type as keyof typeof eventHandlers];
      
      if (handler) {
        // ✅ 修復：將 Supabase 的底線式 payload 轉換為駝峰式（用於本地事件處理器）
        let processedPayload = event.payload;
        
        if (event.type === 'market_updated' && event.payload?.updates) {
          const updates = event.payload.updates;
          const camelCaseUpdates: Record<string, unknown> = {};
          
          // 轉換底線式為駝峰式
          if (updates.name !== undefined) camelCaseUpdates.name = updates.name;
          if (updates.location !== undefined) camelCaseUpdates.location = updates.location;
          if (updates.dates !== undefined) camelCaseUpdates.dates = updates.dates;
          if (updates.start_date !== undefined) camelCaseUpdates.startDate = updates.start_date;
          if (updates.end_date !== undefined) camelCaseUpdates.endDate = updates.end_date;
          if (updates.start_time !== undefined) camelCaseUpdates.startTime = updates.start_time;
          if (updates.end_time !== undefined) camelCaseUpdates.endTime = updates.end_time;
          
          // 時間軸資訊
          if (updates.early_entry_enabled !== undefined) camelCaseUpdates.earlyEntryEnabled = updates.early_entry_enabled;
          if (updates.early_entry_time !== undefined) camelCaseUpdates.earlyEntryTime = updates.early_entry_time;
          if (updates.check_in_time !== undefined) camelCaseUpdates.checkInTime = updates.check_in_time;
          if (updates.operating_start_time !== undefined) camelCaseUpdates.operatingStartTime = updates.operating_start_time;
          if (updates.operating_end_time !== undefined) camelCaseUpdates.operatingEndTime = updates.operating_end_time;
          
          // 財務資訊
          if (updates.registration_fee !== undefined) camelCaseUpdates.registrationFee = updates.registration_fee;
          if (updates.booth_cost !== undefined) camelCaseUpdates.boothCost = updates.booth_cost;
          if (updates.deposit !== undefined) camelCaseUpdates.deposit = updates.deposit;
          if (updates.table_rental !== undefined) camelCaseUpdates.tableRental = updates.table_rental;
          if (updates.chair_rental !== undefined) camelCaseUpdates.chairRental = updates.chair_rental;
          if (updates.umbrella_rental !== undefined) camelCaseUpdates.umbrellaRental = updates.umbrella_rental;
          if (updates.tablecloth_rental !== undefined) camelCaseUpdates.tableclothRental = updates.tablecloth_rental;
          if (updates.commission_rate !== undefined) camelCaseUpdates.commissionRate = updates.commission_rate;
          
          // 免費提供標記
          if (updates.table_free !== undefined) camelCaseUpdates.tableFree = updates.table_free;
          if (updates.chair_free !== undefined) camelCaseUpdates.chairFree = updates.chair_free;
          if (updates.umbrella_free !== undefined) camelCaseUpdates.umbrellaFree = updates.umbrella_free;
          if (updates.tablecloth_free !== undefined) camelCaseUpdates.tableclothFree = updates.tablecloth_free;
          
          // 備註
          if (updates.notes !== undefined) camelCaseUpdates.notes = updates.notes;
          
          processedPayload = {
            market_id: event.payload.market_id,
            updates: camelCaseUpdates,
          };
        }
        
        await handler({
          id: event.id,
          type: event.type,
          payload: processedPayload,
          timestamp: new Date(event.timestamp).getTime(),
          actor_id: event.actor_id,
          market_id: event.market_id,
        } as Event, db);
      }
      
      processedCount++;
    } catch (error: any) {
      if (error.name === 'ConstraintError') {
        continue;
      }
      console.error(`❌ 重放事件失敗: ${event.type}`, error);
      continue;
    }
  }

  console.log(`✅ 重放完成：${processedCount}/${total} 個事件`);
}

/**
 * Pull: 下載雲端新事件（全量同步 - 降級方案）
 * ✅ 支援員工模式：從視圖拉取數據
 */
async function pullAllEvents(
  userId: string,
  onProgress?: (current: number, total: number, currentItem?: string, phase?: 'snapshot' | 'incremental') => void
): Promise<void> {
  // ✅ 檢查是否啟用員工模式
  const { isStaffModeEnabled } = await import('@/lib/db/feature-flags');
  const staffModeEnabled = isStaffModeEnabled();
  
  if (staffModeEnabled) {
    try {
      console.log('📊 員工模式已啟用，嘗試從視圖拉取數據...');
      await pullEventsFromViews(userId, onProgress);
      console.log('✅ 視圖拉取成功');
      return; // ✅ 成功，直接返回
    } catch (error) {
      console.warn('⚠️ 從視圖拉取失敗，降級到原邏輯:', error);
      // 繼續執行原邏輯（降級）
    }
  }
  
  // ✅ 原邏輯（降級方案）
  // 獲取本地最後同步時間
  const lastSyncAt = await getLastSyncTimestamp();

  // 獲取用戶參與的市集
  const { data: memberMarkets, error: memberError } = await supabase
    .from('market_members')
    .select('market_id')
    .eq('user_id', userId);

  if (memberError) throw memberError;

  const marketIds = memberMarkets?.map(m => m.market_id) || [];

  // ✅ 查詢新事件：包含市集事件 + 用戶自己的全局事件（如商品）
  let query = supabase
    .from('events')
    .select('*')
    .order('timestamp', { ascending: true });

  // 只拉取新事件
  if (lastSyncAt) {
    query = query.gt('timestamp', new Date(lastSyncAt).toISOString());
  }

  // ✅ 過濾條件：市集事件 OR 用戶自己的事件
  if (marketIds.length > 0) {
    query = query.or(`market_id.in.(${marketIds.join(',')}),and(actor_id.eq.${userId},market_id.is.null)`);
  } else {
    // 如果沒有參與任何市集，只拉取自己的全局事件
    query = query.eq('actor_id', userId).is('market_id', null);
  }

  const { data: newEvents, error: eventsError } = await query;

  if (eventsError) throw eventsError;

  if (!newEvents || newEvents.length === 0) {
    return;
  }

  const total = newEvents.length;

  // ✅ 先批次檢查哪些事件已存在，避免重複日誌
  const existingIds = new Set<string>();
  const eventIds = newEvents.map(e => e.id);
  const existingEvents = await db.events.where('id').anyOf(eventIds).toArray();
  existingEvents.forEach(e => existingIds.add(e.id!));

  // 過濾出真正需要處理的新事件
  const eventsToProcess = newEvents.filter(e => !existingIds.has(e.id));
  
  if (eventsToProcess.length === 0) {
    console.log(`✅ ${total} 個事件已全部存在，無需下載`);
    return;
  }

  if (eventsToProcess.length < total) {
    console.log(`ℹ️ ${total} 個事件中有 ${existingIds.size} 個已存在，將下載 ${eventsToProcess.length} 個新事件`);
  }

  // 重放事件到本地
  let processedCount = 0;
  for (let i = 0; i < eventsToProcess.length; i++) {
    const event = eventsToProcess[i];
    
    // ✅ 更新進度（顯示實際處理進度）
    if (onProgress) {
      onProgress(i + 1, eventsToProcess.length, `${event.type} (${event.id?.substring(0, 8)}...)`, 'incremental');
    }
    
    try {
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
      const handler = eventHandlers[event.type as keyof typeof eventHandlers];
      
      if (handler) {
        // ✅ 修復：將 Supabase 的底線式 payload 轉換為駝峰式（用於本地事件處理器）
        let processedPayload = event.payload;
        
        if (event.type === 'market_updated' && event.payload?.updates) {
          const updates = event.payload.updates;
          const camelCaseUpdates: Record<string, unknown> = {};
          
          // 轉換底線式為駝峰式
          if (updates.name !== undefined) camelCaseUpdates.name = updates.name;
          if (updates.location !== undefined) camelCaseUpdates.location = updates.location;
          if (updates.dates !== undefined) camelCaseUpdates.dates = updates.dates;
          if (updates.start_date !== undefined) camelCaseUpdates.startDate = updates.start_date;
          if (updates.end_date !== undefined) camelCaseUpdates.endDate = updates.end_date;
          if (updates.start_time !== undefined) camelCaseUpdates.startTime = updates.start_time;
          if (updates.end_time !== undefined) camelCaseUpdates.endTime = updates.end_time;
          
          // 時間軸資訊
          if (updates.early_entry_enabled !== undefined) camelCaseUpdates.earlyEntryEnabled = updates.early_entry_enabled;
          if (updates.early_entry_time !== undefined) camelCaseUpdates.earlyEntryTime = updates.early_entry_time;
          if (updates.check_in_time !== undefined) camelCaseUpdates.checkInTime = updates.check_in_time;
          if (updates.operating_start_time !== undefined) camelCaseUpdates.operatingStartTime = updates.operating_start_time;
          if (updates.operating_end_time !== undefined) camelCaseUpdates.operatingEndTime = updates.operating_end_time;
          
          // 財務資訊
          if (updates.registration_fee !== undefined) camelCaseUpdates.registrationFee = updates.registration_fee;
          if (updates.booth_cost !== undefined) camelCaseUpdates.boothCost = updates.booth_cost;
          if (updates.deposit !== undefined) camelCaseUpdates.deposit = updates.deposit;
          if (updates.table_rental !== undefined) camelCaseUpdates.tableRental = updates.table_rental;
          if (updates.chair_rental !== undefined) camelCaseUpdates.chairRental = updates.chair_rental;
          if (updates.umbrella_rental !== undefined) camelCaseUpdates.umbrellaRental = updates.umbrella_rental;
          if (updates.tablecloth_rental !== undefined) camelCaseUpdates.tableclothRental = updates.tablecloth_rental;
          if (updates.commission_rate !== undefined) camelCaseUpdates.commissionRate = updates.commission_rate;
          
          // 免費提供標記
          if (updates.table_free !== undefined) camelCaseUpdates.tableFree = updates.table_free;
          if (updates.chair_free !== undefined) camelCaseUpdates.chairFree = updates.chair_free;
          if (updates.umbrella_free !== undefined) camelCaseUpdates.umbrellaFree = updates.umbrella_free;
          if (updates.tablecloth_free !== undefined) camelCaseUpdates.tableclothFree = updates.tablecloth_free;
          
          // 備註
          if (updates.notes !== undefined) camelCaseUpdates.notes = updates.notes;
          
          processedPayload = {
            market_id: event.payload.market_id,
            updates: camelCaseUpdates,
          };
        }
        
        await handler({
          id: event.id,
          type: event.type,
          payload: processedPayload,
          timestamp: new Date(event.timestamp).getTime(),
          actor_id: event.actor_id,
          market_id: event.market_id,
        } as Event, db);
      }
      
      processedCount++;
    } catch (error: any) {
      // ✅ 如果是 ConstraintError（Key already exists），靜默跳過
      if (error.name === 'ConstraintError') {
        continue;
      }
      
      console.error(`❌ 重放事件失敗: ${event.type} (${event.id?.substring(0, 8)}...)`, error);
      // 繼續處理下一個事件，不中斷同步
      continue;
    }
  }

  console.log(`✅ 下載完成：成功處理 ${processedCount}/${eventsToProcess.length} 個新事件`);

  // 更新最後同步時間
  await updateLastSyncTimestamp();
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
 * 確保用戶是市集成員
 * 在創建 market_created 事件後，需要在 market_members 表中添加記錄
 * @returns 是否成功創建或已存在
 */
async function ensureMarketMember(userId: string, marketId: string): Promise<boolean> {
  try {
    // 檢查是否已經是成員
    const { data: existingMember, error: checkError } = await supabase
      .from('market_members')
      .select('user_id')
      .eq('market_id', marketId)
      .eq('user_id', userId)
      .maybeSingle(); // ✅ 使用 maybeSingle 避免 406 錯誤

    if (checkError) {
      console.error('檢查市集成員失敗:', checkError);
      return false;
    }

    // 如果已經是成員，直接返回成功
    if (existingMember) {
      console.log(`✅ 已是市集成員: ${marketId.substring(0, 8)}...`);
      return true;
    }

    // 如果不是成員，添加記錄
    console.log(`📝 添加市集成員記錄: ${marketId.substring(0, 8)}...`);
    
    const { error: insertError } = await supabase
      .from('market_members')
      .insert({
        market_id: marketId,
        user_id: userId,
        role: 'owner', // 創建者為 owner
        joined_at: new Date().toISOString(),
      });

    if (insertError) {
      // 如果是唯一性衝突（23505），說明已經存在，返回成功
      if (insertError.code === '23505') {
        console.log('✅ 市集成員記錄已存在（並發創建）');
        return true;
      }
      
      // 如果是外鍵約束錯誤（23503），說明 market 還不存在
      if (insertError.code === '23503') {
        console.warn(`⚠️ Market ${marketId.substring(0, 8)}... 尚未在雲端創建`);
        return false;
      }
      
      console.error('添加市集成員失敗:', insertError);
      return false;
    }

    console.log('✅ 市集成員記錄已添加');
    return true;
  } catch (error) {
    console.error('❌ 確保市集成員失敗:', error);
    return false;
  }
}

/**
 * 檢查是否需要生成快照（帶時間維度）
 * 條件：1000 個事件 OR 7 天，先到先生成
 */
async function shouldCreateSnapshotWithTime(userId: string): Promise<boolean> {
  // 這個函數已經移到 snapshot.ts 中，這裡保留是為了向後兼容
  const { shouldCreateSnapshot } = await import('@/lib/db/snapshot');
  return shouldCreateSnapshot(userId);
}

/**
 * 確保用戶 profile 存在
 * 如果不存在則創建一個基本的 profile
 */
async function ensureUserProfile(userId: string): Promise<void> {
  try {
    // 檢查 profile 是否存在
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 是 "not found" 錯誤，其他錯誤需要拋出
      throw checkError;
    }

    // 如果 profile 不存在，創建一個
    if (!existingProfile) {
      console.log('📝 創建用戶 profile...');
      
      // 獲取用戶的 email
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        console.error('❌ 無法獲取用戶資訊:', userError);
        return;
      }
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userData.user.email || `${userId}@local.app`, // 使用實際 email 或生成一個
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        // 如果是唯一性衝突（23505），說明其他地方已經創建了，忽略錯誤
        if (insertError.code === '23505') {
          console.log('✅ Profile 已存在（並發創建）');
          return;
        }
        throw insertError;
      }

      console.log('✅ 用戶 profile 已創建');
    }
  } catch (error) {
    console.error('❌ 確保用戶 profile 失敗:', error);
    // 不拋出錯誤，讓同步繼續進行
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
      .equals(1)
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

// ==================== 員工模式：視圖拉取函數 ====================

/**
 * 從員工視圖拉取數據（員工模式）
 * ✅ 這是員工模式的核心函數
 * ✅ 從 Supabase 視圖拉取數據，保留權限信息
 */
async function pullEventsFromViews(
  userId: string,
  onProgress?: (current: number, total: number, currentItem?: string, phase?: 'snapshot' | 'incremental') => void
): Promise<void> {
  console.log('📊 從員工視圖拉取數據...');
  
  try {
    // 1. 拉取市集數據（從視圖）
    if (onProgress) {
      onProgress(1, 4, '拉取市集數據...', 'incremental');
    }
    
    const { data: marketsData, error: marketsError } = await supabase
      .from('staff_accessible_markets')
      .select('*');
    
    if (marketsError) {
      console.error('❌ 拉取市集視圖失敗:', marketsError);
      throw marketsError;
    }
    
    console.log(`📥 拉取到 ${marketsData?.length || 0} 個市集`);
    
    // 2. 拉取商品數據（從視圖）
    if (onProgress) {
      onProgress(2, 4, '拉取商品數據...', 'incremental');
    }
    
    const { data: productsData, error: productsError } = await supabase
      .from('staff_accessible_products')
      .select('*');
    
    if (productsError) {
      console.error('❌ 拉取商品視圖失敗:', productsError);
      throw productsError;
    }
    
    console.log(`📥 拉取到 ${productsData?.length || 0} 個商品`);
    
    // 3. 同步到 IndexedDB（保留權限信息）
    if (onProgress) {
      onProgress(3, 4, '同步市集到本地...', 'incremental');
    }
    
    await syncMarketsToIndexedDB(marketsData || []);
    
    if (onProgress) {
      onProgress(4, 4, '同步商品到本地...', 'incremental');
    }
    
    await syncProductsToIndexedDB(productsData || []);
    
    // 4. 更新最後同步時間
    await updateLastSyncTimestamp();
    
    console.log('✅ 視圖數據同步完成');
  } catch (error) {
    console.error('❌ 視圖拉取失敗:', error);
    throw error; // 拋出錯誤，讓調用者處理降級
  }
}

/**
 * 同步市集到 IndexedDB（保留權限）
 * ✅ 合併視圖數據和本地數據
 */
async function syncMarketsToIndexedDB(markets: any[]): Promise<void> {
  console.log(`📝 同步 ${markets.length} 個市集到 IndexedDB...`);
  
  for (const market of markets) {
    try {
      const existing = await db.markets.get(market.id);
      
      // 準備市集數據（保留權限信息）
      const marketData = {
        id: market.id,
        name: market.name,
        location: market.location,
        dates: market.dates,
        startDate: market.start_date || market.startDate,
        endDate: market.end_date || market.endDate,
        startTime: market.start_time || market.startTime,
        endTime: market.end_time || market.endTime,
        status: market.status,
        
        // ✅ 保留權限信息
        access_type: market.access_type,
        permissions: market.permissions,
        relationship_owner_id: market.relationship_owner_id,
        
        // 其他欄位
        owner_id: market.owner_id,
        is_collaborative: market.is_collaborative,
        sync_status: 'synced' as const,
        
        // 時間軸（✅ 修復：使用嚴格的 null/undefined 檢查，避免空字符串被誤判）
        earlyEntryEnabled: market.early_entry_enabled !== null && market.early_entry_enabled !== undefined 
          ? market.early_entry_enabled 
          : (existing?.earlyEntryEnabled || false),
        earlyEntryTime: market.early_entry_time !== null && market.early_entry_time !== undefined 
          ? market.early_entry_time 
          : existing?.earlyEntryTime || null,
        checkInTime: market.check_in_time !== null && market.check_in_time !== undefined 
          ? market.check_in_time 
          : existing?.checkInTime || null,
        operatingStartTime: market.operating_start_time !== null && market.operating_start_time !== undefined 
          ? market.operating_start_time 
          : existing?.operatingStartTime || null,
        operatingEndTime: market.operating_end_time !== null && market.operating_end_time !== undefined 
          ? market.operating_end_time 
          : existing?.operatingEndTime || null,
        
        // 財務
        registrationFee: market.registration_fee || market.registrationFee || 0,
        boothCost: market.booth_cost || market.boothCost || 0,
        deposit: market.deposit,
        tableRental: market.table_rental || market.tableRental,
        chairRental: market.chair_rental || market.chairRental,
        umbrellaRental: market.umbrella_rental || market.umbrellaRental,
        tableclothRental: market.tablecloth_rental || market.tableclothRental,
        commissionRate: market.commission_rate || market.commissionRate,
        
        // 免費標記
        tableFree: market.table_free || market.tableFree,
        chairFree: market.chair_free || market.chairFree,
        umbrellaFree: market.umbrella_free || market.umbrellaFree,
        tableclothFree: market.tablecloth_free || market.tableclothFree,
        
        // 統計
        totalRevenue: market.total_revenue || market.totalRevenue || 0,
        totalProfit: market.total_profit || market.totalProfit || 0,
        totalInteractions: market.total_interactions || market.totalInteractions || 0,
        totalDeals: market.total_deals || market.totalDeals || 0,
        
        notes: market.notes,
        
        // 時間戳
        createdAt: market.created_at ? new Date(market.created_at).getTime() : Date.now(),
        updatedAt: market.updated_at ? new Date(market.updated_at).getTime() : Date.now(),
      };
      
      if (existing) {
        // 更新現有記錄（保留權限信息）
        await db.markets.update(market.id, marketData);
      } else {
        // 新增記錄
        await db.markets.add(marketData);
      }
    } catch (error) {
      console.error(`❌ 同步市集失敗: ${market.id}`, error);
      // 繼續處理下一個
    }
  }
  
  console.log('✅ 市集同步完成');
}

/**
 * 同步商品到 IndexedDB（保留權限）
 * ✅ 合併視圖數據和本地數據
 */
async function syncProductsToIndexedDB(products: any[]): Promise<void> {
  console.log(`📝 同步 ${products.length} 個商品到 IndexedDB...`);
  
  for (const product of products) {
    try {
      const existing = await db.products.get(product.id);
      
      // 準備商品數據（保留權限信息）
      const productData = {
        id: product.id,
        owner_id: product.owner_id,
        market_id: product.market_id,
        name: product.name,
        category: product.category,
        price: product.price || 0,
        cost: product.cost,
        
        // ✅ 保留權限信息
        access_type: product.access_type,
        permissions: product.permissions,
        relationship_owner_id: product.relationship_owner_id,
        
        // 視覺
        iconName: product.icon_name || product.iconName,
        colorCode: product.color_code || product.colorCode,
        
        // 庫存
        stock: product.stock,
        unlimitedStock: product.unlimited_stock || product.unlimitedStock || false,
        isActive: product.is_active !== undefined ? product.is_active : true,
        isShared: product.is_shared || product.isShared,
        
        // 統計
        totalSold: product.total_sold || product.totalSold || 0,
        
        description: product.description,
        
        // 時間戳
        createdAt: product.created_at ? new Date(product.created_at).getTime() : Date.now(),
        updatedAt: product.updated_at ? new Date(product.updated_at).getTime() : Date.now(),
      };
      
      if (existing) {
        // 更新現有記錄（保留權限信息）
        await db.products.update(product.id, productData);
      } else {
        // 新增記錄
        await db.products.add(productData);
      }
    } catch (error) {
      console.error(`❌ 同步商品失敗: ${product.id}`, error);
      // 繼續處理下一個
    }
  }
  
  console.log('✅ 商品同步完成');
}

