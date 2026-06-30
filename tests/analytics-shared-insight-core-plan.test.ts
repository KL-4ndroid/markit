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
const insightQualitySource = readFileSync(
  join(projectRoot, 'lib/analytics/insight-quality.ts'),
  'utf8'
);
const settlementReportSource = readFileSync(
  join(projectRoot, 'lib/reporting/settlement-report.ts'),
  'utf8'
);
const insightQualityModelSource = readFileSync(
  join(projectRoot, 'lib/analytics/insight-quality-model.ts'),
  'utf8'
);
const insightQualityModelDesignSource = readFileSync(
  join(projectRoot, 'docs/ANALYTICS_SHARED_INSIGHT_QUALITY_MODEL_DESIGN_2026_06_30.md'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Analytics shared insight core plan ===');

runTest('plan records Slice D design and model tests without adoption', () => {
  assert.match(planSource, /# Analytics Shared Insight Core Plan/);
  assert.match(planSource, /Status: Slice D equivalence preparation completed; adoption remains deferred/);
  assert.match(planSource, /Trigger: remind the user to implement this after the current settlement report original task is completed/);
  assert.match(planSource, /settlement report preview\/spec work/);
  assert.match(planSource, /Slice B: Pure Type Extraction[\s\S]*Status: completed as pure type extraction/);
  assert.match(planSource, /Slice C: Pure Helper Extraction[\s\S]*Status: completed as pure helper extraction/);
  assert.match(planSource, /Slice D: Shared Insight Quality Model[\s\S]*Status: design, pure model tests, and settlement-report equivalence preparation completed; settlement report adoption remains deferred/);
  assert.match(planSource, /lib\/analytics\/insight-quality\.ts/);
  assert.match(planSource, /tests\/analytics-insight-quality\.test\.ts/);
  assert.match(planSource, /lib\/analytics\/insight-quality-model\.ts/);
  assert.match(planSource, /tests\/analytics-insight-quality-model\.test\.ts/);
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

runTest('shared insight quality module contains pure exported types and helpers', () => {
  assert.match(insightQualitySource, /export type InsightSignalStatus = 'available' \| 'limited' \| 'unavailable'/);
  assert.match(insightQualitySource, /export type InsightConfidence = 'high' \| 'medium' \| 'low'/);
  assert.match(insightQualitySource, /export type InsightLimitationSeverity = 'info' \| 'warning'/);
  assert.match(insightQualitySource, /export type InsightLimitationCode =/);
  assert.match(insightQualitySource, /export type InsightAffectedSection =/);
  assert.match(insightQualitySource, /export type InsightLimitation =/);
  assert.match(insightQualitySource, /export function finiteInsightNumber/);
  assert.match(insightQualitySource, /export function ratioInsightNumbers/);
  assert.match(insightQualitySource, /export function isInactiveInsightMarket/);
  assert.match(insightQualitySource, /export function hasOutlierDailyStatValues/);
  assert.match(insightQualitySource, /export function hasMarketProjectionMismatch/);
  assert.match(insightQualitySource, /export function isPartialPeriodInsightMarket/);
  assert.doesNotMatch(insightQualitySource, /from ['"]react|use[A-Z]|@\/lib\/db|Dexie|db\.|supabase|window\.|document\.|pdf|xlsx|csv/i);
});

runTest('settlement report aliases shared types without renaming public report types', () => {
  assert.match(settlementReportSource, /from '@\/lib\/analytics\/insight-quality'/);
  assert.match(settlementReportSource, /export type SettlementReportConfidence = InsightConfidence/);
  assert.match(settlementReportSource, /export type SettlementReportSignalStatus = InsightSignalStatus/);
  assert.match(settlementReportSource, /export type SettlementReportLimitationCode = InsightLimitationCode/);
  assert.match(settlementReportSource, /export type SettlementReportLimitation = InsightLimitation/);
  assert.match(settlementReportSource, /finiteInsightNumber as finiteNumber/);
  assert.match(settlementReportSource, /hasMarketProjectionMismatch as hasProjectionMismatch/);
  assert.match(settlementReportSource, /hasOutlierDailyStatValues as hasOutlierValues/);
});

runTest('shared insight quality model is documented but not adopted by runtime yet', () => {
  assert.match(insightQualityModelSource, /export function buildInsightQualityModel/);
  assert.match(insightQualityModelSource, /InsightQualityModel/);
  assert.match(insightQualityModelDesignSource, /Status: design, pure model tests, and settlement-report equivalence preparation completed/);
  assert.match(insightQualityModelDesignSource, /does not approve settlement report adoption/);
  assert.match(insightQualityModelDesignSource, /Completed safe slice: settlement-report equivalence preparation/);
  assert.match(insightQualityModelDesignSource, /Next safe slice:[\s\S]*wire settlement report to consume `buildInsightQualityModel\(\)` only if equivalence remains green/);
  assert.doesNotMatch(settlementReportSource, /buildInsightQualityModel|insight-quality-model/);
  assert.doesNotMatch(insightQualityModelSource, /from ['"]react|use[A-Z]|@\/lib\/db|Dexie|db\.|supabase|window\.|document\.|pdf|xlsx|csv|recovery|sync/i);
});

runTest('settlement report plans remain the current original task before shared analytics extraction', () => {
  assert.match(settlementPlanSource, /Settlement reports are the primary reporting experience/);
  assert.match(settlementPlanSource, /This plan does not approve PDF generation/);
  assert.match(distortionPlanSource, /Completed follow-up:[\s\S]*SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30/);
  assert.match(distortionPlanSource, /The Report Preview Spec includes visible UI states/);
  assert.match(distortionPlanSource, /Stop for approval before:[\s\S]*adding report preview UI/);
});

runTest('full test suite includes analytics shared insight core plan guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/analytics-shared-insight-core-plan\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/analytics-insight-quality\.test\.ts/);
  assert.match(packageJson.scripts.test, /tsx tests\/analytics-insight-quality-model\.test\.ts/);
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
