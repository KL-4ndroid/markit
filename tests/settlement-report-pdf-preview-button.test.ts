import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const buttonSource = readFileSync(
  join(projectRoot, 'components/reports/settlement/SettlementReportPdfPreviewButton.tsx'),
  'utf8'
);
const pageSource = readFileSync(join(projectRoot, 'app/reports/settlement/page.tsx'), 'utf8');
const documentSource = readFileSync(
  join(projectRoot, 'components/reports/settlement/SettlementReportPdfDocument.tsx'),
  'utf8'
);
const technicalPlanSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_PDF_TECHNICAL_PLAN_2026_07_01.md'),
  'utf8'
);
const presentationPlanSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_PRESENTATION_PLAN_2026_07_01.md'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Settlement report PDF preview button ===');

runTest('browser preview shell is client-only and uses react-pdf blob generation', () => {
  assert.match(buttonSource, /^'use client';/);
  assert.match(buttonSource, /import \{ pdf \} from '@react-pdf\/renderer'/);
  assert.match(buttonSource, /\.toBlob\(\)/);
  assert.match(buttonSource, /URL\.createObjectURL\(blob\)/);
  assert.match(buttonSource, /window\.open\(url, '_blank'\)/);
  assert.match(buttonSource, /openedWindow\.opener = null/);
  assert.match(buttonSource, /URL\.revokeObjectURL\(url\)/);
});

runTest('browser preview shell is guarded by owner preview permission and nullable view model', () => {
  assert.match(buttonSource, /viewModel: SettlementReportPdfViewModel \| null/);
  assert.match(buttonSource, /canPreview: boolean/);
  assert.match(buttonSource, /const isDisabled = !canPreview \|\| !viewModel \|\| isOpening/);
  assert.match(buttonSource, /if \(!canPreview \|\| !viewModel \|\| isOpening\) return/);
  assert.match(buttonSource, /if \(!canPreview\) return null/);
});

runTest('browser preview shell does not add custom download UI or data access', () => {
  assert.doesNotMatch(buttonSource, /PDFDownloadLink|BlobProvider|PDFViewer|renderToFile|renderToBuffer/);
  assert.doesNotMatch(buttonSource, /download=|<a\s/i);
  assert.doesNotMatch(buttonSource, /@\/lib\/db|@\/lib\/supabase|dexie|useLiveQuery|fetch\(/);
  assert.doesNotMatch(buttonSource, /localStorage|sessionStorage/);
});

runTest('settlement report page wires preview shell after existing owner-only guard', () => {
  assert.match(pageSource, /buildSettlementReportPdfViewModel/);
  assert.match(pageSource, /SettlementReportPdfPreviewButton/);
  assert.match(pageSource, /hasCapability\(capabilities, 'canImportExport'\)/);
  assert.match(pageSource, /hasCapability\(capabilities, 'canViewOwnerFinance'\)/);
  assert.match(pageSource, /const pdfViewModel = report \? buildSettlementReportPdfViewModel\(\{ report \}\) : null/);
  assert.match(pageSource, /<SettlementReportPdfPreviewButton viewModel=\{pdfViewModel\} canPreview=\{canPreview\} \/>/);
});

runTest('PDF document remains data-source free after browser shell wiring', () => {
  assert.doesNotMatch(documentSource, /@\/lib\/db|@\/lib\/supabase|dexie|useLiveQuery|fetch\(/);
  assert.doesNotMatch(documentSource, /PDFViewer|PDFDownloadLink|BlobProvider|usePDF|renderToFile/);
  assert.doesNotMatch(documentSource, /createObjectURL|window\.|document\.|download=/);
});

runTest('plans record owner-only browser preview shell without broadening export scope', () => {
  assert.match(technicalPlanSource, /Slice M: Owner-Only Browser PDF Preview UI[\s\S]*Status: completed/);
  assert.match(technicalPlanSource, /opens a generated blob URL in the browser PDF viewer/);
  assert.match(technicalPlanSource, /does not add a custom download button/);
  assert.match(presentationPlanSource, /Slice L: Owner-Only Browser PDF Preview Shell[\s\S]*Status: completed/);
  assert.match(presentationPlanSource, /No Supabase access, sync, recovery, server PDF generation, generated-PDF storage, or manager\/staff export/);
});

runTest('full test suite includes PDF preview button guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-pdf-preview-button\.test\.ts/);
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
    throw new Error(`${failed} settlement report PDF preview button tests failed`);
  }
}

main();
