import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getServerConfig } from './account-capability-storage.server';
import { isAccountPlanCode, type AccountPlanCode } from './subscription-plans';
import type { SubscriptionSimulationState } from './subscription-simulation.server';
import { parseSubscriptionWriteDecision, type SubscriptionWriteDecision, type SubscriptionWriteFeature } from './write-access';

type RpcClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
const unavailable: SubscriptionWriteDecision = { enabled: true, allowed: false, reason: 'entitlement_unavailable' };

function serviceClient(): RpcClient | null {
  const config = getServerConfig(process.env);
  if (!config) return null;
  return createClient(config.url, config.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(4_000) }) },
  }) as unknown as RpcClient;
}

export function isCloudSubscriptionSimulationEnabled(): boolean {
  return process.env.SUBSCRIPTION_SIMULATION_CLOUD_ENABLED === '1';
}

export async function checkServerSubscriptionWrite(input: {
  actorId: string; ownerId: string; feature: SubscriptionWriteFeature;
}, options: { enabled?: boolean; client?: RpcClient | null } = {}): Promise<SubscriptionWriteDecision> {
  if (!(options.enabled ?? process.env.SUBSCRIPTION_WRITE_ENFORCEMENT_ENABLED === '1')) {
    return { enabled: false, allowed: true, reason: 'pilot_not_enabled' };
  }
  try {
    const client = options.client === undefined ? serviceClient() : options.client;
    if (!client) return unavailable;
    const result = await client.rpc('check_subscription_write_for_actor', {
      p_actor: input.actorId, p_owner: input.ownerId, p_feature: input.feature,
    });
    return result.error ? unavailable : parseSubscriptionWriteDecision(result.data) ?? unavailable;
  } catch { return unavailable; }
}

/** Called only after local-only route + verified actor checks. SQL also requires an allowlisted owner. */
export async function cloudSubscriptionTestSwitch(actorId: string, change?: {
  enabled: boolean; planCode?: AccountPlanCode;
}, client: RpcClient | null = serviceClient()): Promise<SubscriptionSimulationState> {
  if (!client) throw new Error('subscription_test_switch_unavailable');
  const result = await client.rpc(change ? 'set_subscription_test_switch' : 'read_subscription_test_switch', {
    p_actor: actorId,
    ...(change ? { p_plan: change.enabled ? change.planCode : null, p_enabled: change.enabled } : {}),
  });
  if (result.error || !result.data || typeof result.data !== 'object' || Array.isArray(result.data)) throw new Error('subscription_test_switch_unavailable');
  const state = result.data as Record<string, unknown>;
  if (state.cloudBacked !== true || typeof state.enabled !== 'boolean'
    || (state.enabled ? !isAccountPlanCode(state.planCode) || typeof state.expiresAt !== 'string' || !Number.isFinite(Date.parse(state.expiresAt))
      : state.planCode !== null || state.expiresAt !== null)) throw new Error('subscription_test_switch_unavailable');
  return { enabled: state.enabled, planCode: state.planCode as AccountPlanCode | null, expiresAt: state.expiresAt as string | null, cloudBacked: true };
}
