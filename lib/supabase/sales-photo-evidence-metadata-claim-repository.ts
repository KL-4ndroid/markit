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

type SupabaseWriteQuery<T> = {
  eq(column: string, value: string): SupabaseWriteQuery<T>;
  is(column: string, value: null): SupabaseWriteQuery<T>;
  select(columns: string): SupabaseWriteQuery<T>;
  single(): Promise<SupabaseResult<T>>;
};

type SupabaseTableClient = {
  select(columns: string): SupabaseReadQuery<unknown>;
  insert(values: Record<string, unknown>): SupabaseWriteQuery<unknown>;
  update(values: Record<string, unknown>): SupabaseWriteQuery<unknown>;
};

export type SalesPhotoEvidenceMetadataClaimSupabaseClient = {
  from(table: 'events' | 'markets' | 'sale_photo_evidence' | 'staff_relationships'): SupabaseTableClient;
  rpc?(
    fn: 'is_sale_photo_evidence_sale_event',
    args: { p_sale_id: string; p_market_id: string; p_owner_id: string }
  ): Promise<SupabaseResult<boolean>>;
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

function mapClaimedRow(row: SupabaseEvidenceRow): SalesPhotoEvidenceMetadataClaimedRow {
  return {
    id: row.id,
    ownerId: row.owner_id,
    marketId: row.market_id,
    saleId: row.sale_id,
    capturedByStaffId: row.captured_by_staff_id,
    status: row.status,
  };
}

function requireRow<T>(row: T | null, message: string): T {
  if (!row) {
    throw new Error(message);
  }
  return row;
}

export function createSalesPhotoEvidenceMetadataClaimSupabaseRepository(
  client: SalesPhotoEvidenceMetadataClaimSupabaseClient
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

      if (!client.rpc) {
        throwIfSupabaseError(error, 'Sales photo evidence sale event lookup failed.');
        return null;
      }

      const validation = await client.rpc('is_sale_photo_evidence_sale_event', {
        p_sale_id: input.saleEventId,
        p_market_id: input.marketId,
        p_owner_id: input.ownerId,
      });
      throwIfSupabaseError(validation.error, 'Sales photo evidence sale event validation failed.');
      if (validation.data !== true) return null;

      return {
        id: input.saleEventId,
        type: 'deal_closed',
        ownerId: input.ownerId,
        marketId: input.marketId,
        completedAt: input.saleCompletedAt ?? new Date(0).toISOString(),
      };
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
      const { data, error } = await client
        .from('sale_photo_evidence')
        .insert({
          owner_id: input.ownerId,
          market_id: input.marketId,
          sale_id: input.saleId,
          captured_by_staff_id: input.capturedByStaffId,
          status: 'uploading',
          sale_completed_at: input.saleCompletedAt,
          captured_at: input.capturedAt,
        })
        .select(EVIDENCE_SELECT_COLUMNS)
        .single();

      throwIfSupabaseError(error, 'Sales photo evidence metadata claim insert failed.');
      return mapClaimedRow(requireRow(data as SupabaseEvidenceRow | null, 'Sales photo evidence metadata claim insert returned no row.'));
    },

    async markEvidenceUploading(input: SalesPhotoEvidenceMarkUploadingClaimInput) {
      const { data, error } = await client
        .from('sale_photo_evidence')
        .update({
          status: 'uploading',
          captured_at: input.capturedAt,
        })
        .eq('id', input.evidenceId)
        .eq('owner_id', input.ownerId)
        .eq('market_id', input.marketId)
        .eq('sale_id', input.saleId)
        .is('deleted_at', null)
        .select(EVIDENCE_SELECT_COLUMNS)
        .single();

      throwIfSupabaseError(error, 'Sales photo evidence metadata claim update failed.');
      return mapClaimedRow(requireRow(data as SupabaseEvidenceRow | null, 'Sales photo evidence metadata claim update returned no row.'));
    },

    async finalizeEvidenceUploaded(input: SalesPhotoEvidenceFinalizeUploadedMetadataInput) {
      const { data, error } = await client
        .from('sale_photo_evidence')
        .update({
          status: 'uploaded',
          r2_object_key: input.imageObjectKey,
          r2_thumbnail_key: input.thumbnailObjectKey,
          mime_type: input.mimeType,
          width: input.width,
          height: input.height,
          file_size_bytes: input.fileSizeBytes,
          captured_at: input.capturedAt,
          uploaded_at: input.uploadedAt,
          expires_at: input.expiresAt,
          failure_reason: null,
        })
        .eq('id', input.evidenceId)
        .eq('owner_id', input.ownerId)
        .eq('market_id', input.marketId)
        .eq('sale_id', input.saleId)
        .is('deleted_at', null)
        .select(EVIDENCE_SELECT_COLUMNS)
        .single();

      throwIfSupabaseError(error, 'Sales photo evidence metadata finalize failed.');
      return mapClaimedRow(requireRow(data as SupabaseEvidenceRow | null, 'Sales photo evidence metadata finalize returned no row.'));
    },

    async markEvidenceUploadFailed(input: SalesPhotoEvidenceMarkUploadFailedMetadataInput) {
      const { data, error } = await client
        .from('sale_photo_evidence')
        .update({
          status: 'upload_failed',
          failure_reason: input.reason,
        })
        .eq('id', input.evidenceId)
        .eq('owner_id', input.ownerId)
        .eq('market_id', input.marketId)
        .eq('sale_id', input.saleId)
        .is('deleted_at', null)
        .select(EVIDENCE_SELECT_COLUMNS)
        .single();

      throwIfSupabaseError(error, 'Sales photo evidence metadata failure update failed.');
      return mapClaimedRow(requireRow(data as SupabaseEvidenceRow | null, 'Sales photo evidence metadata failure update returned no row.'));
    },
  };
}
