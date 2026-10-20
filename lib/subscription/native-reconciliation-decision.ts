import type { BillingOrigin, ProviderEnvironment } from './billing-provider-contract';
import { isBillingOrigin } from './billing-provider-contract';
import type { NativeBillingOrigin } from './native-account-entitlement';
import { isNativeBillingOrigin } from './native-account-entitlement';
import type { NativeStoreVerificationContext, VerifiedNativeStoreSubscription } from './native-store-verification-contract';
import { isValidNativeStoreVerificationContext } from './native-store-verification-contract';
import { isSubscriptionPriceVersionId, SUBSCRIPTION_PRICE_CATALOG, type SubscriptionPriceVersion } from './subscription-pricing';

/** Internal source contract only. A decision never verifies a receipt or grants access. */
export const NATIVE_RECONCILIATION_FRESHNESS_MS = 5 * 60 * 1000;
const HASH = /^[a-f0-9]{64}$/;
const STATUSES = ['trialing', 'active', 'past_due', 'cancel_at_period_end', 'cancelled', 'refunded', 'disputed', 'unknown'];
const SNAPSHOT_KEYS = ['verification', 'accountBinding', 'ownerId', 'origin', 'environment',
  'providerSubscriptionRef', 'providerTransactionRef', 'productId', 'basePlanId', 'offerId',
  'mappedPriceVersionId', 'mappedPlanCode', 'mappedCadence', 'status', 'autoRenewEnabled',
  'currentPeriodStartsAt', 'currentPeriodEndsAt', 'storeObservedAt', 'verifiedAt', 'snapshotHash'];

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function bounded(value: unknown, max = 512): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max
    && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
}
function instant(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value ? parsed : null;
}

/** Structural validation of a trusted adapter response, never cryptographic verification. */
export function validateNativeReconciliationSnapshot(
  value: unknown, context: NativeStoreVerificationContext, nowMs: number, requireFresh = true,
): value is VerifiedNativeStoreSubscription {
  if (!record(value) || !record(context) || Object.keys(value).length !== SNAPSHOT_KEYS.length
    || Object.keys(value).some(key => !SNAPSHOT_KEYS.includes(key))
    || !isValidNativeStoreVerificationContext(context) || !bounded(context.authenticatedOwnerId, 256)
    || !bounded(context.expectedAccountBindingToken) || !Number.isSafeInteger(nowMs)) return false;
  if (value.verification !== 'verified' || value.accountBinding !== 'matched'
    || value.ownerId !== context.authenticatedOwnerId || !isNativeBillingOrigin(value.origin)
    || value.environment !== context.environment || !bounded(value.providerSubscriptionRef)
    || !bounded(value.providerTransactionRef) || !bounded(value.productId, 256)
    || ![value.basePlanId, value.offerId].every(item => item === null || bounded(item, 256))
    || value.origin === 'apple_app_store' && value.basePlanId !== null
    || value.origin === 'google_play' && value.basePlanId === null
    || !isSubscriptionPriceVersionId(value.mappedPriceVersionId)
    || typeof value.mappedPlanCode !== 'string' || !['pro', 'team'].includes(value.mappedPlanCode)
    || typeof value.mappedCadence !== 'string' || !['monthly', 'annual'].includes(value.mappedCadence)
    || typeof value.status !== 'string' || !STATUSES.includes(value.status) || typeof value.autoRenewEnabled !== 'boolean'
    || typeof value.snapshotHash !== 'string' || !HASH.test(value.snapshotHash)) return false;
  const observed = instant(value.storeObservedAt); const verified = instant(value.verifiedAt);
  if (observed === null || verified === null || observed > verified || verified > nowMs
    || requireFresh && nowMs - observed > NATIVE_RECONCILIATION_FRESHNESS_MS) return false;
  const start = value.currentPeriodStartsAt === null ? null : instant(value.currentPeriodStartsAt);
  const end = value.currentPeriodEndsAt === null ? null : instant(value.currentPeriodEndsAt);
  if (value.currentPeriodStartsAt !== null && start === null || value.currentPeriodEndsAt !== null && end === null
    || (start === null) !== (end === null) || start !== null && (end! <= start || start > observed)) return false;
  return !['active', 'cancel_at_period_end'].includes(String(value.status)) || end !== null;
}

