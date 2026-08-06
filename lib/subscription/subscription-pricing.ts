import type { AccountPlanCode } from './subscription-plans';

export const FOUNDER_OFFER_CODE = 'pro_founder_annual_65' as const;

export const SUBSCRIPTION_PRICE_VERSION_IDS = [
  'pro_monthly_twd_launch_v1',
  'pro_annual_twd_launch_v1',
  'pro_founder_annual_twd_launch_v1',
  'team_monthly_twd_launch_v1',
  'team_annual_twd_launch_v1',
] as const;

export type SubscriptionPriceVersionId = typeof SUBSCRIPTION_PRICE_VERSION_IDS[number];
export type PaidPlanCode = Exclude<AccountPlanCode, 'free'>;
export type BillingCadence = 'monthly' | 'annual';
export type PricePolicy = 'standard' | 'founder_locked';
export type PriceLockStatus = 'active' | 'grace' | 'dormant' | 'forfeited';
export type PriceRuntimeStatus = 'candidate' | 'active' | 'blocked_pending_commercial_approval';

export type SubscriptionPriceVersion = Readonly<{
  id: SubscriptionPriceVersionId;
  planCode: PaidPlanCode;
  cadence: BillingCadence;
  currency: 'TWD';
  amountMinor: number;
  policy: PricePolicy;
  offerCode: typeof FOUNDER_OFFER_CODE | null;
  runtimeStatus: PriceRuntimeStatus;
  effectiveAt: string | null;
}>;

const priceVersion = (value: SubscriptionPriceVersion): SubscriptionPriceVersion =>
  Object.freeze(value);

export const SUBSCRIPTION_PRICE_CATALOG: Readonly<
  Record<SubscriptionPriceVersionId, SubscriptionPriceVersion>
> = Object.freeze({
  pro_monthly_twd_launch_v1: priceVersion({
    id: 'pro_monthly_twd_launch_v1',
    planCode: 'pro',
    cadence: 'monthly',
    currency: 'TWD',
    amountMinor: 199,
    policy: 'standard',
    offerCode: null,
    runtimeStatus: 'candidate',
    effectiveAt: null,
  }),
  pro_annual_twd_launch_v1: priceVersion({
    id: 'pro_annual_twd_launch_v1',
    planCode: 'pro',
    cadence: 'annual',
    currency: 'TWD',
    amountMinor: 1_990,
    policy: 'standard',
    offerCode: null,
    runtimeStatus: 'candidate',
    effectiveAt: null,
  }),
  pro_founder_annual_twd_launch_v1: priceVersion({
    id: 'pro_founder_annual_twd_launch_v1',
    planCode: 'pro',
    cadence: 'annual',
    currency: 'TWD',
    amountMinor: 1_290,
    policy: 'founder_locked',
    offerCode: FOUNDER_OFFER_CODE,
    runtimeStatus: 'candidate',
    effectiveAt: null,
  }),
  team_monthly_twd_launch_v1: priceVersion({
    id: 'team_monthly_twd_launch_v1',
    planCode: 'team',
    cadence: 'monthly',
    currency: 'TWD',
    amountMinor: 499,
    policy: 'standard',
    offerCode: null,
    runtimeStatus: 'candidate',
    effectiveAt: null,
  }),
  team_annual_twd_launch_v1: priceVersion({
    id: 'team_annual_twd_launch_v1',
    planCode: 'team',
    cadence: 'annual',
    currency: 'TWD',
    amountMinor: 4_990,
    policy: 'standard',
    offerCode: null,
    runtimeStatus: 'candidate',
    effectiveAt: null,
  }),
});

export function isSubscriptionPriceVersionId(
  value: unknown,
): value is SubscriptionPriceVersionId {
  return (
    typeof value === 'string' &&
    SUBSCRIPTION_PRICE_VERSION_IDS.includes(value as SubscriptionPriceVersionId)
  );
}

export function getSubscriptionPriceVersion(
  id: SubscriptionPriceVersionId,
): SubscriptionPriceVersion {
  return SUBSCRIPTION_PRICE_CATALOG[id];
}

export type FounderEligibilityBlockReason =
  | 'not_owner'
  | 'trial_not_server_authoritative'
  | 'trial_not_active'
  | 'founder_flag_not_granted'
  | 'offer_enrollment_closed'
  | 'already_acquired'
  | 'invalid_trusted_time'
  | 'trial_expired';

