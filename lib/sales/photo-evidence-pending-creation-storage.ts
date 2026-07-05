import { db } from '@/lib/db';
import type { DeferredSalesPhotoEvidenceEvent } from '@/lib/sales/photo-evidence-deferred';
import {
  createLocalPendingSalesPhotoEvidenceCreation,
  markPendingSalesPhotoEvidenceCreationBlocked,
  markPendingSalesPhotoEvidenceCreationCreated,
  markPendingSalesPhotoEvidenceCreationCreating,
  markPendingSalesPhotoEvidenceCreationPermanentFailure,
  markPendingSalesPhotoEvidenceCreationRetryableFailure,
  type CreateLocalPendingSalesPhotoEvidenceCreationInput,
  type LocalPendingSalesPhotoEvidenceCreation,
} from '@/lib/sales/photo-evidence-pending-creation';
import type {
  SalesPhotoEvidencePendingCreationStorage,
} from '@/lib/sales/photo-evidence-pending-creation-drain';
import type { SalesPhotoEvidenceExistingRow } from '@/lib/sales/photo-evidence-model';
import type { Event } from '@/types/db';

const RUNNABLE_PENDING_CREATION_STATUSES = [
  'waiting_for_event_sync',
  'failed_retryable',
] as const;

export type EnqueuePendingSalesPhotoEvidenceCreationResult = {
  item: LocalPendingSalesPhotoEvidenceCreation;
  created: boolean;
};

export type DexieSalesPhotoEvidencePendingCreationStorageOptions = {
  listExistingEvidenceForSale?: (
    item: LocalPendingSalesPhotoEvidenceCreation
  ) => Promise<readonly SalesPhotoEvidenceExistingRow[]>;
};

function normalizeLimit(limit: number): number {
  if (!Number.isFinite(limit)) return 0;
  return Math.max(0, Math.floor(limit));
}

function toDeferredDealEvent(event: Event | undefined): DeferredSalesPhotoEvidenceEvent | null {
  if (!event) return null;

  return {
    id: event.id ?? null,
    type: event.type ?? null,
    sync_status: event.sync_status ?? null,
  };
}

export async function enqueuePendingSalesPhotoEvidenceCreation(
  input: CreateLocalPendingSalesPhotoEvidenceCreationInput
): Promise<EnqueuePendingSalesPhotoEvidenceCreationResult> {
  const item = createLocalPendingSalesPhotoEvidenceCreation(input);
  const existing = await db.salesPhotoEvidencePendingCreations.get(item.queueId);

  if (existing) {
    return {
      item: existing,
      created: false,
    };
  }

  await db.salesPhotoEvidencePendingCreations.add(item);

  return {
    item,
    created: true,
  };
}

export function createDexieSalesPhotoEvidencePendingCreationStorage(
  options: DexieSalesPhotoEvidencePendingCreationStorageOptions = {}
): SalesPhotoEvidencePendingCreationStorage {
  return {
    async listRunnableCreations({ limit }) {
      const normalizedLimit = normalizeLimit(limit);
      if (normalizedLimit === 0) return [];

      const items = await db.salesPhotoEvidencePendingCreations
        .where('status')
        .anyOf([...RUNNABLE_PENDING_CREATION_STATUSES])
        .sortBy('updatedAt');

      return items.slice(0, normalizedLimit);
    },

    async getSourceDealEvent(item) {
      const event = await db.events.get(item.saleEventId);
      return toDeferredDealEvent(event as Event | undefined);
    },

    async listExistingEvidenceForSale(item) {
      return options.listExistingEvidenceForSale?.(item) ?? [];
    },

    async markCreating(item, now) {
      await db.salesPhotoEvidencePendingCreations.put(
        markPendingSalesPhotoEvidenceCreationCreating(item, now)
      );
    },

    async markCreated(item, now) {
      await db.salesPhotoEvidencePendingCreations.put(
        markPendingSalesPhotoEvidenceCreationCreated(item, now)
      );
    },

    async markRetryableFailure(item, failure) {
      await db.salesPhotoEvidencePendingCreations.put(
        markPendingSalesPhotoEvidenceCreationRetryableFailure(item, failure)
      );
    },

    async markPermanentFailure(item, failure) {
      await db.salesPhotoEvidencePendingCreations.put(
        markPendingSalesPhotoEvidenceCreationPermanentFailure(item, failure)
      );
    },

    async markBlocked(item, failure) {
      await db.salesPhotoEvidencePendingCreations.put(
        markPendingSalesPhotoEvidenceCreationBlocked(item, failure)
      );
    },
  };
}
