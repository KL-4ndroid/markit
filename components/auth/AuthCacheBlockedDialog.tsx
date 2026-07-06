'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { AlertTriangle, LogIn, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/supabase/auth-context';
import {
  AUTH_CACHE_BLOCKED_EVENT,
  type AuthCacheBlockedEventDetail,
} from '@/lib/auth/auth-cache-blocked-events';

function getTitle(action: AuthCacheBlockedEventDetail['action']): string {
  if (action === 'staff_status_reset') return 'Local changes need attention';
  if (action === 'identity_switch') return 'Account switch paused';
  return 'Sign-out paused';
}

export function AuthCacheBlockedDialog() {
  const { signOut } = useAuth();
  const [detail, setDetail] = useState<AuthCacheBlockedEventDetail | null>(null);
  const [isDiscarding, setIsDiscarding] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<AuthCacheBlockedEventDetail>;
      setDetail(customEvent.detail);
    };

    window.addEventListener(AUTH_CACHE_BLOCKED_EVENT, handler);
    return () => window.removeEventListener(AUTH_CACHE_BLOCKED_EVENT, handler);
  }, []);

  const handleLogin = () => {
    window.dispatchEvent(new CustomEvent('auth:open-login', { detail: { mode: 'login' } }));
  };

  const handleDiscard = async () => {
    setIsDiscarding(true);
    try {
      await signOut({ forceDiscardLocalChanges: true });
      setDetail(null);
      toast.success('Local changes discarded');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to discard local changes');
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <Dialog open={!!detail} onClose={() => {}} className="relative z-[70]">
      <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-soft-pink">
              <AlertTriangle className="h-6 w-6 text-danger" />
            </div>
          </div>

          <DialogTitle className="text-center text-lg font-semibold text-foreground">
            {detail ? getTitle(detail.action) : 'Local changes need attention'}
          </DialogTitle>

          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>{detail?.message}</p>
            <div className="rounded-xl bg-background p-3 text-foreground">
              <p>{detail?.pendingEventCount ?? 0} unsynced local event(s)</p>
              <p>{detail?.unfinishedSyncQueueCount ?? 0} unfinished sync queue item(s)</p>
              <p>{detail?.pendingSalesPhotoEvidenceCreationCount ?? 0} pending sales photo evidence item(s)</p>
              <p>{detail?.pendingSalesPhotoEvidencePayloadCount ?? 0} pending local photo payload(s)</p>
            </div>
            <p>
              Sign in with the original account to let the app sync these changes, or discard them only if you are sure they should not be kept.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={handleLogin}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/85"
            >
              <LogIn className="h-4 w-4" />
              Sign in to sync
            </button>

            <button
              type="button"
              onClick={handleDiscard}
              disabled={isDiscarding}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/25 px-4 py-3 text-sm font-medium text-danger transition-colors hover:bg-soft-pink disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {isDiscarding ? 'Discarding...' : 'Discard local changes'}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
