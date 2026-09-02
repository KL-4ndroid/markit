import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FOUNDER_OFFER_CODE,
  SUBSCRIPTION_PRICE_CATALOG,
  SUBSCRIPTION_PRICE_VERSION_IDS,
  resolveFounderLockTransition,
  resolveFounderOfferEligibility,
  resolveFounderPriceAssignment,
  resolvePlanChangePolicy,
  resolvePlanChangeQuote,
  resolveRenewalPrice,
  type FounderOfferEligibilityInput,
  type PriceAssignment,
} from '../lib/subscription/subscription-pricing';

const eligibleFounderInput: FounderOfferEligibilityInput = {
  trustedActorIsOwner: true,
  trustedTrialIsServerAuthoritative: true,
  trustedTrialStatus: 'trialing',
  trustedFounderOfferEligible: true,
  trustedOfferEnrollmentOpen: true,
  trustedPreviouslyAcquiredFounderOffer: false,
  trustedTrialEntitlementEndsAt: '2026-08-01T00:00:00.000Z',
  trustedEvaluatedAt: '2026-07-30T00:00:00.000Z',
};

assert.deepEqual(SUBSCRIPTION_PRICE_VERSION_IDS, [
  'pro_monthly_twd_launch_v1',
  'pro_annual_twd_launch_v1',
  'pro_founder_annual_twd_launch_v1',
  'team_monthly_twd_launch_v1',
  'team_annual_twd_launch_v1',
]);
assert.equal(SUBSCRIPTION_PRICE_CATALOG.pro_monthly_twd_launch_v1.amountMinor, 199);
assert.equal(SUBSCRIPTION_PRICE_CATALOG.pro_annual_twd_launch_v1.amountMinor, 1_990);
assert.equal(SUBSCRIPTION_PRICE_CATALOG.pro_founder_annual_twd_launch_v1.amountMinor, 1_290);
assert.equal(SUBSCRIPTION_PRICE_CATALOG.team_monthly_twd_launch_v1.amountMinor, 499);
assert.equal(SUBSCRIPTION_PRICE_CATALOG.team_annual_twd_launch_v1.amountMinor, 4_990);

for (const price of Object.values(SUBSCRIPTION_PRICE_CATALOG)) {
  assert.equal(price.currency, 'TWD');
  assert.equal(price.runtimeStatus, 'candidate');
  assert.equal(price.effectiveAt, null);
  assert.equal(Object.isFrozen(price), true);
}
assert.equal(Object.isFrozen(SUBSCRIPTION_PRICE_CATALOG), true);
assert.equal(
  SUBSCRIPTION_PRICE_CATALOG.pro_founder_annual_twd_launch_v1.offerCode,
  FOUNDER_OFFER_CODE,
);
assert.equal(SUBSCRIPTION_PRICE_CATALOG.pro_founder_annual_twd_launch_v1.policy, 'founder_locked');
assert.equal(SUBSCRIPTION_PRICE_CATALOG.team_annual_twd_launch_v1.policy, 'standard');

const eligible = resolveFounderOfferEligibility(eligibleFounderInput);
assert.equal(eligible.eligible, true);
assert.deepEqual(eligible.blockedReasons, []);
assert.equal(eligible.assignedAmountMinor, 1_290);
assert.equal(eligible.priceVersionId, 'pro_founder_annual_twd_launch_v1');

const ineligible = resolveFounderOfferEligibility({
  ...eligibleFounderInput,
  trustedActorIsOwner: false,
  trustedTrialIsServerAuthoritative: false,
  trustedFounderOfferEligible: false,
  trustedOfferEnrollmentOpen: false,
  trustedPreviouslyAcquiredFounderOffer: true,
  trustedTrialStatus: 'inactive',
});
assert.equal(ineligible.eligible, false);
assert.deepEqual(ineligible.blockedReasons, [
  'not_owner',
  'trial_not_server_authoritative',
  'trial_not_active',
  'founder_flag_not_granted',
  'offer_enrollment_closed',
  'already_acquired',
]);

const atTrialBoundary = resolveFounderOfferEligibility({
  ...eligibleFounderInput,
  trustedEvaluatedAt: eligibleFounderInput.trustedTrialEntitlementEndsAt ?? '',
});
assert.deepEqual(atTrialBoundary.blockedReasons, ['trial_expired']);

