import {
  getSubscriptionPlanFeatureStatus,
  type AccountPlanCode,
  type SubscriptionPlanFeatureCode,
} from './subscription-plans';
import {
  isSubscriptionPriceVersionId,
  type SubscriptionPriceVersionId,
} from './subscription-pricing';

export const NATIVE_STORE_PRODUCT_METADATA_SCHEMA_VERSION = 1 as const;
export const NATIVE_STORE_PRODUCT_METADATA_SOURCE_DOCUMENT =
  'subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.md' as const;

const PRODUCT_PLAN_CODES = ['pro', 'team'] as const;
type ProductPlanCode = typeof PRODUCT_PLAN_CODES[number];
type ReviewStatus = 'pending_manual' | 'complete';
type ProductDisposition =
  | 'candidate_requires_manual_review'
  | 'deferred_pending_mechanism';

const PRO_CAPABILITY_CODES = [
  'analytics.basic',
  'analytics.advanced',
  'report.settlement_preview',
  'report.pdf',
  'photo.product_cover',
] as const satisfies readonly SubscriptionPlanFeatureCode[];

const TEAM_CAPABILITY_CODES = [
  ...PRO_CAPABILITY_CODES,
  'photo.sales_evidence',
  'team.staff_collaboration',
  'team.manager_workflow',
] as const satisfies readonly SubscriptionPlanFeatureCode[];

const EXPECTED_CAPABILITY_CODES: Readonly<Record<
ProductPlanCode,
readonly SubscriptionPlanFeatureCode[]
>> = Object.freeze({
  pro: PRO_CAPABILITY_CODES,
  team: TEAM_CAPABILITY_CODES,
});

const EXPECTED_APPLE_PRODUCTS = Object.freeze([
  { priceVersionId: 'pro_monthly_twd_launch_v1', planCode: 'pro' },
  { priceVersionId: 'pro_annual_twd_launch_v1', planCode: 'pro' },
  { priceVersionId: 'pro_founder_annual_twd_launch_v1', planCode: 'pro' },
  { priceVersionId: 'team_monthly_twd_launch_v1', planCode: 'team' },
  { priceVersionId: 'team_annual_twd_launch_v1', planCode: 'team' },
] as const satisfies readonly Readonly<{
  priceVersionId: SubscriptionPriceVersionId;
  planCode: ProductPlanCode;
}>[]);

export type NativeStoreProductMetadataDocument = Readonly<{
  schemaVersion: typeof NATIVE_STORE_PRODUCT_METADATA_SCHEMA_VERSION;
  sourceDocument: typeof NATIVE_STORE_PRODUCT_METADATA_SOURCE_DOCUMENT;
  updatedAt: string;
  locale: 'zh-TW';
  activationStatus: 'disabled';
  submissionStatus: 'disabled';
  brandReviewStatus: ReviewStatus;
  productTruthReviewStatus: ReviewStatus;
  storePolicyReviewStatus: ReviewStatus;
  legalReviewStatus: ReviewStatus;
  finalBinaryReviewStatus: ReviewStatus;
  founderPolicyDecisionStatus: ReviewStatus;
  apple: Readonly<{
    subscriptionGroupDisplayName: string;
    products: readonly Readonly<{
      priceVersionId: SubscriptionPriceVersionId;
      planCode: ProductPlanCode;
      disposition: ProductDisposition;
      displayName: string;
      description: string;
      capabilityCodes: readonly SubscriptionPlanFeatureCode[];
    }>[];
  }>;
  google: Readonly<{
    subscriptions: readonly Readonly<{
      planCode: ProductPlanCode;
      disposition: 'candidate_requires_manual_review';
      name: string;
      benefits: readonly string[];
      capabilityCodes: readonly SubscriptionPlanFeatureCode[];
    }>[];
  }>;
}>;

