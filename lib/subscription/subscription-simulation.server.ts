import 'server-only';

import {
  ACCOUNT_CAPABILITY_REFRESH_TTL_MS,
  type ServerAccountCapabilityResolution,
} from './account-capability-server';
import { resolveModelAccountCapabilities } from './subscription-capabilities';
import type { AccountPlanCode } from './subscription-plans';

export const SUBSCRIPTION_SIMULATION_ENABLED_ENV = 'SUBSCRIPTION_SIMULATION_ENABLED';
export const SUBSCRIPTION_SIMULATION_TTL_MS = 4 * 60 * 60 * 1000;

type SubscriptionSimulationRecord = {
  planCode: AccountPlanCode;
  expiresAtMs: number;
};

export type SubscriptionSimulationState = {
  enabled: boolean;
  planCode: AccountPlanCode | null;
  expiresAt: string | null;
};

const STORE_SYMBOL = Symbol.for('feria.subscription-simulation.store');

function getStore(): Map<string, SubscriptionSimulationRecord> {
  const shared = globalThis as typeof globalThis & {
    [STORE_SYMBOL]?: Map<string, SubscriptionSimulationRecord>;
  };
  shared[STORE_SYMBOL] ??= new Map<string, SubscriptionSimulationRecord>();
  return shared[STORE_SYMBOL];
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function isSubscriptionSimulationRequestAllowed(
  request: Request,
  options: {
    enabled?: boolean;
    deployed?: boolean;
  } = {},
): boolean {
  const enabled = options.enabled
    ?? process.env[SUBSCRIPTION_SIMULATION_ENABLED_ENV] === 'true';
  const deployed = options.deployed
    ?? Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  if (!enabled || deployed) return false;

  try {
    const url = new URL(request.url);
    return (url.protocol === 'http:' || url.protocol === 'https:')
      && isLoopbackHostname(url.hostname);
  } catch {
    return false;
  }
}

export function readSubscriptionSimulation(
  actorId: string,
  nowMs: number = Date.now(),
): SubscriptionSimulationState {
  const record = getStore().get(actorId);
  if (!record || !Number.isFinite(nowMs) || record.expiresAtMs <= nowMs) {
    if (record) getStore().delete(actorId);
    return { enabled: false, planCode: null, expiresAt: null };
  }

  return {
    enabled: true,
    planCode: record.planCode,
    expiresAt: new Date(record.expiresAtMs).toISOString(),
  };
}

export function setSubscriptionSimulation(
  actorId: string,
  planCode: AccountPlanCode,
  nowMs: number = Date.now(),
): SubscriptionSimulationState {
  if (!actorId || !Number.isFinite(nowMs)) {
    return { enabled: false, planCode: null, expiresAt: null };
  }

  const expiresAtMs = nowMs + SUBSCRIPTION_SIMULATION_TTL_MS;
  getStore().set(actorId, { planCode, expiresAtMs });
  return {
    enabled: true,
    planCode,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

export function clearSubscriptionSimulation(actorId: string): SubscriptionSimulationState {
  getStore().delete(actorId);
  return { enabled: false, planCode: null, expiresAt: null };
}

export function resolveSubscriptionSimulationForRequest(input: {
  request: Request;
  actorId: string;
  ownerId: string;
  nowMs: number;
}): ServerAccountCapabilityResolution | null {
  if (!isSubscriptionSimulationRequestAllowed(input.request)) return null;
  const state = readSubscriptionSimulation(input.actorId, input.nowMs);
  if (!state.enabled || !state.planCode || input.actorId !== input.ownerId) return null;

  const capabilityEvaluatedAt = new Date(input.nowMs).toISOString();
  const capabilityRefreshAfter = new Date(
    input.nowMs + ACCOUNT_CAPABILITY_REFRESH_TTL_MS,
  ).toISOString();

  return {
    outcome: 'available',
    response: {
      ok: true,
      status: 'simulation_enabled',
      capabilities: resolveModelAccountCapabilities({
        ownerId: input.ownerId,
        planCode: state.planCode,
        planSource: 'admin',
        billingStatus: 'none',
        entitlementStatus: 'active',
        capabilityEvaluatedAt,
        capabilityRefreshAfter,
        entitlementEndsAt: state.expiresAt,
      }),
    },
  };
}
