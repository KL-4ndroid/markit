import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const planPath = join(projectRoot, 'docs/CLOUD_REBUILD_FIRST_RECOVERY_PLAN_2026_06_30.md');
const highRiskPlanPath = join(projectRoot, 'docs/HIGH_RISK_SYNC_AND_DATA_EXECUTION_PLAN.md');
const importPlanPath = join(projectRoot, 'docs/IMPORT_RECOVERY_SEMANTICS_PLAN_2026_06_29.md');
const planSource = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';
const highRiskPlanSource = readFileSync(highRiskPlanPath, 'utf8');
const importPlanSource = readFileSync(importPlanPath, 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Cloud rebuild first recovery plan ===');

runTest('plan exists and records the new recovery product direction', () => {
  assert.ok(existsSync(planPath));
  assert.match(planSource, /Cloud data is the primary trusted source/);
  assert.match(planSource, /Local IndexedDB is fast cache and offline temporary state/);
  assert.match(planSource, /Local backup is not a primary user-facing product feature/);
  assert.match(planSource, /clear local data and resync from cloud/);
  assert.match(planSource, /Settlement reports are the primary reporting feature/);
  assert.match(planSource, /CSV \/ Excel export is a supporting reporting download feature, not a backup or recovery feature/);
});

runTest('plan reclassifies previous import recovery and sync work without approving mutation', () => {
  for (const expected of [
    /Import recovery classifier[\s\S]*Developer\/emergency import safety, not primary recovery route/,
    /Phase-aware import runner[\s\S]*Structured emergency import foundation, not production import UI/,
    /Import Safety Status panel[\s\S]*Advanced\/secondary safety information/,
    /Emergency local backup[\s\S]*Internal guardrail for high-risk mutation only/,
    /Pending operations diagnostics[\s\S]*Required pre-clear safety check/,
    /Cache replacement preview\/simulator[\s\S]*Basis for cloud rebuild preview/,
    /Replace-cache execute[\s\S]*Still blocked until preview and pending checks are safe/,
    /Recovery page[\s\S]*Should move toward local rebuild and sync recovery/,
  ]) {
    assert.match(planSource, expected);
  }
});

runTest('plan defines the eight-step execution path with preview before execute', () => {
  for (const expected of [
    /Step 1: Plan Update/,
    /Step 2: Clear Local And Resync Design/,
    /Step 3: Pending Operations Pre-Clear Check/,
    /Step 4: Cloud Rebuild Preview/,
    /Step 5: CSV Reporting Export Specification/,
    /Step 6: Low-Risk CSV Export/,
    /Step 7: Owner Settlement Report Model/,
    /Step 8: Replace-Cache Execute Decision/,
  ]) {
    assert.match(planSource, expected);
  }

  assert.match(planSource, /Build a non-mutating preview/);
  assert.match(planSource, /Step 1: Plan Update[\s\S]*Status: completed/);
  assert.match(planSource, /Step 2: Clear Local And Resync Design[\s\S]*Status: completed as design and static guardrail work/);
  assert.match(planSource, /docs\/CLEAR_LOCAL_AND_RESYNC_DESIGN_2026_06_30\.md/);
  assert.match(planSource, /wiring the older `clearLocalDataAndPullFromCloud\(\)` migration path into `\/recovery`/);
  assert.match(planSource, /Step 3: Pending Operations Pre-Clear Check[\s\S]*Status: completed as design and static guardrail work/);
  assert.match(planSource, /docs\/PENDING_OPERATIONS_PRE_CLEAR_CHECK_DESIGN_2026_06_30\.md/);
  assert.match(planSource, /Not approved:[\s\S]*discard/);
  assert.match(planSource, /Not approved:[\s\S]*drain/);
  assert.match(planSource, /Not approved:[\s\S]*retry/);
  assert.match(planSource, /Step 4: Cloud Rebuild Preview[\s\S]*Status: completed as pure model and static guardrail work/);
  assert.match(planSource, /docs\/CLOUD_REBUILD_PREVIEW_DESIGN_2026_06_30\.md/);
  assert.match(planSource, /lib\/sync\/cloud-rebuild-preview\.ts/);
  assert.match(planSource, /tests\/cloud-rebuild-preview\.test\.ts/);
  assert.match(planSource, /Not approved:[\s\S]*deleting local tables/);
  assert.match(planSource, /Not approved:[\s\S]*applying replace-cache/);
  assert.match(planSource, /Not approved:[\s\S]*changing sync pull behavior/);
  assert.match(planSource, /Not approved:[\s\S]*reading live Supabase or IndexedDB data/);
  assert.match(planSource, /Not approved:[\s\S]*wiring preview to `\/recovery`/);
  assert.match(planSource, /Step 5: CSV Reporting Export Specification[\s\S]*Status: completed as specification and static guardrail work/);
  assert.match(planSource, /docs\/CSV_REPORTING_EXPORT_SPEC_2026_06_30\.md/);
  assert.match(planSource, /tests\/csv-reporting-export-spec\.test\.ts/);
  assert.match(planSource, /Not approved:[\s\S]*runtime export UI/);
  assert.match(planSource, /Not approved:[\s\S]*manager capability changes/);
  assert.match(planSource, /Not approved:[\s\S]*sensitive staff exports/);
  assert.match(planSource, /Step 6: Low-Risk CSV Export[\s\S]*Status: completed as pure helper and static guardrail work/);
  assert.match(planSource, /lib\/reporting\/csv-export\.ts/);
  assert.match(planSource, /tests\/csv-reporting-export\.test\.ts/);
  assert.match(planSource, /pure CSV serialization helper/);
  assert.match(planSource, /owner-only `market_summary` CSV builder/);
  assert.match(planSource, /static tests proving no runtime data source, UI, download, Excel, or sync integration/);
  assert.match(planSource, /Not approved in this plan:[\s\S]*browser download\/file generation/);
  assert.match(planSource, /Step 7: Owner Settlement Report Model[\s\S]*Status: completed as pure data model, distortion-risk model, and static guardrail work/);
  assert.match(planSource, /docs\/SETTLEMENT_REPORT_MODEL_PLAN_2026_06_30\.md/);
  assert.match(planSource, /docs\/SETTLEMENT_REPORT_DISTORTION_RISK_PLAN_2026_06_30\.md/);
  assert.match(planSource, /lib\/reporting\/settlement-report\.ts/);
  assert.match(planSource, /tests\/settlement-report-model\.test\.ts/);
  assert.match(planSource, /Designed PDF output later/);
  assert.match(planSource, /explainable score components/);
  assert.match(planSource, /market rejoin decision rows/);
  assert.match(planSource, /section-level availability states for incomplete cost, product, interaction, sync, and daily-stats data/);
  assert.match(planSource, /model-level distortion warnings/);
  assert.match(planSource, /Not approved in this plan:[\s\S]*PDF generation/);
  assert.match(planSource, /Not approved in this plan:[\s\S]*manager report\/export access/);
});

runTest('plan blocks local deletion automatic rebuild and sensitive export until explicit approval', () => {
  for (const blocked of [
    /clearing local IndexedDB/,
    /executing replace-cache/,
    /changing pull sync to replace local cache/,
    /adding automatic rebuild after login/,
    /broadening `\/recovery` tools to staff roles/,
    /exposing import UI/,
    /adding PDF\/CSV\/Excel exports that include cost, profit, booth fee, supplier, or owner-only fields for any non-owner role/,
  ]) {
    assert.match(planSource, blocked);
  }
});

runTest('high-risk plan records cloud rebuild first direction and remaining stop lines', () => {
  assert.match(highRiskPlanSource, /Cloud Rebuild First Recovery Direction/);
  assert.match(highRiskPlanSource, /Status: completed as plan update and static guardrail work/);
  assert.match(highRiskPlanSource, /Cloud data is the primary trusted source/);
  assert.match(highRiskPlanSource, /Pending operations diagnostics become a required pre-clear safety check/);
  assert.match(highRiskPlanSource, /Cache replacement preview and apply simulator become the basis for cloud rebuild preview/);
  assert.match(highRiskPlanSource, /Still not approved:[\s\S]*Clearing local IndexedDB/);
  assert.match(highRiskPlanSource, /Still not approved:[\s\S]*Running replace-cache execute/);
  assert.match(highRiskPlanSource, /Still not approved:[\s\S]*Adding automatic rebuild after login/);
});

runTest('import recovery plan is demoted to secondary emergency infrastructure', () => {
  assert.match(importPlanSource, /Updated product direction after the cloud-rebuild-first decision/);
  assert.match(importPlanSource, /Import recovery remains secondary developer\/emergency safety infrastructure/);
  assert.match(importPlanSource, /Local emergency backup is not the primary user-facing recovery path/);
  assert.match(importPlanSource, /clear local data and resync from cloud/);
  assert.match(importPlanSource, /must not be used to justify a production import UI, automatic local restore, or a second backup\/recovery system/);
});

runTest('full test suite includes cloud rebuild first plan guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/cloud-rebuild-first-recovery-plan\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/clear-local-and-resync-design\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/pending-operations-pre-clear-check-design\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/cloud-rebuild-preview\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/csv-reporting-export-spec\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/csv-reporting-export\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-model\.test\.ts/);
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
    throw new Error(`${failed} cloud rebuild first recovery plan tests failed`);
  }
}

main();
