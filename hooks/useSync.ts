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
import { db } from '@/lib/db';
import { pullOwnerEvents } from '@/lib/sync/owner-pull-service';
import { pullEventsFromViews } from '@/lib/sync/staff-pull-service';
import { pushEvents } from '@/lib/sync/sync-push-service';
export { getLocalPendingCount, getCloudEventCount } from '@/lib/sync/sync-count-service';
export { detectAndResolveConflict } from '@/lib/sync/sync-conflict-resolution-service';
import {
  clearSyncPause,
  getSyncPauseUntil,
  pauseSyncTemporarily,
  recordSyncPermissionError,
} from '@/lib/sync/sync-permission-pause-service';
import type { InfoLevel } from '@/lib/data-sanitization';

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
  await pullOwnerEvents(userId, onProgress, infoLevel);
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
