import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildPendingSalesPhotoEvidenceCreationDiagnosticItem,
  buildPendingSalesPhotoEvidenceCreationDiagnosticSummary,
} from '../lib/sales/photo-evidence-pending-creation-diagnostics';
import {
  createLocalPendingSalesPhotoEvidenceCreation,
  markPendingSalesPhotoEvidenceCreationBlocked,
  markPendingSalesPhotoEvidenceCreationCreated,
  markPendingSalesPhotoEvidenceCreationCreating,
  markPendingSalesPhotoEvidenceCreationRetryableFailure,
  type LocalPendingSalesPhotoEvidenceCreation,
} from '../lib/sales/photo-evidence-pending-creation';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const diagnosticsSource = readFileSync(
  join(projectRoot, 'lib/sales/photo-evidence-pending-creation-diagnostics.ts'),
  'utf8'
);
const planSource = readFileSync(
  join(projectRoot, 'docs/SALES_PHOTO_EVIDENCE_EXECUTION_PLAN_2026_07_04.md'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MARKET_ID = '22222222-2222-4222-8222-222222222222';
const STAFF_ID = '44444444-4444-4444-8444-444444444444';
const BASE_TIME = '2026-07-05T10:00:00.000Z';
const NOW = '2026-07-05T10:10:00.000Z';

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function makeItem(
  saleEventId: string,
  now = BASE_TIME
): LocalPendingSalesPhotoEvidenceCreation {
  return createLocalPendingSalesPhotoEvidenceCreation({
    saleEventId,
    ownerId: OWNER_ID,
    marketId: MARKET_ID,
    capturedByStaffId: STAFF_ID,
    saleCompletedAt: BASE_TIME,
    now,
  });
}

console.log('\n=== Sales photo evidence pending creation diagnostics model ===');

runTest('waiting for sale sync is informational and tells owner to wait', () => {
  const item = makeItem('33333333-3333-4333-8333-333333333333');

  const diagnostic = buildPendingSalesPhotoEvidenceCreationDiagnosticItem(item, { now: NOW });

  assert.equal(diagnostic.severity, 'info');
  assert.equal(diagnostic.ownerRecommendation, 'wait_for_sale_sync');
  assert.equal(diagnostic.recovery.action, 'none');
  assert.equal(diagnostic.saleEventId, item.saleEventId);
});

runTest('stale creating row is warning level and recommends recovery', () => {
  const item = markPendingSalesPhotoEvidenceCreationCreating(
    makeItem('44444444-4444-4444-8444-444444444444'),
    BASE_TIME
  );

  const diagnostic = buildPendingSalesPhotoEvidenceCreationDiagnosticItem(item, {
    now: NOW,
    staleCreatingAfterMs: 5 * 60 * 1000,
  });

  assert.equal(diagnostic.severity, 'warning');
  assert.equal(diagnostic.ownerRecommendation, 'recover_stale_creating');
  assert.equal(diagnostic.recovery.action, 'recover_stale_creating');
});

runTest('retryable failure is warning level but remains normal retry work', () => {
  const item = markPendingSalesPhotoEvidenceCreationRetryableFailure(
    makeItem('55555555-5555-4555-8555-555555555555'),
    {
      code: 'network_error',
      message: 'temporary outage',
      now: BASE_TIME,
    }
  );

  const diagnostic = buildPendingSalesPhotoEvidenceCreationDiagnosticItem(item, { now: NOW });

  assert.equal(diagnostic.severity, 'warning');
  assert.equal(diagnostic.ownerRecommendation, 'retry_can_continue');
  assert.equal(diagnostic.lastErrorCode, 'network_error');
});

runTest('created queue retirement is informational and scoped to the local queue row', () => {
  const item = markPendingSalesPhotoEvidenceCreationCreated(
    makeItem('66666666-6666-4666-8666-666666666666'),
    BASE_TIME
  );

  const diagnostic = buildPendingSalesPhotoEvidenceCreationDiagnosticItem(item, {
    now: '2026-07-13T10:00:00.000Z',
  });

  assert.equal(diagnostic.severity, 'info');
  assert.equal(diagnostic.ownerRecommendation, 'retire_created_queue_row');
  assert.equal(diagnostic.recovery.action, 'cleanup_created_queue_row');
  assert.match(diagnostic.recovery.message, /without deleting sale or evidence metadata/);
});

runTest('blocked invalid source is critical and requires manual review', () => {
  const item = markPendingSalesPhotoEvidenceCreationBlocked(
    makeItem('77777777-7777-4777-8777-777777777777'),
    {
      code: 'source_event_missing',
      message: 'source event missing',
      now: BASE_TIME,
    }
  );

  const diagnostic = buildPendingSalesPhotoEvidenceCreationDiagnosticItem(item, { now: NOW });

  assert.equal(diagnostic.severity, 'critical');
  assert.equal(diagnostic.ownerRecommendation, 'manual_review_required');
  assert.equal(diagnostic.recovery.action, 'manual_review');
});

runTest('summary sorts critical warning info none and counts owner recommendations', () => {
  const waiting = makeItem('33333333-3333-4333-8333-333333333333', '2026-07-05T10:01:00.000Z');
  const staleCreating = markPendingSalesPhotoEvidenceCreationCreating(
    makeItem('44444444-4444-4444-8444-444444444444'),
    BASE_TIME
  );
  const retryable = markPendingSalesPhotoEvidenceCreationRetryableFailure(
    makeItem('55555555-5555-4555-8555-555555555555', '2026-07-05T10:03:00.000Z'),
    {
      code: 'network_error',
      message: 'temporary outage',
      now: '2026-07-05T10:04:00.000Z',
    }
  );
  const blocked = markPendingSalesPhotoEvidenceCreationBlocked(
    makeItem('77777777-7777-4777-8777-777777777777', '2026-07-05T10:05:00.000Z'),
    {
      code: 'source_event_missing',
      message: 'source event missing',
      now: '2026-07-05T10:06:00.000Z',
    }
  );

  const summary = buildPendingSalesPhotoEvidenceCreationDiagnosticSummary(
    [waiting, staleCreating, retryable, blocked],
    {
      now: NOW,
      staleCreatingAfterMs: 5 * 60 * 1000,
    }
  );

  assert.equal(summary.totalCount, 4);
  assert.deepEqual(summary.items.map(item => item.severity), ['critical', 'warning', 'warning', 'info']);
  assert.deepEqual(summary.severityCounts, {
    none: 0,
    info: 1,
    warning: 2,
    critical: 1,
  });
  assert.equal(summary.recommendationCounts.manual_review_required, 1);
  assert.equal(summary.recommendationCounts.recover_stale_creating, 1);
  assert.equal(summary.recommendationCounts.retry_can_continue, 1);
  assert.equal(summary.recommendationCounts.wait_for_sale_sync, 1);
});

runTest('diagnostics model remains pure and disconnected from UI and mutation execution', () => {
  assert.match(diagnosticsSource, /photo-evidence-pending-creation-recovery/);
  assert.doesNotMatch(diagnosticsSource, /@\/lib\/db|@\/lib\/supabase|supabase|from\(/);
  assert.doesNotMatch(diagnosticsSource, /add\(|put\(|update\(|delete\(|bulkDelete|clear\(|recordEvent/);
  assert.doesNotMatch(diagnosticsSource, /fetch\(|window\.|document\.|localStorage|sessionStorage|indexedDB/i);
  assert.doesNotMatch(diagnosticsSource, /upload|signedUrl|signed_url|\bR2\b|getUserMedia/i);

  const productionFiles = [
    'components/markets/SalesPhotoEvidencePendingListDialog.tsx',
    'app/markets/[id]/page.tsx',
    'components/markets/StaffMarketDetailView.tsx',
    'lib/sales/photo-evidence-runtime-enqueue.ts',
    'lib/sales/photo-evidence-pending-creation-storage.ts',
  ];

  const wiredFiles = productionFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /photo-evidence-pending-creation-diagnostics|buildPendingSalesPhotoEvidenceCreationDiagnostic/.test(source);
  });

  assert.deepEqual(wiredFiles, ['components/markets/SalesPhotoEvidencePendingListDialog.tsx']);
  assert.match(planSource, /Slice 5C-3H-0 Status/);
  assert.match(planSource, /5C-3H-1 read-only pending evidence diagnostics display/);
  assert.match(packageJson.scripts.test, /tsx tests\/sales-photo-evidence-pending-creation-diagnostics\.test\.ts/);
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
    throw new Error(`${failed} sales photo evidence pending creation diagnostics tests failed`);
  }
}

main();
