import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildInsightQualityModel } from '../lib/analytics/insight-quality-model';
import type { InsightLimitation } from '../lib/analytics/insight-quality';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const modelSource = readFileSync(join(projectRoot, 'lib/analytics/insight-quality-model.ts'), 'utf8');
const designSource = readFileSync(
  join(projectRoot, 'docs/ANALYTICS_SHARED_INSIGHT_QUALITY_MODEL_DESIGN_2026_06_30.md'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function limitation(overrides: Partial<InsightLimitation> = {}): InsightLimitation {
  return {
    code: 'missing_cost_data',
    severity: 'warning',
    affectedSections: ['profit', 'market_rejoin'],
    message: 'Cost data is incomplete.',
    recommendation: 'Add cost data before relying on profit conclusions.',
    ...overrides,
  };
}

console.log('\n=== Analytics insight quality model ===');

runTest('builds high confidence ready model when no warnings are present', () => {
  const model = buildInsightQualityModel({
    limitations: [],
    confidenceComponents: [
      { key: 'coverage', label: 'Coverage', weight: 70, score: 0.9, status: 'available', reason: 'Strong coverage.' },
      { key: 'sync', label: 'Sync', weight: 30, score: 1, status: 'available', reason: 'Synced.' },
    ],
  });

  assert.equal(model.confidence, 'high');
  assert.equal(model.confidenceScore, 0.93);
  assert.equal(model.warningCount, 0);
  assert.equal(model.infoCount, 0);
  assert.equal(model.isFinalReady, true);
  assert.equal(model.sectionAvailability.profit, 'available');
  assert.deepEqual(model.nextActions, []);
});

runTest('downgrades affected sections and deduplicates next actions', () => {
  const model = buildInsightQualityModel({
    limitations: [
      limitation(),
      limitation({
        code: 'zero_or_missing_market_cost',
        severity: 'info',
        affectedSections: ['profit'],
        message: 'Market cost may be missing.',
      }),
      limitation({
        code: 'missing_interaction_data',
        severity: 'info',
        affectedSections: ['conversion'],
        message: 'Interaction data is incomplete.',
        recommendation: 'Add interaction records.',
      }),
    ],
    confidenceComponents: [
      { key: 'coverage', label: 'Coverage', weight: 1, score: 0.6, status: 'limited', reason: 'Some gaps.' },
    ],
  });

  assert.equal(model.confidence, 'medium');
  assert.equal(model.warningCount, 1);
  assert.equal(model.infoCount, 2);
  assert.equal(model.isFinalReady, false);
  assert.equal(model.sectionAvailability.profit, 'limited');
  assert.equal(model.sectionAvailability.market_rejoin, 'limited');
  assert.equal(model.sectionAvailability.conversion, 'limited');
  assert.equal(model.sectionAvailability.product_ranking, 'available');
  assert.deepEqual(model.nextActions, [
    'Add cost data before relying on profit conclusions.',
    'Add interaction records.',
  ]);
});

runTest('marks structural unavailable sections without hiding unrelated sections', () => {
  const model = buildInsightQualityModel({
    limitations: [
      limitation({
        code: 'no_markets_in_period',
        severity: 'warning',
        affectedSections: ['overall_score', 'market_rejoin', 'data_quality'],
        message: 'No eligible markets.',
        recommendation: 'Choose a period with completed markets.',
      }),
      limitation({
        code: 'missing_product_detail',
        severity: 'warning',
        affectedSections: ['product_ranking', 'product_actions'],
        message: 'No item-level sales.',
        recommendation: 'Record item-level sales for product ranking.',
      }),
    ],
    confidenceComponents: [
      { key: 'coverage', label: 'Coverage', weight: 1, score: 0.2, status: 'unavailable', reason: 'No eligible data.' },
    ],
  });

  assert.equal(model.confidence, 'low');
  assert.equal(model.sectionAvailability.overall_score, 'unavailable');
  assert.equal(model.sectionAvailability.market_rejoin, 'unavailable');
  assert.equal(model.sectionAvailability.data_quality, 'unavailable');
  assert.equal(model.sectionAvailability.product_ranking, 'unavailable');
  assert.equal(model.sectionAvailability.product_actions, 'unavailable');
  assert.equal(model.sectionAvailability.profit, 'available');
  assert.equal(model.isFinalReady, false);
});

runTest('clamps component scores and ignores zero-weight components', () => {
  const model = buildInsightQualityModel({
    limitations: [],
    confidenceComponents: [
      { key: 'too-high', label: 'Too high', weight: 1, score: 2, status: 'available', reason: 'Clamp high.' },
      { key: 'ignored', label: 'Ignored', weight: 0, score: 0, status: 'unavailable', reason: 'No weight.' },
    ],
  });

  assert.equal(model.confidenceScore, 1);
  assert.equal(model.confidence, 'high');
});

runTest('model and design stay pure and do not approve runtime adoption', () => {
  assert.match(designSource, /Status: design and pure model tests completed/);
  assert.match(designSource, /does not approve settlement report adoption/);
  assert.match(designSource, /does not approve[\s\S]*analytics page adoption/);
  assert.match(designSource, /does not approve[\s\S]*Supabase reads/);
  assert.match(designSource, /does not approve[\s\S]*IndexedDB reads/);
  assert.match(designSource, /The next safe slice is settlement-report equivalence preparation/);
  assert.doesNotMatch(modelSource, /from ['"]react|use[A-Z]|@\/lib\/db|Dexie|db\.|supabase|window\.|document\.|pdf|xlsx|csv|recovery|sync/i);
});

runTest('full test suite includes analytics insight quality model guardrail', () => {
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
    throw new Error(`${failed} analytics insight quality model tests failed`);
  }
}

main();
