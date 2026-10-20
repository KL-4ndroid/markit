import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const pendingOperationSource = readProjectFile('lib/sync/pending-operation-model.ts');
const cacheReplacementSource = readProjectFile('lib/sync/cache-replacement-preview.ts');
const cacheReplacementSimulatorSource = readProjectFile('lib/sync/cache-replacement-apply-simulator.ts');
const productionSyncFiles = [
  'hooks/useSync.ts',
  'lib/sync/sync-push-service.ts',
  'lib/sync/owner-pull-service.ts',
  'lib/sync/staff-pull-service.ts',
  'lib/sync/local-cache-writer.ts',
];

console.log('\n=== Sync Gate D model isolation ===');

runTest('pending operation model remains local-only and side-effect free', () => {
  assert.doesNotMatch(pendingOperationSource, /@\/lib\/supabase|supabase/);
  assert.doesNotMatch(pendingOperationSource, /@\/lib\/db|db\.|Dexie|indexedDB/i);
  assert.doesNotMatch(pendingOperationSource, /localStorage|sessionStorage|process\.env|NEXT_PUBLIC/);
  assert.doesNotMatch(pendingOperationSource, /fetch\(|XMLHttpRequest|navigator\.onLine/);
  assert.doesNotMatch(pendingOperationSource, /recordEvent\(|insert\(|update\(|delete\(/);
  assert.doesNotMatch(pendingOperationSource, /setInterval|setTimeout|Worker\(|navigator\.serviceWorker/);
});

runTest('cache replacement preview remains preview-only and side-effect free', () => {
  assert.doesNotMatch(cacheReplacementSource, /@\/lib\/supabase|supabase/);
  assert.doesNotMatch(cacheReplacementSource, /@\/lib\/db|db\.|Dexie|indexedDB/i);
  assert.doesNotMatch(cacheReplacementSource, /localStorage|sessionStorage|process\.env|NEXT_PUBLIC/);
  assert.doesNotMatch(cacheReplacementSource, /fetch\(|XMLHttpRequest|navigator\.onLine/);
  assert.doesNotMatch(cacheReplacementSource, /put\(|bulkPut\(|delete\(|clear\(|transaction\(/);
});

runTest('cache replacement apply simulator remains report-only and side-effect free', () => {
  assert.doesNotMatch(cacheReplacementSimulatorSource, /@\/lib\/supabase|supabase/);
  assert.doesNotMatch(cacheReplacementSimulatorSource, /@\/lib\/db|db\.|Dexie|indexedDB/i);
  assert.doesNotMatch(cacheReplacementSimulatorSource, /localStorage|sessionStorage|process\.env|NEXT_PUBLIC/);
  assert.doesNotMatch(cacheReplacementSimulatorSource, /fetch\(|XMLHttpRequest|navigator\.onLine/);
  assert.doesNotMatch(cacheReplacementSimulatorSource, /put\(|bulkPut\(|delete\(|clear\(|transaction\(/);
  assert.match(cacheReplacementSimulatorSource, /canExecute:\s*false/);
  assert.match(cacheReplacementSimulatorSource, /requiresExplicitExecuteApproval:\s*true/);
});

runTest('Gate D models do not import each other or feature flags', () => {
  assert.doesNotMatch(pendingOperationSource, /cache-replacement-preview|sync-gate-d-flags/);
  assert.doesNotMatch(cacheReplacementSource, /pending-operation-model|sync-gate-d-flags/);
  assert.doesNotMatch(cacheReplacementSimulatorSource, /pending-operation-model|sync-gate-d-flags/);
});

runTest('production sync still does not consume Gate D models or flags', () => {
  const matches = productionSyncFiles.filter(file => {
    const source = readProjectFile(file);
    return /pending-operation-model|cache-replacement-preview|cache-replacement-apply-simulator|sync-gate-d-flags/.test(source);
  });

  assert.deepEqual(matches, []);
});

runTest('pending operation status lifecycle stays explicit', () => {
  assert.match(pendingOperationSource, /PENDING_OPERATION_STATUSES\s*=\s*\[[\s\S]*['"]pending['"][\s\S]*['"]processing['"][\s\S]*['"]synced['"][\s\S]*['"]failed_retryable['"][\s\S]*['"]failed_permanent['"][\s\S]*['"]blocked_permission['"]/);
  assert.match(pendingOperationSource, /status:\s*['"]pending['"]/);
  assert.match(pendingOperationSource, /status:\s*['"]processing['"]/);
  assert.match(pendingOperationSource, /status:\s*['"]synced['"]/);
  assert.match(pendingOperationSource, /status:\s*['"]failed_retryable['"]/);
  assert.match(pendingOperationSource, /status:\s*['"]failed_permanent['"]/);
  assert.match(pendingOperationSource, /status:\s*['"]blocked_permission['"]/);
  assert.match(pendingOperationSource, /return operation\.status === ['"]failed_retryable['"]/);
});

runTest('pending operation worker model remains pure classification only', () => {
  assert.match(pendingOperationSource, /derivePendingOperationFinalEventId/);
  assert.match(pendingOperationSource, /classifyPendingOperationWorkerCandidate/);
  assert.match(pendingOperationSource, /operation\.status !== ['"]failed_retryable['"]/);
  assert.match(pendingOperationSource, /operation\.operationType !== ['"]checklist_item_toggle['"]/);
  assert.match(pendingOperationSource, /operation\.entityType !== ['"]checklist_item['"]/);
  assert.doesNotMatch(pendingOperationSource, /drain_checklist_toggle_pending_operation|retryDrainOwnerChecklistTogglePendingOperation/);
});

runTest('cache replacement preview keeps destructive candidates as report-only arrays', () => {
  assert.match(cacheReplacementSource, /wouldDeleteCandidates:\s*TLocal\[\]/);
  assert.match(cacheReplacementSource, /preview\.wouldDeleteCandidates\.push\(local\)/);
  assert.doesNotMatch(cacheReplacementSource, /executeCacheReplacement|applyCacheReplacement|deleteCandidates\(/);
});

runTest('cache replacement simulator keeps destructive candidates non-executable', () => {
  assert.match(cacheReplacementSimulatorSource, /type:\s*'delete_candidate'/);
  assert.match(cacheReplacementSimulatorSource, /destructive:\s*true/);
  assert.match(cacheReplacementSimulatorSource, /requiresApproval:\s*true/);
  assert.doesNotMatch(cacheReplacementSimulatorSource, /executeCacheReplacement|applyCacheReplacement|deleteCandidates\(/);
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
    throw new Error(`${failed} Gate D model isolation tests failed`);
  }
}

main();