export type NativeStoreProductMetadataValidationCode =
  | 'activation_status_invalid'
  | 'apple_metadata_invalid'
  | 'capability_mismatch'
  | 'document_invalid'
  | 'founder_disposition_invalid'
  | 'google_metadata_invalid'
  | 'review_status_invalid'
  | 'schema_version_unsupported'
  | 'source_document_mismatch'
  | 'submission_status_invalid'
  | 'updated_date_invalid';

export class NativeStoreProductMetadataValidationError extends Error {
  constructor(readonly code: NativeStoreProductMetadataValidationCode) {
    super(code);
  }
}

export type NativeStoreProductMetadataCheck = Readonly<{
  id: string;
  ok: boolean;
  code: 'complete' | 'pending_manual';
}>;

export type NativeStoreProductMetadataReport = Readonly<{
  readyForConsoleEntry: boolean;
  appleProductCount: number;
  googleSubscriptionCount: number;
  founderDisposition: ProductDisposition;
  checkCount: number;
  passedCount: number;
  blockerCount: number;
  checks: readonly NativeStoreProductMetadataCheck[];
}>;

const ROOT_KEYS = [
  'schemaVersion', 'sourceDocument', 'updatedAt', 'locale', 'activationStatus',
  'submissionStatus', 'brandReviewStatus', 'productTruthReviewStatus',
  'storePolicyReviewStatus', 'legalReviewStatus', 'finalBinaryReviewStatus',
  'founderPolicyDecisionStatus', 'apple', 'google',
] as const;
const APPLE_PRODUCT_KEYS = [
  'priceVersionId', 'planCode', 'disposition', 'displayName', 'description',
  'capabilityCodes',
] as const;
const GOOGLE_SUBSCRIPTION_KEYS = [
  'planCode', 'disposition', 'name', 'benefits', 'capabilityCodes',
] as const;
const FORBIDDEN_CLAIM_PATTERN = /(?:NT\$|TWD|新台幣|\d+\s*%|免費|試用|折扣|優惠|終身|永久|無限|席次|Excel|即將推出|限時)/iu;
const CONTROL_OR_MARKUP_PATTERN = /[\u0000-\u001f\u007f<>]/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
}

function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function countCharacters(value: string): number {
  return Array.from(value).length;
}

function isBoundedPublicText(value: unknown, minimum: number, maximum: number): value is string {
  return typeof value === 'string'
    && value.trim() === value
    && countCharacters(value) >= minimum
    && countCharacters(value) <= maximum
    && !CONTROL_OR_MARKUP_PATTERN.test(value)
    && !FORBIDDEN_CLAIM_PATTERN.test(value);
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return value === 'pending_manual' || value === 'complete';
}

function isProductPlanCode(value: unknown): value is ProductPlanCode {
  return value === 'pro' || value === 'team';
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function parseCapabilityCodes(
  value: unknown,
  planCode: ProductPlanCode,
): readonly SubscriptionPlanFeatureCode[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new NativeStoreProductMetadataValidationError('capability_mismatch');
  }
  const expected = EXPECTED_CAPABILITY_CODES[planCode];
  if (!sameStrings(value, expected)) {
    throw new NativeStoreProductMetadataValidationError('capability_mismatch');
  }
  for (const capabilityCode of expected) {
    if (getSubscriptionPlanFeatureStatus(planCode as AccountPlanCode, capabilityCode) !== 'included') {
      throw new NativeStoreProductMetadataValidationError('capability_mismatch');
    }
  }
  return Object.freeze([...expected]);
}

