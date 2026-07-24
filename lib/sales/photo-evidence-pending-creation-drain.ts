import type { DeferredSalesPhotoEvidenceEvent } from '@/lib/sales/photo-evidence-deferred';
import {
  classifyPendingSalesPhotoEvidenceCreationCandidate,
  type LocalPendingSalesPhotoEvidenceCreation,
  type PendingSalesPhotoEvidenceCreationFailureInput,
} from '@/lib/sales/photo-evidence-pending-creation';
import type { SalesPhotoEvidenceExistingRow, SalesPhotoEvidencePendingDraft } from '@/lib/sales/photo-evidence-model';

export type SalesPhotoEvidencePendingCreationDrainListOptions = {
  limit: number;
};

export type SalesPhotoEvidencePendingCreationStorage = {
  listRunnableCreations(
    options: SalesPhotoEvidencePendingCreationDrainListOptions
  ): Promise<readonly LocalPendingSalesPhotoEvidenceCreation[]>;
  getSourceDealEvent(item: LocalPendingSalesPhotoEvidenceCreation): Promise<DeferredSalesPhotoEvidenceEvent | null>;
  listExistingEvidenceForSale(item: LocalPendingSalesPhotoEvidenceCreation): Promise<readonly SalesPhotoEvidenceExistingRow[]>;
  markCreating(item: LocalPendingSalesPhotoEvidenceCreation, now?: string): Promise<void>;
  markCreated(item: LocalPendingSalesPhotoEvidenceCreation, now?: string): Promise<void>;
  markRetryableFailure(
    item: LocalPendingSalesPhotoEvidenceCreation,
    failure: PendingSalesPhotoEvidenceCreationFailureInput
  ): Promise<void>;
  markPermanentFailure(
    item: LocalPendingSalesPhotoEvidenceCreation,
    failure: PendingSalesPhotoEvidenceCreationFailureInput
  ): Promise<void>;
  markBlocked(
    item: LocalPendingSalesPhotoEvidenceCreation,
    failure: PendingSalesPhotoEvidenceCreationFailureInput
  ): Promise<void>;
};

export type CreatePendingSalesPhotoEvidenceMetadata = (draft: SalesPhotoEvidencePendingDraft) => Promise<void>;

export type DrainPendingSalesPhotoEvidenceCreationsInput = {
  enabled?: boolean;
  storage: SalesPhotoEvidencePendingCreationStorage;
  createPendingEvidence: CreatePendingSalesPhotoEvidenceMetadata;
  now?: string;
  limit?: number;
  maxRetryCount?: number;
};

export type SalesPhotoEvidencePendingCreationDrainItemResult =
  | {
      queueId: string;
      result: 'created';
    }
  | {
      queueId: string;
      result: 'wait_for_event_sync';
      detail?: string;
    }
  | {
      queueId: string;
      result: 'skipped_existing';
    }
  | {
      queueId: string;
      result: 'blocked';
      code: string;
      message: string;
    }
  | {
      queueId: string;
      result: 'failed_retryable';
      code: string;
      message: string;
    };

export type SalesPhotoEvidencePendingCreationDrainResult = {
  status: 'disabled' | 'completed';
  processedCount: number;
  createdCount: number;
  waitCount: number;
  skippedExistingCount: number;
  retryableFailureCount: number;
  blockedCount: number;
  itemResults: SalesPhotoEvidencePendingCreationDrainItemResult[];
};

const DEFAULT_DRAIN_LIMIT = 10;

function emptyResult(status: 'disabled' | 'completed'): SalesPhotoEvidencePendingCreationDrainResult {
  return {
    status,
    processedCount: 0,
    createdCount: 0,
    waitCount: 0,
    skippedExistingCount: 0,
    retryableFailureCount: 0,
    blockedCount: 0,
    itemResults: [],
  };
}

function incrementResult(
  result: SalesPhotoEvidencePendingCreationDrainResult,
  itemResult: SalesPhotoEvidencePendingCreationDrainItemResult
): void {
  result.itemResults.push(itemResult);
  result.processedCount += 1;

  if (itemResult.result === 'created') result.createdCount += 1;
  if (itemResult.result === 'wait_for_event_sync') result.waitCount += 1;
  if (itemResult.result === 'skipped_existing') result.skippedExistingCount += 1;
  if (itemResult.result === 'failed_retryable') result.retryableFailureCount += 1;
  if (itemResult.result === 'blocked') result.blockedCount += 1;
}

export async function drainPendingSalesPhotoEvidenceCreations(
  input: DrainPendingSalesPhotoEvidenceCreationsInput
): Promise<SalesPhotoEvidencePendingCreationDrainResult> {
  if (input.enabled !== true) {
    return emptyResult('disabled');
  }

  const result = emptyResult('completed');
  const now = input.now;
  const items = await input.storage.listRunnableCreations({
    limit: input.limit ?? DEFAULT_DRAIN_LIMIT,
  });

  for (const item of items) {
    const sourceEvent = await input.storage.getSourceDealEvent(item);

    if (!sourceEvent) {
      const failure = {
        code: 'source_event_missing',
        message: 'Source deal event was not found for pending sales photo evidence creation.',
        now,
      };
      await input.storage.markBlocked(item, failure);
      incrementResult(result, {
        queueId: item.queueId,
        result: 'blocked',
        code: failure.code,
        message: failure.message,
      });
      continue;
    }

    const existingEvidence = await input.storage.listExistingEvidenceForSale(item);
    const decision = classifyPendingSalesPhotoEvidenceCreationCandidate(item, sourceEvent, {
      existingEvidence,
      maxRetryCount: input.maxRetryCount,
      now,
    });

    if (decision.eligible) {
      await input.storage.markCreating(item, now);

      try {
        await input.createPendingEvidence(decision.draft);
        await input.storage.markCreated(item, now);
        incrementResult(result, {
          queueId: item.queueId,
          result: 'created',
        });
      } catch (error) {
        const failure = {
          code: 'create_pending_evidence_failed',
          message: error instanceof Error ? error.message : String(error),
          now,
        };
        await input.storage.markRetryableFailure(item, failure);
        incrementResult(result, {
          queueId: item.queueId,
          result: 'failed_retryable',
          code: failure.code,
          message: failure.message,
        });
      }

      continue;
    }

    if (decision.reason === 'event_not_synced') {
      incrementResult(result, {
        queueId: item.queueId,
        result: 'wait_for_event_sync',
        detail: decision.detail,
      });
      continue;
    }

    if (decision.reason === 'active_evidence_exists') {
      await input.storage.markCreated(item, now);
      incrementResult(result, {
        queueId: item.queueId,
        result: 'skipped_existing',
      });
      continue;
    }

    if (decision.reason === 'max_retry_exceeded') {
      const failure = {
        code: 'max_retry_exceeded',
        message: 'Pending sales photo evidence creation exceeded the retry limit.',
        now,
      };
      await input.storage.markPermanentFailure(item, failure);
      incrementResult(result, {
        queueId: item.queueId,
        result: 'blocked',
        code: failure.code,
        message: failure.message,
      });
      continue;
    }

    const failure = {
      code: decision.reason,
      message: decision.detail ?? 'Pending sales photo evidence creation is not runnable.',
      now,
    };
    await input.storage.markBlocked(item, failure);
    incrementResult(result, {
      queueId: item.queueId,
      result: 'blocked',
      code: failure.code,
      message: failure.message,
    });
  }

  return result;
}
