import {
  buildAppApiUrl,
  isAppApiUrlError,
  type BuildAppApiUrlOptions,
} from '@/lib/api/client';
import { parseAppApiErrorResponse } from '@/lib/api/contract';
import { fetchAppApi, isAppApiRequestError } from '@/lib/api/transport';

export type SubscriptionPriceFoundationSmokeClientResult =
  | {
      ok: true;
      passed: boolean;
      passedChecks: number;
      totalChecks: number;
    }
  | { ok: false; code: string; retryable: boolean };

type SmokeRequestOptions = {
  accessToken: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  apiUrl?: BuildAppApiUrlOptions;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseSuccess(value: unknown): SubscriptionPriceFoundationSmokeClientResult | null {
  if (!isRecord(value) || value.ok !== true || value.available !== true) return null;
  if (
    typeof value.passed !== 'boolean'
    || !Number.isInteger(value.passedChecks)
    || !Number.isInteger(value.totalChecks)
    || (value.passedChecks as number) < 0
    || (value.totalChecks as number) <= 0
    || (value.passedChecks as number) > (value.totalChecks as number)
    || value.passed !== (value.passedChecks === value.totalChecks)
  ) {
    return null;
  }
  return {
    ok: true,
    passed: value.passed,
    passedChecks: value.passedChecks as number,
    totalChecks: value.totalChecks as number,
  };
}

export async function runSubscriptionPriceFoundationSmoke(
  options: SmokeRequestOptions,
): Promise<SubscriptionPriceFoundationSmokeClientResult> {
  const token = options.accessToken.trim();
  if (!token) return { ok: false, code: 'authentication_required', retryable: false };

  let response: Response;
  try {
    response = await fetchAppApi(
      buildAppApiUrl('/api/dev/subscription-price-foundation-smoke', options.apiUrl),
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
      {
        fetchImpl: options.fetchImpl,
        timeoutMs: options.timeoutMs ?? 15_000,
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
    return parseSuccess(await response.json())
      ?? { ok: false, code: 'smoke_unavailable', retryable: true };
  } catch {
    return { ok: false, code: 'smoke_unavailable', retryable: true };
  }
}
