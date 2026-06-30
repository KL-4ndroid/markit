import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const planPath = join(projectRoot, 'docs/HIGH_RISK_SYNC_AND_DATA_EXECUTION_PLAN.md');
const planSource = readFileSync(planPath, 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== High-risk sync and data execution plan ===');

runTest('plan exists and records current post-D3 baseline', () => {
  assert.ok(existsSync(planPath));
  assert.match(planSource, /C2\.21 read-only cloud consistency audit completed/);
  assert.match(planSource, /C2\.20 staff data flow verification completed/);
  assert.match(planSource, /053_repair_staff_accessible_view_sanitization\.sql/);
  assert.match(planSource, /C2\.29B Staff View \/ RLS read-only verification passed after 053/);
  assert.match(planSource, /C2\.28B render guard \/ role fail-closed static audit passed/);
  assert.match(planSource, /D3c-2n-4 production disposable retry\/drain verification remains unapproved/);
});

runTest('plan keeps high-risk execution blocked until explicit approval', () => {
  for (const boundary of [
    /Replace-cache execute remains unapproved/,
    /Pending-operation worker, batch drain, and automatic retry remain unapproved/,
    /RLS\/data repair remains unapproved/,
    /Broad `lib\/db\/events\.ts` refactor remains unapproved/,
    /Stop and ask for explicit approval before:[\s\S]*Running production disposable verification/,
    /Stop and ask for explicit approval before:[\s\S]*Adding any background worker or automatic retry/,
    /Stop and ask for explicit approval before:[\s\S]*Adding replace-cache execute\/apply\/delete code/,
    /Stop and ask for explicit approval before:[\s\S]*Applying RLS or data repair migrations/,
    /Stop and ask for explicit approval before:[\s\S]*Refactoring production event handler behavior/,
  ]) {
    assert.match(planSource, boundary);
  }
});

runTest('plan approves only documentation importData boundary simulator worker-model isolated rollback and semantics work', () => {
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add this plan document/);
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add `importData\(\)` rollback boundary tests/);
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add a cache replacement apply simulator/);
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add pending-operation worker model helpers and tests/);
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add isolated fake IndexedDB rollback verification/);
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add import recovery semantics design and static guardrails/);
  assert.match(planSource, /Not included:[\s\S]*Runtime behavior changes/);
  assert.match(planSource, /Not included:[\s\S]*Browser\/profile IndexedDB rollback verification/);
  assert.match(planSource, /Not included:[\s\S]*Import rollback UI/);
  assert.match(planSource, /Not included:[\s\S]*Supabase changes/);
  assert.match(planSource, /Not included:[\s\S]*Production data changes/);
});

runTest('plan records import recovery classifier completion and next boundary', () => {
  assert.match(planSource, /Current Import\/Recovery Continuation Decision/);
  assert.match(planSource, /Phase 1 complete; pure classifier design slice completed as non-runtime work/);
  assert.match(planSource, /reinforcement of the existing `importData\(\)` and `\/recovery` safety semantics/);
  assert.match(planSource, /Do not create a second backup, restore, import, or recovery system/);
  assert.match(planSource, /Do not add a new recovery page/);
  assert.match(planSource, /Completed low-risk continuation slice:[\s\S]*pure import-outcome classifier design and tests only/);
  assert.match(planSource, /The classifier does not call `importData\(\)`/);
  assert.match(planSource, /The classifier does not read or write IndexedDB/);
  assert.match(planSource, /The classifier does not mount in UI/);
  assert.match(planSource, /Completed after separate approval:[\s\S]*`Import Safety Status` inside existing `\/recovery`/);
  assert.match(planSource, /Completed after separate approval:[\s\S]*Emergency-backup metadata display/);
  assert.match(planSource, /Deferred until a separate decision:[\s\S]*Browser\/profile IndexedDB verification/);
});

runTest('plan records import safety status UI shell without approving recovery automation', () => {
  assert.match(planSource, /Import Safety Status UI Shell/);
  assert.match(planSource, /Status: completed as owner-gated read-only UI work/);
  assert.match(planSource, /The panel is mounted only inside the existing `\/recovery` page/);
  assert.match(planSource, /The panel does not call `importData\(\)`/);
  assert.match(planSource, /The panel does not restore, repair, or mutate IndexedDB/);
  assert.match(planSource, /The panel does not write Supabase/);
  assert.match(planSource, /Still not approved:[\s\S]*Automatic rollback, restore, repair, or production recovery behavior/);
});

runTest('plan records phase-aware import runner without approving UI wiring', () => {
  assert.match(planSource, /Phase-Aware Import Runner/);
  assert.match(planSource, /Status: completed as DB-layer runtime boundary work/);
  assert.match(planSource, /Existing `importData\(jsonData\): Promise<void>` remains the public import API/);
  assert.match(planSource, /Existing `importData\(\)` callers still receive the original thrown error instead of `ImportOutcomeError`/);
  assert.match(planSource, /No production UI calls the runner/);
  assert.match(planSource, /Still not approved:[\s\S]*Wiring classifier output into UI/);
});

runTest('full test suite includes high-risk plan and importData boundary guardrails', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/high-risk-sync-data-plan\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-data-rollback-boundary\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-data-indexeddb-rollback\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-recovery-semantics-plan\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-recovery-classifier\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-runner\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-safety-status-ui\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-ui-classifier-integration-plan\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/sync-cache-replacement-apply-simulator\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/sync-pending-operation-worker-model\.test\.ts/);
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
    throw new Error(`${failed} high-risk sync and data plan tests failed`);
  }
}

main();
