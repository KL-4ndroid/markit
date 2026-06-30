import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deriveRoleCapabilities } from '../lib/permissions/role-capabilities';
import { buildSettlementReportModel } from '../lib/reporting/settlement-report';
import { buildSettlementReportPreviewModel } from '../lib/reporting/settlement-report-preview';
import type { DailyStats, Market, Product } from '../types/db';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const previewModelSource = readFileSync(join(projectRoot, 'lib/reporting/settlement-report-preview.ts'), 'utf8');
const previewModelImports = previewModelSource.match(/^import[\s\S]*?;$/gm)?.join('\n') ?? '';
const previewSpecSource = readFileSync(join(projectRoot, 'docs/SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30.md'), 'utf8');
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

function managerCapabilities() {
  return deriveRoleCapabilities({ isOwner: false, staffRole: 'manager' });
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

console.log('\n=== Settlement report preview model ===');

runTest('builds owner-only preview contract from settlement report model', () => {
  const report = buildSettlementReportModel({
    capabilities: ownerCapabilities(),
    period: {
      kind: 'weekly',
      startDate: '2026-06-01',
      endDate: '2026-06-07',
      label: '2026-W23',
    },
    markets: [market({
      totalRevenue: 5000,
      totalDeals: 5,
      totalInteractions: 12,
    })],
    dailyStats: [dailyStat()],
    products: [product()],
  });

  const preview = buildSettlementReportPreviewModel({
    capabilities: ownerCapabilities(),
    report,
  });

  assert.equal(preview.header.kind, 'weekly');
  assert.equal(preview.header.periodLabel, '2026-W23');
  assert.equal(preview.header.readiness, 'limited');
  assert.equal(preview.reliability.infoCount > 0, true);
  assert.equal(preview.reliability.warningCount, 0);
  assert.equal(preview.sections.find(section => section.key === 'executive_summary')?.status, 'available');
  assert.equal(preview.sections.find(section => section.key === 'cost_and_profit')?.status, 'available');
  assert.equal(preview.topWarnings.length, 0);
  assert.equal(preview.nextActions.length > 0, true);
});

runTest('marks critical warning reports as not ready and places warnings at top', () => {
  const report = buildSettlementReportModel({
    capabilities: ownerCapabilities(),
    period: {
      kind: 'monthly',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      label: '2026-06',
    },
    markets: [],
    dailyStats: [],
    products: [],
  });

  const preview = buildSettlementReportPreviewModel({
    capabilities: ownerCapabilities(),
    report,
  });

  assert.equal(preview.header.readiness, 'not_ready');
  assert.equal(preview.header.confidence, 'low');
  assert.equal(preview.sections.find(section => section.key === 'executive_summary')?.status, 'unavailable');
  assert.equal(preview.sections.find(section => section.key === 'data_quality')?.status, 'unavailable');
  assert.equal(preview.topWarnings.some(warning => warning.code === 'no_markets_in_period'), true);
});

runTest('blocks manager and fail-closed capabilities from preview model', () => {
  const report = buildSettlementReportModel({
    capabilities: ownerCapabilities(),
    period: {
      kind: 'weekly',
      startDate: '2026-06-01',
      endDate: '2026-06-07',
      label: '2026-W23',
    },
    markets: [market()],
    dailyStats: [dailyStat()],
    products: [product()],
  });

  assert.throws(
    () => buildSettlementReportPreviewModel({ capabilities: managerCapabilities(), report }),
    /owner-only/
  );
  assert.throws(
    () => buildSettlementReportPreviewModel({
      capabilities: deriveRoleCapabilities({ isOwner: false, staffRole: null }),
      report,
    }),
    /owner-only/
  );
});

runTest('preview model remains pure and does not approve UI or file generation', () => {
  assert.match(previewSpecSource, /Slice B: Pure Preview View Model[\s\S]*Status: completed/);
  assert.match(previewSpecSource, /Slice C: Owner-Only Preview UI Shell[\s\S]*Status: completed/);
  assert.match(previewSpecSource, /does not approve[\s\S]*PDF generation/);
  assert.doesNotMatch(
    previewModelImports,
    /from ['"](?:react|dexie|@\/lib\/db|@\/lib\/supabase|@\/lib\/.*(?:recovery|sync)|[^'"]*(?:pdf|xlsx|csv|download))/i
  );
});

runTest('full test suite includes settlement report preview model guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/settlement-report-preview-model\.test\.ts/);
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
    throw new Error(`${failed} settlement report preview model tests failed`);
  }
}

main();
