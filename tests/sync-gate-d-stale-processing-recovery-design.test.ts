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
const recoveryMigrationPath = join(projectRoot, 'supabase/migrations/052_recover_stale_processing_pending_operation.sql');

const designSource = readFileSync(designPath, 'utf8');
const diagnosticsDesignSource = readFileSync(diagnosticsDesignPath, 'utf8');
const drainDesignSource = readFileSync(drainDesignPath, 'utf8');
const decisionSource = readFileSync(decisionPath, 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

const disallowedRuntimeFiles = [
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

runTest('stale processing recovery design records the approved D3c-2k action through D3c-2m test boundary', () => {
  assert.ok(existsSync(designPath));
  assert.ok(existsSync(recoveryMigrationPath));
  assert.match(designSource, /D3c-2m synthetic stale recovery test plan added/);
  assert.match(designSource, /D3c-2k added an owner-confirmed one-row recovery UI action/);
  assert.match(designSource, /D3c-2l added a manual stale `processing` recovery smoke plan and guarded script/);
  assert.match(designSource, /D3c-2m added a local\/staging-only synthetic stale `processing` recovery test plan/);
  assert.match(designSource, /no production synthetic data, worker, retry, drain, cleanup, batch recovery, RLS change, or feature-flag change is approved/);
  assert.match(designSource, /052_recover_stale_processing_pending_operation\.sql/);
  assert.match(diagnosticsDesignSource, /D3c-2h added stale `processing` recovery design/);
  assert.match(diagnosticsDesignSource, /D3c-2i added a single-row stale `processing` recovery RPC draft/);
  assert.match(drainDesignSource, /D3c-2h stale `processing` recovery design/);
  assert.match(drainDesignSource, /D3c-2i: Single-Row Stale Processing Recovery RPC Draft/);
  assert.match(drainDesignSource, /D3c-2j: Read-Only Stale Processing UI Indicator/);
  assert.match(drainDesignSource, /D3c-2k: Owner-Confirmed One-Row Recovery UI Action/);
  assert.match(drainDesignSource, /D3c-2l: Manual Stale Processing Recovery Smoke Verification/);
  assert.match(drainDesignSource, /D3c-2m: Synthetic Stale Processing Recovery Test Plan/);
  assert.match(decisionSource, /D3c-2h stale `processing` recovery design is added/);
  assert.match(decisionSource, /D3c-2i single-row stale `processing` recovery RPC draft is added/);
  assert.match(decisionSource, /D3c-2j read-only stale `processing` UI indicator is added/);
  assert.match(decisionSource, /D3c-2k owner-confirmed one-row stale `processing` recovery UI action is added/);
  assert.match(decisionSource, /D3c-2l manual stale `processing` recovery smoke verification plan and guarded script are added/);
  assert.match(decisionSource, /D3c-2m synthetic stale `processing` recovery test plan is added/);
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

runTest('stale processing recovery is not wired into broad runtime paths', () => {
  const matches = disallowedRuntimeFiles.filter(file => {
    const source = readProjectFile(file);
    return /recover_stale_processing_pending_operation|stale_processing_reset|stale processing recovery/i.test(source);
  });

  assert.deepEqual(matches, []);
});

runTest('full test suite includes stale processing recovery guardrails', () => {
  assert.match(
    packageJson.scripts.test,
    /tsx tests\/sync-gate-d-stale-processing-recovery-design\.test\.ts/
  );
  assert.match(
    packageJson.scripts.test,
    /tsx tests\/supabase-pending-operations-stale-recovery-rpc\.test\.ts/
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
