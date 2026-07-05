import { db } from '@/lib/db';
import type {
  LocalPendingSalesPhotoEvidenceCreation,
  PendingSalesPhotoEvidenceCreationStatus,
} from '@/lib/sales/photo-evidence-pending-creation';

export type SalesPhotoEvidencePendingCreationListItem = LocalPendingSalesPhotoEvidenceCreation;

export type SalesPhotoEvidencePendingCreationSummary = {
  totalCount: number;
  countByStatus: Record<PendingSalesPhotoEvidenceCreationStatus, number>;
  items: SalesPhotoEvidencePendingCreationListItem[];
};

const EMPTY_STATUS_COUNTS: Record<PendingSalesPhotoEvidenceCreationStatus, number> = {
  waiting_for_event_sync: 0,
  creating: 0,
  created: 0,
  failed_retryable: 0,
  failed_permanent: 0,
  blocked_invalid_source: 0,
};

function normalizeLimit(limit: number | undefined): number {
  if (limit == null) return 100;
  if (!Number.isFinite(limit)) return 0;
  return Math.max(0, Math.floor(limit));
}

function sortNewestFirst(
  items: SalesPhotoEvidencePendingCreationListItem[]
): SalesPhotoEvidencePendingCreationListItem[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listLocalSalesPhotoEvidencePendingCreationsForMarket(
  marketId: string,
  options: { limit?: number } = {}
): Promise<SalesPhotoEvidencePendingCreationListItem[]> {
  if (!marketId) return [];

  const limit = normalizeLimit(options.limit);
  if (limit === 0) return [];

  const rows = await db.salesPhotoEvidencePendingCreations
    .where('marketId')
    .equals(marketId)
    .toArray();

  return sortNewestFirst(rows).slice(0, limit);
}

export async function getLocalSalesPhotoEvidencePendingCreationSummaryForMarket(
  marketId: string,
  options: { limit?: number } = {}
): Promise<SalesPhotoEvidencePendingCreationSummary> {
  const items = await listLocalSalesPhotoEvidencePendingCreationsForMarket(marketId, options);
  const countByStatus = { ...EMPTY_STATUS_COUNTS };

  for (const item of items) {
    countByStatus[item.status] += 1;
  }

  return {
    totalCount: items.length,
    countByStatus,
    items,
  };
}
