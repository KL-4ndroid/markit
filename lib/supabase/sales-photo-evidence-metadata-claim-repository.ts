import type {
  SalesPhotoEvidenceCreateUploadingClaimInput,
  SalesPhotoEvidenceMarkUploadingClaimInput,
  SalesPhotoEvidenceMetadataClaimRepository,
  SalesPhotoEvidenceMetadataClaimedRow,
} from '@/lib/sales/photo-evidence-metadata-claim-adapter';
import type {
  SalesPhotoEvidenceClaimExistingRow,
  SalesPhotoEvidenceClaimSaleEvent,
} from '@/lib/sales/photo-evidence-metadata-claim';
import type { SalesPhotoEvidenceStatus } from '@/lib/sales/photo-evidence-model';

type SupabaseResult<T> = {
  data: T | null;
  error: unknown | null;
};

type SupabaseReadQuery<T> = {
  eq(column: string, value: string): SupabaseReadQuery<T>;
  is(column: string, value: null): SupabaseReadQuery<T>;
  maybeSingle(): Promise<SupabaseResult<T>>;
};

type SupabaseTableClient = {
  select(columns: string): SupabaseReadQuery<unknown>;
};

export type SalesPhotoEvidenceMetadataClaimSupabaseClient = {
  from(table: 'events' | 'markets' | 'sale_photo_evidence' | 'staff_relationships'): SupabaseTableClient;
};

type SupabaseSaleEventRow = {
  id: string;
  type: string;
  market_id: string;
  timestamp?: string | null;
  created_at?: string | null;
  markets?: { owner_id?: string | null } | Array<{ owner_id?: string | null }> | null;
};

type SupabaseEvidenceRow = {
  id: string;
  owner_id: string;
  market_id: string;
  sale_id: string;
  captured_by_staff_id: string | null;
  status: SalesPhotoEvidenceStatus;
  deleted_at: string | null;
};

export type SalesPhotoEvidenceFinalizeUploadedMetadataInput = {
  evidenceId: string;
  ownerId: string;
  marketId: string;
  saleId: string;
  imageObjectKey: string;
  thumbnailObjectKey: string;
  mimeType: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  capturedAt: string;
  uploadedAt: string;
  expiresAt: string;
};

export type SalesPhotoEvidenceMarkUploadFailedMetadataInput = {
  evidenceId: string;
  ownerId: string;
  marketId: string;
  saleId: string;
  reason: string;
};

export type SalesPhotoEvidenceUploadMetadataRepository = SalesPhotoEvidenceMetadataClaimRepository & {
  finalizeEvidenceUploaded(input: SalesPhotoEvidenceFinalizeUploadedMetadataInput): Promise<SalesPhotoEvidenceMetadataClaimedRow>;
  markEvidenceUploadFailed(input: SalesPhotoEvidenceMarkUploadFailedMetadataInput): Promise<SalesPhotoEvidenceMetadataClaimedRow>;
};

export type SalesPhotoEvidenceServerMutationRepository = Pick<
  SalesPhotoEvidenceUploadMetadataRepository,
  | 'createEvidenceUploadingClaim'
  | 'markEvidenceUploading'
  | 'finalizeEvidenceUploaded'
  | 'markEvidenceUploadFailed'
>;

type SupabaseStaffRelationshipRow = {
  owner_id: string;
};

const EVIDENCE_SELECT_COLUMNS = [
  'id',
  'owner_id',
  'market_id',
  'sale_id',
  'captured_by_staff_id',
  'status',
  'deleted_at',
].join(',');

function throwIfSupabaseError(error: unknown, message: string): void {
  if (error) {
    throw new Error(message);
  }
}

function getJoinedOwnerId(row: SupabaseSaleEventRow): string | null {
  const joinedMarket = Array.isArray(row.markets) ? row.markets[0] : row.markets;
  return joinedMarket?.owner_id ?? null;
}

