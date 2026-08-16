import type {
  BillingCadence,
  PaidPlanCode,
  SubscriptionPriceVersionId,
} from './subscription-pricing';

export const BILLING_ORIGINS = [
  'newebpay_web',
  'ecpay_web',
  'apple_app_store',
  'google_play',
  'revenuecat_aggregate',
] as const;

export type BillingOrigin = typeof BILLING_ORIGINS[number];
export type ProviderEnvironment = 'sandbox' | 'production';

export const PROVIDER_OPERATION_ERROR_CODES = [
  'configuration_unavailable',
  'authentication_failed',
  'verification_failed',
  'identity_mismatch',
  'not_found',
  'rate_limited',
  'provider_unavailable',
  'timeout',
  'invalid_provider_response',
  'unsupported_operation',
  'unknown',
] as const;

export type ProviderOperationErrorCode = typeof PROVIDER_OPERATION_ERROR_CODES[number];

export type ProviderOperationError = Readonly<{
  code: ProviderOperationErrorCode;
  retryable: boolean;
  correlationId: string | null;
}>;

export type ProviderResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: ProviderOperationError }>;

export type BillingProviderCapabilities = Readonly<{
  authoritativeSubscriptionQuery: boolean;
  authoritativeTransactionQuery: boolean;
  stableEventReference: boolean;
  eventSequence: boolean;
  exactProrationQuote: boolean;
  cancellationReversal: boolean;
  recurringMandateModification: boolean;
  partialRefund: boolean;
  verifiedAt: string;
  evidenceReference: string;
}>;

export type RawProviderNotification = Readonly<{
  environment: ProviderEnvironment;
  receivedAt: string;
  contentType: string | null;
  headers: Readonly<Record<string, string>>;
  rawBody: Uint8Array;
}>;

export type ProviderEventKind =
  | 'purchase_started'
  | 'purchase_completed'
  | 'renewal_completed'
  | 'renewal_failed'
  | 'cancellation_scheduled'
  | 'cancellation_revoked'
  | 'subscription_expired'
  | 'plan_change_completed'
  | 'refund_completed'
  | 'dispute_opened'
  | 'dispute_resolved'
  | 'unknown';

export type VerifiedProviderEvent = Readonly<{
  verification: 'verified';
  origin: BillingOrigin;
  environment: ProviderEnvironment;
  providerEventRef: string | null;
  deterministicDedupeKey: string;
  eventKind: ProviderEventKind;
  providerCustomerRef: string | null;
  providerSubscriptionRef: string | null;
  providerTransactionRef: string | null;
  providerOccurredAt: string | null;
  providerSequence: string | null;
  payloadHash: string;
}>;

export type ProviderCustomerSnapshot = Readonly<{
  origin: BillingOrigin;
  environment: ProviderEnvironment;
  providerCustomerRef: string;
  providerObservedAt: string;
  snapshotHash: string;
}>;

export type ProviderSubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancel_at_period_end'
  | 'cancelled'
  | 'refunded'
  | 'disputed'
  | 'unknown';

export type ProviderSubscriptionSnapshot = Readonly<{
  origin: BillingOrigin;
  environment: ProviderEnvironment;
  providerCustomerRef: string;
  providerSubscriptionRef: string;
  providerProductRef: string | null;
  providerPriceRef: string | null;
  mappedPriceVersionId: SubscriptionPriceVersionId | null;
  mappedPlanCode: PaidPlanCode | null;
  mappedCadence: BillingCadence | null;
  status: ProviderSubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodStartsAt: string | null;
  currentPeriodEndsAt: string | null;
  providerObservedAt: string;
  providerSequence: string | null;
  snapshotHash: string;
}>;

export type ProviderTransactionKind =
  | 'charge'
  | 'refund'
  | 'credit'
  | 'dispute'
  | 'chargeback'
  | 'reversal'
  | 'unknown';

export type ProviderTransactionStatus =
  | 'pending'
  | 'settled'
  | 'failed'
  | 'reversed'
  | 'unknown';

export type ProviderTransactionSnapshot = Readonly<{
  origin: BillingOrigin;
  environment: ProviderEnvironment;
  providerCustomerRef: string;
  providerSubscriptionRef: string | null;
  providerTransactionRef: string;
  providerParentTransactionRef: string | null;
  kind: ProviderTransactionKind;
  status: ProviderTransactionStatus;
  currency: string;
  amountMinor: number;
  providerEffectiveAt: string | null;
  settledAt: string | null;
  providerObservedAt: string;
  snapshotHash: string;
}>;

export type ProviderIdentityBinding = Readonly<{
  ownerId: string;
  origin: BillingOrigin;
  environment: ProviderEnvironment;
  providerCustomerRef: string;
}>;

export type ProviderCustomerQuery = Readonly<{
  binding: ProviderIdentityBinding;
}>;

export type ProviderSubscriptionQuery = Readonly<{
  binding: ProviderIdentityBinding;
  providerSubscriptionRef: string;
}>;

export type ProviderTransactionQuery = Readonly<{
  binding: ProviderIdentityBinding;
  providerTransactionRef: string;
}>;

export interface BillingProviderReconciliationAdapter {
  readonly origin: BillingOrigin;
  readonly environment: ProviderEnvironment;
  readonly capabilities: BillingProviderCapabilities;

  verifyNotification(
    input: RawProviderNotification,
  ): Promise<ProviderResult<VerifiedProviderEvent>>;

  queryCustomer(
    input: ProviderCustomerQuery,
  ): Promise<ProviderResult<ProviderCustomerSnapshot>>;

  querySubscription(
    input: ProviderSubscriptionQuery,
  ): Promise<ProviderResult<ProviderSubscriptionSnapshot>>;

  queryTransaction(
    input: ProviderTransactionQuery,
  ): Promise<ProviderResult<ProviderTransactionSnapshot>>;
}

export function isBillingOrigin(value: unknown): value is BillingOrigin {
  return typeof value === 'string' && BILLING_ORIGINS.includes(value as BillingOrigin);
}

export function isProviderOperationErrorCode(
  value: unknown,
): value is ProviderOperationErrorCode {
  return (
    typeof value === 'string' &&
    PROVIDER_OPERATION_ERROR_CODES.includes(value as ProviderOperationErrorCode)
  );
}
