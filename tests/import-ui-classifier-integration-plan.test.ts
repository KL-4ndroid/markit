import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const planPath = join(projectRoot, 'docs/IMPORT_UI_CLASSIFIER_INTEGRATION_PLAN_2026_06_30.md');
const highRiskPlanPath = join(projectRoot, 'docs/HIGH_RISK_SYNC_AND_DATA_EXECUTION_PLAN.md');
const importPlanPath = join(projectRoot, 'docs/IMPORT_RECOVERY_SEMANTICS_PLAN_2026_06_29.md');
const settingsPageSource = readFileSync(join(projectRoot, 'app/settings/page.tsx'), 'utf8');
const recoveryPageSource = readFileSync(join(projectRoot, 'app/recovery/page.tsx'), 'utf8');
const importSafetyPanelSource = readFileSync(join(projectRoot, 'components/common/ImportSafetyStatusPanel.tsx'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const planSource = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';
const highRiskPlanSource = readFileSync(highRiskPlanPath, 'utf8');
const importPlanSource = readFileSync(importPlanPath, 'utf8');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Import UI classifier integration plan ===');

runTest('plan exists and records current no-production-import-ui baseline', () => {
  assert.ok(existsSync(planPath));
  assert.match(planSource, /phase-aware DB-layer runner completed; UI wiring not approved/);
  assert.match(planSource, /Production app UI does not currently call `importData\(\)`/);
  assert.match(planSource, /The phase-aware import runner exists in `lib\/db\/import-runner\.ts`/);
  assert.match(planSource, /There is no mature import UI surface to attach classifier output to yet/);
  assert.match(planSource, /The next safe step is not UI wiring/);
});

runTest('current production UI surfaces do not call importData', () => {
  assert.doesNotMatch(settingsPageSource, /importData\(/);
  assert.doesNotMatch(recoveryPageSource, /importData\(/);
  assert.doesNotMatch(importSafetyPanelSource, /importData\(/);
});

runTest('plan rejects brittle classifier integration paths', () => {
  assert.match(planSource, /must not classify outcomes by matching error strings/);
  assert.match(planSource, /Parse Existing Error Messages[\s\S]*Rejected/);
  assert.match(planSource, /Reimplement Import Flow In UI[\s\S]*Rejected/);
  assert.match(planSource, /Mount Classifier In `\/recovery` Immediately[\s\S]*Rejected/);
});

runTest('plan records phase-aware DB-layer orchestration before UI wiring', () => {
  assert.match(planSource, /Keep import execution in the phase-aware DB-layer runner/);
  assert.match(planSource, /Keep the existing `importData\(jsonData\): Promise<void>` behavior compatible/);
  assert.match(planSource, /phase-aware import orchestration exists in the DB layer/);
  assert.match(planSource, /add a UI-facing import wrapper around the completed DB-layer runner/);
  assert.match(planSource, /Only after that passes should a separate UI slice display classifier results/);
});

runTest('plan keeps runtime mutation and browser profile verification out of this slice', () => {
  for (const blocked of [
    /This document does not approve a new import UI/,
    /changes to `importData\(\)`/,
    /automatic rollback, restore, repair/,
    /browser\/profile IndexedDB mutation verification/,
    /Supabase writes/,
    /production recovery automation/,
    /Stop for explicit approval before:[\s\S]*adding a production import UI/,
    /Stop for explicit approval before:[\s\S]*changing `importData\(\)` runtime behavior/,
    /Stop for explicit approval before:[\s\S]*introducing a UI-facing import wrapper/,
    /Stop for explicit approval before:[\s\S]*wiring classifier output into UI/,
  ]) {
    assert.match(planSource, blocked);
  }
});

runTest('high-risk and import recovery plans record this design slice as complete', () => {
  assert.match(highRiskPlanSource, /Import UI Classifier Integration Design/);
  assert.match(highRiskPlanSource, /Status: completed as design and static guardrail work/);
  assert.match(highRiskPlanSource, /Phase-Aware Import Runner[\s\S]*Status: completed as DB-layer runtime boundary work/);
  assert.match(highRiskPlanSource, /No production UI currently calls `importData\(\)`/);
  assert.match(importPlanSource, /Import UI Classifier Integration Design[\s\S]*Status: completed as design-only work/);
  assert.match(importPlanSource, /does not approve runtime UI wiring/);
  assert.match(importPlanSource, /Phase-Aware Import Runner[\s\S]*Status: completed as DB-layer runtime boundary work/);
});

runTest('full test suite includes import UI classifier integration plan guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/import-ui-classifier-integration-plan\.test\.ts/);
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
    throw new Error(`${failed} import UI classifier integration plan tests failed`);
  }
}

main();