export type FounderOfferEligibilityInput = Readonly<{
  trustedActorIsOwner: boolean;
  trustedTrialIsServerAuthoritative: boolean;
  trustedTrialStatus: 'trialing' | 'inactive';
  trustedFounderOfferEligible: boolean;
  trustedOfferEnrollmentOpen: boolean;
  trustedPreviouslyAcquiredFounderOffer: boolean;
  trustedTrialEntitlementEndsAt: string | null;
  trustedEvaluatedAt: string;
}>;

export type FounderOfferEligibilityDecision = Readonly<{
  eligible: boolean;
  blockedReasons: readonly FounderEligibilityBlockReason[];
  offerCode: typeof FOUNDER_OFFER_CODE;
  priceVersionId: 'pro_founder_annual_twd_launch_v1';
  assignedAmountMinor: 1_290;
  currency: 'TWD';
}>;

function parseTrustedInstant(value: string | null): number | null {
  if (!value || !/[tT]/.test(value) || !/(?:[zZ]|[+-]\d{2}:\d{2})$/.test(value)) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function resolveFounderOfferEligibility(
  input: FounderOfferEligibilityInput,
): FounderOfferEligibilityDecision {
  const blockedReasons: FounderEligibilityBlockReason[] = [];
  const evaluatedAt = parseTrustedInstant(input.trustedEvaluatedAt);
  const entitlementEndsAt = parseTrustedInstant(input.trustedTrialEntitlementEndsAt);

  if (!input.trustedActorIsOwner) blockedReasons.push('not_owner');
  if (!input.trustedTrialIsServerAuthoritative) {
    blockedReasons.push('trial_not_server_authoritative');
  }
  if (input.trustedTrialStatus !== 'trialing') blockedReasons.push('trial_not_active');
  if (!input.trustedFounderOfferEligible) blockedReasons.push('founder_flag_not_granted');
  if (!input.trustedOfferEnrollmentOpen) blockedReasons.push('offer_enrollment_closed');
  if (input.trustedPreviouslyAcquiredFounderOffer) blockedReasons.push('already_acquired');

  if (evaluatedAt === null || entitlementEndsAt === null) {
    blockedReasons.push('invalid_trusted_time');
  } else if (evaluatedAt >= entitlementEndsAt) {
    blockedReasons.push('trial_expired');
  }

  return Object.freeze({
    eligible: blockedReasons.length === 0,
    blockedReasons: Object.freeze(blockedReasons),
    offerCode: FOUNDER_OFFER_CODE,
    priceVersionId: 'pro_founder_annual_twd_launch_v1',
    assignedAmountMinor: 1_290,
    currency: 'TWD',
  });
}

export type PriceAssignment = Readonly<{
  assignmentId: string;
  priceVersionId: SubscriptionPriceVersionId;
  planCode: PaidPlanCode;
  cadence: BillingCadence;
  currency: 'TWD';
  assignedAmountMinor: number;
  policy: PricePolicy;
  founderOfferCode: typeof FOUNDER_OFFER_CODE | null;
  founderLockStatus: PriceLockStatus | null;
  assignedAt: string;
}>;

export type FounderPriceAssignmentDecision =
  | Readonly<{
      status: 'candidate';
      billable: false;
      assignment: Omit<PriceAssignment, 'assignmentId'>;
    }>
  | Readonly<{
      status: 'blocked';
      billable: false;
      blockedReasons: readonly FounderEligibilityBlockReason[];
    }>;

export function resolveFounderPriceAssignment(
  input: FounderOfferEligibilityInput,
): FounderPriceAssignmentDecision {
  const eligibility = resolveFounderOfferEligibility(input);
  if (!eligibility.eligible) {
    return Object.freeze({
      status: 'blocked',
      billable: false,
      blockedReasons: eligibility.blockedReasons,
    });
  }

  return Object.freeze({
    status: 'candidate',
    billable: false,
    assignment: Object.freeze({
      priceVersionId: eligibility.priceVersionId,
      planCode: 'pro',
      cadence: 'annual',
      currency: eligibility.currency,
      assignedAmountMinor: eligibility.assignedAmountMinor,
      policy: 'founder_locked',
      founderOfferCode: eligibility.offerCode,
      founderLockStatus: 'active',
      assignedAt: input.trustedEvaluatedAt,
    }),
  });
}

export type RenewalPriceDecision =
  | Readonly<{
      status: 'ready';
      amountMinor: number;
      currency: 'TWD';
      priceVersionId: SubscriptionPriceVersionId;
      source: 'stored_assignment';
    }>
  | Readonly<{
      status: 'blocked';
      reason: 'invalid_assignment' | 'founder_lock_dormant' | 'founder_lock_forfeited';
    }>;

function isNonNegativeMinorAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function resolveRenewalPrice(assignment: PriceAssignment): RenewalPriceDecision {
  if (
    !assignment.assignmentId.trim() ||
    !isNonNegativeMinorAmount(assignment.assignedAmountMinor) ||
    assignment.currency !== 'TWD'
  ) {
    return Object.freeze({ status: 'blocked', reason: 'invalid_assignment' });
  }

  if (assignment.policy === 'founder_locked') {
    if (assignment.founderLockStatus === 'dormant') {
      return Object.freeze({ status: 'blocked', reason: 'founder_lock_dormant' });
    }
    if (assignment.founderLockStatus === 'forfeited') {
      return Object.freeze({ status: 'blocked', reason: 'founder_lock_forfeited' });
    }
    if (
      assignment.founderOfferCode !== FOUNDER_OFFER_CODE ||
      (assignment.founderLockStatus !== 'active' && assignment.founderLockStatus !== 'grace')
    ) {
      return Object.freeze({ status: 'blocked', reason: 'invalid_assignment' });
    }
  }

  return Object.freeze({
    status: 'ready',
    amountMinor: assignment.assignedAmountMinor,
    currency: assignment.currency,
    priceVersionId: assignment.priceVersionId,
    source: 'stored_assignment',
  });
}

export type FounderLockEvent =
  | 'renewal_succeeded'
  | 'cancellation_scheduled'
  | 'cancellation_revoked'
  | 'grace_started'
  | 'payment_recovered'
  | 'team_upgrade_confirmed'
  | 'team_renewed'
  | 'team_to_pro_confirmed'
  | 'dispute_opened'
  | 'paid_entitlement_lapsed'
  | 'full_refund_confirmed'
  | 'chargeback_lost'
  | 'dispute_lost'
  | 'abuse_forfeiture_approved';

export type FounderLockTransitionDecision = Readonly<{
  status: 'applied' | 'blocked';
  previousStatus: PriceLockStatus;
  nextStatus: PriceLockStatus;
  reason: 'preserved' | 'entered_grace' | 'recovered' | 'dormant_under_team' | 'restored' | 'forfeited' | 'invalid_transition';
}>;

const FORFEITURE_EVENTS: readonly FounderLockEvent[] = [
  'paid_entitlement_lapsed',
  'full_refund_confirmed',
  'chargeback_lost',
  'dispute_lost',
  'abuse_forfeiture_approved',
];

export function resolveFounderLockTransition(input: Readonly<{
  currentStatus: PriceLockStatus;
  event: FounderLockEvent;
  trustedPaidContinuityUnbroken: boolean;
}>): FounderLockTransitionDecision {
  const { currentStatus, event } = input;

  if (currentStatus === 'forfeited') {
    return Object.freeze({
      status: 'applied',
      previousStatus: currentStatus,
      nextStatus: 'forfeited',
      reason: 'forfeited',
    });
  }

  if (FORFEITURE_EVENTS.includes(event)) {
    return Object.freeze({
      status: 'applied',
      previousStatus: currentStatus,
      nextStatus: 'forfeited',
      reason: 'forfeited',
    });
  }

  if (event === 'grace_started' && currentStatus === 'active') {
    return Object.freeze({
      status: 'applied',
      previousStatus: currentStatus,
      nextStatus: 'grace',
      reason: 'entered_grace',
    });
  }

  if (
    (event === 'payment_recovered' || event === 'renewal_succeeded') &&
    currentStatus === 'grace'
  ) {
    return Object.freeze({
      status: 'applied',
      previousStatus: currentStatus,
      nextStatus: 'active',
      reason: 'recovered',
    });
  }

  if (
    event === 'team_upgrade_confirmed' &&
    (currentStatus === 'active' || currentStatus === 'grace') &&
    input.trustedPaidContinuityUnbroken
  ) {
    return Object.freeze({
      status: 'applied',
      previousStatus: currentStatus,
      nextStatus: 'dormant',
      reason: 'dormant_under_team',
    });
  }

  if (
    event === 'team_to_pro_confirmed' &&
    currentStatus === 'dormant' &&
    input.trustedPaidContinuityUnbroken
  ) {
    return Object.freeze({
      status: 'applied',
      previousStatus: currentStatus,
      nextStatus: 'active',
      reason: 'restored',
    });
  }

  const preservesActive =
    currentStatus === 'active' &&
    ['renewal_succeeded', 'cancellation_scheduled', 'cancellation_revoked', 'dispute_opened'].includes(
      event,
    );
  const preservesGrace =
    currentStatus === 'grace' &&
    ['cancellation_scheduled', 'cancellation_revoked', 'dispute_opened'].includes(event);
  const preservesDormant =
    currentStatus === 'dormant' &&
    ['team_renewed', 'cancellation_scheduled', 'cancellation_revoked', 'dispute_opened'].includes(
      event,
    );

  if (preservesActive || preservesGrace || preservesDormant) {
    return Object.freeze({
      status: 'applied',
      previousStatus: currentStatus,
      nextStatus: currentStatus,
      reason: 'preserved',
    });
  }

  return Object.freeze({
    status: 'blocked',
    previousStatus: currentStatus,
    nextStatus: currentStatus,
    reason: 'invalid_transition',
  });
}

export type PlanChangePolicyDecision = Readonly<{
  status: 'pending_payment' | 'scheduled' | 'pending_provider_confirmation' | 'effective' | 'blocked';
  effectivePlanCode: PaidPlanCode;
  targetPriceVersionId: SubscriptionPriceVersionId | null;
  targetPriceSource: 'current_public_price' | 'dormant_founder_assignment' | null;
  effectiveAt: string | null;
  founderLockStatus: PriceLockStatus | null;
  founderLockAction: 'none' | 'to_dormant' | 'restore_active' | 'forfeit' | null;
  reason: 'payment_required' | 'renewal_boundary' | 'provider_confirmation_required' | 'confirmed' | 'unsupported_transition' | 'invalid_input';
}>;

export function resolvePlanChangePolicy(input: Readonly<{
  fromPlanCode: PaidPlanCode;
  toPlanCode: PaidPlanCode;
  requestedTargetPriceVersionId: SubscriptionPriceVersionId;
  dormantFounderPriceVersionId: SubscriptionPriceVersionId | null;
  founderLockStatus: PriceLockStatus | null;
  trustedEvaluatedAt: string;
  trustedCurrentPeriodEndsAt: string;
  trustedProviderTransitionConfirmed: boolean;
  trustedPaidContinuityUnbroken: boolean;
}>): PlanChangePolicyDecision {
  const evaluatedAt = parseTrustedInstant(input.trustedEvaluatedAt);
  const periodEndsAt = parseTrustedInstant(input.trustedCurrentPeriodEndsAt);
  const requestedTarget = getSubscriptionPriceVersion(input.requestedTargetPriceVersionId);

  if (
    evaluatedAt === null ||
    periodEndsAt === null ||
    requestedTarget.planCode !== input.toPlanCode
  ) {
    return Object.freeze({
      status: 'blocked',
      effectivePlanCode: input.fromPlanCode,
      targetPriceVersionId: null,
      targetPriceSource: null,
      effectiveAt: null,
      founderLockStatus: input.founderLockStatus,
      founderLockAction: null,
      reason: 'invalid_input',
    });
  }

  if (input.fromPlanCode === input.toPlanCode) {
    return Object.freeze({
      status: 'blocked',
      effectivePlanCode: input.fromPlanCode,
      targetPriceVersionId: null,
      targetPriceSource: null,
      effectiveAt: null,
      founderLockStatus: input.founderLockStatus,
      founderLockAction: null,
      reason: 'unsupported_transition',
    });
  }

  if (input.fromPlanCode === 'pro' && input.toPlanCode === 'team') {
    if (
      input.founderLockStatus === 'dormant' ||
      ((input.founderLockStatus === 'active' || input.founderLockStatus === 'grace') &&
        input.trustedProviderTransitionConfirmed &&
        !input.trustedPaidContinuityUnbroken)
    ) {
      return Object.freeze({
        status: 'blocked',
        effectivePlanCode: 'pro',
        targetPriceVersionId: null,
        targetPriceSource: null,
        effectiveAt: null,
        founderLockStatus: input.founderLockStatus,
        founderLockAction: null,
        reason: 'invalid_input',
      });
    }

    if (!input.trustedProviderTransitionConfirmed) {
      return Object.freeze({
        status: 'pending_payment',
        effectivePlanCode: 'pro',
        targetPriceVersionId: input.requestedTargetPriceVersionId,
        targetPriceSource: 'current_public_price',
        effectiveAt: null,
        founderLockStatus: input.founderLockStatus,
        founderLockAction: 'none',
        reason: 'payment_required',
      });
    }

    const shouldDormant =
      input.trustedPaidContinuityUnbroken &&
      (input.founderLockStatus === 'active' || input.founderLockStatus === 'grace');

    return Object.freeze({
      status: 'effective',
      effectivePlanCode: 'team',
      targetPriceVersionId: input.requestedTargetPriceVersionId,
      targetPriceSource: 'current_public_price',
      effectiveAt: input.trustedEvaluatedAt,
      founderLockStatus: shouldDormant ? 'dormant' : input.founderLockStatus,
      founderLockAction: shouldDormant ? 'to_dormant' : 'none',
      reason: 'confirmed',
    });
  }

  if (input.fromPlanCode === 'team' && input.toPlanCode === 'pro') {
    const canRestoreFounder =
      input.founderLockStatus === 'dormant' && input.trustedPaidContinuityUnbroken;
    const founderPrice = input.dormantFounderPriceVersionId
      ? getSubscriptionPriceVersion(input.dormantFounderPriceVersionId)
      : null;

    if (
      canRestoreFounder &&
      (!founderPrice ||
        founderPrice.policy !== 'founder_locked' ||
        founderPrice.planCode !== 'pro')
    ) {
      return Object.freeze({
        status: 'blocked',
        effectivePlanCode: 'team',
        targetPriceVersionId: null,
        targetPriceSource: null,
        effectiveAt: null,
        founderLockStatus: input.founderLockStatus,
        founderLockAction: null,
        reason: 'invalid_input',
      });
    }

    const targetPriceVersionId = canRestoreFounder
      ? input.dormantFounderPriceVersionId
      : input.requestedTargetPriceVersionId;
    const targetPriceSource = canRestoreFounder
      ? 'dormant_founder_assignment'
      : 'current_public_price';

    if (evaluatedAt < periodEndsAt) {
      return Object.freeze({
        status: 'scheduled',
        effectivePlanCode: 'team',
        targetPriceVersionId,
        targetPriceSource,
        effectiveAt: input.trustedCurrentPeriodEndsAt,
        founderLockStatus: input.founderLockStatus,
        founderLockAction: canRestoreFounder ? 'restore_active' : 'none',
        reason: 'renewal_boundary',
      });
    }

    if (!input.trustedProviderTransitionConfirmed) {
      return Object.freeze({
        status: 'pending_provider_confirmation',
        effectivePlanCode: 'team',
        targetPriceVersionId,
        targetPriceSource,
        effectiveAt: input.trustedCurrentPeriodEndsAt,
        founderLockStatus: input.founderLockStatus,
        founderLockAction: canRestoreFounder ? 'restore_active' : 'none',
        reason: 'provider_confirmation_required',
      });
    }

    const founderWasBroken =
      input.founderLockStatus === 'dormant' && !input.trustedPaidContinuityUnbroken;

    return Object.freeze({
      status: 'effective',
      effectivePlanCode: 'pro',
      targetPriceVersionId,
      targetPriceSource,
      effectiveAt: input.trustedCurrentPeriodEndsAt,
      founderLockStatus: canRestoreFounder
        ? 'active'
        : founderWasBroken
          ? 'forfeited'
          : input.founderLockStatus,
      founderLockAction: canRestoreFounder
        ? 'restore_active'
        : founderWasBroken
          ? 'forfeit'
          : 'none',
      reason: 'confirmed',
    });
  }

  return Object.freeze({
    status: 'blocked',
    effectivePlanCode: input.fromPlanCode,
    targetPriceVersionId: null,
    targetPriceSource: null,
    effectiveAt: null,
    founderLockStatus: input.founderLockStatus,
    founderLockAction: null,
    reason: 'unsupported_transition',
  });
}

export type PlanChangeQuoteMode =
  | 'provider_quote'
  | 'server_signed_quote'
  | 'provider_confirmation'
  | 'support_required';

export type PlanChangeQuoteValues = Readonly<{
  actualPaidAmountMinor: number | null;
  unusedValueMinor: number | null;
  chargeAmountMinor: number | null;
  refundOrCreditAmountMinor: number | null;
  netAmountMinor: number | null;
  currency: 'TWD';
  effectiveAt: string | null;
  nextRenewalAt: string | null;
}>;

export type PlanChangeQuoteResolution =
  | Readonly<{
      status: 'ready' | 'ready_for_server_signature';
      mode: 'provider_quote' | 'server_signed_quote';
      quoteId: string;
      expiresAt: string;
      providerSnapshotRef: string;
      values: PlanChangeQuoteValues;
    }>
  | Readonly<{
      status: 'provider_confirmation';
      mode: 'provider_confirmation';
      values: PlanChangeQuoteValues;
    }>
  | Readonly<{
      status: 'blocked';
      mode: 'support_required';
      reason: 'invalid_input' | 'provider_snapshot_unverified' | 'exact_quote_unavailable';
      values: PlanChangeQuoteValues;
    }>;

const EMPTY_QUOTE_VALUES: PlanChangeQuoteValues = Object.freeze({
  actualPaidAmountMinor: null,
  unusedValueMinor: null,
  chargeAmountMinor: null,
  refundOrCreditAmountMinor: null,
  netAmountMinor: null,
  currency: 'TWD',
  effectiveAt: null,
  nextRenewalAt: null,
});

function isValidOptionalInstant(value: string | null): boolean {
  return value === null || parseTrustedInstant(value) !== null;
}

function roundHalfUpFraction(numerator: number, denominator: number): number | null {
  if (
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    denominator <= 0 ||
    numerator < 0
  ) {
    return null;
  }

  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  const rounded = quotient + (remainder >= Math.ceil(denominator / 2) ? 1 : 0);
  return Number.isSafeInteger(rounded) ? rounded : null;
}

export type PlanChangeQuoteInput =
  | Readonly<{
      mode: 'provider_quote';
      quoteId: string;
      providerSnapshotRef: string;
      trustedProviderSnapshotVerified: boolean;
      trustedEvaluatedAt: string;
      expiresAt: string;
      values: PlanChangeQuoteValues;
    }>
  | Readonly<{
      mode: 'server_signed_quote';
      quoteId: string;
      providerSnapshotRef: string;
      trustedProviderSnapshotVerified: boolean;
      trustedEvaluatedAt: string;
      expiresAt: string;
      actualPaidAmountMinor: number;
      paidPeriodStartsAt: string;
      paidPeriodEndsAt: string;
      effectiveAt: string;
      targetPriceVersionId: SubscriptionPriceVersionId;
      trustedNextRenewalAt: string | null;
    }>
  | Readonly<{
      mode: 'provider_confirmation';
    }>
  | Readonly<{
      mode: 'support_required';
    }>;

export function resolvePlanChangeQuote(
  input: PlanChangeQuoteInput,
): PlanChangeQuoteResolution {
  if (input.mode === 'support_required') {
    return Object.freeze({
      status: 'blocked',
      mode: 'support_required',
      reason: 'exact_quote_unavailable',
      values: EMPTY_QUOTE_VALUES,
    });
  }

  if (input.mode === 'provider_confirmation') {
    return Object.freeze({
      status: 'provider_confirmation',
      mode: 'provider_confirmation',
      values: EMPTY_QUOTE_VALUES,
    });
  }

  if (!input.trustedProviderSnapshotVerified) {
    return Object.freeze({
      status: 'blocked',
      mode: 'support_required',
      reason: 'provider_snapshot_unverified',
      values: EMPTY_QUOTE_VALUES,
    });
  }

  const evaluatedAt = parseTrustedInstant(input.trustedEvaluatedAt);
  const expiresAt = parseTrustedInstant(input.expiresAt);
  if (
    !input.quoteId.trim() ||
    !input.providerSnapshotRef.trim() ||
    evaluatedAt === null ||
    expiresAt === null ||
    expiresAt <= evaluatedAt
  ) {
    return Object.freeze({
      status: 'blocked',
      mode: 'support_required',
      reason: 'invalid_input',
      values: EMPTY_QUOTE_VALUES,
    });
  }

  if (input.mode === 'provider_quote') {
    const nonNegativeMoneyValues = [
      input.values.actualPaidAmountMinor,
      input.values.unusedValueMinor,
      input.values.chargeAmountMinor,
      input.values.refundOrCreditAmountMinor,
    ];
    const effectiveAt = input.values.effectiveAt
      ? parseTrustedInstant(input.values.effectiveAt)
      : null;
    const nextRenewalAt = input.values.nextRenewalAt
      ? parseTrustedInstant(input.values.nextRenewalAt)
      : null;
    if (
      input.values.currency !== 'TWD' ||
      nonNegativeMoneyValues.some(
        (value) => value !== null && !isNonNegativeMinorAmount(value),
      ) ||
      (input.values.netAmountMinor !== null &&
        !Number.isSafeInteger(input.values.netAmountMinor)) ||
      !isValidOptionalInstant(input.values.effectiveAt) ||
      !isValidOptionalInstant(input.values.nextRenewalAt) ||
      (effectiveAt !== null && nextRenewalAt !== null && nextRenewalAt <= effectiveAt)
    ) {
      return Object.freeze({
        status: 'blocked',
        mode: 'support_required',
        reason: 'invalid_input',
        values: EMPTY_QUOTE_VALUES,
      });
    }

    return Object.freeze({
      status: 'ready',
      mode: 'provider_quote',
      quoteId: input.quoteId,
      expiresAt: input.expiresAt,
      providerSnapshotRef: input.providerSnapshotRef,
      values: Object.freeze({ ...input.values }),
    });
  }

  const periodStartsAt = parseTrustedInstant(input.paidPeriodStartsAt);
  const periodEndsAt = parseTrustedInstant(input.paidPeriodEndsAt);
  const effectiveAt = parseTrustedInstant(input.effectiveAt);
  const nextRenewalAt = input.trustedNextRenewalAt
    ? parseTrustedInstant(input.trustedNextRenewalAt)
    : null;
  const targetPrice = getSubscriptionPriceVersion(input.targetPriceVersionId);

  if (
    periodStartsAt === null ||
    periodEndsAt === null ||
    effectiveAt === null ||
    periodStartsAt >= periodEndsAt ||
    effectiveAt < periodStartsAt ||
    effectiveAt > periodEndsAt ||
    effectiveAt < evaluatedAt ||
    effectiveAt > expiresAt ||
    !isNonNegativeMinorAmount(input.actualPaidAmountMinor) ||
    targetPrice.planCode !== 'team' ||
    (input.trustedNextRenewalAt !== null &&
      (nextRenewalAt === null || nextRenewalAt <= effectiveAt))
  ) {
    return Object.freeze({
      status: 'blocked',
      mode: 'support_required',
      reason: 'invalid_input',
      values: EMPTY_QUOTE_VALUES,
    });
  }

  const totalDuration = periodEndsAt - periodStartsAt;
  const remainingDuration = periodEndsAt - effectiveAt;
  const unusedValueNumerator = input.actualPaidAmountMinor * remainingDuration;
  const unusedValueMinor = roundHalfUpFraction(
    unusedValueNumerator,
    totalDuration,
  );

  if (unusedValueMinor === null) {
    return Object.freeze({
      status: 'blocked',
      mode: 'support_required',
      reason: 'invalid_input',
      values: EMPTY_QUOTE_VALUES,
    });
  }

  const values: PlanChangeQuoteValues = Object.freeze({
    actualPaidAmountMinor: input.actualPaidAmountMinor,
    unusedValueMinor,
    chargeAmountMinor: targetPrice.amountMinor,
    refundOrCreditAmountMinor: unusedValueMinor,
    netAmountMinor: targetPrice.amountMinor - unusedValueMinor,
    currency: 'TWD',
    effectiveAt: input.effectiveAt,
    nextRenewalAt: input.trustedNextRenewalAt,
  });

  return Object.freeze({
    status: 'ready_for_server_signature',
    mode: 'server_signed_quote',
    quoteId: input.quoteId,
    expiresAt: input.expiresAt,
    providerSnapshotRef: input.providerSnapshotRef,
    values,
  });
}
