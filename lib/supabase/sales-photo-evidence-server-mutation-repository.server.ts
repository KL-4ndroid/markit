import 'server-only';

import { createClient } from '@supabase/supabase-js';

import {
  getAppApiSupabasePublicConfig,
  type AppApiServerEnv,
} from '@/lib/api/server/auth';
import type {
  SalesPhotoEvidenceCreateUploadingClaimInput,
  SalesPhotoEvidenceMarkUploadingClaimInput,
  SalesPhotoEvidenceMetadataClaimedRow,
} from '@/lib/sales/photo-evidence-metadata-claim-adapter';
import type { SalesPhotoEvidenceStatus } from '@/lib/sales/photo-evidence-model';
import type {
  SalesPhotoEvidenceFinalizeUploadedMetadataInput,
  SalesPhotoEvidenceMarkUploadFailedMetadataInput,
  SalesPhotoEvidenceServerMutationRepository,
} from '@/lib/supabase/sales-photo-evidence-metadata-claim-repository';

const MIN_SECRET_KEY_LENGTH = 32;
const MAX_SECRET_KEY_LENGTH = 1_024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CLAIM_RPC = 'bff_claim_sale_photo_evidence_upload';
const FINALIZE_RPC = 'bff_finalize_sale_photo_evidence_upload';
const MARK_FAILED_RPC = 'bff_mark_sale_photo_evidence_upload_failed';

type MutationRpcName = typeof CLAIM_RPC | typeof FINALIZE_RPC | typeof MARK_FAILED_RPC;

type MutationRpcResult = {
  data: unknown;
  error: unknown | null;
};

type MutationRpcClient = {
  rpc(name: MutationRpcName, args: Record<string, unknown>): Promise<MutationRpcResult>;
};

type MutationClientOptions = {
  auth: {
    persistSession: false;
    autoRefreshToken: false;
    detectSessionInUrl: false;
  };
};

export type SalesPhotoEvidenceServerMutationClientFactory = (
  url: string,
  secretKey: string,
  options: MutationClientOptions
) => MutationRpcClient;

export type CreateSalesPhotoEvidenceServerMutationRepositoryOptions = {
  env?: AppApiServerEnv;
  createMutationClient?: SalesPhotoEvidenceServerMutationClientFactory;
};

type SupabaseEvidenceRpcRow = {
  id?: unknown;
  owner_id?: unknown;
  market_id?: unknown;
  sale_id?: unknown;
  captured_by_staff_id?: unknown;
  status?: unknown;
  upload_attempt_id?: unknown;
};

const VALID_STATUSES = new Set<SalesPhotoEvidenceStatus>([
  'not_required',
  'pending_capture',
  'capture_skipped',
  'captured_local',
  'uploading',
  'uploaded',
  'upload_failed',
  'expired',
  'waived_by_owner',
]);

function getServerMutationConfig(
  env: AppApiServerEnv
): { url: string; secretKey: string } | null {
  const publicConfig = getAppApiSupabasePublicConfig(env);
  const rawSecretKey = env.SUPABASE_SECRET_KEY;
  if (!publicConfig || !rawSecretKey || rawSecretKey !== rawSecretKey.trim()) return null;
  if (
    rawSecretKey.length < MIN_SECRET_KEY_LENGTH
    || rawSecretKey.length > MAX_SECRET_KEY_LENGTH
    || !rawSecretKey.startsWith('sb_secret_')
    || /\s/.test(rawSecretKey)
  ) {
    return null;
  }

  return {
    url: publicConfig.url,
    secretKey: rawSecretKey,
  };
}

export function isSalesPhotoEvidenceServerMutationConfiguredForEnv(
  env: AppApiServerEnv
): boolean {
  return getServerMutationConfig(env) !== null;
}

function defaultCreateMutationClient(
  url: string,
  secretKey: string,
  options: MutationClientOptions
): MutationRpcClient {
  return createClient(url, secretKey, options) as unknown as MutationRpcClient;
}

function getSingleRpcRow(data: unknown): SupabaseEvidenceRpcRow | null {
  if (Array.isArray(data) && data.length !== 1) return null;
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as SupabaseEvidenceRpcRow;
}

function mapClaimedRow(
  data: unknown,
  expectedAttemptId: string
): SalesPhotoEvidenceMetadataClaimedRow {
  const row = getSingleRpcRow(data);
  if (
    !row
    || typeof row.id !== 'string'
    || typeof row.owner_id !== 'string'
    || typeof row.market_id !== 'string'
    || typeof row.sale_id !== 'string'
    || (row.captured_by_staff_id !== null && typeof row.captured_by_staff_id !== 'string')
    || typeof row.status !== 'string'
    || !VALID_STATUSES.has(row.status as SalesPhotoEvidenceStatus)
    || row.upload_attempt_id !== expectedAttemptId
  ) {
    throw new Error('Sales photo evidence server mutation returned an invalid row.');
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    marketId: row.market_id,
    saleId: row.sale_id,
    capturedByStaffId: row.captured_by_staff_id,
    status: row.status as SalesPhotoEvidenceStatus,
  };
}

