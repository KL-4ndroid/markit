import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveRoleCapabilities } from '../lib/permissions/role-capabilities';
import { buildSettlementReportModel } from '../lib/reporting/settlement-report';
import type { DailyStats, Market, Product } from '../types/db';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const modelSource = readFileSync(join(projectRoot, 'lib/reporting/settlement-report.ts'), 'utf8');
const modelPlanSource = readFileSync(join(projectRoot, 'docs/SETTLEMENT_REPORT_MODEL_PLAN_2026_06_30.md'), 'utf8');
const distortionRiskPlanSource = readFileSync(join(projectRoot, 'docs/SETTLEMENT_REPORT_DISTORTION_RISK_PLAN_2026_06_30.md'), 'utf8');
const cloudPlanSource = readFileSync(join(projectRoot, 'docs/CLOUD_REBUILD_FIRST_RECOVERY_PLAN_2026_06_30.md'), 'utf8');
const highRiskPlanSource = readFileSync(join(projectRoot, 'docs/HIGH_RISK_SYNC_AND_DATA_EXECUTION_PLAN.md'), 'utf8');
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

console.log('\n=== Settlement report model ===');

runTest('builds owner weekly settlement report totals, rankings, and data quality', () => {
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

  assert.equal(report.period.kind, 'weekly');
  assert.equal(report.money.totalRevenue, 6000);
  assert.equal(report.money.productCost, 2400);
  assert.equal(report.money.grossProfit, 3600);
  assert.equal(report.money.fixedMarketCost, 2200);
  assert.equal(report.money.commissionFee, 300);
  assert.equal(report.money.netProfit, 1100);
  assert.equal(report.activity.totalDeals, 7);
  assert.equal(report.activity.totalInteractions, 16);
  assert.equal(report.activity.includedMarketCount, 2);
  assert.equal(report.activity.marketsWithSalesCount, 1);
  assert.equal(report.marketRows[0].marketId, 'market-1');
  assert.equal(report.marketRows[0].averageOrderValue, 6000 / 7);
  assert.equal(report.productRows[0].productName, 'Signature Tea');
  assert.equal(report.productRows[0].estimatedCost, 1200);
  assert.equal(report.productRows[0].estimatedGrossProfit, 1800);
  assert.equal(report.productRows[1].productName, 'product-2');
  assert.deepEqual(report.dataQuality.marketsWithoutDailyStats, ['market-2']);
  assert.deepEqual(report.dataQuality.missingProductNames, ['product-2']);
  assert.deepEqual(report.dataQuality.unsyncedMarketIds, ['market-2']);
  assert.equal(report.decision.overallScore > 0, true);
  assert.equal(report.decision.grade, 'B');
  assert.equal(report.decision.recommendation, 'rejoin');
  assert.equal(report.decision.confidence, 'medium');
  assert.equal(report.decision.analysisAvailability.profitAnalysis, 'available');
  assert.equal(report.decision.analysisAvailability.productAnalysis, 'limited');
  assert.equal(report.decision.analysisAvailability.conversionAnalysis, 'limited');
  assert.equal(report.marketDecisions[0].marketId, 'market-1');
  assert.equal(report.content.cover.title, '2026-W23 Settlement Report');
  assert.equal(report.content.marketActions.length > 0, true);
  assert.equal(
    report.dataQuality.limitations.some(limitation => limitation.code === 'missing_product_detail'),
    true
  );
  assert.equal(
    report.dataQuality.limitations.some(limitation => limitation.code === 'missing_interaction_data'),
    true
  );
  assert.equal(report.dataQuality.notes.length >= report.dataQuality.limitations.length, true);
});

runTest('monthly report filters markets and daily stats by period', () => {
  const report = buildSettlementReportModel({
    capabilities: ownerCapabilities(),
    period: {
      kind: 'monthly',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      label: '2026-06',
    },
    markets: [
      market(),
      market({
        id: 'market-may',
        name: 'May Market',
        startDate: '2026-05-01',
        endDate: '2026-05-02',
      }),
    ],
    dailyStats: [
      dailyStat(),
      dailyStat({
        id: 9,
        marketId: 'market-1',
        date: '2026-07-01',
        revenue: 9999,
        cost: 9999,
        profit: 9999,
      }),
      dailyStat({
        id: 10,
        marketId: 'market-may',
        date: '2026-05-01',
        revenue: 8888,
        cost: 8888,
        profit: 8888,
      }),
    ],
  });

  assert.equal(report.activity.includedMarketCount, 1);
  assert.equal(report.marketRows.length, 1);
  assert.equal(report.marketRows[0].marketId, 'market-1');
  assert.equal(report.money.totalRevenue, 5000);
  assert.equal(report.dataQuality.includedDailyStatCount, 1);
});

