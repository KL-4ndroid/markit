import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const pageSource = readFileSync(join(projectRoot, 'app/reports/settlement/page.tsx'), 'utf8');
const analyticsPageSource = readFileSync(join(projectRoot, 'app/analytics/page.tsx'), 'utf8');
const previewSpecSource = readFileSync(join(projectRoot, 'docs/SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30.md'), 'utf8');
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
  assert.match(pageSource, /Settlement report preview is owner-only|結算報告預覽僅限 owner 使用/);
});

runTest('formal preview UI exposes report-quality sections for owner decision making', () => {
  for (const label of [
    '品牌經營結算報告',
    '月結報告',
    '週結報告',
    '本期總評分',
    '平均客單價',
    '資料可靠度',
    '評分拆解',
    '市集表現',
    '商品表現',
    '成本與利潤',
    '下一步行動',
  ]) {
    assert.match(pageSource, new RegExp(label));
  }

  assert.match(pageSource, /recommendationLabel\(preview\.executiveSummary\.recommendation\)/);
  assert.match(pageSource, /preview\.topWarnings/);
  assert.match(pageSource, /preview\.reliability\.limitations/);
  assert.match(pageSource, /report\.decision\.scoreComponents/);
  assert.match(pageSource, /report\.marketDecisions/);
  assert.match(pageSource, /report\.productRows/);
  assert.match(pageSource, /preview\.nextActions/);
});

runTest('preview UI reads only local IndexedDB data and does not write or sync', () => {
  assert.match(pageSource, /useLiveQuery/);
  assert.match(pageSource, /db\.markets\.toArray/);
  assert.match(pageSource, /db\.products\.toArray/);
  assert.match(pageSource, /db\.dailyStats/);
  assert.doesNotMatch(pageSource, /db\.(markets|products|dailyStats|events)\.(add|put|update|delete|clear|bulkAdd|bulkPut|bulkDelete)/);
  assert.doesNotMatch(
    pageImports,
    /from ['"](?:@\/lib\/sync|@\/lib\/db\/events|@\/lib\/db\/recovery|@\/lib\/supabase\/client|@supabase\/supabase-js|[^'"]*(?:pdf|xlsx|csv|download))/i
  );
});

runTest('preview UI does not expose PDF Excel CSV or download actions', () => {
  assert.doesNotMatch(pageSource, /PDF|Excel|CSV|download|下載|匯出/);
  assert.doesNotMatch(pageSource, /<a\s+[^>]*download|download=/i);
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
