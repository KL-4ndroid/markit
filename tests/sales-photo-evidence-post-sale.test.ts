import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DealClosedPayload } from '../types/db';
import {
  recordDealWithPhotoEvidenceRequirement,
  type CreatePendingSalesPhotoEvidence,
  type RecordDealForPhotoEvidence,
} from '../lib/sales/photo-evidence-post-sale';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const postSaleSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-post-sale.ts'), 'utf8');
const hooksSource = readFileSync(join(projectRoot, 'lib/db/hooks.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

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

function makeRecordDeal(order: string[] = []): RecordDealForPhotoEvidence {
  return async () => {
    order.push('recordDeal');
    return SALE_EVENT_ID;
  };
}

console.log('\n=== Sales photo evidence post-sale orchestration ===');

runTest('recordDeal returns the committed deal_closed event id', () => {
  assert.match(
    hooksSource,
    /export async function recordDeal\([\s\S]*\): Promise<string>[\s\S]*return await recordEvent\('deal_closed', payload\)/
  );
});

runTest('wrapper records the sale first and returns a pending evidence draft without inserting by default', async () => {
  const order: string[] = [];
  const result = await recordDealWithPhotoEvidenceRequirement({
    deal,
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    marketRequiresEvidence: true,
    capturedByStaffId: STAFF_ID,
    saleCompletedAt: '2026-07-05T10:00:00.000Z',
    now: '2026-07-05T10:00:01.000Z',
    recordDeal: makeRecordDeal(order),
  });

  assert.deepEqual(order, ['recordDeal']);
  assert.equal(result.dealEventId, SALE_EVENT_ID);
  assert.equal(result.evidence.status, 'draft_ready');
  assert.equal(result.evidence.status === 'draft_ready' && result.evidence.decision.draft.sale_id, SALE_EVENT_ID);
});

runTest('wrapper does not create evidence when market setting is off', async () => {
  let createCalled = false;
  const result = await recordDealWithPhotoEvidenceRequirement({
    deal,
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    marketRequiresEvidence: false,
    saleCompletedAt: '2026-07-05T10:00:00.000Z',
    recordDeal: makeRecordDeal(),
    createPendingEvidence: async () => {
      createCalled = true;
    },
  });

  assert.equal(result.evidence.status, 'not_required');
  assert.equal(createCalled, false);
});

runTest('wrapper skips evidence insert when active evidence already exists', async () => {
  let createCalled = false;
  const result = await recordDealWithPhotoEvidenceRequirement({
    deal,
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    marketRequiresEvidence: true,
    saleCompletedAt: '2026-07-05T10:00:00.000Z',
    existingEvidence: [{ sale_id: SALE_EVENT_ID, deleted_at: null, status: 'pending_capture' }],
    recordDeal: makeRecordDeal(),
    createPendingEvidence: async () => {
      createCalled = true;
    },
  });

  assert.equal(result.evidence.status, 'skipped_existing');
  assert.equal(createCalled, false);
});

runTest('wrapper inserts pending evidence after sale when a persister is explicitly provided', async () => {
  const order: string[] = [];
  const drafts: unknown[] = [];
  const createPendingEvidence: CreatePendingSalesPhotoEvidence = async draft => {
    order.push('createPendingEvidence');
    drafts.push(draft);
  };

  const result = await recordDealWithPhotoEvidenceRequirement({
    deal,
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    marketRequiresEvidence: true,
    saleCompletedAt: '2026-07-05T10:00:00.000Z',
    now: '2026-07-05T10:00:01.000Z',
    recordDeal: makeRecordDeal(order),
    createPendingEvidence,
  });

  assert.deepEqual(order, ['recordDeal', 'createPendingEvidence']);
  assert.equal(result.evidence.status, 'created');
  assert.equal(drafts.length, 1);
});

runTest('evidence failure does not throw or roll back the recorded sale result', async () => {
  const errors: unknown[] = [];
  const result = await recordDealWithPhotoEvidenceRequirement({
    deal,
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    marketRequiresEvidence: true,
    saleCompletedAt: '2026-07-05T10:00:00.000Z',
    recordDeal: makeRecordDeal(),
    createPendingEvidence: async () => {
      throw new Error('evidence insert failed');
    },
    onEvidenceError: error => errors.push(error),
  });

  assert.equal(result.dealEventId, SALE_EVENT_ID);
  assert.equal(result.evidence.status, 'failed');
  assert.equal(errors.length, 1);
});

runTest('sale failure still throws and never attempts evidence creation', async () => {
  let createCalled = false;
  await assert.rejects(
    () =>
      recordDealWithPhotoEvidenceRequirement({
        deal,
        ownerId: OWNER_ID,
        marketId: MARKET_ID,
        marketRequiresEvidence: true,
        saleCompletedAt: '2026-07-05T10:00:00.000Z',
        recordDeal: async () => {
          throw new Error('sale failed');
        },
        createPendingEvidence: async () => {
          createCalled = true;
        },
      }),
    /sale failed/
  );
  assert.equal(createCalled, false);
});

runTest('post-sale wrapper is not wired to Supabase or UI entry points yet', () => {
  assert.doesNotMatch(postSaleSource, /@\/lib\/supabase|supabase|from\(/);
  assert.doesNotMatch(postSaleSource, /@\/lib\/db\/hooks|recordEvent|getUserMedia|uploadEvidence|signedUrl|signed_url|R2/i);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-post-sale\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence post-sale tests failed`);
  }
}

main();