function mapSaleEventRow(row: SupabaseSaleEventRow): SalesPhotoEvidenceClaimSaleEvent | null {
  const ownerId = getJoinedOwnerId(row);
  if (!ownerId) return null;

  return {
    id: row.id,
    type: row.type,
    ownerId,
    marketId: row.market_id,
    completedAt: row.timestamp ?? row.created_at ?? new Date(0).toISOString(),
  };
}

function mapEvidenceRow(row: SupabaseEvidenceRow): SalesPhotoEvidenceClaimExistingRow {
  return {
    id: row.id,
    ownerId: row.owner_id,
    marketId: row.market_id,
    saleId: row.sale_id,
    capturedByStaffId: row.captured_by_staff_id,
    status: row.status,
    deletedAt: row.deleted_at,
  };
}

export function createSalesPhotoEvidenceMetadataClaimSupabaseRepository(
  client: SalesPhotoEvidenceMetadataClaimSupabaseClient,
  mutations: SalesPhotoEvidenceServerMutationRepository
): SalesPhotoEvidenceUploadMetadataRepository {
  return {
    async getSaleEventForEvidenceClaim(input) {
      const { data, error } = await client
        .from('events')
        .select('id,type,market_id,timestamp,markets!inner(owner_id)')
        .eq('id', input.saleEventId)
        .eq('market_id', input.marketId)
        .eq('type', 'deal_closed')
        .maybeSingle();

      if (!error && data) {
        const saleEvent = mapSaleEventRow(data as SupabaseSaleEventRow);
        if (!saleEvent || saleEvent.ownerId !== input.ownerId) return null;
        return saleEvent;
      }

      // Migration 059 intentionally revokes the legacy authenticated helper.
      // Staff-scoped RLS may hide the event from this preliminary user-client
      // read, so defer the authoritative sale/owner/actor validation to the
      // server-only claim RPC instead of calling the revoked helper here.
      if (input.saleCompletedAt) {
        return {
          id: input.saleEventId,
          type: 'deal_closed',
          ownerId: input.ownerId,
          marketId: input.marketId,
          completedAt: input.saleCompletedAt,
        };
      }

      throwIfSupabaseError(error, 'Sales photo evidence sale event lookup failed.');
      return null;
    },

    async getActiveEvidenceForSale(input) {
      const { data, error } = await client
        .from('sale_photo_evidence')
        .select(EVIDENCE_SELECT_COLUMNS)
        .eq('owner_id', input.ownerId)
        .eq('market_id', input.marketId)
        .eq('sale_id', input.saleEventId)
        .is('deleted_at', null)
        .maybeSingle();

      throwIfSupabaseError(error, 'Sales photo evidence active row lookup failed.');
      return data ? mapEvidenceRow(data as SupabaseEvidenceRow) : null;
    },

    async isStaffRelationshipActive(input) {
      const { data, error } = await client
        .from('staff_relationships')
        .select('owner_id')
        .eq('owner_id', input.ownerId)
        .eq('staff_id', input.staffId)
        .eq('status', 'active')
        .maybeSingle();

      throwIfSupabaseError(error, 'Sales photo evidence staff relationship lookup failed.');
      return Boolean((data as SupabaseStaffRelationshipRow | null)?.owner_id);
    },

    async createEvidenceUploadingClaim(input: SalesPhotoEvidenceCreateUploadingClaimInput) {
      return mutations.createEvidenceUploadingClaim(input);
    },

    async markEvidenceUploading(input: SalesPhotoEvidenceMarkUploadingClaimInput) {
      return mutations.markEvidenceUploading(input);
    },

    async finalizeEvidenceUploaded(input: SalesPhotoEvidenceFinalizeUploadedMetadataInput) {
      return mutations.finalizeEvidenceUploaded(input);
    },

    async markEvidenceUploadFailed(input: SalesPhotoEvidenceMarkUploadFailedMetadataInput) {
      return mutations.markEvidenceUploadFailed(input);
    },
  };
}
