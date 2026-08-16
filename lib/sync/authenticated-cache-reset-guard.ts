import {
  getLocalPendingWriteReport,
  type LocalPendingWriteBlockingReason,
  type LocalPendingWriteReport,
} from '@/lib/sync/local-pending-write-report';
import { pushEvents } from '@/lib/sync/sync-push-service';
import {
  resetAuthenticatedCache,
  type AuthCacheResetScope,
} from '@/lib/db/clear-user-data';

export type AuthenticatedCacheResetReason =
  | 'manual_signout'
  | 'passive_signout'
  | 'identity_switch'
  | 'staff_status_reset'
  | 'settings_local_clear'
  | 'recovery_clear_local'
  | 'force_discard';

export type GuardedCacheResetDecision =
  | 'cleared'
  | 'cleared_after_sync'
  | 'discarded'
  | 'blocked';

export type GuardedCacheResetBlockingReason =
  | LocalPendingWriteBlockingReason
  | 'missing_user'
  | 'sync_not_allowed'
  | 'sync_failed'
  | 'pending_after_sync';

export interface GuardedAuthenticatedCacheResetOptions {
  scope: AuthCacheResetScope;
  reason: AuthenticatedCacheResetReason;
  userId?: string;
  allowSyncAttempt?: boolean;
  forceDiscardLocalChanges?: boolean;
}

export interface GuardedAuthenticatedCacheResetResult {
  decision: GuardedCacheResetDecision;
  reason: AuthenticatedCacheResetReason;
  scope: AuthCacheResetScope;
  initialReport: LocalPendingWriteReport;
  finalReport: LocalPendingWriteReport;
  blockingReasonCodes: GuardedCacheResetBlockingReason[];
}

interface GuardedResetDependencies {
  getReport: typeof getLocalPendingWriteReport;
  push: typeof pushEvents;
  reset: typeof resetAuthenticatedCache;
}

function uniqueReasons(reasons: GuardedCacheResetBlockingReason[]): GuardedCacheResetBlockingReason[] {
  return Array.from(new Set(reasons));
}

function hardBlockReasons(report: LocalPendingWriteReport): GuardedCacheResetBlockingReason[] {
  return report.blockingReasonCodes.filter(reason => reason !== 'local_pending_events');
}

export async function guardedAuthenticatedCacheReset(
  options: GuardedAuthenticatedCacheResetOptions,
  deps: GuardedResetDependencies = {
    getReport: getLocalPendingWriteReport,
    push: pushEvents,
    reset: resetAuthenticatedCache,
  }
): Promise<GuardedAuthenticatedCacheResetResult> {
  const allowSyncAttempt = options.allowSyncAttempt === true;
  const initialReport = await deps.getReport(options.userId);

  if (initialReport.isClean) {
    await deps.reset(options.scope, options.userId);
    return {
      decision: 'cleared',
      reason: options.reason,
      scope: options.scope,
      initialReport,
      finalReport: initialReport,
      blockingReasonCodes: [],
    };
  }

  if (options.forceDiscardLocalChanges === true) {
    await deps.reset(options.scope, options.userId);
    return {
      decision: 'discarded',
      reason: options.reason,
      scope: options.scope,
      initialReport,
      finalReport: initialReport,
      blockingReasonCodes: initialReport.blockingReasonCodes,
    };
  }

  const hardBlocks = hardBlockReasons(initialReport);
  if (hardBlocks.length > 0) {
    return {
      decision: 'blocked',
      reason: options.reason,
      scope: options.scope,
      initialReport,
      finalReport: initialReport,
      blockingReasonCodes: hardBlocks,
    };
  }

  if (!allowSyncAttempt) {
    return {
      decision: 'blocked',
      reason: options.reason,
      scope: options.scope,
      initialReport,
      finalReport: initialReport,
      blockingReasonCodes: ['sync_not_allowed'],
    };
  }

  if (!options.userId) {
    return {
      decision: 'blocked',
      reason: options.reason,
      scope: options.scope,
      initialReport,
      finalReport: initialReport,
      blockingReasonCodes: ['missing_user'],
    };
  }

  try {
    await deps.push(options.userId);
  } catch {
    return {
      decision: 'blocked',
      reason: options.reason,
      scope: options.scope,
      initialReport,
      finalReport: initialReport,
      blockingReasonCodes: ['sync_failed'],
    };
  }

  const finalReport = await deps.getReport(options.userId);

  if (finalReport.isClean) {
    await deps.reset(options.scope, options.userId);
    return {
      decision: 'cleared_after_sync',
      reason: options.reason,
      scope: options.scope,
      initialReport,
      finalReport,
      blockingReasonCodes: [],
    };
  }

  return {
    decision: 'blocked',
    reason: options.reason,
    scope: options.scope,
    initialReport,
    finalReport,
    blockingReasonCodes: uniqueReasons(['pending_after_sync', ...finalReport.blockingReasonCodes]),
  };
}
