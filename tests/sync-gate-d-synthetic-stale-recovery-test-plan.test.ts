import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const planPath = join(
  projectRoot,
  'docs/SYNC_GATE_D_D3C_2M_SYNTHETIC_STALE_RECOVERY_TEST_PLAN.md'
);
const planSource = readFileSync(planPath, 'utf8');
const decisionSource = readFileSync(
  join(projectRoot, 'docs/SYNC_GATE_D_WRITE_ROUTING_DECISION_RECORD.md'),
  'utf8'
);
const drainDesignSource = readFileSync(
  join(projectRoot, 'docs/SYNC_GATE_D_PENDING_OPERATION_DRAIN_DESIGN.md'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

console.log('\n=== Sync Gate D synthetic stale recovery test plan ===');

runTest('D3c-2m synthetic stale recovery test plan exists', () => {
  assert.ok(existsSync(planPath));
  assert.match(planSource, /D3c-2m Synthetic Stale Processing Recovery Test Plan/);
  assert.match(planSource, /staging\/local test plan only/);
});

runTest('plan prohibits production synthetic data and production service-role usage', () => {
  assert.match(planSource, /Do not manufacture stale `processing` rows in production/);
  assert.match(planSource, /Use only local Supabase or staging Supabase/);
  assert.match(planSource, /production synthetic data/);
  assert.match(planSource, /production SQL insert\/update/);
  assert.match(planSource, /production service-role usage/);
  assert.match(planSource, /Do not run cleanup in production/);
});

runTest('plan approves only the missing-final-event fixture path first', () => {
  assert.match(planSource, /final-event state: no matching `events` row exists/);
  assert.match(planSource, /expected result: RPC returns `failed_retryable`/);
  assert.match(planSource, /last_error_code = 'stale_processing_reset'/);
  assert.match(planSource, /Confirm that no event was created/);
  assert.match(planSource, /Expected:[\s\S]*no rows/);
});

runTest('plan uses only the existing guarded D3c-2l smoke script for recovery execution', () => {
  assert.match(planSource, /scripts\/gate-d-stale-processing-recovery-smoke\.mjs/);
  assert.match(planSource, /GATE_D_STALE_RECOVERY_CONFIRM='D3c-2l recover one stale processing pending operation'/);
  assert.match(planSource, /GATE_D_STALE_RECOVERY_TARGET='local'/);
  assert.match(planSource, /GATE_D_STALE_RECOVERY_TARGET='staging'/);
  assert.match(planSource, /Do not use `production-disposable` for D3c-2m synthetic fixtures/);
});

runTest('plan defines a constrained synthetic pending row shape', () => {
  for (const required of [
    "operation_type = 'checklist_item_toggle'",
    "entity_type = 'checklist_item'",
    'updated_at` at least 15 minutes in the past',
    "status = 'processing'",
    "now() - interval '20 minutes'",
    "idempotency_key like 'd3c-2m-synthetic-stale:%'",
  ]) {
    assert.match(planSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

runTest('plan keeps event fixtures retry drain worker and runtime changes out of scope', () => {
  for (const forbiddenBoundary of [
    'creation of synthetic `events` rows',
    'final-event collision fixtures',
    'matching-final-event fixtures',
    'retry/drain after recovery',
    'batch recovery',
    'runtime or UI changes',
    'matching-final-event synthetic fixture that expects `synced`',
    'event-id-collision synthetic fixture that expects `failed_permanent`',
    'owner UI retry button',
    'batch worker',
    'production synthetic verification',
  ]) {
    assert.match(
      planSource,
      new RegExp(forbiddenBoundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );
  }
});

runTest('decision and drain design records mention D3c-2m as passed staging verification', () => {
  assert.match(decisionSource, /D3c-2m synthetic stale `processing` recovery test plan is added/);
  assert.match(decisionSource, /No production synthetic data creation is approved/);
  assert.match(decisionSource, /D3c-2m staging execution passed on 2026-06-26 Asia\/Taipei/);
  assert.match(decisionSource, /operation `c466de02-d79a-4ae8-adc0-44b3fa0efd06` recovered to `failed_retryable`/);
  assert.match(drainDesignSource, /D3c-2m: Synthetic Stale Processing Recovery Test Plan/);
  assert.match(drainDesignSource, /D3c-2m staging execution passed on 2026-06-26 Asia\/Taipei/);
});

runTest('full test suite includes the D3c-2m guardrail', () => {
  assert.match(
    testManifestSource,
    /tsx tests\/sync-gate-d-synthetic-stale-recovery-test-plan\.test\.ts/
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
    throw new Error(`${failed} synthetic stale recovery test plan tests failed`);
  }
}

main();
