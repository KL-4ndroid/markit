import type { BillingOrigin } from './billing-provider-contract';
import type { BillingStatus, EntitlementStatus } from './subscription-capabilities';
import type { PaidPlanCode } from './subscription-pricing';

export const APP_SURFACES = ['web', 'ios', 'android'] as const;
export type AppSurface = typeof APP_SURFACES[number];

export const NATIVE_BILLING_ORIGINS = ['apple_app_store', 'google_play'] as const;
export type NativeBillingOrigin = typeof NATIVE_BILLING_ORIGINS[number];

export type VerifiedPaidAccountEntitlement = Readonly<{
  ownerId: string;
  planCode: PaidPlanCode;
  origin: BillingOrigin;
  billingStatus: BillingStatus;
  entitlementStatus: EntitlementStatus;
  verifiedAt: string;
  refreshAfter: string;
  entitlementEndsAt: string | null;
}>;

export type AccountEntitlementAccessBlockReason =
  | 'authentication_required'
  | 'owner_mismatch'
  | 'entitlement_unknown'
  | 'entitlement_inactive'
  | 'invalid_trusted_time'
  | 'entitlement_stale'
  | 'entitlement_expired';

export type AccountEntitlementAccessDecision =
  | Readonly<{
      allowed: true;
      planCode: PaidPlanCode;
      origin: BillingOrigin;
      surface: AppSurface;
    }>
  | Readonly<{
      allowed: false;
      reason: AccountEntitlementAccessBlockReason;
      surface: AppSurface;
    }>;

export type NativePurchaseEligibilityBlockReason =
  | 'authentication_required'
  | 'current_entitlement_unavailable'
  | 'manage_existing_subscription'
  | 'active_origin_conflict'
  | 'multiple_active_origins';

export type NativePurchaseEligibilityDecision =
  | Readonly<{ allowed: true; origin: NativeBillingOrigin }>
  | Readonly<{
      allowed: false;
      reason: NativePurchaseEligibilityBlockReason;
      existingOrigin: BillingOrigin | null;
    }>;

function parseTrustedInstant(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isNonEmptyIdentifier(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isNativeBillingOrigin(value: unknown): value is NativeBillingOrigin {
  return typeof value === 'string'
    && NATIVE_BILLING_ORIGINS.includes(value as NativeBillingOrigin);
}

export function evaluateVerifiedAccountEntitlementAccess(input: {
  authenticatedOwnerId: string | null;
  entitlement: VerifiedPaidAccountEntitlement;
  surface: AppSurface;
  nowMs: number;
}): AccountEntitlementAccessDecision {
  const blocked = (reason: AccountEntitlementAccessBlockReason): AccountEntitlementAccessDecision => ({
    allowed: false,
    reason,
    surface: input.surface,
  });

  if (!isNonEmptyIdentifier(input.authenticatedOwnerId)) {
    return blocked('authentication_required');
  }
  if (input.authenticatedOwnerId !== input.entitlement.ownerId) {
    return blocked('owner_mismatch');
  }
  if (input.entitlement.entitlementStatus === 'unknown') {
    return blocked('entitlement_unknown');
  }
  if (
    input.entitlement.entitlementStatus !== 'active'
    && input.entitlement.entitlementStatus !== 'grace'
  ) {
    return blocked('entitlement_inactive');
  }

  const verifiedAt = parseTrustedInstant(input.entitlement.verifiedAt);
  const refreshAfter = parseTrustedInstant(input.entitlement.refreshAfter);
  const entitlementEndsAt = parseTrustedInstant(input.entitlement.entitlementEndsAt);
  if (
    !Number.isFinite(input.nowMs)
    || verifiedAt === null
    || refreshAfter === null
    || verifiedAt > refreshAfter
    || verifiedAt > input.nowMs
    || (input.entitlement.entitlementEndsAt !== null && entitlementEndsAt === null)
  ) {
    return blocked('invalid_trusted_time');
  }
  if (input.nowMs > refreshAfter) {
    return blocked('entitlement_stale');
  }
  if (entitlementEndsAt !== null && input.nowMs > entitlementEndsAt) {
    return blocked('entitlement_expired');
  }

  return {
    allowed: true,
    planCode: input.entitlement.planCode,
    origin: input.entitlement.origin,
    surface: input.surface,
  };
}

export function evaluateNativePurchaseEligibility(input: {
  authenticatedOwnerId: string | null;
  requestedOrigin: NativeBillingOrigin;
  verifiedEntitlements: readonly VerifiedPaidAccountEntitlement[];
  nowMs: number;
}): NativePurchaseEligibilityDecision {
  if (!isNonEmptyIdentifier(input.authenticatedOwnerId)) {
    return { allowed: false, reason: 'authentication_required', existingOrigin: null };
  }

  const activeDecisions = input.verifiedEntitlements.map(entitlement => ({
    entitlement,
    decision: evaluateVerifiedAccountEntitlementAccess({
      authenticatedOwnerId: input.authenticatedOwnerId,
      entitlement,
      surface: input.requestedOrigin === 'apple_app_store' ? 'ios' : 'android',
      nowMs: input.nowMs,
    }),
  }));
  const unavailable = activeDecisions.find(({ decision }) => (
    !decision.allowed
    && ['owner_mismatch', 'entitlement_unknown', 'invalid_trusted_time', 'entitlement_stale']
      .includes(decision.reason)
  ));
  if (unavailable) {
    return {
      allowed: false,
      reason: 'current_entitlement_unavailable',
      existingOrigin: unavailable.entitlement.origin,
    };
  }

  const active = activeDecisions.filter(({ decision }) => decision.allowed);
  const activeOrigins = new Set(active.map(({ entitlement }) => entitlement.origin));
  if (activeOrigins.size > 1) {
    return { allowed: false, reason: 'multiple_active_origins', existingOrigin: null };
  }

  const existing = active[0]?.entitlement ?? null;
  if (!existing) return { allowed: true, origin: input.requestedOrigin };
  if (existing.origin === input.requestedOrigin) {
    return {
      allowed: false,
      reason: 'manage_existing_subscription',
      existingOrigin: existing.origin,
    };
  }
  return {
    allowed: false,
    reason: 'active_origin_conflict',
    existingOrigin: existing.origin,
  };
}
