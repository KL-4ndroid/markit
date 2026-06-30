import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const specPath = join(projectRoot, 'docs/CSV_REPORTING_EXPORT_SPEC_2026_06_30.md');
const cloudPlanPath = join(projectRoot, 'docs/CLOUD_REBUILD_FIRST_RECOVERY_PLAN_2026_06_30.md');
const highRiskPlanPath = join(projectRoot, 'docs/HIGH_RISK_SYNC_AND_DATA_EXECUTION_PLAN.md');
const roleCapabilitiesSource = readFileSync(join(projectRoot, 'lib/permissions/role-capabilities.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const specSource = existsSync(specPath) ? readFileSync(specPath, 'utf8') : '';
const cloudPlanSource = readFileSync(cloudPlanPath, 'utf8');
const highRiskPlanSource = readFileSync(highRiskPlanPath, 'utf8');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== CSV reporting export specification ===');

runTest('spec exists and classifies CSV Excel as reporting not recovery', () => {
  assert.ok(existsSync(specPath));
  assert.match(specSource, /CSV \/ Excel export is a reporting feature/);
  assert.match(specSource, /It is not:[\s\S]*a backup format/);
  assert.match(specSource, /It is not:[\s\S]*an import format/);
  assert.match(specSource, /It is not:[\s\S]*a recovery mechanism/);
  assert.match(specSource, /It is not:[\s\S]*a replacement for cloud rebuild/);
});

runTest('spec preserves current owner-only import export baseline', () => {
  assert.match(roleCapabilitiesSource, /canImportExport: true/);
  assert.match(roleCapabilitiesSource, /const MANAGER_CAPABILITIES:[\s\S]*\.\.\.NONE_CAPABILITIES/);
  assert.doesNotMatch(roleCapabilitiesSource.match(/const MANAGER_CAPABILITIES:[\s\S]*?};/)?.[0] ?? '', /canImportExport:\s*true/);
  assert.match(specSource, /Current code keeps `canImportExport` owner-only/);
  assert.match(specSource, /That baseline remains unchanged by this specification/);
  assert.match(specSource, /Do not reuse owner-only `canImportExport` for manager without a dedicated approval and tests/);
});

runTest('spec defines role policy without approving manager operator or viewer export', () => {
  assert.match(specSource, /Owner:[\s\S]*May export full reporting CSVs/);
  assert.match(specSource, /Manager:[\s\S]*Future candidate for authorized market-scope CSV reports only/);
  assert.match(specSource, /Manager:[\s\S]*Requires a separate capability or route gate before implementation/);
  assert.match(specSource, /Operator:[\s\S]*No broad CSV export by default/);
  assert.match(specSource, /Viewer:[\s\S]*No export/);
});

runTest('spec lists initial report candidates and recommends one narrow first implementation', () => {
  for (const report of [
    '`market_summary`',
    '`daily_sales_summary`',
    '`product_sales_summary`',
    '`transaction_log`',
    '`field_operations`',
  ]) {
    assert.match(specSource, new RegExp(report.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(specSource, /Do not implement all report types at once/);
  assert.match(specSource, /preferably `market_summary` or `daily_sales_summary`/);
});

runTest('spec keeps sensitive finance and supplier fields owner-only', () => {
  for (const field of [
    '`cost`',
    '`costAtTimeOfSale`',
    '`manualCost`',
    '`totalCost`',
    '`profit`',
    '`totalProfit`',
    '`netProfit`',
    '`profitMargin`',
    '`grossMargin`',
    '`supplierInfo`',
    '`boothCost`',
    '`registrationFee`',
    '`deposit`',
    '`commissionRate`',
    '`costBreakdown`',
    '`tableRental`',
    '`chairRental`',
    '`umbrellaRental`',
    '`tableclothRental`',
  ]) {
    assert.match(specSource, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(specSource, /Snake-case equivalents are also owner-only/);
  assert.match(specSource, /Manager, operator, and viewer exports must omit these fields, not mask them/);
});

runTest('spec defines manager redacted allowlist without approving implementation', () => {
  for (const field of [
    /market id/,
    /market name/,
    /market dates/,
    /market location/,
    /product name/,
    /product category/,
    /product price/,
    /product stock/,
    /deal date/,
    /deal count/,
    /revenue/,
    /interaction count/,
    /checklist item title and completion state/,
    /field note text for authorized markets/,
  ]) {
    assert.match(specSource, field);
  }

  assert.match(specSource, /This allowlist is not approval to implement manager export/);
});

runTest('spec blocks unsafe data sources and backup style formats', () => {
  for (const blocked of [
    /bypass role gates by reading unsanitized base tables for staff/,
    /query Supabase directly from UI to fetch broader owner data/,
    /use service-role credentials/,
    /export pending local-only rows as synced cloud truth/,
    /export cloud rebuild preview data as business reports/,
    /no formulas/,
    /no hidden columns/,
    /no arbitrary JSON payload columns/,
  ]) {
    assert.match(specSource, blocked);
  }
});

runTest('spec keeps first implementation and future Excel narrowly bounded', () => {
  assert.match(specSource, /pure CSV escaping\/serialization helper/);
  assert.match(specSource, /one owner-only `market_summary` or `daily_sales_summary` export/);
  assert.match(specSource, /static tests for sensitive field exclusion/);
  assert.match(specSource, /First implementation slice must not:[\s\S]*add manager export capability/);
  assert.match(specSource, /First implementation slice must not:[\s\S]*add Excel dependencies/);
  assert.match(specSource, /First implementation slice must not:[\s\S]*add Supabase reads/);
  assert.match(specSource, /Future Excel:[\s\S]*separate approval/);
});

runTest('spec records completed low-risk helper without approving runtime export', () => {
  assert.match(specSource, /Step 6 Low-Risk Helper Slice/);
  assert.match(specSource, /Status: completed as pure helper and static guardrail work/);
  assert.match(specSource, /lib\/reporting\/csv-export\.ts/);
  assert.match(specSource, /tests\/csv-reporting-export\.test\.ts/);
  assert.match(specSource, /pure CSV escaping and serialization helper/);
  assert.match(specSource, /owner-only `market_summary` CSV builder/);
  assert.match(specSource, /owner capability check requiring `canImportExport` and `canViewOwnerFinance`/);
  assert.match(specSource, /Still not approved:[\s\S]*runtime export UI/);
  assert.match(specSource, /Still not approved:[\s\S]*browser download\/file generation/);
  assert.match(specSource, /Still not approved:[\s\S]*manager export capability/);
});

runTest('cloud rebuild and high-risk plans record step 5 completion and stop lines', () => {
  assert.match(cloudPlanSource, /Step 5: CSV Reporting Export Specification[\s\S]*Status: completed as specification and static guardrail work/);
  assert.match(cloudPlanSource, /docs\/CSV_REPORTING_EXPORT_SPEC_2026_06_30\.md/);
  assert.match(cloudPlanSource, /tests\/csv-reporting-export-spec\.test\.ts/);
  assert.match(cloudPlanSource, /Not approved:[\s\S]*manager capability changes/);
  assert.match(cloudPlanSource, /Not approved:[\s\S]*sensitive staff exports/);
  assert.match(cloudPlanSource, /Step 6: Low-Risk CSV Export[\s\S]*Status: completed as pure helper and static guardrail work/);
  assert.match(cloudPlanSource, /lib\/reporting\/csv-export\.ts/);
  assert.match(cloudPlanSource, /tests\/csv-reporting-export\.test\.ts/);
  assert.match(highRiskPlanSource, /CSV Reporting Export Specification/);
  assert.match(highRiskPlanSource, /Low-Risk CSV Export Helper/);
  assert.match(highRiskPlanSource, /The helper requires owner `canImportExport` and `canViewOwnerFinance` capabilities/);
  assert.match(highRiskPlanSource, /Manager export is only a future scoped\/redacted candidate/);
  assert.match(highRiskPlanSource, /Still not approved:[\s\S]*Runtime export UI/);
  assert.match(highRiskPlanSource, /Still not approved:[\s\S]*Sensitive staff exports/);
});

runTest('full test suite includes CSV reporting export spec guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/csv-reporting-export-spec\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/csv-reporting-export\.test\.ts/);
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
    throw new Error(`${failed} CSV reporting export specification tests failed`);
  }
}

main();
