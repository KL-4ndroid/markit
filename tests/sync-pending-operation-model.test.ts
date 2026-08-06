import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createLocalPendingOperation,
  markPendingOperationPermissionBlocked,
  markPendingOperationProcessing,
  markPendingOperationRetryableFailure,
  markPendingOperationSynced,
  shouldRetryPendingOperation,
} from '../lib/sync/pending-operation-model';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const baseInput = {
  operationId: 'op-1',
  operationType: 'field_note_create' as const,
  entityType: 'field_note' as const,
  entityId: 'note-1',
  marketId: 'market-1',
  payload: { text: 'setup reminder' },
  idempotencyKey: 'field-note-create:note-1:v1',
  actorId: 'user-1',
  roleSnapshot: {
    isOwner: false,
    staffRole: 'manager' as const,
    capabilities: ['canManageFieldNotes' as const],
  },
  now: '2026-06-20T00:00:00.000Z',
};

runTest('creates a local-only pending operation with required fields', () => {
  const operation = createLocalPendingOperation(baseInput);

  assert.equal(operation.operationId, 'op-1');
  assert.equal(operation.operationType, 'field_note_create');
  assert.equal(operation.entityType, 'field_note');
  assert.equal(operation.entityId, 'note-1');
  assert.equal(operation.marketId, 'market-1');
  assert.deepEqual(operation.payload, { text: 'setup reminder' });
  assert.equal(operation.idempotencyKey, 'field-note-create:note-1:v1');
  assert.equal(operation.actorId, 'user-1');
  assert.deepEqual(operation.roleSnapshot, {
    isOwner: false,
    staffRole: 'manager',
    capabilities: ['canManageFieldNotes'],
  });
  assert.equal(operation.status, 'pending');
  assert.equal(operation.retryCount, 0);
  assert.equal(operation.createdAt, '2026-06-20T00:00:00.000Z');
  assert.equal(operation.updatedAt, '2026-06-20T00:00:00.000Z');
  assert.equal(operation.lastErrorCode, null);
  assert.equal(operation.lastErrorMessage, null);
});

runTest('requires an idempotency key before any cloud migration is considered', () => {
  assert.throws(
    () => createLocalPendingOperation({ ...baseInput, idempotencyKey: '   ' }),
    /idempotencyKey is required/
  );
});

runTest('retryable failures increment retry count and remain retryable', () => {
  const operation = createLocalPendingOperation(baseInput);
  const processing = markPendingOperationProcessing(operation, '2026-06-20T00:01:00.000Z');
  const failed = markPendingOperationRetryableFailure(processing, {
    code: 'network_error',
    message: 'temporary outage',
    now: '2026-06-20T00:02:00.000Z',
  });

  assert.equal(failed.status, 'failed_retryable');
  assert.equal(failed.retryCount, 1);
  assert.equal(failed.lastErrorCode, 'network_error');
  assert.equal(failed.lastErrorMessage, 'temporary outage');
  assert.equal(shouldRetryPendingOperation(failed), true);
});

runTest('permission-blocked operations do not retry automatically', () => {
  const operation = createLocalPendingOperation(baseInput);
  const blocked = markPendingOperationPermissionBlocked(operation, {
    code: 'permission_denied',
    message: 'role was downgraded',
    now: '2026-06-20T00:03:00.000Z',
  });

  assert.equal(blocked.status, 'blocked_permission');
  assert.equal(blocked.retryCount, 0);
  assert.equal(blocked.lastErrorCode, 'permission_denied');
  assert.equal(shouldRetryPendingOperation(blocked), false);
});

runTest('synced operations clear transient errors', () => {
  const operation = createLocalPendingOperation(baseInput);
  const failed = markPendingOperationRetryableFailure(operation, {
    code: 'network_error',
    message: 'temporary outage',
    now: '2026-06-20T00:02:00.000Z',
  });
  const synced = markPendingOperationSynced(failed, '2026-06-20T00:04:00.000Z');

  assert.equal(synced.status, 'synced');
  assert.equal(synced.retryCount, 1);
  assert.equal(synced.lastErrorCode, null);
  assert.equal(synced.lastErrorMessage, null);
  assert.equal(shouldRetryPendingOperation(synced), false);
});

runTest('production sync paths do not import the local-only model', () => {
  const projectRoot = join(__dirname, '..');
  const productionSyncFiles = [
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
    'lib/sync/local-cache-writer.ts',
  ];

  const matches = productionSyncFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /pending-operation-model/.test(source);
  });

  assert.deepEqual(matches, []);
});

function main(): void {
  let failed = 0;

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} pending operation model tests failed`);
  }
}

main();
