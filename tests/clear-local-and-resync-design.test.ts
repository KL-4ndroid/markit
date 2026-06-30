import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const designPath = join(projectRoot, 'docs/CLEAR_LOCAL_AND_RESYNC_DESIGN_2026_06_30.md');
const cloudPlanPath = join(projectRoot, 'docs/CLOUD_REBUILD_FIRST_RECOVERY_PLAN_2026_06_30.md');
const highRiskPlanPath = join(projectRoot, 'docs/HIGH_RISK_SYNC_AND_DATA_EXECUTION_PLAN.md');
const recoveryPageSource = readFileSync(join(projectRoot, 'app/recovery/page.tsx'), 'utf8');
const migrationSource = readFileSync(join(projectRoot, 'lib/supabase/migration.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const designSource = existsSync(designPath) ? readFileSync(designPath, 'utf8') : '';
const cloudPlanSource = readFileSync(cloudPlanPath, 'utf8');
const highRiskPlanSource = readFileSync(highRiskPlanPath, 'utf8');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Clear local and resync design ===');

runTest('design exists and does not approve destructive recovery behavior', () => {
  assert.ok(existsSync(designPath));
  assert.match(designSource, /does not approve local deletion/);
  assert.match(designSource, /replace-cache execute/);
  assert.match(designSource, /automatic rebuild/);
  assert.match(designSource, /sync routing changes/);
  assert.match(designSource, /Supabase writes/);
  assert.match(designSource, /broadening recovery tools to staff roles/);
});

runTest('design records role policy with owner-only execute first', () => {
  assert.match(designSource, /Owner: may be eligible for future clear-local-and-resync execute/);
  assert.match(designSource, /Manager: may be eligible for future scoped preview only; execute is not approved/);
  assert.match(designSource, /Operator: no clear-local execute/);
  assert.match(designSource, /Viewer: no clear-local execute/);
});

runTest('design requires read-only preflight before preview or execute', () => {
  for (const expected of [
    /authenticated Supabase session exists/,
    /current local role is loaded/,
    /actor has the required recovery capability/,
    /cloud reads for the actor's authorized scope succeed/,
    /pending operations report is clean/,
    /local unsynced data report is clean/,
    /local-only writes report is clean/,
    /cloud rebuild scope is explicit/,
    /existing sync is idle or can be paused/,
    /Any unknown state must fail closed/,
  ]) {
    assert.match(designSource, expected);
  }
});

runTest('design blocks unsafe local clear conditions', () => {
  for (const blocked of [
    /Supabase session is missing or expired/,
    /Role cannot be confirmed/,
    /pending_operations` has `queued`, `processing`, `failed_retryable`, or unknown status rows/,
    /Local events, markets, products, notes, checklist items, deals, or interactions have `pending`, `local_only`, or unknown sync state/,
    /Local-only field notes or checklist writes exist/,
    /Cloud event set is empty without a separate empty-account proof/,
    /Staff\/manager scoped rebuild would require deleting records outside the actor's authorized scope/,
    /Existing sync is currently pushing or pulling and cannot be paused/,
  ]) {
    assert.match(designSource, blocked);
  }
});

runTest('preview contract is read-only and reports affected scope', () => {
  for (const expected of [
    /actor id and role/,
    /rebuild scope/,
    /local tables that would be cleared/,
    /local row counts by table/,
    /protected local rows that block clearing/,
    /pending operation counts by status and type/,
    /cloud source tables or views that would be read/,
    /cloud row counts by table or event type/,
    /whether execute is blocked/,
    /exact reasons execute is blocked/,
  ]) {
    assert.match(designSource, expected);
  }
});

runTest('preview contract rejects mutation and retry side effects', () => {
  for (const rejected of [
    /call `db\.delete\(\)`/,
    /call `db\.table\.clear\(\)`/,
    /call `bulkDelete`/,
    /call replace-cache execute\/apply/,
    /write Supabase/,
    /advance sync cursors/,
    /retry or drain pending operations/,
  ]) {
    assert.match(designSource, rejected);
  }
});

runTest('older clear-and-pull migration is documented as not production-ready', () => {
  assert.match(migrationSource, /async function clearLocalDataAndPullFromCloud/);
  assert.doesNotMatch(recoveryPageSource, /clearLocalDataAndPullFromCloud/);
  assert.match(designSource, /must not become the production recovery implementation without redesign/);
  assert.match(designSource, /It does not model pending operations/);
  assert.match(designSource, /It does not produce a user-visible preview/);
  assert.match(designSource, /It clears several tables before replaying events/);
});

runTest('cloud rebuild plan and high-risk plan record step 2 completion', () => {
  assert.match(cloudPlanSource, /Step 1: Plan Update[\s\S]*Status: completed/);
  assert.match(cloudPlanSource, /Step 2: Clear Local And Resync Design[\s\S]*Status: completed as design and static guardrail work/);
  assert.match(cloudPlanSource, /docs\/CLEAR_LOCAL_AND_RESYNC_DESIGN_2026_06_30\.md/);
  assert.match(cloudPlanSource, /wiring the older `clearLocalDataAndPullFromCloud\(\)` migration path into `\/recovery`/);
  assert.match(highRiskPlanSource, /Clear Local And Resync Design/);
  assert.match(highRiskPlanSource, /Still not approved:[\s\S]*Clearing local IndexedDB/);
  assert.match(highRiskPlanSource, /Still not approved:[\s\S]*Calling `clearLocalDataAndPullFromCloud\(\)` from UI/);
});

runTest('clear local design records pending operations pre-clear dependency', () => {
  assert.match(designSource, /Step 3 Dependency/);
  assert.match(designSource, /docs\/PENDING_OPERATIONS_PRE_CLEAR_CHECK_DESIGN_2026_06_30\.md/);
  assert.match(designSource, /tests\/pending-operations-pre-clear-check-design\.test\.ts/);
  assert.match(designSource, /A blocked or unknown pending-operation report blocks any future clear-local execute decision/);
});

runTest('full test suite includes clear local and resync design guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/clear-local-and-resync-design\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/pending-operations-pre-clear-check-design\.test\.ts/);
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
    throw new Error(`${failed} clear local and resync design tests failed`);
  }
}

main();
