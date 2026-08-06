import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const designPath = join(projectRoot, 'docs/PENDING_OPERATIONS_PRE_CLEAR_CHECK_DESIGN_2026_06_30.md');
const cloudPlanPath = join(projectRoot, 'docs/CLOUD_REBUILD_FIRST_RECOVERY_PLAN_2026_06_30.md');
const clearPlanPath = join(projectRoot, 'docs/CLEAR_LOCAL_AND_RESYNC_DESIGN_2026_06_30.md');
const highRiskPlanPath = join(projectRoot, 'docs/HIGH_RISK_SYNC_AND_DATA_EXECUTION_PLAN.md');
const diagnosticsServiceSource = readFileSync(join(projectRoot, 'lib/sync/owner-pending-operation-diagnostics.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');
const designSource = existsSync(designPath) ? readFileSync(designPath, 'utf8') : '';
const cloudPlanSource = readFileSync(cloudPlanPath, 'utf8');
const clearPlanSource = readFileSync(clearPlanPath, 'utf8');
const highRiskPlanSource = readFileSync(highRiskPlanPath, 'utf8');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Pending operations pre-clear check design ===');

runTest('design exists and stays read-only', () => {
  assert.ok(existsSync(designPath));
  assert.match(designSource, /read-only pending-operations check/);
  assert.match(designSource, /does not approve pending operation discard, drain, retry, stale reset, cleanup, automatic worker behavior/);
  assert.match(designSource, /local IndexedDB deletion/);
  assert.match(designSource, /replace-cache execute/);
  assert.match(designSource, /Supabase mutation/);
});

runTest('design reuses Gate D diagnostics without creating a new worker or retry policy', () => {
  assert.match(designSource, /reuses the existing Gate D concepts/);
  assert.match(designSource, /owner-only pending operation diagnostics/);
  assert.match(designSource, /one-row manual stale recovery/);
  assert.match(designSource, /one-row owner-created checklist-toggle retry\/drain/);
  assert.match(designSource, /It does not create a new worker, cleanup system, or retry policy/);
});

runTest('required report shape includes safe counts ids warnings and blocking reasons', () => {
  for (const expected of [
    /actor id/,
    /actor role/,
    /checked at timestamp/,
    /rebuild scope/,
    /total pending operation count/,
    /count by `status`/,
    /count by `operation_type`/,
    /count by `entity_type`/,
    /count by `market_id`/,
    /unresolved operation ids/,
    /stale processing operation ids/,
    /retryable operation ids/,
    /blocked-permission operation ids/,
    /permanent failure operation ids/,
    /unknown status operation ids/,
    /unsupported operation type ids/,
    /final event missing warnings/,
    /final event mismatch warnings/,
    /clear-local decision: `allowed` or `blocked`/,
    /blocking reason codes/,
  ]) {
    assert.match(designSource, expected);
  }
});

runTest('report must not expose sensitive payload fields', () => {
  for (const forbidden of [
    /must not include arbitrary operation payloads/,
    /checklist text/,
    /field note body text/,
    /product cost/,
    /supplier/,
    /booth cost/,
    /revenue/,
    /profit/,
    /owner-only finance fields/,
  ]) {
    assert.match(designSource, forbidden);
  }
});

runTest('blocking policy blocks every unresolved or ambiguous pending operation state', () => {
  for (const blockedStatus of [
    /`queued`/,
    /`pending`/,
    /`processing`/,
    /`failed_retryable`/,
    /`failed_permanent`/,
    /`blocked_permission`/,
    /empty status/,
    /unknown status/,
  ]) {
    assert.match(designSource, blockedStatus);
  }

  assert.match(designSource, /`synced` rows are not blocking only when/);
  assert.match(designSource, /the final event exists when expected/);
  assert.match(designSource, /the final event type matches the operation contract/);
});

runTest('scope policy keeps owner complete manager preview-only and staff non-execute', () => {
  assert.match(designSource, /Owner pre-clear:[\s\S]*Must include owner-created and staff-created rows/);
  assert.match(designSource, /Manager pre-clear:[\s\S]*May be preview-only in future/);
  assert.match(designSource, /Must never allow clearing unrelated owner cache/);
  assert.match(designSource, /Operator and viewer:[\s\S]*No clear-local pre-clear execute path/);
});

runTest('blocked reports never mutate pending operations or local cache', () => {
  for (const rejected of [
    /keep local IndexedDB unchanged/,
    /keep sync cursors unchanged/,
    /do not retry, drain, reset, abandon, delete, or modify rows automatically/,
    /no Supabase writes/,
    /no IndexedDB writes/,
    /no RPC calls that mutate state/,
    /no calls to `drain_checklist_toggle_pending_operation`/,
    /no calls to `recover_stale_processing_pending_operation`/,
    /no background timers/,
    /no batch action/,
  ]) {
    assert.match(designSource, rejected);
  }
});

runTest('existing diagnostics service remains explicit action based and is not a pre-clear executor', () => {
  assert.match(diagnosticsServiceSource, /listOwnerPendingOperationDiagnostics/);
  assert.match(diagnosticsServiceSource, /recoverStaleProcessingPendingOperation/);
  assert.match(diagnosticsServiceSource, /retryDrainOwnerChecklistTogglePendingOperation/);
  assert.doesNotMatch(diagnosticsServiceSource, /preClear|clearLocalAndResync|deleteIndexedDB|replaceCacheExecute/i);
});

runTest('cloud clear and high-risk plans record step 3 completion and boundaries', () => {
  assert.match(cloudPlanSource, /Step 3: Pending Operations Pre-Clear Check[\s\S]*Status: completed as design and static guardrail work/);
  assert.match(cloudPlanSource, /docs\/PENDING_OPERATIONS_PRE_CLEAR_CHECK_DESIGN_2026_06_30\.md/);
  assert.match(cloudPlanSource, /Not approved:[\s\S]*discard/);
  assert.match(cloudPlanSource, /Not approved:[\s\S]*drain/);
  assert.match(cloudPlanSource, /Not approved:[\s\S]*retry/);
  assert.match(clearPlanSource, /Step 3 Dependency/);
  assert.match(clearPlanSource, /A blocked or unknown pending-operation report blocks any future clear-local execute decision/);
  assert.match(highRiskPlanSource, /Pending Operations Pre-Clear Check Design/);
  assert.match(highRiskPlanSource, /A clean report only permits moving to cloud rebuild preview; it does not approve deletion or replace-cache execute/);
});

runTest('full test suite includes pending operations pre-clear design guardrail', () => {
  assert.match(testManifestSource, /tsx tests\/pending-operations-pre-clear-check-design\.test\.ts/);
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
    throw new Error(`${failed} pending operations pre-clear design tests failed`);
  }
}

main();
