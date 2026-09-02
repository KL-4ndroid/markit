import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createAccountDeletionRouteHandlers,
  isAccountDeletionRouteEnabledForEnv,
  type AccountDeletionRouteDeps,
  type AccountDeletionRouteRepository,
} from '../app/api/account-deletion/route';
import { parseAccountDeletionCreateRequest } from '../lib/subscription/account-deletion-api-contract';
import {
  requiredAccountDeletionSteps,
  type AccountDeletionStepEvidence,
} from '../lib/subscription/account-deletion-contract';
import { resolveAccountDeletionPreflight } from '../lib/subscription/account-deletion-preflight';
import {
  deriveAccountDeletionRequestHashes,
  evaluateAccountDeletionRecentReauth,
} from '../lib/subscription/account-deletion-reauth.server';
import {
  runAccountDeletionSagaTick,
  type AccountDeletionSagaRepository,
  type AccountDeletionSagaSnapshot,
} from '../lib/subscription/account-deletion-saga.server';
import type { LocalPendingWriteReport } from '../lib/sync/local-pending-write-report';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const now = Date.parse('2026-08-17T08:00:00.000Z');
const actorId = '11111111-1111-4111-8111-111111111111';
const requestStatus = {
  requestId: 'opaque_request_12345678',
  status: 'requested',
  safeErrorCode: null,
  requestedAt: '2026-08-17T08:00:00.000Z',
  updatedAt: '2026-08-17T08:00:00.000Z',
  nextActionAfter: null,
};

assert.equal(parseAccountDeletionCreateRequest({
  policyRevision: '2026-08-17',
  preflightResolution: 'clean',
  idempotencyKey: 'request-key-1234567890',
  acknowledgeStoreBillingContinues: true,
})?.preflightResolution, 'clean');
for (const forbidden of ['ownerId', 'staffId', 'email', 'objectKey', 'purchaseToken']) {
  assert.equal(parseAccountDeletionCreateRequest({
    policyRevision: '2026-08-17',
    preflightResolution: 'clean',
    idempotencyKey: 'request-key-1234567890',
    acknowledgeStoreBillingContinues: true,
    [forbidden]: 'forbidden',
  }), null);
}

assert.deepEqual(evaluateAccountDeletionRecentReauth({
  lastSignInAt: '2026-08-17T07:58:00.000Z',
  nowMs: now,
}), { accepted: true, code: 'recent_reauth_verified' });
assert.deepEqual(evaluateAccountDeletionRecentReauth({
  lastSignInAt: '2026-08-17T07:40:00.000Z',
  nowMs: now,
}), { accepted: false, code: 'recent_reauth_required' });
assert.equal(evaluateAccountDeletionRecentReauth({
  lastSignInAt: undefined,
  nowMs: now,
}).accepted, false);

const hashes = deriveAccountDeletionRequestHashes({
  secret: 's'.repeat(32),
  actorId,
  idempotencyKey: 'request-key-1234567890',
});
assert.match(hashes?.subjectRefHash ?? '', /^[0-9a-f]{64}$/u);
assert.match(hashes?.idempotencyHash ?? '', /^[0-9a-f]{64}$/u);
assert.notEqual(hashes?.subjectRefHash, hashes?.idempotencyHash);
assert.equal(deriveAccountDeletionRequestHashes({
  secret: 'short',
  actorId,
  idempotencyKey: 'request-key-1234567890',
}), null);

function report(overrides: Partial<LocalPendingWriteReport> = {}): LocalPendingWriteReport {
  return {
    checkedAt: now,
    userId: actorId,
    isOnline: true,
    syncLocked: false,
    pendingEventCount: 0,
    pendingEventIds: [],
    pendingEventCountByType: {},
    pendingEventCountByActorId: {},
    actorMismatchEventIds: [],
    unfinishedSyncQueueCount: 0,
    pendingSalesPhotoEvidenceCreationCount: 0,
    pendingSalesPhotoEvidenceCreationIds: [],
    pendingSalesPhotoEvidenceCreationCountByStatus: {},
    pendingSalesPhotoEvidencePayloadCount: 0,
    pendingSalesPhotoEvidencePayloadIds: [],
    pendingProductCoverPhotoUploadCount: 0,
    pendingProductCoverPhotoUploadIds: [],
    pendingProductCoverPhotoPayloadCount: 0,
    blockingReasonCodes: [],
    isClean: true,
    ...overrides,
  };
}

assert.deepEqual(resolveAccountDeletionPreflight({
  report: report(),
  safeExportAvailable: false,
}).resolution, 'clean');
assert.deepEqual(resolveAccountDeletionPreflight({
  report: report({
    isClean: false,
    blockingReasonCodes: ['actor_mismatch'],
    actorMismatchEventIds: ['event-id-not-exposed'],
  }),
  safeExportAvailable: true,
}).actions, ['resolve_actor_mismatch']);
const pendingDecision = resolveAccountDeletionPreflight({
  report: report({
    isClean: false,
    pendingEventCount: 2,
    blockingReasonCodes: ['local_pending_events'],
  }),
  safeExportAvailable: true,
});
assert.deepEqual(pendingDecision.actions, [
  'sync_and_recheck',
  'export_and_confirm',
  'discard_and_confirm',
]);
assert.equal(JSON.stringify(pendingDecision).includes('event-id'), false);

