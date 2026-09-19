import {
  hasEffectiveEntitlement,
  resolveModelAccountCapabilities,
  type AccountCapabilities,
  type AccountPlanSource,
  type BillingStatus,
  type EntitlementStatus,
} from './subscription-capabilities';
import type {
  AccountCapabilityApiSuccess,
  AccountCapabilityReadStatus,
} from './account-capability-contract';
import { isAccountPlanCode, type AccountPlanCode } from './subscription-plans';

export const ACCOUNT_CAPABILITY_REFRESH_TTL_MS = 5 * 60 * 1000;

const ACCOUNT_PLAN_SOURCES = new Set<AccountPlanSource>(['free', 'admin', 'promotion', 'billing']);
const BILLING_STATUSES = new Set<BillingStatus>([
  'none',
  'trialing',
  'active',
  'past_due',
  'cancel_at_period_end',
  'cancelled',
  'refunded',
  'disputed',
  'unknown',
]);
const ENTITLEMENT_STATUSES = new Set<EntitlementStatus>(['active', 'grace', 'inactive', 'unknown']);

export type SubscriptionAccountRecord = {
  ownerId: unknown;
  planCode: unknown;
  planSource: unknown;
  billingStatus: unknown;
  entitlementStatus: unknown;
  entitlementEndsAt: unknown;
  updatedAt: unknown;
};

export type AccountCapabilityLookupResult =
  | { access: 'allowed'; account: SubscriptionAccountRecord | null }
  | { access: 'forbidden' };

export type AccountCapabilityRepository = {
  readForActor(input: {
    actorId: string;
    ownerId: string;
  }): Promise<AccountCapabilityLookupResult>;
};

export type ServerAccountCapabilityResolution =
  | { outcome: 'available'; response: AccountCapabilityApiSuccess }
  | { outcome: 'forbidden' }
  | { outcome: 'unavailable' };

type ParsedSubscriptionAccountRecord = {
  ownerId: string;
  planCode: AccountPlanCode;
  planSource: AccountPlanSource;
  billingStatus: BillingStatus;
  entitlementStatus: EntitlementStatus;
  entitlementEndsAt: string | null;
  updatedAt: string;
};

function parseTimestamp(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return new Date(Date.parse(value)).toISOString();
}

function parseRecord(value: SubscriptionAccountRecord): ParsedSubscriptionAccountRecord | null {
  if (typeof value.ownerId !== 'string' || !value.ownerId.trim()) return null;
  if (!isAccountPlanCode(value.planCode)) return null;
  if (typeof value.planSource !== 'string' || !ACCOUNT_PLAN_SOURCES.has(value.planSource as AccountPlanSource)) {
    return null;
  }
  if (typeof value.billingStatus !== 'string' || !BILLING_STATUSES.has(value.billingStatus as BillingStatus)) {
    return null;
  }
  if (
    typeof value.entitlementStatus !== 'string'
    || !ENTITLEMENT_STATUSES.has(value.entitlementStatus as EntitlementStatus)
  ) {
    return null;
  }

  const entitlementEndsAt = value.entitlementEndsAt === null
    ? null
    : parseTimestamp(value.entitlementEndsAt);
  const updatedAt = parseTimestamp(value.updatedAt);
  if ((value.entitlementEndsAt !== null && entitlementEndsAt === null) || updatedAt === null) return null;

  return {
    ownerId: value.ownerId,
    planCode: value.planCode,
    planSource: value.planSource as AccountPlanSource,
    billingStatus: value.billingStatus as BillingStatus,
    entitlementStatus: value.entitlementStatus as EntitlementStatus,
    entitlementEndsAt,
    updatedAt,
  };
}

