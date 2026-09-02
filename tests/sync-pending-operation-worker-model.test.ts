import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  classifyPendingOperationWorkerCandidate,
  createLocalPendingOperation,
  derivePendingOperationFinalEventId,
  markPendingOperationPermanentFailure,
  markPendingOperationRetryableFailure,
  markPendingOperationSynced,
} from '../lib/sync/pending-operation-model';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

const baseInput = {
  operationId: 'c466de02-d79a-4ae8-adc0-44b3fa0efd06',
  operationType: 'checklist_item_toggle' as const,
  entityType: 'checklist_item' as const,
  entityId: 'checklist-item-1',
  marketId: 'market-1',
  payload: { market_id: 'market-1', itemId: 'checklist-item-1', completed: true },
  idempotencyKey: 'checklist-toggle:checklist-item-1:c466de02',
  actorId: 'user-1',
  roleSnapshot: {
    isOwner: true,
    staffRole: null,
    capabilities: [],
  },
  now: '2026-06-29T00:00:00.000Z',
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function retryableOperation(overrides: Partial<typeof baseInput> = {}) {
  return markPendingOperationRetryableFailure(
    createLocalPendingOperation({ ...baseInput, ...overrides }),
    {
      code: 'network_error',
      message: 'temporary outage',
      now: '2026-06-29T00:01:00.000Z',
    }
  );
}

console.log('\n=== Pending operation worker model ===');

runTest('derives deterministic final event id from UUID operation id', () => {
  const operation = createLocalPendingOperation(baseInput);

  assert.equal(
    derivePendingOperationFinalEventId(operation),
    'c466de02-d79a-4ae8-adc0-44b3fa0efd06'
  );
  assert.equal(
    derivePendingOperationFinalEventId({ operationId: 'not-a-uuid' }),
    null
  );
});

runTest('classifies only failed_retryable checklist toggles as worker candidates', () => {
  const decision = classifyPendingOperationWorkerCandidate(retryableOperation());

  assert.deepEqual(decision, {
    eligible: true,
    reason: 'eligible',
    finalEventId: 'c466de02-d79a-4ae8-adc0-44b3fa0efd06',
  });
});

runTest('blocks pending synced permanent and permission-blocked statuses from worker retry', () => {
  const pending = createLocalPendingOperation(baseInput);
  const retryable = retryableOperation();
  const synced = markPendingOperationSynced(retryable, '2026-06-29T00:02:00.000Z');
  const permanent = markPendingOperationPermanentFailure(pending, {
    code: 'invalid_payload',
    message: 'bad payload',
    now: '2026-06-29T00:03:00.000Z',
  });
  const blocked = {
    ...pending,
    status: 'blocked_permission' as const,
  };

  for (const operation of [pending, synced, permanent, blocked]) {
    const decision = classifyPendingOperationWorkerCandidate(operation);
    assert.equal(decision.eligible, false);
    assert.equal(decision.reason, 'status_not_retryable');
  }
});

runTest('blocks retryable rows after max retry count', () => {
  const retryable = {
    ...retryableOperation(),
    retryCount: 3,
  };

  assert.deepEqual(classifyPendingOperationWorkerCandidate(retryable, { maxRetryCount: 3 }), {
    eligible: false,
    reason: 'max_retry_exceeded',
    finalEventId: 'c466de02-d79a-4ae8-adc0-44b3fa0efd06',
  });
});

runTest('blocks unsupported operation entity and invalid final event id', () => {
  assert.equal(
    classifyPendingOperationWorkerCandidate(retryableOperation({
      operationType: 'field_note_create',
      entityType: 'field_note',
      entityId: 'note-1',
      payload: { text: 'note' },
    })).reason,
    'unsupported_operation'
  );

  assert.equal(
    classifyPendingOperationWorkerCandidate(retryableOperation({
      entityType: 'field_note',
    })).reason,
    'unsupported_entity'
  );

  assert.equal(
    classifyPendingOperationWorkerCandidate(retryableOperation({
      operationId: 'not-a-uuid',
    })).reason,
    'invalid_operation_id'
  );
});

runTest('production files do not mount a pending operation worker', () => {
  const productionFiles = [
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
    'lib/sync/local-cache-writer.ts',
    'components/common/OwnerPendingOperationDiagnosticsPanel.tsx',
  ];

  const matches = productionFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /pending-operation-worker|sync-pending-operation-worker-model|classifyPendingOperationWorkerCandidate|processPendingOperationWorker|pendingOperationsWorker/i.test(source);
  });

  assert.deepEqual(matches, []);
});

runTest('full test suite includes pending operation worker model guardrail', () => {
  assert.match(testManifestSource, /tsx tests\/sync-pending-operation-worker-model\.test\.ts/);
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
    throw new Error(`${failed} pending operation worker model tests failed`);
  }
}

main();
