import 'server-only';
import { createHash } from 'node:crypto';
import { AppStoreServerAPIClient, Environment, SignedDataVerifier, type JWSTransactionDecodedPayload, type StatusResponse } from '@apple/app-store-server-library';
import type { NativeStoreVerificationAdapter, NativeStoreVerificationContext, VerifiedNativeStoreSubscription } from './native-store-verification-contract';
import type { ReconciliationMapping } from './native-reconciliation-decision';
import type { ProviderResult } from './billing-provider-contract';

const APPLE_ROOT_G3_SHA256 = '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reference = /^[0-9]{1,64}$/;
export type AppleSignedVerifier = Pick<SignedDataVerifier, 'verifyAndDecodeTransaction' | 'verifyAndDecodeRenewalInfo' | 'verifyAndDecodeNotification'>;
export type AppleStatusClient = Pick<AppStoreServerAPIClient, 'getAllSubscriptionStatuses'>;
export type AppleIdentity = { environment: 'sandbox' | 'production'; bundleId: string; appAppleId?: number; subscriptionGroupId: string };
const appleEnv = (environment: AppleIdentity['environment']) => environment === 'sandbox' ? Environment.SANDBOX : Environment.PRODUCTION;
export function createAppleSdk(input: AppleIdentity & { roots: Buffer[]; signingKey: string; keyId: string; issuerId: string }) {
  if (!['sandbox','production'].includes(input.environment) || !/^[A-Za-z0-9.-]{3,256}$/.test(input.bundleId)
    || !input.subscriptionGroupId || !input.keyId || !uuid.test(input.issuerId) || !input.signingKey
    || input.environment === 'production' && (!Number.isSafeInteger(input.appAppleId) || input.appAppleId! <= 0)
    || input.roots.length !== 1 || createHash('sha256').update(input.roots[0]).digest('hex') !== APPLE_ROOT_G3_SHA256) {
    throw new Error('apple_configuration_unavailable');
  }
  // Trust roots and revocation behavior cannot be supplied by the device.
  return {
    verifier: new SignedDataVerifier(input.roots, true, appleEnv(input.environment), input.bundleId, input.appAppleId),
    client: new AppStoreServerAPIClient(input.signingKey, input.keyId, input.issuerId, input.bundleId, appleEnv(input.environment)),
  };
}
export function createAppleVerificationAdapter(input: AppleIdentity & {
  verifier: AppleSignedVerifier; client: AppleStatusClient;
  mapping(productId: string): Promise<ReconciliationMapping | null>; now(): number;
}): NativeStoreVerificationAdapter {
  function checked(tx: JWSTransactionDecodedPayload, context: NativeStoreVerificationContext) {
    if(tx.offerIdentifier != null || tx.offerType != null)throw new Error('apple_policy_review_required');
    if (context.environment !== input.environment || !uuid.test(context.expectedAccountBindingToken)
      || tx.appAccountToken?.toLowerCase() !== context.expectedAccountBindingToken.toLowerCase()
      || tx.environment !== appleEnv(input.environment) || tx.bundleId !== input.bundleId
      || tx.subscriptionGroupIdentifier !== input.subscriptionGroupId || tx.type !== 'Auto-Renewable Subscription'
      || tx.inAppOwnershipType !== 'PURCHASED' || tx.quantity !== 1
      || !reference.test(tx.originalTransactionId ?? '') || !reference.test(tx.transactionId ?? '')
      || !tx.productId || tx.productId.length > 256
      || !Number.isSafeInteger(tx.purchaseDate) || !Number.isSafeInteger(tx.expiresDate)
      || tx.purchaseDate! > input.now() || tx.expiresDate! <= tx.purchaseDate!
      || !Number.isSafeInteger(tx.signedDate) || tx.signedDate! > input.now()
      || tx.revocationDate != null && (!Number.isSafeInteger(tx.revocationDate) || tx.revocationDate > input.now())) {
      throw new Error('apple_identity_mismatch');
    }
  }
  async function normalize(tx: JWSTransactionDecodedPayload, context: NativeStoreVerificationContext, status: number, renews: boolean, observedAt = input.now()): Promise<VerifiedNativeStoreSubscription> {
    checked(tx, context);
    const mapping = await input.mapping(tx.productId!);
    if(mapping && (mapping.price.policy!=='standard' || mapping.price.offerCode!==null))throw new Error('apple_policy_review_required');
    if (!mapping || mapping.origin !== 'apple_app_store' || mapping.environment !== input.environment
      || mapping.productId !== tx.productId || mapping.basePlanId !== null || mapping.offerId !== null
      || mapping.status !== 'active' || mapping.price.runtimeStatus !== 'active'
      || ![1,2,3,4,5].includes(status)) throw new Error('apple_mapping_unavailable');
    const state: VerifiedNativeStoreSubscription['status'] = tx.revocationDate != null || status === 5 ? 'refunded' : status === 3 || status === 4 ? 'past_due'
      : status === 2 ? 'cancelled' : renews ? 'active' : 'cancel_at_period_end';
    // A status marked expired cannot carry a future entitlement end.
    if (status === 2 && tx.expiresDate! > input.now()) throw new Error('apple_status_inconsistent');
    const stable = { ownerId: context.authenticatedOwnerId, origin: 'apple_app_store' as const, environment: input.environment,
      providerSubscriptionRef: tx.originalTransactionId!, providerTransactionRef: tx.transactionId!, productId: tx.productId!, basePlanId: null, offerId: null,
      mappedPriceVersionId: mapping.price.id, mappedPlanCode: mapping.price.planCode, mappedCadence: mapping.price.cadence,
      status: state, autoRenewEnabled: renews, currentPeriodStartsAt: new Date(tx.purchaseDate!).toISOString(), currentPeriodEndsAt: new Date(tx.expiresDate!).toISOString() };
    const instant = new Date(input.now()).toISOString();
    // A renewal can occur while the query is in flight. Its verified purchase/revocation
    // time is a causal lower bound, while re-signing an old payload is not.
    const observed = Math.max(observedAt, tx.purchaseDate!, tx.revocationDate ?? 0);
    return { verification: 'verified', accountBinding: 'matched', ...stable, storeObservedAt: new Date(observed).toISOString(), verifiedAt: instant,
      snapshotHash: createHash('sha256').update(JSON.stringify(stable)).digest('hex') };
  }
  async function safe<T>(work: () => Promise<T>): Promise<ProviderResult<T>> {
    try { return { ok: true, value: await work() }; }
    catch(error) { return { ok: false, error: { code: error instanceof Error&&error.message==='apple_policy_review_required'?'unsupported_operation':'verification_failed', retryable: !(error instanceof Error&&error.message==='apple_policy_review_required'), correlationId: null } }; }
  }
  return {
    origin: 'apple_app_store', environment: input.environment,
    async verifyPurchase({ context, request }) {
      return safe(async () => {
        if (request.store !== 'apple_app_store') throw new Error('apple_store');
        const tx = await input.verifier.verifyAndDecodeTransaction(request.opaqueVerificationPayload);
        checked(tx, context);
        if (tx.productId !== request.productId) throw new Error('apple_product_mismatch');
        // This proof only identifies the chain. The service must query current state before any write.
        return normalize(tx, context, 1, true);
      });
    },
    async querySubscription({ context, origin, providerSubscriptionRef }) {
      return safe(async () => {
        if (origin !== 'apple_app_store' || !reference.test(providerSubscriptionRef)) throw new Error('apple_chain');
        // Order by query START, so a slow older query cannot override a later query's result.
        const queryStartedAt = input.now();
        const response: StatusResponse = await input.client.getAllSubscriptionStatuses(providerSubscriptionRef);
        if (response.environment !== appleEnv(input.environment) || response.bundleId !== input.bundleId
          || input.environment === 'production' && response.appAppleId !== input.appAppleId || !Array.isArray(response.data)) throw new Error('apple_app_mismatch');
        const candidates = response.data.filter(g => g.subscriptionGroupIdentifier === input.subscriptionGroupId)
          .flatMap(g => g.lastTransactions ?? []).filter(t => t.originalTransactionId === providerSubscriptionRef);
        if (candidates.length !== 1) throw new Error('apple_chain_ambiguous');
        const current = candidates[0];
        if (!current.signedTransactionInfo || !current.signedRenewalInfo) throw new Error('apple_current_missing');
        const tx = await input.verifier.verifyAndDecodeTransaction(current.signedTransactionInfo);
        const renewal = await input.verifier.verifyAndDecodeRenewalInfo(current.signedRenewalInfo);
        checked(tx, context);
        if (tx.originalTransactionId !== providerSubscriptionRef || renewal.originalTransactionId !== providerSubscriptionRef
          || renewal.environment !== appleEnv(input.environment) || renewal.productId !== tx.productId
          || renewal.appAccountToken?.toLowerCase() !== context.expectedAccountBindingToken.toLowerCase()
          || ![0,1].includes(renewal.autoRenewStatus ?? -1) || !Number.isSafeInteger(renewal.signedDate)
          || renewal.signedDate! > input.now()) throw new Error('apple_renewal_mismatch');
        return normalize(tx, context, current.status!, renewal.autoRenewStatus === 1, queryStartedAt);
      });
    },
  };
}
