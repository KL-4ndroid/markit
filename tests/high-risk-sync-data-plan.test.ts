import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const planPath = join(projectRoot, 'docs/HIGH_RISK_SYNC_AND_DATA_EXECUTION_PLAN.md');
const planSource = readFileSync(planPath, 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== High-risk sync and data execution plan ===');

runTest('plan exists and records current post-D3 baseline', () => {
  assert.ok(existsSync(planPath));
  assert.match(planSource, /C2\.21 read-only cloud consistency audit completed/);
  assert.match(planSource, /C2\.20 staff data flow verification completed/);
  assert.match(planSource, /053_repair_staff_accessible_view_sanitization\.sql/);
  assert.match(planSource, /C2\.29B Staff View \/ RLS read-only verification passed after 053/);
  assert.match(planSource, /C2\.28B render guard \/ role fail-closed static audit passed/);
  assert.match(planSource, /D3c-2n-4 production disposable retry\/drain verification remains unapproved/);
});

runTest('plan keeps high-risk execution blocked until explicit approval', () => {
  for (const boundary of [
    /Replace-cache execute remains unapproved/,
    /Pending-operation worker, batch drain, and automatic retry remain unapproved/,
    /RLS\/data repair remains unapproved/,
    /Broad `lib\/db\/events\.ts` refactor remains unapproved/,
    /Stop and ask for explicit approval before:[\s\S]*Running production disposable verification/,
    /Stop and ask for explicit approval before:[\s\S]*Adding any background worker or automatic retry/,
    /Stop and ask for explicit approval before:[\s\S]*Adding replace-cache execute\/apply\/delete code/,
    /Stop and ask for explicit approval before:[\s\S]*Applying RLS or data repair migrations/,
    /Stop and ask for explicit approval before:[\s\S]*Refactoring production event handler behavior/,
  ]) {
    assert.match(planSource, boundary);
  }
});

runTest('plan approves only documentation importData boundary simulator worker-model isolated rollback and semantics work', () => {
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add this plan document/);
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add `importData\(\)` rollback boundary tests/);
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add a cache replacement apply simulator/);
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add pending-operation worker model helpers and tests/);
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add isolated fake IndexedDB rollback verification/);
  assert.match(planSource, /Approved by current execution plan:[\s\S]*Add import recovery semantics design and static guardrails/);
  assert.match(planSource, /Not included:[\s\S]*Runtime behavior changes/);
  assert.match(planSource, /Not included:[\s\S]*Browser\/profile IndexedDB rollback verification/);
  assert.match(planSource, /Not included:[\s\S]*Import rollback UI/);
  assert.match(planSource, /Not included:[\s\S]*Supabase changes/);
  assert.match(planSource, /Not included:[\s\S]*Production data changes/);
});

runTest('plan records import recovery classifier completion and next boundary', () => {
  assert.match(planSource, /Current Import\/Recovery Continuation Decision/);
  assert.match(planSource, /Phase 1 complete; pure classifier design slice completed as non-runtime work/);
  assert.match(planSource, /reinforcement of the existing `importData\(\)` and `\/recovery` safety semantics/);
  assert.match(planSource, /Do not create a second backup, restore, import, or recovery system/);
  assert.match(planSource, /Do not add a new recovery page/);
  assert.match(planSource, /Completed low-risk continuation slice:[\s\S]*pure import-outcome classifier design and tests only/);
  assert.match(planSource, /The classifier does not call `importData\(\)`/);
  assert.match(planSource, /The classifier does not read or write IndexedDB/);
  assert.match(planSource, /The classifier does not mount in UI/);
  assert.match(planSource, /Completed after separate approval:[\s\S]*`Import Safety Status` inside existing `\/recovery`/);
  assert.match(planSource, /Completed after separate approval:[\s\S]*Emergency-backup metadata display/);
  assert.match(planSource, /Deferred until a separate decision:[\s\S]*Browser\/profile IndexedDB verification/);
});

runTest('plan records import safety status UI shell without approving recovery automation', () => {
  assert.match(planSource, /Import Safety Status UI Shell/);
  assert.match(planSource, /Status: completed as owner-gated read-only UI work/);
  assert.match(planSource, /The panel is mounted only inside the existing `\/recovery` page/);
  assert.match(planSource, /The panel does not call `importData\(\)`/);
  assert.match(planSource, /The panel does not restore, repair, or mutate IndexedDB/);
  assert.match(planSource, /The panel does not write Supabase/);
  assert.match(planSource, /Still not approved:[\s\S]*Automatic rollback, restore, repair, or production recovery behavior/);
});