export type ReconciliationMapping = Readonly<{
  origin: NativeBillingOrigin;
  environment: ProviderEnvironment;
  productId: string;
  basePlanId: string | null;
  offerId: string | null;
  status: 'active' | 'candidate' | 'disabled';
  price: SubscriptionPriceVersion;
}>;
export type ReconciliationProjection = Readonly<{
  ownerId: string;
  planSource: 'billing';
  origin: NativeBillingOrigin;
  planCode: 'pro' | 'team';
  billingStatus: 'active' | 'cancel_at_period_end' | 'cancelled' | 'refunded';
  entitlementStatus: 'active' | 'inactive';
  entitlementEndsAt: string | null;
}>;
export type NativeReconciliationState = Readonly<{
  ownerId: string;
  referenceOwnerId: string | null;
  previous: Readonly<{ snapshotHash: string; storeObservedAt: string }> | null;
  receipt: Readonly<{ snapshotHash: string; ownerId: string; lastDecision: NativeReconciliationCode }> | null;
  projectionSource: 'free' | 'billing' | 'admin' | 'promotion';
  subscriptions: readonly Readonly<{
    ownerId: string;
    origin: BillingOrigin;
    environment: ProviderEnvironment;
    providerSubscriptionRef: string;
    entitlementStatus: 'active' | 'grace' | 'inactive' | 'unknown';
    entitlementEndsAt: string | null;
  }>[];
}>;
export type NativeReconciliationCode =
  | 'snapshot_invalid' | 'owner_mismatch' | 'reference_owned_elsewhere' | 'mapping_unavailable'
  | 'state_invalid' | 'replay_conflict' | 'duplicate' | 'stale' | 'snapshot_conflict'
  | 'protected_projection' | 'policy_review_required' | 'subscription_conflict' | 'projection_ready';
const DECISION_CODES: readonly NativeReconciliationCode[] = [
  'snapshot_invalid', 'owner_mismatch', 'reference_owned_elsewhere', 'mapping_unavailable', 'state_invalid',
  'replay_conflict', 'duplicate', 'stale', 'snapshot_conflict', 'protected_projection', 'policy_review_required',
  'subscription_conflict', 'projection_ready',
];
export type NativeReconciliationDecision = Readonly<{
  outcome: 'reject' | 'unchanged' | 'review_required' | 'apply';
  code: NativeReconciliationCode;
  appendDecision: boolean;
  projection: ReconciliationProjection | null;
}>;

