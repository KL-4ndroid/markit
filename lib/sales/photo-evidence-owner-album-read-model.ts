import type { SalesPhotoEvidenceStatus } from '@/lib/sales/photo-evidence-model';

export type SalesPhotoEvidenceOwnerAlbumActorRole = 'owner' | 'staff';

export type SalesPhotoEvidenceAlbumSourceRow = {
  id: string;
  owner_id?: string | null;
  ownerId?: string | null;
  market_id?: string | null;
  marketId?: string | null;
  sale_id?: string | null;
  saleId?: string | null;
  captured_by_staff_id?: string | null;
  capturedByStaffId?: string | null;
  status: SalesPhotoEvidenceStatus;
  sale_completed_at?: string | null;
  saleCompletedAt?: string | null;
  uploaded_at?: string | null;
  uploadedAt?: string | null;
  expires_at?: string | null;
  expiresAt?: string | null;
  r2_object_key?: string | null;
  r2ObjectKey?: string | null;
  r2_thumbnail_key?: string | null;
  r2ThumbnailKey?: string | null;
  deleted_at?: string | null;
  deletedAt?: string | null;
};

export type SalesPhotoEvidenceAlbumItemDisplayStatus =
  | 'pending'
  | 'captured_local'
  | 'uploaded_private'
  | 'upload_failed'
  | 'expired'
  | 'waived'
  | 'skipped';

export type SalesPhotoEvidenceAlbumThumbnailState =
  | 'not_available'
  | 'private_object_available_without_signed_url';

export type SalesPhotoEvidenceAlbumItem = {
  id: string;
  saleId: string | null;
  staffId: string | null;
  status: SalesPhotoEvidenceStatus;
  displayStatus: SalesPhotoEvidenceAlbumItemDisplayStatus;
  saleCompletedAt: string | null;
  uploadedAt: string | null;
  expiresAt: string | null;
  thumbnailState: SalesPhotoEvidenceAlbumThumbnailState;
  hasPrivateImageObject: boolean;
  hasPrivateThumbnailObject: boolean;
  signedReadUrl: null;
};

export type SalesPhotoEvidenceAlbumSummary = {
  totalCount: number;
  countByDisplayStatus: Record<SalesPhotoEvidenceAlbumItemDisplayStatus, number>;
  hasUploadedPrivateObjects: boolean;
  signedReadAvailable: false;
};

export type SalesPhotoEvidenceOwnerAlbumViewModel = {
  ownerId: string;
  marketId: string;
  summary: SalesPhotoEvidenceAlbumSummary;
  items: SalesPhotoEvidenceAlbumItem[];
};

export type SalesPhotoEvidenceOwnerAlbumDecision =
  | {
      action: 'show_owner_album';
      reason: 'owner_album_ready';
      viewModel: SalesPhotoEvidenceOwnerAlbumViewModel;
    }
  | {
      action: 'reject_owner_album';
      reason: 'owner_only' | 'invalid_scope';
      message: string;
    };

export type BuildSalesPhotoEvidenceOwnerAlbumInput = {
  actorRole: SalesPhotoEvidenceOwnerAlbumActorRole;
  ownerId: string;
  marketId: string;
  rows: readonly SalesPhotoEvidenceAlbumSourceRow[];
  now?: string | Date;
  limit?: number;
};

const EMPTY_STATUS_COUNTS: Record<SalesPhotoEvidenceAlbumItemDisplayStatus, number> = {
  pending: 0,
  captured_local: 0,
  uploaded_private: 0,
  upload_failed: 0,
  expired: 0,
  waived: 0,
  skipped: 0,
};

function normalizeOptionalString(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getRowOwnerId(row: SalesPhotoEvidenceAlbumSourceRow): string | null {
  return normalizeOptionalString(row.owner_id ?? row.ownerId);
}

function getRowMarketId(row: SalesPhotoEvidenceAlbumSourceRow): string | null {
  return normalizeOptionalString(row.market_id ?? row.marketId);
}

function getRowSaleId(row: SalesPhotoEvidenceAlbumSourceRow): string | null {
  return normalizeOptionalString(row.sale_id ?? row.saleId);
}

function getRowStaffId(row: SalesPhotoEvidenceAlbumSourceRow): string | null {
  return normalizeOptionalString(row.captured_by_staff_id ?? row.capturedByStaffId);
}

function getRowDeletedAt(row: SalesPhotoEvidenceAlbumSourceRow): string | null {
  return normalizeOptionalString(row.deleted_at ?? row.deletedAt);
}

function getRowSaleCompletedAt(row: SalesPhotoEvidenceAlbumSourceRow): string | null {
  return normalizeOptionalString(row.sale_completed_at ?? row.saleCompletedAt);
}

function getRowUploadedAt(row: SalesPhotoEvidenceAlbumSourceRow): string | null {
  return normalizeOptionalString(row.uploaded_at ?? row.uploadedAt);
}

function getRowExpiresAt(row: SalesPhotoEvidenceAlbumSourceRow): string | null {
  return normalizeOptionalString(row.expires_at ?? row.expiresAt);
}

function getRowImageObjectKey(row: SalesPhotoEvidenceAlbumSourceRow): string | null {
  return normalizeOptionalString(row.r2_object_key ?? row.r2ObjectKey);
}

function getRowThumbnailObjectKey(row: SalesPhotoEvidenceAlbumSourceRow): string | null {
  return normalizeOptionalString(row.r2_thumbnail_key ?? row.r2ThumbnailKey);
}

function parseTime(value: string | null): number {
  if (value === null) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit == null) return 100;
  if (!Number.isFinite(limit)) return 0;
  return Math.max(0, Math.floor(limit));
}

