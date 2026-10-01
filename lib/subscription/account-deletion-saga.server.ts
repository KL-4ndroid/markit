import {
  evaluateAccountDeletionCompletion,
  requiredAccountDeletionSteps,
  type AccountDeletionAccountKind,
  type AccountDeletionPreflightResolution,
  type AccountDeletionRequestStatus,
  type AccountDeletionStepCode,
  type AccountDeletionStepEvidence,
} from './account-deletion-contract';

export type AccountDeletionSagaSnapshot = Readonly<{
  requestId: string;
  accountKind: AccountDeletionAccountKind;
  requestStatus: AccountDeletionRequestStatus;
  identityConfirmed: boolean;
  preflightResolution: AccountDeletionPreflightResolution;
  steps: readonly AccountDeletionStepEvidence[];
}>;

export type AccountDeletionSagaStepResult =
  | Readonly<{ outcome: 'completed'; affectedCount: number; evidenceHash: string }>
  | Readonly<{ outcome: 'failed_retryable' | 'manual_review'; safeErrorCode: string }>;

export type AccountDeletionSagaRepository = {
  claimLease(input: {
    requestId: string;
    workerId: string;
    nowMs: number;
    leaseDurationMs: number;
  }): Promise<Readonly<{
    claimed: boolean;
    leaseToken: string | null;
    snapshot: AccountDeletionSagaSnapshot | null;
  }>>;
  recordStepResult(input: {
    requestId: string;
    leaseToken: string;
    stepCode: AccountDeletionStepCode;
    result: AccountDeletionSagaStepResult;
  }): Promise<void>;
  finalizeCompletion(input: {
    requestId: string;
    leaseToken: string;
    requiredSteps: readonly AccountDeletionStepCode[];
  }): Promise<'completed' | 'incomplete' | 'lease_lost'>;
  releaseLease(input: { requestId: string; leaseToken: string }): Promise<void>;
};

export type AccountDeletionSagaStepExecutor = (
  input: Readonly<{
    requestId: string;
    accountKind: AccountDeletionAccountKind;
    stepCode: AccountDeletionStepCode;
  }>,
) => Promise<AccountDeletionSagaStepResult>;

export type AccountDeletionSagaTickResult = Readonly<{
  outcome:
    | 'lease_not_acquired'
    | 'request_not_processable'
    | 'step_recorded'
    | 'completed'
    | 'completion_incomplete'
    | 'lease_lost'
    | 'repository_unavailable';
  stepCode: AccountDeletionStepCode | null;
}>;

const SAFE_WORKER_ID = /^[A-Za-z0-9._:-]{8,128}$/u;
const LEASE_DURATION_MIN_MS = 5_000;
const LEASE_DURATION_MAX_MS = 5 * 60 * 1000;

function nextRequiredStep(snapshot: AccountDeletionSagaSnapshot): AccountDeletionStepCode | null {
  const completed = new Set(
    snapshot.steps
      .filter(step => step.status === 'completed')
      .map(step => step.code),
  );
  return requiredAccountDeletionSteps(snapshot.accountKind)
    .find(code => !completed.has(code)) ?? null;
}

async function releaseQuietly(
  repository: AccountDeletionSagaRepository,
  requestId: string,
  leaseToken: string,
): Promise<void> {
  try {
    await repository.releaseLease({ requestId, leaseToken });
  } catch {
    // The lease has a bounded expiry. Do not overwrite the primary safe outcome.
  }
}

export async function runAccountDeletionSagaTick(input: {
  requestId: string;
  workerId: string;
  nowMs: number;
  leaseDurationMs: number;
  repository: AccountDeletionSagaRepository;
  executeStep: AccountDeletionSagaStepExecutor;
}): Promise<AccountDeletionSagaTickResult> {
  if (
    !input.requestId
    || !SAFE_WORKER_ID.test(input.workerId)
    || !Number.isFinite(input.nowMs)
    || !Number.isInteger(input.leaseDurationMs)
    || input.leaseDurationMs < LEASE_DURATION_MIN_MS
    || input.leaseDurationMs > LEASE_DURATION_MAX_MS
  ) return Object.freeze({ outcome: 'repository_unavailable', stepCode: null });

  let claim: Awaited<ReturnType<AccountDeletionSagaRepository['claimLease']>>;
  try {
    claim = await input.repository.claimLease({
      requestId: input.requestId,
      workerId: input.workerId,
      nowMs: input.nowMs,
      leaseDurationMs: input.leaseDurationMs,
    });
  } catch {
    return Object.freeze({ outcome: 'repository_unavailable', stepCode: null });
  }

  if (!claim.claimed) return Object.freeze({ outcome: 'lease_not_acquired', stepCode: null });
  if (!claim.leaseToken || !claim.snapshot) {
    return Object.freeze({ outcome: 'repository_unavailable', stepCode: null });
  }

  const { snapshot } = claim;
  if (snapshot.requestStatus !== 'processing' && snapshot.requestStatus !== 'manual_review') {
    await releaseQuietly(input.repository, snapshot.requestId, claim.leaseToken);
    return Object.freeze({ outcome: 'request_not_processable', stepCode: null });
  }

  const stepCode = nextRequiredStep(snapshot);
  if (stepCode) {
    let result: AccountDeletionSagaStepResult;
    try {
      result = await input.executeStep({
        requestId: snapshot.requestId,
        accountKind: snapshot.accountKind,
        stepCode,
      });
      await input.repository.recordStepResult({
        requestId: snapshot.requestId,
        leaseToken: claim.leaseToken,
        stepCode,
        result,
      });
    } catch {
      await releaseQuietly(input.repository, snapshot.requestId, claim.leaseToken);
      return Object.freeze({ outcome: 'repository_unavailable', stepCode });
    }
    await releaseQuietly(input.repository, snapshot.requestId, claim.leaseToken);
    return Object.freeze({ outcome: 'step_recorded', stepCode });
  }

  const decision = evaluateAccountDeletionCompletion({
    accountKind: snapshot.accountKind,
    requestStatus: snapshot.requestStatus,
    identityConfirmed: snapshot.identityConfirmed,
    preflightResolution: snapshot.preflightResolution,
    leaseActive: false,
    steps: snapshot.steps,
  });
  if (!decision.eligible) {
    await releaseQuietly(input.repository, snapshot.requestId, claim.leaseToken);
    return Object.freeze({ outcome: 'completion_incomplete', stepCode: null });
  }

  try {
    const finalized = await input.repository.finalizeCompletion({
      requestId: snapshot.requestId,
      leaseToken: claim.leaseToken,
      requiredSteps: requiredAccountDeletionSteps(snapshot.accountKind),
    });
    if (finalized === 'completed') return Object.freeze({ outcome: 'completed', stepCode: null });
    if (finalized === 'lease_lost') return Object.freeze({ outcome: 'lease_lost', stepCode: null });
    await releaseQuietly(input.repository, snapshot.requestId, claim.leaseToken);
    return Object.freeze({ outcome: 'completion_incomplete', stepCode: null });
  } catch {
    await releaseQuietly(input.repository, snapshot.requestId, claim.leaseToken);
    return Object.freeze({ outcome: 'repository_unavailable', stepCode: null });
  }
}
