export const NATIVE_EXTERNAL_ACCOUNT_READINESS_SCHEMA_VERSION = 1 as const;
export const NATIVE_EXTERNAL_ACCOUNT_READINESS_SOURCE_DOCUMENT =
  'subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.md' as const;

export const NATIVE_EXTERNAL_ACCOUNT_CHECK_IDS = [
  'apple.developer_program_enrollment',
  'apple.account_holder_access',
  'apple.compliance_review',
  'apple.paid_apps_agreement',
  'apple.tax_information',
  'apple.banking_information',
  'apple.bundle_id',
  'apple.app_store_connect_record',
  'apple.sandbox_tester',
  'apple.mac_xcode_device',
  'apple.subscription_group_products',
  'apple.server_api_access',
  'apple.server_notifications',
  'google.account_type_decision',
  'google.developer_account',
  'google.identity_verification',
  'google.merchant_payments_profile',
  'google.payout_method_verification',
  'google.app_record_package',
  'google.device_verification_requirement',
  'google.closed_test_requirement',
  'google.license_tester',
  'google.android_device',
  'google.subscription_base_plans',
  'google.play_developer_api_access',
  'google.rtdn',
] as const;

export const NATIVE_EXTERNAL_ACCOUNT_CHECK_STATUSES = [
  'complete',
  'pending_manual',
  'blocked_dependency',
  'not_applicable',
] as const;

export type NativeExternalAccountCheckId = typeof NATIVE_EXTERNAL_ACCOUNT_CHECK_IDS[number];
export type NativeExternalAccountCheckStatus =
  typeof NATIVE_EXTERNAL_ACCOUNT_CHECK_STATUSES[number];

export type NativeExternalAccountCheck = Readonly<{
  id: NativeExternalAccountCheckId;
  status: NativeExternalAccountCheckStatus;
}>;

export type NativeExternalAccountReadinessDocument = Readonly<{
  schemaVersion: typeof NATIVE_EXTERNAL_ACCOUNT_READINESS_SCHEMA_VERSION;
  sourceDocument: typeof NATIVE_EXTERNAL_ACCOUNT_READINESS_SOURCE_DOCUMENT;
  updatedAt: string;
  environment: 'external_account_handoff';
  activationStatus: 'disabled';
  evidencePolicy: 'status_only_no_secrets';
  checks: readonly NativeExternalAccountCheck[];
}>;

export type NativeExternalAccountReadinessReport = Readonly<{
  readyForRuntimeHandoff: boolean;
  totalCount: number;
  completeCount: number;
  blockerCount: number;
  counts: Readonly<Record<NativeExternalAccountCheckStatus, number>>;
  blockers: readonly NativeExternalAccountCheck[];
}>;

export type NativeExternalAccountReadinessValidationCode =
  | 'activation_status_invalid'
  | 'check_count_invalid'
  | 'check_duplicate'
  | 'check_id_invalid'
  | 'check_status_invalid'
  | 'document_invalid'
  | 'environment_invalid'
  | 'evidence_policy_invalid'
  | 'not_applicable_invalid'
  | 'schema_version_unsupported'
  | 'source_document_mismatch'
  | 'updated_date_invalid';

export class NativeExternalAccountReadinessValidationError extends Error {
  constructor(readonly code: NativeExternalAccountReadinessValidationCode) {
    super(code);
  }
}

const CONDITIONAL_CHECK_IDS = new Set<NativeExternalAccountCheckId>([
  'google.device_verification_requirement',
  'google.closed_test_requirement',
]);

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

function isCheckId(value: unknown): value is NativeExternalAccountCheckId {
  return typeof value === 'string'
    && (NATIVE_EXTERNAL_ACCOUNT_CHECK_IDS as readonly string[]).includes(value);
}

function isCheckStatus(value: unknown): value is NativeExternalAccountCheckStatus {
  return typeof value === 'string'
    && (NATIVE_EXTERNAL_ACCOUNT_CHECK_STATUSES as readonly string[]).includes(value);
}