runTest('simple revenue without cost still produces useful revenue analysis with profit limitations', () => {
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

  assert.equal(report.money.totalRevenue, 5000);
  assert.equal(report.activity.averageOrderValue, 1000);
  assert.equal(report.decision.overallScore > 0, true);
  assert.equal(report.decision.analysisAvailability.profitAnalysis, 'unavailable');
  assert.equal(report.decision.analysisAvailability.productAnalysis, 'unavailable');
  assert.equal(report.decision.scoreComponents.find(component => component.key === 'profit')?.score, null);
  assert.equal(report.decision.scoreComponents.find(component => component.key === 'revenue_deals')?.status, 'available');
  assert.equal(
    report.dataQuality.limitations.some(limitation => limitation.code === 'missing_cost_data'),
    true
  );
  assert.equal(
    report.dataQuality.limitations.some(limitation => limitation.code === 'missing_product_detail'),
    true
  );
  assert.deepEqual(report.content.productActions, [
    'Product ranking is unavailable because item-level sales were not recorded.',
  ]);
  assert.equal(report.content.dataActions.some(action => action.includes('Revenue, deal count, and average order value remain useful')), true);
});

runTest('item-level sales without product cost keeps product ranking but marks profit estimate limited', () => {
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
        productsSold: [{ productId: 'product-1', quantity: 10, revenue: 5000 }],
      }),
    ],
    products: [product({ cost: undefined })],
  });

  assert.equal(report.productRows[0].productName, 'Signature Tea');
  assert.equal(report.productRows[0].estimatedCost, null);
  assert.equal(report.productRows[0].estimatedGrossProfit, null);
  assert.equal(report.decision.analysisAvailability.productAnalysis, 'available');
  assert.equal(report.decision.analysisAvailability.profitAnalysis, 'unavailable');
  assert.equal(report.content.productActions[0].includes('Signature Tea'), true);
  assert.equal(
    report.dataQuality.limitations.some(limitation => limitation.code === 'missing_cost_data'),
    true
  );
});

runTest('surfaces distortion risks before preview or PDF work', () => {
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
        totalRevenue: 9999,
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
      dailyStat({
        id: 14,
        marketId: 'market-cancelled',
        date: '2026-06-01',
        revenue: 9999,
        cost: 0,
        profit: 9999,
      }),
    ],
    products: [product({ cost: 50 })],
  });

  const codes = report.dataQuality.limitations.map(limitation => limitation.code);

  assert.deepEqual(report.dataQuality.excludedMarketIds, ['market-cancelled']);
  assert.equal(report.marketRows.some(row => row.marketId === 'market-cancelled'), false);
  assert.equal(report.money.totalRevenue, 2_002_001);
  assert.deepEqual(report.dataQuality.ongoingOrFutureMarketIds, ['market-ongoing']);
  assert.deepEqual(report.dataQuality.projectionMismatchMarketIds.sort(), ['market-ongoing', 'market-partial']);
  assert.deepEqual(report.dataQuality.possibleDuplicateDailyStatKeys, ['market-partial:2026-06-01']);
  assert.deepEqual(report.dataQuality.outlierDailyStatIds, ['13']);
  assert.deepEqual(report.dataQuality.manualEntryDominantMarketIds, ['market-partial']);
  assert.deepEqual(report.dataQuality.zeroCostMarketIds.sort(), ['market-ongoing', 'market-partial']);
  assert.deepEqual(report.dataQuality.costBasisEstimatedProductIds, ['product-1']);
  assert.deepEqual(report.dataQuality.partialPeriodMarketIds, ['market-partial']);
  assert.equal(codes.includes('excluded_inactive_market'), true);
  assert.equal(codes.includes('ongoing_or_future_market'), true);
  assert.equal(codes.includes('projection_mismatch'), true);
  assert.equal(codes.includes('possible_duplicate_daily_stats'), true);
  assert.equal(codes.includes('outlier_values'), true);
  assert.equal(codes.includes('manual_entry_dominant'), true);
  assert.equal(codes.includes('zero_or_missing_market_cost'), true);
  assert.equal(codes.includes('cost_basis_estimated'), true);
  assert.equal(codes.includes('partial_period_overlap'), true);
  assert.equal(report.content.dataActions.some(action => action.includes('read-only projection audit')), true);
});