const invalidTrustedTime = resolveFounderOfferEligibility({
  ...eligibleFounderInput,
  trustedEvaluatedAt: '2026-07-30',
});
assert.deepEqual(invalidTrustedTime.blockedReasons, ['invalid_trusted_time']);

const founderAssignmentDecision = resolveFounderPriceAssignment(eligibleFounderInput);
assert.equal(founderAssignmentDecision.status, 'candidate');
assert.equal(founderAssignmentDecision.billable, false);
assert.ok(founderAssignmentDecision.status === 'candidate');
assert.deepEqual(founderAssignmentDecision.assignment, {
  priceVersionId: 'pro_founder_annual_twd_launch_v1',
  planCode: 'pro',
  cadence: 'annual',
  currency: 'TWD',
  assignedAmountMinor: 1_290,
  policy: 'founder_locked',
  founderOfferCode: FOUNDER_OFFER_CODE,
  founderLockStatus: 'active',
  assignedAt: eligibleFounderInput.trustedEvaluatedAt,
});

const blockedAssignment = resolveFounderPriceAssignment({
  ...eligibleFounderInput,
  trustedPreviouslyAcquiredFounderOffer: true,
});
assert.equal(blockedAssignment.status, 'blocked');

const founderAssignment: PriceAssignment = {
  assignmentId: 'assignment-founder-1',
  ...founderAssignmentDecision.assignment,
};
assert.deepEqual(resolveRenewalPrice(founderAssignment), {
  status: 'ready',
  amountMinor: 1_290,
  currency: 'TWD',
  priceVersionId: 'pro_founder_annual_twd_launch_v1',
  source: 'stored_assignment',
});
assert.equal(
  resolveRenewalPrice({ ...founderAssignment, founderLockStatus: 'dormant' }).status,
  'blocked',
);
assert.equal(
  resolveRenewalPrice({ ...founderAssignment, founderLockStatus: 'forfeited' }).status,
  'blocked',
);

const migratedPublicCatalogPrice = {
  ...founderAssignment,
  assignedAmountMinor: 1_290,
  priceVersionId: 'pro_founder_annual_twd_launch_v1' as const,
};
const migratedRenewal = resolveRenewalPrice(migratedPublicCatalogPrice);
assert.equal(migratedRenewal.status, 'ready');
assert.ok(migratedRenewal.status === 'ready');
assert.equal(migratedRenewal.amountMinor, 1_290);

assert.deepEqual(
  resolveFounderLockTransition({
    currentStatus: 'active',
    event: 'cancellation_scheduled',
    trustedPaidContinuityUnbroken: true,
  }),
  {
    status: 'applied',
    previousStatus: 'active',
    nextStatus: 'active',
    reason: 'preserved',
  },
);
assert.equal(
  resolveFounderLockTransition({
    currentStatus: 'active',
    event: 'grace_started',
    trustedPaidContinuityUnbroken: true,
  }).nextStatus,
  'grace',
);
assert.equal(
  resolveFounderLockTransition({
    currentStatus: 'grace',
    event: 'payment_recovered',
    trustedPaidContinuityUnbroken: true,
  }).nextStatus,
  'active',
);
assert.equal(
  resolveFounderLockTransition({
    currentStatus: 'active',
    event: 'team_upgrade_confirmed',
    trustedPaidContinuityUnbroken: true,
  }).nextStatus,
  'dormant',
);
assert.equal(
  resolveFounderLockTransition({
    currentStatus: 'dormant',
    event: 'team_to_pro_confirmed',
    trustedPaidContinuityUnbroken: true,
  }).nextStatus,
  'active',
);
assert.equal(
  resolveFounderLockTransition({
    currentStatus: 'dormant',
    event: 'paid_entitlement_lapsed',
    trustedPaidContinuityUnbroken: false,
  }).nextStatus,
  'forfeited',
);
assert.equal(
  resolveFounderLockTransition({
    currentStatus: 'forfeited',
    event: 'renewal_succeeded',
    trustedPaidContinuityUnbroken: true,
  }).nextStatus,
  'forfeited',
);
assert.equal(
  resolveFounderLockTransition({
    currentStatus: 'active',
    event: 'team_upgrade_confirmed',
    trustedPaidContinuityUnbroken: false,
  }).status,
  'blocked',
);

