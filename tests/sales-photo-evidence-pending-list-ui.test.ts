import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '../lib/db';
import {
  listLocalSalesPhotoEvidencePendingCreationsForMarket,
} from '../lib/sales/photo-evidence-pending-creation-read-model';
import {
  createLocalPendingSalesPhotoEvidenceCreation,
  markPendingSalesPhotoEvidenceCreationCreated,
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
const dialogSource = readProjectFile('components/markets/SalesPhotoEvidenceFlowDialog.tsx');
const taskCardSource = readProjectFile('components/markets/SalesPhotoEvidencePendingTaskCard.tsx');
const flowHookSource = readProjectFile('hooks/useSalesPhotoEvidenceFlow.ts');
const workspaceSource = readProjectFile('components/sales/TransactionWorkspace.tsx');
const ownerPageSource = readProjectFile('components/markets/MarketDetailScreen.tsx');
const staffViewSource = readProjectFile('components/markets/StaffMarketDetailView.tsx');
const planSource = readProjectFile('docs/SALES_CHECKOUT_PHOTO_EVIDENCE_UIUX_OPTIMIZATION_PLAN_2026_07_15.md');
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

runTest('completed uploads no longer remain in the pending count', async () => {
  const pending = makeItem('33333333-3333-4333-8333-333333333333');
  const uploaded = markPendingSalesPhotoEvidenceCreationCreated(
    makeItem('55555555-5555-4555-8555-555555555555'),
    '2026-07-05T10:05:00.000Z'
  );

  await withMockedQueue([pending, uploaded], async () => {
    const rows = await listLocalSalesPhotoEvidencePendingCreationsForMarket(MARKET_ID);
    assert.deepEqual(rows.map(row => row.saleEventId), [pending.saleEventId]);
  });
});

runTest('pending list read model stays local-only and read-only', () => {
  assert.match(readModelSource, /db\.salesPhotoEvidencePendingCreations/);
  assert.match(readModelSource, /\.where\('marketId'\)[\s\S]*\.equals\(marketId\)[\s\S]*\.toArray\(\)/);
  assert.doesNotMatch(readModelSource, /add\(|put\(|update\(|delete\(|clear\(|bulkAdd\(|recordEvent/);
  assert.doesNotMatch(readModelSource, /supabase|sale_photo_evidence|drain|upload|getUserMedia|signedUrl|signed_url|\bR2\b/i);
});

runTest('pending list is a task view with one primary action and no operator diagnostics', () => {
  assert.match(dialogSource, /export function SalesPhotoEvidenceFlowDialog/);
  assert.match(dialogSource, /pendingItems: SalesPhotoEvidencePendingTaskItem\[\]/);
  assert.match(dialogSource, /SalesPhotoEvidencePendingTaskCard/);
  assert.match(dialogSource, /pendingItemsError\?: string \| null/);
  assert.match(dialogSource, /isLoadingPendingItems\?: boolean/);
  assert.match(dialogSource, /待補照片/);
  assert.match(taskCardSource, /transaction\.totalAmount/);
  assert.match(taskCardSource, /formatSalesPaymentMethod\(transaction\.paymentMethod\)/);
  assert.match(taskCardSource, /尚未拍照/);
  assert.match(taskCardSource, /照片尚未上傳/);
  assert.match(taskCardSource, /照片已保留，可重新上傳/);
  assert.match(taskCardSource, /payload \?/);
  assert.doesNotMatch(taskCardSource, /lastErrorMessage|retryCount|RECOMMENDATION_LABELS|severityCounts|錯誤碼/);
  assert.doesNotMatch(dialogSource, /db\.|supabase|recordEvent|enqueue|drain|getUserMedia|signedUrl|signed_url|\bR2\b|fetch\(/i);
  assert.doesNotMatch(dialogSource, /add\(|put\(|update\(|delete\(|clear\(|bulkAdd\(/);
});

runTest('owner and staff wire the shared pending task controller without cloud writes', () => {
  for (const source of [ownerPageSource, staffViewSource]) {
    assert.match(source, /useSalesPhotoEvidenceFlow/);
    assert.match(source, /SalesPhotoEvidenceFlowDialog/);
    assert.match(source, /pendingItems=\{salesPhotoEvidenceFlow\.pendingItems\}/);
    assert.match(source, /pendingPhotoCount=\{salesPhotoEvidenceFlow\.pendingCount\}/);
    assert.match(source, /onOpenPendingPhotos=\{handleOpenPendingSalesPhotoEvidence\}/);
    assert.match(source, /onRefresh=\{\(\) => void salesPhotoEvidenceFlow\.loadPendingItems\(\)\}/);
    assert.doesNotMatch(
      source,
      /captureAndStoreSalesPhotoEvidenceWithFileInput|uploadPendingSalesPhotoEvidenceManually|createDexieSalesPhotoEvidencePendingCreationStorage|drainSalesPhotoEvidencePendingCreations|getUserMedia|signedUrl|signed_url|\bR2\b/i
    );
  }

  assert.match(flowHookSource, /listLocalSalesPhotoEvidencePendingTasksForMarket/);
  assert.match(flowHookSource, /captureAndStoreSalesPhotoEvidenceWithFileInput/);
  assert.match(flowHookSource, /uploadPendingSalesPhotoEvidenceManually/);
  assert.match(workspaceSource, /onOpenPendingPhotos/);
});

runTest('plan and npm test include Slice 5C-3C and 5C-3D pending list guardrails', () => {
  assert.match(planSource, /將待補清單改為任務清單/);
  assert.match(planSource, /金額、支付方式及商品摘要/);
  assert.match(planSource, /隱藏一般操作者不需要的診斷資訊/);
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
