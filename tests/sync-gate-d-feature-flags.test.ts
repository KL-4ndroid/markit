import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getSyncGateDFlags,
  isSyncGateDFlagEnabled,
  isSyncGateDFlagName,
  resetSyncGateDControlledTestFlags,
  setSyncGateDControlledTestFlags,
  SYNC_GATE_D_FLAGS,
} from '../lib/sync/sync-gate-d-flags';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const flagSource = readFileSync(join(projectRoot, 'lib/sync/sync-gate-d-flags.ts'), 'utf8');
const productionSyncFiles = [
  'hooks/useSync.ts',
  'lib/sync/sync-push-service.ts',
  'lib/sync/owner-pull-service.ts',
  'lib/sync/staff-pull-service.ts',
  'lib/sync/local-cache-writer.ts',
];

runTest('Gate D flags default to disabled', () => {
  assert.deepEqual(SYNC_GATE_D_FLAGS, {
    cloudPendingOperationsStorage: false,
    pendingOperationWriteRouting: false,
    pendingOperationDrainAfterEnqueue: false,
    cacheReplacementExecute: false,
  });

  assert.equal(isSyncGateDFlagEnabled('cloudPendingOperationsStorage'), false);
  assert.equal(isSyncGateDFlagEnabled('pendingOperationWriteRouting'), false);
  assert.equal(isSyncGateDFlagEnabled('pendingOperationDrainAfterEnqueue'), false);
  assert.equal(isSyncGateDFlagEnabled('cacheReplacementExecute'), false);
});

runTest('unknown Gate D flags fail closed', () => {
  assert.equal(isSyncGateDFlagName('pendingOperationWriteRouting'), true);
  assert.equal(isSyncGateDFlagName('pendingOperationDrainAfterEnqueue'), true);
  assert.equal(isSyncGateDFlagName('unknownGateDFlag'), false);
  assert.equal(isSyncGateDFlagEnabled('unknownGateDFlag'), false);
});

runTest('Gate D flags avoid external control planes and guard controlled test overrides', () => {
  assert.match(flagSource, /process\.env\.NODE_ENV === 'production'/);
  assert.doesNotMatch(flagSource, /NEXT_PUBLIC|localStorage|sessionStorage/);
  assert.doesNotMatch(flagSource, /supabase|from\(|db\.|Dexie/);
});

runTest('Gate D flag shell does not import pending operation or cache replacement helpers', () => {
  assert.doesNotMatch(flagSource, /pending-operation-model|cache-replacement-preview/);
});

runTest('production sync paths do not consume Gate D flags yet', () => {
  const matches = productionSyncFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /sync-gate-d-flags|SYNC_GATE_D_FLAGS|isSyncGateDFlagEnabled/.test(source);
  });

  assert.deepEqual(matches, []);
});

runTest('getSyncGateDFlags returns a copy', () => {
  const flags = getSyncGateDFlags();
  flags.pendingOperationWriteRouting = true as false;
  flags.pendingOperationDrainAfterEnqueue = true as false;

  assert.equal(SYNC_GATE_D_FLAGS.pendingOperationWriteRouting, false);
  assert.equal(SYNC_GATE_D_FLAGS.pendingOperationDrainAfterEnqueue, false);
  assert.equal(getSyncGateDFlags().pendingOperationWriteRouting, false);
  assert.equal(getSyncGateDFlags().pendingOperationDrainAfterEnqueue, false);
});

runTest('controlled test flags can enable only the approved D3c-2d pair and reset', () => {
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

runTest('controlled test flags reject broad storage cache and unapproved reasons', () => {
  assert.throws(
    () =>
      setSyncGateDControlledTestFlags(
        { pendingOperationWriteRouting: true },
        'manual local testing'
      ),
    /approved D3c-2d reason/
  );

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

  resetSyncGateDControlledTestFlags();
  assert.equal(isSyncGateDFlagEnabled('pendingOperationWriteRouting'), false);
  assert.equal(isSyncGateDFlagEnabled('pendingOperationDrainAfterEnqueue'), false);
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
    throw new Error(`${failed} Gate D feature flag tests failed`);
  }
}

main();
