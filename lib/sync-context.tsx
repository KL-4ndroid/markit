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

interface SyncContextType {
  status: SyncStatus;
  lastSyncAt: number | null;
  pendingCount: number;
  error: string | null;
  uploadProgress?: { current: number; total: number; currentItem?: string };
  downloadProgress?: { current: number; total: number; currentItem?: string; phase?: 'snapshot' | 'incremental' };
  sync: () => void;
  isOnline: boolean;
  isDataSanitized: boolean; // ✅ 新增：標記資料是否已脫敏
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  const { userRole } = useUserRole();
  
  // ✅ 只創建一個 useSync 實例
  const syncState = useSync({
    enabled: !!user && isConfigured,
  });

  // ✅ 標記資料是否已脫敏（員工身分時為 true）
  const isDataSanitized = userRole.isStaff;

  // ✅ 在 Context 中提供脫敏狀態
  const contextValue = {
    ...syncState,
    isDataSanitized,
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
