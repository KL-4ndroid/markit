import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  drainPendingSalesPhotoEvidenceCreations,
  type SalesPhotoEvidencePendingCreationStorage,
} from '../lib/sales/photo-evidence-pending-creation-drain';
import {
  createLocalPendingSalesPhotoEvidenceCreation,
  markPendingSalesPhotoEvidenceCreationRetryableFailure,
  type LocalPendingSalesPhotoEvidenceCreation,
} from '../lib/sales/photo-evidence-pending-creation';
import type { DeferredSalesPhotoEvidenceEvent } from '../lib/sales/photo-evidence-deferred';
import type { SalesPhotoEvidenceExistingRow, SalesPhotoEvidencePendingDraft } from '../lib/sales/photo-evidence-model';

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const drainSource = readFileSync(join(projectRoot, 'lib/sales/photo-evidence-pending-creation-drain.ts'), 'utf8');
const dbSource = readFileSync(join(projectRoot, 'lib/db/index.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';
const SALE_EVENT_ID = '33333333-3333-4333-8333-333333333333';
const STAFF_ID = '44444444-4444-4444-8444-444444444444';
const NOW = '2026-07-05T10:00:02.000Z';

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function makeItem(): LocalPendingSalesPhotoEvidenceCreation {
  return createLocalPendingSalesPhotoEvidenceCreation({
    saleEventId: SALE_EVENT_ID,
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    capturedByStaffId: STAFF_ID,
    saleCompletedAt: '2026-07-05T10:00:00.000Z',
    now: '2026-07-05T10:00:01.000Z',
  });
}

function makeEvent(syncStatus: string | null = 'synced'): DeferredSalesPhotoEvidenceEvent {
  return {
    id: SALE_EVENT_ID,
    type: 'deal_closed',
    sync_status: syncStatus,
  };
}

function makeStorage(overrides: Partial<SalesPhotoEvidencePendingCreationStorage> = {}) {
  const calls: string[] = [];
  const storage: SalesPhotoEvidencePendingCreationStorage = {
    listRunnableCreations: async () => {
      calls.push('listRunnableCreations');
      return [makeItem()];
    },
    getSourceDealEvent: async () => {
      calls.push('getSourceDealEvent');
      return makeEvent();
    },
    listExistingEvidenceForSale: async () => {
      calls.push('listExistingEvidenceForSale');
      return [];
    },
    markCreating: async () => {
      calls.push('markCreating');
    },
    markCreated: async () => {
      calls.push('markCreated');
    },
    markRetryableFailure: async () => {
      calls.push('markRetryableFailure');
    },
    markPermanentFailure: async () => {
      calls.push('markPermanentFailure');
    },
    markBlocked: async () => {
      calls.push('markBlocked');
    },
    ...overrides,
  };

  return { storage, calls };
}

console.log('\n=== Sales photo evidence pending creation drain boundary ===');

runTest('drain is disabled by default and does not call storage or writer', async () => {
  const { storage, calls } = makeStorage();
  let writerCalled = false;

  const result = await drainPendingSalesPhotoEvidenceCreations({
    storage,
    createPendingEvidence: async () => {
      writerCalled = true;
    },
  });

  assert.equal(result.status, 'disabled');
  assert.equal(result.processedCount, 0);
  assert.equal(writerCalled, false);
  assert.deepEqual(calls, []);
});

runTest('enabled drain creates evidence only after source event is synced', async () => {
  const { storage, calls } = makeStorage();
  const drafts: SalesPhotoEvidencePendingDraft[] = [];

  const result = await drainPendingSalesPhotoEvidenceCreations({
    enabled: true,
    storage,
    now: NOW,
    createPendingEvidence: async draft => {
      drafts.push(draft);
    },
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.createdCount, 1);
  assert.equal(result.processedCount, 1);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].sale_id, SALE_EVENT_ID);
  assert.deepEqual(calls, [
    'listRunnableCreations',
    'getSourceDealEvent',
    'listExistingEvidenceForSale',
    'markCreating',
    'markCreated',
  ]);
});

runTest('enabled drain waits without mutation when source event is not synced', async () => {
  const { storage, calls } = makeStorage({
    getSourceDealEvent: async () => {
      calls.push('getSourceDealEvent');
      return makeEvent('pending');
    },
  });
  let writerCalled = false;

  const result = await drainPendingSalesPhotoEvidenceCreations({
    enabled: true,
    storage,
    createPendingEvidence: async () => {
      writerCalled = true;
    },
  });

  assert.equal(result.waitCount, 1);
  assert.equal(result.itemResults[0].result, 'wait_for_event_sync');
  assert.equal(writerCalled, false);
  assert.deepEqual(calls, ['listRunnableCreations', 'getSourceDealEvent', 'listExistingEvidenceForSale']);
});

runTest('enabled drain marks queue fulfilled when active evidence already exists', async () => {
  const existingEvidence: SalesPhotoEvidenceExistingRow = {
    sale_id: SALE_EVENT_ID,
    deleted_at: null,
    status: 'pending_capture',
  };
  const { storage, calls } = makeStorage({
    listExistingEvidenceForSale: async () => {
      calls.push('listExistingEvidenceForSale');
      return [existingEvidence];
    },
  });
  let writerCalled = false;

  const result = await drainPendingSalesPhotoEvidenceCreations({
    enabled: true,
    storage,
    createPendingEvidence: async () => {
      writerCalled = true;
    },
  });

  assert.equal(result.skippedExistingCount, 1);
  assert.equal(result.itemResults[0].result, 'skipped_existing');
  assert.equal(writerCalled, false);
  assert.deepEqual(calls, ['listRunnableCreations', 'getSourceDealEvent', 'listExistingEvidenceForSale', 'markCreated']);
});

runTest('enabled drain blocks missing source event fail-closed', async () => {
  const { storage, calls } = makeStorage({
    getSourceDealEvent: async () => {
      calls.push('getSourceDealEvent');
      return null;
    },
  });

  const result = await drainPendingSalesPhotoEvidenceCreations({
    enabled: true,
    storage,
    createPendingEvidence: async () => {},
  });

  assert.equal(result.blockedCount, 1);
  assert.deepEqual(result.itemResults[0], {
    queueId: SALE_EVENT_ID,
    result: 'blocked',
    code: 'source_event_missing',
    message: 'Source deal event was not found for pending sales photo evidence creation.',
  });
  assert.deepEqual(calls, ['listRunnableCreations', 'getSourceDealEvent', 'markBlocked']);
});

runTest('enabled drain marks writer errors retryable without throwing', async () => {
  const { storage, calls } = makeStorage();

  const result = await drainPendingSalesPhotoEvidenceCreations({
    enabled: true,
    storage,
    createPendingEvidence: async () => {
      throw new Error('network down');
    },
  });

  assert.equal(result.retryableFailureCount, 1);
  assert.deepEqual(result.itemResults[0], {
    queueId: SALE_EVENT_ID,
    result: 'failed_retryable',
    code: 'create_pending_evidence_failed',
    message: 'network down',
  });
  assert.deepEqual(calls, [
    'listRunnableCreations',
    'getSourceDealEvent',
    'listExistingEvidenceForSale',
    'markCreating',
    'markRetryableFailure',
  ]);
});

runTest('enabled drain marks exhausted retryable rows as permanent failure', async () => {
  const exhausted = {
    ...markPendingSalesPhotoEvidenceCreationRetryableFailure(makeItem(), {
      code: 'network_error',
      message: 'temporary outage',
      now: NOW,
    }),
    retryCount: 3,
  };
  const { storage, calls } = makeStorage({
    listRunnableCreations: async () => {
      calls.push('listRunnableCreations');
      return [exhausted];
    },
  });

  const result = await drainPendingSalesPhotoEvidenceCreations({
    enabled: true,
    storage,
    maxRetryCount: 3,
    createPendingEvidence: async () => {},
  });

  assert.equal(result.blockedCount, 1);
  assert.equal(result.itemResults[0].result, 'blocked');
  assert.equal(result.itemResults[0].result === 'blocked' && result.itemResults[0].code, 'max_retry_exceeded');
  assert.deepEqual(calls, [
    'listRunnableCreations',
    'getSourceDealEvent',
    'listExistingEvidenceForSale',
    'markPermanentFailure',
  ]);
});

runTest('drain boundary is not wired to Dexie schema sync UI or Supabase yet', () => {
  assert.doesNotMatch(drainSource, /@\/lib\/supabase|supabase|from\(/);
  assert.doesNotMatch(drainSource, /@\/lib\/db|recordEvent|recordDeal|getUserMedia|uploadEvidence|signedUrl|signed_url|R2/i);
  assert.doesNotMatch(drainSource, /fetch\(|window\.|document\./);
  assert.doesNotMatch(dbSource, /pendingSalesPhotoEvidenceCreations|photoEvidencePendingCreations/);

  const productionFiles = [
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
    'components/markets/SalesPhotoEvidenceOperatingCard.tsx',
    'components/markets/StaffMarketDetailView.tsx',
    'app/markets/[id]/page.tsx',
  ];

  const matches = productionFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /photo-evidence-pending-creation-drain|drainPendingSalesPhotoEvidenceCreations/.test(source);
  });

  assert.deepEqual(matches, []);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-pending-creation-drain\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence pending creation drain tests failed`);
  }
}

main();
