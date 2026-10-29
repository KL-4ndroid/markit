import type { GuardedAuthenticatedCacheResetResult } from '@/lib/sync/authenticated-cache-reset-guard';

export const AUTH_CACHE_BLOCKED_EVENT = 'boothbook:auth-cache-blocked';

export type AuthCacheBlockedAction =
  | 'passive_signout'
  | 'identity_switch'
  | 'staff_status_reset';

export interface AuthCacheBlockedEventDetail {
  action: AuthCacheBlockedAction;
  userId?: string;
  message: string;
  pendingEventCount: number;
  unfinishedSyncQueueCount: number;
  pendingSalesPhotoEvidenceCreationCount: number;
  pendingSalesPhotoEvidencePayloadCount: number;
  pendingMarketJournalDraftCount?: number;
  pendingMarketCashDraftCount?: number;
  blockingReasonCodes: string[];
}

/** Reauthentication only releases this prompt for the original cache owner.
 * A staff-role reset still requires its separate guarded reconciliation. */
export function canResumeBlockedAuth(detail: AuthCacheBlockedEventDetail | null, userId: string | null | undefined): boolean {
  return Boolean(detail && detail.action !== 'staff_status_reset' && detail.userId && detail.userId === userId);
}

export function dispatchAuthCacheBlockedEvent(
  action: AuthCacheBlockedAction,
  result: GuardedAuthenticatedCacheResetResult,
  message: string
): void {
  if (typeof window === 'undefined') return;

  const report = result.finalReport;
  window.dispatchEvent(new CustomEvent<AuthCacheBlockedEventDetail>(AUTH_CACHE_BLOCKED_EVENT, {
    detail: {
      action,
      userId: report.userId,
      message,
      pendingEventCount: report.pendingEventCount,
      unfinishedSyncQueueCount: report.unfinishedSyncQueueCount,
      pendingSalesPhotoEvidenceCreationCount: report.pendingSalesPhotoEvidenceCreationCount,
      pendingSalesPhotoEvidencePayloadCount: report.pendingSalesPhotoEvidencePayloadCount,
      pendingMarketJournalDraftCount: report.pendingMarketJournalDraftCount ?? 0,
      pendingMarketCashDraftCount: report.pendingMarketCashDraftCount ?? 0,
      blockingReasonCodes: result.blockingReasonCodes,
    },
  }));
}
