import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const pdfVisualSpecSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_PDF_VISUAL_SPEC_2026_07_01.md'),
  'utf8'
);
const presentationPlanSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_PRESENTATION_PLAN_2026_07_01.md'),
  'utf8'
);
const previewSpecSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30.md'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Settlement report PDF visual spec ===');

runTest('visual spec exists and stays non-runtime', () => {
  assert.match(pdfVisualSpecSource, /# Settlement Report PDF Visual Specification/);
  assert.match(pdfVisualSpecSource, /Status: visual specification completed; PDF generation remains deferred/);
  assert.match(pdfVisualSpecSource, /This document does not approve PDF generation/);
  assert.match(pdfVisualSpecSource, /does not approve[\s\S]*PDF library selection/);
  assert.match(pdfVisualSpecSource, /does not approve[\s\S]*Supabase reads/);
  assert.match(pdfVisualSpecSource, /does not approve[\s\S]*sync\/recovery behavior/);
});

runTest('visual spec keeps preview and PDF sharing the same report truth', () => {
  assert.match(pdfVisualSpecSource, /buildSettlementReportModel\(\)/);
  assert.match(pdfVisualSpecSource, /SettlementReportModel\.decision/);
  assert.match(pdfVisualSpecSource, /SettlementReportModel\.dataQuality/);
  assert.match(pdfVisualSpecSource, /The PDF must not create different numbers/);
  assert.match(pdfVisualSpecSource, /The PDF layout may differ from the preview page/);
});

runTest('visual spec defines first-version PDF pages and content', () => {
  for (const heading of [
    /Page 1: Cover Summary/,
    /Page 2: Data Confidence And Score Explanation/,
    /Page 3: Market Performance/,
    /Page 4: Product Performance/,
    /Page 5: Cost, Profit, And Next Actions/,
  ]) {
    assert.match(pdfVisualSpecSource, heading);
  }

  for (const content of [
    /brand name/,
    /overall recommendation/,
    /overall score and grade/,
    /total revenue/,
    /net profit/,
    /market name/,
    /product name/,
    /cost coverage ratio/,
    /next actions/,
  ]) {
    assert.match(pdfVisualSpecSource, content);
  }
});

runTest('visual spec defines BoothBook-aligned visual and readability rules', () => {
  assert.match(pdfVisualSpecSource, /A4 portrait/);
  assert.match(pdfVisualSpecSource, /warm off-white/);
  assert.match(pdfVisualSpecSource, /quiet green/);
  assert.match(pdfVisualSpecSource, /muted amber/);
  assert.match(pdfVisualSpecSource, /muted red/);
  assert.match(pdfVisualSpecSource, /Traditional Chinese labels/);
  assert.match(pdfVisualSpecSource, /tabular numbers/);
  assert.match(pdfVisualSpecSource, /do not rely on color alone/);
});

runTest('visual spec makes data limitations visible in the PDF', () => {
  for (const code of [
    'missing_cost_data',
    'missing_product_detail',
    'missing_interaction_data',
    'unsynced_data',
    'projection_mismatch',
    'possible_duplicate_daily_stats',
    'outlier_values',
  ]) {
    assert.match(pdfVisualSpecSource, new RegExp(`\\\`${code}\\\``));
  }

  assert.match(pdfVisualSpecSource, /Warnings are first-class report content/);
  assert.match(pdfVisualSpecSource, /資料不足/);
  assert.match(pdfVisualSpecSource, /僅供方向參考/);
});

runTest('presentation and preview plans point to PDF visual spec before technical work', () => {
  assert.match(presentationPlanSource, /Slice F: PDF Visual Specification[\s\S]*Status: completed/);
  assert.match(presentationPlanSource, /docs\/SETTLEMENT_REPORT_PDF_VISUAL_SPEC_2026_07_01\.md/);
  assert.match(presentationPlanSource, /Slice G: PDF Technical Plan[\s\S]*Status: completed/);
  assert.match(presentationPlanSource, /No implementation is approved by this plan/);
  assert.match(previewSpecSource, /Future PDF Relationship/);
  assert.match(previewSpecSource, /Those decisions require a later PDF technical plan/);
});

runTest('full test suite includes PDF visual spec guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-pdf-visual-spec\.test\.ts/);
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
    throw new Error(`${failed} settlement report PDF visual spec tests failed`);
  }
}

main();