const proToTeamPending = resolvePlanChangePolicy({
  fromPlanCode: 'pro',
  toPlanCode: 'team',
  requestedTargetPriceVersionId: 'team_annual_twd_launch_v1',
  dormantFounderPriceVersionId: null,
  founderLockStatus: 'active',
  trustedEvaluatedAt: '2026-07-30T00:00:00.000Z',
  trustedCurrentPeriodEndsAt: '2027-01-01T00:00:00.000Z',
  trustedProviderTransitionConfirmed: false,
  trustedPaidContinuityUnbroken: true,
});
assert.equal(proToTeamPending.status, 'pending_payment');
assert.equal(proToTeamPending.effectivePlanCode, 'pro');
assert.equal(proToTeamPending.founderLockStatus, 'active');

const proToTeamConfirmed = resolvePlanChangePolicy({
  ...{
    fromPlanCode: 'pro' as const,
    toPlanCode: 'team' as const,
    requestedTargetPriceVersionId: 'team_annual_twd_launch_v1' as const,
    dormantFounderPriceVersionId: null,
    founderLockStatus: 'active' as const,
    trustedEvaluatedAt: '2026-07-30T00:00:00.000Z',
    trustedCurrentPeriodEndsAt: '2027-01-01T00:00:00.000Z',
    trustedPaidContinuityUnbroken: true,
  },
  trustedProviderTransitionConfirmed: true,
});
assert.equal(proToTeamConfirmed.status, 'effective');
assert.equal(proToTeamConfirmed.effectivePlanCode, 'team');
assert.equal(proToTeamConfirmed.targetPriceVersionId, 'team_annual_twd_launch_v1');
assert.equal(proToTeamConfirmed.targetPriceSource, 'current_public_price');
assert.equal(proToTeamConfirmed.founderLockStatus, 'dormant');
assert.equal(proToTeamConfirmed.founderLockAction, 'to_dormant');

const proToTeamWithoutContinuity = resolvePlanChangePolicy({
  fromPlanCode: 'pro',
  toPlanCode: 'team',
  requestedTargetPriceVersionId: 'team_annual_twd_launch_v1',
  dormantFounderPriceVersionId: null,
  founderLockStatus: 'active',
  trustedEvaluatedAt: '2026-07-30T00:00:00.000Z',
  trustedCurrentPeriodEndsAt: '2027-01-01T00:00:00.000Z',
  trustedProviderTransitionConfirmed: true,
  trustedPaidContinuityUnbroken: false,
});
assert.equal(proToTeamWithoutContinuity.status, 'blocked');
assert.equal(proToTeamWithoutContinuity.effectivePlanCode, 'pro');

const teamToFounderScheduled = resolvePlanChangePolicy({
  fromPlanCode: 'team',
  toPlanCode: 'pro',
  requestedTargetPriceVersionId: 'pro_annual_twd_launch_v1',
  dormantFounderPriceVersionId: 'pro_founder_annual_twd_launch_v1',
  founderLockStatus: 'dormant',
  trustedEvaluatedAt: '2026-07-30T00:00:00.000Z',
  trustedCurrentPeriodEndsAt: '2026-08-15T00:00:00.000Z',
  trustedProviderTransitionConfirmed: false,
  trustedPaidContinuityUnbroken: true,
});
assert.equal(teamToFounderScheduled.status, 'scheduled');
assert.equal(teamToFounderScheduled.effectivePlanCode, 'team');
assert.equal(teamToFounderScheduled.targetPriceSource, 'dormant_founder_assignment');
assert.equal(
  teamToFounderScheduled.targetPriceVersionId,
  'pro_founder_annual_twd_launch_v1',
);
assert.equal(teamToFounderScheduled.founderLockAction, 'restore_active');

