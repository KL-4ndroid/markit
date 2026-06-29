import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { simulateCacheReplacementApply } from '../lib/sync/cache-replacement-apply-simulator';
import { previewCacheReplacement } from '../lib/sync/cache-replacement-preview';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function operationTypes(operations: Array<{ type: string }>): string[] {
  return operations.map(operation => operation.type);
}

console.log('\n=== Cache replacement apply simulator ===');

runTest('simulator converts preview output into a non-executable operation report', () => {
  const preview = previewCacheReplacement({
    scope: 'owner-full',
    authorizedIds: [
      'add-1',
      'update-1',
      'keep-1',
      'pending-1',
      'local-only-1',
      'blocked-1',
      'delete-1',
    ],
    localRecords: [
      { id: 'update-1', updatedAt: '2026-06-19T00:00:00.000Z', sync_status: 'synced' },
      { id: 'keep-1', updatedAt: '2026-06-20T00:00:00.000Z', sync_status: 'synced' },
      { id: 'pending-1', updatedAt: '2026-06-18T00:00:00.000Z', sync_status: 'pending' },
      { id: 'local-only-1', updatedAt: '2026-06-18T00:00:00.000Z', sync_status: 'local_only' },
      { id: 'blocked-1', updatedAt: '2026-06-18T00:00:00.000Z', status: 'blocked_permission' },
      { id: 'delete-1', updatedAt: '2026-06-17T00:00:00.000Z', sync_status: 'synced' },
    ],
    remoteRecords: [
      { id: 'add-1', updatedAt: '2026-06-20T00:00:00.000Z' },
      { id: 'update-1', updatedAt: '2026-06-20T00:00:00.000Z' },
      { id: 'keep-1', updatedAt: '2026-06-20T00:00:00.000Z' },
      { id: 'pending-1', updatedAt: '2026-06-20T00:00:00.000Z' },
      { id: 'local-only-1', updatedAt: '2026-06-20T00:00:00.000Z' },
      { id: 'blocked-1', updatedAt: '2026-06-20T00:00:00.000Z' },
    ],
  });

  const simulation = simulateCacheReplacementApply(preview);

  assert.equal(simulation.scope, 'owner-full');
  assert.equal(simulation.canExecute, false);
  assert.equal(simulation.requiresExplicitExecuteApproval, true);
  assert.deepEqual(operationTypes(simulation.operations), [
    'add',
    'update',
    'keep',
    'skip_pending',
    'skip_local_only',
    'skip_blocked',
    'delete_candidate',
  ]);
  assert.deepEqual(simulation.counts, {
    add: 1,
    update: 1,
    keep: 1,
    skip_pending: 1,
    skip_local_only: 1,
    skip_blocked: 1,
    delete_candidate: 1,
  });
  assert.equal(simulation.destructiveOperationCount, 1);
  assert.equal(simulation.operations.at(-1)?.destructive, true);
  assert.equal(simulation.operations.at(-1)?.requiresApproval, true);
});

runTest('simulator is side-effect free and preserves preview warnings', () => {
  const preview = previewCacheReplacement({
    scope: 'staff-view',
    authorizedIds: ['visible-1', 'missing-visible-1'],
    localRecords: [
      { id: 'visible-1', updatedAt: '2026-06-20T00:00:00.000Z', sync_status: 'synced' },
      { id: 'missing-visible-1', updatedAt: '2026-06-19T00:00:00.000Z', sync_status: 'synced' },
      { id: 'owner-only-local-1', updatedAt: '2026-06-20T00:00:00.000Z', sync_status: 'synced' },
    ],
    remoteRecords: [
      { id: 'visible-1', updatedAt: '2026-06-20T00:00:00.000Z' },
      { id: 'outside-remote-1', updatedAt: '2026-06-20T00:00:00.000Z' },
    ],
  });
  const before = JSON.stringify(preview);

  const simulation = simulateCacheReplacementApply(preview);

  assert.equal(JSON.stringify(preview), before);
  assert.deepEqual(simulation.warnings, [
    'remote record outside-remote-1 is outside authorized scope',
    'staff-view preview ignored 1 local record(s) outside authorized scope',
  ]);
  assert.deepEqual(operationTypes(simulation.operations), ['keep', 'delete_candidate']);
  assert.equal(simulation.canExecute, false);
});

runTest('production sync paths do not import cache replacement apply simulator', () => {
  const productionSyncFiles = [
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
    'lib/sync/local-cache-writer.ts',
  ];

  const matches = productionSyncFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /cache-replacement-apply-simulator/.test(source);
  });

  assert.deepEqual(matches, []);
});

runTest('full test suite includes cache replacement apply simulator guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/sync-cache-replacement-apply-simulator\.test\.ts/);
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
    throw new Error(`${failed} cache replacement apply simulator tests failed`);
  }
}

main();
