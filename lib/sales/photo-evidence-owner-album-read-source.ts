export type SalesPhotoEvidenceOwnerAlbumReadSourceActorRole = 'owner' | 'staff';

export type SalesPhotoEvidenceOwnerAlbumReadSourceColumn =
  | 'id'
  | 'owner_id'
  | 'market_id'
  | 'sale_id'
  | 'captured_by_staff_id'
  | 'status'
  | 'sale_completed_at'
  | 'uploaded_at'
  | 'expires_at'
  | 'r2_object_key'
  | 'r2_thumbnail_key'
  | 'deleted_at';

export type SalesPhotoEvidenceOwnerAlbumReadSourceFilter =
  | {
      column: 'owner_id' | 'market_id';
      operator: 'eq';
      value: string;
    }
  | {
      column: 'deleted_at';
      operator: 'is';
      value: null;
    };

export type SalesPhotoEvidenceOwnerAlbumReadSourcePlan = {
  table: 'sale_photo_evidence';
  selectColumns: readonly SalesPhotoEvidenceOwnerAlbumReadSourceColumn[];
  filters: readonly SalesPhotoEvidenceOwnerAlbumReadSourceFilter[];
  orderBy: {
    column: 'sale_completed_at';
    direction: 'desc';
  };
  limit: number;
  requiresAuthenticatedOwner: true;
  allowsSignedReadUrl: false;
  allowsStorageAccess: false;
  allowsMutation: false;
};

export type SalesPhotoEvidenceOwnerAlbumReadSourceDecision =
  | {
      action: 'allow_owner_album_read_source';
      reason: 'owner_scope_ready';
      plan: SalesPhotoEvidenceOwnerAlbumReadSourcePlan;
    }
  | {
      action: 'reject_owner_album_read_source';
      reason: 'owner_only' | 'invalid_scope';
      message: string;
    };

export type BuildSalesPhotoEvidenceOwnerAlbumReadSourceInput = {
  actorRole: SalesPhotoEvidenceOwnerAlbumReadSourceActorRole | null;
  ownerId: string | null | undefined;
  marketId: string | null | undefined;
  limit?: number;
};

export const SALES_PHOTO_EVIDENCE_OWNER_ALBUM_READ_COLUMNS: readonly SalesPhotoEvidenceOwnerAlbumReadSourceColumn[] = [
  'id',
  'owner_id',
  'market_id',
  'sale_id',
  'captured_by_staff_id',
  'status',
  'sale_completed_at',
  'uploaded_at',
  'expires_at',
  'r2_object_key',
  'r2_thumbnail_key',
  'deleted_at',
] as const;

const DEFAULT_OWNER_ALBUM_READ_LIMIT = 100;
const MAX_OWNER_ALBUM_READ_LIMIT = 250;

function normalizeLimit(limit: number | undefined): number {
  if (limit == null) return DEFAULT_OWNER_ALBUM_READ_LIMIT;
  if (!Number.isFinite(limit)) return 0;

  return Math.min(MAX_OWNER_ALBUM_READ_LIMIT, Math.max(0, Math.floor(limit)));
}

export function buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan(
  input: BuildSalesPhotoEvidenceOwnerAlbumReadSourceInput
): SalesPhotoEvidenceOwnerAlbumReadSourceDecision {
  if (input.actorRole !== 'owner') {
    return {
      action: 'reject_owner_album_read_source',
      reason: 'owner_only',
      message: 'Sales photo evidence owner album read source is owner-only.',
    };
  }

  if (!input.ownerId || !input.marketId) {
    return {
      action: 'reject_owner_album_read_source',
      reason: 'invalid_scope',
      message: 'Sales photo evidence owner album read source requires owner and market scope.',
    };
  }

  return {
    action: 'allow_owner_album_read_source',
    reason: 'owner_scope_ready',
    plan: {
      table: 'sale_photo_evidence',
      selectColumns: SALES_PHOTO_EVIDENCE_OWNER_ALBUM_READ_COLUMNS,
      filters: [
        { column: 'owner_id', operator: 'eq', value: input.ownerId },
        { column: 'market_id', operator: 'eq', value: input.marketId },
        { column: 'deleted_at', operator: 'is', value: null },
      ],
      orderBy: {
        column: 'sale_completed_at',
        direction: 'desc',
      },
      limit: normalizeLimit(input.limit),
      requiresAuthenticatedOwner: true,
      allowsSignedReadUrl: false,
      allowsStorageAccess: false,
      allowsMutation: false,
    },
  };
}
