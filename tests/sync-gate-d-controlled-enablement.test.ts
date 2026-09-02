import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  getSyncGateDFlags,
  isSyncGateDFlagEnabled,
  resetSyncGateDControlledTestFlags,
  setSyncGateDControlledTestFlags,
} from '../lib/sync/sync-gate-d-flags';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const flagSource = readProjectFile('lib/sync/sync-gate-d-flags.ts');
const adapterSource = readProjectFile('lib/markets/field-ops-write-router.ts');

const productionRoots = [
  'app',
  'components',
  'hooks',
  'lib/analytics',
  'lib/db',
  'lib/events',
  'lib/markets',
  'lib/permissions',
  'lib/supabase',
  'lib/sync',
];

function collectProjectFiles(path: string): string[] {
  const absolutePath = join(projectRoot, path);
  const stat = statSync(absolutePath);

  if (stat.isFile()) {
    return path.endsWith('.ts') || path.endsWith('.tsx') ? [path] : [];
  }

  return readdirSync(absolutePath)
    .flatMap(entry => collectProjectFiles(join(path, entry)))
    .filter(file => !file.includes(`${join('lib', 'sync', 'sync-gate-d-flags.ts')}`));
}

console.log('\n=== Sync Gate D controlled enablement ===');

runTest('D3c-2d controlled enablement defaults to fully disabled', () => {
  resetSyncGateDControlledTestFlags();
  assert.deepEqual(getSyncGateDFlags(), {
    cloudPendingOperationsStorage: false,
    pendingOperationWriteRouting: false,
    pendingOperationDrainAfterEnqueue: false,
    cacheReplacementExecute: false,
  });
});

runTest('controlled enablement can turn on only enqueue plus drain together', () => {
  const reset = setSyncGateDControlledTestFlags(
    {
      pendingOperationWriteRouting: true,
      pendingOperationDrainAfterEnqueue: true,
    },
    'D3c-2d controlled runtime verification'
  );

  assert.equal(isSyncGateDFlagEnabled('pendingOperationWriteRouting'), true);
  assert.equal(isSyncGateDFlagEnabled('pendingOperationDrainAfterEnqueue'), true);
  assert.equal(isSyncGateDFlagEnabled('cloudPendingOperationsStorage'), false);
  assert.equal(isSyncGateDFlagEnabled('cacheReplacementExecute'), false);

  reset();
  assert.equal(isSyncGateDFlagEnabled('pendingOperationWriteRouting'), false);
  assert.equal(isSyncGateDFlagEnabled('pendingOperationDrainAfterEnqueue'), false);
});

runTest('controlled enablement rejects broad Gate D flags and unknown names', () => {
  assert.throws(
    () =>
      setSyncGateDControlledTestFlags(
        { cloudPendingOperationsStorage: true },
        'D3c-2d controlled runtime verification'
      ),
    /cannot be changed/
  );

  assert.throws(
    () =>
      setSyncGateDControlledTestFlags(
        { cacheReplacementExecute: true },
        'D3c-2d controlled runtime verification'
      ),
    /cannot be changed/
  );

  assert.throws(
    () =>
      setSyncGateDControlledTestFlags(
        { unknownGateDFlag: true } as never,
        'D3c-2d controlled runtime verification'
      ),
    /Unknown Gate D flag/
  );
});

runTest('controlled enablement remains manual and does not read public env or storage', () => {
  assert.match(flagSource, /process\.env\.NODE_ENV === 'production'/);
  assert.doesNotMatch(flagSource, /NEXT_PUBLIC|localStorage|sessionStorage/);
  assert.match(flagSource, /D3c-2d controlled runtime verification/);
});

runTest('controlled enablement API is not consumed by production app surfaces', () => {
  const matches: string[] = [];

  for (const path of productionRoots.flatMap(collectProjectFiles)) {
    const source = readProjectFile(path);
    if (/setSyncGateDControlledTestFlags|resetSyncGateDControlledTestFlags/.test(source)) {
      matches.push(path);
    }
  }

  assert.deepEqual(matches, []);
});

runTest('adapter still requires both routing and drain gates before RPC drain', () => {
  assert.match(adapterSource, /isSyncGateDFlagEnabled\(['"]pendingOperationWriteRouting['"]\)/);
  assert.match(adapterSource, /supabase\.rpc\(['"]enqueue_checklist_toggle_pending_operation['"]/);
  assert.match(adapterSource, /isSyncGateDFlagEnabled\(['"]pendingOperationDrainAfterEnqueue['"]\)/);
  assert.match(adapterSource, /supabase\.rpc\(['"]drain_checklist_toggle_pending_operation['"]/);
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

  resetSyncGateDControlledTestFlags();

  if (failed > 0) {
    throw new Error(`${failed} controlled enablement tests failed`);
  }
}

main();
