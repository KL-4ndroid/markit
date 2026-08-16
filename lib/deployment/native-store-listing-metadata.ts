export const NATIVE_STORE_LISTING_METADATA_SCHEMA_VERSION = 1 as const;
export const NATIVE_STORE_LISTING_METADATA_SOURCE_DOCUMENT =
  'subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.md' as const;

type ManualConfigurationStatus = 'pending_manual' | 'configured_external';
type ManualApprovalStatus = 'pending_manual' | 'complete';

export type NativeStoreListingMetadataDocument = Readonly<{
  schemaVersion: typeof NATIVE_STORE_LISTING_METADATA_SCHEMA_VERSION;
  sourceDocument: typeof NATIVE_STORE_LISTING_METADATA_SOURCE_DOCUMENT;
  updatedAt: string;
  locale: 'zh-TW';
  status: 'candidate_requires_manual_review';
  submissionStatus: 'disabled';
  publicOrigin: string | null;
  accountDeletionUrl: string | null;
  reviewContactStatus: ManualConfigurationStatus;
  reviewAccountStatus: ManualConfigurationStatus;
  googleContactEmailStatus: ManualConfigurationStatus;
  legalReviewStatus: ManualApprovalStatus;
  finalBinaryReviewStatus: ManualApprovalStatus;
  apple: Readonly<{
    appName: string;
    subtitle: string;
    promotionalText: string;
    description: string;
    keywords: string;
    primaryCategory: 'Business';
    secondaryCategory: 'Productivity';
    supportUrl: string | null;
    marketingUrl: string | null;
    privacyPolicyUrl: string | null;
    privacyChoicesUrl: string | null;
    reviewNotesDraft: string;
  }>;
  google: Readonly<{
    appName: string;
    shortDescription: string;
    fullDescription: string;
    category: 'Business';
    supportWebsiteUrl: string | null;
    privacyPolicyUrl: string | null;
    appAccessInstructionsDraft: string;
    adsDeclarationDraft: 'no_ads_current_runtime_requires_final_binary_review';
    targetAudienceDraft: 'adult_business_users_requires_console_review';
  }>;
}>;

export type NativeStoreListingMetadataValidationCode =
  | 'apple_metadata_invalid'
  | 'document_invalid'
  | 'google_metadata_invalid'
  | 'manual_status_invalid'
  | 'schema_version_unsupported'
  | 'source_document_mismatch'
  | 'submission_status_invalid'
  | 'updated_date_invalid';

export class NativeStoreListingMetadataValidationError extends Error {
  constructor(readonly code: NativeStoreListingMetadataValidationCode) {
    super(code);
  }
}

export type NativeStoreListingMetadataCheck = Readonly<{
  id: string;
  ok: boolean;
  code: 'configured' | 'complete' | 'missing' | 'pending_manual';
}>;

export type NativeStoreListingMetadataReport = Readonly<{
  readyForConsoleEntry: boolean;
  checkCount: number;
  passedCount: number;
  blockerCount: number;
  checks: readonly NativeStoreListingMetadataCheck[];
}>;

const ROOT_KEYS = [
  'schemaVersion', 'sourceDocument', 'updatedAt', 'locale', 'status',
  'submissionStatus', 'publicOrigin', 'accountDeletionUrl', 'reviewContactStatus',
  'reviewAccountStatus', 'googleContactEmailStatus', 'legalReviewStatus',
  'finalBinaryReviewStatus', 'apple', 'google',
] as const;
const APPLE_KEYS = [
  'appName', 'subtitle', 'promotionalText', 'description', 'keywords',
  'primaryCategory', 'secondaryCategory', 'supportUrl', 'marketingUrl',
  'privacyPolicyUrl', 'privacyChoicesUrl', 'reviewNotesDraft',
] as const;
const GOOGLE_KEYS = [
  'appName', 'shortDescription', 'fullDescription', 'category',
  'supportWebsiteUrl', 'privacyPolicyUrl', 'appAccessInstructionsDraft',
  'adsDeclarationDraft', 'targetAudienceDraft',
] as const;
const FORBIDDEN_PUBLIC_CLAIM_PATTERN = /(?:#\s*1|第一名|最佳|最棒|免費|折扣|優惠|限時|立即下載|立即安裝|NT\$|\d+\s*%|no\s+ads|best\s+app)/iu;
const SENSITIVE_VALUE_PATTERN = /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|password\s*[:=]|token\s*[:=]|secret\s*[:=]|bearer\s+[a-z0-9._-]+)/iu;

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

