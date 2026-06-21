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
import { handlePermissionSyncError } from '@/lib/sync/sync-error-policy';
import { pushEvents } from '@/lib/sync/sync-push-service';
import {
  acquireSyncLock,
  getActiveSyncIdentity,
  getGlobalSyncState,
  hasExecutedInitialSyncFlag,
  hasSetupSyncIntervals,
  markInitialSyncExecuted,
  markSyncIntervalsSetup,
  releaseSyncLock,
  resetSyncRuntimeState,
  setActiveSyncIdentity,
  subscribeGlobalSyncState,
  SyncStatus,
  type SyncState,
  updateGlobalState,
} from '@/lib/sync/sync-runtime-state';
export { getLocalPendingCount, getCloudEventCount } from '@/lib/sync/sync-count-service';
export { detectAndResolveConflict } from '@/lib/sync/sync-conflict-resolution-service';
export { resetInitialSyncFlag, SyncStatus } from '@/lib/sync/sync-runtime-state';
import {
  getSyncPauseUntil,
} from '@/lib/sync/sync-permission-pause-service';
import type { InfoLevel } from '@/lib/data-sanitization';

interface UseSyncOptions {
  enabled?: boolean;       // 是否啟用同步
  interval?: number;       // 同步間隔（毫秒）
  throttle?: number;       // 節流延遲（毫秒）
  roleInfoLevel?: InfoLevel;  // 角色資訊揭露層級（3=老闆, 0-2=員工）
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
  const [state, setState] = useState<SyncState>(getGlobalSyncState());

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
    
    return subscribeGlobalSyncState(listener);
  }, []);

  useEffect(() => {
    if (getActiveSyncIdentity() === syncIdentity) {
      return;
    }

    setActiveSyncIdentity(syncIdentity);
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
    if (!acquireSyncLock()) {
      console.log('⏸️ 同步已在進行中，跳過此次請求');
      return;
    }

    // 檢查網路狀態
    if (!navigator.onLine) {
      releaseSyncLock();
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
        await handlePermissionSyncError(error, user.id, () => {
          updateGlobalState(prev => ({
            ...prev,
            status: SyncStatus.ERROR,
            error: '同步因權限錯誤暫停，稍後會自動重試',
            uploadProgress: undefined,
            downloadProgress: undefined,
          }));
        });
        return;
      }

      updateGlobalState(prev => ({
        ...prev,
        status: SyncStatus.ERROR,
        error: error.message || '同步失敗',
      }));
    } finally {
      // ✅ 釋放全局同步鎖
      releaseSyncLock();
      isSyncingRef.current = false;
    }
  }, [enabled, isConfigured, user, effectiveInfoLevel]);

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
    if (hasSetupSyncIntervals()) {
      return;
    }

    markSyncIntervalsSetup();

    // ✅ 初始同步（只執行一次）
    if (!hasExecutedInitialSyncFlag()) {
      markInitialSyncExecuted();
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

// ==================== 員工模式：視圖拉取函數 ====================
