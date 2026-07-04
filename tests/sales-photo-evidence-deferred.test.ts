import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { planDeferredSalesPhotoEvidenceCreation } from '../lib/sales/photo-evidence-deferred';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const deferredSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-deferred.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';
const SALE_EVENT_ID = '33333333-3333-4333-8333-333333333333';
const STAFF_ID = '44444444-4444-4444-8444-444444444444';

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function makeSyncedInput() {
  return {
    dealEvent: {
      id: SALE_EVENT_ID,
      type: 'deal_closed',
      sync_status: 'synced',
    },
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    marketRequiresEvidence: true,
    capturedByStaffId: STAFF_ID,
    saleCompletedAt: '2026-07-05T10:00:00.000Z',
    now: '2026-07-05T10:00:01.000Z',
  };
}

console.log('\n=== Sales photo evidence deferred creation planner ===');

runTest('waits for event sync before creating evidence for local or uncertain events', () => {
  for (const syncStatus of ['local_only', 'pending', 'error', 'conflict', null]) {
    const result = planDeferredSalesPhotoEvidenceCreation({
      ...makeSyncedInput(),
      dealEvent: {
        id: SALE_EVENT_ID,
        type: 'deal_closed',
        sync_status: syncStatus,
      },
    });

    assert.equal(result.action, 'wait_for_event_sync');
    assert.equal(result.reason, 'deal_event_not_synced');
    assert.equal(result.syncStatus, syncStatus);
    assert.equal(result.dealEventId, SALE_EVENT_ID);
  }
});

runTest('blocks missing sale event ids fail-closed', () => {
  const result = planDeferredSalesPhotoEvidenceCreation({
    ...makeSyncedInput(),
    dealEvent: {
      type: 'deal_closed',
      sync_status: 'synced',
    },
  });

  assert.equal(result.action, 'blocked');
  assert.equal(result.reason, 'missing_deal_event_id');
});

runTest('blocks non-deal_closed events fail-closed', () => {
  const result = planDeferredSalesPhotoEvidenceCreation({
    ...makeSyncedInput(),
    dealEvent: {
      id: SALE_EVENT_ID,
      type: 'interaction_recorded',
      sync_status: 'synced',
    },
  });

  assert.equal(result.action, 'blocked');
  assert.equal(result.reason, 'not_deal_closed_event');
});

runTest('creates a pending draft only for synced deal_closed events when the market requires evidence', () => {
  const result = planDeferredSalesPhotoEvidenceCreation(makeSyncedInput());

  assert.equal(result.action, 'ready_to_create');
  assert.equal(result.reason, 'synced_deal_requires_evidence');
  assert.equal(result.draft.sale_id, SALE_EVENT_ID);
  assert.equal(result.draft.market_id, MARKET_ID);
  assert.equal(result.draft.owner_id, OWNER_ID);
  assert.equal(result.draft.status, 'pending_capture');
});

runTest('returns not_required when the market setting is off even after event sync', () => {
  const result = planDeferredSalesPhotoEvidenceCreation({
    ...makeSyncedInput(),
    marketRequiresEvidence: false,
  });

  assert.equal(result.action, 'not_required');
  assert.equal(result.reason, 'market_not_required');
});

runTest('skips creation when active evidence already exists for the sale', () => {
  const result = planDeferredSalesPhotoEvidenceCreation({
    ...makeSyncedInput(),
    existingEvidence: [{ sale_id: SALE_EVENT_ID, deleted_at: null, status: 'pending_capture' }],
  });

  assert.equal(result.action, 'skip_existing');
  assert.equal(result.reason, 'active_evidence_exists');
});

runTest('invalid requirement data is blocked instead of thrown', () => {
  const result = planDeferredSalesPhotoEvidenceCreation({
    ...makeSyncedInput(),
    ownerId: 'not-a-uuid',
  });

  assert.equal(result.action, 'blocked');
  assert.equal(result.reason, 'invalid_requirement_input');
  assert.match(result.errorMessage ?? '', /ownerId must be a UUID/);
});

runTest('deferred planner stays pure and is covered by the package test script', () => {
  assert.doesNotMatch(deferredSource, /@\/lib\/supabase|supabase|from\(/);
  assert.doesNotMatch(deferredSource, /@\/lib\/db|recordEvent|recordDeal|getUserMedia|uploadEvidence|signedUrl|signed_url|R2/i);
  assert.doesNotMatch(deferredSource, /fetch\(|window\.|document\./);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-deferred\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence deferred tests failed`);
  }
}

main();
