import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

const panelPath = join(projectRoot, 'components/common/OwnerPendingOperationDiagnosticsPanel.tsx');
const servicePath = join(projectRoot, 'lib/sync/owner-pending-operation-diagnostics.ts');
const recoverySource = readProjectFile('app/recovery/page.tsx');
const panelSource = readProjectFile('components/common/OwnerPendingOperationDiagnosticsPanel.tsx');
const serviceSource = readProjectFile('lib/sync/owner-pending-operation-diagnostics.ts');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');

console.log('\n=== Sync Gate D owner diagnostics UI ===');

runTest('owner diagnostics UI shell exists and is mounted only on owner recovery route', () => {
  assert.ok(existsSync(panelPath));
  assert.ok(existsSync(servicePath));
  assert.match(
    recoverySource,
    /import\s*\{\s*OwnerPendingOperationDiagnosticsPanel\s*\}\s*from\s*['"]@\/components\/common\/OwnerPendingOperationDiagnosticsPanel['"]/
  );
  assert.match(recoverySource, /if \(!canUseRepairTools\)/);
  assert.match(recoverySource, /<OwnerPendingOperationDiagnosticsPanel \/>/);

  const blockedIndex = recoverySource.indexOf('if (!canUseRepairTools)');
  const panelIndex = recoverySource.indexOf('<OwnerPendingOperationDiagnosticsPanel />');
  assert.equal(blockedIndex >= 0 && panelIndex > blockedIndex, true);
});

runTest('diagnostics service calls only the approved read recovery and retry drain RPCs', () => {
  assert.match(serviceSource, /supabase\.rpc\(['"]list_owner_pending_operation_diagnostics['"]/);
  assert.match(serviceSource, /supabase\.rpc\(['"]recover_stale_processing_pending_operation['"]/);
  assert.match(serviceSource, /supabase\.rpc\(['"]drain_checklist_toggle_pending_operation['"]/);
  assert.match(serviceSource, /p_operation_id: operationId/);
  assert.doesNotMatch(serviceSource, /enqueue_checklist_toggle_pending_operation/);
  assert.doesNotMatch(serviceSource, /\.from\(/);
  assert.doesNotMatch(serviceSource, /\.insert\(/);
  assert.doesNotMatch(serviceSource, /\.upsert\(/);
  assert.doesNotMatch(serviceSource, /\.update\(/);
  assert.doesNotMatch(serviceSource, /\.delete\(/);
  assert.doesNotMatch(serviceSource, /localStorage|sessionStorage|indexedDB|Dexie|db\./i);
});

runTest('retry drain wrapper is single-row owner-created checklist toggle only', () => {
  assert.match(serviceSource, /retryDrainOwnerChecklistTogglePendingOperation/);
  assert.match(serviceSource, /assertRetryDrainAllowed/);
  assert.match(serviceSource, /diagnosticsRow\.operationId !== operationId/);
  assert.match(serviceSource, /diagnosticsRow\.status !== 'failed_retryable'/);
  assert.match(serviceSource, /diagnosticsRow\.actorId !== currentUserId/);
  assert.match(serviceSource, /diagnosticsRow\.operationType !== 'checklist_item_toggle'/);
  assert.match(serviceSource, /diagnosticsRow\.entityType !== 'checklist_item'/);
  assert.doesNotMatch(serviceSource, /for\s*\(|forEach|while\s*\(/);
  assert.doesNotMatch(serviceSource, /Promise\.all/);
  assert.doesNotMatch(serviceSource, /setInterval|setTimeout/);
});

runTest('diagnostics panel blocks staff and exposes only owner-confirmed one-row recovery and retry drain', () => {
  assert.match(panelSource, /useRoleContext/);
  assert.doesNotMatch(panelSource, /useUserRole\(\)/);
  assert.match(panelSource, /useAuth/);
  assert.match(panelSource, /if \(isStaff\)/);
  assert.match(panelSource, /listOwnerPendingOperationDiagnostics\(user\.id\)/);
  assert.match(panelSource, /recoverStaleProcessingPendingOperation\(row\.operationId\)/);
  assert.match(panelSource, /retryDrainOwnerChecklistTogglePendingOperation/);
  assert.match(panelSource, /retryDrainOwnerChecklistTogglePendingOperation\(\{\s*operationId: row\.operationId,\s*currentUserId: user\.id,\s*diagnosticsRow: row,\s*\}\)/);
  assert.doesNotMatch(panelSource, /drain_checklist_toggle_pending_operation/);
  assert.match(panelSource, /window\.confirm/);
  assert.match(panelSource, /onRecover\(row\)/);
  assert.match(panelSource, /onRetryDrain\(row\)/);
  assert.match(panelSource, /const canRecover = isStaleProcessing\(row\)/);
  assert.match(panelSource, /const canRetryDrain = isRetryDrainCandidate\(row, currentUserId\)/);
  assert.match(panelSource, /STALE_PROCESSING_THRESHOLD_MS = 15 \* 60 \* 1000/);
  assert.match(panelSource, /function isStaleProcessing/);
  assert.match(panelSource, /row\.status !== 'processing'/);
  assert.match(panelSource, /function isRetryDrainCandidate/);
  assert.match(panelSource, /row\.status !== 'failed_retryable'/);
  assert.match(panelSource, /row\.operationType !== 'checklist_item_toggle'/);
  assert.match(panelSource, /row\.entityType !== 'checklist_item'/);
  assert.match(panelSource, /row\.actorId !== currentUserId/);
  assert.match(panelSource, /may create one final checklist_item_updated cloud event/);
  assert.match(panelSource, /Retry drain/);
  assert.match(panelSource, /讀取 diagnostics/);

  for (const forbidden of [
    /handleExecute/,
    /Wrench/,
    /修復/,
    /重試/,
    /刪除/,
    /清除/,
    /enqueue_checklist_toggle_pending_operation/,
    /supabase\./,
    /setInterval|setTimeout/,
    /Promise\.all/,
  ]) {
    assert.doesNotMatch(panelSource, forbidden);
  }
});

runTest('diagnostics UI omits sensitive payload and role snapshot fields', () => {
  assert.doesNotMatch(panelSource, /payload/i);
  assert.doesNotMatch(panelSource, /role_snapshot|roleSnapshot/i);
  assert.doesNotMatch(panelSource, /cost|profit|supplier|booth/i);
  assert.match(panelSource, /operationId/);
  assert.match(panelSource, /lastErrorCode/);
  assert.match(panelSource, /lastErrorMessage/);
  assert.match(serviceSource, /status:/);
  assert.match(serviceSource, /lastErrorCode:/);
  assert.match(serviceSource, /lastErrorMessage:/);
});

runTest('full test suite includes the owner diagnostics UI guardrail', () => {
  assert.match(
    testManifestSource,
    /tsx tests\/sync-gate-d-owner-diagnostics-ui\.test\.ts/
  );
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
    throw new Error(`${failed} owner diagnostics UI tests failed`);
  }
}

main();