function isExpiredByTime(row: SalesPhotoEvidenceAlbumSourceRow, now: Date): boolean {
  const expiresAt = getRowExpiresAt(row);
  if (!expiresAt) return false;

  const expiresTime = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresTime)) return false;

  return expiresTime <= now.getTime();
}

function getDisplayStatus(
  row: SalesPhotoEvidenceAlbumSourceRow,
  now: Date
): SalesPhotoEvidenceAlbumItemDisplayStatus {
  if (row.status === 'expired' || isExpiredByTime(row, now)) return 'expired';
  if (row.status === 'uploaded') return 'uploaded_private';
  if (row.status === 'upload_failed' || row.status === 'uploading') return 'upload_failed';
  if (row.status === 'captured_local') return 'captured_local';
  if (row.status === 'waived_by_owner') return 'waived';
  if (row.status === 'capture_skipped' || row.status === 'not_required') return 'skipped';
  return 'pending';
}

function toAlbumItem(row: SalesPhotoEvidenceAlbumSourceRow, now: Date): SalesPhotoEvidenceAlbumItem {
  const imageObjectKey = getRowImageObjectKey(row);
  const thumbnailObjectKey = getRowThumbnailObjectKey(row);

  return {
    id: row.id,
    saleId: getRowSaleId(row),
    staffId: getRowStaffId(row),
    status: row.status,
    displayStatus: getDisplayStatus(row, now),
    saleCompletedAt: getRowSaleCompletedAt(row),
    uploadedAt: getRowUploadedAt(row),
    expiresAt: getRowExpiresAt(row),
    thumbnailState: thumbnailObjectKey ? 'private_object_available_without_signed_url' : 'not_available',
    hasPrivateImageObject: imageObjectKey !== null,
    hasPrivateThumbnailObject: thumbnailObjectKey !== null,
    signedReadUrl: null,
  };
}

function sortAlbumItemsNewestFirst(items: SalesPhotoEvidenceAlbumItem[]): SalesPhotoEvidenceAlbumItem[] {
  return [...items].sort((a, b) => {
    const aTime = parseTime(a.saleCompletedAt) || parseTime(a.uploadedAt) || parseTime(a.expiresAt);
    const bTime = parseTime(b.saleCompletedAt) || parseTime(b.uploadedAt) || parseTime(b.expiresAt);
    return bTime - aTime || b.id.localeCompare(a.id);
  });
}

export function buildSalesPhotoEvidenceOwnerAlbumViewModel(
  input: BuildSalesPhotoEvidenceOwnerAlbumInput
): SalesPhotoEvidenceOwnerAlbumDecision {
  if (input.actorRole !== 'owner') {
    return {
      action: 'reject_owner_album',
      reason: 'owner_only',
      message: 'Sales photo evidence album is owner-only.',
    };
  }

  if (!input.ownerId || !input.marketId) {
    return {
      action: 'reject_owner_album',
      reason: 'invalid_scope',
      message: 'Sales photo evidence album requires owner and market scope.',
    };
  }

  const now = input.now instanceof Date ? input.now : new Date(input.now ?? Date.now());
  const normalizedNow = Number.isFinite(now.getTime()) ? now : new Date(0);
  const limit = normalizeLimit(input.limit);
  const filteredRows = input.rows.filter(row => {
    if (getRowDeletedAt(row) !== null) return false;
    return getRowOwnerId(row) === input.ownerId && getRowMarketId(row) === input.marketId;
  });
  const items = sortAlbumItemsNewestFirst(filteredRows.map(row => toAlbumItem(row, normalizedNow))).slice(0, limit);
  const countByDisplayStatus = { ...EMPTY_STATUS_COUNTS };

  for (const item of items) {
    countByDisplayStatus[item.displayStatus] += 1;
  }

  return {
    action: 'show_owner_album',
    reason: 'owner_album_ready',
    viewModel: {
      ownerId: input.ownerId,
      marketId: input.marketId,
      summary: {
        totalCount: items.length,
        countByDisplayStatus,
        hasUploadedPrivateObjects: items.some(item => item.displayStatus === 'uploaded_private'),
        signedReadAvailable: false,
      },
      items,
    },
  };
}
