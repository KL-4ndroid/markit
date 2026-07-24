import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const scriptPath = join(projectRoot, 'scripts/gate-d-stale-processing-recovery-smoke.mjs');
const scriptSource = readFileSync(scriptPath, 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const smokeDocSource = readFileSync(
  join(projectRoot, 'docs/SYNC_GATE_D_D3C_2L_STALE_RECOVERY_SMOKE_TEST.md'),
  'utf8'
);
const decisionSource = readFileSync(
  join(projectRoot, 'docs/SYNC_GATE_D_WRITE_ROUTING_DECISION_RECORD.md'),
  'utf8'
);

console.log('\n=== Sync Gate D stale recovery smoke script ===');

runTest('manual D3c-2l stale recovery smoke script exists and is not wired to npm scripts', () => {
  assert.ok(existsSync(scriptPath));

  for (const [name, command] of Object.entries(packageJson.scripts)) {
    assert.doesNotMatch(`${name} ${command}`, /gate-d-stale-processing-recovery-smoke|D3c-2l/i);
  }
});

runTest('smoke script requires explicit manual confirmation and target classification', () => {
  assert.match(scriptSource, /GATE_D_STALE_RECOVERY_CONFIRM/);
  assert.match(scriptSource, /D3c-2l recover one stale processing pending operation/);
  assert.match(scriptSource, /GATE_D_STALE_RECOVERY_TARGET/);
  assert.match(scriptSource, /production-disposable/);
  assert.match(scriptSource, /GATE_D_STALE_RECOVERY_PRODUCTION_CONFIRM/);
  assert.match(scriptSource, /I am using a disposable stale processing pending operation/);
});

runTest('smoke script requires owner credentials and one explicit pending operation id', () => {
  for (const envName of [
    'GATE_D_STALE_RECOVERY_EMAIL',
    'GATE_D_STALE_RECOVERY_PASSWORD',
    'GATE_D_STALE_RECOVERY_OPERATION_ID',
  ]) {
    assert.match(scriptSource, new RegExp(envName));
  }

  assert.match(scriptSource, /signInWithPassword/);
  assert.match(scriptSource, /data\.user/);
  assert.match(scriptSource, /operation_id/);
});

runTest('smoke script rejects service-role-looking keys and direct table writes', () => {
  assert.match(scriptSource, /service\[_-\]\?role/i);
  assert.doesNotMatch(scriptSource, /\.insert\(/);
  assert.doesNotMatch(scriptSource, /\.upsert\(/);
  assert.doesNotMatch(scriptSource, /\.update\(/);
  assert.doesNotMatch(scriptSource, /\.delete\(/);
});

runTest('smoke script only calls the approved stale recovery RPC', () => {
  assert.match(scriptSource, /recover_stale_processing_pending_operation/);
  assert.doesNotMatch(scriptSource, /drain_checklist_toggle_pending_operation/);
  assert.doesNotMatch(scriptSource, /enqueue_checklist_toggle_pending_operation/);
});

runTest('smoke script verifies stale processing status before invoking recovery', () => {
  assert.match(scriptSource, /operation\.status !== 'processing'/);
  assert.match(scriptSource, /STALE_PROCESSING_THRESHOLD_MS = 15 \* 60 \* 1000/);
  assert.match(scriptSource, /Date\.now\(\) - updatedAtMs < STALE_PROCESSING_THRESHOLD_MS/);
  assert.match(scriptSource, /assertRecoverableBefore\(before, operationId\)/);
});

runTest('smoke script reads the target pending operation before and after recovery', () => {
  assert.match(scriptSource, /\.from\('pending_operations'\)/);
  assert.match(scriptSource, /const before = await fetchSinglePendingOperation/);
  assert.match(scriptSource, /const after = await fetchSinglePendingOperation/);
  assert.match(scriptSource, /assertRecoveredAfter\(after, operationId, recoveryResult\)/);
});

runTest('manual smoke documentation keeps execution disposable and non-automatic', () => {
  assert.match(smokeDocSource, /manual verification plan and guarded script only; no automatic execution/);
  assert.match(smokeDocSource, /disposable or non-production data/);
  assert.match(smokeDocSource, /If no row exists, stop/);
  assert.match(smokeDocSource, /Do not create a fake production row without a separate decision/);
  assert.match(smokeDocSource, /It is intentionally not wired to `package\.json`/);
});

runTest('decision record treats D3c-2l as manual verification only', () => {
  assert.match(decisionSource, /D3c-2l manual stale `processing` recovery smoke verification plan and guarded script are added/);
  assert.match(decisionSource, /No D3c-2l cloud recovery execution has been performed by this slice/);
  assert.match(decisionSource, /Choose one disposable or non-production stale `processing` pending operation/);
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
    throw new Error(`${failed} stale recovery smoke script tests failed`);
  }
}

main();
