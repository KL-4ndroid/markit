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
import { canonicalizeEvent } from '@/lib/db/data-canonicalization';
import { markEventSynced, markEventLocalOnly, bindEventActor, markEventBlocked } from '@/lib/sync/event-sync-service';
import { hasSemanticDuplicateDealClosedEvent } from '@/lib/sync/semantic-event-dedupe';
import { preflightStaffEventImport } from '@/lib/sync/staff-event-preflight';
import {
  collectProjectionMarketId,
  reconcileTouchedMarketProjections,
  shouldAutoRepairForContext,
  type ProjectionReconciliationContext,
} from '@/lib/sync/projection-reconciliation';
import { getEventMarketId } from '@/lib/events/event-read-model';
import { resetMarketProjectionFields, resetProductProjectionFields } from '@/lib/sync/projection-reset';
import {
  marketAccessRowToLocal,
  marketRowToLocal,
  normalizeEventForCloud,
  normalizeEventPayloadForLocal,
  pickMarketId,
  productAccessRowToLocal,
  productRowToLocal,
} from '@/lib/data-mappers';
import {
  sanitizeWithLevel,
  sanitizeArrayWithLevel,
  sanitizeEventsWithLevel,
  createPermissionGate,
  type InfoLevel,
} from '@/lib/data-sanitization';
import type { Market, DailyStats, Product } from '@/types/db';
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
 * ✅ 全局同步鎖：防止並發同步導致的競態條件
 * 確保同一時間只有一個同步在執行
 */
let isSyncLocked = false;
let activeSyncIdentity: string | null = null;

const SYNC_PAUSE_UNTIL_KEY = 'sync_pause_until';
const SYNC_PERMISSION_ERROR_LOG_KEY = 'sync_permission_error_history';
const PERMISSION_ERROR_PAUSE_MS = 10 * 60 * 1000;

function createCanonicalSyncedEvent(event: any): Event {
  const localEvent = {
    id: event.id,
    type: event.type,
    payload: event.payload,
    actor_id: event.actor_id,
    market_id: event.market_id,
    timestamp: new Date(event.timestamp).getTime(),
    sync_status: 'synced',
    metadata: event.metadata,
  } as Event;

  return canonicalizeEvent(localEvent).event;
}

async function reconcileSyncedProjectionMarkets(
  marketIds: Set<string>,
  context: ProjectionReconciliationContext
): Promise<void> {
  if (marketIds.size === 0) return;

  try {
    // ✅ C3.4 修復：根據 context 決定是否 auto-repair。
    // owner-full / owner-incremental / manual → events 較完整，可信 auto-repair。
    // staff-view / snapshot → partial events 風險，保持 observation-only。
    const dryRun = !shouldAutoRepairForContext(context);

    const result = await reconcileTouchedMarketProjections(marketIds, { context, dryRun });
    const detectedInflated = result.skipped.some(item => item.reason === 'dry_run');
    if (detectedInflated || result.errors.length > 0) {
      console.log(
        `[useSync] projection reconciliation (context=${context}, dryRun=${dryRun})`,
        result
      );
    }
  } catch (error) {
    console.warn('[useSync] projection reconciliation skipped:', error);
  }
}

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

function resetSyncRuntimeState() {
  hasExecutedInitialSync = false;
  hasSetupIntervals = false;
  isSyncLocked = false;
  updateGlobalState(() => ({
    status: SyncStatus.IDLE,
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
    uploadProgress: undefined,
    downloadProgress: undefined,
  }));
}

/**
 * 重置初始同步標記（用於測試或登出）
 */
export function resetInitialSyncFlag() {
  activeSyncIdentity = null;
  resetSyncRuntimeState();
  // ✅ 重置全局同步鎖
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(SYNC_PAUSE_UNTIL_KEY);
    } catch (error) {
      console.error('清除同步暫停標記失敗:', error);
    }
  }
  // ✅ 重置全局狀態
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
  roleInfoLevel?: InfoLevel;  // 角色資訊揭露層級（3=老闆, 0-2=員工）
}

interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  pendingCount: number;
  error: string | null;
  uploadProgress?: { current: number; total: number; currentItem?: string };
  downloadProgress?: { current: number; total: number; currentItem?: string; phase?: 'incremental' };
}

/**
 * 背景同步 Hook
 */
export function useSync(options: UseSyncOptions = {}) {
  const {
    enabled = true,
    interval = 30000,
    throttle = 5000,
    roleInfoLevel,
  } = options;

  const { user, isConfigured } = useAuth();

  // ✅ 解析角色資訊揭露層級
  // 預設為 Level 3（老闆），由 SyncProvider 傳入精確值
  const effectiveInfoLevel = roleInfoLevel ?? 3;
  const effectiveStaffMode = effectiveInfoLevel < 3;
  const syncIdentity = enabled && isConfigured && user
    ? `${user.id}:${effectiveStaffMode ? 'staff' : 'owner'}`
    : null;
  
  // ✅ 使用全局狀態，並訂閱更新
  const [state, setState] = useState<SyncState>(globalSyncState);

  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const isSyncingRef = useRef(false);
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

  useEffect(() => {
    if (activeSyncIdentity === syncIdentity) {
      return;
    }

    activeSyncIdentity = syncIdentity;
    forceSyncExecutedRef.current = false;
    resetSyncRuntimeState();
  }, [syncIdentity]);

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
      // 1. Push local pending events.
      await pushEvents(user.id, (current, total, currentItem) => {
        updateGlobalState(prev => ({
          ...prev,
          uploadProgress: { current, total, currentItem },
        }));
      });

      // 2. Pull cloud events directly. Snapshot sync is disabled until it can be redesigned around
      // complete event history rather than projection-only tables.
      await pullAllEvents(user.id, (current, total, currentItem, phase) => {
        updateGlobalState(prev => ({
          ...prev,
          downloadProgress: { current, total, currentItem, phase },
        }));
      }, effectiveInfoLevel);

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
    if (!enabled || !isConfigured || !user || !syncIdentity) {
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
    // Check local pending events periodically.
    intervalRef.current = setInterval(async () => {
      const pendingCount = await db.events
        .where('sync_status')
        .anyOf(['pending', 'local_only'])
        .count();
      
      if (pendingCount > 0) {
        syncFnRef.current?.();
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, isConfigured, user, interval, syncIdentity]);

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

      if (await hasSemanticDuplicateDealClosedEvent(db, event)) {
        console.warn('[useSync] Skipping semantic duplicate deal_closed event during replay', {
          eventId: event.id,
          marketId: getEventMarketId(event),
        });
        continue;
      }

      const localEvent = createCanonicalSyncedEvent(event);

      // 插入事件
      await db.events.add(localEvent);

      // 重放事件處理器
      const { eventHandlers } = await import('@/lib/db/events');
      const handler = eventHandlers[event.type as keyof typeof eventHandlers];
      
      if (handler) {
        // ✅ 修復：將 Supabase 的底線式 payload 轉換為駝峰式（用於本地事件處理器）
        const processedPayload = normalizeEventPayloadForLocal(localEvent.payload);
        
        await handler({
          id: localEvent.id,
          type: localEvent.type,
          payload: processedPayload,
          timestamp: localEvent.timestamp,
          actor_id: localEvent.actor_id,
          market_id: localEvent.market_id,
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

/**
 * Hydrate missing markets from Cloud before replaying events.
 *
 * During Owner pull, events may reference markets not yet written to local IndexedDB
 * (e.g., first login, cross-device login, cache reset). Replaying handlers for such
 * events would fail because db.markets.get(marketId) returns undefined.
 *
 * This function batch-fetches missing markets from Supabase and writes them to local cache
 * before the event replay loop begins.
 *
 * ## 脫敏說明
 *
 * 員工視角下：
 * - Supabase RLS 只限制 row 級別，不限制 column
 * - `totalCost`、`profitMargin`、`boothCost` 等敏感欄位都會被讀出來
 * - 必須在寫入 IndexedDB 前脫敏
 *
 * @param marketIds - Set of market IDs referenced by incoming events
 * @param infoLevel - 資訊揭露層級（3=老闆, 0-2=員工）
 */
async function batchHydrateMarkets(
  marketIds: Set<string>,
  infoLevel: InfoLevel
): Promise<{ hydrated: Set<string>; missing: Set<string>; failed: Set<string> }> {
  const hydrated = new Set<string>();
  const missing = new Set<string>();
  const failed = new Set<string>();

  const toFetch = [...marketIds];
  if (toFetch.length === 0) {
    return { hydrated, missing, failed };
  }

  // Filter out markets already present in local cache
  const notYetLocal: string[] = [];
  for (const marketId of toFetch) {
    const exists = await db.markets.get(marketId);
    if (!exists) {
      notYetLocal.push(marketId);
    } else {
      hydrated.add(marketId);
    }
  }

  if (notYetLocal.length === 0) {
    return { hydrated, missing, failed };
  }

  // Batch fetch from Cloud
  const { data: markets, error } = await supabase
    .from('markets')
    .select('*')
    .in('id', notYetLocal);

  if (error) {
    console.error('[hydration] Failed to fetch markets from Cloud:', error);
    for (const id of notYetLocal) failed.add(id);
    return { hydrated, missing, failed };
  }

  const foundIds = new Set<string>();
  if (markets) {
    for (const market of markets) {
      foundIds.add(market.id);
      const localMarket = marketRowToLocal(market);
      // 經 PermissionGate 脫敏（員工視角下 cost/profit 等敏感欄位會被移除）
      const sanitized = marketGateForLevel(infoLevel).sanitizeMarketProjection(
        localMarket as unknown as Record<string, unknown>
      );
      // ✅ C3.4 修復：雲端 markets.total_* 是 handler 已累加過的 projection，
      // 不可作為本地 IndexedDB 的初始值，否則後續 deal_closed events replay
      // 會「+=」二次累加造成數倍膨脹。
      const reset = resetMarketProjectionFields(
        sanitized as unknown as typeof localMarket
      );
      await db.markets.put(reset as unknown as typeof localMarket);
      hydrated.add(market.id);
    }
  }

  for (const id of notYetLocal) {
    if (!foundIds.has(id)) missing.add(id);
  }

  if (missing.size > 0) {
    console.warn(`[hydration] Markets not found in Cloud (deleted or unauthorized): ${[...missing].join(', ')}`);
  }

  if (hydrated.size > 0) {
    console.log(`[hydration] Hydrated ${hydrated.size} markets from Cloud`);
  }

  return { hydrated, missing, failed };
}

/** 為指定 infoLevel 取得 market PermissionGate（包裝工廠） */
function marketGateForLevel(infoLevel: InfoLevel) {
  return createPermissionGate({ infoLevel, entity: 'market' });
}

async function pullAllEvents(
  userId: string,
  onProgress: (current: number, total: number, currentItem?: string, phase?: 'incremental') => void,
  infoLevel: InfoLevel
): Promise<void> {
  // ✅ 檢查是否啟用員工模式（infoLevel < 3 表示員工）
  if (infoLevel < 3) {
    try {
      console.log('📊 員工模式已啟用（infoLevel=' + infoLevel + '），嘗試從視圖拉取數據...');
      await pullEventsFromViews(userId, onProgress, infoLevel);
      console.log('✅ 視圖拉取成功');
      return;
    } catch (error) {
      // ⚠️ 降級漏洞已修補：員工模式下視圖失敗直接拋錯，不降級到老闆邏輯
      // 否則員工可能短暫看到未脫敏資料
      console.error('❌ 員工模式視圖拉取失敗，拒絕降級到老闆邏輯（安全策略）:', error);
      throw error;
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
  const touchedMarketIds = new Set<string>();
  for (const event of newEvents) {
    collectProjectionMarketId(touchedMarketIds, event);
  }

  // ✅ Hydrate markets from Cloud before replaying events.
  // Without this, handler replay fails if the market has never been written to local IndexedDB
  // (e.g., first login, cross-device, or cache reset).
  const { hydrated: hydratedMarketIds, missing: missingMarketIds } = await batchHydrateMarkets(touchedMarketIds, infoLevel);
  void hydratedMarketIds; // logged inside batchHydrateMarkets

  // ✅ 先批次檢查哪些事件已存在，避免重複日誌
  const existingIds = new Set<string>();
  const eventIds = newEvents.map(e => e.id);
  const existingEvents = await db.events.where('id').anyOf(eventIds).toArray();
  existingEvents.forEach(e => existingIds.add(e.id!));

  // 過濾出真正需要處理的新事件
  const eventsToProcess: any[] = [];
  let skippedByMissingMarket = 0;
  let semanticDuplicateCount = 0;
  for (const event of newEvents) {
    if (existingIds.has(event.id)) continue;

    if (await hasSemanticDuplicateDealClosedEvent(db, event)) {
      semanticDuplicateCount++;
      continue;
    }

    // Skip events whose market is missing from Cloud (deleted or unauthorized)
    const eventMarketId = event.market_id ?? event.payload?.market_id ?? event.payload?.marketId;
    if (eventMarketId && missingMarketIds.has(eventMarketId)) {
      skippedByMissingMarket++;
      console.warn(`[hydration] Skipping event ${event.type} (${event.id?.slice(0, 8)}) because market ${eventMarketId} not found in Cloud`);
      continue;
    }

    eventsToProcess.push(event);
  }

  if (skippedByMissingMarket > 0) {
    console.warn(`[hydration] Skipped ${skippedByMissingMarket} events because their market is missing from Cloud`);
  }
  
  if (eventsToProcess.length === 0) {
    console.log(`✅ ${total} 個事件已全部存在，無需下載`);
    if (semanticDuplicateCount > 0) {
      console.warn('[useSync] Skipped semantic duplicate deal_closed events', {
        semanticDuplicateCount,
      });
    }
    await reconcileSyncedProjectionMarkets(touchedMarketIds, 'owner-full');
    const validCreatedAt = newEvents
      .map(e => new Date(e.created_at).getTime())
      .filter(ts => Number.isFinite(ts));
    if (validCreatedAt.length > 0) {
      await updateLastSyncTimestamp(Math.max(...validCreatedAt));
    } else {
      console.warn('[useSync] pullAllEvents: no event has valid created_at, refusing to advance cursor');
    }
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
      const localEvent = createCanonicalSyncedEvent(event);

      // 直接插入事件（不通過 recordEvent，避免重複處理）
      await db.events.add(localEvent);

      // 本地也需要更新讀取模型（重放事件）
      const { eventHandlers } = await import('@/lib/db/events');
      const handler = eventHandlers[event.type as keyof typeof eventHandlers];
      
      if (handler) {
        // ✅ 修復：將 Supabase 的底線式 payload 轉換為駝峰式（用於本地事件處理器）
        const processedPayload = normalizeEventPayloadForLocal(localEvent.payload);
        
        await handler({
          id: localEvent.id,
          type: localEvent.type,
          payload: processedPayload,
          timestamp: localEvent.timestamp,
          actor_id: localEvent.actor_id,
          market_id: localEvent.market_id,
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
  await reconcileSyncedProjectionMarkets(touchedMarketIds, 'owner-full');

  if (eventsToProcess.length > 0) {
    const validCreatedAt = newEvents
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
  onProgress: (current: number, total: number, currentItem?: string, phase?: 'incremental') => void,
  infoLevel: InfoLevel
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
    
    const touchedMarketIds = new Set<string>();
    for (const event of eventsData || []) {
      collectProjectionMarketId(touchedMarketIds, event);
    }

    await syncMarketsToIndexedDB(marketsData || [], userId, infoLevel);
    await syncProductsToIndexedDB(productsData || [], userId, infoLevel);
    await syncEventsToIndexedDB(eventsData || [], infoLevel);
    await reconcileSyncedProjectionMarkets(touchedMarketIds, infoLevel < 3 ? 'staff-view' : 'owner-full');
    
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
    
    // ✅ 驗證數據隔離性
    // 注意：員工 session 的市集必然有 owner_id !== currentUserId（因為員工看的是 Owner 的市集），
    // 這是正確設計，不是污染。validateDataIsolation 在員工 session 容易誤報，
    // 因此員工 session 只記錄警告，不自動 reset。
    // Owner session 同樣只記錄不清理（避免誤刪 Owner 自己資料）。
    // 真正的用戶切換清理由 auth-context.tsx 觸發 resetAuthenticatedCache('role_switch') 負責。
    try {
      const { validateDataIsolation } = await import('@/lib/db/clear-user-data');
      const validation = await validateDataIsolation(userId);

      if (!validation.isValid) {
        // 員工 session 看到的市集 owner_id 必然 != 自己（員工看 Owner 的市集），
        // 這不是污染。只有 Owner session 時的 violations 才是值得關注的。
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
    throw error; // 拋出錯誤，讓調用者處理降級
  }
}

/**
 * 同步市集到 IndexedDB（保留權限）
 * ✅ 合併視圖數據和本地數據
 * ✅ 只同步當前用戶可訪問的市集
 */
async function syncMarketsToIndexedDB(
  markets: any[],
  currentUserId: string,
  infoLevel: InfoLevel
): Promise<void> {
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
  
  // ✅ 脫敏：在寫入 IndexedDB 前根據 infoLevel 移除敏感欄位
  // 老闆（infoLevel=3）不做任何脫敏；員工（infoLevel<3）統一 gate 處理
  for (const market of markets) {
    try {
      const existing = await db.markets.get(market.id);
      // ✅ 先 sanitize snake_case row，再交給 mapper
      const sanitizedRow = sanitizeWithLevel(market, 'market', infoLevel);
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
        // ✅ C3.4 修復：staff 視角下雲端 markets.total_* 也不可作為本地初始值
        // 理由同 batchHydrateMarkets（見 projection-reset.ts 檔頭說明）
        ...resetMarketProjectionFields(mappedMarket as Market),
      };

      // ✅ 合併寫入（mapper output 已被 sanitize，existing 保留本地未脫敏版本的部分欄位）
      await db.markets.put({ ...marketData, id: market.id } as Market);
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
async function syncProductsToIndexedDB(
  products: any[],
  currentUserId: string,
  infoLevel: InfoLevel
): Promise<void> {
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

  // ✅ 脫敏：根據 infoLevel 移除敏感欄位
  for (const product of products) {
    try {
      // ✅ 驗證：確保商品屬於當前用戶或當前用戶可訪問
      const isOwner = product.access_type === 'owner' && product.owner_id === currentUserId;
      const isStaff = product.access_type === 'staff' && product.relationship_owner_id;

      if (!isOwner && !isStaff) {
        console.warn(`⚠️ 跳過不屬於當前用戶的商品: ${product.name} (owner: ${product.owner_id?.substring(0, 8)})`);
        skippedCount++;
        continue;
      }

      // ✅ 一次脫敏：sanitize row 後交給 mapper
      const sanitizedRow = sanitizeWithLevel(product, 'product', infoLevel);
      const mappedProduct = productAccessRowToLocal(sanitizedRow as Record<string, unknown>);

      // 準備商品數據
      const productData = {
        ...mappedProduct,
        unlimitedStock: mappedProduct.unlimitedStock ?? false,
        isActive: mappedProduct.isActive ?? true,
        // ✅ C3.4 修復：雲端 products.total_sold 是 handler 已累加過的 projection，
        // 不可作為本地 IndexedDB 的初始值。
        // 注意：product.stock **不**重設（雲端 stock 是絕對剩餘量，是 truth source），
        // stock 雙重扣減問題列為 P4 候選。
        totalSold: 0,
      };

      // ✅ 寫入（mapper output 已被 sanitize，Dexie put 完全替換）
      await db.products.put({ ...productData, id: product.id } as Product);
      
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
 * 同步事件到 IndexedDB（統一管道）
 * ✅ 重放事件以更新讀取模型
 * ✅ 根據 infoLevel 執行脫敏（老闆=3 無脫敏，員工=0-2 漸進脫敏）
 * ✅ handler replay 後清理衍生敏感 projection（員工模式）
 */

/** 會寫出敏感衍生資料的事件類型 */
const PROJECTION_EVENT_TYPES = new Set(['deal_closed', 'deal_deleted']);

/**
 * 清理 event handler replay 後寫入的敏感衍生資料。
 * 根據 infoLevel 移除 markets 和 dailyStats 中的敏感欄位。
 *
 * @param event - 已完成 replay 的事件
 * @param infoLevel - 角色資訊揭露層級
 */
async function sanitizeStaffProjectionsAfterReplay(
  event: { type: string; market_id?: string; payload?: any },
  infoLevel: InfoLevel
): Promise<void> {
  if (infoLevel === 3) return; // 老闆不需脫敏
  if (!PROJECTION_EVENT_TYPES.has(event.type)) return;

  const marketId = getEventMarketId(event);
  if (!marketId) return;

  const marketGate = createPermissionGate({ infoLevel, entity: 'market' });
  const statsGate = createPermissionGate({ infoLevel, entity: 'stats' });

  const existingMarket = await db.markets.get(marketId);
  if (existingMarket) {
    const sanitized = marketGate.sanitizeMarketProjection(existingMarket as unknown as Record<string, unknown>);
    await db.markets.put({ ...sanitized, id: marketId } as Market);
  }

  const dailyStats = await db.dailyStats.where('marketId').equals(marketId).toArray();
  for (const stat of dailyStats) {
    if (stat.id === undefined) continue;
    const sanitized = statsGate.sanitizeDailyStatsProjection(stat as unknown as Record<string, unknown>);
    await db.dailyStats.put({ ...sanitized, id: stat.id } as DailyStats);
  }
}

async function syncEventsToIndexedDB(events: any[], infoLevel: InfoLevel): Promise<void> {
  // ✅ 脫敏：根據 infoLevel 過濾事件
  const sanitizedEvents = sanitizeEventsWithLevel(events, infoLevel);

  console.log(`📝 同步 ${sanitizedEvents.length} 個事件到 IndexedDB...`);
  
  let processedCount = 0;
  let skippedCount = 0;
  
  for (const event of sanitizedEvents) {
    try {
      // 檢查是否已存在
      const existing = await db.events.get(event.id);
      
      if (existing) {
        // Fix C2.13A Symptom B: If the incoming tombstone event carries eventId but the
        // locally-stored version is missing it (stale local write from a partial schema),
        // augment the local record so that tombstone key matching via getTombstoneTargetEventId
        // works correctly. Re-run the handler after the update so dailyStats reflects the
        // deletion.
        if (
          (event.type === 'deal_deleted' || event.type === 'interaction_deleted') &&
          event.payload?.eventId &&
          !existing.payload?.eventId
        ) {
          const updated = {
            ...existing,
            payload: { ...existing.payload, eventId: event.payload.eventId },
          };
          await db.events.put(updated);
          
          const { eventHandlers } = await import('@/lib/db/events');
          const handler = eventHandlers[event.type as keyof typeof eventHandlers];
          if (handler) {
            const processedPayload = normalizeEventPayloadForLocal(updated.payload);
            await handler({
              id: updated.id,
              type: updated.type,
              payload: processedPayload,
              timestamp: updated.timestamp,
              actor_id: updated.actor_id,
              market_id: updated.market_id,
            } as Event, db);
            await sanitizeStaffProjectionsAfterReplay(updated, infoLevel);
          }
          processedCount++;
        } else {
          skippedCount++;
        }
        continue;
      }

      if (await hasSemanticDuplicateDealClosedEvent(db, event)) {
        skippedCount++;
        console.warn('[useSync] Skipping semantic duplicate deal_closed event during staff sync', {
          eventId: event.id,
          marketId: getEventMarketId(event),
        });
        continue;
      }

      const localEvent = createCanonicalSyncedEvent(event);

      // ✅ 員工模式：檢查事件是否在本地可訪問範圍內
      if (infoLevel < 3) {
        const preflight = await preflightStaffEventImport(localEvent, {
          hasMarket: async (marketId) => Boolean(await db.markets.get(marketId)),
          hasProduct: async (productId) => Boolean(await db.products.get(productId)),
        });

        if (!preflight.shouldImport) {
          skippedCount++;
          console.warn('[useSync] Skipping event outside local scoped dataset', {
            eventId: event.id,
            eventType: event.type,
            reason: preflight.reason,
            referenceId: preflight.referenceId,
          });
          continue;
        }
      }

      await db.events.add(localEvent);

      const { eventHandlers } = await import('@/lib/db/events');
      const handler = eventHandlers[event.type as keyof typeof eventHandlers];

      if (handler) {
        const processedPayload = normalizeEventPayloadForLocal(localEvent.payload);
        await handler({
          id: localEvent.id,
          type: localEvent.type,
          payload: processedPayload,
          timestamp: localEvent.timestamp,
          actor_id: localEvent.actor_id,
          market_id: localEvent.market_id,
        } as Event, db);

        await sanitizeStaffProjectionsAfterReplay(localEvent, infoLevel);
      }

      processedCount++;
    } catch (error: any) {
      if (error.name === 'ConstraintError') {
        skippedCount++;
        continue;
      }
      console.error(`❌ 同步事件失敗: ${event.type} (${event.id?.substring(0, 8)}...)`, error);
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
 * 脫敏衝突解決路徑上的寫入 payload。
 *
 * 衝突解決的三條路徑（'remote'、'merge'、'local'）都會用雲端資料觸及本地，
 * 其中 'remote' 和 'merge' 必須在寫入前依 infoLevel 移除敏感欄位。
 *
 * 設計成純函數（無 Dexie/Supabase 副作用）方便測試：
 * - 老闆（Level 3）→ 原樣返回
 * - 員工（Level 0-2）→ 移除對應等級的敏感欄位
 *
 * @param tableName - 'markets' | 'products'
 * @param data - 經 mapper 轉成 camelCase 的物件
 * @param infoLevel - 角色資訊揭露層級
 */
function sanitizeWritePayload(
  tableName: 'markets' | 'products',
  data: Market | Product,
  infoLevel: InfoLevel
): Record<string, unknown> {
  if (infoLevel >= 3) return data as unknown as Record<string, unknown>;
  if (tableName === 'markets') {
    return createPermissionGate({ infoLevel, entity: 'market' })
      .sanitizeMarketProjection(data as unknown as Record<string, unknown>);
  }
  return sanitizeWithLevel(
    data as unknown as Record<string, unknown>,
    'product',
    infoLevel
  );
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
 * 員工視角下，`normalizedRemote` 會先過 PermissionGate 脫敏再參與 Math.max，
 * 避免「員工不該看到的 totalRevenue」污染合併結果的基準值。
 *
 * @param localData - 本地數據（呼叫方需保證已是員工視角的脫敏版本）
 * @param remoteData - 雲端原始資料（snake_case）
 * @param infoLevel - 角色資訊揭露層級（3=老闆, 0-2=員工）
 */
async function mergeMarketData(
  localData: any,
  remoteData: any,
  infoLevel: InfoLevel = 3
): Promise<any> {
  console.log(`🔀 合併市集數據: ${localData.id?.substring(0, 8)}...`);
  const sanitizedRemote = sanitizeWritePayload(
    'markets',
    marketRowToLocal(remoteData as Record<string, unknown>),
    infoLevel
  );
  // 合併結果已是脫敏版本（員工視角），不需再過一次 gate
  return {
    ...sanitizedRemote, // 基礎數據使用雲端（脫敏後）

    // 統計欄位使用較大值（避免數據丟失）
    totalRevenue: Math.max(
      Number(localData.totalRevenue) || 0,
      Number(sanitizedRemote.totalRevenue) || 0
    ),
    totalProfit: Math.max(
      Number(localData.totalProfit) || 0,
      Number(sanitizedRemote.totalProfit) || 0
    ),
    totalDeals: Math.max(
      Number(localData.totalDeals) || 0,
      Number(sanitizedRemote.totalDeals) || 0
    ),
    totalInteractions: Math.max(
      Number(localData.totalInteractions) || 0,
      Number(sanitizedRemote.totalInteractions) || 0
    ),

    // 時間戳使用較新的
    updatedAt: Math.max(
      Number(localData.updatedAt) || 0,
      Number(sanitizedRemote.updatedAt) || 0
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
  remoteData: any,
  infoLevel: InfoLevel = 3
): Promise<any> {
  console.log(`🔀 合併商品數據: ${localData.id?.substring(0, 8)}...`);
  const sanitizedRemote = sanitizeWritePayload(
    'products',
    productRowToLocal(remoteData as Record<string, unknown>),
    infoLevel
  );

  // 對於商品，庫存使用較小值（保守策略，避免超賣）
  // 銷售統計使用較大值（避免數據丟失）
  //
  // 員工視角下 stock 是敏感欄位，脫敏後為 undefined；
  // 若用 Math.min 合併會把 undefined 算成 0，破壞脫敏語意。
  // 改用「保留脫敏後的雲端值」，對應的本地殘留值則被忽略。
  return {
    ...sanitizedRemote, // 基礎數據使用雲端（脫敏後）

    // 庫存使用較小值（保守策略）—— 僅老闆視角
    ...(infoLevel >= 3
      ? {
          stock: Math.min(
            Number(localData.stock) || 0,
            Number(sanitizedRemote.stock) || 0
          ),
        }
      : { stock: sanitizedRemote.stock }),

    // 銷售統計使用較大值
    totalSold: Math.max(
      Number(localData.totalSold) || 0,
      Number(sanitizedRemote.totalSold) || 0
    ),

    // 時間戳使用較新的
    updatedAt: Math.max(
      Number(localData.updatedAt) || 0,
      Number(sanitizedRemote.updatedAt) || 0
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
 * 員工視角下，'remote' 和 'merge' 策略的寫入 payload 會在寫入前過
 * PermissionGate 脫敏，確保 IndexedDB 不會殘留員工不該看到的
 * totalRevenue / totalCost / profitMargin 等敏感欄位。
 *
 * @param tableName - 表名
 * @param localData - 本地數據
 * @param remoteData - 雲端數據
 * @param infoLevel - 角色資訊揭露層級（3=老闆, 0-2=員工；預設 3 向後相容）
 * @returns 是否發生衝突並已解決
 */
export async function detectAndResolveConflict(
  tableName: 'markets' | 'products',
  localData: any,
  remoteData: any,
  infoLevel: InfoLevel = 3
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

      case 'remote': {
        // 使用雲端數據（脫敏後）更新本地
        const remote = sanitizeWritePayload(
          tableName,
          tableName === 'markets'
            ? marketRowToLocal(remoteData as Record<string, unknown>)
            : productRowToLocal(remoteData as Record<string, unknown>),
          infoLevel
        );
        if (tableName === 'markets') {
          await db.markets.update(localData.id, remote as unknown as Partial<Market>);
        } else {
          await db.products.update(localData.id, remote as unknown as Partial<Product>);
        }
        return true;
      }

      case 'merge': {
        // 合併數據（merge 函數內部已用 infoLevel 脫敏雲端基準值）
        let mergedData: any;

        if (tableName === 'markets') {
          mergedData = await mergeMarketData(localData, remoteData, infoLevel);
          await db.markets.update(localData.id, mergedData as unknown as Partial<Market>);
        } else {
          mergedData = await mergeProductData(localData, remoteData, infoLevel);
          await db.products.update(localData.id, mergedData as unknown as Partial<Product>);
        }

        console.log(`✅ 衝突已合併: ${tableName} (${localData.id?.substring(0, 8)}...)`);
        return true;
      }

      default:
        return false;
    }
  } catch (error) {
    console.error(`❌ 衝突解決失敗: ${tableName} (${localData.id})`, error);
    return false;
  }
}
