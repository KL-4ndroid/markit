export const ACCOUNT_DELETION_POLICY_REVISION = '2026-08-17' as const;

export const ACCOUNT_DELETION_REQUEST_STATUSES = [
  'requested',
  'identity_confirmed',
  'processing',
  'failed_retryable',
  'manual_review',
  'cancelled',
  'completed',
] as const;

export type AccountDeletionRequestStatus = typeof ACCOUNT_DELETION_REQUEST_STATUSES[number];
export type AccountDeletionAccountKind = 'owner' | 'staff';

export const ACCOUNT_DELETION_PREFLIGHT_RESOLUTIONS = [
  'clean',
  'sync_confirmed',
  'export_confirmed',
  'discard_confirmed',
] as const;

export type AccountDeletionPreflightResolution =
  typeof ACCOUNT_DELETION_PREFLIGHT_RESOLUTIONS[number];

export const ACCOUNT_DELETION_STEP_CODES = [
  'access_frozen',
  'staff_access_revoked',
  'staff_attribution_anonymized',
  'object_manifest_built',
  'r2_objects_deleted',
  'r2_absence_verified',
  'billing_identity_detached',
  'operational_data_cleaned',
  'profile_deleted',
  'auth_user_deleted',
  'sessions_revoked',
] as const;

export type AccountDeletionStepCode = typeof ACCOUNT_DELETION_STEP_CODES[number];
export type AccountDeletionStepStatus =
  | 'pending'
  | 'processing'
  | 'failed_retryable'
  | 'manual_review'
  | 'completed';

export type AccountDeletionStepEvidence = Readonly<{
  code: AccountDeletionStepCode;
  status: AccountDeletionStepStatus;
  affectedCount: number;
  evidenceHash: string | null;
}>;

export type AccountDeletionCompletionInput = Readonly<{
  accountKind: AccountDeletionAccountKind;
  requestStatus: AccountDeletionRequestStatus;
  identityConfirmed: boolean;
  preflightResolution: AccountDeletionPreflightResolution | null;
  leaseActive: boolean;
  steps: readonly AccountDeletionStepEvidence[];
}>;

export type AccountDeletionCompletionBlocker =
  | 'request_status_not_completable'
  | 'identity_not_confirmed'
  | 'preflight_not_resolved'
  | 'worker_lease_active'
  | 'step_duplicate'
  | 'step_missing'
  | 'step_not_completed'
  | 'step_evidence_invalid';

export type AccountDeletionCompletionDecision = Readonly<{
  eligible: boolean;
  blockers: readonly AccountDeletionCompletionBlocker[];
  missingSteps: readonly AccountDeletionStepCode[];
}>;

const OWNER_REQUIRED_STEPS: readonly AccountDeletionStepCode[] = Object.freeze([
  'access_frozen',
  'staff_access_revoked',
  'object_manifest_built',
  'r2_objects_deleted',
  'r2_absence_verified',
  'billing_identity_detached',
  'operational_data_cleaned',
  'profile_deleted',
  'auth_user_deleted',
  'sessions_revoked',
]);

const STAFF_REQUIRED_STEPS: readonly AccountDeletionStepCode[] = Object.freeze([
  'access_frozen',
  'staff_access_revoked',
  'staff_attribution_anonymized',
  'operational_data_cleaned',
  'profile_deleted',
  'auth_user_deleted',
  'sessions_revoked',
]);

const TRANSITIONS = {
  requested: ['identity_confirmed', 'cancelled'],
  identity_confirmed: ['processing', 'cancelled'],
  processing: ['failed_retryable', 'manual_review', 'completed'],
  failed_retryable: ['processing', 'manual_review'],
  manual_review: ['processing', 'completed'],
  cancelled: [],
  completed: [],
} as const satisfies Readonly<
  Record<AccountDeletionRequestStatus, readonly AccountDeletionRequestStatus[]>
>;

const SHA256_HEX = /^[0-9a-f]{64}$/u;

export function canTransitionAccountDeletionRequest(
  from: AccountDeletionRequestStatus,
  to: AccountDeletionRequestStatus,
): boolean {
  return (TRANSITIONS[from] as readonly AccountDeletionRequestStatus[]).includes(to);
}

export function requiredAccountDeletionSteps(
  accountKind: AccountDeletionAccountKind,
): readonly AccountDeletionStepCode[] {
  return accountKind === 'owner' ? OWNER_REQUIRED_STEPS : STAFF_REQUIRED_STEPS;
}

function hasValidEvidence(step: AccountDeletionStepEvidence): boolean {
  return Number.isSafeInteger(step.affectedCount)
    && step.affectedCount >= 0
    && typeof step.evidenceHash === 'string'
    && SHA256_HEX.test(step.evidenceHash);
}

export function evaluateAccountDeletionCompletion(
  input: AccountDeletionCompletionInput,
): AccountDeletionCompletionDecision {
  const blockers = new Set<AccountDeletionCompletionBlocker>();
  const required = requiredAccountDeletionSteps(input.accountKind);
  const seen = new Map<AccountDeletionStepCode, AccountDeletionStepEvidence>();

  if (input.requestStatus !== 'processing' && input.requestStatus !== 'manual_review') {
    blockers.add('request_status_not_completable');
  }
  if (!input.identityConfirmed) blockers.add('identity_not_confirmed');
  if (input.preflightResolution === null) blockers.add('preflight_not_resolved');
  if (input.leaseActive) blockers.add('worker_lease_active');

  for (const step of input.steps) {
    if (seen.has(step.code)) blockers.add('step_duplicate');
    else seen.set(step.code, step);
  }

  const missingSteps: AccountDeletionStepCode[] = [];
  for (const code of required) {
    const step = seen.get(code);
    if (!step) {
      missingSteps.push(code);
      blockers.add('step_missing');
      continue;
    }
    if (step.status !== 'completed') blockers.add('step_not_completed');
    if (!hasValidEvidence(step)) blockers.add('step_evidence_invalid');
  }

  return Object.freeze({
    eligible: blockers.size === 0,
    blockers: Object.freeze([...blockers]),
    missingSteps: Object.freeze(missingSteps),
  });
}
