import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const scriptPath = join(projectRoot, 'scripts/gate-d-checklist-toggle-preflight.mjs');
const scriptSource = readFileSync(scriptPath, 'utf8');
const packageJson = readFileSync(join(projectRoot, 'package.json'), 'utf8');
const smokeDocSource = readFileSync(
  join(projectRoot, 'docs/SYNC_GATE_D_D3C_2E_MANUAL_SMOKE_TEST.md'),
  'utf8'
);

console.log('\n=== Sync Gate D cloud preflight script ===');

runTest('manual read-only preflight script exists and is not wired to npm automation', () => {
  assert.ok(existsSync(scriptPath));
  const scriptsBlock = JSON.parse(packageJson).scripts as Record<string, string>;
  for (const [name, command] of Object.entries(scriptsBlock)) {
    assert.doesNotMatch(`${name} ${command}`, /gate-d-checklist-toggle-preflight|D3c-2e/i);
  }
});

runTest('preflight requires explicit target confirmation and checklist inputs', () => {
  assert.match(scriptSource, /GATE_D_PREFLIGHT_CONFIRM/);
  assert.match(scriptSource, /D3c-2e read-only preflight/);
  assert.match(scriptSource, /GATE_D_PREFLIGHT_TARGET/);
  assert.match(scriptSource, /production-disposable/);
  assert.match(scriptSource, /GATE_D_PREFLIGHT_PRODUCTION_CONFIRM/);
  assert.match(scriptSource, /I am checking disposable production checklist data/);
  assert.match(scriptSource, /GATE_D_PREFLIGHT_MARKET_ID/);
  assert.match(scriptSource, /GATE_D_PREFLIGHT_CHECKLIST_ITEM_ID/);
});

runTest('preflight signs in as a normal user and refuses service-role-looking keys', () => {
  assert.match(scriptSource, /GATE_D_PREFLIGHT_EMAIL/);
  assert.match(scriptSource, /GATE_D_PREFLIGHT_PASSWORD/);
  assert.match(scriptSource, /signInWithPassword/);
  assert.match(scriptSource, /service\[_-\]\?role/i);
});

runTest('preflight is read-only and does not call write RPCs or table mutations', () => {
  assert.doesNotMatch(scriptSource, /enqueue_checklist_toggle_pending_operation/);
  assert.doesNotMatch(scriptSource, /drain_checklist_toggle_pending_operation/);
  assert.doesNotMatch(scriptSource, /\.rpc\(/);
  assert.doesNotMatch(scriptSource, /\.insert\(/);
  assert.doesNotMatch(scriptSource, /\.upsert\(/);
  assert.doesNotMatch(scriptSource, /\.update\(/);
  assert.doesNotMatch(scriptSource, /\.delete\(/);
});

runTest('preflight reads only events and pending_operations for validation', () => {
  assert.match(scriptSource, /\.from\(['"]events['"]\)/);
  assert.match(scriptSource, /\.from\(['"]pending_operations['"]\)/);
  assert.match(scriptSource, /checklist_item_created/);
  assert.match(scriptSource, /checklist_item_updated/);
  assert.match(scriptSource, /checklist_item_deleted/);
  assert.match(scriptSource, /Target checklist item appears deleted/);
  assert.match(scriptSource, /active\/retryable pending rows/);
});

runTest('manual smoke document references the read-only preflight', () => {
  assert.match(smokeDocSource, /gate-d-checklist-toggle-preflight\.mjs/);
  assert.match(smokeDocSource, /read-only preflight/);
  assert.match(smokeDocSource, /does not write cloud data/);
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
    throw new Error(`${failed} cloud preflight script tests failed`);
  }
}

main();
