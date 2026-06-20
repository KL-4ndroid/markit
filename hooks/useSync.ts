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
import { hasSemanticDuplicateDealClosedEvent } from '@/lib/sync/semantic-event-dedupe';
import { preflightStaffEventImport } from '@/lib/sync/staff-event-preflight';
import { sanitizeStaffProjectionsAfterReplay } from '@/lib/sync/staff-projection-sanitizer';
import { pushEvents } from '@/lib/sync/sync-push-service';
import { getOwnerAccessibleMarketIds } from '@/lib/sync/owner-market-access-service';
import { batchHydrateMarkets } from '@/lib/sync/owner-market-hydration-service';
import { collectProjectionMarketId } from '@/lib/sync/projection-reconciliation';
import { reconcileSyncedProjectionMarkets } from '@/lib/sync/sync-projection-reconciliation-runner';
import { getEventMarketId } from '@/lib/events/event-read-model';
import { resetMarketProjectionFields, resetProductProjectionFields } from '@/lib/sync/projection-reset';
import { getLastSyncTimestamp, updateLastSyncTimestamp } from '@/lib/sync/sync-cursor-service';
import { createCanonicalSyncedEvent } from '@/lib/sync/synced-event-factory';
export { getLocalPendingCount, getCloudEventCount } from '@/lib/sync/sync-count-service';
export { detectAndResolveConflict } from '@/lib/sync/sync-conflict-resolution-service';
import {
  clearSyncPause,
  getSyncPauseUntil,
  pauseSyncTemporarily,
  recordSyncPermissionError,
} from '@/lib/sync/sync-permission-pause-service';
import {
  marketAccessRowToLocal,
  normalizeEventPayloadForLocal,
  productAccessRowToLocal,
} from '@/lib/data-mappers';
import {
  sanitizeWithLevel,
  sanitizeArrayWithLevel,
  sanitizeEventsWithLevel,
  type InfoLevel,
} from '@/lib/data-sanitization';
import type { Market, Product } from '@/types/db';
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
  clearSyncPause();
  // ✅ 重置全局狀態
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
 * Pull cloud events, routing staff sessions through authorized views.
 */
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
 * 處理同步權限錯誤（403 Forbidden）
 * 保留本地資料，暫停同步一段時間，避免把暫時性 RLS/網路狀態誤判成永久失權。
 */
async function handlePermissionSyncError(error: any, userId: string): Promise<void> {
  const pauseUntil = pauseSyncTemporarily();
  recordSyncPermissionError(error, userId, pauseUntil);

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
