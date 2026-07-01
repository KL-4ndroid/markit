import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const previewSpecSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30.md'),
  'utf8'
);
const distortionRiskPlanSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_DISTORTION_RISK_PLAN_2026_06_30.md'),
  'utf8'
);
const settlementPlanSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_MODEL_PLAN_2026_06_30.md'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Settlement report preview spec ===');

runTest('spec exists and stays non-runtime', () => {
  assert.match(previewSpecSource, /# Settlement Report Preview Spec/);
  assert.match(previewSpecSource, /Status: Slice C owner-only preview UI completed; 2026-07-01 update repositions preview as an in-app report check workspace\. PDF generation remains deferred/);
  assert.match(previewSpecSource, /approves the owner-only preview UI with local read-only IndexedDB access/);
  assert.match(previewSpecSource, /It does not approve[\s\S]*PDF generation/);
  assert.match(previewSpecSource, /It does not approve[\s\S]*Supabase reads/);
});

runTest('spec defines owner-only preview and data-source boundary', () => {
  assert.match(previewSpecSource, /Initial preview access is owner-only/);
  assert.match(previewSpecSource, /Manager, operator, viewer, and fail-closed roles:[\s\S]*no preview access/);
  assert.match(previewSpecSource, /preview UI may read local IndexedDB through the approved owner-only route/);
  assert.match(previewSpecSource, /pure preview view model must consume an already-built `SettlementReportModel`/);
  assert.match(previewSpecSource, /must not:[\s\S]*query Supabase directly/);
  assert.match(previewSpecSource, /must not:[\s\S]*generate PDF, Excel, CSV, or downloads/);
});

runTest('spec defines preview sections before visual implementation', () => {
  for (const heading of [
    /Report Header/,
    /Executive Summary/,
    /Data Quality And Reliability/,
    /Score Explanation/,
    /Market Performance/,
    /Product Performance/,
    /Cost And Profit/,
    /Next Actions/,
  ]) {
    assert.match(previewSpecSource, heading);
  }

  assert.match(previewSpecSource, /The preview is not an analytics dashboard/);
  assert.match(previewSpecSource, /fixed-period, owner-only/);
});

runTest('spec maps every current limitation code to visible behavior', () => {
  for (const code of [
    'missing_daily_stats',
    'missing_cost_data',
    'missing_product_detail',
    'missing_interaction_data',
    'unsynced_data',
    'no_markets_in_period',
    'low_sample_size',
    'excluded_inactive_market',
    'ongoing_or_future_market',
    'projection_mismatch',
    'possible_duplicate_daily_stats',
    'outlier_values',
    'manual_entry_dominant',
    'zero_or_missing_market_cost',
    'cost_basis_estimated',
    'partial_period_overlap',
  ]) {
    assert.match(previewSpecSource, new RegExp(`\\\`${code}\\\``));
  }

  assert.match(previewSpecSource, /Limitation To Visible Behavior Mapping/);
});

runTest('spec records completed preview UI while keeping PDF as a later decision', () => {
  assert.match(previewSpecSource, /Future PDF Relationship/);
  assert.match(previewSpecSource, /this spec does not choose:[\s\S]*PDF library/);
  assert.match(previewSpecSource, /Slice B: Pure Preview View Model[\s\S]*Status: completed/);
  assert.match(previewSpecSource, /lib\/reporting\/settlement-report-preview\.ts/);
  assert.match(previewSpecSource, /Slice C: Owner-Only Preview UI[\s\S]*Status: completed/);
  assert.match(previewSpecSource, /app\/reports\/settlement\/page\.tsx/);
  assert.match(previewSpecSource, /Slice E: Preview Repositioning[\s\S]*Status: approved/);
  assert.match(previewSpecSource, /Slice D: PDF Technical Plan/);
  assert.match(previewSpecSource, /Stop for approval before:[\s\S]*adding PDF generation/);
  assert.doesNotMatch(previewSpecSource, /Stop for approval before:[\s\S]*adding report preview UI/);
});

runTest('upstream plans still identify preview as dependent on model and distortion risks', () => {
  assert.match(distortionRiskPlanSource, /Completed follow-up:[\s\S]*SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30/);
  assert.match(distortionRiskPlanSource, /The Report Preview Spec includes visible UI states/);
  assert.match(settlementPlanSource, /These risks must be presented as confidence and section-availability limitations/);
  assert.match(settlementPlanSource, /Report preview UI approval and completion are tracked in `docs\/SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30\.md`/);
  assert.match(settlementPlanSource, /Status: completed as specification, pure preview model, and formal owner-only preview UI/);
});

runTest('full test suite includes settlement report preview spec guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-preview-spec\.test\.ts/);
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
    throw new Error(`${failed} settlement report preview spec tests failed`);
  }
}

main();
