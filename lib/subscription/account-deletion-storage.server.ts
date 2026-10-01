import { createClient } from '@supabase/supabase-js';

import {
  getAppApiSupabasePublicConfig,
  type AppApiServerEnv,
} from '@/lib/api/server/auth';
import type { AccountDeletionRouteRepository } from '@/app/api/account-deletion/route';
import {
  ACCOUNT_DELETION_PREFLIGHT_RESOLUTIONS,
  ACCOUNT_DELETION_REQUEST_STATUSES,
  ACCOUNT_DELETION_STEP_CODES,
  type AccountDeletionStepCode,
} from './account-deletion-contract';
import type {
  AccountDeletionSagaRepository,
  AccountDeletionSagaSnapshot,
} from './account-deletion-saga.server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SHA256_HEX = /^[0-9a-f]{64}$/u;
const SAFE_CODE = /^[a-z0-9_]{1,64}$/u;
const LEASE_TOKEN = /^[0-9a-f-]{36}$/iu;

const RPC_NAMES = [
  'bff_read_account_deletion_request',
  'bff_create_account_deletion_request',
  'bff_claim_account_deletion_lease',
  'bff_record_account_deletion_step',
  'bff_finalize_account_deletion',
  'bff_release_account_deletion_lease',
] as const;
type AccountDeletionRpcName = typeof RPC_NAMES[number];

type RpcClient = {
  rpc(name: AccountDeletionRpcName, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: unknown | null;
  }>;
};

type ClientOptions = { auth: {
  persistSession: false;
  autoRefreshToken: false;
  detectSessionInUrl: false;
} };

export type AccountDeletionStorageRepository = AccountDeletionRouteRepository
  & AccountDeletionSagaRepository;

export type CreateAccountDeletionStorageRepositoryOptions = {
  env?: AppApiServerEnv;
  createMutationClient?: (url: string, secretKey: string, options: ClientOptions) => RpcClient;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getSingleRow(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value) && value.length !== 1) return null;
  const row = Array.isArray(value) ? value[0] : value;
  return isRecord(row) ? row : null;
}

function getConfig(env: AppApiServerEnv): { url: string; secretKey: string } | null {
  const publicConfig = getAppApiSupabasePublicConfig(env);
  const secretKey = env.SUPABASE_SECRET_KEY;
  if (!publicConfig || !secretKey || secretKey !== secretKey.trim()) return null;
  if (secretKey.length < 32 || secretKey.length > 1_024 || !secretKey.startsWith('sb_secret_')) {
    return null;
  }
  return { url: publicConfig.url, secretKey };
}

function defaultCreateMutationClient(
  url: string,
  secretKey: string,
  options: ClientOptions,
): RpcClient {
  return createClient(url, secretKey, options) as unknown as RpcClient;
}

function mapSafeStatus(value: unknown): unknown {
  const row = getSingleRow(value);
  if (!row) return null;
  return {
    requestId: row.request_id,
    status: row.status,
    safeErrorCode: row.safe_error_code,
    requestedAt: row.requested_at,
    updatedAt: row.updated_at,
    nextActionAfter: row.next_action_after,
  };
}

function mapSnapshot(value: unknown): AccountDeletionSagaSnapshot | null {
  if (!isRecord(value) || !UUID_PATTERN.test(String(value.requestId))) return null;
  if (value.accountKind !== 'owner' && value.accountKind !== 'staff') return null;
  if (!ACCOUNT_DELETION_REQUEST_STATUSES.includes(value.requestStatus as never)) return null;
  if (!ACCOUNT_DELETION_PREFLIGHT_RESOLUTIONS.includes(value.preflightResolution as never)) return null;
  if (value.identityConfirmed !== true || !Array.isArray(value.steps)) return null;

  const steps = value.steps.map(step => {
    if (!isRecord(step) || !ACCOUNT_DELETION_STEP_CODES.includes(step.code as never)) return null;
    if (!['pending', 'processing', 'failed_retryable', 'manual_review', 'completed'].includes(String(step.status))) {
      return null;
    }
    if (!Number.isSafeInteger(step.affectedCount) || Number(step.affectedCount) < 0) return null;
    if (step.evidenceHash !== null && !SHA256_HEX.test(String(step.evidenceHash))) return null;
    return {
      code: step.code as AccountDeletionStepCode,
      status: step.status as 'pending' | 'processing' | 'failed_retryable' | 'manual_review' | 'completed',
      affectedCount: Number(step.affectedCount),
      evidenceHash: step.evidenceHash as string | null,
    };
  });
  if (steps.some(step => step === null)) return null;

  return {
    requestId: String(value.requestId),
    accountKind: value.accountKind,
    requestStatus: value.requestStatus as AccountDeletionSagaSnapshot['requestStatus'],
    identityConfirmed: true,
    preflightResolution: value.preflightResolution as AccountDeletionSagaSnapshot['preflightResolution'],
    steps: steps as AccountDeletionSagaSnapshot['steps'],
  };
}