const teamToFounderPendingConfirmation = resolvePlanChangePolicy({
  fromPlanCode: 'team',
  toPlanCode: 'pro',
  requestedTargetPriceVersionId: 'pro_annual_twd_launch_v1',
  dormantFounderPriceVersionId: 'pro_founder_annual_twd_launch_v1',
  founderLockStatus: 'dormant',
  trustedEvaluatedAt: '2026-08-15T00:00:00.000Z',
  trustedCurrentPeriodEndsAt: '2026-08-15T00:00:00.000Z',
  trustedProviderTransitionConfirmed: false,
  trustedPaidContinuityUnbroken: true,
});
assert.equal(teamToFounderPendingConfirmation.status, 'pending_provider_confirmation');

const teamToFounderConfirmed = resolvePlanChangePolicy({
  fromPlanCode: 'team',
  toPlanCode: 'pro',
  requestedTargetPriceVersionId: 'pro_annual_twd_launch_v1',
  dormantFounderPriceVersionId: 'pro_founder_annual_twd_launch_v1',
  founderLockStatus: 'dormant',
  trustedEvaluatedAt: '2026-08-15T00:00:01.000Z',
  trustedCurrentPeriodEndsAt: '2026-08-15T00:00:00.000Z',
  trustedProviderTransitionConfirmed: true,
  trustedPaidContinuityUnbroken: true,
});
assert.equal(teamToFounderConfirmed.status, 'effective');
assert.equal(teamToFounderConfirmed.effectivePlanCode, 'pro');
assert.equal(teamToFounderConfirmed.founderLockStatus, 'active');

const brokenContinuity = resolvePlanChangePolicy({
  fromPlanCode: 'team',
  toPlanCode: 'pro',
  requestedTargetPriceVersionId: 'pro_annual_twd_launch_v1',
  dormantFounderPriceVersionId: 'pro_founder_annual_twd_launch_v1',
  founderLockStatus: 'dormant',
  trustedEvaluatedAt: '2026-08-15T00:00:01.000Z',
  trustedCurrentPeriodEndsAt: '2026-08-15T00:00:00.000Z',
  trustedProviderTransitionConfirmed: true,
  trustedPaidContinuityUnbroken: false,
});
assert.equal(brokenContinuity.targetPriceVersionId, 'pro_annual_twd_launch_v1');
assert.equal(brokenContinuity.targetPriceSource, 'current_public_price');
assert.equal(brokenContinuity.founderLockStatus, 'forfeited');

const serverSignedQuote = resolvePlanChangeQuote({
  mode: 'server_signed_quote',
  quoteId: 'quote-1',
  providerSnapshotRef: 'provider-snapshot-1',
  trustedProviderSnapshotVerified: true,
  trustedEvaluatedAt: '2026-07-06T00:00:00.000Z',
  expiresAt: '2026-07-06T00:10:00.000Z',
  actualPaidAmountMinor: 1_290,
  paidPeriodStartsAt: '2026-07-01T00:00:00.000Z',
  paidPeriodEndsAt: '2026-07-11T00:00:00.000Z',
  effectiveAt: '2026-07-06T00:00:00.000Z',
  targetPriceVersionId: 'team_annual_twd_launch_v1',
  trustedNextRenewalAt: '2027-07-06T00:00:00.000Z',
});
assert.equal(serverSignedQuote.status, 'ready_for_server_signature');
assert.equal(serverSignedQuote.mode, 'server_signed_quote');
assert.deepEqual(serverSignedQuote.values, {
  actualPaidAmountMinor: 1_290,
  unusedValueMinor: 645,
  chargeAmountMinor: 4_990,
  refundOrCreditAmountMinor: 645,
  netAmountMinor: 4_345,
  currency: 'TWD',
  effectiveAt: '2026-07-06T00:00:00.000Z',
  nextRenewalAt: '2027-07-06T00:00:00.000Z',
});

const halfUpQuote = resolvePlanChangeQuote({
  mode: 'server_signed_quote',
  quoteId: 'quote-half-up',
  providerSnapshotRef: 'provider-snapshot-half-up',
  trustedProviderSnapshotVerified: true,
  trustedEvaluatedAt: '2026-07-02T00:00:00.000Z',
  expiresAt: '2026-07-02T00:10:00.000Z',
  actualPaidAmountMinor: 1,
  paidPeriodStartsAt: '2026-07-01T00:00:00.000Z',
  paidPeriodEndsAt: '2026-07-03T00:00:00.000Z',
  effectiveAt: '2026-07-02T00:00:00.000Z',
  targetPriceVersionId: 'team_monthly_twd_launch_v1',
  trustedNextRenewalAt: null,
});
assert.equal(halfUpQuote.values.unusedValueMinor, 1);