runTest('plan records phase-aware import runner without approving UI wiring', () => {
  assert.match(planSource, /Phase-Aware Import Runner/);
  assert.match(planSource, /Status: completed as DB-layer runtime boundary work/);
  assert.match(planSource, /Existing `importData\(jsonData\): Promise<void>` remains the public import API/);
  assert.match(planSource, /Existing `importData\(\)` callers still receive the original thrown error instead of `ImportOutcomeError`/);
  assert.match(planSource, /No production UI calls the runner/);
  assert.match(planSource, /Still not approved:[\s\S]*Wiring classifier output into UI/);
});

runTest('plan records cloud rebuild first direction without approving destructive recovery', () => {
  assert.match(planSource, /Cloud Rebuild First Recovery Direction/);
  assert.match(planSource, /Status: completed as plan update and static guardrail work/);
  assert.match(planSource, /Cloud data is the primary trusted source/);
  assert.match(planSource, /Local IndexedDB is fast cache and offline temporary state/);
  assert.match(planSource, /Local backup is not a primary user-facing product feature/);
  assert.match(planSource, /CSV \/ Excel export is a reporting feature, not a backup or recovery feature/);
  assert.match(planSource, /Pending operations diagnostics become a required pre-clear safety check/);
  assert.match(planSource, /Cache replacement preview and apply simulator become the basis for cloud rebuild preview/);
  assert.match(planSource, /Replace-cache execute remains blocked/);
  assert.match(planSource, /Still not approved:[\s\S]*Clearing local IndexedDB/);
  assert.match(planSource, /Still not approved:[\s\S]*Running replace-cache execute/);
  assert.match(planSource, /Still not approved:[\s\S]*Adding automatic rebuild after login/);
  assert.match(planSource, /Still not approved:[\s\S]*Exporting sensitive owner-only CSV \/ Excel fields/);
});

runTest('plan records clear local and resync design without approving execution', () => {
  assert.match(planSource, /Clear Local And Resync Design/);
  assert.match(planSource, /Status: completed as design and static guardrail work/);
  assert.match(planSource, /docs\/CLEAR_LOCAL_AND_RESYNC_DESIGN_2026_06_30\.md/);
  assert.match(planSource, /future recovery flow is split into non-mutating preflight, non-mutating preview, and separately approved execute/);
  assert.match(planSource, /Initial execute policy is owner-only/);
  assert.match(planSource, /pending operations, local unsynced data, local-only writes, cloud read availability, role, session, and sync-idle checks/);
  assert.match(planSource, /prevents the older `clearLocalDataAndPullFromCloud\(\)` migration path from being wired into `\/recovery` as-is/);
  assert.match(planSource, /Still not approved:[\s\S]*Clearing local IndexedDB/);
  assert.match(planSource, /Still not approved:[\s\S]*Calling `clearLocalDataAndPullFromCloud\(\)` from UI/);
  assert.match(planSource, /Still not approved:[\s\S]*Manager or staff execute/);
});

runTest('plan records pending operations pre-clear design without approving mutation', () => {
  assert.match(planSource, /Pending Operations Pre-Clear Check Design/);
  assert.match(planSource, /Status: completed as design and static guardrail work/);
  assert.match(planSource, /docs\/PENDING_OPERATIONS_PRE_CLEAR_CHECK_DESIGN_2026_06_30\.md/);
  assert.match(planSource, /future pre-clear check is read-only/);
  assert.match(planSource, /blocks local clear on unresolved, retryable, failed, blocked, unknown, missing-final-event, or final-event-mismatch pending rows/);
  assert.match(planSource, /diagnostics can display rows, but pre-clear decides whether local reset is blocked/);
  assert.match(planSource, /Owner pre-clear must include both owner-created and staff-created rows/);
  assert.match(planSource, /Manager remains preview-only/);
  assert.match(planSource, /A clean report only permits moving to cloud rebuild preview/);
  assert.match(planSource, /Still not approved:[\s\S]*Pending operation discard/);
  assert.match(planSource, /Still not approved:[\s\S]*Pending operation drain or retry/);
  assert.match(planSource, /Still not approved:[\s\S]*Worker or automatic retry/);
  assert.match(planSource, /Still not approved:[\s\S]*Local IndexedDB deletion/);
});

