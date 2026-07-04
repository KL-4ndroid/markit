import {
  planDeferredSalesPhotoEvidenceCreation,
  type DeferredSalesPhotoEvidenceEvent,
} from '@/lib/sales/photo-evidence-deferred';
import type { SalesPhotoEvidenceExistingRow, SalesPhotoEvidencePendingDraft } from '@/lib/sales/photo-evidence-model';

export const PENDING_SALES_PHOTO_EVIDENCE_CREATION_STATUSES = [
  'waiting_for_event_sync',
  'creating',
  'created',
  'failed_retryable',
  'failed_permanent',
  'blocked_invalid_source',
] as const;

export type PendingSalesPhotoEvidenceCreationStatus =
  (typeof PENDING_SALES_PHOTO_EVIDENCE_CREATION_STATUSES)[number];

export type LocalPendingSalesPhotoEvidenceCreation = {
  queueId: string;
  saleEventId: string;
  ownerId: string;
  marketId: string;
  capturedByStaffId: string | null;
  saleCompletedAt: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  status: PendingSalesPhotoEvidenceCreationStatus;
  retryCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
};

export type CreateLocalPendingSalesPhotoEvidenceCreationInput = {
  saleEventId: string;
  ownerId: string;
  marketId: string;
  capturedByStaffId?: string | null;
  saleCompletedAt: string | number | Date;
  now?: string | number | Date;
};

export type PendingSalesPhotoEvidenceCreationFailureInput = {
  code: string;
  message: string;
  now?: string | number | Date;
};

export type PendingSalesPhotoEvidenceCreationCandidateReason =
  | 'eligible'
  | 'status_not_retryable'
  | 'max_retry_exceeded'
  | 'source_event_mismatch'
  | 'event_not_synced'
  | 'source_invalid'
  | 'active_evidence_exists';

export type PendingSalesPhotoEvidenceCreationCandidateDecision =
  | {
      eligible: true;
      reason: 'eligible';
      draft: SalesPhotoEvidencePendingDraft;
    }
  | {
      eligible: false;
      reason: Exclude<PendingSalesPhotoEvidenceCreationCandidateReason, 'eligible'>;
      detail?: string;
    };

