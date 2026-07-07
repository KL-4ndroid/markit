import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  classifyPendingSalesPhotoEvidenceCreationRecovery,
} from '../lib/sales/photo-evidence-pending-creation-recovery';
import {
  createLocalPendingSalesPhotoEvidenceCreation,
  markPendingSalesPhotoEvidenceCreationBlocked,
  markPendingSalesPhotoEvidenceCreationCreated,
  markPendingSalesPhotoEvidenceCreationCreating,
  markPendingSalesPhotoEvidenceCreationPermanentFailure,
  markPendingSalesPhotoEvidenceCreationRetryableFailure,
  type LocalPendingSalesPhotoEvidenceCreation,
} from '../lib/sales/photo-evidence-pending-creation';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const recoverySource = readFileSync(
  join(projectRoot, 'lib/sales/photo-evidence-pending-creation-recovery.ts'),
  'utf8'
);
const planSource = readFileSync(
  join(projectRoot, 'docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';
const SALE_EVENT_ID = '33333333-3333-4333-8333-333333333333';
const STAFF_ID = '44444444-4444-4444-8444-444444444444';
const BASE_TIME = '2026-07-05T10:00:00.000Z';

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function makeItem(): LocalPendingSalesPhotoEvidenceCreation {
  return createLocalPendingSalesPhotoEvidenceCreation({
    saleEventId: SALE_EVENT_ID,
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    capturedByStaffId: STAFF_ID,
    saleCompletedAt: BASE_TIME,
    now: BASE_TIME,
  });
}

console.log('\n=== Sales photo evidence pending creation recovery and cleanup model ===');

runTest('stale creating row is recoverable as retryable work, not deleted', () => {
  const creating = markPendingSalesPhotoEvidenceCreationCreating(makeItem(), BASE_TIME);

  const decision = classifyPendingSalesPhotoEvidenceCreationRecovery(creating, {
    now: '2026-07-05T10:06:00.000Z',
    staleCreatingAfterMs: 5 * 60 * 1000,
  });

  assert.equal(decision.action, 'recover_stale_creating');
  assert.equal(decision.code, 'stale_creating_recovered');
  assert.match(decision.message, /retried/);
});

runTest('fresh creating row is retained because another drain may still be running', () => {
  const creating = markPendingSalesPhotoEvidenceCreationCreating(makeItem(), BASE_TIME);

  const decision = classifyPendingSalesPhotoEvidenceCreationRecovery(creating, {
    now: '2026-07-05T10:03:00.000Z',
    staleCreatingAfterMs: 5 * 60 * 1000,
  });

  assert.equal(decision.action, 'none');
  assert.equal(decision.code, 'not_stale');
});

runTest('old created row can retire only the local queue row', () => {
  const created = markPendingSalesPhotoEvidenceCreationCreated(makeItem(), BASE_TIME);

  const decision = classifyPendingSalesPhotoEvidenceCreationRecovery(created, {
    now: '2026-07-12T10:00:01.000Z',
    cleanupCreatedAfterMs: 7 * 24 * 60 * 60 * 1000,
  });

  assert.equal(decision.action, 'cleanup_created_queue_row');
  assert.equal(decision.code, 'created_queue_row_retired');
  assert.match(decision.message, /without deleting sale or evidence metadata/);
});

runTest('fresh created row is retained for diagnostics before cleanup', () => {
  const created = markPendingSalesPhotoEvidenceCreationCreated(makeItem(), BASE_TIME);

  const decision = classifyPendingSalesPhotoEvidenceCreationRecovery(created, {
    now: '2026-07-06T10:00:00.000Z',
    cleanupCreatedAfterMs: 7 * 24 * 60 * 60 * 1000,
  });

  assert.equal(decision.action, 'none');
  assert.equal(decision.code, 'not_cleanup_eligible');
});

runTest('waiting and retryable rows are never cleanup candidates', () => {
  const waiting = makeItem();
  const retryable = markPendingSalesPhotoEvidenceCreationRetryableFailure(makeItem(), {
    code: 'network_error',
    message: 'temporary outage',
    now: BASE_TIME,
  });

  assert.deepEqual(
    classifyPendingSalesPhotoEvidenceCreationRecovery(waiting, {
      now: '2026-07-20T10:00:00.000Z',
    }),
    {
      action: 'none',
      code: 'not_terminal',
      message: 'Runnable pending sales photo evidence creation must stay available for normal retry.',
    }
  );
  assert.equal(
    classifyPendingSalesPhotoEvidenceCreationRecovery(retryable, {
      now: '2026-07-20T10:00:00.000Z',
    }).action,
    'none'
  );
});

runTest('terminal failures require manual review rather than automatic deletion', () => {
  const permanent = markPendingSalesPhotoEvidenceCreationPermanentFailure(makeItem(), {
    code: 'max_retry_exceeded',
    message: 'retry limit reached',
    now: BASE_TIME,
  });
  const blocked = markPendingSalesPhotoEvidenceCreationBlocked(makeItem(), {
    code: 'source_event_missing',
    message: 'source event missing',
    now: BASE_TIME,
  });

  assert.equal(
    classifyPendingSalesPhotoEvidenceCreationRecovery(permanent, {
      now: '2026-07-20T10:00:00.000Z',
    }).action,
    'manual_review'
  );
  assert.equal(
    classifyPendingSalesPhotoEvidenceCreationRecovery(blocked, {
      now: '2026-07-20T10:00:00.000Z',
    }).action,
    'manual_review'
  );
});

runTest('invalid timestamps and durations fail closed', () => {
  assert.throws(
    () => classifyPendingSalesPhotoEvidenceCreationRecovery(makeItem(), { now: 'not-a-date' }),
    /now must be a valid date/
  );
  assert.throws(
    () => classifyPendingSalesPhotoEvidenceCreationRecovery(makeItem(), { staleCreatingAfterMs: -1 }),
    /staleCreatingAfterMs must be a non-negative finite number/
  );
  assert.throws(
    () => classifyPendingSalesPhotoEvidenceCreationRecovery({ ...makeItem(), updatedAt: 'not-a-date' }),
    /updatedAt must be a valid date/
  );
});

runTest('recovery model stays pure and is not wired to runtime cleanup execution', () => {
  assert.doesNotMatch(recoverySource, /@\/lib\/db|@\/lib\/supabase|supabase|from\(/);
  assert.doesNotMatch(recoverySource, /fetch\(|window\.|document\.|localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(recoverySource, /delete\(|bulkDelete|clear\(|upload|signedUrl|signed_url|\bR2\b|drain/i);

  const productionFiles = [
    'lib/sales/photo-evidence-runtime-enqueue.ts',
    'lib/sales/photo-evidence-pending-creation-storage.ts',
    'lib/sales/photo-evidence-pending-creation-drain.ts',
    'components/markets/SalesPhotoEvidencePendingListDialog.tsx',
    'components/markets/AddRevenueDialog.tsx',
    'app/markets/[id]/page.tsx',
  ];

  const wiredFiles = productionFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /photo-evidence-pending-creation-recovery|classifyPendingSalesPhotoEvidenceCreationRecovery/.test(source);
  });

  assert.deepEqual(wiredFiles, []);
  assert.match(planSource, /Slice 5C-3G Status/);
  assert.match(testManifestSource, /tsx tests\/sales-photo-evidence-pending-creation-recovery\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence pending creation recovery tests failed`);
  }
}

main();
