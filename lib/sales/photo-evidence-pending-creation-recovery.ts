import {
  type LocalPendingSalesPhotoEvidenceCreation,
} from '@/lib/sales/photo-evidence-pending-creation';

export type PendingSalesPhotoEvidenceCreationRecoveryAction =
  | {
      action: 'recover_stale_creating';
      code: 'stale_creating_recovered';
      message: string;
    }
  | {
      action: 'cleanup_created_queue_row';
      code: 'created_queue_row_retired';
      message: string;
    }
  | {
      action: 'manual_review';
      code: 'terminal_failure_requires_review';
      message: string;
    }
  | {
      action: 'none';
      code:
        | 'not_stale'
        | 'not_terminal'
        | 'not_cleanup_eligible'
        | 'not_recoverable';
      message: string;
    };

export type ClassifyPendingSalesPhotoEvidenceCreationRecoveryOptions = {
  now?: string | number | Date;
  staleCreatingAfterMs?: number;
  cleanupCreatedAfterMs?: number;
};

const DEFAULT_STALE_CREATING_AFTER_MS = 5 * 60 * 1000;
const DEFAULT_CLEANUP_CREATED_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeDate(value: string | number | Date, fieldName: string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return date;
}

function normalizeDuration(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative finite number`);
  }

  return value;
}

function ageMs(item: LocalPendingSalesPhotoEvidenceCreation, now: Date): number {
  return now.getTime() - normalizeDate(item.updatedAt, 'updatedAt').getTime();
}

export function classifyPendingSalesPhotoEvidenceCreationRecovery(
  item: LocalPendingSalesPhotoEvidenceCreation,
  options: ClassifyPendingSalesPhotoEvidenceCreationRecoveryOptions = {}
): PendingSalesPhotoEvidenceCreationRecoveryAction {
  const now = normalizeDate(options.now ?? new Date(), 'now');
  const staleCreatingAfterMs = normalizeDuration(
    options.staleCreatingAfterMs ?? DEFAULT_STALE_CREATING_AFTER_MS,
    'staleCreatingAfterMs'
  );
  const cleanupCreatedAfterMs = normalizeDuration(
    options.cleanupCreatedAfterMs ?? DEFAULT_CLEANUP_CREATED_AFTER_MS,
    'cleanupCreatedAfterMs'
  );
  const itemAgeMs = ageMs(item, now);

  if (item.status === 'creating') {
    if (itemAgeMs >= staleCreatingAfterMs) {
      return {
        action: 'recover_stale_creating',
        code: 'stale_creating_recovered',
        message: 'Pending sales photo evidence creation was left in creating state and can be retried.',
      };
    }

    return {
      action: 'none',
      code: 'not_stale',
      message: 'Pending sales photo evidence creation is still within the creating grace period.',
    };
  }

  if (item.status === 'created') {
    if (itemAgeMs >= cleanupCreatedAfterMs) {
      return {
        action: 'cleanup_created_queue_row',
        code: 'created_queue_row_retired',
        message: 'Created local queue row can be retired without deleting sale or evidence metadata.',
      };
    }

    return {
      action: 'none',
      code: 'not_cleanup_eligible',
      message: 'Created local queue row is retained until the cleanup grace window passes.',
    };
  }

  if (item.status === 'failed_permanent' || item.status === 'blocked_invalid_source') {
    return {
      action: 'manual_review',
      code: 'terminal_failure_requires_review',
      message: 'Terminal pending sales photo evidence failure requires owner-visible review before removal.',
    };
  }

  if (item.status === 'waiting_for_event_sync' || item.status === 'failed_retryable') {
    return {
      action: 'none',
      code: 'not_terminal',
      message: 'Runnable pending sales photo evidence creation must stay available for normal retry.',
    };
  }

  return {
    action: 'none',
    code: 'not_recoverable',
    message: 'Pending sales photo evidence creation status has no recovery or cleanup action.',
  };
}
