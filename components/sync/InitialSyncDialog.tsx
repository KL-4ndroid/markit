'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { SyncStatus } from '@/hooks/useSync';
import { useSyncContext } from '@/lib/sync-context';
import { useRoleContext } from '@/lib/role-context';
import { resolveRoleMode } from '@/lib/auth/role-mode';
import { type CoordinatedOverlayProps } from '@/components/global-overlays/overlay-types';
import { getSessionStatePort } from '@/lib/platform/session-state-capability';
import { getInitialSyncPresentation } from '@/lib/sync/initial-sync-presentation';
import { AppDialog } from '@/components/ui/AppDialog';
import { InitialSyncContent } from './InitialSyncContent';

const INITIAL_SYNC_KEY = 'hasCompletedInitialSync';
function getHasCompletedInitialSync(key: string): boolean {
  return getSessionStatePort().read(key) === 'true';
}
function setHasCompletedInitialSync(key: string, value: boolean): void {
  getSessionStatePort().write(key, value.toString());
}

export function InitialSyncDialog({ isSuppressed = false, onVisibilityChange }: CoordinatedOverlayProps) {
  const { user, isConfigured } = useAuth();
  const { userRole, roleRefreshState } = useRoleContext();
  const { status, downloadProgress, uploadProgress, pendingCount, isOnline, error, sync } = useSyncContext();
  const isRoleReady = roleRefreshState.stage === 'ready';
  const roleMode = resolveRoleMode(userRole);
  const initialSyncKey = user ? `${INITIAL_SYNC_KEY}:${user.id}:${roleMode}` : INITIAL_SYNC_KEY;
  const shouldOpenInitially = Boolean(user && isConfigured && isRoleReady && !getHasCompletedInitialSync(initialSyncKey));
  const [isOpen, setIsOpen] = useState(shouldOpenInitially);
  const hasSeenSuccessRef = useRef(false);
  const [isTakingLonger, setIsTakingLonger] = useState(false);

  useEffect(() => { onVisibilityChange?.(isOpen); }, [isOpen, onVisibilityChange]);
  useEffect(() => () => onVisibilityChange?.(false), [onVisibilityChange]);

  useEffect(() => {
    if (!user || !isConfigured || !isRoleReady) {
      setIsOpen(false);
      hasSeenSuccessRef.current = false;
      return;
    }
    const completed = getHasCompletedInitialSync(initialSyncKey);
    hasSeenSuccessRef.current = false;
    if (!completed) setIsOpen(true);
  }, [user, isConfigured, isRoleReady, initialSyncKey]);

  useEffect(() => {
    if (status === SyncStatus.SUCCESS && pendingCount === 0 && isOnline && isOpen && !hasSeenSuccessRef.current) {
      const timeoutId = setTimeout(() => {
        hasSeenSuccessRef.current = true;
        setIsOpen(false);
        setHasCompletedInitialSync(initialSyncKey, true);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [status, pendingCount, isOnline, isOpen, initialSyncKey]);

  useEffect(() => {
    // A slow/failed/offline attempt must never be marked as completed.
    if ((status === SyncStatus.SYNCING || status === SyncStatus.IDLE) && isOpen && !hasSeenSuccessRef.current) {
      setIsTakingLonger(false);
      const timeoutId = setTimeout(() => setIsTakingLonger(true), 30000);
      return () => clearTimeout(timeoutId);
    }
  }, [status, isOpen, initialSyncKey]);

  const input = { status, pendingCount, isOnline, isTakingLonger, downloadProgress, uploadProgress };
  const view = getInitialSyncPresentation(input);
  return <AppDialog open={isOpen && !isSuppressed} onClose={() => {}} title={view.title} dismissible={false}
    footer={view.canContinue ? <>
      <button type="button" onClick={() => setIsOpen(false)} className="min-h-11 rounded-control border border-primary/20 px-4 text-sm text-foreground">先查看本機資料</button>
      {!view.syncing && <button type="button" disabled={!view.canRetry} onClick={() => { hasSeenSuccessRef.current = false; sync(); }}
        className="min-h-11 rounded-control bg-primary px-4 text-sm text-white disabled:opacity-50">{!isOnline ? '連線後再載入' : '重新載入'}</button>}
    </> : undefined}>
    <InitialSyncContent input={input} error={error} />
  </AppDialog>;
}