runTest('plan records cloud rebuild preview model without approving live data or execute wiring', () => {
  assert.match(planSource, /Cloud Rebuild Preview/);
  assert.match(planSource, /Status: completed as pure model and static guardrail work/);
  assert.match(planSource, /docs\/CLOUD_REBUILD_PREVIEW_DESIGN_2026_06_30\.md/);
  assert.match(planSource, /lib\/sync\/cloud-rebuild-preview\.ts/);
  assert.match(planSource, /The preview model is pure and input-driven/);
  assert.match(planSource, /does not import Supabase, Dexie, `db`, React, hooks, or recovery UI components/);
  assert.match(planSource, /`canProceedToExecute` is always false/);
  assert.match(planSource, /Production sync and recovery UI paths do not import the preview model/);
  assert.match(planSource, /Still not approved:[\s\S]*Reading live Supabase data for rebuild preview/);
  assert.match(planSource, /Still not approved:[\s\S]*Reading IndexedDB for rebuild preview/);
  assert.match(planSource, /Still not approved:[\s\S]*Wiring preview to `\/recovery`/);
  assert.match(planSource, /Still not approved:[\s\S]*Running replace-cache execute/);
});

runTest('plan records CSV reporting export spec without approving export runtime or staff-sensitive data', () => {
  assert.match(planSource, /CSV Reporting Export Specification/);
  assert.match(planSource, /Status: completed as specification and static guardrail work/);
  assert.match(planSource, /docs\/CSV_REPORTING_EXPORT_SPEC_2026_06_30\.md/);
  assert.match(planSource, /CSV \/ Excel export is explicitly classified as reporting, not backup, import, recovery, cloud rebuild, or cache repair/);
  assert.match(planSource, /Current `canImportExport` remains owner-only/);
  assert.match(planSource, /Manager export is only a future scoped\/redacted candidate/);
  assert.match(planSource, /Operator broad export and viewer export remain blocked/);
  assert.match(planSource, /Owner-only fields such as cost, profit, supplier, booth fee, commission, registration fee, deposit, and rental costs are forbidden in non-owner exports/);
  assert.match(planSource, /Initial implementation is limited to future narrow CSV helper planning/);
  assert.match(planSource, /Still not approved:[\s\S]*Runtime export UI/);
  assert.match(planSource, /Still not approved:[\s\S]*Manager export capability changes/);
  assert.match(planSource, /Still not approved:[\s\S]*Sensitive staff exports/);
});

runTest('plan records low-risk CSV helper without approving UI file generation or staff export', () => {
  assert.match(planSource, /Low-Risk CSV Export Helper/);
  assert.match(planSource, /Status: completed as pure helper and static guardrail work/);
  assert.match(planSource, /lib\/reporting\/csv-export\.ts/);
  assert.match(planSource, /tests\/csv-reporting-export\.test\.ts/);
  assert.match(planSource, /Added pure CSV escaping and serialization/);
  assert.match(planSource, /owner-only `market_summary` CSV builder from caller-provided authorized rows/);
  assert.match(planSource, /requires owner `canImportExport` and `canViewOwnerFinance` capabilities/);
  assert.match(planSource, /Manager, operator, viewer, and fail-closed roles are blocked/);
  assert.match(planSource, /does not import Supabase, IndexedDB, React, browser download APIs, Excel libraries, sync services, or recovery UI/);
  assert.match(planSource, /Still not approved:[\s\S]*Browser download or file generation/);
  assert.match(planSource, /Still not approved:[\s\S]*Manager export capability/);
  assert.match(planSource, /Still not approved:[\s\S]*Staff-sensitive export/);
});

runTest('full test suite includes high-risk plan and importData boundary guardrails', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/high-risk-sync-data-plan\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-data-rollback-boundary\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-data-indexeddb-rollback\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-recovery-semantics-plan\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-recovery-classifier\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-runner\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-safety-status-ui\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/import-ui-classifier-integration-plan\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/cloud-rebuild-first-recovery-plan\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/clear-local-and-resync-design\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/pending-operations-pre-clear-check-design\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/cloud-rebuild-preview\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/csv-reporting-export-spec\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/csv-reporting-export\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/sync-cache-replacement-apply-simulator\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/sync-pending-operation-worker-model\.test\.ts/);
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
    throw new Error(`${failed} high-risk sync and data plan tests failed`);
  }
}

main();
