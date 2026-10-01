import { buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan } from '@/lib/sales/photo-evidence-owner-album-read-source';
import type {
  BuildSalesPhotoEvidenceOwnerAlbumReadSourceInput,
  SalesPhotoEvidenceOwnerAlbumReadSourcePlan,
  SalesPhotoEvidenceOwnerAlbumReadSourceDecision,
} from '@/lib/sales/photo-evidence-owner-album-read-source';
import type { SalesPhotoEvidenceAlbumSourceRow } from '@/lib/sales/photo-evidence-owner-album-read-model';
import { supabase } from './client';

export type SalesPhotoEvidenceOwnerAlbumMetadataReadRejectReason = 'owner_only' | 'invalid_scope';

export type SalesPhotoEvidenceOwnerAlbumSupabaseQuery = {
  eq(column: string, value: string): SalesPhotoEvidenceOwnerAlbumSupabaseQuery;
  is(column: string, value: null): SalesPhotoEvidenceOwnerAlbumSupabaseQuery;
  order(
    column: string,
    options: { ascending: boolean }
  ): SalesPhotoEvidenceOwnerAlbumSupabaseQuery;
  limit(limit: number): Promise<{
    data: SalesPhotoEvidenceAlbumSourceRow[] | null;
    error: unknown | null;
  }>;
};

export type SalesPhotoEvidenceOwnerAlbumSupabaseClient = {
  from(table: 'sale_photo_evidence'): {
    select(columns: string): SalesPhotoEvidenceOwnerAlbumSupabaseQuery;
  };
};

export type SalesPhotoEvidenceOwnerAlbumReaderDeps = {
  client?: SalesPhotoEvidenceOwnerAlbumSupabaseClient;
};

export type SalesPhotoEvidenceOwnerAlbumMetadataReadResult =
  | {
      action: 'rows_loaded';
      reason: 'owner_album_metadata_loaded';
      plan: SalesPhotoEvidenceOwnerAlbumReadSourcePlan;
      rows: SalesPhotoEvidenceAlbumSourceRow[];
    }
  | {
      action: 'read_rejected';
      reason: SalesPhotoEvidenceOwnerAlbumMetadataReadRejectReason;
      message: string;
    }
  | {
      action: 'read_failed';
      reason: 'supabase_error';
      message: string;
      error: unknown;
    };

function getClient(deps: SalesPhotoEvidenceOwnerAlbumReaderDeps): SalesPhotoEvidenceOwnerAlbumSupabaseClient {
  return deps.client ?? (supabase as unknown as SalesPhotoEvidenceOwnerAlbumSupabaseClient);
}

export async function listOwnerSalesPhotoEvidenceAlbumMetadataRows(
  input: BuildSalesPhotoEvidenceOwnerAlbumReadSourceInput,
  deps: SalesPhotoEvidenceOwnerAlbumReaderDeps = {}
): Promise<SalesPhotoEvidenceOwnerAlbumMetadataReadResult> {
  const sourceDecision = buildSalesPhotoEvidenceOwnerAlbumReadSourcePlan(input);

  if (sourceDecision.action !== 'allow_owner_album_read_source') {
    return {
      action: 'read_rejected',
      reason: sourceDecision.reason,
      message: sourceDecision.message,
    };
  }

  const { plan } = sourceDecision;
  let query = getClient(deps)
    .from(plan.table)
    .select(plan.selectColumns.join(','));

  for (const filter of plan.filters) {
    if (filter.operator === 'eq') {
      query = query.eq(filter.column, filter.value);
    } else {
      query = query.is(filter.column, filter.value);
    }
  }

  const { data, error } = await query
    .order(plan.orderBy.column, { ascending: false })
    .limit(plan.limit);

  if (error) {
    return {
      action: 'read_failed',
      reason: 'supabase_error',
      message: 'Sales photo evidence owner album metadata read failed.',
      error,
    };
  }

  return {
    action: 'rows_loaded',
    reason: 'owner_album_metadata_loaded',
    plan,
    rows: data ?? [],
  };
}
