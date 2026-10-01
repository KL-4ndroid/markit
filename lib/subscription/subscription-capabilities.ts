import {
  SUBSCRIPTION_PLAN_DEFINITIONS,
  type AccountPlanCode,
  type SubscriptionPlanFeatureCode,
} from './subscription-plans';

export type AccountPlanSource = 'free' | 'admin' | 'promotion' | 'billing';

export type BillingStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancel_at_period_end'
  | 'cancelled'
  | 'refunded'
  | 'disputed'
  | 'unknown';

export type EntitlementStatus = 'active' | 'grace' | 'inactive' | 'unknown';

export type AccountCapabilityFeature =
  | 'productCoverPhoto'
  | 'salesPhotoEvidence'
  | 'basicAnalytics'
  | 'advancedAnalytics'
  | 'settlementReportPreview'
  | 'settlementPdf'
  | 'excelExport'
  | 'staffCollaboration'
  | 'managerWorkflow';

export type AccountCapabilityLimits = {
  activeProductLimit: number | null;
  staffSeatLimit: number;
  productPhotoStorageBytes: number | null;
  salesEvidenceStorageBytes: number | null;
  monthlyPdfExportLimit: number | null;
  monthlyExcelExportLimit: number | null;
};

export type AccountCapabilities = {
  ownerId: string | null;
  planCode: AccountPlanCode;
  planSource: AccountPlanSource;
  billingStatus: BillingStatus;
  entitlementStatus: EntitlementStatus;
  capabilityEvaluatedAt: string | null;
  capabilityRefreshAfter: string | null;
  entitlementEndsAt: string | null;
  limits: AccountCapabilityLimits;
  features: Record<AccountCapabilityFeature, boolean>;
};

export type CapabilityFreshness =
  | 'fresh'
  | 'offline_lease'
  | 'stale'
  | 'offline_lease_expired'
  | 'unavailable';

export const ACCOUNT_CAPABILITY_PLAN_FEATURE: Readonly<
  Record<AccountCapabilityFeature, SubscriptionPlanFeatureCode>
> = {
  productCoverPhoto: 'photo.product_cover',
  salesPhotoEvidence: 'photo.sales_evidence',
  basicAnalytics: 'analytics.basic',
  advancedAnalytics: 'analytics.advanced',
  settlementReportPreview: 'report.settlement_preview',
  settlementPdf: 'report.pdf',
  excelExport: 'report.excel',
  staffCollaboration: 'team.staff_collaboration',
  managerWorkflow: 'team.manager_workflow',
};

function parseTrustedTimestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function planIncludesFeature(planCode: AccountPlanCode, feature: AccountCapabilityFeature): boolean {
  const status = SUBSCRIPTION_PLAN_DEFINITIONS[planCode].features[ACCOUNT_CAPABILITY_PLAN_FEATURE[feature]];
  return status === 'included';
}

function assertValidPlanSource(planCode: AccountPlanCode, planSource: AccountPlanSource): void {
  if (planSource === 'free' && planCode !== 'free') {
    throw new Error('free_source_requires_free_plan');
  }
  if (planSource === 'promotion' && planCode !== 'pro') {
    throw new Error('promotion_source_requires_pro_plan');
  }
}

export function resolveModelAccountCapabilities(input: {
  ownerId: string | null;
  planCode: AccountPlanCode;
  planSource: AccountPlanSource;
  billingStatus: BillingStatus;
  entitlementStatus: EntitlementStatus;
  capabilityEvaluatedAt: string | null;
  capabilityRefreshAfter: string | null;
  entitlementEndsAt: string | null;
}): AccountCapabilities {
  assertValidPlanSource(input.planCode, input.planSource);
  const definition = SUBSCRIPTION_PLAN_DEFINITIONS[input.planCode];

  return {
    ...input,
    limits: {
      activeProductLimit: definition.limits.activeProducts.status === 'candidate'
        ? definition.limits.activeProducts.value
        : null,
      staffSeatLimit: definition.limits.staffSeats.value ?? 0,
      productPhotoStorageBytes: definition.limits.productPhotoStorageBytes.value,
      salesEvidenceStorageBytes: definition.limits.salesEvidenceStorageBytes.value,
      monthlyPdfExportLimit: null,
      monthlyExcelExportLimit: null,
    },
    features: {
      productCoverPhoto: planIncludesFeature(input.planCode, 'productCoverPhoto'),
      salesPhotoEvidence: planIncludesFeature(input.planCode, 'salesPhotoEvidence'),
      basicAnalytics: planIncludesFeature(input.planCode, 'basicAnalytics'),
      advancedAnalytics: planIncludesFeature(input.planCode, 'advancedAnalytics'),
      settlementReportPreview: planIncludesFeature(input.planCode, 'settlementReportPreview'),
      settlementPdf: planIncludesFeature(input.planCode, 'settlementPdf'),
      excelExport: planIncludesFeature(input.planCode, 'excelExport'),
      staffCollaboration: planIncludesFeature(input.planCode, 'staffCollaboration'),
      managerWorkflow: planIncludesFeature(input.planCode, 'managerWorkflow'),
    },
  };
}

export function resolveUnavailableAccountCapabilities(ownerId: string | null = null): AccountCapabilities {
  return resolveModelAccountCapabilities({
    ownerId,
    planCode: 'free',
    planSource: 'free',
    billingStatus: 'unknown',
    entitlementStatus: 'unknown',
    capabilityEvaluatedAt: null,
    capabilityRefreshAfter: null,
    entitlementEndsAt: null,
  });
}

export function resolveCapabilityFreshness(input: {
  capabilities: AccountCapabilities | null;
  nowMs: number;
  network: 'online' | 'offline';
  offlineLeaseEndsAt?: string | null;
}): CapabilityFreshness {
  if (!input.capabilities || !Number.isFinite(input.nowMs)) return 'unavailable';

  const evaluatedAt = parseTrustedTimestamp(input.capabilities.capabilityEvaluatedAt);
  const refreshAfter = parseTrustedTimestamp(input.capabilities.capabilityRefreshAfter);
  if (evaluatedAt === null || refreshAfter === null) return 'unavailable';
  if (evaluatedAt > input.nowMs || refreshAfter < evaluatedAt) return 'unavailable';
  if (input.nowMs <= refreshAfter) return 'fresh';
  if (input.network === 'online') return 'stale';

  const offlineLeaseEndsAt = parseTrustedTimestamp(input.offlineLeaseEndsAt ?? null);
  if (offlineLeaseEndsAt === null || input.nowMs > offlineLeaseEndsAt) {
    return 'offline_lease_expired';
  }

  const entitlementEndsAt = parseTrustedTimestamp(input.capabilities.entitlementEndsAt);
  if (entitlementEndsAt !== null && input.nowMs > entitlementEndsAt) {
    return 'offline_lease_expired';
  }

  return 'offline_lease';
}

export function hasEffectiveEntitlement(
  capabilities: AccountCapabilities,
  nowMs: number,
): boolean {
  if (capabilities.entitlementStatus !== 'active' && capabilities.entitlementStatus !== 'grace') {
    return false;
  }

  const entitlementEndsAt = parseTrustedTimestamp(capabilities.entitlementEndsAt);
  return entitlementEndsAt === null || nowMs <= entitlementEndsAt;
}

export function isPromotionExpired(capabilities: AccountCapabilities, nowMs: number): boolean {
  if (capabilities.planSource !== 'promotion') return false;
  const entitlementEndsAt = parseTrustedTimestamp(capabilities.entitlementEndsAt);
  return entitlementEndsAt === null || nowMs > entitlementEndsAt;
}
