'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SyncStatus } from '@/hooks/useSync';
import { useSyncContext } from '@/lib/sync-context';
import { getSyncPresentation } from '@/lib/sync/sync-presentation';
import { useAuth } from '@/lib/supabase/auth-context';
import { RecordSyncStatus } from './RecordSyncStatus';

interface SyncStatusIndicatorProps {
  tone?: 'inverse' | 'default';
}

export function SyncStatusIndicator({ tone = 'inverse' }: SyncStatusIndicatorProps) {
  const { user, isConfigured } = useAuth();
  const { status, lastSyncAt, pendingCount, error, sync, isOnline } = useSyncContext();
  const [isClickLocked, setIsClickLocked] = useState(false);
  const clickLockedRef = useRef(false);
  const isSyncing = status === SyncStatus.SYNCING;
  const state = { status, lastSyncAt, pendingCount, error, isOnline };

  useEffect(() => {
    if (isSyncing || !isClickLocked) return;
    const timeout = setTimeout(() => {
      clickLockedRef.current = false;
      setIsClickLocked(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [isClickLocked, isSyncing]);

  if (!isConfigured || !user) return null;

  const handleSync = () => {
    if (isSyncing || clickLockedRef.current || !getSyncPresentation(state).canSync) return;
    clickLockedRef.current = true;
    setIsClickLocked(true);
    sync();
    toast.info('已要求檢查紀錄同步狀態', { duration: 1800, id: 'sync-manual' });
  };

  return <RecordSyncStatus {...state} tone={tone} requestLocked={isClickLocked} onSync={handleSync} />;
}
