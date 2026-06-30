import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const planSource = readFileSync(
  join(projectRoot, 'docs/ANALYTICS_SHARED_INSIGHT_CORE_PLAN_2026_06_30.md'),
  'utf8'
);
const settlementPlanSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_MODEL_PLAN_2026_06_30.md'),
  'utf8'
);
const distortionPlanSource = readFileSync(
  join(projectRoot, 'docs/SETTLEMENT_REPORT_DISTORTION_RISK_PLAN_2026_06_30.md'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Analytics shared insight core plan ===');

runTest('plan exists as deferred implementation after settlement report original task', () => {
  assert.match(planSource, /# Analytics Shared Insight Core Plan/);
  assert.match(planSource, /Status: deferred implementation plan/);
  assert.match(planSource, /Trigger: remind the user to implement this after the current settlement report original task is completed/);
  assert.match(planSource, /settlement report preview\/spec work/);
  assert.match(planSource, /Do not implement this plan before that reminder/);
});

runTest('plan defines shared extraction without turning analytics into settlement report', () => {
  assert.match(planSource, /The goal is to share the reliability layer/);
  assert.match(planSource, /not to force the analytics page to become a settlement report/);
  assert.match(planSource, /lib\/analytics\/insight-quality\.ts/);
  assert.match(planSource, /signal status/);
  assert.match(planSource, /confidence/);
  assert.match(planSource, /limitation code taxonomy/);
  assert.match(planSource, /projection mismatch detection/);
  assert.match(planSource, /manual\/simple entry dominance detection/);
});

runTest('plan keeps report-specific behavior inside settlement report', () => {
  assert.match(planSource, /Keep these in `lib\/reporting\/settlement-report\.ts`/);
  assert.match(planSource, /weekly\/monthly settlement report period model/);
  assert.match(planSource, /owner-only settlement report permission guard/);
  assert.match(planSource, /market rejoin recommendation/);
  assert.match(planSource, /PDF-oriented content model/);
  assert.match(planSource, /The analytics page should not import report cover text/);
});

runTest('plan requires equivalence and blocks runtime expansion', () => {
  assert.match(planSource, /existing settlement report totals do not change/);
  assert.match(planSource, /existing score results do not change unless explicitly approved/);
  assert.match(planSource, /existing owner-only guard remains in settlement report/);
  assert.match(planSource, /no PDF, Excel, CSV, UI, Supabase, IndexedDB, recovery, or sync import is introduced/);
  assert.match(planSource, /Stop for approval before:[\s\S]*editing `app\/analytics\/page\.tsx`/);
  assert.match(planSource, /Stop for approval before:[\s\S]*replacing analytics calculations/);
  assert.match(planSource, /Stop for approval before:[\s\S]*adding Supabase or IndexedDB reads/);
});

runTest('settlement report plans remain the current original task before shared analytics extraction', () => {
  assert.match(settlementPlanSource, /Settlement reports are the primary reporting experience/);
  assert.match(settlementPlanSource, /This plan does not approve PDF generation/);
  assert.match(distortionPlanSource, /The future Report Preview Spec must include visible UI states/);
  assert.match(distortionPlanSource, /Stop for approval before:[\s\S]*adding report preview UI/);
});

runTest('full test suite includes analytics shared insight core plan guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/analytics-shared-insight-core-plan\.test\.ts/);
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
    throw new Error(`${failed} analytics shared insight core plan tests failed`);
  }
}

main();
