import {
  buildAppApiUrl,
  isAppApiUrlError,
  type BuildAppApiUrlOptions,
} from '@/lib/api/client';
import { parseAppApiErrorResponse } from '@/lib/api/contract';
import { fetchAppApi, isAppApiRequestError } from '@/lib/api/transport';
import { isAccountPlanCode, type AccountPlanCode } from './subscription-plans';

export type SubscriptionSimulationClientState = {
  available: true;
  enabled: boolean;
  planCode: AccountPlanCode | null;
  expiresAt: string | null;
};

export type SubscriptionSimulationClientResult =
  | { ok: true; state: SubscriptionSimulationClientState }
  | { ok: false; code: string; retryable: boolean };

type SubscriptionSimulationRequestOptions = {
  accessToken: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  apiUrl?: BuildAppApiUrlOptions;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseState(value: unknown): SubscriptionSimulationClientState | null {
  if (!isRecord(value) || value.ok !== true || value.available !== true) return null;
  if (typeof value.enabled !== 'boolean') return null;
  if (value.planCode !== null && !isAccountPlanCode(value.planCode)) return null;
  if (
    value.expiresAt !== null
    && (typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt)))
  ) {
    return null;
  }
  if (value.enabled !== (value.planCode !== null && value.expiresAt !== null)) return null;

  return {
    available: true,
    enabled: value.enabled,
    planCode: value.planCode,
    expiresAt: value.expiresAt,
  };
}

async function requestSimulation(
  options: SubscriptionSimulationRequestOptions,
  body?: { enabled: boolean; planCode?: AccountPlanCode },
): Promise<SubscriptionSimulationClientResult> {
  const token = options.accessToken.trim();
  if (!token) return { ok: false, code: 'authentication_required', retryable: false };

  let response: Response;
  try {
    response = await fetchAppApi(
      buildAppApiUrl('/api/dev/subscription-simulation', options.apiUrl),
      {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        cache: 'no-store',
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
      {
        fetchImpl: options.fetchImpl,
        timeoutMs: options.timeoutMs ?? 8_000,
      },
    );
  } catch (error) {
    if (isAppApiUrlError(error)) return { ok: false, code: error.code, retryable: false };
    const code = isAppApiRequestError(error) ? error.code : 'network_error';
    return {
      ok: false,
      code,
      retryable: code === 'network_error' || code === 'request_timeout',
    };
  }

  if (!response.ok) {
    const parsed = await parseAppApiErrorResponse(response);
    return { ok: false, code: parsed.code, retryable: parsed.retryable };
  }

  try {
    const state = parseState(await response.json());
    return state
      ? { ok: true, state }
      : { ok: false, code: 'simulation_unavailable', retryable: true };
  } catch {
    return { ok: false, code: 'simulation_unavailable', retryable: true };
  }
}

export function readSubscriptionSimulation(
  options: SubscriptionSimulationRequestOptions,
): Promise<SubscriptionSimulationClientResult> {
  return requestSimulation(options);
}

export function updateSubscriptionSimulation(
  options: SubscriptionSimulationRequestOptions & {
    enabled: boolean;
    planCode?: AccountPlanCode;
  },
): Promise<SubscriptionSimulationClientResult> {
  return requestSimulation(options, {
    enabled: options.enabled,
    ...(options.enabled && options.planCode ? { planCode: options.planCode } : {}),
  });
}
