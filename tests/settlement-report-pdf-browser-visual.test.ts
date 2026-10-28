import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { deriveRoleCapabilities } from '../lib/permissions/role-capabilities';
import { buildSettlementReportModel } from '../lib/reporting/settlement-report';
import { buildSettlementReportPdfViewModel } from '../lib/reporting/settlement-report-pdf-view-model';
import { SettlementReportPdfDocument } from '../components/reports/settlement/SettlementReportPdfDocument';
import { compactPdfText, wrapPdfText } from '../lib/reporting/pdf-display-text';
import type { DailyStats, Market, Product } from '../types/db';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const fontPath = join(projectRoot, 'public/fonts/report/NotoSansTC-VariableFont_wght.ttf');
const artifactPath = join(projectRoot, '.codex-artifacts', 'settlement-report-visual-validation.pdf');
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
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');
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
    name: '森之市品牌選物日',
    location: '台北松菸文創園區',
    startDate: '2026-06-01',
    endDate: '2026-06-02',
    status: 'completed',
    registrationFee: 300,
    boothCost: 3600,
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
    touchCount: 80,
    inquiryCount: 34,
    dealCount: 25,
    revenue: 26000,
    cost: 9600,
    profit: 16400,
    productsSold: [
      { productId: 'product-1', quantity: 32, revenue: 12800 },
      { productId: 'product-2', quantity: 18, revenue: 9000 },
    ],
    updatedAt: timestamp,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    name: '手作串珠耳環',
    category: '飾品',
    price: 400,
    cost: 130,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function buildReadableFixtureViewModel() {
  const report = buildSettlementReportModel({
    capabilities: ownerCapabilities(),
    brandName: '日光手作飾品',
    period: {
      kind: 'weekly',
      startDate: '2026-06-01',
      endDate: '2026-06-07',
      label: '2026/06/01 - 2026/06/07',
    },
    markets: [
      market(),
      market({
        id: 'market-2',
        name: '海風生活節',
        location: '淡水碼頭',
        startDate: '2026-06-04',
        endDate: '2026-06-04',
        boothCost: 1800,
        registrationFee: 0,
        commissionRate: 0,
      }),
      market({
        id: 'market-3',
        name: '午後花市',
        location: '華山廣場',
        startDate: '2026-06-06',
        endDate: '2026-06-06',
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
        marketId: 'market-2',
        date: '2026-06-04',
        revenue: 18000,
        cost: 7100,
        profit: 10900,
        dealCount: 18,
        touchCount: 50,
        inquiryCount: 22,
        productsSold: [{ productId: 'product-2', quantity: 20, revenue: 10000 }],
      }),
      dailyStat({
        id: 3,
        marketId: 'market-3',
        date: '2026-06-06',
        revenue: 4200,
        cost: 0,
        profit: 4200,
        dealCount: 6,
        touchCount: 0,
        inquiryCount: 0,
        productsSold: [],
      }),
    ],
    products: [
      product(),
      product({ id: 'product-2', name: '天然石手鍊', price: 500, cost: 180 }),
    ],
  });

  return buildSettlementReportPdfViewModel({ report });
}

function countPdfPages(buffer: Buffer): number {
  const pdfSource = buffer.toString('latin1');
  return pdfSource.match(/\/Type \/Page\b/g)?.length ?? 0;
}

function readMediaBoxes(buffer: Buffer): Array<{ width: number; height: number }> {
  return Array.from(buffer.toString('latin1').matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g))
    .map(match => ({ width: Number(match[1]), height: Number(match[2]) }));
}

console.log('\n=== Settlement report PDF browser visual validation ===');

