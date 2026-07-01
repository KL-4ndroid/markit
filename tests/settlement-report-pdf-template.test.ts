import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { deriveRoleCapabilities } from '../lib/permissions/role-capabilities';
import { buildSettlementReportModel } from '../lib/reporting/settlement-report';
import { buildSettlementReportPdfViewModel } from '../lib/reporting/settlement-report-pdf-view-model';
import { SettlementReportPdfDocument } from '../components/reports/settlement/SettlementReportPdfDocument';
import type { DailyStats, Market, Product } from '../types/db';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const fontPath = join(projectRoot, 'public/fonts/report/NotoSansTC-VariableFont_wght.ttf');
const templateSource = readFileSync(
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
    name: '週末手作市集',
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
    name: '招牌手作商品',
    category: 'handmade',
    price: 300,
    cost: 120,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function buildFixtureViewModel() {
  const report = buildSettlementReportModel({
    capabilities: ownerCapabilities(),
    brandName: 'BoothBook 測試品牌',
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
        name: '午後生活節',
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

  return buildSettlementReportPdfViewModel({ report });
}

function countPdfPages(buffer: Buffer): number {
  const pdfSource = buffer.toString('latin1');
  return pdfSource.match(/\/Type \/Page\b/g)?.length ?? 0;
}

console.log('\n=== Settlement report PDF template ===');

runTest('renders the settlement report view model into a five-page A4 PDF buffer', async () => {
  const viewModel = buildFixtureViewModel();
  const buffer = await renderToBuffer(
    React.createElement(SettlementReportPdfDocument, { viewModel, fontSource: fontPath })
  );
  const pdfSource = buffer.toString('latin1');

  assert.equal(Buffer.isBuffer(buffer), true);
  assert.match(buffer.subarray(0, 8).toString('latin1'), /^%PDF-/);
  assert.equal(countPdfPages(buffer), 5);
  assert.match(pdfSource, /ToUnicode/);
  assert.match(pdfSource, /NotoSansTC/);
});

runTest('template source remains fixture-only and does not read app data sources', () => {
  assert.doesNotMatch(templateSource, /@\/lib\/db|@\/lib\/supabase|dexie|useLiveQuery|fetch\(/);
  assert.doesNotMatch(templateSource, /PDFViewer|PDFDownloadLink|BlobProvider|usePDF|renderToFile/);
  assert.doesNotMatch(templateSource, /createObjectURL|window\.|document\.|download=/);
});

runTest('template covers all five report page keys', () => {
  assert.match(templateSource, /case 'cover_summary'/);
  assert.match(templateSource, /case 'data_confidence_score'/);
  assert.match(templateSource, /case 'market_performance'/);
  assert.match(templateSource, /case 'product_performance'/);
  assert.match(templateSource, /case 'cost_profit_actions'/);
});

runTest('plans record fixture-only PDF template without approving browser UI', () => {
  assert.match(technicalPlanSource, /Slice L: PDF Template Prototype[\s\S]*Status: completed/);
  assert.match(technicalPlanSource, /fixture-only PDF document that uses the settlement report PDF view model/);
  assert.match(technicalPlanSource, /Slice M: Owner-Only Browser PDF Preview UI[\s\S]*Status: completed/);
  assert.match(technicalPlanSource, /does not add a custom download button/);
  assert.match(presentationPlanSource, /Slice K: Fixture-Only PDF Template Prototype[\s\S]*Status: completed/);
  assert.match(presentationPlanSource, /No browser preview UI, download behavior, Supabase access, sync, recovery, or data writes/);
});

runTest('full test suite includes PDF template guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-pdf-template\.test\.ts/);
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} settlement report PDF template tests failed`);
  }
}

void main();
