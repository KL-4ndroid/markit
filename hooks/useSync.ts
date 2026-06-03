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
import { markEventSynced, markEventLocalOnly, bindEventActor, markEventBlocked } from '@/lib/sync/event-sync-service';
import { getLatestSnapshot, loadSnapshot, autoCreateSnapshot } from '@/lib/db/snapshot';
import {
  marketAccessRowToLocal,
  marketRowToLocal,
  normalizeEventForCloud,
  normalizeEventPayloadForLocal,
  pickMarketId,
  productAccessRowToLocal,
  productRowToLocal,
} from '@/lib/data-mappers';
import { sanitizeObject, sanitizeEvents, sanitizeStats } from '@/lib/data-sanitization';
import type { Market, DailyStats, Product } from '@/types/db';
import type { Event } from '@/types/db';
import type { RoleMode } from '@/lib/auth/role-mode';

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
 * ✅ 全局同步鎖：防止並發同步導致的競態條件
 * 確保同一時間只有一個同步在執行
 */
let isSyncLocked = false;

const SYNC_PAUSE_UNTIL_KEY = 'sync_pause_until';
const SYNC_PERMISSION_ERROR_LOG_KEY = 'sync_permission_error_history';
const PERMISSION_ERROR_PAUSE_MS = 10 * 60 * 1000;

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
  // ✅ 重置全局同步鎖
  isSyncLocked = false;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(SYNC_PAUSE_UNTIL_KEY);
    } catch (error) {
      console.error('清除同步暫停標記失敗:', error);
    }
  }
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

function getSyncPauseUntil(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const value = Number(localStorage.getItem(SYNC_PAUSE_UNTIL_KEY) || '0');
    return Number.isFinite(value) ? value : 0;
  } catch (error) {
    console.error('讀取同步暫停標記失敗:', error);
    return 0;
  }
}

function pauseSyncTemporarily(): number {
  const pauseUntil = Date.now() + PERMISSION_ERROR_PAUSE_MS;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SYNC_PAUSE_UNTIL_KEY, String(pauseUntil));
    } catch (error) {
      console.error('保存同步暫停標記失敗:', error);
    }
  }

  return pauseUntil;
}

