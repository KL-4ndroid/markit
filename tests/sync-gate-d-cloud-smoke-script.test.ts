import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const scriptPath = join(projectRoot, 'scripts/gate-d-checklist-toggle-smoke.mjs');
const scriptSource = readFileSync(scriptPath, 'utf8');
const packageJson = readFileSync(join(projectRoot, 'package.json'), 'utf8');
const decisionSource = readFileSync(
  join(projectRoot, 'docs/SYNC_GATE_D_WRITE_ROUTING_DECISION_RECORD.md'),
  'utf8'
);
const smokeDocSource = readFileSync(
  join(projectRoot, 'docs/SYNC_GATE_D_D3C_2E_MANUAL_SMOKE_TEST.md'),
  'utf8'
);

console.log('\n=== Sync Gate D cloud smoke script ===');

runTest('manual D3c-2e smoke script exists and is not wired to npm automation', () => {
  assert.ok(existsSync(scriptPath));
  const scriptsBlock = JSON.parse(packageJson).scripts as Record<string, string>;
  for (const [name, command] of Object.entries(scriptsBlock)) {
    assert.doesNotMatch(`${name} ${command}`, /gate-d-checklist-toggle-smoke|D3c-2e/i);
  }
});

runTest('smoke script requires explicit manual confirmation and target classification', () => {
  assert.match(scriptSource, /GATE_D_SMOKE_CONFIRM/);
  assert.match(scriptSource, /D3c-2e writes one checklist toggle pending operation/);
  assert.match(scriptSource, /GATE_D_SMOKE_TARGET/);
  assert.match(scriptSource, /production-disposable/);
  assert.match(scriptSource, /GATE_D_SMOKE_PRODUCTION_CONFIRM/);
  assert.match(scriptSource, /I am using disposable production checklist data/);
});

runTest('smoke script requires real signed-in user credentials and explicit checklist target', () => {
  for (const envName of [
    'GATE_D_SMOKE_EMAIL',
    'GATE_D_SMOKE_PASSWORD',
    'GATE_D_SMOKE_MARKET_ID',
    'GATE_D_SMOKE_CHECKLIST_ITEM_ID',
    'GATE_D_SMOKE_COMPLETED',
  ]) {
    assert.match(scriptSource, new RegExp(envName));
  }

  assert.match(scriptSource, /signInWithPassword/);
  assert.match(scriptSource, /data\.user/);
});

runTest('smoke script uses only approved checklist toggle RPCs and does not direct-write tables', () => {
  assert.match(scriptSource, /enqueue_checklist_toggle_pending_operation/);
  assert.match(scriptSource, /drain_checklist_toggle_pending_operation/);
  assert.doesNotMatch(scriptSource, /\.insert\(/);
  assert.doesNotMatch(scriptSource, /\.upsert\(/);
  assert.doesNotMatch(scriptSource, /\.update\(/);
  assert.doesNotMatch(scriptSource, /\.delete\(/);
});

runTest('smoke script rejects service-role-looking keys and text mutation', () => {
  assert.match(scriptSource, /service\[_-\]\?role/i);
  assert.match(scriptSource, /payload\?\.text !== undefined/);
  assert.match(scriptSource, /Final event payload must not include checklist text/);
});

runTest('decision record still treats D3c-2e as narrow manual verification only', () => {
  assert.match(decisionSource, /one D3c-2e manual cloud smoke execution are complete/);
  assert.match(decisionSource, /Choose one disposable or non-production stale `processing` pending operation before running D3c-2l manually/);
  assert.match(decisionSource, /No D3c-2l cloud recovery execution has been performed by this slice/);
  assert.match(decisionSource, /Keep both flags default-off/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Turning `pendingOperationWriteRouting` on by default/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Turning `pendingOperationDrainAfterEnqueue` on by default/);
});

runTest('manual smoke documentation requires read-only preflight first', () => {
  assert.match(smokeDocSource, /gate-d-checklist-toggle-preflight\.mjs/);
  assert.match(smokeDocSource, /PASS read-only target validation completed/);
  assert.match(smokeDocSource, /Run this only after the read-only preflight passes/);
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
    throw new Error(`${failed} cloud smoke script tests failed`);
  }
}

main();
