import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '../lib/db';
import {
  listLocalSalesPhotoEvidencePendingCreationsForMarket,
} from '../lib/sales/photo-evidence-pending-creation-read-model';
import {
  createLocalPendingSalesPhotoEvidenceCreation,
  markPendingSalesPhotoEvidenceCreationRetryableFailure,
  type LocalPendingSalesPhotoEvidenceCreation,
} from '../lib/sales/photo-evidence-pending-creation';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_MARKET_ID = '77777777-7777-4777-8777-777777777777';
const STAFF_ID = '44444444-4444-4444-8444-444444444444';

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function makeItem(
  saleEventId: string,
  marketId = MARKET_ID,
  now = '2026-07-05T10:00:00.000Z'
): LocalPendingSalesPhotoEvidenceCreation {
  return createLocalPendingSalesPhotoEvidenceCreation({
    saleEventId,
    ownerId: OWNER_ID,
    marketId,
    capturedByStaffId: STAFF_ID,
    saleCompletedAt: '2026-07-05T09:59:00.000Z',
    now,
  });
}

function makeQueueTable(rows: LocalPendingSalesPhotoEvidenceCreation[], calls: string[]) {
  return {
    where: (field: string) => {
      calls.push(`where:${field}`);
      return {
        equals: (marketId: string) => {
          calls.push(`equals:${marketId}`);
          return {
            toArray: async () => rows.filter(row => row.marketId === marketId),
          };
        },
      };
    },
  };
}

async function withMockedQueue<T>(
  rows: LocalPendingSalesPhotoEvidenceCreation[],
  fn: (calls: string[]) => Promise<T>
): Promise<T> {
  const calls: string[] = [];
  const originalQueue = (db as any).salesPhotoEvidencePendingCreations;
  (db as any).salesPhotoEvidencePendingCreations = makeQueueTable(rows, calls);

  try {
    return await fn(calls);
  } finally {
    (db as any).salesPhotoEvidencePendingCreations = originalQueue;
  }
}

const readModelSource = readProjectFile('lib/sales/photo-evidence-pending-creation-read-model.ts');
const dialogSource = readProjectFile('components/markets/SalesPhotoEvidencePendingListDialog.tsx');
const ownerPageSource = readProjectFile('app/markets/[id]/page.tsx');
const staffViewSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');

console.log('\n=== Sales photo evidence pending list UI ===');

runTest('read model lists local pending rows for one market, newest first', async () => {
  const older = makeItem('33333333-3333-4333-8333-333333333333', MARKET_ID, '2026-07-05T10:00:00.000Z');
  const newer = markPendingSalesPhotoEvidenceCreationRetryableFailure(
    makeItem('55555555-5555-4555-8555-555555555555', MARKET_ID, '2026-07-05T10:02:00.000Z'),
    {
      code: 'network_error',
      message: 'temporary outage',
      now: '2026-07-05T10:03:00.000Z',
    }
  );
  const otherMarket = makeItem(
    '66666666-6666-4666-8666-666666666666',
    OTHER_MARKET_ID,
    '2026-07-05T10:04:00.000Z'
  );

  await withMockedQueue([older, newer, otherMarket], async calls => {
    const rows = await listLocalSalesPhotoEvidencePendingCreationsForMarket(MARKET_ID);

    assert.deepEqual(rows.map(row => row.saleEventId), [newer.saleEventId, older.saleEventId]);
    assert.deepEqual(calls, [`where:marketId`, `equals:${MARKET_ID}`]);
  });
});

runTest('read model respects limit and returns empty for blank market id', async () => {
  const first = makeItem('33333333-3333-4333-8333-333333333333', MARKET_ID, '2026-07-05T10:00:00.000Z');
  const second = makeItem('55555555-5555-4555-8555-555555555555', MARKET_ID, '2026-07-05T10:01:00.000Z');

  await withMockedQueue([first, second], async calls => {
    const limited = await listLocalSalesPhotoEvidencePendingCreationsForMarket(MARKET_ID, { limit: 1 });
    const blank = await listLocalSalesPhotoEvidencePendingCreationsForMarket('');

    assert.equal(limited.length, 1);
    assert.equal(limited[0].saleEventId, second.saleEventId);
    assert.deepEqual(blank, []);
    assert.deepEqual(calls, [`where:marketId`, `equals:${MARKET_ID}`]);
  });
});

