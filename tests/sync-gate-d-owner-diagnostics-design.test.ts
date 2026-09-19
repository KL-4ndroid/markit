import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const projectRoot = join(__dirname, '..');
const designPath = join(projectRoot, 'docs/SYNC_GATE_D_OWNER_DIAGNOSTICS_DESIGN.md');
const decisionPath = join(projectRoot, 'docs/SYNC_GATE_D_WRITE_ROUTING_DECISION_RECORD.md');
const drainDesignPath = join(projectRoot, 'docs/SYNC_GATE_D_PENDING_OPERATION_DRAIN_DESIGN.md');

const designSource = readFileSync(designPath, 'utf8');
const decisionSource = readFileSync(decisionPath, 'utf8');
const drainDesignSource = readFileSync(drainDesignPath, 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readProjectFile('scripts/test-files.txt');

const productionFiles = [
  'hooks/useSync.ts',
  'lib/sync/sync-push-service.ts',
  'lib/sync/owner-pull-service.ts',
  'lib/sync/staff-pull-service.ts',
  'lib/sync/local-cache-writer.ts',
  'lib/markets/field-ops-write-router.ts',
  'components/markets/FieldNotesPanel.tsx',
  'components/markets/ChecklistPanel.tsx',
  'components/markets/MarketFieldOpsSection.tsx',
  'app/recovery/page.tsx',
];

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

console.log('\n=== Sync Gate D owner diagnostics design ===');

runTest('owner diagnostics design records D3c-2g through D3c-2n while blocking broad mutation actions', () => {
  assert.ok(existsSync(designPath));
  assert.match(designSource, /D3c-2k owner-confirmed one-row stale `processing` recovery UI action/);
  assert.match(designSource, /D3c-2l added a manual stale `processing` recovery smoke plan and guarded script/);
  assert.match(designSource, /D3c-2m added a local\/staging-only synthetic stale `processing` recovery test plan/);
  assert.match(designSource, /D3c-2n added retry\/drain action design/);
  assert.match(designSource, /D3c-2n-1 service wrapper/);
  assert.match(designSource, /D3c-2n-2 owner-only single-row retry\/drain UI button/);
  assert.match(designSource, /D3c-2n-3 local\/staging manual verification/);
  assert.match(designSource, /D3c-2m staging execution passed on 2026-06-26 Asia\/Taipei/);
  assert.match(designSource, /D3c-2n-3 staging execution passed on 2026-06-29 Asia\/Taipei/);
  assert.match(designSource, /passed evidence is recorded/);
  assert.match(designSource, /calls only `recover_stale_processing_pending_operation`/);
  assert.match(designSource, /051_list_owner_pending_operation_diagnostics\.sql/);
  assert.match(designSource, /052_recover_stale_processing_pending_operation\.sql/);
  assert.match(designSource, /OwnerPendingOperationDiagnosticsPanel\.tsx/);
  assert.match(designSource, /owner-pending-operation-diagnostics\.ts/);
  assert.match(designSource, /tests\/sync-gate-d-owner-diagnostics-ui\.test\.ts/);
  assert.match(designSource, /tests\/sync-gate-d-stale-processing-recovery-design\.test\.ts/);
  assert.match(designSource, /manual stale `processing` recovery smoke plan/);
  assert.match(designSource, /tests\/supabase-pending-operations-stale-recovery-rpc\.test\.ts/);
  assert.match(designSource, /tests\/supabase-pending-operations-diagnostics-rpc\.test\.ts/);
  assert.match(designSource, /The primary goal is observability/);
  assert.match(designSource, /approved repair behavior is limited to the D3c-2k owner-confirmed one-row stale `processing` recovery action and the D3c-2n-2 owner-confirmed one-row retry\/drain action/);
  assert.match(decisionSource, /Owner-only diagnostics has a design-only safety contract/);
  assert.match(decisionSource, /D3c-2f owner-only read diagnostics RPC draft is added/);
  assert.match(decisionSource, /D3c-2g read-only owner diagnostics UI shell is added/);
  assert.match(decisionSource, /D3c-2h stale `processing` recovery design is added/);
  assert.match(decisionSource, /D3c-2i single-row stale `processing` recovery RPC draft is added/);
  assert.match(decisionSource, /D3c-2j read-only stale `processing` UI indicator is added/);
  assert.match(decisionSource, /D3c-2k owner-confirmed one-row stale `processing` recovery UI action is added/);
  assert.match(decisionSource, /D3c-2l manual stale `processing` recovery smoke verification plan and guarded script are added/);
  assert.match(decisionSource, /D3c-2m synthetic stale `processing` recovery test plan is added/);
  assert.match(decisionSource, /D3c-2n retry\/drain action design is added/);
  assert.match(drainDesignSource, /Owner-only diagnostics status/);
});

runTest('design keeps diagnostics owner-only and read-only by default', () => {
  assert.match(designSource, /first read path must be owner-only/);
  assert.match(designSource, /Prefer this for the first implementation/);
  assert.match(designSource, /SECURITY DEFINER read RPC/);
  assert.match(designSource, /Caller can only read rows for markets they own/);
  assert.match(designSource, /Staff cannot call the RPC successfully/);
  assert.match(designSource, /explicit column list, not `select \*`/);
  assert.match(designSource, /redacts or omits payload by default/);
});

runTest('design explicitly blocks broad mutation and worker behavior', () => {
  for (const forbidden of [
    'call `enqueue_checklist_toggle_pending_operation`',
    'update `pending_operations`',
    'delete `pending_operations`',
    'insert into `events`',
    'create a batch worker',
    'expose service role credentials',
    'change sync cursors',
    'change event replay or projection logic',
    'add staff-visible diagnostics UI',
  ]) {
    assert.match(designSource, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

runTest('design limits exposed diagnostic fields and sensitive payloads', () => {
  for (const allowed of [
    'operation_id',
    'operation_type',
    'entity_type',
    'entity_id',
    'market_id',
    'status',
    'retry_count',
    'last_error_code',
    'last_error_message',
  ]) {
    assert.match(designSource, new RegExp(`\\b${allowed}\\b`));
  }

  assert.match(designSource, /must not expose:[\s\S]*full arbitrary payload JSON by default/);
  assert.match(designSource, /field note body text/);
  assert.match(designSource, /revenue, cost, profit, product cost, supplier, booth cost, or owner finance/);
});

runTest('design separates diagnostics from future repair approvals', () => {
  assert.match(designSource, /Diagnostics can recommend next steps, but it must not execute them/);
  assert.match(designSource, /Future repair actions must be separate approval slices/);
  assert.match(designSource, /explicit owner confirmation/);
  assert.match(designSource, /one-row scope first/);
  assert.match(designSource, /rollback or no-rollback statement/);
});

runTest('design keeps explicit approval before diagnostics retry drain UI', () => {
  assert.match(designSource, /Treat D3c-2m as passed for the missing-final-event recovery path/);
  assert.match(designSource, /Treat D3c-2n-1 service wrapper draft as complete/);
  assert.match(designSource, /Treat D3c-2n-2 owner-only single-row UI button as complete/);
  assert.match(designSource, /Treat D3c-2n-3 local\/staging manual verification as complete/);
  assert.match(designSource, /Continue only documentation alignment, static\/audit tests, read-only diagnostics design, and other non-mutating guardrails until D3c-2n-4 is explicitly approved/);
  assert.match(designSource, /Keep D3c-2n-4 production disposable verification blocked until explicit high-risk approval/);
  assert.match(designSource, /one owner-created `failed_retryable` checklist-toggle row at a time/);
  assert.match(designSource, /calls only `retryDrainOwnerChecklistTogglePendingOperation\(\)`/);
});

runTest('design recommends recovery placement with only the approved diagnostics shell and single-row actions', () => {
  assert.match(designSource, /owner-only `\/recovery` diagnostic panel/);
  assert.match(designSource, /D3c-2n-2 owner-only single-row retry\/drain UI button/);
  assert.match(designSource, /no staff-row drain/);
  assert.match(designSource, /no automatic retry/);

  const approvedMatches = new Set(['app/recovery/page.tsx']);
  const unexpectedMatches = productionFiles.filter(file => {
    const source = readProjectFile(file);
    const hasDiagnostics = /list_owner_pending_operation_diagnostics|OwnerPendingOperationDiagnostics|pending operation diagnostics/i.test(source);
    return hasDiagnostics && !approvedMatches.has(file);
  });

  assert.deepEqual(unexpectedMatches, []);
});

runTest('full test suite includes the owner diagnostics guardrail', () => {
  assert.match(
    testManifestSource,
    /tsx tests\/sync-gate-d-owner-diagnostics-design\.test\.ts/
  );
  assert.match(
    testManifestSource,
    /tsx tests\/supabase-pending-operations-diagnostics-rpc\.test\.ts/
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
    throw new Error(`${failed} owner diagnostics design tests failed`);
  }
}

main();
