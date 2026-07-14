import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  recordDealWithOptionalSalesPhotoEvidence,
  type SalesPhotoEvidenceRuntimeDeps,
} from '../lib/sales/photo-evidence-runtime-enqueue';
import { resolveSalesPhotoEvidenceRuntimeGateStatus } from '../lib/sales/photo-evidence-runtime-flags';
import type { DealClosedPayload } from '../types/db';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const flagSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-runtime-flags.ts'), 'utf8');
const wrapperSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-runtime-enqueue.ts'), 'utf8');
const addRevenueDialogSource = readFileSync(join(projectRoot, 'components/markets/AddRevenueDialog.tsx'), 'utf8');
const quickRevenueSource = readFileSync(join(projectRoot, 'components/sales/QuickInteractionButtons.tsx'), 'utf8');
const quickTransactionSource = readFileSync(join(projectRoot, 'components/sales/QuickTransactionGrid.tsx'), 'utf8');
const cartDrawerSource = readFileSync(join(projectRoot, 'components/sales/CartDrawer.tsx'), 'utf8');
const testPageSource = readFileSync(join(projectRoot, 'app/debug/sales-photo-evidence/page.tsx'), 'utf8');
const testWorkbenchSource = readFileSync(join(projectRoot, 'components/markets/SalesPhotoEvidenceTestWorkbench.tsx'), 'utf8');
const ownerMarketDetailSource = readFileSync(join(projectRoot, 'app/markets/[id]/page.tsx'), 'utf8');
const staffMarketDetailSource = readFileSync(join(projectRoot, 'components/markets/StaffMarketDetailView.tsx'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

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

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function makeDeps(options: {
  enabled: boolean;
  order?: string[];
  createThrows?: boolean;
}): SalesPhotoEvidenceRuntimeDeps {
  const order = options.order ?? [];

  return {
    isRuntimeEnqueueEnabled: () => options.enabled,
    recordDeal: async () => {
      order.push('recordDeal');
      return SALE_EVENT_ID;
    },
    createPendingEvidence: async () => {
      order.push('createPendingEvidence');
      if (options.createThrows) {
        throw new Error('enqueue failed');
      }
    },
  };
}

console.log('\n=== Sales photo evidence runtime enqueue ===');

runTest('runtime gate enables local and requires explicit staging or production opt-in', () => {
  assert.match(flagSource, /salesPhotoEvidenceRuntimeEnqueue/);
  assert.deepEqual(resolveSalesPhotoEvidenceRuntimeGateStatus({ nodeEnv: 'development' }), {
    enabled: true,
    environment: 'local',
    reason: 'local_default',
  });
  assert.equal(resolveSalesPhotoEvidenceRuntimeGateStatus({
    nodeEnv: 'production',
    publicAppEnv: 'staging',
    explicitSetting: '1',
  }).enabled, true);
  assert.equal(resolveSalesPhotoEvidenceRuntimeGateStatus({
    nodeEnv: 'production',
    publicAppEnv: 'staging',
  }).enabled, false);
  assert.deepEqual(resolveSalesPhotoEvidenceRuntimeGateStatus({
    nodeEnv: 'production',
    publicAppEnv: 'production',
    explicitSetting: '1',
  }), {
    enabled: false,
    environment: 'production',
    reason: 'production_locked',
  });
  assert.deepEqual(resolveSalesPhotoEvidenceRuntimeGateStatus({
    nodeEnv: 'production',
    publicAppEnv: 'production',
    explicitSetting: '1',
    allowProductionSetting: '1',
  }), {
    enabled: true,
    environment: 'production',
    reason: 'production_enabled',
  });
  assert.equal(resolveSalesPhotoEvidenceRuntimeGateStatus({
    nodeEnv: 'production',
    publicAppEnv: 'production',
    allowProductionSetting: '1',
  }).enabled, false);
  assert.doesNotMatch(flagSource, /localStorage|sessionStorage|remoteConfig|fetch\(/);
});

runTest('disabled runtime path records the sale only and does not enqueue evidence', async () => {
  const order: string[] = [];
  const result = await recordDealWithOptionalSalesPhotoEvidence(deal, '2026-07-05', {
    deps: makeDeps({ enabled: false, order }),
  });

  assert.equal(result.dealEventId, SALE_EVENT_ID);
  assert.equal(result.evidence.status, 'runtime_disabled');
  assert.deepEqual(order, ['recordDeal']);
});

runTest('enabled runtime path records sale but does not enqueue when required context is missing', async () => {
  const order: string[] = [];
  const result = await recordDealWithOptionalSalesPhotoEvidence(deal, '2026-07-05', {
    deps: makeDeps({ enabled: true, order }),
  });

  assert.equal(result.dealEventId, SALE_EVENT_ID);
  assert.equal(result.evidence.status, 'context_missing');
  assert.deepEqual(
    result.evidence.status === 'context_missing' ? result.evidence.missingFields : [],
    ['ownerId', 'marketId', 'marketRequiresEvidence', 'saleCompletedAt']
  );
  assert.deepEqual(order, ['recordDeal']);
});

runTest('enabled runtime path enqueues after sale when full context is available', async () => {
  const order: string[] = [];
  const result = await recordDealWithOptionalSalesPhotoEvidence(deal, '2026-07-05', {
    evidenceContext: {
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
      marketRequiresEvidence: true,
      capturedByStaffId: STAFF_ID,
      saleCompletedAt: '2026-07-05T10:00:00.000Z',
      now: '2026-07-05T10:00:01.000Z',
    },
    deps: makeDeps({ enabled: true, order }),
  });

  assert.equal(result.dealEventId, SALE_EVENT_ID);
  assert.equal(result.evidence.status, 'created');
  assert.deepEqual(order, ['recordDeal', 'createPendingEvidence']);
});

runTest('enabled runtime path keeps sale success when evidence enqueue fails', async () => {
  const errors: unknown[] = [];
  const order: string[] = [];
  const result = await recordDealWithOptionalSalesPhotoEvidence(deal, '2026-07-05', {
    evidenceContext: {
      ownerId: OWNER_ID,
      marketId: MARKET_ID,
      marketRequiresEvidence: true,
      saleCompletedAt: '2026-07-05T10:00:00.000Z',
    },
    deps: {
      ...makeDeps({ enabled: true, order, createThrows: true }),
      onEvidenceError: error => errors.push(error),
    },
  });

  assert.equal(result.dealEventId, SALE_EVENT_ID);
  assert.equal(result.evidence.status, 'failed');
  assert.equal(errors.length, 1);
  assert.deepEqual(order, ['recordDeal', 'createPendingEvidence']);
});

runTest('AddRevenueDialog passes submit-time evidence context into the runtime wrapper', () => {
  assert.match(addRevenueDialogSource, /recordDealWithOptionalSalesPhotoEvidence/);
  assert.doesNotMatch(addRevenueDialogSource, /import \{ useProducts,\s*recordDeal \}/);
  assert.match(addRevenueDialogSource, /salesPhotoEvidenceContext\?: Pick/);
  assert.match(addRevenueDialogSource, /const submittedAt = new Date\(\)\.toISOString\(\)/);
  assert.match(addRevenueDialogSource, /saleCompletedAt: submittedAt/);
  assert.match(addRevenueDialogSource, /now: submittedAt/);
  assert.match(addRevenueDialogSource, /evidenceContext:\s*createSalesPhotoEvidenceRuntimeContext\(\)/);
});

runTest('owner and staff market detail provide scoped local runtime context', () => {
  assert.match(ownerMarketDetailSource, /addRevenueSalesPhotoEvidenceContext/);
  assert.match(ownerMarketDetailSource, /ownerId:[\s\S]*owner_id[\s\S]*user\?\.id[\s\S]*null/);
  assert.match(ownerMarketDetailSource, /marketRequiresEvidence: salesPhotoEvidenceRequired/);
  assert.match(ownerMarketDetailSource, /capturedByStaffId: null/);
  assert.match(ownerMarketDetailSource, /salesPhotoEvidenceContext=\{addRevenueSalesPhotoEvidenceContext\}/);

  assert.match(staffMarketDetailSource, /addRevenueSalesPhotoEvidenceContext/);
  assert.match(staffMarketDetailSource, /ownerId:[\s\S]*relationship_owner_id[\s\S]*owner_id[\s\S]*userRole\.ownerId[\s\S]*null/);
  assert.match(staffMarketDetailSource, /marketRequiresEvidence: salesPhotoEvidenceRequired/);
  assert.match(staffMarketDetailSource, /capturedByStaffId: isOwner \? null : user\?\.id \?\? null/);
  assert.match(staffMarketDetailSource, /salesPhotoEvidenceContext=\{addRevenueSalesPhotoEvidenceContext\}/);
});

runTest('all visible transaction entries use the optional evidence wrapper and result callback', () => {
  for (const source of [addRevenueDialogSource, quickRevenueSource, quickTransactionSource, cartDrawerSource]) {
    assert.match(source, /recordDealWithOptionalSalesPhotoEvidence/);
    assert.match(source, /onSalesPhotoEvidenceResult/);
  }

  assert.match(staffMarketDetailSource, /SalesPhotoEvidencePostSalePrompt/);
  assert.match(ownerMarketDetailSource, /SalesPhotoEvidencePostSalePrompt/);
  assert.match(staffMarketDetailSource, /handleSalesPhotoEvidenceResult/);
  assert.match(staffMarketDetailSource, /handleCaptureLocalSalesPhotoEvidence\(postSaleSalesPhotoEvidenceItem\)/);
});

runTest('local and staging test page is production locked and provides real capture/upload controls', () => {
  assert.match(testPageSource, /deploymentEnv === 'production'/);
  assert.match(testPageSource, /SALES_PHOTO_EVIDENCE_TEST_PAGE_ENABLED/);
  assert.match(testWorkbenchSource, /\[TEST\] 成交照片測試頁建立/);
  assert.match(testWorkbenchSource, /recordDealWithOptionalSalesPhotoEvidence/);
  assert.match(testWorkbenchSource, /captureAndStoreSalesPhotoEvidenceWithFileInput/);
  assert.match(testWorkbenchSource, /uploadPendingSalesPhotoEvidenceManually/);
});

runTest('runtime wrapper does not write cloud evidence or start capture upload behavior', () => {
  assert.doesNotMatch(wrapperSource, /@\/lib\/supabase|supabase|from\(/);
  assert.doesNotMatch(wrapperSource, /getUserMedia|uploadEvidence|signedUrl|signed_url|R2/i);
});

runTest('full test suite includes runtime enqueue implementation guardrails', () => {
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-runtime-enqueue\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence runtime enqueue tests failed`);
  }
}

main();