function isBoundedText(value: unknown, minimum: number, maximum: number): value is string {
  return typeof value === 'string'
    && value.trim() === value
    && countCharacters(value) >= minimum
    && countCharacters(value) <= maximum
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
}

function isHttpsUrl(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && Boolean(url.hostname)
      && url.username === ''
      && url.password === ''
      && url.hash === '';
  } catch {
    return false;
  }
}

function isManualConfigurationStatus(value: unknown): value is ManualConfigurationStatus {
  return value === 'pending_manual' || value === 'configured_external';
}

function isManualApprovalStatus(value: unknown): value is ManualApprovalStatus {
  return value === 'pending_manual' || value === 'complete';
}

function isAppleMetadata(value: unknown): value is NativeStoreListingMetadataDocument['apple'] {
  if (!isRecord(value) || !hasExactKeys(value, APPLE_KEYS)) return false;
  if (
    !isBoundedText(value.appName, 2, 30)
    || !isBoundedText(value.subtitle, 1, 30)
    || !isBoundedText(value.promotionalText, 1, 170)
    || !isBoundedText(value.description, 1, 4000)
    || !isBoundedText(value.reviewNotesDraft, 1, 4000)
    || value.primaryCategory !== 'Business'
    || value.secondaryCategory !== 'Productivity'
    || !isHttpsUrl(value.supportUrl)
    || !isHttpsUrl(value.marketingUrl)
    || !isHttpsUrl(value.privacyPolicyUrl)
    || !isHttpsUrl(value.privacyChoicesUrl)
  ) return false;
  if (FORBIDDEN_PUBLIC_CLAIM_PATTERN.test([
    value.appName, value.subtitle, value.promotionalText, value.description,
  ].join('\n')) || SENSITIVE_VALUE_PATTERN.test(value.reviewNotesDraft)) return false;
  if (typeof value.keywords !== 'string' || Buffer.byteLength(value.keywords, 'utf8') > 100) {
    return false;
  }
  const keywords = value.keywords.split(',').map(keyword => keyword.trim());
  const normalized = keywords.map(keyword => keyword.toLocaleLowerCase('en-US'));
  return keywords.length > 0
    && keywords.every(keyword => countCharacters(keyword) > 2)
    && new Set(normalized).size === normalized.length
    && !normalized.some(keyword => /f[ée]ria|出攤筆記/u.test(keyword));
}

function isGoogleMetadata(value: unknown): value is NativeStoreListingMetadataDocument['google'] {
  if (!isRecord(value) || !hasExactKeys(value, GOOGLE_KEYS)) return false;
  if (
    !isBoundedText(value.appName, 2, 30)
    || !isBoundedText(value.shortDescription, 1, 80)
    || value.shortDescription.includes('\n')
    || !isBoundedText(value.fullDescription, 1, 4000)
    || !isBoundedText(value.appAccessInstructionsDraft, 1, 4000)
    || value.category !== 'Business'
    || !isHttpsUrl(value.supportWebsiteUrl)
    || !isHttpsUrl(value.privacyPolicyUrl)
    || value.adsDeclarationDraft !== 'no_ads_current_runtime_requires_final_binary_review'
    || value.targetAudienceDraft !== 'adult_business_users_requires_console_review'
  ) return false;
  return !FORBIDDEN_PUBLIC_CLAIM_PATTERN.test([
    value.appName, value.shortDescription, value.fullDescription,
  ].join('\n'))
    && !SENSITIVE_VALUE_PATTERN.test(value.appAccessInstructionsDraft)
    && !/[!?！？]{2,}/u.test(value.shortDescription);
}

