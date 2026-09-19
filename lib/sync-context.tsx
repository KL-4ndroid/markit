/**
 * Sync Context - 全局同步狀態管理
 * 
 * 提供全局的同步狀態，避免多個 useSync 實例導致狀態不同步
 * ✅ 增強：支援資料脫敏，員工無法同步敏感資料
 */

'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useSync, SyncStatus } from '@/hooks/useSync';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRoleContext } from '@/lib/role-context';

interface SyncContextType {
  status: SyncStatus;
  lastSyncAt: number | null;
  pendingCount: number;
  error: string | null;
  uploadProgress?: { current: number; total: number; currentItem?: string };
  downloadProgress?: { current: number; total: number; currentItem?: string; phase?: 'snapshot' | 'incremental' };
  sync: () => void;
  isOnline: boolean;
  isDataSanitized: boolean;
  infoLevel: number;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  const { roleRefreshState } = useRoleContext();

  // ✅ C2.28：fail-closed infoLevel
  // - 角色載入中 → 0（最嚴格，不可寫入敏感欄位）
  // - 角色查詢錯誤 → 0
  // - 角色未確認 → 0
  // - 已確認 owner → 3
  // - 已確認 staff → permissions.infoLevel ?? 2
  const safeInfoLevel = roleRefreshState.syncInfoLevel;
  const isSyncRoleReady = roleRefreshState.stage === 'ready';
  // 保留舊變數以維持向後相容
  const infoLevel = safeInfoLevel;

  // ✅ 只創建一個 useSync 實例，傳入 infoLevel
  // isRoleLoading 期間 useSync 仍 disabled（由 enabled 控制）
  const syncState = useSync({
    enabled: !!user && isConfigured && isSyncRoleReady,
    roleInfoLevel: safeInfoLevel,
  });

  // ✅ C2.28：isDataSanitized 跟著 safeInfoLevel 走
  // - loading / error → safeInfoLevel=0 → isDataSanitized=true
  // - owner → safeInfoLevel=3 → isDataSanitized=false
  const isDataSanitized = safeInfoLevel < 3;

  // ✅ 在 Context 中提供脫敏狀態
  const contextValue = useMemo<SyncContextType>(() => ({
    ...syncState,
    isDataSanitized,
    infoLevel,
  }), [infoLevel, isDataSanitized, syncState]);

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within SyncProvider');
  }
  return context;
}