export function decideNativeReconciliation(input: {
  context: NativeStoreVerificationContext;
  snapshot: VerifiedNativeStoreSubscription;
  mapping: ReconciliationMapping | null;
  state: NativeReconciliationState;
  nowMs: number;
}): NativeReconciliationDecision {
  let previousDecision: NativeReconciliationCode | null = null;
  const result = (outcome: NativeReconciliationDecision['outcome'], code: NativeReconciliationCode,
    appendDecision = false, projection: ReconciliationProjection | null = null): NativeReconciliationDecision =>
    Object.freeze({ outcome, code, appendDecision: appendDecision && previousDecision !== code, projection: projection && Object.freeze(projection) });
  const { context, snapshot, mapping, state, nowMs } = input;
  if (!validateNativeReconciliationSnapshot(snapshot, context, nowMs)) return result('reject', 'snapshot_invalid');
  const canonicalPrice = SUBSCRIPTION_PRICE_CATALOG[snapshot.mappedPriceVersionId];
  if (!record(state) || state.ownerId !== context.authenticatedOwnerId) return result('reject', 'owner_mismatch');
  if (state.referenceOwnerId !== null && state.referenceOwnerId !== state.ownerId) return result('reject', 'reference_owned_elsewhere');
  if (!mapping || mapping.status !== 'active' || mapping.origin !== snapshot.origin || mapping.environment !== snapshot.environment
    || mapping.productId !== snapshot.productId || mapping.basePlanId !== snapshot.basePlanId || mapping.offerId !== snapshot.offerId
    || !mapping.price || mapping.price.runtimeStatus !== 'active' || instant(mapping.price.effectiveAt) === null
    || instant(mapping.price.effectiveAt)! > nowMs || mapping.price.id !== snapshot.mappedPriceVersionId
    || mapping.price.planCode !== snapshot.mappedPlanCode || mapping.price.cadence !== snapshot.mappedCadence) {
    return result('reject', 'mapping_unavailable');
  }
  if (mapping.price.planCode !== canonicalPrice.planCode || mapping.price.cadence !== canonicalPrice.cadence
    || mapping.price.policy !== canonicalPrice.policy || mapping.price.offerCode !== canonicalPrice.offerCode
    || mapping.price.currency !== canonicalPrice.currency || mapping.price.amountMinor !== canonicalPrice.amountMinor) {
    return result('reject', 'mapping_unavailable');
  }
  if (!['free', 'billing', 'admin', 'promotion'].includes(state.projectionSource) || !Array.isArray(state.subscriptions)) return result('reject', 'state_invalid');
  if (state.receipt !== null) {
    if (!record(state.receipt) || state.receipt.ownerId !== state.ownerId || state.receipt.snapshotHash !== snapshot.snapshotHash
      || !DECISION_CODES.includes(state.receipt.lastDecision)) return result('reject', 'replay_conflict');
    // A held decision has not applied a projection. Re-evaluate it after the
    // underlying conflict/policy is resolved; do not permanently swallow a restore.
    previousDecision = state.receipt.lastDecision;
    if (previousDecision === 'projection_ready') return result('unchanged', 'duplicate');
  }
  if (state.previous !== null) {
    const previousTime = record(state.previous) ? instant(state.previous.storeObservedAt) : null;
    if (previousTime === null || previousTime > nowMs || !HASH.test(state.previous.snapshotHash)) return result('reject', 'state_invalid');
    // A fresh restore can rebuild a missing Free projection from the same store
    // state. Atomic billing snapshots can otherwise retain their existing result.
    if (state.previous.snapshotHash === snapshot.snapshotHash && state.projectionSource === 'billing') return result('unchanged', 'duplicate', true);
    const observed = instant(snapshot.storeObservedAt)!;
    if (observed < previousTime) return result('unchanged', 'stale', true);
    if (observed === previousTime && state.previous.snapshotHash !== snapshot.snapshotHash) return result('review_required', 'snapshot_conflict', true);
  }
  if (state.projectionSource === 'admin' || state.projectionSource === 'promotion') return result('unchanged', 'protected_projection', true);
  if (['trialing', 'past_due', 'disputed', 'unknown'].includes(snapshot.status)) return result('review_required', 'policy_review_required', true);
  for (const subscription of state.subscriptions) {
    const status = record(subscription) ? subscription.entitlementStatus : null;
    if (!record(subscription) || subscription.ownerId !== state.ownerId || !isBillingOrigin(subscription.origin)
      || subscription.environment !== context.environment || !bounded(subscription.providerSubscriptionRef)
      || typeof status !== 'string' || !['active', 'grace', 'inactive', 'unknown'].includes(status)
      || subscription.entitlementEndsAt !== null && instant(subscription.entitlementEndsAt) === null) return result('reject', 'state_invalid');
    if (status === 'unknown'
      || ['active', 'grace'].includes(status) && subscription.entitlementEndsAt === null) {
      return result('review_required', 'policy_review_required', true);
    }
    const active = ['active', 'grace'].includes(status)
      && instant(subscription.entitlementEndsAt)! >= nowMs;
    const same = subscription.origin === snapshot.origin && subscription.providerSubscriptionRef === snapshot.providerSubscriptionRef;
    if (active && !same) return result('review_required', 'subscription_conflict', true);
  }
  const effective = ['active', 'cancel_at_period_end'].includes(snapshot.status)
    && instant(snapshot.currentPeriodEndsAt)! >= nowMs;
  return result('apply', 'projection_ready', true, {
    ownerId: state.ownerId, planSource: 'billing', origin: snapshot.origin, planCode: snapshot.mappedPlanCode,
    billingStatus: snapshot.status as ReconciliationProjection['billingStatus'],
    entitlementStatus: effective ? 'active' : 'inactive', entitlementEndsAt: snapshot.currentPeriodEndsAt,
  });
}
