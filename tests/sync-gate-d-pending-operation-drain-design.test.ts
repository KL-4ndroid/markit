import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const designPath = join(projectRoot, 'docs/SYNC_GATE_D_PENDING_OPERATION_DRAIN_DESIGN.md');
const designSource = readFileSync(designPath, 'utf8');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const productionFiles = [
  'hooks/useSync.ts',
  'lib/sync/sync-push-service.ts',
  'lib/sync/owner-pull-service.ts',
  'lib/sync/staff-pull-service.ts',
  'lib/sync/local-cache-writer.ts',
  'lib/markets/field-ops-write-router.ts',
  'lib/markets/checklist.ts',
  'lib/markets/field-notes.ts',
];

console.log('\n=== Sync Gate D pending operation drain design ===');

runTest('D3c-2 drain design records D3c-2d completion with controlled enablement', () => {
  assert.ok(existsSync(designPath));
  assert.match(
    designSource,
    /Status: D3c-2 design complete; D3c-2b single-operation drain RPC draft complete; D3c-2c gated runtime drain call complete; D3c-2d controlled enablement complete/
  );
  assert.match(designSource, /050_drain_checklist_toggle_pending_operation\.sql/);
  assert.match(designSource, /pendingOperationDrainAfterEnqueue` is a dedicated drain flag and remains default-off/);
  assert.match(designSource, /`setSyncGateDControlledTestFlags\(\)` can enable the two checklist-toggle flags/);
  assert.match(designSource, /D3c-2e: Manual Cloud Smoke Verification/);
  assert.match(designSource, /scripts\/gate-d-checklist-toggle-smoke\.mjs/);
  assert.match(designSource, /Execution still requires manual selection/);
  assert.match(designSource, /No batch drain\/worker is approved by this document/);
  assert.match(designSource, /No feature flag default change is approved by this document/);
  assert.match(designSource, /No RLS policy change is approved by this document/);
});

runTest('design recommends a narrow single-operation drain RPC before broad workers', () => {
  assert.match(designSource, /single-operation SECURITY DEFINER drain RPC/);
  assert.match(designSource, /public\.drain_checklist_toggle_pending_operation\(p_operation_id TEXT\)/);
  assert.match(designSource, /Do not create a database trigger/);
  assert.match(designSource, /Do not create a broad service-role batch worker as the first drain implementation/);
  assert.match(designSource, /Do not allow direct client writes to `pending_operations` or final `events`/);
});

runTest('design keeps the pilot limited to checklist toggle final events', () => {
  assert.match(designSource, /Operation type: `checklist_item_toggle`/);
  assert.match(designSource, /Entity type: `checklist_item`/);
  assert.match(designSource, /Final event type: `checklist_item_updated`/);
  assert.match(designSource, /`market_id`/);
  assert.match(designSource, /`itemId`/);
  assert.match(designSource, /`completed`/);
  assert.match(designSource, /Field notes/);
  assert.match(designSource, /Revenue, cost, profit, inventory, product, market/);
});

runTest('design requires live permission recheck and fail-closed viewer behavior', () => {
  assert.match(designSource, /`role_snapshot` is evidence only, not authority/);
  assert.match(designSource, /public\.markets\.owner_id = pending_operations\.actor_id/);
  assert.match(designSource, /sr\.staff_id = pending_operations\.actor_id/);
  assert.match(designSource, /sr\.status = 'active'/);
  assert.match(designSource, /sr\.role IN \('operator', 'manager'\)/);
  assert.match(designSource, /Viewer must always fail closed/);
  assert.match(designSource, /mark the row `blocked_permission`/);
});

runTest('design defines idempotent final event creation', () => {
  assert.match(designSource, /Use `pending_operations\.operation_id::UUID` as the final `events\.id`/);
  assert.match(designSource, /If an event with the derived id already exists/);
  assert.match(designSource, /mark the pending row `synced`/);
  assert.match(designSource, /Do not create another event with a different id/);
  assert.match(designSource, /`\(actor_id, idempotency_key\)` unique/);
});

runTest('design defines status and error classification boundaries', () => {
  for (const status of [
    'pending',
    'processing',
    'synced',
    'failed_retryable',
    'failed_permanent',
    'blocked_permission',
  ]) {
    assert.match(designSource, new RegExp(`\\b${status}\\b`));
  }

  assert.match(designSource, /Never auto-retry `blocked_permission`/);
  assert.match(designSource, /Never auto-retry `failed_permanent`/);
  assert.match(designSource, /Invalid operation type, entity type, malformed payload/);
  assert.match(designSource, /Transient database errors/);
});

runTest('production sync still has no drain worker or broad final-event writer', () => {
  const filesWithoutGatedAdapter = productionFiles.filter(
    file => file !== 'lib/markets/field-ops-write-router.ts'
  );
  const matches = filesWithoutGatedAdapter.filter(file => {
    const source = readProjectFile(file);
    return /drain_checklist_toggle_pending_operation|pending-operation-drain|drainPendingOperation|processPendingOperation|pending operation drain/i.test(source);
  });

  assert.deepEqual(matches, []);
  const adapterSource = readProjectFile('lib/markets/field-ops-write-router.ts');
  assert.match(adapterSource, /isSyncGateDFlagEnabled\(['"]pendingOperationDrainAfterEnqueue['"]\)/);
  assert.match(adapterSource, /supabase\.rpc\(['"]drain_checklist_toggle_pending_operation['"]/);
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
    throw new Error(`${failed} pending operation drain design tests failed`);
  }
}

main();
