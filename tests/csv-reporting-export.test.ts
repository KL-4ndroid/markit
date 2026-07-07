import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildOwnerMarketSummaryCsv,
  escapeCsvCell,
  serializeCsv,
} from '../lib/reporting/csv-export';
import { deriveRoleCapabilities } from '../lib/permissions/role-capabilities';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const csvExportSource = readFileSync(join(projectRoot, 'lib/reporting/csv-export.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== CSV reporting export helper ===');

runTest('escapes CSV cells with stable quoting and formula neutralization', () => {
  assert.equal(escapeCsvCell('plain'), 'plain');
  assert.equal(escapeCsvCell('needs,quote'), '"needs,quote"');
  assert.equal(escapeCsvCell('he said "hi"'), '"he said ""hi"""');
  assert.equal(escapeCsvCell(' line '), '" line "');
  assert.equal(escapeCsvCell('=1+1'), "'=1+1");
  assert.equal(escapeCsvCell('+SUM(A1:A2)'), "'+SUM(A1:A2)");
  assert.equal(escapeCsvCell('-10'), "'-10");
  assert.equal(escapeCsvCell('@cmd'), "'@cmd");
  assert.equal(escapeCsvCell(1200), '1200');
  assert.equal(escapeCsvCell(Number.NaN), '');
  assert.equal(escapeCsvCell(null), '');
});

runTest('serializes generic CSV with header row and CRLF line endings', () => {
  const csv = serializeCsv(
    [
      { key: 'name', header: 'name' },
      { key: 'amount', header: 'amount' },
    ],
    [
      { name: 'A market', amount: 10 },
      { name: 'B, market', amount: 20 },
    ]
  );

  assert.equal(csv, 'name,amount\r\nA market,10\r\n"B, market",20');
});

runTest('builds owner market summary CSV with stable owner finance columns', () => {
  const csv = buildOwnerMarketSummaryCsv({
    capabilities: deriveRoleCapabilities({ isOwner: true, staffRole: null }),
    rows: [
      {
        marketId: 'market-1',
        marketName: '森之市',
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        location: 'Taipei',
        syncStatus: 'synced',
        totalRevenue: 12000,
        totalDeals: 15,
        totalInteractions: 80,
        boothCost: 3000,
        totalCost: 5200,
        totalProfit: 6800,
        netProfit: 3800,
        commissionRate: 5,
      },
    ],
  });

  assert.equal(
    csv,
    [
      'market_id,market_name,start_date,end_date,location,sync_status,total_revenue,total_deals,total_interactions,booth_cost,total_cost,total_profit,net_profit,commission_rate',
      'market-1,森之市,2026-06-01,2026-06-02,Taipei,synced,12000,15,80,3000,5200,6800,3800,5',
    ].join('\r\n')
  );
});

runTest('blocks manager operator viewer and fail-closed roles from owner market summary export', () => {
  for (const capabilities of [
    deriveRoleCapabilities({ isOwner: false, staffRole: 'manager' }),
    deriveRoleCapabilities({ isOwner: false, staffRole: 'operator' }),
    deriveRoleCapabilities({ isOwner: false, staffRole: 'viewer' }),
    deriveRoleCapabilities({ isOwner: false, staffRole: null }),
  ]) {
    assert.throws(
      () => buildOwnerMarketSummaryCsv({ capabilities, rows: [] }),
      /Owner reporting export requires owner import\/export and finance capabilities/
    );
  }
});

runTest('helper is pure and does not import runtime data sources or UI surfaces', () => {
  assert.doesNotMatch(csvExportSource, /@\/lib\/db|from ['"].*db|db\./);
  assert.doesNotMatch(csvExportSource, /@\/lib\/supabase|from ['"].*supabase|supabase\./);
  assert.doesNotMatch(csvExportSource, /from ['"]react|use[A-Z]/);
  assert.doesNotMatch(csvExportSource, /document\.|window\.|Blob|URL\.createObjectURL/);
  assert.doesNotMatch(csvExportSource, /xlsx|excel/i);
});

runTest('production UI and sync paths do not import CSV reporting export helper', () => {
  const productionFiles = [
    'app/settings/page.tsx',
    'app/recovery/page.tsx',
    'app/markets/[id]/page.tsx',
    'hooks/useSync.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
  ];

  const matches = productionFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /csv-export|buildOwnerMarketSummaryCsv|serializeCsv/.test(source);
  });

  assert.deepEqual(matches, []);
});

runTest('full test suite includes CSV reporting export helper guardrail', () => {
  assert.match(testManifestSource, /tsx tests\/csv-reporting-export\.test\.ts/);
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
    throw new Error(`${failed} CSV reporting export helper tests failed`);
  }
}

main();