runTest('renders a readable owner-only fixture PDF for browser visual validation', async () => {
  const viewModel = buildReadableFixtureViewModel();
  const buffer = await renderToBuffer(
    React.createElement(SettlementReportPdfDocument, { viewModel, fontSource: fontPath })
  );

  assert.match(buffer.subarray(0, 8).toString('latin1'), /^%PDF-/);
  assert.equal(countPdfPages(buffer), 5);
  const mediaBoxes = readMediaBoxes(buffer);
  assert.equal(mediaBoxes.length, 5);
  assert.ok(mediaBoxes.every(box => Math.abs(box.width - 595.28) < 0.02));
  assert.ok(mediaBoxes.every(box => Math.abs(box.height - 841.89) < 0.02));
  assert.ok(buffer.length > 20_000, `Expected non-trivial PDF output, got ${buffer.length} bytes`);

  if (process.env.WRITE_SETTLEMENT_PDF_ARTIFACT === '1') {
    mkdirSync(join(projectRoot, '.codex-artifacts'), { recursive: true });
    writeFileSync(artifactPath, buffer);
    console.log(`WROTE ${artifactPath}`);
  }
});

runTest('fixture keeps the initial settlement PDF scope owner-only and data-source free', () => {
  const viewModel = buildReadableFixtureViewModel();

  assert.equal(viewModel.meta.brandName, '日光手作飾品');
  assert.equal(viewModel.totalPages, 5);
  assert.equal(viewModel.pages[0].brandName, '日光手作飾品');
  assert.equal(viewModel.pages[2].rows.length, 3);
  assert.equal(viewModel.pages[3].rows.length, 2);
});

runTest('long CJK names and full ranking/action lists remain five true-A4 pages', async () => {
  const viewModel = buildReadableFixtureViewModel();
  const longName = '超長名稱測試台北台中台南高雄市集品牌手作品商品'.repeat(4);
  viewModel.meta.brandName = longName;
  viewModel.pages[0].brandName = longName;
  viewModel.pages[0].scoreLabel = '正式評分暫不顯示';
  viewModel.pages[0].gradeLabel = '低可信度初稿';
  viewModel.pages[2].rows = Array.from({ length: 8 }, (_, i) => ({ ...viewModel.pages[2].rows[0], marketId: `stress-m-${i}`, marketName: `${longName}${i}` }));
  viewModel.pages[3].rows = Array.from({ length: 8 }, (_, i) => ({ ...viewModel.pages[3].rows[0], productId: `stress-p-${i}`, productName: `${longName}${i}` }));
  viewModel.pages[4].actionGroups = viewModel.pages[4].actionGroups.map(group => ({ ...group, actions: Array.from({ length: 4 }, (_, i) => `${longName}${i}建議參加並留意商品與場次安排。`) }));
  const buffer = await renderToBuffer(React.createElement(SettlementReportPdfDocument, { viewModel, fontSource: fontPath }));
  assert.equal(countPdfPages(buffer), 5);
  const boxes = readMediaBoxes(buffer);
  assert.equal(boxes.length, 5);
  assert.ok(boxes.every(box => Math.abs(box.width - 595.28) < 0.02 && Math.abs(box.height - 841.89) < 0.02), 'no page may grow beyond A4');
  assert.equal(viewModel.pages[2].rows[0].marketName, `${longName}0`, 'PDF presentation must not mutate source records');
  assert.equal(compactPdfText('🍀'.repeat(40)), `${'🍀'.repeat(35)}…`, 'keep Unicode code points intact');
  assert.equal(wrapPdfText('短名稱'), '短名稱');
  assert.ok(wrapPdfText(longName).split('\n').every(line => Array.from(line).length <= 18));
  if (process.env.WRITE_SETTLEMENT_PDF_ARTIFACT === '1') {
    writeFileSync(join(projectRoot, '.codex-artifacts', 'settlement-report-long-names.pdf'), buffer);
  }
});

runTest('plans record browser visual validation boundaries and template polish', () => {
  assert.match(technicalPlanSource, /Slice N: Browser Visual Validation And Template Polish[\s\S]*Status: completed/);
  assert.match(technicalPlanSource, /Direct `file:\/\/` PDF viewing is blocked/);
  assert.match(technicalPlanSource, /custom in-app download UI/);
  assert.match(presentationPlanSource, /Slice M: Browser Visual Validation And Template Polish[\s\S]*Status: completed/);
  assert.match(presentationPlanSource, /does not depend on production data/);
  assert.match(testManifestSource, /tsx tests\/settlement-report-pdf-browser-visual\.test\.ts/);
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
    throw new Error(`${failed} settlement report PDF browser visual validation tests failed`);
  }
}

void main();
