import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const designPath = join(projectRoot, 'docs/SYNC_GATE_D_STALE_PROCESSING_RECOVERY_DESIGN.md');
const diagnosticsDesignPath = join(projectRoot, 'docs/SYNC_GATE_D_OWNER_DIAGNOSTICS_DESIGN.md');
const drainDesignPath = join(projectRoot, 'docs/SYNC_GATE_D_PENDING_OPERATION_DRAIN_DESIGN.md');
const decisionPath = join(projectRoot, 'docs/SYNC_GATE_D_WRITE_ROUTING_DECISION_RECORD.md');

const designSource = readFileSync(designPath, 'utf8');
const diagnosticsDesignSource = readFileSync(diagnosticsDesignPath, 'utf8');
const drainDesignSource = readFileSync(drainDesignPath, 'utf8');
const decisionSource = readFileSync(decisionPath, 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

const runtimeFiles = [
  'app/recovery/page.tsx',
  'components/common/OwnerPendingOperationDiagnosticsPanel.tsx',
  'lib/sync/owner-pending-operation-diagnostics.ts',
  'lib/markets/field-ops-write-router.ts',
  'hooks/useSync.ts',
  'lib/sync/sync-push-service.ts',
  'lib/sync/owner-pull-service.ts',
  'lib/sync/staff-pull-service.ts',
  'lib/sync/local-cache-writer.ts',
];

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

console.log('\n=== Sync Gate D stale processing recovery design ===');

runTest('stale processing recovery design exists and remains design-only', () => {
  assert.ok(existsSync(designPath));
  assert.match(designSource, /Status: D3c-2h design only/);
  assert.match(designSource, /no RPC, UI action, worker, retry, drain, cleanup, or mutation implementation is approved/);
  assert.match(diagnosticsDesignSource, /D3c-2h stale processing recovery design added/);
  assert.match(drainDesignSource, /D3c-2h stale `processing` recovery design/);
  assert.match(decisionSource, /D3c-2h stale `processing` recovery design is added/);
});

runTest('design defines stale processing threshold and server-side boundary', () => {
  assert.match(designSource, /status = 'processing'/);
  assert.match(designSource, /updated_at < now\(\) - interval '15 minutes'/i);
  assert.match(designSource, /must not come from public env, localStorage, sessionStorage, or UI input/);
});

runTest('design requires final event inspection before changing state', () => {
  assert.match(designSource, /Inspect final event by `operation_id::uuid`/);
  assert.match(designSource, /If a matching final event exists:[\s\S]*mark the pending row `synced`/);
  assert.match(designSource, /If a final event exists but does not match:[\s\S]*mark the pending row `failed_permanent`/);
  assert.match(designSource, /If no final event exists:[\s\S]*mark the pending row `failed_retryable`/);
  assert.match(designSource, /do not drain in the same action/);
});

runTest('design limits future recovery to one owner-confirmed row', () => {
  assert.match(designSource, /process exactly one operation id at a time/);
  assert.match(designSource, /Verify caller owns the market/);
  assert.match(designSource, /Lock exactly one row with `FOR UPDATE`/);
  assert.match(designSource, /The first UI must not offer batch selection/);
  assert.match(designSource, /explicit owner confirmation/);
});

runTest('design prohibits automatic worker retry drain and cleanup behavior', () => {
  for (const requiredText of [
    'Never create final events.',
    'Never call `drain_checklist_toggle_pending_operation`.',
    'Never call `enqueue_checklist_toggle_pending_operation`.',
    'Never delete rows.',
    'Never process more than one row.',
    'This design does not approve retry execution.',
  ]) {
    assert.match(designSource, new RegExp(requiredText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

runTest('no stale processing recovery implementation is wired into runtime', () => {
  const matches = runtimeFiles.filter(file => {
    const source = readProjectFile(file);
    return /recover_stale_processing_pending_operation|stale_processing_reset|stale processing recovery/i.test(source);
  });

  assert.deepEqual(matches, []);
});

runTest('full test suite includes the stale processing recovery design guardrail', () => {
  assert.match(
    packageJson.scripts.test,
    /tsx tests\/sync-gate-d-stale-processing-recovery-design\.test\.ts/
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
    throw new Error(`${failed} stale processing recovery design tests failed`);
  }
}

main();
