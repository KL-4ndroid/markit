import { AuthenticatedCacheResetBlockedError } from '@/lib/supabase/auth-context';

export function isSignOutBlockedByLocalChanges(error: unknown): error is AuthenticatedCacheResetBlockedError {
  return error instanceof AuthenticatedCacheResetBlockedError;
}

export function confirmDiscardLocalChangesForSignOut(error: unknown): boolean {
  if (!isSignOutBlockedByLocalChanges(error)) return false;
  if (typeof window === 'undefined') return false;

  const report = error.result.finalReport;
  const pendingCount = report.pendingEventCount;
  const queueCount = report.unfinishedSyncQueueCount;
  const pendingPhotoEvidenceCount = report.pendingSalesPhotoEvidenceCreationCount;

  return window.confirm(
    [
      [
        `There are ${pendingCount} unsynced local event(s)`,
        `${queueCount} unfinished sync queue item(s)`,
        `and ${pendingPhotoEvidenceCount} pending sales photo evidence item(s).`,
      ].join(', '),
      'Signing out now will discard local changes that have not reached Cloud.',
      'Press OK only if you want to force sign out and discard these local changes.',
    ].join('\n')
  );
}
