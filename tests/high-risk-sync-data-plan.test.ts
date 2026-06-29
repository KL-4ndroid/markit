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

runTest('plan approves only documentation importData boundary tests and non-mutating simulator work', () => {
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add this plan document/);
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add `importData\(\)` rollback boundary tests/);
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add a cache replacement apply simulator/);
  assert.match(planSource, /Not included:[\s\S]*Runtime behavior changes/);
  assert.match(planSource, /Not included:[\s\S]*Real IndexedDB rollback verification/);
  assert.match(planSource, /Not included:[\s\S]*Supabase changes/);
  assert.match(planSource, /Not included:[\s\S]*Production data changes/);
});

runTest('full test suite includes high-risk plan and importData boundary guardrails', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/high-risk-sync-data-plan\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-data-rollback-boundary\.test\.ts/);
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
    throw new Error(`${failed} high-risk sync and data plan tests failed`);
  }
}

main();