export function parseNativeExternalAccountReadiness(
  value: unknown,
): NativeExternalAccountReadinessDocument {
  if (!isRecord(value) || !Array.isArray(value.checks) || !hasExactKeys(value, [
    'schemaVersion',
    'sourceDocument',
    'updatedAt',
    'environment',
    'activationStatus',
    'evidencePolicy',
    'checks',
  ])) throw new NativeExternalAccountReadinessValidationError('document_invalid');
  if (value.schemaVersion !== NATIVE_EXTERNAL_ACCOUNT_READINESS_SCHEMA_VERSION) {
    throw new NativeExternalAccountReadinessValidationError('schema_version_unsupported');
  }
  if (value.sourceDocument !== NATIVE_EXTERNAL_ACCOUNT_READINESS_SOURCE_DOCUMENT) {
    throw new NativeExternalAccountReadinessValidationError('source_document_mismatch');
  }
  if (!isValidDateOnly(value.updatedAt)) {
    throw new NativeExternalAccountReadinessValidationError('updated_date_invalid');
  }
  if (value.environment !== 'external_account_handoff') {
    throw new NativeExternalAccountReadinessValidationError('environment_invalid');
  }
  if (value.activationStatus !== 'disabled') {
    throw new NativeExternalAccountReadinessValidationError('activation_status_invalid');
  }
  if (value.evidencePolicy !== 'status_only_no_secrets') {
    throw new NativeExternalAccountReadinessValidationError('evidence_policy_invalid');
  }
  if (value.checks.length !== NATIVE_EXTERNAL_ACCOUNT_CHECK_IDS.length) {
    throw new NativeExternalAccountReadinessValidationError('check_count_invalid');
  }

  const byId = new Map<NativeExternalAccountCheckId, NativeExternalAccountCheck>();
  for (const candidate of value.checks) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ['id', 'status'])) {
      throw new NativeExternalAccountReadinessValidationError('document_invalid');
    }
    if (!isCheckId(candidate.id)) {
      throw new NativeExternalAccountReadinessValidationError('check_id_invalid');
    }
    if (!isCheckStatus(candidate.status)) {
      throw new NativeExternalAccountReadinessValidationError('check_status_invalid');
    }
    if (candidate.status === 'not_applicable' && !CONDITIONAL_CHECK_IDS.has(candidate.id)) {
      throw new NativeExternalAccountReadinessValidationError('not_applicable_invalid');
    }
    if (byId.has(candidate.id)) {
      throw new NativeExternalAccountReadinessValidationError('check_duplicate');
    }
    byId.set(candidate.id, Object.freeze({ id: candidate.id, status: candidate.status }));
  }

  const checks = NATIVE_EXTERNAL_ACCOUNT_CHECK_IDS.map(id => {
    const check = byId.get(id);
    if (!check) throw new NativeExternalAccountReadinessValidationError('check_id_invalid');
    return check;
  });
  return Object.freeze({
    schemaVersion: NATIVE_EXTERNAL_ACCOUNT_READINESS_SCHEMA_VERSION,
    sourceDocument: NATIVE_EXTERNAL_ACCOUNT_READINESS_SOURCE_DOCUMENT,
    updatedAt: value.updatedAt,
    environment: 'external_account_handoff',
    activationStatus: 'disabled',
    evidencePolicy: 'status_only_no_secrets',
    checks: Object.freeze(checks),
  });
}

export function evaluateNativeExternalAccountReadiness(
  document: NativeExternalAccountReadinessDocument,
): NativeExternalAccountReadinessReport {
  const counts: Record<NativeExternalAccountCheckStatus, number> = {
    complete: 0,
    pending_manual: 0,
    blocked_dependency: 0,
    not_applicable: 0,
  };
  for (const check of document.checks) counts[check.status] += 1;
  const blockers = document.checks.filter(check => (
    check.status !== 'complete' && check.status !== 'not_applicable'
  ));
  return Object.freeze({
    readyForRuntimeHandoff: blockers.length === 0,
    totalCount: document.checks.length,
    completeCount: counts.complete,
    blockerCount: blockers.length,
    counts: Object.freeze(counts),
    blockers: Object.freeze(blockers),
  });
}