function createSnapshotTimestamps(nowMs: number, refreshTtlMs: number): {
  capabilityEvaluatedAt: string;
  capabilityRefreshAfter: string;
} | null {
  if (!Number.isFinite(nowMs) || !Number.isInteger(refreshTtlMs) || refreshTtlMs <= 0) return null;
  const refreshAfterMs = nowMs + refreshTtlMs;
  if (!Number.isFinite(refreshAfterMs)) return null;
  return {
    capabilityEvaluatedAt: new Date(nowMs).toISOString(),
    capabilityRefreshAfter: new Date(refreshAfterMs).toISOString(),
  };
}

function createFreeSnapshot(
  ownerId: string,
  timestamps: { capabilityEvaluatedAt: string; capabilityRefreshAfter: string },
): AccountCapabilities {
  return resolveModelAccountCapabilities({
    ownerId,
    planCode: 'free',
    planSource: 'free',
    billingStatus: 'none',
    entitlementStatus: 'active',
    ...timestamps,
    entitlementEndsAt: null,
  });
}

function resolveDisconnectedSource(
  ownerId: string,
  timestamps: { capabilityEvaluatedAt: string; capabilityRefreshAfter: string },
  status: Extract<AccountCapabilityReadStatus, 'billing_not_connected' | 'promotion_not_connected'>,
): ServerAccountCapabilityResolution {
  return {
    outcome: 'available',
    response: {
      ok: true,
      status,
      capabilities: createFreeSnapshot(ownerId, timestamps),
    },
  };
}

export async function resolveServerAccountCapabilities(input: {
  actorId: string;
  ownerId: string;
  repository: AccountCapabilityRepository;
  nowMs: number;
  refreshTtlMs?: number;
}): Promise<ServerAccountCapabilityResolution> {
  if (!input.actorId || !input.ownerId) return { outcome: 'unavailable' };

  const timestamps = createSnapshotTimestamps(
    input.nowMs,
    input.refreshTtlMs ?? ACCOUNT_CAPABILITY_REFRESH_TTL_MS,
  );
  if (!timestamps) return { outcome: 'unavailable' };

  let lookup: AccountCapabilityLookupResult;
  try {
    lookup = await input.repository.readForActor({
      actorId: input.actorId,
      ownerId: input.ownerId,
    });
  } catch {
    return { outcome: 'unavailable' };
  }

  if (lookup.access === 'forbidden') return { outcome: 'forbidden' };
  if (lookup.account === null) {
    return {
      outcome: 'available',
      response: {
        ok: true,
        status: 'default_free',
        capabilities: createFreeSnapshot(input.ownerId, timestamps),
      },
    };
  }

  const record = parseRecord(lookup.account);
  if (!record || record.ownerId !== input.ownerId) return { outcome: 'unavailable' };

  if (record.planSource === 'billing') {
    return resolveDisconnectedSource(input.ownerId, timestamps, 'billing_not_connected');
  }
  if (record.planSource === 'promotion') {
    return resolveDisconnectedSource(input.ownerId, timestamps, 'promotion_not_connected');
  }

  if (record.planSource === 'free') {
    if (
      record.planCode !== 'free'
      || record.billingStatus !== 'none'
      || record.entitlementStatus !== 'active'
      || record.entitlementEndsAt !== null
    ) {
      return { outcome: 'unavailable' };
    }
    return {
      outcome: 'available',
      response: {
        ok: true,
        status: 'explicit_free',
        capabilities: createFreeSnapshot(input.ownerId, timestamps),
      },
    };
  }

  if (
    record.planSource !== 'admin'
    || record.planCode === 'free'
    || record.billingStatus !== 'none'
  ) {
    return { outcome: 'unavailable' };
  }

  const capabilities = resolveModelAccountCapabilities({
    ownerId: input.ownerId,
    planCode: record.planCode,
    planSource: 'admin',
    billingStatus: 'none',
    entitlementStatus: record.entitlementStatus,
    ...timestamps,
    entitlementEndsAt: record.entitlementEndsAt,
  });

  return {
    outcome: 'available',
    response: {
      ok: true,
      status: hasEffectiveEntitlement(capabilities, input.nowMs)
        ? 'admin_enabled'
        : 'admin_inactive',
      capabilities,
    },
  };
}
