import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveRoleCapabilities } from '../lib/permissions/role-capabilities';
import { buildSettlementReportModel } from '../lib/reporting/settlement-report';
import { buildSettlementReportPdfViewModel } from '../lib/reporting/settlement-report-pdf-view-model';
import type { DailyStats, Market, Product } from '../types/db';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const pdfViewModelSource = readFileSync(join(projectRoot, 'lib/reporting/settlement-report-pdf-view-model.ts'), 'utf8');
const technicalPlanSource = readFileSync(join(projectRoot, 'docs/SETTLEMENT_REPORT_PDF_TECHNICAL_PLAN_2026_07_01.md'), 'utf8');
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
    name: '台北週末市集',
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
    name: '招牌茶',
    category: 'food',
    price: 300,
    cost: 120,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function buildFixtureReport() {
  return buildSettlementReportModel({
    capabilities: ownerCapabilities(),
    brandName: '森木手作',
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
        name: '河岸生活節',
        startDate: '2026-06-03',
        endDate: '2026-06-03',
        boothCost: 0,
        registrationFee: 0,
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
        cost: 0,
        profit: 1000,
        dealCount: 2,
        touchCount: 0,
        inquiryCount: 0,
        productsSold: [],
      }),
    ],
    products: [product()],
  });
}

console.log('\n=== Settlement report PDF view model ===');

runTest('builds five fixed A4 PDF pages from settlement report model', () => {
  const viewModel = buildSettlementReportPdfViewModel({ report: buildFixtureReport() });

  assert.equal(viewModel.version, 1);
  assert.equal(viewModel.pageSize, 'A4');
  assert.equal(viewModel.orientation, 'portrait');
  assert.equal(viewModel.totalPages, 5);
  assert.deepEqual(viewModel.pages.map(page => page.key), [
    'cover_summary',
    'data_confidence_score',
    'market_performance',
    'product_performance',
    'cost_profit_actions',
  ]);
  assert.deepEqual(viewModel.pages.map(page => page.pageNumber), [1, 2, 3, 4, 5]);
});

runTest('uses Noto Sans TC local font asset plan', () => {
  const viewModel = buildSettlementReportPdfViewModel({ report: buildFixtureReport() });

  assert.equal(viewModel.font.family, 'Noto Sans TC');
  assert.equal(viewModel.font.license, 'SIL Open Font License 1.1');
  assert.equal(viewModel.font.assetBasePath, '/fonts/report/');
  assert.equal(viewModel.font.assetFileName, 'NotoSansTC-VariableFont_wght.ttf');
  assert.equal(viewModel.font.assetPath, '/fonts/report/NotoSansTC-VariableFont_wght.ttf');
  assert.equal(viewModel.font.format, 'ttf');
  assert.equal(viewModel.font.distribution, 'variable');
  assert.deepEqual(viewModel.font.weights, ['regular', 'medium', 'bold']);
  assert.equal(viewModel.font.renderSmokeTestRequired, true);
  assert.match(technicalPlanSource, /first font family: Noto Sans TC/);
  assert.match(technicalPlanSource, /NotoSansTC-VariableFont_wght\.ttf/);
});

runTest('cover page carries the same core report conclusion and metrics', () => {
  const report = buildFixtureReport();
  const viewModel = buildSettlementReportPdfViewModel({ report });
  const cover = viewModel.pages[0];

  assert.equal(cover.key, 'cover_summary');
  assert.equal(cover.brandName, report.brandName);
  assert.equal(cover.reportTypeLabel, '週結報告');
  assert.equal(cover.periodLabel, report.period.label);
  assert.equal(cover.recommendationSummary, report.decision.summary);
  assert.equal(cover.gradeLabel, `等級 ${report.decision.grade}`);
  assert.equal(cover.metrics.map(metric => metric.label).join(','), '總營收,淨利,成交數,平均客單價');
  assert.equal(cover.topWarnings.every(warning => warning.severity === 'warning'), true);
});

