import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const technicalPlanSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_PDF_TECHNICAL_PLAN_2026_07_01.md'),
  'utf8'
);
const presentationPlanSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_PRESENTATION_PLAN_2026_07_01.md'),
  'utf8'
);
const packageJsonSource = readFileSync(join(projectRoot, 'package.json'), 'utf8');
const packageJson = JSON.parse(packageJsonSource) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Settlement report PDF technical plan ===');

runTest('technical plan exists and remains non-runtime', () => {
  assert.match(technicalPlanSource, /# Settlement Report PDF Technical Plan/);
  assert.match(technicalPlanSource, /Status: technical decision completed; PDF implementation remains deferred/);
  assert.match(technicalPlanSource, /This document does not approve installing a PDF library/);
  assert.match(technicalPlanSource, /does not approve[\s\S]*generating PDFs/);
  assert.match(technicalPlanSource, /does not approve[\s\S]*adding download buttons/);
  assert.match(technicalPlanSource, /does not approve[\s\S]*Supabase reads/);
});

runTest('technical plan recommends client-side react-pdf first', () => {
  assert.match(technicalPlanSource, /Use client-side `@react-pdf\/renderer` for the first implementation slice/);
  assert.match(technicalPlanSource, /avoids sending owner finance, booth cost, product cost, or profit data to a server route/);
  assert.match(technicalPlanSource, /Decision: recommended for first implementation/);
  assert.match(technicalPlanSource, /Server-Side HTML-To-PDF[\s\S]*Decision: defer/);
  assert.match(technicalPlanSource, /Browser Print Dialog[\s\S]*not recommended/);
});

runTest('technical plan defines privacy and data boundaries', () => {
  assert.match(technicalPlanSource, /First implementation should be browser-only/);
  assert.match(technicalPlanSource, /Blocked:[\s\S]*posting full owner financial report data to Supabase/);
  assert.match(technicalPlanSource, /Blocked:[\s\S]*posting full owner financial report data to a server route/);
  assert.match(technicalPlanSource, /no direct Supabase query inside PDF template code/);
  assert.match(technicalPlanSource, /no sync, repair, projection rebuild, or pending-operation action/);
});

runTest('technical plan defines Traditional Chinese font and pagination strategy', () => {
  assert.match(technicalPlanSource, /Traditional Chinese must be handled with bundled local font files/);
  assert.match(technicalPlanSource, /static TTF or WOFF files, not variable fonts/);
  assert.match(technicalPlanSource, /avoid remote Google Fonts/);
  assert.match(technicalPlanSource, /Use fixed A4 pages for version one/);
  assert.match(technicalPlanSource, /no text should overlap or be clipped/);
});

runTest('technical plan defines owner-only export guardrails and staged implementation', () => {
  assert.match(technicalPlanSource, /PDF export remains owner-only/);
  assert.match(technicalPlanSource, /hasCapability\(capabilities, 'canImportExport'\)/);
  assert.match(technicalPlanSource, /hasCapability\(capabilities, 'canViewOwnerFinance'\)/);
  assert.match(technicalPlanSource, /Slice H: PDF View Model/);
  assert.match(technicalPlanSource, /Slice J: Install PDF Library[\s\S]*Requires approval/);
  assert.match(technicalPlanSource, /Slice L: Owner-Only Download UI[\s\S]*Higher risk/);
});

runTest('technical plan does not install PDF dependencies yet', () => {
  assert.equal(packageJson.dependencies?.['@react-pdf/renderer'], undefined);
  assert.equal(packageJson.devDependencies?.['@react-pdf/renderer'], undefined);
  assert.equal(packageJson.dependencies?.puppeteer, undefined);
  assert.equal(packageJson.devDependencies?.puppeteer, undefined);
  assert.equal(packageJson.dependencies?.playwright, undefined);
  assert.equal(packageJson.devDependencies?.playwright, undefined);
});

runTest('presentation plan records technical plan completion', () => {
  assert.match(presentationPlanSource, /Slice G: PDF Technical Plan[\s\S]*Status: completed/);
  assert.match(presentationPlanSource, /docs\/SETTLEMENT_REPORT_PDF_TECHNICAL_PLAN_2026_07_01\.md/);
  assert.match(presentationPlanSource, /tests\/settlement-report-pdf-technical-plan\.test\.ts/);
});

runTest('full test suite includes PDF technical plan guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-pdf-technical-plan\.test\.ts/);
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
    throw new Error(`${failed} settlement report PDF technical plan tests failed`);
  }
}

main();