export function parseNativeStoreListingMetadata(
  value: unknown,
): NativeStoreListingMetadataDocument {
  if (!isRecord(value) || !hasExactKeys(value, ROOT_KEYS)) {
    throw new NativeStoreListingMetadataValidationError('document_invalid');
  }
  if (value.schemaVersion !== NATIVE_STORE_LISTING_METADATA_SCHEMA_VERSION) {
    throw new NativeStoreListingMetadataValidationError('schema_version_unsupported');
  }
  if (value.sourceDocument !== NATIVE_STORE_LISTING_METADATA_SOURCE_DOCUMENT) {
    throw new NativeStoreListingMetadataValidationError('source_document_mismatch');
  }
  if (!isValidDateOnly(value.updatedAt)) {
    throw new NativeStoreListingMetadataValidationError('updated_date_invalid');
  }
  if (value.locale !== 'zh-TW' || value.status !== 'candidate_requires_manual_review') {
    throw new NativeStoreListingMetadataValidationError('document_invalid');
  }
  if (value.submissionStatus !== 'disabled') {
    throw new NativeStoreListingMetadataValidationError('submission_status_invalid');
  }
  if (!isHttpsUrl(value.publicOrigin) || !isHttpsUrl(value.accountDeletionUrl)) {
    throw new NativeStoreListingMetadataValidationError('document_invalid');
  }
  if (
    !isManualConfigurationStatus(value.reviewContactStatus)
    || !isManualConfigurationStatus(value.reviewAccountStatus)
    || !isManualConfigurationStatus(value.googleContactEmailStatus)
    || !isManualApprovalStatus(value.legalReviewStatus)
    || !isManualApprovalStatus(value.finalBinaryReviewStatus)
  ) throw new NativeStoreListingMetadataValidationError('manual_status_invalid');
  if (!isAppleMetadata(value.apple)) {
    throw new NativeStoreListingMetadataValidationError('apple_metadata_invalid');
  }
  if (!isGoogleMetadata(value.google)) {
    throw new NativeStoreListingMetadataValidationError('google_metadata_invalid');
  }

  return Object.freeze(value as unknown as NativeStoreListingMetadataDocument);
}

function presenceCheck(id: string, value: string | null): NativeStoreListingMetadataCheck {
  return Object.freeze({ id, ok: value !== null, code: value === null ? 'missing' : 'configured' });
}

function statusCheck(
  id: string,
  value: ManualConfigurationStatus | ManualApprovalStatus,
): NativeStoreListingMetadataCheck {
  const ok = value === 'configured_external' || value === 'complete';
  const code = value === 'configured_external' ? 'configured' : value;
  return Object.freeze({ id, ok, code });
}

export function evaluateNativeStoreListingMetadata(
  document: NativeStoreListingMetadataDocument,
): NativeStoreListingMetadataReport {
  const checks = Object.freeze([
    presenceCheck('public_origin', document.publicOrigin),
    presenceCheck('apple_support_url', document.apple.supportUrl),
    presenceCheck('apple_privacy_policy_url', document.apple.privacyPolicyUrl),
    presenceCheck('google_support_website_url', document.google.supportWebsiteUrl),
    presenceCheck('google_privacy_policy_url', document.google.privacyPolicyUrl),
    presenceCheck('account_deletion_url', document.accountDeletionUrl),
    statusCheck('review_contact', document.reviewContactStatus),
    statusCheck('review_account', document.reviewAccountStatus),
    statusCheck('google_contact_email', document.googleContactEmailStatus),
    statusCheck('legal_review', document.legalReviewStatus),
    statusCheck('final_binary_review', document.finalBinaryReviewStatus),
  ]);
  const passedCount = checks.filter(check => check.ok).length;
  return Object.freeze({
    readyForConsoleEntry: passedCount === checks.length,
    checkCount: checks.length,
    passedCount,
    blockerCount: checks.length - passedCount,
    checks,
  });
}
