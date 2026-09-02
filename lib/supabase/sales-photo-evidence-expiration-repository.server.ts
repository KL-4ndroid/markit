import 'server-only';

import { createClient } from '@supabase/supabase-js';

import {
  getAppApiSupabasePublicConfig,
  type AppApiServerEnv,
} from '@/lib/api/server/auth';

const MIN_SECRET_KEY_LENGTH = 32;
const MAX_SECRET_KEY_LENGTH = 1_024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIST_EXPIRED_RPC = 'bff_list_expired_sale_photo_evidence';
const FINALIZE_EXPIRATION_RPC = 'bff_finalize_sale_photo_evidence_expiration';

type ExpirationRpcName = typeof LIST_EXPIRED_RPC | typeof FINALIZE_EXPIRATION_RPC;

type ExpirationRpcClient = {
  rpc(name: ExpirationRpcName, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: unknown | null;
  }>;
};

type ExpirationClientOptions = {
  auth: {
    persistSession: false;
    autoRefreshToken: false;
    detectSessionInUrl: false;
  };
};

export type SalesPhotoEvidenceExpirationCandidate = {
  id: string;
  ownerId: string;
  marketId: string;
  saleId: string;
  imageObjectKey: string;
  thumbnailObjectKey: string;
  expiresAt: string;
};

export type SalesPhotoEvidenceExpirationRepository = {
  listExpired(limit: number): Promise<readonly SalesPhotoEvidenceExpirationCandidate[]>;
  finalizeExpiration(candidate: SalesPhotoEvidenceExpirationCandidate): Promise<void>;
};

export type CreateSalesPhotoEvidenceExpirationRepositoryOptions = {
  env?: AppApiServerEnv;
  createMutationClient?: (
    url: string,
    secretKey: string,
    options: ExpirationClientOptions
  ) => ExpirationRpcClient;
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
  options: ExpirationClientOptions
): ExpirationRpcClient {
  return createClient(url, secretKey, options) as unknown as ExpirationRpcClient;
}

function getSingleRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data) && data.length !== 1) return null;
  const value = Array.isArray(data) ? data[0] : data;
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function mapCandidate(value: unknown): SalesPhotoEvidenceExpirationCandidate {
  const row = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
  if (
    !row
    || typeof row.id !== 'string'
    || !UUID_PATTERN.test(row.id)
    || typeof row.owner_id !== 'string'
    || !UUID_PATTERN.test(row.owner_id)
    || typeof row.market_id !== 'string'
    || !UUID_PATTERN.test(row.market_id)
    || typeof row.sale_id !== 'string'
    || !UUID_PATTERN.test(row.sale_id)
    || typeof row.r2_object_key !== 'string'
    || typeof row.r2_thumbnail_key !== 'string'
    || typeof row.expires_at !== 'string'
    || !Number.isFinite(new Date(row.expires_at).getTime())
  ) {
    throw new Error('Sales photo evidence expiration RPC returned an invalid row.');
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    marketId: row.market_id,
    saleId: row.sale_id,
    imageObjectKey: row.r2_object_key,
    thumbnailObjectKey: row.r2_thumbnail_key,
    expiresAt: row.expires_at,
  };
}

export function createSalesPhotoEvidenceExpirationRepository(
  options: CreateSalesPhotoEvidenceExpirationRepositoryOptions = {}
): SalesPhotoEvidenceExpirationRepository | null {
  const config = getServerConfig(options.env ?? process.env);
  if (!config) return null;

  let client: ExpirationRpcClient;
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

  async function runRpc(name: ExpirationRpcName, args: Record<string, unknown>): Promise<unknown> {
    const result = await client.rpc(name, args);
    if (result.error) throw new Error('Sales photo evidence expiration RPC failed.');
    return result.data;
  }

  return {
    async listExpired(limit) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        throw new Error('Sales photo evidence expiration limit is invalid.');
      }
      const data = await runRpc(LIST_EXPIRED_RPC, { p_limit: limit });
      if (!Array.isArray(data)) {
        throw new Error('Sales photo evidence expiration list RPC returned invalid data.');
      }
      return data.map(mapCandidate);
    },

    async finalizeExpiration(candidate) {
      const data = await runRpc(FINALIZE_EXPIRATION_RPC, {
        p_evidence_id: candidate.id,
        p_expected_image_object_key: candidate.imageObjectKey,
        p_expected_thumbnail_object_key: candidate.thumbnailObjectKey,
      });
      const row = getSingleRow(data);
      if (
        !row
        || row.id !== candidate.id
        || row.status !== 'expired'
        || row.r2_object_key !== null
        || row.r2_thumbnail_key !== null
      ) {
        throw new Error('Sales photo evidence expiration finalize RPC returned invalid data.');
      }
    },
  };
}