assert.equal(isAccountDeletionRouteEnabledForEnv({}), false);
assert.equal(isAccountDeletionRouteEnabledForEnv({
  ACCOUNT_DELETION_ROUTE_ENABLED: '1',
  ACCOUNT_DELETION_AD2_REPOSITORY_READY: '1',
  NODE_ENV: 'test',
}), true);
assert.equal(isAccountDeletionRouteEnabledForEnv({
  ACCOUNT_DELETION_ROUTE_ENABLED: '1',
  ACCOUNT_DELETION_AD2_REPOSITORY_READY: '1',
  VERCEL_ENV: 'production',
}), false);

function routeRequest(body?: unknown): Request {
  return new Request('https://api.example.test/api/account-deletion', {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const repository: AccountDeletionRouteRepository = {
  async readCurrentForActor(receivedActorId) {
    assert.equal(receivedActorId, actorId);
    return requestStatus;
  },
  async createForActor(input) {
    assert.equal(input.actorId, actorId);
    assert.equal(Object.hasOwn(input, 'ownerId'), false);
    assert.match(input.subjectRefHash, /^[0-9a-f]{64}$/u);
    return requestStatus;
  },
};

function routeDeps(overrides: Partial<AccountDeletionRouteDeps> = {}): AccountDeletionRouteDeps {
  return {
    isEnabled: () => true,
    nowMs: () => now,
    resolveActor: async () => ({ actorId, lastSignInAt: '2026-08-17T07:58:00.000Z' }),
    resolveHashSecret: () => 's'.repeat(32),
    createRepository: async () => repository,
    ...overrides,
  };
}

async function runAsyncTests(): Promise<void> {
const disabled = await createAccountDeletionRouteHandlers(routeDeps({
  isEnabled: () => false,
  resolveActor: async () => { throw new Error('disabled route must not authenticate'); },
})).POST(routeRequest({}));
assert.equal(disabled.status, 501);

const stale = await createAccountDeletionRouteHandlers(routeDeps({
  resolveActor: async () => ({ actorId, lastSignInAt: '2026-08-17T07:00:00.000Z' }),
})).POST(routeRequest({
  policyRevision: '2026-08-17',
  preflightResolution: 'clean',
  idempotencyKey: 'request-key-1234567890',
  acknowledgeStoreBillingContinues: true,
}));
assert.equal(stale.status, 409);

const accepted = await createAccountDeletionRouteHandlers(routeDeps()).POST(routeRequest({
  policyRevision: '2026-08-17',
  preflightResolution: 'clean',
  idempotencyKey: 'request-key-1234567890',
  acknowledgeStoreBillingContinues: true,
}));
assert.equal(accepted.status, 202);
assert.doesNotMatch(await accepted.text(), /actorId|ownerId|email|objectKey|purchaseToken/u);

function allCompletedSteps(): AccountDeletionStepEvidence[] {
  return requiredAccountDeletionSteps('staff').map(code => ({
    code,
    status: 'completed',
    affectedCount: 0,
    evidenceHash: 'a'.repeat(64),
  }));
}

function sagaRepository(snapshot: AccountDeletionSagaSnapshot) {
  const recorded: string[] = [];
  const repository: AccountDeletionSagaRepository = {
    async claimLease() {
      return { claimed: true, leaseToken: 'lease-token', snapshot };
    },
    async recordStepResult(input) {
      recorded.push(input.stepCode);
    },
    async finalizeCompletion(input) {
      assert.deepEqual(input.requiredSteps, requiredAccountDeletionSteps('staff'));
      return 'completed';
    },
    async releaseLease() {},
  };
  return { repository, recorded };
}

const firstStepFixture = sagaRepository({
  requestId: 'request-id',
  accountKind: 'staff',
  requestStatus: 'processing',
  identityConfirmed: true,
  preflightResolution: 'clean',
  steps: [],
});
assert.deepEqual(await runAccountDeletionSagaTick({
  requestId: 'request-id',
  workerId: 'worker-001',
  nowMs: now,
  leaseDurationMs: 30_000,
  repository: firstStepFixture.repository,
  executeStep: async input => ({
    outcome: 'completed',
    affectedCount: 0,
    evidenceHash: 'b'.repeat(64),
  }),
}), { outcome: 'step_recorded', stepCode: 'access_frozen' });
assert.deepEqual(firstStepFixture.recorded, ['access_frozen']);

const completionFixture = sagaRepository({
  requestId: 'request-id',
  accountKind: 'staff',
  requestStatus: 'processing',
  identityConfirmed: true,
  preflightResolution: 'discard_confirmed',
  steps: allCompletedSteps(),
});
assert.deepEqual(await runAccountDeletionSagaTick({
  requestId: 'request-id',
  workerId: 'worker-001',
  nowMs: now,
  leaseDurationMs: 30_000,
  repository: completionFixture.repository,
  executeStep: async () => { throw new Error('no step may run after all evidence completes'); },
}), { outcome: 'completed', stepCode: null });

const settingsSource = read('app/settings/data/page.tsx');
assert.doesNotMatch(settingsSource, /delete_current_user_app_data/);
assert.match(settingsSource, /舊的雲端資料清除功能不等同帳號刪除/);
assert.match(settingsSource, /帳號刪除尚未啟用/);

console.log('PASS account deletion AD2 foundation is disabled by default and fail closed');
}

void runAsyncTests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
