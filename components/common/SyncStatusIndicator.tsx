'use client';

import { HardDrive, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SyncStatus } from '@/hooks/useSync';
import { useSyncContext } from '@/lib/sync-context';
import { useAuth } from '@/lib/supabase/auth-context';

export function SyncStatusIndicator() {
  const { user, isConfigured } = useAuth();
  const { status, pendingCount, error, sync, isOnline } = useSyncContext();
  const [isClickLocked, setIsClickLocked] = useState(false);
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const hasShownOfflineToastRef = useRef(false);

  const isSyncing = status === SyncStatus.SYNCING;
  const isOffline = status === SyncStatus.OFFLINE || !isOnline;
  const hasError = status === SyncStatus.ERROR;

  useEffect(() => {
    if (isSyncing || !isClickLocked) return;
    unlockTimeoutRef.current = setTimeout(() => setIsClickLocked(false), 300);
    return () => {
      if (unlockTimeoutRef.current) clearTimeout(unlockTimeoutRef.current);
    };
  }, [isClickLocked, isSyncing]);

  useEffect(() => {
    if (hasError && pendingCount > 0 && !hasShownOfflineToastRef.current) {
      toast.info('資料已先保存在這台裝置', {
        description: '恢復連線後會再次同步',
        icon: <HardDrive className="h-4 w-4 text-muted-foreground" aria-hidden="true" />,
        duration: 3000,
        id: 'sync-offline',
      });
      hasShownOfflineToastRef.current = true;
    }

    if (status === SyncStatus.SUCCESS) {
      hasShownOfflineToastRef.current = false;
    }
  }, [hasError, pendingCount, status]);

  if (!isConfigured || !user) return null;

  const statusLabel = isSyncing
    ? `同步中，${pendingCount} 筆待處理`
    : isOffline
      ? `離線，${pendingCount} 筆資料保存在本機`
      : hasError
        ? `同步失敗${error ? `：${error}` : ''}`
        : pendingCount > 0
          ? `${pendingCount} 筆待同步，點擊重試`
          : '資料已同步，點擊檢查更新';

  const indicatorClass = isOffline
    ? 'bg-secondary'
    : hasError
      ? 'bg-danger'
      : 'bg-status-good-text';

  const handleSync = () => {
    if (isSyncing || isClickLocked) return;
    setIsClickLocked(true);
    sync();
    toast.info('正在檢查資料更新', {
      icon: <RefreshCw className="h-4 w-4 text-muted-foreground" aria-hidden="true" />,
      duration: 1800,
      id: 'sync-manual',
    });
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={isSyncing || isClickLocked}
      aria-label={statusLabel}
      title={statusLabel}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-control transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-wait disabled:opacity-75"
    >
      {isSyncing ? (
        <RefreshCw className="h-4 w-4 animate-spin text-white" aria-hidden="true" />
      ) : (
        <span className={`h-3 w-3 rounded-full ${indicatorClass}`} aria-hidden="true" />
      )}
      {pendingCount > 0 && !isSyncing && (
        <span className="absolute right-1 top-1 min-w-4 rounded-full bg-primary px-1 text-[9px] font-medium leading-4 text-white">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      )}
    </button>
  );
}