const unverifiedQuote = resolvePlanChangeQuote({
  mode: 'server_signed_quote',
  quoteId: 'quote-unverified',
  providerSnapshotRef: 'provider-snapshot-unverified',
  trustedProviderSnapshotVerified: false,
  trustedEvaluatedAt: '2026-07-01T00:00:00.000Z',
  expiresAt: '2026-07-01T00:10:00.000Z',
  actualPaidAmountMinor: 1_290,
  paidPeriodStartsAt: '2026-07-01T00:00:00.000Z',
  paidPeriodEndsAt: '2026-07-11T00:00:00.000Z',
  effectiveAt: '2026-07-06T00:00:00.000Z',
  targetPriceVersionId: 'team_annual_twd_launch_v1',
  trustedNextRenewalAt: null,
});
assert.equal(unverifiedQuote.status, 'blocked');
assert.equal(unverifiedQuote.mode, 'support_required');

const providerQuote = resolvePlanChangeQuote({
  mode: 'provider_quote',
  quoteId: 'provider-quote-1',
  providerSnapshotRef: 'provider-snapshot-2',
  trustedProviderSnapshotVerified: true,
  trustedEvaluatedAt: '2026-07-01T00:00:00.000Z',
  expiresAt: '2026-07-01T00:10:00.000Z',
  values: {
    actualPaidAmountMinor: 1_290,
    unusedValueMinor: null,
    chargeAmountMinor: 4_500,
    refundOrCreditAmountMinor: null,
    netAmountMinor: 4_500,
    currency: 'TWD',
    effectiveAt: null,
    nextRenewalAt: null,
  },
});
assert.equal(providerQuote.status, 'ready');
assert.equal(providerQuote.values.unusedValueMinor, null);

const providerConfirmation = resolvePlanChangeQuote({ mode: 'provider_confirmation' });
assert.equal(providerConfirmation.status, 'provider_confirmation');
assert.equal(providerConfirmation.values.chargeAmountMinor, null);

const supportRequired = resolvePlanChangeQuote({ mode: 'support_required' });
assert.equal(supportRequired.status, 'blocked');
assert.equal(supportRequired.values.effectiveAt, null);

const source = readFileSync(
  join(__dirname, '../lib/subscription/subscription-pricing.ts'),
  'utf8',
);
const implementationPlan = readFileSync(
  join(__dirname, '../docs/SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md'),
  'utf8',
);
const executionPack = readFileSync(
  join(__dirname, '../docs/subscription/execution-pack/08_PLATFORM_RESERVE_AND_BILLING_S7_S9.md'),
  'utf8',
);
const testManifest = readFileSync(join(__dirname, '../scripts/test-files.txt'), 'utf8');
assert.doesNotMatch(
  source,
  /react|next\/|supabase|dexie|window|localStorage|sessionStorage|document\.|fetch\(|@capacitor|revenuecat|stripe|paddle|newebpay|ecpay/i,
);
assert.doesNotMatch(source, /Date\.now\(|Math\.random\(|crypto\./);
assert.ok(source.includes("runtimeStatus: 'candidate'"));
assert.ok(source.includes("status: 'ready_for_server_signature'"));
assert.ok(implementationPlan.includes('Status: implemented locally on 2026-07-30'));
assert.ok(implementationPlan.includes('every catalog price remains `candidate`'));
assert.ok(implementationPlan.includes('Founder assignment resolver returns `billable: false`'));
assert.ok(
  implementationPlan.includes(
    'F1 completion alone does not authorize offer or checkout presentation',
  ),
);
assert.ok(executionPack.includes('F1 canonical implementation'));
assert.ok(executionPack.includes('F3-design 已通過 schema / RLS / idempotency threat-model'));
assert.ok(testManifest.includes('tsx tests/subscription-pricing.test.ts'));

console.log('PASS F1 pure price catalog, Founder lock, plan change, and quote decisions');
