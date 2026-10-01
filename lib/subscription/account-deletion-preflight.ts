import type { LocalPendingWriteReport } from '@/lib/sync/local-pending-write-report';
import type { AccountDeletionPreflightResolution } from './account-deletion-contract';

export type AccountDeletionPreflightAction =
  | 'sync_and_recheck'
  | 'export_and_confirm'
  | 'discard_and_confirm'
  | 'resolve_actor_mismatch'
  | 'retry_report';

export type AccountDeletionPreflightDecision = Readonly<{
  outcome: 'ready' | 'action_required' | 'blocked';
  resolution: AccountDeletionPreflightResolution | null;
  actions: readonly AccountDeletionPreflightAction[];
  counts: Readonly<{
    pendingEvents: number;
    unfinishedSyncQueue: number;
    pendingPhotoItems: number;
  }>;
}>;

export function resolveAccountDeletionPreflight(input: {
  report: LocalPendingWriteReport;
  safeExportAvailable: boolean;
}): AccountDeletionPreflightDecision {
  const counts = Object.freeze({
    pendingEvents: input.report.pendingEventCount,
    unfinishedSyncQueue: input.report.unfinishedSyncQueueCount,
    pendingPhotoItems:
      input.report.pendingSalesPhotoEvidenceCreationCount
      + input.report.pendingSalesPhotoEvidencePayloadCount
      + input.report.pendingProductCoverPhotoUploadCount
      + input.report.pendingProductCoverPhotoPayloadCount,
  });

  if (input.report.blockingReasonCodes.includes('read_failed')) {
    return Object.freeze({
      outcome: 'blocked',
      resolution: null,
      actions: Object.freeze(['retry_report'] as const),
      counts,
    });
  }
  if (input.report.blockingReasonCodes.includes('actor_mismatch')) {
    return Object.freeze({
      outcome: 'blocked',
      resolution: null,
      actions: Object.freeze(['resolve_actor_mismatch'] as const),
      counts,
    });
  }
  if (input.report.isClean) {
    return Object.freeze({ outcome: 'ready', resolution: 'clean', actions: [], counts });
  }

  const actions = new Set<AccountDeletionPreflightAction>();
  const hasBinaryPending = counts.pendingPhotoItems > 0;
  if (input.report.isOnline && !input.report.syncLocked && !hasBinaryPending) {
    actions.add('sync_and_recheck');
  }
  if (input.safeExportAvailable) actions.add('export_and_confirm');
  actions.add('discard_and_confirm');

  return Object.freeze({
    outcome: 'action_required',
    resolution: null,
    actions: Object.freeze([...actions]),
    counts,
  });
}