runTest('data confidence page surfaces limitations before score rows', () => {
  const report = buildFixtureReport();
  const viewModel = buildSettlementReportPdfViewModel({ report });
  const dataPage = viewModel.pages[1];

  assert.equal(dataPage.key, 'data_confidence_score');
  assert.equal(dataPage.limitations.length, report.dataQuality.limitations.length);
  assert.equal(dataPage.warningCount, dataPage.limitations.filter(limitation => limitation.severity === 'warning').length);
  assert.equal(dataPage.infoCount, dataPage.limitations.filter(limitation => limitation.severity === 'info').length);
  assert.equal(dataPage.scoreRows.length, report.decision.scoreComponents.length);
  assert.equal(dataPage.scoreRows.every(row => row.weightLabel.endsWith('%')), true);
});

runTest('market and product pages apply deterministic row caps and warning states', () => {
  const report = buildSettlementReportModel({
    capabilities: ownerCapabilities(),
    brandName: '森木手作',
    period: {
      kind: 'monthly',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      label: '2026-06',
    },
    markets: Array.from({ length: 10 }, (_, index) => market({
      id: `market-${index + 1}`,
      name: `市集 ${index + 1}`,
      startDate: `2026-06-${String(index + 1).padStart(2, '0')}`,
      endDate: `2026-06-${String(index + 1).padStart(2, '0')}`,
      sync_status: index === 0 ? 'local_only' : 'synced',
    })),
    dailyStats: Array.from({ length: 10 }, (_, index) => dailyStat({
      id: index + 1,
      marketId: `market-${index + 1}`,
      date: `2026-06-${String(index + 1).padStart(2, '0')}`,
      productsSold: [{ productId: `product-${index + 1}`, quantity: index + 1, revenue: 1000 + index }],
    })),
    products: Array.from({ length: 10 }, (_, index) => product({
      id: `product-${index + 1}`,
      name: `商品 ${index + 1}`,
      cost: index === 0 ? undefined : 100,
    })),
  });
  const viewModel = buildSettlementReportPdfViewModel({ report });
  const marketPage = viewModel.pages[2];
  const productPage = viewModel.pages[3];

  assert.equal(marketPage.rows.length, 8);
  assert.equal(marketPage.omittedRowCount, 2);
  assert.equal(marketPage.rows.some(row => row.warningCodes.includes('unsynced_data')), true);
  assert.equal(productPage.rows.length, 8);
  assert.equal(productPage.omittedRowCount, 2);
});

runTest('cost profit page groups next actions without creating runtime behavior', () => {
  const report = buildFixtureReport();
  const viewModel = buildSettlementReportPdfViewModel({ report });
  const costPage = viewModel.pages[4];

  assert.equal(costPage.key, 'cost_profit_actions');
  assert.equal(costPage.metrics.map(metric => metric.label).join(','), '商品成本,固定市集成本,抽成費,毛利,淨利');
  assert.match(costPage.costCoverageLabel, /%$/);
  assert.equal(costPage.actionGroups.some(group => group.title === '市集決策'), true);
  assert.equal(costPage.actionGroups.some(group => group.title === '商品決策'), true);
  assert.equal(costPage.actionGroups.some(group => group.title === '下次補強資料'), true);
});

runTest('PDF view model remains pure and does not import runtime PDF or data APIs', () => {
  assert.doesNotMatch(pdfViewModelSource, /react|@react-pdf|jspdf|pdf-lib|puppeteer|playwright/i);
  assert.doesNotMatch(pdfViewModelSource, /@\/lib\/db|@\/lib\/supabase|dexie|useLiveQuery|fetch\(/i);
  assert.doesNotMatch(pdfViewModelSource, /download|createObjectURL|Blob|window\.|document\./i);
});

runTest('full test suite includes PDF view model guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-pdf-view-model\.test\.ts/);
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
    throw new Error(`${failed} settlement report PDF view model tests failed`);
  }
}

main();