interface UseSyncOptions {
  enabled?: boolean;       // 是否啟用同步
  interval?: number;       // 同步間隔（毫秒）
  throttle?: number;       // 節流延遲（毫秒）
  roleMode?: RoleMode;    // 角色模式
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
    roleMode,
  } = options;

  const { user, isConfigured } = useAuth();

  // ✅ Phase 3: 角色模式 helper
  // 完全由 SyncProvider 傳入的 roleMode 決定，不 fallback 到 localStorage
  const effectiveStaffMode = roleMode === 'staff';
  
  // ✅ 使用全局狀態，並訂閱更新
  const [state, setState] = useState<SyncState>(globalSyncState);

  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const snapshotCheckIntervalRef = useRef<NodeJS.Timeout>();
  const isSyncingRef = useRef(false);
  const lastSnapshotCheckFailedRef = useRef(false);
  const syncFnRef = useRef<() => Promise<void>>();
  const throttledSyncFnRef = useRef<() => void>();
  /** ✅ 只允許 force_initial_sync 消耗一次的本地標記（不受 module-level 重置影響） */
  const forceSyncExecutedRef = useRef(false);

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

  // ✅ force_initial_sync 專用 effect
  // 不被 hasSetupIntervals 阻擋，確保條件就緒時才消耗 flag
  useEffect(() => {
    if (
      !enabled ||
      !isConfigured ||
      !user ||
      !syncFnRef.current ||
      forceSyncExecutedRef.current
    ) {
      return;
    }

    if (typeof window !== 'undefined' && sessionStorage.getItem('force_initial_sync') === '1') {
      forceSyncExecutedRef.current = true;
      sessionStorage.removeItem('force_initial_sync');
      syncFnRef.current();
    }
  }, [enabled, isConfigured, user]);

  /**
   * 執行同步
   */
  const sync = useCallback(async () => {
    // 檢查條件
    if (!enabled || !isConfigured || !user || isSyncingRef.current) {
      return;
    }

    const pauseUntil = getSyncPauseUntil();
    if (pauseUntil > Date.now()) {
      updateGlobalState(prev => ({
        ...prev,
        status: SyncStatus.ERROR,
        error: '同步因權限錯誤暫停，稍後會自動重試',
      }));
      return;
    }

    // ✅ 原子操作：檢查並獲取全局同步鎖（防止並發同步）
    if (isSyncLocked) {
      console.log('⏸️ 同步已在進行中，跳過此次請求');
      return;
    }
    isSyncLocked = true; // ✅ 立即設置鎖，避免 Race Condition

    // 檢查網路狀態
    if (!navigator.onLine) {
      isSyncLocked = false; // ✅ 釋放鎖
      setState(prev => ({ ...prev, status: SyncStatus.OFFLINE }));
      return;
    }

    // ✅ 在同步開始前記錄 pendingCount（用於決定是否顯示大彈窗）
    const initialPendingCount = await db.events
      .where('sync_status')
      .anyOf(['pending', 'local_only'])
      .count();

    // ✅ 設置本地同步標記
    isSyncingRef.current = true;
    updateGlobalState(prev => ({ 
      ...prev, 
      status: SyncStatus.SYNCING, 
      error: null,
      pendingCount: initialPendingCount, // ✅ 立即更新 pendingCount
    }));

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
      }, effectiveStaffMode);

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
        console.warn('⚠️ 偵測到權限錯誤，暫停同步並保留本地資料', {
          errorCode: error.code,
          errorMessage: error.message,
          timestamp: new Date().toISOString(),
          userId: user.id,
        });
        await handlePermissionSyncError(error, user.id);
        return;
      }

      updateGlobalState(prev => ({
        ...prev,
        status: SyncStatus.ERROR,
        error: error.message || '同步失敗',
      }));
    } finally {
      // ✅ 釋放全局同步鎖
      isSyncLocked = false;
      isSyncingRef.current = false;
    }
  }, [enabled, isConfigured, user, effectiveStaffMode]);

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
 * Push: 上傳本地未同步的事件（強化版：等冪性 + 順序處理）
 * 
 * ✅ 強化功能：
 * 1. 等冪性檢查：上傳前檢查事件是否已存在
 * 2. 順序處理：嚴格按 timestamp 升序處理
 * 3. 批次提交：每 10 個事件一批
 * 4. 錯誤恢復：失敗的事件不阻塞後續
 * 
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
  
  // 🔒 安全檢查：過濾掉非法事件（防止數據盜取）
  const validEvents: typeof pendingEvents = [];
  const invalidEvents: typeof pendingEvents = [];
  
  for (const event of pendingEvents) {
    // 情況 1: 當前用戶創建的事件
    if (event.actor_id === userId) {
      validEvents.push(event);
      continue;
    }
    
    // 情況 2: 本地模式創建的事件（需要更新 actor_id）
    if (event.actor_id === 'local') {
      console.log(`📝 更新本地事件的 actor_id: ${event.type} (${event.id?.substring(0, 8)}...)`);
      await bindEventActor(event.id!, userId);
      event.actor_id = userId;
      validEvents.push(event);
      continue;
    }
    
    // 其他情況：非法事件
    console.warn(`🚨 非法事件：${event.type} (actor_id: ${event.actor_id}, 當前用戶: ${userId})`);
    invalidEvents.push(event);
  }
  
  if (invalidEvents.length > 0) {
    console.warn(`🚨 安全警告：檢測到 ${invalidEvents.length} 個非法事件（actor_id 不匹配）`);
    
    // 標記為無效，不再重試
    for (const event of invalidEvents) {
      await markEventBlocked(event.id!, 'actor_id_mismatch', event.actor_id);
    }
  }

  if (validEvents.length === 0) {
    return 0;
  }

  // ✅ 強化 1：嚴格按 timestamp 升序排序（確保順序性）
  const sortedEvents = validEvents.sort((a, b) => a.timestamp - b.timestamp);
  const total = sortedEvents.length;

  console.log(`📤 開始上傳 ${total} 個事件（強化版：等冪性 + 順序處理）...`);

  // ✅ 強化 2：批次處理（每 10 個一批）
  const BATCH_SIZE = 10;
  let uploadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (let batchStart = 0; batchStart < sortedEvents.length; batchStart += BATCH_SIZE) {
    const batch = sortedEvents.slice(batchStart, batchStart + BATCH_SIZE);
    
    // 順序處理每個事件
    for (let i = 0; i < batch.length; i++) {
      const event = batch[i];
      const globalIndex = batchStart + i;
      
      // 更新進度
      if (onProgress) {
        onProgress(globalIndex + 1, total, `${event.type} (${event.id?.substring(0, 8)}...)`);
      }
      
      try {
        // ✅ 強化 3：等冪性檢查（避免重複上傳）
        const cloudEvent = normalizeEventForCloud(event);

        const { data: existing, error: checkError } = await supabase
          .from('events')
          .select('id, sync_status')
          .eq('id', event.id)
          .maybeSingle();
        
        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }
        
        // 如果已存在，標記為已同步並跳過
        if (existing) {
          console.log(`✅ 事件已存在，跳過: ${event.type} (${event.id?.substring(0, 8)}...)`);
          await markEventSynced(event.id!);
          skippedCount++;
          continue;
        }
        
        // ✅ 強化 4：上傳事件（使用 insert 而非 upsert，更明確）
        const { error: insertError } = await supabase
          .from('events')
          .insert({
            id: event.id,
            type: event.type,
            payload: cloudEvent.payload,
            actor_id: userId,
            market_id: cloudEvent.market_id,
            timestamp: new Date(event.timestamp).toISOString(),
            metadata: event.metadata,
          });

        if (insertError) {
          // PostgreSQL unique violation (並發上傳導致的重複)
          if (insertError.code === '23505') {
            console.log(`✅ 事件已存在（並發上傳），標記為已同步: ${event.id?.substring(0, 8)}...`);
            await markEventSynced(event.id!);
            skippedCount++;
            continue;
          }
          
          // 外鍵衝突：market 不存在
          if (insertError.code === '23503' && insertError.message?.includes('events_market_id_fkey')) {
            console.warn(`⚠️ 外鍵衝突：market_id ${event.market_id} 不存在`);
            
            // 檢查是否有對應的 market_created 事件待同步
            const marketCreatedEvent = sortedEvents.find(
              e => e.type === 'market_created' && 
                   (e.market_id === cloudEvent.market_id || pickMarketId(e.payload) === cloudEvent.market_id)
            );
            
            if (marketCreatedEvent && marketCreatedEvent.id !== event.id) {
              console.log(`🔄 發現 market_created 事件，保持 pending 狀態，等待下一輪同步`);
              // 保持 pending 狀態
              failedCount++;
              continue;
            } else {
              console.error(`❌ 找不到對應的 market_created 事件，標記為 local_only`);
              await markEventLocalOnly(event.id!);
              failedCount++;
              continue;
            }
          }
          
          // RLS 政策錯誤 - market_created 需要特殊處理
          if (insertError.code === '42501' && event.type === 'market_created' && cloudEvent.market_id) {
            console.log(`🔄 RLS 阻止 market_created，嘗試先創建 market_members...`);
            
            const memberCreated = await ensureMarketMember(userId, cloudEvent.market_id);
            
            if (memberCreated) {
              // 重試上傳
              const { error: retryError } = await supabase
                .from('events')
                .insert({
                  id: event.id,
                  type: event.type,
                  payload: cloudEvent.payload,
                  actor_id: userId,
                  market_id: cloudEvent.market_id,
                  timestamp: new Date(event.timestamp).toISOString(),
                  metadata: event.metadata,
                });
              
              if (!retryError) {
                console.log(`✅ 重試成功: ${event.type} (${event.id?.substring(0, 8)}...)`);
                await markEventSynced(event.id!);
                uploadedCount++;
                continue;
              }
            }
            
            console.error(`❌ RLS 政策阻止：${event.type}`, insertError.message);
            await markEventLocalOnly(event.id!);
            failedCount++;
            continue;
          }
          
          // 其他 RLS 政策錯誤
          if (insertError.code === 'PGRST301' || insertError.code === '42501' || insertError.message?.includes('policy')) {
            console.error(`❌ RLS 政策阻止：${event.type}`, insertError.message);
            await markEventLocalOnly(event.id!);
            failedCount++;
            continue;
          }
          
          // 其他錯誤
          console.error(`❌ 未知錯誤：${insertError.code} - ${insertError.message}`);
          await markEventLocalOnly(event.id!);
          failedCount++;
          continue;
        }

        // ✅ 上傳成功
        await markEventSynced(event.id!);
        
        uploadedCount++;
        
        // 如果是 market_created 事件，確保 market_members 記錄存在
        if (event.type === 'market_created' && event.market_id) {
          await ensureMarketMember(userId, event.market_id);
        }
        
      } catch (error: any) {
        console.error(`❌ 上傳事件異常: ${event.id}`, error);
        
        // 標記為錯誤，但繼續處理下一個事件
        await markEventLocalOnly(event.id!);
        failedCount++;
        continue;
      }
    }
  }

  console.log(`✅ 上傳完成：成功 ${uploadedCount}，跳過 ${skippedCount}，失敗 ${failedCount}，總計 ${total}`);
  return uploadedCount;
}

