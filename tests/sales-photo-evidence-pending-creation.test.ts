import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildPendingSalesPhotoEvidenceCreationIdempotencyKey,
  classifyPendingSalesPhotoEvidenceCreationCandidate,
  createLocalPendingSalesPhotoEvidenceCreation,
  markPendingSalesPhotoEvidenceCreationBlocked,
  markPendingSalesPhotoEvidenceCreationCreated,
  markPendingSalesPhotoEvidenceCreationCreating,
  markPendingSalesPhotoEvidenceCreationPermanentFailure,
  markPendingSalesPhotoEvidenceCreationRetryableFailure,
} from '../lib/sales/photo-evidence-pending-creation';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const pendingCreationSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-pending-creation.ts'), 'utf8');
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

function makeItem() {
  return createLocalPendingSalesPhotoEvidenceCreation({
    saleEventId: SALE_EVENT_ID,
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    capturedByStaffId: STAFF_ID,
    saleCompletedAt: '2026-07-05T10:00:00.000Z',
    now: '2026-07-05T10:00:01.000Z',
  });
}

function makeEvent(syncStatus: string | null = 'synced') {
  return {
    id: SALE_EVENT_ID,
    type: 'deal_closed',
    sync_status: syncStatus,
  };
}

console.log('\n=== Sales photo evidence pending creation queue model ===');

runTest('creates a local queue item keyed by sale event id without writing runtime state', () => {
  const item = makeItem();

  assert.equal(item.queueId, SALE_EVENT_ID);
  assert.equal(item.saleEventId, SALE_EVENT_ID);
  assert.equal(item.status, 'waiting_for_event_sync');
  assert.equal(item.retryCount, 0);
  assert.equal(item.idempotencyKey, `sales-photo-evidence:${SALE_EVENT_ID}`);
  assert.equal(buildPendingSalesPhotoEvidenceCreationIdempotencyKey(SALE_EVENT_ID), item.idempotencyKey);
});

runTest('waits while the source deal_closed event is not synced', () => {
  const item = makeItem();

  for (const syncStatus of ['local_only', 'pending', 'error', 'conflict', null]) {
    const decision = classifyPendingSalesPhotoEvidenceCreationCandidate(item, makeEvent(syncStatus));

    assert.equal(decision.eligible, false);
    assert.equal(decision.reason, 'event_not_synced');
  }
});

runTest('becomes eligible only after the source deal_closed event is synced', () => {
  const decision = classifyPendingSalesPhotoEvidenceCreationCandidate(makeItem(), makeEvent(), {
    now: '2026-07-05T10:00:02.000Z',
  });

  assert.equal(decision.eligible, true);
  assert.equal(decision.reason, 'eligible');
  assert.equal(decision.draft.sale_id, SALE_EVENT_ID);
  assert.equal(decision.draft.status, 'pending_capture');
  assert.equal(decision.draft.created_at, '2026-07-05T10:00:02.000Z');
});

runTest('blocks mismatched source events and non-sale source events fail-closed', () => {
  const mismatched = classifyPendingSalesPhotoEvidenceCreationCandidate(makeItem(), {
    id: '55555555-5555-4555-8555-555555555555',
    type: 'deal_closed',
    sync_status: 'synced',
  });
  const wrongType = classifyPendingSalesPhotoEvidenceCreationCandidate(makeItem(), {
    id: SALE_EVENT_ID,
    type: 'interaction_recorded',
    sync_status: 'synced',
  });

  assert.equal(mismatched.eligible, false);
  assert.equal(mismatched.reason, 'source_event_mismatch');
  assert.equal(wrongType.eligible, false);
  assert.equal(wrongType.reason, 'source_invalid');
});

runTest('blocks duplicate creation when active evidence already exists', () => {
  const decision = classifyPendingSalesPhotoEvidenceCreationCandidate(makeItem(), makeEvent(), {
    existingEvidence: [{ sale_id: SALE_EVENT_ID, deleted_at: null, status: 'pending_capture' }],
  });

  assert.equal(decision.eligible, false);
  assert.equal(decision.reason, 'active_evidence_exists');
});

runTest('blocks non-runnable terminal statuses', () => {
  const created = markPendingSalesPhotoEvidenceCreationCreated(makeItem(), '2026-07-05T10:01:00.000Z');
  const creating = markPendingSalesPhotoEvidenceCreationCreating(makeItem(), '2026-07-05T10:01:00.000Z');
  const permanent = markPendingSalesPhotoEvidenceCreationPermanentFailure(makeItem(), {
    code: 'invalid_payload',
    message: 'bad payload',
    now: '2026-07-05T10:01:00.000Z',
  });
  const blocked = markPendingSalesPhotoEvidenceCreationBlocked(makeItem(), {
    code: 'invalid_source',
    message: 'bad source',
    now: '2026-07-05T10:01:00.000Z',
  });

  for (const item of [created, creating, permanent, blocked]) {
    const decision = classifyPendingSalesPhotoEvidenceCreationCandidate(item, makeEvent());
    assert.equal(decision.eligible, false);
    assert.equal(decision.reason, 'status_not_retryable');
  }
});

runTest('allows retryable rows below retry limit and blocks rows at retry limit', () => {
  const retryable = markPendingSalesPhotoEvidenceCreationRetryableFailure(makeItem(), {
    code: 'network_error',
    message: 'temporary outage',
    now: '2026-07-05T10:01:00.000Z',
  });
  const eligible = classifyPendingSalesPhotoEvidenceCreationCandidate(retryable, makeEvent(), {
    maxRetryCount: 3,
  });
  const exhausted = classifyPendingSalesPhotoEvidenceCreationCandidate(
    { ...retryable, retryCount: 3 },
    makeEvent(),
    { maxRetryCount: 3 }
  );

  assert.equal(eligible.eligible, true);
  assert.equal(eligible.reason, 'eligible');
  assert.equal(exhausted.eligible, false);
  assert.equal(exhausted.reason, 'max_retry_exceeded');
});

runTest('pending creation model stays pure and is not mounted in production sync yet', () => {
  assert.doesNotMatch(pendingCreationSource, /@\/lib\/supabase|supabase|from\(/);
  assert.doesNotMatch(pendingCreationSource, /@\/lib\/db|recordEvent|recordDeal|getUserMedia|uploadEvidence|signedUrl|signed_url|R2/i);
  assert.doesNotMatch(pendingCreationSource, /fetch\(|window\.|document\./);

  const productionFiles = [
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
    'components/markets/SalesPhotoEvidenceOperatingCard.tsx',
    'components/markets/StaffMarketDetailView.tsx',
  ];

  const matches = productionFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /photo-evidence-pending-creation|classifyPendingSalesPhotoEvidenceCreationCandidate/.test(source);
  });

  assert.deepEqual(matches, []);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-pending-creation\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence pending creation tests failed`);
  }
}

main();
