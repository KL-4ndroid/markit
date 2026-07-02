import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { deriveRoleCapabilities } from '../lib/permissions/role-capabilities';
import { buildSettlementReportModel } from '../lib/reporting/settlement-report';
import { buildSettlementReportPdfViewModel } from '../lib/reporting/settlement-report-pdf-view-model';
import type { DailyStats, Market, Product } from '../types/db';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const fontPath = join(projectRoot, 'public/fonts/report/NotoSansTC-VariableFont_wght.ttf');
const licensePath = join(projectRoot, 'public/fonts/report/LICENSE-NotoSansTC.txt');
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
    name: '品牌市集',
    location: 'Taipei',
    startDate: '2026-06-01',
    endDate: '2026-06-02',
    status: 'completed',
    boothCost: 3000,
    registrationFee: 0,
    commissionRate: 0,
    totalRevenue: 9000,
    totalCost: 3000,
    totalProfit: 6000,
    totalDeals: 18,
    totalInteractions: 42,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function dailyStat(overrides: Partial<DailyStats> = {}): DailyStats {
  return {
    id: 1,
    marketId: 'market-1',
    date: '2026-06-01',
    revenue: 9000,
    cost: 3000,
    profit: 6000,
    dealCount: 18,
    touchCount: 42,
    inquiryCount: 20,
    productsSold: [{ productId: 'product-1', quantity: 18, revenue: 9000 }],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: '招牌商品',
    category: 'goods',
    price: 500,
    cost: 180,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function buildFixtureReport() {
  return buildSettlementReportModel({
    capabilities: ownerCapabilities(),
    brandName: 'Féria',
    period: {
      kind: 'monthly',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      label: '2026-06',
    },
    markets: [market()],
    dailyStats: [dailyStat()],
    products: [product()],
  });
}

console.log('\n=== Settlement report PDF font assets ===');

runTest('Noto Sans TC variable font asset exists within the report font directory', () => {
  assert.equal(existsSync(fontPath), true);
  assert.match(fontPath.replaceAll('\\', '/'), /public\/fonts\/report\/NotoSansTC-VariableFont_wght\.ttf$/);
});

runTest('font asset stays within the approved first-slice size budget', () => {
  const fontStat = statSync(fontPath);
  const maxBytes = 15 * 1024 * 1024;

  assert.ok(fontStat.size > 0);
  assert.ok(fontStat.size <= maxBytes, `Expected font asset <= 15 MB, got ${fontStat.size} bytes`);
});

runTest('font license notice records source and commercial-use license basis', () => {
  assert.equal(existsSync(licensePath), true);

  const licenseNotice = readFileSync(licensePath, 'utf8');

  assert.match(licenseNotice, /Noto Sans TC/);
  assert.match(licenseNotice, /NotoSansTC-VariableFont_wght\.ttf/);
  assert.match(licenseNotice, /Official Noto \/ Google Fonts distribution/);
  assert.match(licenseNotice, /SIL Open Font License 1\.1/);
  assert.match(licenseNotice, /https:\/\/fonts\.google\.com\/noto\/specimen\/Noto\+Sans\+TC/);
  assert.match(licenseNotice, /https:\/\/openfontlicense\.org\//);
});

runTest('PDF view model references the approved local font asset without rendering PDFs', () => {
  const viewModel = buildSettlementReportPdfViewModel({ report: buildFixtureReport() });

  assert.equal(viewModel.font.family, 'Noto Sans TC');
  assert.equal(viewModel.font.assetBasePath, '/fonts/report/');
  assert.equal(viewModel.font.assetFileName, 'NotoSansTC-VariableFont_wght.ttf');
  assert.equal(viewModel.font.assetPath, '/fonts/report/NotoSansTC-VariableFont_wght.ttf');
  assert.equal(viewModel.font.format, 'ttf');
  assert.equal(viewModel.font.distribution, 'variable');
  assert.equal(viewModel.font.renderSmokeTestRequired, true);
});

runTest('plans record font asset staging and later PDF runtime boundary', () => {
  assert.match(technicalPlanSource, /Slice I: Font Asset Staging[\s\S]*Status: completed/);
  assert.match(technicalPlanSource, /NotoSansTC-VariableFont_wght\.ttf/);
  assert.match(technicalPlanSource, /render smoke test must verify variable-font compatibility/);
  assert.match(presentationPlanSource, /Slice I: Font Asset Staging[\s\S]*Status: completed/);
  assert.match(presentationPlanSource, /No PDF package, PDF template, browser preview UI, download behavior/);
  assert.match(presentationPlanSource, /Slice J: PDF Runtime Install and Font Smoke[\s\S]*Status: completed/);
});

runTest('font asset remains separate from browser PDF preview dependencies', () => {
  assert.match(packageJson.dependencies?.['@react-pdf/renderer'] ?? '', /^\^4\./);
  assert.equal(packageJson.dependencies?.puppeteer, undefined);
  assert.equal(packageJson.devDependencies?.puppeteer, undefined);
  assert.equal(packageJson.dependencies?.playwright, undefined);
  assert.equal(packageJson.devDependencies?.playwright, undefined);
});

runTest('full test suite includes PDF font asset guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-pdf-font-assets\.test\.ts/);
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
    throw new Error(`${failed} settlement report PDF font asset tests failed`);
  }
}

main();