/**
 * Pull: 下載雲端新事件（使用快照優化）
 * 
 * 優化邏輯：
 * 1. ✅ 檢查是否為員工模式（員工模式不使用快照，直接從視圖拉取）
 * 2. 檢查本地是否為空（新設備）
 * 3. 如果是新設備，嘗試載入快照 + 增量事件
 * 4. 如果快照載入失敗，降級到全量同步
 * 5. 如果不是新設備，只下載增量事件
 * 
 * @returns 是否使用了快照同步（true = 使用快照，false = 全量同步）
 */
async function pullEventsWithSnapshot(
  userId: string,
  onProgress: (current: number, total: number, currentItem?: string, phase?: 'snapshot' | 'incremental') => void,
  effectiveStaffMode: boolean
): Promise<boolean> {
  try {
    // ✅ 步驟 0: 檢查是否為員工模式
    // 員工模式不使用快照，因為快照不包含權限信息
    if (effectiveStaffMode) {
      console.log('👥 員工模式：跳過快照，直接從視圖拉取');
      await pullAllEvents(userId, onProgress, effectiveStaffMode);
      return false; // ❌ 沒有使用快照
    }
    
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
    await pullAllEvents(userId, onProgress, effectiveStaffMode);
    return false; // ❌ 沒有使用快照
    
  } catch (error) {
    console.error('❌ 快照同步失敗，切換至全量同步:', error);
    // 最終降級方案
    await pullAllEvents(userId, onProgress, effectiveStaffMode);
    return false; // ❌ 沒有使用快照
  }
}

// ==================== Owner event pull marketIds helper ====================

/**
 * 取得 owner 可訪問的所有 market IDs（用於事件同步查詢）
 *
 * owner 可能沒有自己的 market_members record（如新設備 sync），
 * 因此 owner-owned markets 必須直接從 markets 表納入。
 */
async function getOwnerAccessibleMarketIds(userId: string): Promise<string[]> {
  const [{ data: memberMarkets, error: memberError }, { data: ownedMarkets, error: ownedError }] =
    await Promise.all([
      supabase.from('market_members').select('market_id').eq('user_id', userId),
      supabase.from('markets').select('id').eq('owner_id', userId),
    ]);

  if (memberError) throw memberError;
  if (ownedError) throw ownedError;

  const memberIds = (memberMarkets || []).map(m => m.market_id).filter(Boolean);
  const ownedIds = (ownedMarkets || []).map(m => m.id).filter(Boolean);

  return Array.from(new Set([...memberIds, ...ownedIds]));
}