function assertRowScope(
  row: SalesPhotoEvidenceMetadataClaimedRow,
  input: { ownerId: string; marketId: string; saleId: string; evidenceId?: string }
): void {
  if (
    row.ownerId !== input.ownerId
    || row.marketId !== input.marketId
    || row.saleId !== input.saleId
    || (input.evidenceId !== undefined && row.id !== input.evidenceId)
  ) {
    throw new Error('Sales photo evidence server mutation returned an out-of-scope row.');
  }
}

export function createSalesPhotoEvidenceServerMutationRepository(
  actorId: string,
  attemptId: string,
  options: CreateSalesPhotoEvidenceServerMutationRepositoryOptions = {}
): SalesPhotoEvidenceServerMutationRepository | null {
  const normalizedActorId = actorId.trim();
  const normalizedAttemptId = attemptId.trim();
  const config = getServerMutationConfig(options.env ?? process.env);
  if (!normalizedActorId || !UUID_PATTERN.test(normalizedAttemptId) || !config) return null;

  let client: MutationRpcClient;
  try {
    client = (options.createMutationClient ?? defaultCreateMutationClient)(
      config.url,
      config.secretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
  } catch {
    return null;
  }

  async function runMutation(
    name: MutationRpcName,
    args: Record<string, unknown>,
    expected: {
      ownerId: string;
      marketId: string;
      saleId: string;
      evidenceId?: string;
      status: 'uploading' | 'uploaded' | 'upload_failed';
    }
  ): Promise<SalesPhotoEvidenceMetadataClaimedRow> {
    let result: MutationRpcResult;
    try {
      result = await client.rpc(name, args);
    } catch {
      throw new Error('Sales photo evidence server mutation is unavailable.');
    }

    if (result.error) {
      throw new Error('Sales photo evidence server mutation failed.');
    }

    const row = mapClaimedRow(result.data, normalizedAttemptId);
    assertRowScope(row, expected);
    if (row.status !== expected.status) {
      throw new Error('Sales photo evidence server mutation returned an unexpected status.');
    }
    return row;
  }

  async function claimUploading(
    input: SalesPhotoEvidenceCreateUploadingClaimInput | SalesPhotoEvidenceMarkUploadingClaimInput,
    expectedEvidenceId: string | null
  ): Promise<SalesPhotoEvidenceMetadataClaimedRow> {
    return runMutation(CLAIM_RPC, {
      p_actor_id: normalizedActorId,
      p_owner_id: input.ownerId,
      p_market_id: input.marketId,
      p_sale_id: input.saleId,
      p_expected_evidence_id: expectedEvidenceId,
      p_attempt_id: normalizedAttemptId,
      p_captured_at: input.capturedAt,
    }, {
      ownerId: input.ownerId,
      marketId: input.marketId,
      saleId: input.saleId,
      evidenceId: expectedEvidenceId ?? undefined,
      status: 'uploading',
    });
  }

  return {
    createEvidenceUploadingClaim(input) {
      return claimUploading(input, null);
    },

    markEvidenceUploading(input) {
      return claimUploading(input, input.evidenceId);
    },

    finalizeEvidenceUploaded(input: SalesPhotoEvidenceFinalizeUploadedMetadataInput) {
      return runMutation(FINALIZE_RPC, {
        p_actor_id: normalizedActorId,
        p_evidence_id: input.evidenceId,
        p_owner_id: input.ownerId,
        p_market_id: input.marketId,
        p_sale_id: input.saleId,
        p_attempt_id: normalizedAttemptId,
        p_image_object_key: input.imageObjectKey,
        p_thumbnail_object_key: input.thumbnailObjectKey,
        p_mime_type: input.mimeType,
        p_width: input.width,
        p_height: input.height,
        p_file_size_bytes: input.fileSizeBytes,
        p_captured_at: input.capturedAt,
        p_uploaded_at: input.uploadedAt,
        p_expires_at: input.expiresAt,
      }, {
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        evidenceId: input.evidenceId,
        status: 'uploaded',
      });
    },

    markEvidenceUploadFailed(input: SalesPhotoEvidenceMarkUploadFailedMetadataInput) {
      return runMutation(MARK_FAILED_RPC, {
        p_actor_id: normalizedActorId,
        p_evidence_id: input.evidenceId,
        p_owner_id: input.ownerId,
        p_market_id: input.marketId,
        p_sale_id: input.saleId,
        p_attempt_id: normalizedAttemptId,
        p_failure_reason: input.reason,
      }, {
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        evidenceId: input.evidenceId,
        status: 'upload_failed',
      });
    },
  };
}
