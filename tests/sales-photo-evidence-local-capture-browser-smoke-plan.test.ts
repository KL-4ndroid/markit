import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

const smokePlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_LOCAL_CAPTURE_BROWSER_SMOKE_PLAN.md');
const executionPlanSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as {
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Sales photo evidence local capture browser smoke plan ===');

runTest('browser smoke plan is manual local-only and temporary-profile scoped', () => {
  assert.match(smokePlanSource, /plan-only guardrail/);
  assert.match(smokePlanSource, /temporary browser profile only/);
  assert.match(smokePlanSource, /daily-use Chrome profile/);
  assert.match(smokePlanSource, /local IndexedDB inspection only/);
  assert.match(smokePlanSource, /database: `MarketPulseDB`/);
  assert.match(smokePlanSource, /table: `salesPhotoEvidencePendingPayloads`/);
});

runTest('browser smoke plan blocks cloud upload signed reads drain and recovery mutation', () => {
  assert.match(smokePlanSource, /Supabase writes/);
  assert.match(smokePlanSource, /R2 upload/);
  assert.match(smokePlanSource, /signed URL requests/);
  assert.match(smokePlanSource, /evidence row creation/);
  assert.match(smokePlanSource, /queue drain or retry worker/);
  assert.match(smokePlanSource, /cleanup\/recovery executor/);
  assert.match(smokePlanSource, /If any cloud write or upload happens, treat it as a scope violation/);
});

runTest('browser smoke plan verifies staff local capture behavior without installing automation', () => {
  assert.match(smokePlanSource, /staff market detail pending evidence dialog/);
  assert.match(smokePlanSource, /Eligible staff-owned row enables the action/);
  assert.match(smokePlanSource, /Non-owned staff row stays disabled/);
  assert.match(smokePlanSource, /Cancelled selection keeps the row pending/);
  assert.match(smokePlanSource, /Successful selection creates exactly one local pending payload/);
  assert.match(smokePlanSource, /Automated browser smoke testing can be added later only after a separate decision/);
});

runTest('execution plan records Slice 6I as low-risk plan-only smoke scope', () => {
  assert.match(executionPlanSource, /Slice 6I Status/);
  assert.match(executionPlanSource, /browser temporary-profile smoke plan/);
  assert.match(executionPlanSource, /does not add Playwright, Puppeteer, browser automation, package script wiring, Supabase writes, R2 upload, signed reads, evidence row creation, queue drain, cleanup, or recovery execution/);
});

runTest('package test includes guardrail but package dependencies do not add browser automation', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-local-capture-browser-smoke-plan\.test\.ts/);

  const dependencyNames = [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ];

  assert.deepEqual(
    dependencyNames.filter(name => /playwright|puppeteer|selenium|cypress/i.test(name)),
    []
  );

  for (const [name, command] of Object.entries(packageJson.scripts)) {
    if (name === 'test') continue;
    assert.doesNotMatch(`${name} ${command}`, /sales-photo-evidence-local-capture-browser-smoke|playwright|puppeteer/i);
  }
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
    throw new Error(`${failed} sales photo evidence local capture browser smoke plan tests failed`);
  }
}

main();
