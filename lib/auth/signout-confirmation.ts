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
  const pendingPhotoPayloadCount = report.pendingSalesPhotoEvidencePayloadCount;

  return window.confirm(
    [
      [
        `There are ${pendingCount} unsynced local event(s)`,
        `${queueCount} unfinished sync queue item(s)`,
        `${pendingPhotoEvidenceCount} pending sales photo evidence item(s)`,
        `and ${pendingPhotoPayloadCount} pending local photo payload(s).`,
      ].join(', '),
      `${report.pendingMarketJournalDraftCount ?? 0} 篇出攤心得草稿尚未送達雲端。請回到出攤心得儲存；一般同步不會代為送出草稿。`,
      `${report.pendingMarketCashDraftCount ?? 0} 份現金草稿尚未送達雲端，請回市集的開／收攤現金儲存；也可在帳號同步設定處理。`,
      'Signing out now will discard local changes that have not reached Cloud.',
      'Press OK only if you want to force sign out and discard these local changes.',
    ].join('\n')
  );
}
