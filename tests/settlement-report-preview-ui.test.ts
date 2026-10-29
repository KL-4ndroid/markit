import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const pageSource = readFileSync(join(projectRoot, 'components/reports/settlement/SettlementReportScreen.tsx'), 'utf8');
const readerSource = readFileSync(join(projectRoot, 'components/reports/settlement/SettlementReportReader.tsx'), 'utf8');
const routeSource = readFileSync(join(projectRoot, 'app/reports/settlement/page.tsx'), 'utf8');
const analyticsPageSource = readFileSync(join(projectRoot, 'app/analytics/page.tsx'), 'utf8');
const previewSpecSource = readFileSync(join(projectRoot, 'docs/SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30.md'), 'utf8');
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');
const pageImports = pageSource.match(/^import[\s\S]*?;$/gm)?.join('\n') ?? '';

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Settlement report preview UI ===');

runTest('owner-only preview route exists and uses approved model boundaries', () => {
  assert.match(previewSpecSource, /Slice C: Formal Owner-Only Preview UI[\s\S]*Status: completed/);
  assert.match(pageSource, /buildReadableSettlementReport/);
  assert.match(pageSource, /buildSettlementReportPreviewModel/);
  assert.match(pageSource, /deriveRoleCapabilities/);
  assert.match(pageSource, /hasCapability\(capabilities, 'canImportExport'\)/);
  assert.match(pageSource, /hasCapability\(capabilities, 'canViewOwnerFinance'\)/);
});

runTest('factual reader keeps per-metric reliability and actionable record issues', () => {
  for (const pattern of [/reading\.estimatedProfit/, /reading\.issues/, /report\.productRows/,
    /reading\.revenueUsable/, /reading\.highlights/, /依目前商品成本估算，非成交當時成本/]) {
    assert.match(readerSource, pattern);
  }
  assert.doesNotMatch(readerSource,/report\.decision\.scoreComponents|report\.marketDecisions|preview\.header\.showFormalScores/);
});

runTest('independent route now renders a complete reader inside Suspense', () => {
  assert.match(routeSource, /Suspense/);
  assert.match(routeSource, /SettlementReportScreen/);
  assert.match(pageSource, /<SettlementReportReader/);
  assert.match(readerSource, /完整結算報告/);
});

runTest('preview UI reads only local IndexedDB data and does not write or sync', () => {
  assert.match(pageSource, /useLiveQuery/);
  assert.match(pageSource, /db\.markets\s*\.where\('owner_id'\)\s*\.equals\(user\.id\)/);
  assert.match(pageSource, /db\.products\.where\('owner_id'\)\.equals\(user\.id\)/);
  assert.match(pageSource, /db\.dailyStats/);
  assert.match(pageSource, /\.where\('marketId'\)\s*\.anyOf\(marketIds\)/);
  assert.doesNotMatch(pageSource, /db\.(markets|products|dailyStats|events)\.(add|put|update|delete|clear|bulkAdd|bulkPut|bulkDelete)/);
  assert.doesNotMatch(
    pageImports,
    /from ['"](?:@\/lib\/sync|@\/lib\/db\/events|@\/lib\/db\/recovery|@\/lib\/supabase\/client|@supabase\/supabase-js|[^'"]*(?:xlsx|csv|download))/i
  );
});

runTest('reader separates five chapters and adapts cards to comparison tables', () => {
  for (const id of ['overview','markets','products','costs','quality']) assert.ok(readerSource.includes(`id="${id}"`));
  assert.match(readerSource, /md:hidden/);
  assert.match(readerSource, /hidden md:block/);
  assert.match(readerSource, /<table/);
  assert.match(pageSource, /readReportPeriod/);
  assert.match(pageSource, /isReportDataLoading/);
});

runTest('preview UI connects approved PDF generation only through the paid capability gate', () => {
  assert.match(pageSource, /SETTLEMENT_PDF_RUNTIME_ENABLED/);
  assert.match(pageSource, /feature: 'settlementPdf'/);
  assert.match(pageSource, /settlementView\.canBuildPdfViewModel/);
  assert.match(pageSource, /buildSettlementReportPdfViewModel/);
  assert.match(pageSource, /SettlementReportPdfPreviewButton/);
  assert.match(readerSource, /匯出 PDF（選用）/);
  assert.match(readerSource, /<details><summary/);
  assert.match(readerSource, /exportActions/);
  assert.doesNotMatch(pageSource, /Excel|CSV|download/);
  assert.doesNotMatch(pageSource, /<a\s+[^>]*download|download=/i);
});

runTest('preview UI intersects owner permission with authoritative report capabilities', () => {
  assert.match(pageSource, /useRoleContext\(\)/);
  assert.match(pageSource, /const isRoleReady = roleRefreshState\.stage === ['"]ready['"]/);
  assert.match(pageSource, /isOwner:\s*isRoleReady && roleRefreshState\.permissions\.isOwner/);
  assert.match(pageSource, /const hasOwnerReportRole =\s*isRoleReady &&[\s\S]*hasCapability\(capabilities, 'canImportExport'\)[\s\S]*hasCapability\(capabilities, 'canViewOwnerFinance'\)/);
  assert.match(pageSource, /useAccountCapabilities/);
  assert.match(pageSource, /feature: 'settlementReportPreview'/);
  assert.match(pageSource, /settlementView\.canReadProducts/);
  assert.match(pageSource, /settlementView\.canBuildFullReport/);
});

runTest('analytics page exposes owner-only entry without changing bottom navigation', () => {
  assert.match(analyticsPageSource, /href="\/reports\/settlement"/);
  assert.match(analyticsPageSource, /查看完整報告/);
  assert.match(analyticsPageSource, /!\s*isStaff\s*&&\s*!\s*isRoleLoading\s*&&\s*!\s*roleError/);
});

runTest('full test suite includes settlement report preview UI guardrail', () => {
  assert.match(testManifestSource, /tsx tests\/settlement-report-preview-ui\.test\.ts/);
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
