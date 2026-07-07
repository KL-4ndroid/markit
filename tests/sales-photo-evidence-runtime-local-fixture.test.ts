import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import type { MarketPulseDB } from '../lib/db';
import type { DealClosedPayload } from '../types/db';
import type {
  recordDealWithOptionalSalesPhotoEvidence as RuntimeRecordFn,
} from '../lib/sales/photo-evidence-runtime-enqueue';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

(globalThis as typeof globalThis & { indexedDB: IDBFactory }).indexedDB = indexedDB;
(globalThis as typeof globalThis & { IDBKeyRange: typeof IDBKeyRange }).IDBKeyRange = IDBKeyRange;

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';
const SALE_EVENT_ID = '33333333-3333-4333-8333-333333333333';
const STAFF_ID = '44444444-4444-4444-8444-444444444444';

const deal: DealClosedPayload = {
  market_id: MARKET_ID,
  dealDate: '2026-07-05',
  items: [],
  totalAmount: 1200,
  paymentMethod: 'cash',
};

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

async function importRuntimeAndDb(): Promise<{
  db: MarketPulseDB;
  recordDealWithOptionalSalesPhotoEvidence: typeof RuntimeRecordFn;
}> {
  const [{ db }, runtime] = await Promise.all([
    import('../lib/db'),
    import('../lib/sales/photo-evidence-runtime-enqueue'),
  ]);

  return {
    db,
    recordDealWithOptionalSalesPhotoEvidence: runtime.recordDealWithOptionalSalesPhotoEvidence,
  };
}

async function resetIsolatedDb(db: MarketPulseDB): Promise<void> {
  await db.delete();
  await db.open();
}

async function runEnabledFixture(
  recordDealWithOptionalSalesPhotoEvidence: typeof RuntimeRecordFn
) {
  return recordDealWithOptionalSalesPhotoEvidence(deal, '2026-07-05', {
    evidenceContext: {
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
      marketRequiresEvidence: true,
      capturedByStaffId: STAFF_ID,
      saleCompletedAt: '2026-07-05T10:00:00.000Z',
      now: '2026-07-05T10:00:01.000Z',
    },
    deps: {
      isRuntimeEnqueueEnabled: () => true,
      recordDeal: async () => SALE_EVENT_ID,
    },
  });
}

const planSource = readProjectFile('docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md');
const packageJson = JSON.parse(readProjectFile('package.json')) as { scripts: Record<string, string> };
const testManifestSource = readProjectFile('scripts/test-files.txt');
const fixtureSource = readFileSync(__filename, 'utf8');

console.log('\n=== Sales photo evidence runtime local fixture ===');

runTest('enabled fixture uses default local storage adapter to create one pending row', async () => {
  const { db, recordDealWithOptionalSalesPhotoEvidence } = await importRuntimeAndDb();
  await resetIsolatedDb(db);

  const result = await runEnabledFixture(recordDealWithOptionalSalesPhotoEvidence);
  const rows = await db.salesPhotoEvidencePendingCreations.toArray();
  const eventCount = await db.events.count();

  assert.equal(result.dealEventId, SALE_EVENT_ID);
  assert.equal(result.evidence.status, 'created');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].queueId, SALE_EVENT_ID);
  assert.equal(rows[0].saleEventId, SALE_EVENT_ID);
  assert.equal(rows[0].ownerId, OWNER_ID);
  assert.equal(rows[0].marketId, MARKET_ID);
  assert.equal(rows[0].capturedByStaffId, STAFF_ID);
  assert.equal(rows[0].status, 'waiting_for_event_sync');
  assert.equal(rows[0].retryCount, 0);
  assert.equal(eventCount, 0);

  await db.delete();
});

runTest('fixture is idempotent for the same sale event id', async () => {
  const { db, recordDealWithOptionalSalesPhotoEvidence } = await importRuntimeAndDb();
  await resetIsolatedDb(db);

  await runEnabledFixture(recordDealWithOptionalSalesPhotoEvidence);
  await runEnabledFixture(recordDealWithOptionalSalesPhotoEvidence);
  const rows = await db.salesPhotoEvidencePendingCreations.toArray();

  assert.equal(rows.length, 1);
  assert.equal(rows[0].queueId, SALE_EVENT_ID);

  await db.delete();
});

runTest('disabled fixture records sale result without creating pending rows', async () => {
  const { db, recordDealWithOptionalSalesPhotoEvidence } = await importRuntimeAndDb();
  await resetIsolatedDb(db);

  const result = await recordDealWithOptionalSalesPhotoEvidence(deal, '2026-07-05', {
    evidenceContext: {
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
      marketRequiresEvidence: true,
      saleCompletedAt: '2026-07-05T10:00:00.000Z',
    },
    deps: {
      isRuntimeEnqueueEnabled: () => false,
      recordDeal: async () => SALE_EVENT_ID,
    },
  });
  const rows = await db.salesPhotoEvidencePendingCreations.toArray();

  assert.equal(result.evidence.status, 'runtime_disabled');
  assert.equal(rows.length, 0);

  await db.delete();
});

runTest('fixture stays isolated from production UI, cloud, upload, and drain paths', () => {
  const fixtureImports = fixtureSource
    .split('\n')
    .filter(line => line.trimStart().startsWith('import'));

  assert.match(fixtureSource, /fake-indexeddb/);
  assert.match(fixtureSource, /isRuntimeEnqueueEnabled:\s*\(\)\s*=>\s*true/);
  assert.match(fixtureSource, /await db\.delete\(\)/);
  assert.equal(fixtureImports.some(line => /supabase|getUserMedia|upload|signedUrl|signed_url|\bR2\b|drain/i.test(line)), false);
  assert.equal(fixtureImports.some(line => /localStorage|sessionStorage|process\.env|NEXT_PUBLIC/i.test(line)), false);

  const productionFiles = [
    'components/markets/AddRevenueDialog.tsx',
    'app/markets/[id]/page.tsx',
    'components/markets/StaffMarketDetailView.tsx',
    'lib/sales/photo-evidence-runtime-flags.ts',
  ];

  for (const file of productionFiles) {
    const source = readProjectFile(file);
    assert.doesNotMatch(source, /isRuntimeEnqueueEnabled:\s*\(\)\s*=>\s*true/);
    assert.doesNotMatch(source, /sales-photo-evidence-runtime-local-fixture/);
  }
});

runTest('plan and npm test record 5C-3F local fixture completion', () => {
  assert.match(planSource, /Slice 5C-3F Status/);
  assert.match(planSource, /local-only disposable runtime verification fixture/i);
  assert.match(planSource, /fake-indexeddb/i);
  assert.match(planSource, /does not change the production runtime flag/i);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-runtime-local-fixture\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence runtime local fixture tests failed`);
  }
}

main();
