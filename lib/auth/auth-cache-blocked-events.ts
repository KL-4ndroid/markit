import type { GuardedAuthenticatedCacheResetResult } from '@/lib/sync/authenticated-cache-reset-guard';

export const AUTH_CACHE_BLOCKED_EVENT = 'boothbook:auth-cache-blocked';

export type AuthCacheBlockedAction =
  | 'passive_signout'
  | 'identity_switch'
  | 'staff_status_reset';

export interface AuthCacheBlockedEventDetail {
  action: AuthCacheBlockedAction;
  message: string;
  pendingEventCount: number;
  unfinishedSyncQueueCount: number;
  blockingReasonCodes: string[];
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
      message,
      pendingEventCount: report.pendingEventCount,
      unfinishedSyncQueueCount: report.unfinishedSyncQueueCount,
      blockingReasonCodes: result.blockingReasonCodes,
    },
  }));
}
