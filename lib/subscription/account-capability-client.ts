import {
  buildAppApiUrl,
  isAppApiUrlError,
  type BuildAppApiUrlOptions,
} from '@/lib/api/client';
import { parseAppApiErrorResponse } from '@/lib/api/contract';
import { fetchAppApi, isAppApiRequestError } from '@/lib/api/transport';
import {
  isAccountCapabilityReadStatus,
  type AccountCapabilityApiSuccess,
  type AccountCapabilityReadStatus,
} from '@/lib/subscription/account-capability-contract';
import {
  resolveCapabilityFreshness,
  resolveModelAccountCapabilities,
  resolveUnavailableAccountCapabilities,
  type AccountCapabilities,
  type AccountPlanSource,
  type BillingStatus,
  type CapabilityFreshness,
  type EntitlementStatus,
} from '@/lib/subscription/subscription-capabilities';
import { isAccountPlanCode } from '@/lib/subscription/subscription-plans';

const PLAN_SOURCES = new Set<AccountPlanSource>(['free', 'admin', 'promotion', 'billing']);
const BILLING_STATUSES = new Set<BillingStatus>([
  'none', 'trialing', 'active', 'past_due', 'cancel_at_period_end',
  'cancelled', 'refunded', 'disputed', 'unknown',
]);
const ENTITLEMENT_STATUSES = new Set<EntitlementStatus>(['active', 'grace', 'inactive', 'unknown']);
const FEATURE_KEYS = [
  'productCoverPhoto',
  'salesPhotoEvidence',
  'basicAnalytics',
  'advancedAnalytics',
  'settlementReportPreview',
  'settlementPdf',
  'excelExport',
  'staffCollaboration',
  'managerWorkflow',
] as const;

export type AccountCapabilityClientResult =
  | {
      ok: true;
      status: AccountCapabilityReadStatus;
      capabilities: AccountCapabilities;
      freshness: Extract<CapabilityFreshness, 'fresh' | 'offline_lease'>;
    }
  | {
      ok: false;
      code: string;
      retryable: boolean;
      capabilities: AccountCapabilities;
    };

export type ReadAccountCapabilitiesOptions = {
  accessToken: string;
  nowMs?: number;
  network?: 'online' | 'offline';
  offlineLeaseEndsAt?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  apiUrl?: BuildAppApiUrlOptions;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTimestampOrNull(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
}

function isNonNegativeIntegerOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0);
}