export function createAccountDeletionStorageRepository(
  options: CreateAccountDeletionStorageRepositoryOptions = {},
): AccountDeletionStorageRepository | null {
  const config = getConfig(options.env ?? process.env);
  if (!config) return null;

  let client: RpcClient;
  try {
    client = (options.createMutationClient ?? defaultCreateMutationClient)(
      config.url,
      config.secretKey,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
  } catch {
    return null;
  }

  async function rpc(name: AccountDeletionRpcName, args: Record<string, unknown>): Promise<unknown> {
    const result = await client.rpc(name, args);
    if (result.error) throw new Error('Account deletion RPC failed.');
    return result.data;
  }

  return {
    async readCurrentForActor(actorId) {
      if (!UUID_PATTERN.test(actorId)) throw new Error('Account deletion actor is invalid.');
      return mapSafeStatus(await rpc('bff_read_account_deletion_request', { p_actor_id: actorId }));
    },

    async createForActor(input) {
      if (!UUID_PATTERN.test(input.actorId) || !SHA256_HEX.test(input.subjectRefHash)
        || !SHA256_HEX.test(input.idempotencyHash)) {
        throw new Error('Account deletion request is invalid.');
      }
      return mapSafeStatus(await rpc('bff_create_account_deletion_request', {
        p_actor_id: input.actorId,
        p_subject_ref_hash: input.subjectRefHash,
        p_idempotency_hash: input.idempotencyHash,
        p_policy_revision: input.policyRevision,
        p_preflight_resolution: input.preflightResolution,
      }));
    },

    async claimLease(input) {
      if (!UUID_PATTERN.test(input.requestId)) throw new Error('Account deletion request id is invalid.');
      const row = await rpc('bff_claim_account_deletion_lease', {
        p_request_id: input.requestId,
        p_worker_id: input.workerId,
        p_now: new Date(input.nowMs).toISOString(),
        p_lease_duration_seconds: Math.floor(input.leaseDurationMs / 1000),
      });
      if (!isRecord(row) || typeof row.claimed !== 'boolean') throw new Error('Invalid lease response.');
      if (!row.claimed) return { claimed: false, leaseToken: null, snapshot: null };
      const snapshot = mapSnapshot(row.snapshot);
      if (!LEASE_TOKEN.test(String(row.leaseToken)) || !snapshot) throw new Error('Invalid lease response.');
      return { claimed: true, leaseToken: String(row.leaseToken), snapshot };
    },

    async recordStepResult(input) {
      if (!UUID_PATTERN.test(input.requestId) || !LEASE_TOKEN.test(input.leaseToken)) {
        throw new Error('Account deletion lease is invalid.');
      }
      const result = input.result;
      await rpc('bff_record_account_deletion_step', {
        p_request_id: input.requestId,
        p_lease_token: input.leaseToken,
        p_step_code: input.stepCode,
        p_outcome: result.outcome,
        p_affected_count: result.outcome === 'completed' ? result.affectedCount : null,
        p_evidence_hash: result.outcome === 'completed' ? result.evidenceHash : null,
        p_safe_error_code: result.outcome === 'completed' ? null : result.safeErrorCode,
      });
    },

    async finalizeCompletion(input) {
      if (!UUID_PATTERN.test(input.requestId) || !LEASE_TOKEN.test(input.leaseToken)
        || input.requiredSteps.some(step => !ACCOUNT_DELETION_STEP_CODES.includes(step))) {
        throw new Error('Account deletion completion input is invalid.');
      }
      const value = await rpc('bff_finalize_account_deletion', {
        p_request_id: input.requestId,
        p_lease_token: input.leaseToken,
      });
      if (value !== 'completed' && value !== 'incomplete' && value !== 'lease_lost') {
        throw new Error('Invalid completion response.');
      }
      return value;
    },

    async releaseLease(input) {
      if (!UUID_PATTERN.test(input.requestId) || !LEASE_TOKEN.test(input.leaseToken)) return;
      await rpc('bff_release_account_deletion_lease', {
        p_request_id: input.requestId,
        p_lease_token: input.leaseToken,
      });
    },
  };
}
