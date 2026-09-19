import type {
  ProviderEnvironment,
  ProviderSubscriptionStatus,
  ProviderResult,
} from './billing-provider-contract';
import type { NativeBillingOrigin } from './native-account-entitlement';
import type {
  BillingCadence,
  PaidPlanCode,
  SubscriptionPriceVersionId,
} from './subscription-pricing';

export const NATIVE_STORE_VERIFICATION_SCHEMA_VERSION = 1 as const;
export const NATIVE_STORE_PRODUCT_ID_MAX_LENGTH = 256;
export const NATIVE_STORE_VERIFICATION_PAYLOAD_MAX_LENGTH = 65_536;
export const NATIVE_STORE_ACCOUNT_BINDING_MAX_LENGTH = 512;

export type NativeStoreVerificationRequest = Readonly<{
  schemaVersion: typeof NATIVE_STORE_VERIFICATION_SCHEMA_VERSION;
  store: NativeBillingOrigin;
  productId: string;
  opaqueVerificationPayload: string;
}>;

export type NativeStoreVerificationContext = Readonly<{
  authenticatedOwnerId: string;
  expectedAccountBindingToken: string;
  environment: ProviderEnvironment;
}>;

export type NativeStoreVerificationInput = Readonly<{
  context: NativeStoreVerificationContext;
  request: NativeStoreVerificationRequest;
}>;

export type VerifiedNativeStoreSubscription = Readonly<{
  verification: 'verified';
  accountBinding: 'matched';
  ownerId: string;
  origin: NativeBillingOrigin;
  environment: ProviderEnvironment;
  providerSubscriptionRef: string;
  providerTransactionRef: string;
  productId: string;
  basePlanId: string | null;
  offerId: string | null;
  mappedPriceVersionId: SubscriptionPriceVersionId;
  mappedPlanCode: PaidPlanCode;
  mappedCadence: BillingCadence;
  status: ProviderSubscriptionStatus;
  autoRenewEnabled: boolean;
  currentPeriodStartsAt: string | null;
  currentPeriodEndsAt: string | null;
  storeObservedAt: string;
  verifiedAt: string;
  snapshotHash: string;
}>;

export type NativeStoreSubscriptionQuery = Readonly<{
  context: NativeStoreVerificationContext;
  origin: NativeBillingOrigin;
  providerSubscriptionRef: string;
}>;

export interface NativeStoreVerificationAdapter {
  readonly origin: NativeBillingOrigin;
  readonly environment: ProviderEnvironment;

  verifyPurchase(
    input: NativeStoreVerificationInput,
  ): Promise<ProviderResult<VerifiedNativeStoreSubscription>>;

  querySubscription(
    input: NativeStoreSubscriptionQuery,
  ): Promise<ProviderResult<VerifiedNativeStoreSubscription>>;
}

export type NativeStoreVerificationRequestParseResult =
  | Readonly<{ ok: true; value: NativeStoreVerificationRequest }>
  | Readonly<{ ok: false; error: 'invalid_request' }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === [...expected].sort()[index]);
}

function isBoundedNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= maxLength;
}

export function parseNativeStoreVerificationRequest(
  value: unknown,
): NativeStoreVerificationRequestParseResult {
  if (!isRecord(value) || !hasExactKeys(value, [
    'schemaVersion',
    'store',
    'productId',
    'opaqueVerificationPayload',
  ])) {
    return { ok: false, error: 'invalid_request' };
  }

  if (
    value.schemaVersion !== NATIVE_STORE_VERIFICATION_SCHEMA_VERSION
    || (value.store !== 'apple_app_store' && value.store !== 'google_play')
    || !isBoundedNonEmptyString(value.productId, NATIVE_STORE_PRODUCT_ID_MAX_LENGTH)
    || !isBoundedNonEmptyString(
      value.opaqueVerificationPayload,
      NATIVE_STORE_VERIFICATION_PAYLOAD_MAX_LENGTH,
    )
  ) {
    return { ok: false, error: 'invalid_request' };
  }

  return {
    ok: true,
    value: {
      schemaVersion: NATIVE_STORE_VERIFICATION_SCHEMA_VERSION,
      store: value.store,
      productId: value.productId,
      opaqueVerificationPayload: value.opaqueVerificationPayload,
    },
  };
}

export function isValidNativeStoreVerificationContext(
  context: NativeStoreVerificationContext,
): boolean {
  return isBoundedNonEmptyString(context.authenticatedOwnerId, 256)
    && isBoundedNonEmptyString(
      context.expectedAccountBindingToken,
      NATIVE_STORE_ACCOUNT_BINDING_MAX_LENGTH,
    )
    && (context.environment === 'sandbox' || context.environment === 'production');
}