function recordsEqual(left: object, right: object): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function parseAccountCapabilityApiSuccess(value: unknown): AccountCapabilityApiSuccess | null {
  if (!isRecord(value) || value.ok !== true || !isAccountCapabilityReadStatus(value.status)) return null;
  if (!isRecord(value.capabilities)) return null;
  const raw = value.capabilities;

  if (typeof raw.ownerId !== 'string' || !raw.ownerId) return null;
  if (!isAccountPlanCode(raw.planCode)) return null;
  if (typeof raw.planSource !== 'string' || !PLAN_SOURCES.has(raw.planSource as AccountPlanSource)) return null;
  if (typeof raw.billingStatus !== 'string' || !BILLING_STATUSES.has(raw.billingStatus as BillingStatus)) return null;
  if (
    typeof raw.entitlementStatus !== 'string'
    || !ENTITLEMENT_STATUSES.has(raw.entitlementStatus as EntitlementStatus)
  ) {
    return null;
  }
  if (
    typeof raw.capabilityEvaluatedAt !== 'string'
    || !Number.isFinite(Date.parse(raw.capabilityEvaluatedAt))
    || typeof raw.capabilityRefreshAfter !== 'string'
    || !Number.isFinite(Date.parse(raw.capabilityRefreshAfter))
    || !isTimestampOrNull(raw.entitlementEndsAt)
  ) {
    return null;
  }
  const rawFeatures = raw.features;
  if (!isRecord(rawFeatures) || !FEATURE_KEYS.every(key => typeof rawFeatures[key] === 'boolean')) return null;
  const rawLimits = raw.limits;
  if (!isRecord(rawLimits)) return null;
  if (
    !isNonNegativeIntegerOrNull(rawLimits.activeProductLimit)
    || typeof rawLimits.staffSeatLimit !== 'number'
    || !Number.isSafeInteger(rawLimits.staffSeatLimit)
    || rawLimits.staffSeatLimit < 0
    || !isNonNegativeIntegerOrNull(rawLimits.productPhotoStorageBytes)
    || !isNonNegativeIntegerOrNull(rawLimits.salesEvidenceStorageBytes)
    || !isNonNegativeIntegerOrNull(rawLimits.monthlyPdfExportLimit)
    || !isNonNegativeIntegerOrNull(rawLimits.monthlyExcelExportLimit)
  ) {
    return null;
  }

  let capabilities: AccountCapabilities;
  try {
    capabilities = resolveModelAccountCapabilities({
      ownerId: raw.ownerId,
      planCode: raw.planCode,
      planSource: raw.planSource as AccountPlanSource,
      billingStatus: raw.billingStatus as BillingStatus,
      entitlementStatus: raw.entitlementStatus as EntitlementStatus,
      capabilityEvaluatedAt: raw.capabilityEvaluatedAt,
      capabilityRefreshAfter: raw.capabilityRefreshAfter,
      entitlementEndsAt: raw.entitlementEndsAt,
    });
  } catch {
    return null;
  }

  if (!recordsEqual(capabilities.features, rawFeatures) || !recordsEqual(capabilities.limits, rawLimits)) {
    return null;
  }
  const adminStatus = value.status === 'admin_enabled'
    || value.status === 'admin_inactive'
    || value.status === 'simulation_enabled';
  if (adminStatus !== (capabilities.planSource === 'admin')) return null;
  if (!adminStatus && (capabilities.planCode !== 'free' || capabilities.planSource !== 'free')) return null;

  return {
    ok: true,
    status: value.status,
    capabilities,
  };
}

function unavailable(code: string, retryable: boolean, ownerId: string | null = null): AccountCapabilityClientResult {
  return {
    ok: false,
    code,
    retryable,
    capabilities: resolveUnavailableAccountCapabilities(ownerId),
  };
}

export async function readAccountCapabilities(
  options: ReadAccountCapabilitiesOptions,
): Promise<AccountCapabilityClientResult> {
  const token = options.accessToken.trim();
  if (!token) return unavailable('authentication_required', false);

  let response: Response;
  try {
    response = await fetchAppApi(
      buildAppApiUrl('/api/account-capabilities', options.apiUrl),
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
      {
        fetchImpl: options.fetchImpl,
        timeoutMs: options.timeoutMs ?? 8_000,
      },
    );
  } catch (error) {
    if (isAppApiUrlError(error)) return unavailable(error.code, false);
    const code = isAppApiRequestError(error) ? error.code : 'network_error';
    return unavailable(code, code === 'network_error' || code === 'request_timeout');
  }

  if (!response.ok) {
    const parsed = await parseAppApiErrorResponse(response);
    return unavailable(parsed.code, parsed.retryable);
  }

  let parsedBody: AccountCapabilityApiSuccess | null = null;
  try {
    parsedBody = parseAccountCapabilityApiSuccess(await response.json());
  } catch {
    parsedBody = null;
  }
  if (!parsedBody) return unavailable('capability_unavailable', true);

  const freshness = resolveCapabilityFreshness({
    capabilities: parsedBody.capabilities,
    nowMs: options.nowMs ?? Date.now(),
    network: options.network ?? 'online',
    offlineLeaseEndsAt: options.offlineLeaseEndsAt,
  });
  if (freshness !== 'fresh' && freshness !== 'offline_lease') {
    return unavailable(
      freshness === 'stale' ? 'stale_capability' : freshness,
      freshness === 'stale' || freshness === 'unavailable',
      parsedBody.capabilities.ownerId,
    );
  }

  return {
    ok: true,
    status: parsedBody.status,
    capabilities: parsedBody.capabilities,
    freshness,
  };
}
