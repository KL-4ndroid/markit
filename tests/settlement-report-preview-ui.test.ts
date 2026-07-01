import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const pageSource = readFileSync(join(projectRoot, 'app/reports/settlement/page.tsx'), 'utf8');
const analyticsPageSource = readFileSync(join(projectRoot, 'app/analytics/page.tsx'), 'utf8');
const previewSpecSource = readFileSync(join(projectRoot, 'docs/SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30.md'), 'utf8');
const presentationPlanSource = readFileSync(join(projectRoot, 'docs/SETTLEMENT_REPORT_PRESENTATION_PLAN_2026_07_01.md'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const pageImports = pageSource.match(/^import[\s\S]*?;$/gm)?.join('\n') ?? '';

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Settlement report preview UI ===');

runTest('owner-only preview route exists and uses approved model boundaries', () => {
  assert.match(previewSpecSource, /Slice C: Formal Owner-Only Preview UI[\s\S]*Status: completed/);
  assert.match(pageSource, /buildSettlementReportModel/);
  assert.match(pageSource, /buildSettlementReportPreviewModel/);
  assert.match(pageSource, /deriveRoleCapabilities/);
  assert.match(pageSource, /hasCapability\(capabilities, 'canImportExport'\)/);
  assert.match(pageSource, /hasCapability\(capabilities, 'canViewOwnerFinance'\)/);
});

runTest('formal preview UI exposes report-quality sections for owner decision making', () => {
  assert.match(pageSource, /recommendationLabel\(preview\.executiveSummary\.recommendation\)/);
  assert.match(pageSource, /preview\.topWarnings/);
  assert.match(pageSource, /preview\.reliability\.limitations/);
  assert.match(pageSource, /report\.decision\.scoreComponents/);
  assert.match(pageSource, /report\.marketDecisions/);
  assert.match(pageSource, /report\.productRows/);
  assert.match(pageSource, /preview\.nextActions/);
});

runTest('preview UI is positioned as an in-app report check workspace', () => {
  assert.match(previewSpecSource, /in-app report check workspace/);
  assert.match(previewSpecSource, /not the final report design/);
  assert.match(previewSpecSource, /Slice E: Preview Repositioning/);
  assert.match(presentationPlanSource, /Preview\/check workspace in the app/);
  assert.match(presentationPlanSource, /The current preview page should not be treated as the final report design/);
  assert.doesNotMatch(pageSource, /min-h-\[380px\].*bg-\[#26392F\]/s);
});

runTest('preview UI reads only local IndexedDB data and does not write or sync', () => {
  assert.match(pageSource, /useLiveQuery/);
  assert.match(pageSource, /db\.markets\.toArray/);
  assert.match(pageSource, /db\.products\.toArray/);
  assert.match(pageSource, /db\.dailyStats/);
  assert.doesNotMatch(pageSource, /db\.(markets|products|dailyStats|events)\.(add|put|update|delete|clear|bulkAdd|bulkPut|bulkDelete)/);
  assert.doesNotMatch(
    pageImports,
    /from ['"](?:@\/lib\/sync|@\/lib\/db\/events|@\/lib\/db\/recovery|@\/lib\/supabase\/client|@supabase\/supabase-js|[^'"]*(?:xlsx|csv|download))/i
  );
});

runTest('preview UI exposes owner PDF preview without Excel CSV or custom download actions', () => {
  assert.match(pageSource, /buildSettlementReportPdfViewModel/);
  assert.match(pageSource, /SettlementReportPdfPreviewButton/);
  assert.match(pageSource, /正式 PDF 報告預覽/);
  assert.match(pageSource, /<SettlementReportPdfPreviewButton viewModel=\{pdfViewModel\} canPreview=\{canPreview\} \/>/);
  assert.doesNotMatch(pageSource, /Excel|CSV|download/);
  assert.doesNotMatch(pageSource, /<a\s+[^>]*download|download=/i);
});

runTest('preview UI keeps PDF generation behind owner finance and export capabilities', () => {
  assert.match(pageSource, /const canPreview =\s*!isRoleLoading &&[\s\S]*hasCapability\(capabilities, 'canImportExport'\)[\s\S]*hasCapability\(capabilities, 'canViewOwnerFinance'\)/);
  assert.match(pageSource, /const pdfViewModel = report \? buildSettlementReportPdfViewModel\(\{ report \}\) : null/);
});

runTest('analytics page exposes owner-only entry without changing bottom navigation', () => {
  assert.match(analyticsPageSource, /router\.push\('\/reports\/settlement'\)/);
  assert.match(analyticsPageSource, /!\s*isStaff\s*&&\s*!\s*isRoleLoading\s*&&\s*!\s*roleError/);
});

runTest('full test suite includes settlement report preview UI guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-preview-ui\.test\.ts/);
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
    throw new Error(`${failed} settlement report preview UI tests failed`);
  }
}

main();
