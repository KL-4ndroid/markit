/**
 * Sync Context - 全局同步狀態管理
 * 
 * 提供全局的同步狀態，避免多個 useSync 實例導致狀態不同步
 */

'use client';

import { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useSync, SyncStatus } from '@/hooks/useSync';
import { useAuth } from '@/lib/supabase/auth-context';

interface SyncContextType {
  status: SyncStatus;
  lastSyncAt: number | null;
  pendingCount: number;
  error: string | null;
  uploadProgress?: { current: number; total: number; currentItem?: string };
  downloadProgress?: { current: number; total: number; currentItem?: string; phase?: 'snapshot' | 'incremental' };
  sync: () => void;
  isOnline: boolean;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, isConfigured } = useAuth();
  
  // ✅ 只創建一個 useSync 實例
  const syncState = useSync({
    enabled: !!user && isConfigured,
  });

  return (
    <SyncContext.Provider value={syncState}>
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