runTest('blocks manager operator viewer and fail-closed roles', () => {
  for (const capabilities of [
    deriveRoleCapabilities({ isOwner: false, staffRole: 'manager' }),
    deriveRoleCapabilities({ isOwner: false, staffRole: 'operator' }),
    deriveRoleCapabilities({ isOwner: false, staffRole: 'viewer' }),
    deriveRoleCapabilities({ isOwner: false, staffRole: null }),
  ]) {
    assert.throws(
      () => buildSettlementReportModel({
        capabilities,
        period: {
          kind: 'weekly',
          startDate: '2026-06-01',
          endDate: '2026-06-07',
          label: '2026-W23',
        },
        markets: [],
        dailyStats: [],
      }),
      /Settlement reports are owner-only/
    );
  }
});

runTest('model is pure and does not import runtime data sources, UI, or file generators', () => {
  assert.doesNotMatch(modelSource, /@\/lib\/db|from ['"](?!@\/types\/db)[^'"]*\/db['"]|db\./);
  assert.doesNotMatch(modelSource, /@\/lib\/supabase|from ['"].*supabase|supabase\./);
  assert.doesNotMatch(modelSource, /from ['"]react|use[A-Z]/);
  assert.doesNotMatch(modelSource, /document\.|window\.|Blob|URL\.createObjectURL/);
  assert.doesNotMatch(modelSource, /pdf|jspdf|xlsx|excel|csv/i);
});

runTest('plan records settlement reports as owner-only PDF-first future direction', () => {
  assert.match(modelPlanSource, /Settlement reports are the primary reporting experience/);
  assert.match(modelPlanSource, /designed PDF/);
  assert.match(modelPlanSource, /Excel remains a future detailed-download format/);
  assert.match(modelPlanSource, /Initial settlement reports are owner-only/);
  assert.match(modelPlanSource, /Manager:[\s\S]*no settlement report access in the initial implementation/);
  assert.match(modelPlanSource, /This plan does not approve PDF generation/);
  assert.match(modelPlanSource, /This plan does not approve[\s\S]*Excel generation/);
  assert.match(modelPlanSource, /Missing cost data must lower profit confidence/);
  assert.match(modelPlanSource, /Missing product detail must disable product ranking/);
  assert.match(modelPlanSource, /Distortion Risk Rules/);
  assert.match(modelPlanSource, /SETTLEMENT_REPORT_DISTORTION_RISK_PLAN_2026_06_30/);
  assert.match(distortionRiskPlanSource, /numbers may exist but the conclusion can still be wrong/);
  assert.match(distortionRiskPlanSource, /Simple revenue entry is valid/);
  assert.match(distortionRiskPlanSource, /The Report Preview Spec includes visible UI states/);
  assert.match(distortionRiskPlanSource, /Preview UI approval and completion are tracked in `docs\/SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30\.md`/);
  assert.match(distortionRiskPlanSource, /Do not automatically repair duplicate projections/);
  assert.match(cloudPlanSource, /Step 7: Owner Settlement Report Model/);
  assert.match(cloudPlanSource, /distortion-risk model/);
  assert.match(cloudPlanSource, /Designed PDF output later/);
  assert.match(highRiskPlanSource, /## 20\. Owner Settlement Report Model/);
  assert.match(highRiskPlanSource, /Distortion risks now surface as explicit limitations/);
  assert.match(highRiskPlanSource, /PDF is now the preferred future presentation format/);
});

runTest('full test suite includes settlement report model guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-model\.test\.ts/);
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
    throw new Error(`${failed} settlement report model tests failed`);
  }
}

main();
