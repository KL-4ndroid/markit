/**
 * Sync Context - 全局同步狀態管理
 * 
 * 提供全局的同步狀態，避免多個 useSync 實例導致狀態不同步
 * ✅ 增強：支援資料脫敏，員工無法同步敏感資料
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSync, SyncStatus } from '@/hooks/useSync';
import { useAuth } from '@/lib/supabase/auth-context';
import { useUserRole } from '@/hooks/useUserRole';
import { resolveInfoLevel } from '@/lib/data-sanitization';

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
  const { userRole, isLoading: isRoleLoading } = useUserRole();

  // ✅ 解析角色資訊揭露層級（3=老闆，0-2=員工）
  const infoLevel = resolveInfoLevel(userRole);

  // ✅ 只創建一個 useSync 實例，傳入 infoLevel
  const syncState = useSync({
    enabled: !!user && isConfigured && !isRoleLoading,
    roleInfoLevel: infoLevel,
  });

  // ✅ 標記資料是否已脫敏（infoLevel < 3 表示員工）
  const isDataSanitized = infoLevel < 3;

  // ✅ 在 Context 中提供脫敏狀態
  const contextValue = {
    ...syncState,
    isDataSanitized,
    infoLevel,
  };

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