runTest('pending list read model stays local-only and read-only', () => {
  assert.match(readModelSource, /db\.salesPhotoEvidencePendingCreations/);
  assert.match(readModelSource, /\.where\('marketId'\)[\s\S]*\.equals\(marketId\)[\s\S]*\.toArray\(\)/);
  assert.doesNotMatch(readModelSource, /add\(|put\(|update\(|delete\(|clear\(|bulkAdd\(|recordEvent/);
  assert.doesNotMatch(readModelSource, /supabase|sale_photo_evidence|drain|upload|getUserMedia|signedUrl|signed_url|\bR2\b/i);
});

runTest('pending list dialog stays adapter-free and delegates local capture by prop', () => {
  assert.match(dialogSource, /export function SalesPhotoEvidencePendingListDialog/);
  assert.match(dialogSource, /items: SalesPhotoEvidencePendingCreationListItem\[\]/);
  assert.match(dialogSource, /buildPendingSalesPhotoEvidenceCreationDiagnosticSummary\(items\)/);
  assert.match(dialogSource, /diagnostics\.severityCounts\.warning \+ diagnostics\.severityCounts\.critical/);
  assert.match(dialogSource, /loadError\?: string \| null/);
  assert.match(dialogSource, /lastLoadedAt\?: number \| null/);
  assert.match(dialogSource, /const statusCounts = countByStatus\(items\)/);
  assert.match(dialogSource, /const needsAttentionCount/);
  assert.match(dialogSource, /待補照片/);
  assert.match(dialogSource, /不會自動清除、恢復或上傳任何資料/);
  assert.match(dialogSource, /RECOMMENDATION_LABELS/);
  assert.match(dialogSource, /重新讀取/);
  assert.match(dialogSource, /captureEnabled = false/);
  assert.match(dialogSource, /onCaptureLocal\?: \(item: SalesPhotoEvidencePendingCreationListItem\) => void \| Promise<void>/);
  assert.doesNotMatch(dialogSource, /db\.|supabase|recordEvent|enqueue|drain|upload|getUserMedia|signedUrl|signed_url|\bR2\b/i);
  assert.doesNotMatch(dialogSource, /add\(|put\(|update\(|delete\(|clear\(|bulkAdd\(/);
});

runTest('owner and staff market detail wire pending count and dialog without cloud writes', () => {
  for (const source of [ownerPageSource, staffViewSource]) {
    assert.match(source, /SalesPhotoEvidencePendingListDialog/);
    assert.match(source, /listLocalSalesPhotoEvidencePendingCreationsForMarket/);
    assert.match(source, /pendingCount=\{pendingSalesPhotoEvidenceItems\.length\}/);
    assert.match(source, /onOpenPendingEvidence=\{handleOpenPendingSalesPhotoEvidence\}/);
    assert.match(source, /loadError=\{pendingSalesPhotoEvidenceLoadError\}/);
    assert.match(source, /lastLoadedAt=\{pendingSalesPhotoEvidenceLoadedAt\}/);
    assert.match(source, /onRefresh=\{loadPendingSalesPhotoEvidenceItems\}/);
    assert.doesNotMatch(
      source,
      /enqueuePendingSalesPhotoEvidenceCreation|createDexieSalesPhotoEvidencePendingCreationStorage|drainSalesPhotoEvidencePendingCreations|upload|getUserMedia|signedUrl|signed_url|\bR2\b/i
    );
  }

  assert.match(staffViewSource, /captureAndStoreSalesPhotoEvidenceWithFileInput/);
  assert.match(staffViewSource, /captureEnabled=\{true\}/);
  assert.match(staffViewSource, /onCaptureLocal=\{handleCaptureLocalSalesPhotoEvidence\}/);
  assert.doesNotMatch(ownerPageSource, /captureAndStoreSalesPhotoEvidenceWithFileInput|captureEnabled=\{true\}|onCaptureLocal=\{/);
});

runTest('plan and npm test include Slice 5C-3C and 5C-3D pending list guardrails', () => {
  assert.match(planSource, /Slice 5C-3C Status/);
  assert.match(planSource, /pending evidence list UI shell/i);
  assert.match(planSource, /local-only read model/);
  assert.match(planSource, /Slice 5C-3D Status/);
  assert.match(planSource, /read-only pending list UX polish/);
  assert.match(planSource, /Slice 5C-3H-1 Status/);
  assert.match(planSource, /read-only diagnostics display/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-pending-list-ui\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence pending list UI tests failed`);
  }
}

main();
