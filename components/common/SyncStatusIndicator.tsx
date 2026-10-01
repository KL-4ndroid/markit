'use client';

import { HardDrive, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SyncStatus } from '@/hooks/useSync';
import { useSyncContext } from '@/lib/sync-context';
import { getSyncPresentation } from '@/lib/sync/sync-presentation';
import { useAuth } from '@/lib/supabase/auth-context';

interface SyncStatusIndicatorProps {
  tone?: 'inverse' | 'default';
}

export function SyncStatusIndicator({ tone = 'inverse' }: SyncStatusIndicatorProps) {
  const { user, isConfigured } = useAuth();
  const { status, lastSyncAt, pendingCount, error, sync, isOnline } = useSyncContext();
  const [isClickLocked, setIsClickLocked] = useState(false);
  const unlockTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const hasShownOfflineToastRef = useRef(false);

  const isSyncing = status === SyncStatus.SYNCING;
  const hasError = status === SyncStatus.ERROR;
  const presentation = getSyncPresentation({
    status,
    lastSyncAt,
    pendingCount,
    error,
    isOnline,
  });

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

  const indicatorClass = presentation.kind === 'offline' || presentation.kind === 'waiting'
    ? 'bg-secondary'
    : presentation.kind === 'error'
      ? 'bg-danger'
      : presentation.kind === 'pending'
        ? 'bg-atelier-clay'
        : 'bg-status-good-text';
  const buttonClasses = tone === 'inverse'
    ? 'hover:bg-white/15 focus-visible:ring-white/60'
    : 'border border-atelier-line bg-atelier-paper hover:bg-atelier-canvas focus-visible:ring-primary/30';
  const spinnerClasses = tone === 'inverse' ? 'text-white' : 'text-primary';

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
      aria-label={presentation.accessibleLabel}
      title={presentation.accessibleLabel}
      className={`relative inline-flex h-11 w-11 items-center justify-center rounded-control transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:cursor-wait disabled:opacity-75 ${buttonClasses}`}
    >
      {isSyncing ? (
        <RefreshCw className={`h-4 w-4 animate-spin ${spinnerClasses}`} aria-hidden="true" />
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
