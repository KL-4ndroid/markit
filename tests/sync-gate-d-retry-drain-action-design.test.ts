import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const designPath = join(projectRoot, 'docs/SYNC_GATE_D_D3C_2N_RETRY_DRAIN_ACTION_DESIGN.md');
const designSource = readFileSync(designPath, 'utf8');
const decisionSource = readFileSync(
  join(projectRoot, 'docs/SYNC_GATE_D_WRITE_ROUTING_DECISION_RECORD.md'),
  'utf8'
);
const diagnosticsDesignSource = readFileSync(
  join(projectRoot, 'docs/SYNC_GATE_D_OWNER_DIAGNOSTICS_DESIGN.md'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

const runtimeFiles = [
  'hooks/useSync.ts',
  'lib/sync/owner-pending-operation-diagnostics.ts',
  'components/common/OwnerPendingOperationDiagnosticsPanel.tsx',
  'components/markets/FieldNotesPanel.tsx',
  'components/markets/ChecklistPanel.tsx',
  'components/markets/MarketFieldOpsSection.tsx',
];

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

console.log('\n=== Sync Gate D retry drain action design ===');

runTest('D3c-2n retry drain action design exists and is design-only', () => {
  assert.ok(existsSync(designPath));
  assert.match(designSource, /D3c-2n Retry\/Drain Action Design/);
  assert.match(designSource, /D3c-2n-1 service wrapper draft approved and implemented/);
  assert.match(designSource, /no UI button, migration, RLS, worker, production execution, feature-flag change, batch action, or staff-row drain is approved/);
});

runTest('design requires D3c-2m local or staging evidence before implementation', () => {
  assert.match(designSource, /Do not implement or execute D3c-2n until D3c-2m has passed in local\/staging/);
  assert.match(designSource, /one synthetic local\/staging `processing` row was recovered/);
  assert.match(designSource, /recovery returned `failed_retryable`/);
  assert.match(designSource, /no final event was created during recovery/);
});

runTest('D3c-2m passed and D3c-2n-1 is implemented while UI still requires approval', () => {
  assert.match(designSource, /Passed on 2026-06-26 Asia\/Taipei after migration `052_recover_stale_processing_pending_operation\.sql` was re-executed/);
  assert.match(designSource, /D3c-2n-1 approves only a service wrapper/);
  assert.match(designSource, /D3c-2n-1: Service Wrapper Draft/);
  assert.match(designSource, /Status:[\s\S]*Completed in `lib\/sync\/owner-pending-operation-diagnostics\.ts`/);
  assert.match(designSource, /Operation id: `c466de02-d79a-4ae8-adc0-44b3fa0efd06`/);
  assert.match(designSource, /Final event count for the operation id was `0`/);
  assert.match(decisionSource, /D3c-2m staging execution passed on 2026-06-26 Asia\/Taipei/);
  assert.match(decisionSource, /D3c-2n-1 owner-only single-row service wrapper draft is approved and implemented/);
  assert.match(decisionSource, /No D3c-2n UI button, migration, RLS, worker, production execution, feature-flag change, batch action, or staff-row drain is approved/);
});

runTest('design recognizes existing drain RPC actor scope and limits first action to owner actor rows', () => {
  assert.match(designSource, /existing drain RPC is actor-scoped/);
  assert.match(designSource, /caller must match `pending_operations\.actor_id`/);
  assert.match(designSource, /owner can retry\/drain only rows where `actor_id = auth\.uid\(\)`/);
  assert.match(designSource, /staff-created rows remain diagnostics-only/);
});

runTest('first allowed target is a single owner-created failed_retryable checklist toggle row', () => {
  for (const required of [
    "status = 'failed_retryable'",
    "operation_type = 'checklist_item_toggle'",
    "entity_type = 'checklist_item'",
    'actor_id = current authenticated owner id',
    'operation id is one explicit id',
  ]) {
    assert.match(designSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const forbidden of [
    '`pending`',
    '`processing`',
    '`synced`',
    '`failed_permanent`',
    '`blocked_permission`',
    'staff actor rows',
    'non-checklist-toggle rows',
  ]) {
    assert.match(designSource, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

runTest('design keeps implementation slices explicit and blocks broad automation', () => {
  for (const boundary of [
    'Service Wrapper Draft',
    'Owner UI Button',
    'Local/Staging Manual Verification',
    'Production Disposable Verification',
    'High-risk decision, not approved',
    'run automatically on page load',
    'batch selection',
    'worker',
    'service-role credentials',
    'owner draining staff rows',
  ]) {
    assert.match(designSource, new RegExp(boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

runTest('design defers owner-on-behalf-of-staff drain decisions', () => {
  assert.match(designSource, /Why Not Owner-On-Behalf-Of-Staff First/);
  assert.match(designSource, /changing the existing drain RPC actor rule/);
  assert.match(designSource, /adding a new owner drain RPC/);
  assert.match(designSource, /changing final event actor semantics/);
  assert.match(designSource, /whether owner can drain staff-created pending rows/);
});

runTest('retry drain runtime implementation is limited to the service wrapper', () => {
  const filesWithoutServiceWrapper = runtimeFiles.filter(
    file => file !== 'lib/sync/owner-pending-operation-diagnostics.ts'
  );
  const matches = filesWithoutServiceWrapper.filter(file => {
    const source = readProjectFile(file);
    return /retryDrain|retryPendingOperation|drainPendingOperation|retry\/drain action/i.test(source);
  });

  assert.deepEqual(matches, []);

  const serviceSource = readProjectFile('lib/sync/owner-pending-operation-diagnostics.ts');
  assert.match(serviceSource, /retryDrainOwnerChecklistTogglePendingOperation/);
  assert.match(serviceSource, /supabase\.rpc\(['"]drain_checklist_toggle_pending_operation['"]/);
  assert.match(serviceSource, /diagnosticsRow\.status !== 'failed_retryable'/);
  assert.match(serviceSource, /diagnosticsRow\.actorId !== currentUserId/);
});

runTest('decision records mention D3c-2n-1 as service-wrapper-only', () => {
  assert.match(decisionSource, /D3c-2n retry\/drain action design is added/);
  assert.match(decisionSource, /D3c-2n-1 owner-only single-row service wrapper draft is approved and implemented/);
  assert.match(decisionSource, /No D3c-2n UI button, migration, RLS, worker, production execution, feature-flag change, batch action, or staff-row drain is approved/);
  assert.match(diagnosticsDesignSource, /D3c-2n retry\/drain action design/);
});

runTest('full test suite includes the D3c-2n guardrail', () => {
  assert.match(
    packageJson.scripts.test,
    /tsx tests\/sync-gate-d-retry-drain-action-design\.test\.ts/
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
    throw new Error(`${failed} retry drain action design tests failed`);
  }
}

main();