function parseAppleProduct(
  value: unknown,
): NativeStoreProductMetadataDocument['apple']['products'][number] {
  if (!isRecord(value) || !hasExactKeys(value, APPLE_PRODUCT_KEYS)) {
    throw new NativeStoreProductMetadataValidationError('apple_metadata_invalid');
  }
  if (
    !isSubscriptionPriceVersionId(value.priceVersionId)
    || !isProductPlanCode(value.planCode)
    || !isBoundedPublicText(value.displayName, 2, 30)
    || !isBoundedPublicText(value.description, 1, 45)
    || (value.disposition !== 'candidate_requires_manual_review'
      && value.disposition !== 'deferred_pending_mechanism')
  ) throw new NativeStoreProductMetadataValidationError('apple_metadata_invalid');
  return Object.freeze({
    priceVersionId: value.priceVersionId,
    planCode: value.planCode,
    disposition: value.disposition,
    displayName: value.displayName,
    description: value.description,
    capabilityCodes: parseCapabilityCodes(value.capabilityCodes, value.planCode),
  });
}

function parseGoogleSubscription(
  value: unknown,
): NativeStoreProductMetadataDocument['google']['subscriptions'][number] {
  if (!isRecord(value) || !hasExactKeys(value, GOOGLE_SUBSCRIPTION_KEYS)) {
    throw new NativeStoreProductMetadataValidationError('google_metadata_invalid');
  }
  if (
    !isProductPlanCode(value.planCode)
    || value.disposition !== 'candidate_requires_manual_review'
    || !isBoundedPublicText(value.name, 1, 55)
    || !Array.isArray(value.benefits)
    || value.benefits.length < 1
    || value.benefits.length > 4
    || !value.benefits.every(benefit => isBoundedPublicText(benefit, 1, 40))
    || new Set(value.benefits).size !== value.benefits.length
  ) throw new NativeStoreProductMetadataValidationError('google_metadata_invalid');
  return Object.freeze({
    planCode: value.planCode,
    disposition: 'candidate_requires_manual_review',
    name: value.name,
    benefits: Object.freeze([...value.benefits]),
    capabilityCodes: parseCapabilityCodes(value.capabilityCodes, value.planCode),
  });
}

