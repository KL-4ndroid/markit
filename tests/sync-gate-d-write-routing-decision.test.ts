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

runTest('decision record keeps D3c-1 approval narrow and blocks broader runtime work', () => {
  assert.match(decisionSource, /Status: active Gate D decision record after D3c-1/);
  assert.match(decisionSource, /D3c-1 approved a dormant checklist-toggle RPC route behind a default-off flag/);
  assert.match(decisionSource, /No UI behavior change is approved/);
  assert.match(decisionSource, /No Supabase RLS change after 048 is approved/);
  assert.match(decisionSource, /No pending-operation drain\/worker or final-event writer is approved/);
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

runTest('D3c-2 design is complete and next approval boundary is D3c-2b only', () => {
  assert.match(decisionSource, /D3b, D3c-0, D3c-1, and D3c-2 design are complete/);
  assert.match(decisionSource, /next approval boundary is D3c-2b/);
  assert.match(decisionSource, /Added `public\.enqueue_checklist_toggle_pending_operation`/);
  assert.match(decisionSource, /Only `toggleChecklistItem\(\)` passes the `checklist_toggle` routing hint/);
  assert.match(decisionSource, /D3c-2: Pending Operation Drain Design/);
  assert.match(decisionSource, /single-operation SECURITY DEFINER drain RPC/);
  assert.match(decisionSource, /No direct client insert into `pending_operations` is used/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Direct client insert into `pending_operations`/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Any change to 048 RLS/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*Turning `pendingOperationWriteRouting` on by default/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*A connected runtime drain worker or final-event writer/);
  assert.match(decisionSource, /Do not approve yet:[\s\S]*A broad service-role batch worker/);
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
