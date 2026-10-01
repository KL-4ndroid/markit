import 'server-only';

import { createClient } from '@supabase/supabase-js';

import {
  getAppApiSupabasePublicConfig,
  type AppApiServerEnv,
} from '@/lib/api/server/auth';
import type {
  AccountCapabilityLookupResult,
  AccountCapabilityRepository,
  SubscriptionAccountRecord,
} from '@/lib/subscription/account-capability-server';

const MIN_SECRET_KEY_LENGTH = 24;
const MAX_SECRET_KEY_LENGTH = 512;

type CapabilityRpcClient = {
  rpc(name: 'read_subscription_account_for_actor', args: {
    p_actor_id: string;
    p_owner_id: string;
  }): Promise<{ data: unknown; error: unknown | null }>;
};

type CapabilityClientOptions = {
  auth: {
    persistSession: false;
    autoRefreshToken: false;
    detectSessionInUrl: false;
  };
};

export type CreateAccountCapabilityRepositoryOptions = {
  env?: AppApiServerEnv;
  createCapabilityClient?: (
    url: string,
    secretKey: string,
    options: CapabilityClientOptions,
  ) => CapabilityRpcClient;
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

function defaultCreateCapabilityClient(
  url: string,
  secretKey: string,
  options: CapabilityClientOptions,
): CapabilityRpcClient {
  return createClient(url, secretKey, options) as unknown as CapabilityRpcClient;
}

function getSingleRow(data: unknown): Record<string, unknown> | null {
  if (!Array.isArray(data) || data.length !== 1) return null;
  const value = data[0];
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function mapLookupResult(data: unknown): AccountCapabilityLookupResult {
  if (Array.isArray(data) && data.length === 0) return { access: 'forbidden' };

  const row = getSingleRow(data);
  if (!row || row.access_allowed !== true || typeof row.owner_id !== 'string') {
    throw new Error('account_capability_lookup_invalid');
  }
  if (row.account_exists === false) {
    return { access: 'allowed', account: null };
  }
  if (row.account_exists !== true) throw new Error('account_capability_lookup_invalid');

  const account: SubscriptionAccountRecord = {
    ownerId: row.owner_id,
    planCode: row.plan_code,
    planSource: row.plan_source,
    billingStatus: row.billing_status,
    entitlementStatus: row.entitlement_status,
    entitlementEndsAt: row.entitlement_ends_at,
    updatedAt: row.updated_at,
  };
  return { access: 'allowed', account };
}

export function createAccountCapabilityRepository(
  options: CreateAccountCapabilityRepositoryOptions = {},
): AccountCapabilityRepository | null {
  const config = getServerConfig(options.env ?? process.env);
  if (!config) return null;

  const client = (options.createCapabilityClient ?? defaultCreateCapabilityClient)(
    config.url,
    config.secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  return {
    async readForActor(input): Promise<AccountCapabilityLookupResult> {
      const { data, error } = await client.rpc('read_subscription_account_for_actor', {
        p_actor_id: input.actorId,
        p_owner_id: input.ownerId,
      });
      if (error) throw new Error('account_capability_lookup_failed');
      return mapLookupResult(data);
    },
  };
}
