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

runTest('diagnostics service calls only the approved read RPC', () => {
  assert.match(serviceSource, /supabase\.rpc\(['"]list_owner_pending_operation_diagnostics['"]/);
  assert.doesNotMatch(serviceSource, /recover_stale_processing_pending_operation/);
  assert.doesNotMatch(serviceSource, /enqueue_checklist_toggle_pending_operation/);
  assert.doesNotMatch(serviceSource, /drain_checklist_toggle_pending_operation/);
  assert.doesNotMatch(serviceSource, /\.from\(/);
  assert.doesNotMatch(serviceSource, /\.insert\(/);
  assert.doesNotMatch(serviceSource, /\.upsert\(/);
  assert.doesNotMatch(serviceSource, /\.update\(/);
  assert.doesNotMatch(serviceSource, /\.delete\(/);
  assert.doesNotMatch(serviceSource, /localStorage|sessionStorage|indexedDB|Dexie|db\./i);
});

runTest('diagnostics panel blocks staff and exposes read-only controls only', () => {
  assert.match(panelSource, /useUserRole/);
  assert.match(panelSource, /useAuth/);
  assert.match(panelSource, /if \(isStaff\)/);
  assert.match(panelSource, /listOwnerPendingOperationDiagnostics\(user\.id\)/);
  assert.match(panelSource, /STALE_PROCESSING_THRESHOLD_MS = 15 \* 60 \* 1000/);
  assert.match(panelSource, /function isStaleProcessing/);
  assert.match(panelSource, /row\.status !== 'processing'/);
  assert.match(panelSource, /讀取 diagnostics/);

  for (const forbidden of [
    /handleExecute/,
    /window\.confirm/,
    /Wrench/,
    /修復/,
    /重試/,
    /刪除/,
    /清除/,
    /drain_checklist_toggle_pending_operation/,
    /enqueue_checklist_toggle_pending_operation/,
    /recover_stale_processing_pending_operation/,
    /supabase\./,
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
    packageJson.scripts.test,
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
