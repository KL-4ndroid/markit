import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const decisionSource = readProjectFile('docs/SYNC_GATE_D_WRITE_ROUTING_DECISION_RECORD.md');

const productionFiles = [
  'hooks/useSync.ts',
  'lib/sync/sync-push-service.ts',
  'lib/sync/owner-pull-service.ts',
  'lib/sync/staff-pull-service.ts',
  'lib/sync/local-cache-writer.ts',
  'lib/markets/field-notes.ts',
  'lib/markets/checklist.ts',
  'components/markets/FieldNotesPanel.tsx',
  'components/markets/ChecklistPanel.tsx',
  'components/markets/MarketFieldOpsSection.tsx',
];

console.log('\n=== Sync Gate D write routing decision ===');

runTest('decision record keeps Gate D approvals narrow and blocks broader runtime work', () => {
  assert.match(decisionSource, /Status: active Gate D decision record after D3c-2n retry\/drain action design/);
  assert.match(decisionSource, /D3c-1 approved a dormant checklist-toggle RPC route behind a default-off flag/);
  assert.match(decisionSource, /D3c-2b approved a single-operation checklist-toggle drain RPC draft/);
  assert.match(decisionSource, /D3c-2c approved a gated runtime drain call after successful enqueue/);
  assert.match(decisionSource, /D3c-2d approved controlled test\/staging enablement/);
  assert.match(decisionSource, /D3c-2e completed one manual cloud smoke verification/);
  assert.match(decisionSource, /D3c-2l approved a manual stale `processing` recovery smoke verification plan and guarded script/);
  assert.match(decisionSource, /D3c-2m approved a local\/staging-only synthetic stale `processing` recovery test plan/);
  assert.match(decisionSource, /D3c-2n approved retry\/drain action design only/);
  assert.match(decisionSource, /No ordinary market-detail, staff workflow, revenue, inventory, product, or market UI behavior change is approved/);
  assert.match(decisionSource, /No Supabase RLS change after 048 is approved/);
  assert.match(decisionSource, /No broad worker, production flag default, or production-wide final-event writer/);
});

