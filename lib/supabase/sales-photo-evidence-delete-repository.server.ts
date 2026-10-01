import 'server-only';

import { createClient } from '@supabase/supabase-js';

import {
  getAppApiSupabasePublicConfig,
  type AppApiServerEnv,
} from '@/lib/api/server/auth';

const MIN_SECRET_KEY_LENGTH = 32;
const MAX_SECRET_KEY_LENGTH = 1_024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREPARE_DELETE_RPC = 'bff_prepare_sale_photo_evidence_delete';
const FINALIZE_DELETE_RPC = 'bff_finalize_sale_photo_evidence_delete';

type DeleteRpcName = typeof PREPARE_DELETE_RPC | typeof FINALIZE_DELETE_RPC;

type DeleteRpcClient = {
  rpc(name: DeleteRpcName, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: unknown | null;
  }>;
};

type DeleteClientOptions = {
  auth: {
    persistSession: false;
    autoRefreshToken: false;
    detectSessionInUrl: false;
  };
};

export type SalesPhotoEvidenceDeletePreparedRow = {
  id: string;
  ownerId: string;
  marketId: string;
  saleId: string;
  status: 'uploaded';
  imageObjectKey: string;
  thumbnailObjectKey: string;
  deletedAt: string | null;
};

export type SalesPhotoEvidenceDeleteRepository = {
  prepareDeletion(evidenceId: string): Promise<SalesPhotoEvidenceDeletePreparedRow>;
  finalizeDeletion(row: SalesPhotoEvidenceDeletePreparedRow): Promise<void>;
};

export type CreateSalesPhotoEvidenceDeleteRepositoryOptions = {
  env?: AppApiServerEnv;
  createMutationClient?: (
    url: string,
    secretKey: string,
    options: DeleteClientOptions
  ) => DeleteRpcClient;
};

function getServerConfig(env: AppApiServerEnv): { url: string; secretKey: string } | null {
  const publicConfig = getAppApiSupabasePublicConfig(env);
  const secretKey = env.SUPABASE_SECRET_KEY;
  if (!publicConfig || !secretKey || secretKey !== secretKey.trim()) return null;
  if (
    secretKey.length < MIN_SECRET_KEY_LENGTH
    || secretKey.length > MAX_SECRET_KEY_LENGTH
    || !secretKey.startsWith('sb_secret_')
    || /\s/.test(secretKey)
  ) {
    return null;
  }
  return { url: publicConfig.url, secretKey };
}

function defaultCreateMutationClient(
  url: string,
  secretKey: string,
  options: DeleteClientOptions
): DeleteRpcClient {
  return createClient(url, secretKey, options) as unknown as DeleteRpcClient;
}

function getSingleRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data) && data.length !== 1) return null;
  const value = Array.isArray(data) ? data[0] : data;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function mapPreparedRow(data: unknown, evidenceId: string): SalesPhotoEvidenceDeletePreparedRow {
  const row = getSingleRow(data);
  if (
    !row
    || row.id !== evidenceId
    || typeof row.owner_id !== 'string'
    || typeof row.market_id !== 'string'
    || typeof row.sale_id !== 'string'
    || row.status !== 'uploaded'
    || typeof row.r2_object_key !== 'string'
    || typeof row.r2_thumbnail_key !== 'string'
    || (row.deleted_at !== null && typeof row.deleted_at !== 'string')
  ) {
    throw new Error('Sales photo evidence delete RPC returned an invalid row.');
  }

  return {
    id: evidenceId,
    ownerId: row.owner_id,
    marketId: row.market_id,
    saleId: row.sale_id,
    status: 'uploaded',
    imageObjectKey: row.r2_object_key,
    thumbnailObjectKey: row.r2_thumbnail_key,
    deletedAt: row.deleted_at as string | null,
  };
}

export function createSalesPhotoEvidenceDeleteRepository(
  actorId: string,
  options: CreateSalesPhotoEvidenceDeleteRepositoryOptions = {}
): SalesPhotoEvidenceDeleteRepository | null {
  const normalizedActorId = actorId.trim();
  const config = getServerConfig(options.env ?? process.env);
  if (!UUID_PATTERN.test(normalizedActorId) || !config) return null;

  let client: DeleteRpcClient;
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

  async function runRpc(name: DeleteRpcName, args: Record<string, unknown>): Promise<unknown> {
    const result = await client.rpc(name, args);
    if (result.error) throw new Error('Sales photo evidence delete RPC failed.');
    return result.data;
  }

  return {
    async prepareDeletion(evidenceId) {
      if (!UUID_PATTERN.test(evidenceId)) {
        throw new Error('Sales photo evidence id is invalid.');
      }
      const data = await runRpc(PREPARE_DELETE_RPC, {
        p_actor_id: normalizedActorId,
        p_evidence_id: evidenceId,
      });
      return mapPreparedRow(data, evidenceId);
    },

    async finalizeDeletion(row) {
      const data = await runRpc(FINALIZE_DELETE_RPC, {
        p_actor_id: normalizedActorId,
        p_evidence_id: row.id,
        p_expected_image_object_key: row.imageObjectKey,
        p_expected_thumbnail_object_key: row.thumbnailObjectKey,
      });
      const finalized = getSingleRow(data);
      if (
        !finalized
        || finalized.id !== row.id
        || finalized.owner_id !== row.ownerId
        || finalized.market_id !== row.marketId
        || finalized.sale_id !== row.saleId
        || typeof finalized.deleted_at !== 'string'
      ) {
        throw new Error('Sales photo evidence delete finalize RPC returned an invalid row.');
      }
    },
  };
}