export type PendingSalesPhotoEvidenceCreationCandidateOptions = {
  maxRetryCount?: number;
  now?: string | number | Date;
  existingEvidence?: readonly SalesPhotoEvidenceExistingRow[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${fieldName} must be a UUID`);
  }

  return value;
}

function normalizeDate(value: string | number | Date, fieldName: string): string {
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();

  if (!Number.isFinite(time)) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return date.toISOString();
}

function timestamp(now?: string | number | Date): string {
  return normalizeDate(now ?? new Date(), 'now');
}

function isRunnableStatus(status: PendingSalesPhotoEvidenceCreationStatus): boolean {
  return status === 'waiting_for_event_sync' || status === 'failed_retryable';
}

export function buildPendingSalesPhotoEvidenceCreationIdempotencyKey(saleEventId: string): string {
  return `sales-photo-evidence:${requireUuid(saleEventId, 'saleEventId')}`;
}

export function createLocalPendingSalesPhotoEvidenceCreation(
  input: CreateLocalPendingSalesPhotoEvidenceCreationInput
): LocalPendingSalesPhotoEvidenceCreation {
  const saleEventId = requireUuid(input.saleEventId, 'saleEventId');
  const now = timestamp(input.now);

  return {
    queueId: saleEventId,
    saleEventId,
    ownerId: requireUuid(input.ownerId, 'ownerId'),
    marketId: requireUuid(input.marketId, 'marketId'),
    capturedByStaffId: input.capturedByStaffId == null ? null : requireUuid(input.capturedByStaffId, 'capturedByStaffId'),
    saleCompletedAt: normalizeDate(input.saleCompletedAt, 'saleCompletedAt'),
    idempotencyKey: buildPendingSalesPhotoEvidenceCreationIdempotencyKey(saleEventId),
    createdAt: now,
    updatedAt: now,
    status: 'waiting_for_event_sync',
    retryCount: 0,
    lastErrorCode: null,
    lastErrorMessage: null,
  };
}

export function markPendingSalesPhotoEvidenceCreationCreating(
  item: LocalPendingSalesPhotoEvidenceCreation,
  now?: string | number | Date
): LocalPendingSalesPhotoEvidenceCreation {
  return {
    ...item,
    status: 'creating',
    updatedAt: timestamp(now),
    lastErrorCode: null,
    lastErrorMessage: null,
  };
}

export function markPendingSalesPhotoEvidenceCreationCreated(
  item: LocalPendingSalesPhotoEvidenceCreation,
  now?: string | number | Date
): LocalPendingSalesPhotoEvidenceCreation {
  return {
    ...item,
    status: 'created',
    updatedAt: timestamp(now),
    lastErrorCode: null,
    lastErrorMessage: null,
  };
}

export function markPendingSalesPhotoEvidenceCreationRetryableFailure(
  item: LocalPendingSalesPhotoEvidenceCreation,
  failure: PendingSalesPhotoEvidenceCreationFailureInput
): LocalPendingSalesPhotoEvidenceCreation {
  return {
    ...item,
    status: 'failed_retryable',
    updatedAt: timestamp(failure.now),
    retryCount: item.retryCount + 1,
    lastErrorCode: failure.code,
    lastErrorMessage: failure.message,
  };
}

export function markPendingSalesPhotoEvidenceCreationPermanentFailure(
  item: LocalPendingSalesPhotoEvidenceCreation,
  failure: PendingSalesPhotoEvidenceCreationFailureInput
): LocalPendingSalesPhotoEvidenceCreation {
  return {
    ...item,
    status: 'failed_permanent',
    updatedAt: timestamp(failure.now),
    lastErrorCode: failure.code,
    lastErrorMessage: failure.message,
  };
}

export function markPendingSalesPhotoEvidenceCreationBlocked(
  item: LocalPendingSalesPhotoEvidenceCreation,
  failure: PendingSalesPhotoEvidenceCreationFailureInput
): LocalPendingSalesPhotoEvidenceCreation {
  return {
    ...item,
    status: 'blocked_invalid_source',
    updatedAt: timestamp(failure.now),
    lastErrorCode: failure.code,
    lastErrorMessage: failure.message,
  };
}

export function classifyPendingSalesPhotoEvidenceCreationCandidate(
  item: LocalPendingSalesPhotoEvidenceCreation,
  sourceEvent: DeferredSalesPhotoEvidenceEvent,
  options: PendingSalesPhotoEvidenceCreationCandidateOptions = {}
): PendingSalesPhotoEvidenceCreationCandidateDecision {
  const maxRetryCount = options.maxRetryCount ?? 3;

  if (!isRunnableStatus(item.status)) {
    return { eligible: false, reason: 'status_not_retryable' };
  }

  if (item.status === 'failed_retryable' && item.retryCount >= maxRetryCount) {
    return { eligible: false, reason: 'max_retry_exceeded' };
  }

  if (sourceEvent.id !== item.saleEventId) {
    return { eligible: false, reason: 'source_event_mismatch' };
  }

  const plan = planDeferredSalesPhotoEvidenceCreation({
    dealEvent: sourceEvent,
    ownerId: item.ownerId,
    marketId: item.marketId,
    marketRequiresEvidence: true,
    capturedByStaffId: item.capturedByStaffId,
    saleCompletedAt: item.saleCompletedAt,
    now: options.now,
    existingEvidence: options.existingEvidence,
  });

  if (plan.action === 'ready_to_create') {
    return { eligible: true, reason: 'eligible', draft: plan.draft };
  }

  if (plan.action === 'wait_for_event_sync') {
    return { eligible: false, reason: 'event_not_synced', detail: plan.syncStatus ?? 'unknown' };
  }

  if (plan.action === 'skip_existing') {
    return { eligible: false, reason: 'active_evidence_exists' };
  }

  return {
    eligible: false,
    reason: 'source_invalid',
    detail: plan.reason,
  };
}
