import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildInsightQualityModel } from '../lib/analytics/insight-quality-model';
import { deriveRoleCapabilities } from '../lib/permissions/role-capabilities';
import {
  buildSettlementReportModel,
  type SettlementReportDataQuality,
  type SettlementReportModel,
} from '../lib/reporting/settlement-report';
import type { DailyStats, Market, Product } from '../types/db';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const settlementReportSource = readFileSync(join(projectRoot, 'lib/reporting/settlement-report.ts'), 'utf8');
const designSource = readFileSync(
  join(projectRoot, 'docs/ANALYTICS_SHARED_INSIGHT_QUALITY_MODEL_DESIGN_2026_06_30.md'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const timestamp = new Date('2026-06-30T10:00:00+08:00').getTime();

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function ownerCapabilities() {
  return deriveRoleCapabilities({ isOwner: true, staffRole: null });
}

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.max(0, Math.min(1, numerator / denominator)) : 0;
}

function market(overrides: Partial<Market> = {}): Market {
  return {
    id: 'market-1',
    name: 'Weekend Market',
    location: 'Taipei',
    startDate: '2026-06-01',
    endDate: '2026-06-02',
    status: 'completed',
    registrationFee: 300,
    boothCost: 1000,
    tableRental: 200,
    chairRental: 100,
    umbrellaRental: 0,
    tableclothRental: 0,
    commissionRate: 5,
    totalRevenue: 0,
    totalProfit: 0,
    totalInteractions: 0,
    totalDeals: 0,
    sync_status: 'synced',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function dailyStat(overrides: Partial<DailyStats> = {}): DailyStats {
  return {
    id: 1,
    date: '2026-06-01',
    marketId: 'market-1',
    touchCount: 8,
    inquiryCount: 4,
    dealCount: 5,
    revenue: 5000,
    cost: 2000,
    profit: 3000,
    productsSold: [{ productId: 'product-1', quantity: 10, revenue: 3000 }],
    updatedAt: timestamp,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: 'Signature Tea',
    category: 'food',
    price: 300,
    cost: 120,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function buildQualityModelFromSettlementReport(report: SettlementReportModel) {
  const dataQuality: SettlementReportDataQuality = report.dataQuality;
  const dailyStatsCoverage = ratio(
    report.activity.includedMarketCount - dataQuality.marketsWithoutDailyStats.length,
    report.activity.includedMarketCount
  );

  return buildInsightQualityModel({
    limitations: dataQuality.limitations,
    confidenceComponents: [
      {
        key: 'daily_stats_coverage',
        label: 'Daily stats coverage',
        weight: 30,
        score: dailyStatsCoverage,
        status: dailyStatsCoverage >= 0.75 ? 'available' : dailyStatsCoverage > 0 ? 'limited' : 'unavailable',
        reason: 'Matches settlement report daily-stats confidence contribution.',
      },
      {
        key: 'cost_coverage',
        label: 'Cost coverage',
        weight: 25,
        score: dataQuality.costCoverageRatio,
        status: dataQuality.costCoverageRatio >= 0.75 ? 'available' : dataQuality.costCoverageRatio > 0 ? 'limited' : 'unavailable',
        reason: 'Matches settlement report cost confidence contribution.',
      },
      {
        key: 'product_detail_coverage',
        label: 'Product detail coverage',
        weight: 20,
        score: dataQuality.productDetailCoverageRatio,
        status: dataQuality.productDetailCoverageRatio >= 0.75 ? 'available' : dataQuality.productDetailCoverageRatio > 0 ? 'limited' : 'unavailable',
        reason: 'Matches settlement report product-detail confidence contribution.',
      },
      {
        key: 'interaction_coverage',
        label: 'Interaction coverage',
        weight: 15,
        score: dataQuality.interactionCoverageRatio,
        status: dataQuality.interactionCoverageRatio >= 0.75 ? 'available' : dataQuality.interactionCoverageRatio > 0 ? 'limited' : 'unavailable',
        reason: 'Matches settlement report interaction confidence contribution.',
      },
      {
        key: 'sync_coverage',
        label: 'Sync coverage',
        weight: 10,
        score: dataQuality.syncCoverageRatio,
        status: dataQuality.syncCoverageRatio >= 0.75 ? 'available' : dataQuality.syncCoverageRatio > 0 ? 'limited' : 'unavailable',
        reason: 'Matches settlement report sync confidence contribution.',
      },
    ],
  });
}

function assertQualityEquivalence(report: SettlementReportModel): void {
  const quality = buildQualityModelFromSettlementReport(report);

  assert.equal(quality.confidence, report.dataQuality.confidence);
  assert.deepEqual(quality.limitations, report.dataQuality.limitations);
  assert.deepEqual(quality.nextActions, Array.from(new Set(report.content.dataActions)));
  assert.equal(quality.warningCount, report.dataQuality.limitations.filter(limitation => limitation.severity === 'warning').length);
  assert.equal(quality.infoCount, report.dataQuality.limitations.filter(limitation => limitation.severity === 'info').length);
}

console.log('\n=== Settlement report insight quality equivalence ===');

runTest('shared quality model matches mixed settlement report data-quality output', () => {
  const report = buildSettlementReportModel({
    capabilities: ownerCapabilities(),
    period: {
      kind: 'weekly',
      startDate: '2026-06-01',
      endDate: '2026-06-07',
      label: '2026-W23',
    },
    markets: [
      market(),
      market({
        id: 'market-2',
        name: 'Second Market',
        startDate: '2026-06-03',
        endDate: '2026-06-03',
        registrationFee: 100,
        boothCost: 500,
        tableRental: 0,
        chairRental: 0,
        commissionRate: 0,
        sync_status: 'local_only',
      }),
    ],
    dailyStats: [
      dailyStat(),
      dailyStat({
        id: 2,
        date: '2026-06-02',
        revenue: 1000,
        cost: 400,
        profit: 600,
        dealCount: 2,
        touchCount: 3,
        inquiryCount: 1,
        productsSold: [{ productId: 'product-2', quantity: 2, revenue: 1000 }],
      }),
    ],
    products: [product()],
  });

  assertQualityEquivalence(report);
  const quality = buildQualityModelFromSettlementReport(report);
  assert.equal(quality.sectionAvailability.product_ranking, 'unavailable');
  assert.equal(quality.sectionAvailability.conversion, 'limited');
  assert.equal(quality.sectionAvailability.data_quality, 'limited');
  assert.equal(quality.isFinalReady, false);
});

runTest('shared quality model marks simple revenue report sections consistently', () => {
  const report = buildSettlementReportModel({
    capabilities: ownerCapabilities(),
    period: {
      kind: 'weekly',
      startDate: '2026-06-01',
      endDate: '2026-06-07',
      label: '2026-W23',
    },
    markets: [market({ tableRental: 0, chairRental: 0, commissionRate: 0 })],
    dailyStats: [
      dailyStat({
        cost: 0,
        profit: 5000,
        productsSold: [],
      }),
    ],
  });

  assertQualityEquivalence(report);
  const quality = buildQualityModelFromSettlementReport(report);
  assert.equal(quality.sectionAvailability.profit, 'limited');
  assert.equal(quality.sectionAvailability.product_ranking, 'unavailable');
  assert.equal(quality.sectionAvailability.product_actions, 'unavailable');
  assert.equal(quality.sectionAvailability.conversion, 'available');
  assert.equal(quality.confidence, 'medium');
});

runTest('shared quality model captures distortion-risk warnings from settlement report', () => {
  const report = buildSettlementReportModel({
    capabilities: ownerCapabilities(),
    generatedAtDate: '2026-06-02',
    period: {
      kind: 'weekly',
      startDate: '2026-06-01',
      endDate: '2026-06-07',
      label: '2026-W23',
    },
    markets: [
      market({
        id: 'market-partial',
        name: 'Partial Market',
        startDate: '2026-05-31',
        endDate: '2026-06-02',
        registrationFee: 0,
        boothCost: 0,
        tableRental: 0,
        chairRental: 0,
        commissionRate: 0,
        totalRevenue: 500,
        totalDeals: 2,
      }),
      market({
        id: 'market-cancelled',
        name: 'Cancelled Market',
        status: 'cancelled',
      }),
      market({
        id: 'market-ongoing',
        name: 'Ongoing Market',
        startDate: '2026-06-04',
        endDate: '2026-06-05',
        status: 'ongoing',
        registrationFee: 0,
        boothCost: 0,
        tableRental: 0,
        chairRental: 0,
        commissionRate: 0,
      }),
    ],
    dailyStats: [
      dailyStat({
        id: 11,
        marketId: 'market-partial',
        date: '2026-06-01',
        revenue: 1000,
        cost: 0,
        profit: 1000,
        dealCount: 3,
        productsSold: [],
      }),
      dailyStat({
        id: 12,
        marketId: 'market-partial',
        date: '2026-06-01',
        revenue: 1000,
        cost: 0,
        profit: 1000,
        dealCount: 3,
        productsSold: [],
      }),
      dailyStat({
        id: 13,
        marketId: 'market-ongoing',
        date: '2026-06-04',
        revenue: 2_000_001,
        cost: 100,
        profit: 2_000_000,
        dealCount: 2,
        productsSold: [{ productId: 'product-1', quantity: 1, revenue: 500 }],
      }),
    ],
    products: [product({ cost: 50 })],
  });

  assertQualityEquivalence(report);
  const quality = buildQualityModelFromSettlementReport(report);
  assert.equal(quality.sectionAvailability.overall_score, 'limited');
  assert.equal(quality.sectionAvailability.profit, 'limited');
  assert.equal(quality.sectionAvailability.market_rejoin, 'limited');
  assert.equal(quality.sectionAvailability.product_ranking, 'unavailable');
  assert.equal(quality.sectionAvailability.data_quality, 'limited');
  assert.equal(quality.isFinalReady, false);
});

runTest('equivalence preparation does not wire shared model into settlement runtime yet', () => {
  assert.match(designSource, /settlement-report equivalence preparation/);
  assert.match(designSource, /`buildSettlementReportModel\(\)` is not changed in this slice/);
  assert.doesNotMatch(settlementReportSource, /buildInsightQualityModel|insight-quality-model/);
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-insight-quality-equivalence\.test\.ts/);
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
    throw new Error(`${failed} settlement report insight quality equivalence tests failed`);
  }
}

main();
