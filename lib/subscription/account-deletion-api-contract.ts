import {
  ACCOUNT_DELETION_POLICY_REVISION,
  ACCOUNT_DELETION_PREFLIGHT_RESOLUTIONS,
  ACCOUNT_DELETION_REQUEST_STATUSES,
  type AccountDeletionPreflightResolution,
  type AccountDeletionRequestStatus,
} from './account-deletion-contract';

const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{16,128}$/u;
const OPAQUE_REQUEST_ID = /^[A-Za-z0-9_-]{16,128}$/u;
const SAFE_ERROR_CODE = /^[a-z][a-z0-9_]{0,63}$/u;
const CREATE_KEYS = new Set([
  'policyRevision',
  'preflightResolution',
  'idempotencyKey',
  'acknowledgeStoreBillingContinues',
]);

export type AccountDeletionCreateRequest = Readonly<{
  policyRevision: typeof ACCOUNT_DELETION_POLICY_REVISION;
  preflightResolution: AccountDeletionPreflightResolution;
  idempotencyKey: string;
  acknowledgeStoreBillingContinues: true;
}>;

export type AccountDeletionSafeStatus = Readonly<{
  requestId: string;
  status: AccountDeletionRequestStatus;
  safeErrorCode: string | null;
  requestedAt: string;
  updatedAt: string;
  nextActionAfter: string | null;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAccountDeletionCreateRequest(
  value: unknown,
): AccountDeletionCreateRequest | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some(key => !CREATE_KEYS.has(key))) return null;
  if (value.policyRevision !== ACCOUNT_DELETION_POLICY_REVISION) return null;
  if (
    typeof value.preflightResolution !== 'string'
    || !(ACCOUNT_DELETION_PREFLIGHT_RESOLUTIONS as readonly string[])
      .includes(value.preflightResolution)
  ) return null;
  if (typeof value.idempotencyKey !== 'string' || !IDEMPOTENCY_KEY.test(value.idempotencyKey)) {
    return null;
  }
  if (value.acknowledgeStoreBillingContinues !== true) return null;

  return Object.freeze({
    policyRevision: ACCOUNT_DELETION_POLICY_REVISION,
    preflightResolution: value.preflightResolution as AccountDeletionPreflightResolution,
    idempotencyKey: value.idempotencyKey,
    acknowledgeStoreBillingContinues: true,
  });
}

function parseIsoTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return new Date(Date.parse(value)).toISOString();
}

export function parseAccountDeletionSafeStatus(value: unknown): AccountDeletionSafeStatus | null {
  if (!isRecord(value)) return null;
  if (typeof value.requestId !== 'string' || !OPAQUE_REQUEST_ID.test(value.requestId)) return null;
  if (
    typeof value.status !== 'string'
    || !(ACCOUNT_DELETION_REQUEST_STATUSES as readonly string[]).includes(value.status)
  ) return null;
  const requestedAt = parseIsoTimestamp(value.requestedAt);
  const updatedAt = parseIsoTimestamp(value.updatedAt);
  const nextActionAfter = value.nextActionAfter === null
    ? null
    : parseIsoTimestamp(value.nextActionAfter);
  if (!requestedAt || !updatedAt || (value.nextActionAfter !== null && !nextActionAfter)) return null;
  if (
    value.safeErrorCode !== null
    && (typeof value.safeErrorCode !== 'string' || !SAFE_ERROR_CODE.test(value.safeErrorCode))
  ) return null;

  return Object.freeze({
    requestId: value.requestId,
    status: value.status as AccountDeletionRequestStatus,
    safeErrorCode: value.safeErrorCode as string | null,
    requestedAt,
    updatedAt,
    nextActionAfter,
  });
}
