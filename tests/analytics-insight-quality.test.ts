import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  clampInsightNumber,
  finiteInsightNumber,
  getDailyStatInsightId,
  getDailyStatInsightKey,
  hasMarketProjectionMismatch,
  hasOutlierDailyStatValues,
  isInactiveInsightMarket,
  isOngoingOrFutureInsightMarket,
  isPartialPeriodInsightMarket,
  optionalFiniteInsightNumber,
  ratioInsightNumbers,
} from '../lib/analytics/insight-quality';
import type { DailyStats, Market } from '../types/db';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const source = readFileSync(join(projectRoot, 'lib/analytics/insight-quality.ts'), 'utf8');
const settlementReportSource = readFileSync(join(projectRoot, 'lib/reporting/settlement-report.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const timestamp = new Date('2026-06-30T10:00:00+08:00').getTime();

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
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
    totalRevenue: 1000,
    totalDeals: 3,
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
    productsSold: [],
    updatedAt: timestamp,
    ...overrides,
  };
}

console.log('\n=== Analytics insight quality ===');

runTest('numeric helpers preserve finite clamp and ratio semantics', () => {
  assert.equal(finiteInsightNumber(3), 3);
  assert.equal(finiteInsightNumber(Number.NaN), 0);
  assert.equal(finiteInsightNumber('3'), 0);
  assert.equal(optionalFiniteInsightNumber(4), 4);
  assert.equal(optionalFiniteInsightNumber(Number.POSITIVE_INFINITY), null);
  assert.equal(optionalFiniteInsightNumber(undefined), null);
  assert.equal(clampInsightNumber(10, 0, 5), 5);
  assert.equal(clampInsightNumber(-1, 0, 5), 0);
  assert.equal(ratioInsightNumbers(3, 6), 0.5);
  assert.equal(ratioInsightNumbers(9, 6), 1);
  assert.equal(ratioInsightNumbers(1, 0), 0);
});

runTest('market status helpers classify inactive ongoing future and partial-period markets', () => {
  assert.equal(isInactiveInsightMarket(market({ status: 'cancelled' })), true);
  assert.equal(isInactiveInsightMarket(market({ status: 'postponed' })), true);
  assert.equal(isInactiveInsightMarket(market({ isDeleted: true })), true);
  assert.equal(isInactiveInsightMarket(market({ status: 'completed' })), false);
  assert.equal(isOngoingOrFutureInsightMarket(market({ status: 'ongoing' }), '2026-06-30'), true);
  assert.equal(isOngoingOrFutureInsightMarket(market({ startDate: '2026-07-01' }), '2026-06-30'), true);
  assert.equal(isOngoingOrFutureInsightMarket(market({ endDate: '2026-07-01' }), '2026-06-30'), true);
  assert.equal(isOngoingOrFutureInsightMarket(market({ startDate: '2026-06-01', endDate: '2026-06-02' }), '2026-06-30'), false);
  assert.equal(isPartialPeriodInsightMarket(market({ startDate: '2026-05-31' }), '2026-06-01', '2026-06-30'), true);
  assert.equal(isPartialPeriodInsightMarket(market({ endDate: '2026-07-01' }), '2026-06-01', '2026-06-30'), true);
  assert.equal(isPartialPeriodInsightMarket(market(), '2026-06-01', '2026-06-30'), false);
});

runTest('daily stat helpers expose stable keys ids and outlier detection', () => {
  assert.equal(getDailyStatInsightKey(dailyStat()), 'market-1:2026-06-01');
  assert.equal(getDailyStatInsightId(dailyStat()), '1');
  assert.equal(getDailyStatInsightId(dailyStat({ id: undefined })), 'market-1:2026-06-01');
  assert.equal(hasOutlierDailyStatValues(dailyStat()), false);
  assert.equal(hasOutlierDailyStatValues(dailyStat({ revenue: -1 })), true);
  assert.equal(hasOutlierDailyStatValues(dailyStat({ cost: -1 })), true);
  assert.equal(hasOutlierDailyStatValues(dailyStat({ dealCount: -1 })), true);
  assert.equal(hasOutlierDailyStatValues(dailyStat({ touchCount: -10 })), true);
  assert.equal(hasOutlierDailyStatValues(dailyStat({ revenue: 1_000_001 })), true);
  assert.equal(hasOutlierDailyStatValues(dailyStat({ dealCount: 1_001 })), true);
  assert.equal(hasOutlierDailyStatValues(dailyStat({ touchCount: 10_001, inquiryCount: 0 })), true);
  assert.equal(hasOutlierDailyStatValues(dailyStat({ revenue: 100, cost: 0, profit: 500 })), true);
});

runTest('projection mismatch helper compares market projection to caller-provided row summary', () => {
  assert.equal(hasMarketProjectionMismatch(market({ totalRevenue: 1000, totalDeals: 3 }), { revenue: 1000, dealCount: 3 }), false);
  assert.equal(hasMarketProjectionMismatch(market({ totalRevenue: 1002, totalDeals: 3 }), { revenue: 1000, dealCount: 3 }), true);
  assert.equal(hasMarketProjectionMismatch(market({ totalRevenue: 1000, totalDeals: 4 }), { revenue: 1000, dealCount: 3 }), true);
  assert.equal(hasMarketProjectionMismatch(market({ totalRevenue: undefined, totalDeals: undefined }), { revenue: 1000, dealCount: 3 }), false);
});

runTest('shared helper module remains pure and settlement report consumes helpers', () => {
  assert.doesNotMatch(source, /from ['"]react|use[A-Z]|@\/lib\/db|Dexie|db\.|supabase|window\.|document\.|pdf|xlsx|csv/i);
  assert.match(settlementReportSource, /finiteInsightNumber as finiteNumber/);
  assert.match(settlementReportSource, /hasMarketProjectionMismatch as hasProjectionMismatch/);
  assert.match(settlementReportSource, /hasOutlierDailyStatValues as hasOutlierValues/);
  assert.match(settlementReportSource, /isPartialPeriodInsightMarket/);
});

runTest('full test suite includes analytics insight quality helper guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/analytics-insight-quality\.test\.ts/);
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
    throw new Error(`${failed} analytics insight quality tests failed`);
  }
}

main();