// ==================== 下載增量事件（快照之後的事件）====================

/**
 * 下載增量事件（快照之後的事件）
 */
async function pullIncrementalEvents(
  userId: string,
  snapshotAt: string,
  onProgress?: (current: number, total: number, currentItem?: string) => void
): Promise<void> {
  const marketIds = await getOwnerAccessibleMarketIds(userId);

  // ✅ 修復：查詢團隊成員的用戶 ID（包括老闆和員工）
  let teamMemberIds: string[] = [userId]; // 至少包含自己
  
  if (marketIds.length > 0) {
    // 查詢所有團隊成員
    const { data: teamMembers } = await supabase
      .from('market_members')
      .select('user_id')
      .in('market_id', marketIds);
    
    if (teamMembers && teamMembers.length > 0) {
      // 去重
      teamMemberIds = Array.from(new Set([userId, ...teamMembers.map(m => m.user_id)]));
    }
  }

  // 查詢快照之後的新事件
  let query = supabase
    .from('events')
    .select('*')
    .gt('timestamp', snapshotAt)
    .order('timestamp', { ascending: true });

  // ✅ 過濾條件：市集事件 OR 團隊成員的全局事件（包括商品）
  if (marketIds.length > 0) {
    query = query.or(`market_id.in.(${marketIds.join(',')}),and(actor_id.in.(${teamMemberIds.join(',')}),market_id.is.null)`);
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

  // 更新最後同步時間（使用 max(created_at)）
  const validCreatedAt = (incrementalEvents || [])
    .map(e => new Date(e.created_at).getTime())
    .filter(ts => Number.isFinite(ts));

  if (validCreatedAt.length > 0) {
    await updateLastSyncTimestamp(Math.max(...validCreatedAt));
  } else {
    console.warn('[useSync] pullIncrementalEvents: no event has valid created_at, refusing to advance cursor');
  }
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
        const processedPayload = normalizeEventPayloadForLocal(event.payload);
        
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
  onProgress: (current: number, total: number, currentItem?: string, phase?: 'snapshot' | 'incremental') => void,
  effectiveStaffMode: boolean
): Promise<void> {
  // ✅ 檢查是否啟用員工模式
  if (effectiveStaffMode) {
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

  const marketIds = await getOwnerAccessibleMarketIds(userId);

  // ✅ 查詢新事件：包含市集事件 + 團隊成員的全局事件（如商品）
  let query = supabase
    .from('events')
    .select('*')
    .order('timestamp', { ascending: true });

  // 只拉取新事件
  if (lastSyncAt) {
    query = query.gt('created_at', new Date(lastSyncAt).toISOString());
  }

  // ✅ 修復：查詢團隊成員的用戶 ID（包括老闆和員工）
  let teamMemberIds: string[] = [userId]; // 至少包含自己
  
  if (marketIds.length > 0) {
    // 查詢所有團隊成員
    const { data: teamMembers } = await supabase
      .from('market_members')
      .select('user_id')
      .in('market_id', marketIds);
    
    if (teamMembers && teamMembers.length > 0) {
      // 去重
      teamMemberIds = Array.from(new Set([userId, ...teamMembers.map(m => m.user_id)]));
    }
  }

  // ✅ 過濾條件：市集事件 OR 團隊成員的全局事件（包括商品）
  if (marketIds.length > 0) {
    // 有市集：查詢市集事件 + 團隊成員的全局事件
    query = query.or(`market_id.in.(${marketIds.join(',')}),and(actor_id.in.(${teamMemberIds.join(',')}),market_id.is.null)`);
  } else {
    // 沒有市集：只拉取自己的全局事件
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
        const processedPayload = normalizeEventPayloadForLocal(event.payload);
        
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

  // 更新最後同步時間（使用 max(created_at)，若事件皆已存在則不推進）
  if (eventsToProcess.length > 0) {
    const validCreatedAt = eventsToProcess
      .map(e => new Date(e.created_at).getTime())
      .filter(ts => Number.isFinite(ts));

    if (validCreatedAt.length > 0) {
      await updateLastSyncTimestamp(Math.max(...validCreatedAt));
    } else {
      console.warn('[useSync] pullAllEvents: no event has valid created_at, refusing to advance cursor');
    }
  }
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
 * @param lastSyncedCreatedAt 本次實際處理的最後一筆事件的 created_at（Unix ms）
 *                           若不傳入則拋出錯誤，避免 caller 意外用 Date.now() 推進錯誤 cursor
 */
async function updateLastSyncTimestamp(lastSyncedCreatedAt: number): Promise<void> {
  if (lastSyncedCreatedAt == null || !Number.isFinite(lastSyncedCreatedAt)) {
    console.error('[useSync] updateLastSyncTimestamp: invalid lastSyncedCreatedAt, refusing to advance cursor');
    return;
  }
  try {
    const settings = await db.settings.toArray();
    if (settings[0]) {
      await db.settings.update(settings[0].id!, {
        lastSyncAt: lastSyncedCreatedAt,
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
 * 處理同步權限錯誤（403 Forbidden）
 * 保留本地資料，暫停同步一段時間，避免把暫時性 RLS/網路狀態誤判成永久失權。
 */
async function handlePermissionSyncError(error: any, userId: string): Promise<void> {
  const pauseUntil = pauseSyncTemporarily();
  const permissionErrorLog = {
    event: 'sync_permission_error',
    timestamp: new Date().toISOString(),
    reason: '403_forbidden_or_policy_violation',
    userId,
    errorCode: error?.code,
    errorMessage: error?.message,
    pauseUntil,
  };

  console.error('🚫 同步權限錯誤，已保留本地資料並暫停同步:', permissionErrorLog);

  try {
    if (typeof window !== 'undefined') {
      const history = JSON.parse(localStorage.getItem(SYNC_PERMISSION_ERROR_LOG_KEY) || '[]');
      history.push(permissionErrorLog);
      if (history.length > 10) {
        history.shift();
      }
      localStorage.setItem(SYNC_PERMISSION_ERROR_LOG_KEY, JSON.stringify(history));
    }
  } catch (storageError) {
    console.error('保存同步權限錯誤記錄失敗:', storageError);
  }

  updateGlobalState(prev => ({
    ...prev,
    status: SyncStatus.ERROR,
    error: '同步因權限錯誤暫停，稍後會自動重試',
    uploadProgress: undefined,
    downloadProgress: undefined,
  }));

  if (typeof window !== 'undefined') {
    const { toast } = await import('sonner');
    toast.warning('同步暫時因權限檢查失敗而暫停；本地資料已保留，稍後會自動重試。');
  }
}

// ==================== 員工模式：視圖拉取函數 ====================

/**
 * 從員工視圖拉取數據（員工模式）
 * ✅ 這是員工模式的核心函數
 * ✅ 從 Supabase 視圖拉取數據，保留權限信息
 * ✅ 不使用 lastSyncAt 過濾（避免跨用戶污染）
 * ✅ 同步過程不刪除本地資料；只記錄隔離性驗證結果
 */
async function pullEventsFromViews(
  userId: string,
  onProgress?: (current: number, total: number, currentItem?: string, phase?: 'snapshot' | 'incremental') => void
): Promise<void> {
  console.log('📊 從員工視圖拉取數據（完整同步，不使用 lastSyncAt）...', {
    userId: userId.substring(0, 8),
  });
  
  try {
    // 1. 拉取市集數據（從視圖）
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
    
    // 2. 拉取商品數據（從視圖）
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
    
    // 3. 拉取事件數據（從視圖）
    // ⚠️ 重要：不使用 lastSyncAt 過濾，因為：
    // 1. 視圖已經處理了權限過濾
    // 2. lastSyncAt 是全局的，會被其他用戶污染
    // 3. 員工切換時需要完整同步所有可訪問的數據
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
    
    // 4. 同步到 IndexedDB（保留權限信息）
    if (onProgress) {
      onProgress(4, 5, '同步到本地數據庫...', 'incremental');
    }
    
    await syncMarketsToIndexedDB(marketsData || [], userId);
    await syncProductsToIndexedDB(productsData || [], userId);
    await syncEventsToIndexedDB(eventsData || []);
    
    // 5. 更新最後同步時間
    // staff 模式不使用 lastSyncAt 作為 cursor，但更新它有助於記錄最後同步時間
    if (eventsData && eventsData.length > 0) {
      const validCreatedAt = (eventsData || [])
        .map(e => new Date(e.created_at).getTime())
        .filter(ts => Number.isFinite(ts));
      if (validCreatedAt.length > 0) {
        await updateLastSyncTimestamp(Math.max(...validCreatedAt));
      }
    }

    // 6. 進度完成回報（不論是否有事件都應回報）
    if (onProgress) {
      onProgress(5, 5, '完成同步...', 'incremental');
    }
    
    // ✅ 驗證數據隔離性；同步流程只記錄，不自動刪除本地資料。
    try {
      const { validateDataIsolation } = await import('@/lib/db/clear-user-data');
      const validation = await validateDataIsolation(userId);
      
      if (!validation.isValid) {
        console.warn('⚠️ 本地存在非當前用戶資料，已保留並僅記錄:', validation.violations);
      } else {
        console.log('✅ 數據隔離性驗證通過');
      }
    } catch (validationError) {
      console.error('⚠️ 數據隔離性驗證失敗:', validationError);
    }
    
    console.log('✅ 視圖數據同步完成');
  } catch (error) {
    console.error('❌ 視圖拉取失敗:', error);
    throw error; // 拋出錯誤，讓調用者處理降級
  }
}

/**
 * 同步市集到 IndexedDB（保留權限）
 * ✅ 合併視圖數據和本地數據
 * ✅ 只同步當前用戶可訪問的市集
 */
async function syncMarketsToIndexedDB(markets: any[], currentUserId: string): Promise<void> {
  console.log(`📝 同步 ${markets.length} 個市集到 IndexedDB...`, {
    currentUserId: currentUserId.substring(0, 8),
  });
  
  // ✅ 調試：打印前 3 個市集的詳細信息
  if (markets.length > 0) {
    console.log('🔍 市集數據樣本（前3個）:', markets.slice(0, 3).map(m => ({
      id: m.id?.substring(0, 8),
      name: m.name,
      owner_id: m.owner_id?.substring(0, 8),
      access_type: m.access_type,
      status: m.status,
      isDeleted: m.isDeleted,
    })));
  }
  
  // ✅ Staff 資料脫敏：在寫入 IndexedDB 前移除敏感欄位
  const staffRole = { isStaff: true };

  for (const market of markets) {
    try {
      const existing = await db.markets.get(market.id);
      // ✅ 先 sanitize snake_case row，再交給 mapper
      const sanitizedRow = sanitizeObject(market, 'market', staffRole);
      const mappedMarket = marketAccessRowToLocal(sanitizedRow as Record<string, unknown>);

      // 準備市集數據（保留權限信息）
      const marketData = {
        ...mappedMarket,
        sync_status: 'synced' as const,
        earlyEntryEnabled: mappedMarket.earlyEntryEnabled ?? existing?.earlyEntryEnabled ?? false,
        earlyEntryTime: mappedMarket.earlyEntryTime ?? existing?.earlyEntryTime,
        checkInTime: mappedMarket.checkInTime ?? existing?.checkInTime,
        operatingStartTime: mappedMarket.operatingStartTime ?? existing?.operatingStartTime,
        operatingEndTime: mappedMarket.operatingEndTime ?? existing?.operatingEndTime,
      };

      // ✅ Mapper 可能補出假 0 敏感欄位（如 boothCost: 0, registrationFee: 0）；
      // ✅ Dexie update 不會刪除舊 key，故用 put 完全替換 record。
      const sanitizedMarketData = sanitizeObject(marketData, 'market', staffRole);
      await db.markets.put({ ...sanitizedMarketData, id: market.id } as Market);
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
 * ✅ 只同步當前用戶可訪問的商品
 * ✅ 驗證 owner_id，防止數據混合
 */
async function syncProductsToIndexedDB(products: any[], currentUserId: string): Promise<void> {
  console.log(`📝 同步 ${products.length} 個商品到 IndexedDB...`, {
    currentUserId: currentUserId.substring(0, 8),
  });
  
  // ✅ 調試：打印前 3 個商品的詳細信息
  if (products.length > 0) {
    console.log('🔍 商品數據樣本（前3個）:', products.slice(0, 3).map(p => ({
      id: p.id?.substring(0, 8),
      name: p.name,
      owner_id: p.owner_id?.substring(0, 8),
      access_type: p.access_type,
      relationship_owner_id: p.relationship_owner_id?.substring(0, 8),
    })));
  }
  
  let syncedCount = 0;
  let skippedCount = 0;
  
  // ✅ Staff 資料脫敏：在寫入 IndexedDB 前移除敏感欄位
  const staffRole = { isStaff: true };

  for (const product of products) {
    try {
      // ✅ 驗證：確保商品屬於當前用戶或當前用戶可訪問
      // 1. 如果是 owner 模式，owner_id 必須是當前用戶
      // 2. 如果是 staff 模式，relationship_owner_id 必須存在
      const isOwner = product.access_type === 'owner' && product.owner_id === currentUserId;
      const isStaff = product.access_type === 'staff' && product.relationship_owner_id;

      if (!isOwner && !isStaff) {
        console.warn(`⚠️ 跳過不屬於當前用戶的商品: ${product.name} (owner: ${product.owner_id?.substring(0, 8)})`);
        skippedCount++;
        continue;
      }

      // ✅ 先 sanitize snake_case row，再交給 mapper
      const sanitizedRow = sanitizeObject(product, 'product', staffRole);
      const mappedProduct = productAccessRowToLocal(sanitizedRow as Record<string, unknown>);

      // 準備商品數據（保留權限信息）
      const productData = {
        ...mappedProduct,
        unlimitedStock: mappedProduct.unlimitedStock ?? false,
        isActive: mappedProduct.isActive ?? true,
      };

      // ✅ Mapper 可能補出假 0 敏感欄位（如 cost: 0）；
      // ✅ Dexie update 不會刪除舊 key，故用 put 完全替換 record。
      const sanitizedProductData = sanitizeObject(productData, 'product', staffRole);
      await db.products.put({ ...sanitizedProductData, id: product.id } as Product);
      
      syncedCount++;
    } catch (error) {
      console.error(`❌ 同步商品失敗: ${product.id}`, error);
      skippedCount++;
      // 繼續處理下一個
    }
  }
  
  console.log(`✅ 商品同步完成: 成功 ${syncedCount}，跳過 ${skippedCount}，總計 ${products.length}`);
}

/**
 * 同步事件到 IndexedDB（保留權限）
 * ✅ 重放事件以更新讀取模型
 * ✅ Staff 模式：事件寫入 IndexedDB 前執行脫敏
 * ✅ Staff 模式：handler replay 後清理衍生敏感 projection
 */

/** 會寫出敏感衍生資料的事件類型 */
const PROJECTION_EVENT_TYPES = new Set(['deal_closed', 'deal_deleted']);

const staffRole = { isStaff: true };

/**
 * Staff sync 專用：handler replay 後，清理 markets 和 dailyStats 的敏感 projection。
 * handler 根據已脫敏的 event payload 寫入衍生資料，
 * 這些衍生資料（如 totalProfit、cost）必須在寫入後移除。
 *
 * 注意：不使用 setter 設成 0，避免 analytics 誤判為真實 0 成本。
 * 直接刪除 key，使欄位變成 undefined。
 */
async function sanitizeStaffProjectionsAfterReplay(
  event: { type: string; market_id?: string; payload?: any }
): Promise<void> {
  if (!PROJECTION_EVENT_TYPES.has(event.type)) return;

  const marketId: string | undefined =
    event.payload?.market_id ?? event.payload?.marketId ?? event.market_id;
  if (!marketId) return;

  const existingMarket = await db.markets.get(marketId);
  if (existingMarket) {
    const sanitized = sanitizeObject(existingMarket, 'market', staffRole);
    // ✅ update 不刪除舊 key，改用 put 完全替換，確保敏感欄位確實消失
    await db.markets.put({ ...sanitized, id: marketId } as Market);
  }

  const dailyStats = await db.dailyStats.where('marketId').equals(marketId).toArray();
  for (const stat of dailyStats) {
    if (stat.id === undefined) continue;
    const sanitized = sanitizeStats(stat, staffRole);
    // ✅ update 不刪除舊 key，改用 put 完全替換，確保敏感欄位確實消失
    await db.dailyStats.put({ ...sanitized, id: stat.id } as DailyStats);
  }
}

async function syncEventsToIndexedDB(events: any[]): Promise<void> {
  // ✅ Staff 資料脫敏：在寫入 IndexedDB 前移除敏感欄位
  const sanitizedEvents = sanitizeEvents(events, staffRole);

  console.log(`📝 同步 ${sanitizedEvents.length} 個事件到 IndexedDB...`);
  
  let processedCount = 0;
  let skippedCount = 0;
  
  for (const event of sanitizedEvents) {
    try {
      // 檢查是否已存在
      const existing = await db.events.get(event.id);
      
      if (existing) {
        skippedCount++;
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
      
      // 重放事件處理器（更新讀取模型）
      const { eventHandlers } = await import('@/lib/db/events');
      const handler = eventHandlers[event.type as keyof typeof eventHandlers];
      
      if (handler) {
        // ✅ 修復：將 Supabase 的底線式 payload 轉換為駝峰式
        const processedPayload = normalizeEventPayloadForLocal(event.payload);

        await handler({
          id: event.id,
          type: event.type,
          payload: processedPayload,
          timestamp: new Date(event.timestamp).getTime(),
          actor_id: event.actor_id,
          market_id: event.market_id,
        } as Event, db);

        // ✅ Staff 清理：handler replay 可能已寫入敏感 projection，隨即移除
        await sanitizeStaffProjectionsAfterReplay(event);
      }

      processedCount++;
    } catch (error: any) {
      // 如果是 ConstraintError（Key already exists），靜默跳過
      if (error.name === 'ConstraintError') {
        skippedCount++;
        continue;
      }

      console.error(`❌ 同步事件失敗: ${event.type} (${event.id?.substring(0, 8)}...)`, error);
      // 繼續處理下一個
    }
  }
  
  console.log(`✅ 事件同步完成：處理 ${processedCount}，跳過 ${skippedCount}，總計 ${events.length}`);
}

// ==================== 衝突解決（Conflict Resolution） ====================

/**
 * 衝突解決策略
 * 
 * 規則：
 * 1. Last-Write-Wins (LWW)：時間戳較新的優先
 * 2. 事件不可變：events 表不會衝突（UUID 唯一）
 * 3. 快照表衝突：比較 updatedAt，取較新的
 * 4. 特殊處理：統計欄位使用累加（如 totalRevenue）
 */
interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge';
  reason: string;
}

/**
 * 解決市集數據衝突
 * 
 * @param localData - 本地數據
 * @param remoteData - 雲端數據
 * @returns 衝突解決策略
 */
async function resolveMarketConflict(
  localData: any,
  remoteData: any
): Promise<ConflictResolution> {
  const normalizedRemote = marketRowToLocal(remoteData as Record<string, unknown>);

  // 規則 1：比較 updatedAt
  const localUpdatedAt = localData.updatedAt || 0;
  const remoteUpdatedAt = normalizedRemote.updatedAt || 0;
  
  if (localUpdatedAt > remoteUpdatedAt) {
    return {
      strategy: 'local',
      reason: '本地數據較新',
    };
  }
  
  if (remoteUpdatedAt > localUpdatedAt) {
    return {
      strategy: 'remote',
      reason: '雲端數據較新',
    };
  }
  
  // 規則 2：時間戳相同，比較統計欄位
  const localRevenue = localData.totalRevenue || 0;
  const remoteRevenue = normalizedRemote.totalRevenue || 0;
  
  const localDeals = localData.totalDeals || 0;
  const remoteDeals = normalizedRemote.totalDeals || 0;
  
  if (localRevenue !== remoteRevenue || localDeals !== remoteDeals) {
    return {
      strategy: 'merge',
      reason: '統計欄位不一致，需要合併',
    };
  }
  
  // 規則 3：完全相同，使用本地
  return {
    strategy: 'local',
    reason: '數據相同，保留本地',
  };
}

/**
 * 執行市集數據合併
 * 
 * @param localData - 本地數據
 * @param remoteData - 雲端數據
 * @returns 合併後的數據
 */
async function mergeMarketData(
  localData: any,
  remoteData: any
): Promise<any> {
  console.log(`🔀 合併市集數據: ${localData.id?.substring(0, 8)}...`);
  const normalizedRemote = marketRowToLocal(remoteData as Record<string, unknown>);
  
  return {
    ...normalizedRemote, // 基礎數據使用雲端
    
    // 統計欄位使用較大值（避免數據丟失）
    totalRevenue: Math.max(
      localData.totalRevenue || 0,
      normalizedRemote.totalRevenue || 0
    ),
    totalProfit: Math.max(
      localData.totalProfit || 0,
      normalizedRemote.totalProfit || 0
    ),
    totalDeals: Math.max(
      localData.totalDeals || 0,
      normalizedRemote.totalDeals || 0
    ),
    totalInteractions: Math.max(
      localData.totalInteractions || 0,
      normalizedRemote.totalInteractions || 0
    ),
    
    // 時間戳使用較新的
    updatedAt: Math.max(
      localData.updatedAt || 0,
      normalizedRemote.updatedAt || 0
    ),
  };
}

/**
 * 解決商品數據衝突
 * 
 * @param localData - 本地數據
 * @param remoteData - 雲端數據
 * @returns 衝突解決策略
 */
async function resolveProductConflict(
  localData: any,
  remoteData: any
): Promise<ConflictResolution> {
  const normalizedRemote = productRowToLocal(remoteData as Record<string, unknown>);

  // 規則 1：比較 updatedAt
  const localUpdatedAt = localData.updatedAt || 0;
  const remoteUpdatedAt = normalizedRemote.updatedAt || 0;
  
  if (localUpdatedAt > remoteUpdatedAt) {
    return {
      strategy: 'local',
      reason: '本地數據較新',
    };
  }
  
  if (remoteUpdatedAt > localUpdatedAt) {
    return {
      strategy: 'remote',
      reason: '雲端數據較新',
    };
  }
  
  // 規則 2：時間戳相同，比較庫存和銷售統計
  const localStock = localData.stock || 0;
  const remoteStock = normalizedRemote.stock || 0;
  
  const localSold = localData.totalSold || 0;
  const remoteSold = normalizedRemote.totalSold || 0;
  
  if (localStock !== remoteStock || localSold !== remoteSold) {
    return {
      strategy: 'merge',
      reason: '庫存或銷售統計不一致，需要合併',
    };
  }
  
  // 規則 3：完全相同，使用本地
  return {
    strategy: 'local',
    reason: '數據相同，保留本地',
  };
}

/**
 * 執行商品數據合併
 * 
 * @param localData - 本地數據
 * @param remoteData - 雲端數據
 * @returns 合併後的數據
 */
async function mergeProductData(
  localData: any,
  remoteData: any
): Promise<any> {
  console.log(`🔀 合併商品數據: ${localData.id?.substring(0, 8)}...`);
  const normalizedRemote = productRowToLocal(remoteData as Record<string, unknown>);
  
  // 對於商品，庫存使用較小值（保守策略，避免超賣）
  // 銷售統計使用較大值（避免數據丟失）
  return {
    ...normalizedRemote, // 基礎數據使用雲端
    
    // 庫存使用較小值（保守策略）
    stock: Math.min(
      localData.stock || 0,
      normalizedRemote.stock || 0
    ),
    
    // 銷售統計使用較大值
    totalSold: Math.max(
      localData.totalSold || 0,
      normalizedRemote.totalSold || 0
    ),
    
    // 時間戳使用較新的
    updatedAt: Math.max(
      localData.updatedAt || 0,
      normalizedRemote.updatedAt || 0
    ),
  };
}

/**
 * 檢測並解決衝突（通用函數）
 * 
 * 使用場景：
 * 1. Pull 時發現本地和雲端數據不一致
 * 2. 多設備同時編輯同一筆數據
 * 
 * @param tableName - 表名
 * @param localData - 本地數據
 * @param remoteData - 雲端數據
 * @returns 是否發生衝突並已解決
 */
export async function detectAndResolveConflict(
  tableName: 'markets' | 'products',
  localData: any,
  remoteData: any
): Promise<boolean> {
  try {
    let resolution: ConflictResolution;
    
    // 根據表名選擇衝突解決策略
    if (tableName === 'markets') {
      resolution = await resolveMarketConflict(localData, remoteData);
    } else {
      resolution = await resolveProductConflict(localData, remoteData);
    }
    
    console.log(`🔍 衝突檢測: ${tableName} (${localData.id?.substring(0, 8)}...) - ${resolution.strategy} (${resolution.reason})`);
    
    // 執行策略
    switch (resolution.strategy) {
      case 'local':
        // 保留本地數據，不做任何操作
        return false;
      
      case 'remote':
        // 使用雲端數據，更新本地
        if (tableName === 'markets') {
          await db.markets.update(localData.id, {
            ...marketRowToLocal(remoteData as Record<string, unknown>),
          });
        } else {
          await db.products.update(localData.id, {
            ...productRowToLocal(remoteData as Record<string, unknown>),
          });
        }
        return true;
      
      case 'merge':
        // 合併數據
        let mergedData: any;
        
        if (tableName === 'markets') {
          mergedData = await mergeMarketData(localData, remoteData);
          await db.markets.update(localData.id, mergedData);
        } else {
          mergedData = await mergeProductData(localData, remoteData);
          await db.products.update(localData.id, mergedData);
        }
        
        console.log(`✅ 衝突已合併: ${tableName} (${localData.id?.substring(0, 8)}...)`);
        return true;
      
      default:
        return false;
    }
  } catch (error) {
    console.error(`❌ 衝突解決失敗: ${tableName} (${localData.id})`, error);
    return false;
  }
}