runTest('source-of-truth recommendation keeps existing event model primary', () => {
  assert.match(decisionSource, /Existing event model remains source of truth/);
  assert.match(decisionSource, /Choose Option A for the first runtime pilot/);
  assert.match(decisionSource, /pending_operations` tracks delivery, retry, and blocked states/);
  assert.match(decisionSource, /Dual-write direct event and pending operation as equal sources/);
  assert.match(decisionSource, /Recommendation:[\s\S]*Avoid/);
});

runTest('first pilot is limited to checklist toggle only', () => {
  assert.match(decisionSource, /Checklist toggle only/);
  assert.match(decisionSource, /`checklist_item_toggle`/);
  assert.match(decisionSource, /No revenue, inventory, cost, product, or market identity changes/);
});

runTest('staff insert strategy rejects loosening base-table visibility', () => {
  assert.match(decisionSource, /SECURITY DEFINER enqueue RPC with live permission validation/);
  assert.match(decisionSource, /Avoids loosening base-table SELECT/);
  assert.match(decisionSource, /Loosen staff direct SELECT on `markets`[\s\S]*Do not choose/);
});

runTest('permission downgrade and idempotency decisions are explicit', () => {
  assert.match(decisionSource, /Re-check live permission before creating the final event/);
  assert.match(decisionSource, /blocked_permission/);
  assert.match(decisionSource, /`role_snapshot` is evidence, not authority/);
  assert.match(decisionSource, /`\(actor_id, idempotency_key\)` unique/);
  assert.match(decisionSource, /mark the operation `synced`, not create another event/);
});

runTest('D3c-2e through D3c-2n progress is recorded and broader gates remain closed', () => {
  assert.match(decisionSource, /D3b, D3c-0, D3c-1, D3c-2 design, D3c-2b, D3c-2c, D3c-2d, D3c-2e planning, and one D3c-2e manual cloud smoke execution are complete/);
  assert.match(decisionSource, /Verification operation id: `512d40e6-1192-45dd-ad03-3e437f3d562d`/);
  assert.match(decisionSource, /pending row reached `synced`/);
  assert.match(decisionSource, /Added `public\.enqueue_checklist_toggle_pending_operation`/);
  assert.match(decisionSource, /Only `toggleChecklistItem\(\)` passes the `checklist_toggle` routing hint/);
  assert.match(decisionSource, /D3c-2: Pending Operation Drain Design/);
  assert.match(decisionSource, /D3c-2b: Single Operation Drain RPC Draft/);
  assert.match(decisionSource, /Added `public\.drain_checklist_toggle_pending_operation`/);
  assert.match(decisionSource, /The caller must be authenticated and must match `pending_operations\.actor_id`/);
  assert.match(decisionSource, /D3c-2c: Runtime Drain Call Behind Dedicated Flag/);
  assert.match(decisionSource, /pendingOperationDrainAfterEnqueue/);
  assert.match(decisionSource, /The adapter still writes the local event first/);
  assert.match(decisionSource, /D3c-2d: Controlled Test Or Staging Enablement/);
  assert.match(decisionSource, /setSyncGateDControlledTestFlags\(\)/);
  assert.match(decisionSource, /Production defaults remain false/);
  assert.match(decisionSource, /D3c-2e: Manual Cloud Smoke Verification/);
  assert.match(decisionSource, /scripts\/gate-d-checklist-toggle-smoke\.mjs/);
  assert.match(decisionSource, /One manual cloud smoke verification completed on 2026-06-22 Asia\/Taipei/);
  assert.match(decisionSource, /D3c-2l manual stale `processing` recovery smoke verification plan and guarded script are added/);
  assert.match(decisionSource, /No D3c-2l cloud recovery execution has been performed by this slice/);
  assert.match(decisionSource, /Choose one disposable or non-production stale `processing` pending operation/);
  assert.match(decisionSource, /D3c-2m synthetic stale `processing` recovery test plan is added/);
  assert.match(decisionSource, /No production synthetic data creation is approved/);
  assert.match(decisionSource, /D3c-2m staging execution passed on 2026-06-26 Asia\/Taipei/);
  assert.match(decisionSource, /operation `c466de02-d79a-4ae8-adc0-44b3fa0efd06` recovered to `failed_retryable`/);
  assert.match(decisionSource, /D3c-2n-1 owner-only single-row service wrapper draft is approved and implemented/);
  assert.match(decisionSource, /No D3c-2n UI button, migration, RLS, worker, production execution, feature-flag change, batch action, or staff-row drain is approved/);
  assert.match(decisionSource, /D3c-2n retry\/drain action design is added/);
  assert.match(decisionSource, /The next D3c-2n step, if later approved, should be D3c-2n-2 owner UI button/);
  assert.match(decisionSource, /No direct client insert into `pending_operations` is used/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Direct client insert into `pending_operations`/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Any change to 048 RLS/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Turning `pendingOperationWriteRouting` on by default/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Turning `pendingOperationDrainAfterEnqueue` on by default/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*A broad connected runtime drain worker or production-wide final-event writer/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*A broad service-role batch worker/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Any production synthetic stale `processing` row/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Any owner retry\/drain action for staff-created pending rows/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Any D3c-2n UI button, batch action, worker, production execution, staff-row drain, or feature-flag default change without explicit approval/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Any cache replacement execute behavior/);
});

runTest('production runtime still does not import pending-operation write routing', () => {
  const matches = productionFiles.filter(file => {
    const source = readProjectFile(file);
    return /pending_operations|pending-operation-model|sync-gate-d-flags/.test(source);
  });

  assert.deepEqual(matches, []);
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
    throw new Error(`${failed} write routing decision tests failed`);
  }
}

main();