export function parseNativeStoreProductMetadata(
  value: unknown,
): NativeStoreProductMetadataDocument {
  if (!isRecord(value) || !hasExactKeys(value, ROOT_KEYS)) {
    throw new NativeStoreProductMetadataValidationError('document_invalid');
  }
  if (value.schemaVersion !== NATIVE_STORE_PRODUCT_METADATA_SCHEMA_VERSION) {
    throw new NativeStoreProductMetadataValidationError('schema_version_unsupported');
  }
  if (value.sourceDocument !== NATIVE_STORE_PRODUCT_METADATA_SOURCE_DOCUMENT) {
    throw new NativeStoreProductMetadataValidationError('source_document_mismatch');
  }
  if (!isValidDateOnly(value.updatedAt)) {
    throw new NativeStoreProductMetadataValidationError('updated_date_invalid');
  }
  if (value.locale !== 'zh-TW') {
    throw new NativeStoreProductMetadataValidationError('document_invalid');
  }
  if (value.activationStatus !== 'disabled') {
    throw new NativeStoreProductMetadataValidationError('activation_status_invalid');
  }
  if (value.submissionStatus !== 'disabled') {
    throw new NativeStoreProductMetadataValidationError('submission_status_invalid');
  }
  const reviewStatuses = [
    value.brandReviewStatus,
    value.productTruthReviewStatus,
    value.storePolicyReviewStatus,
    value.legalReviewStatus,
    value.finalBinaryReviewStatus,
    value.founderPolicyDecisionStatus,
  ];
  if (!reviewStatuses.every(isReviewStatus)) {
    throw new NativeStoreProductMetadataValidationError('review_status_invalid');
  }
  if (
    !isRecord(value.apple)
    || !hasExactKeys(value.apple, ['subscriptionGroupDisplayName', 'products'])
    || !isBoundedPublicText(value.apple.subscriptionGroupDisplayName, 2, 30)
    || !Array.isArray(value.apple.products)
    || value.apple.products.length !== EXPECTED_APPLE_PRODUCTS.length
  ) throw new NativeStoreProductMetadataValidationError('apple_metadata_invalid');
  if (
    !isRecord(value.google)
    || !hasExactKeys(value.google, ['subscriptions'])
    || !Array.isArray(value.google.subscriptions)
    || value.google.subscriptions.length !== PRODUCT_PLAN_CODES.length
  ) throw new NativeStoreProductMetadataValidationError('google_metadata_invalid');

  const appleProducts = value.apple.products.map(parseAppleProduct);
  for (const [index, expected] of EXPECTED_APPLE_PRODUCTS.entries()) {
    const product = appleProducts[index];
    if (product.priceVersionId !== expected.priceVersionId || product.planCode !== expected.planCode) {
      throw new NativeStoreProductMetadataValidationError('apple_metadata_invalid');
    }
    const isFounder = product.priceVersionId === 'pro_founder_annual_twd_launch_v1';
    if (!isFounder && product.disposition !== 'candidate_requires_manual_review') {
      throw new NativeStoreProductMetadataValidationError('founder_disposition_invalid');
    }
    if (isFounder && product.disposition === 'candidate_requires_manual_review'
      && value.founderPolicyDecisionStatus !== 'complete') {
      throw new NativeStoreProductMetadataValidationError('founder_disposition_invalid');
    }
  }
  const googleSubscriptions = value.google.subscriptions.map(parseGoogleSubscription);
  if (!googleSubscriptions.every((subscription, index) => (
    subscription.planCode === PRODUCT_PLAN_CODES[index]
  ))) throw new NativeStoreProductMetadataValidationError('google_metadata_invalid');

  return Object.freeze({
    schemaVersion: NATIVE_STORE_PRODUCT_METADATA_SCHEMA_VERSION,
    sourceDocument: NATIVE_STORE_PRODUCT_METADATA_SOURCE_DOCUMENT,
    updatedAt: value.updatedAt,
    locale: 'zh-TW',
    activationStatus: 'disabled',
    submissionStatus: 'disabled',
    brandReviewStatus: value.brandReviewStatus as ReviewStatus,
    productTruthReviewStatus: value.productTruthReviewStatus as ReviewStatus,
    storePolicyReviewStatus: value.storePolicyReviewStatus as ReviewStatus,
    legalReviewStatus: value.legalReviewStatus as ReviewStatus,
    finalBinaryReviewStatus: value.finalBinaryReviewStatus as ReviewStatus,
    founderPolicyDecisionStatus: value.founderPolicyDecisionStatus as ReviewStatus,
    apple: Object.freeze({
      subscriptionGroupDisplayName: value.apple.subscriptionGroupDisplayName,
      products: Object.freeze(appleProducts),
    }),
    google: Object.freeze({ subscriptions: Object.freeze(googleSubscriptions) }),
  });
}

function reviewCheck(id: string, status: ReviewStatus): NativeStoreProductMetadataCheck {
  return Object.freeze({ id, ok: status === 'complete', code: status });
}

export function evaluateNativeStoreProductMetadata(
  document: NativeStoreProductMetadataDocument,
): NativeStoreProductMetadataReport {
  const checks = Object.freeze([
    reviewCheck('brand_review', document.brandReviewStatus),
    reviewCheck('product_truth_review', document.productTruthReviewStatus),
    reviewCheck('store_policy_review', document.storePolicyReviewStatus),
    reviewCheck('legal_review', document.legalReviewStatus),
    reviewCheck('final_binary_review', document.finalBinaryReviewStatus),
    reviewCheck('founder_policy_decision', document.founderPolicyDecisionStatus),
  ]);
  const passedCount = checks.filter(check => check.ok).length;
  const founder = document.apple.products.find(product => (
    product.priceVersionId === 'pro_founder_annual_twd_launch_v1'
  ))!;
  return Object.freeze({
    readyForConsoleEntry: passedCount === checks.length,
    appleProductCount: document.apple.products.length,
    googleSubscriptionCount: document.google.subscriptions.length,
    founderDisposition: founder.disposition,
    checkCount: checks.length,
    passedCount,
    blockerCount: checks.length - passedCount,
    checks,
  });
}
