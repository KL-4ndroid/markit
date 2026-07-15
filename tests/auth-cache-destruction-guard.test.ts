import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { db } from '../lib/db';
import { acquireSyncLock, releaseSyncLock } from '../lib/sync/sync-runtime-state';
import { getLocalPendingWriteReport } from '../lib/sync/local-pending-write-report';
import { guardedAuthenticatedCacheReset } from '../lib/sync/authenticated-cache-reset-guard';
import type { LocalPendingWriteReport } from '../lib/sync/local-pending-write-report';

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const planPath = join(projectRoot, 'docs/AUTHENTICATED_CACHE_DESTRUCTION_GUARD_PLAN_2026_07_01.md');
const authContextSource = readFileSync(join(projectRoot, 'lib/supabase/auth-context.tsx'), 'utf8');
const appChromeSource = readFileSync(join(projectRoot, 'components/AppChrome.tsx'), 'utf8');
const authCacheBlockedDialogSource = readFileSync(join(projectRoot, 'components/auth/AuthCacheBlockedDialog.tsx'), 'utf8');
const authCacheBlockedEventsSource = readFileSync(join(projectRoot, 'lib/auth/auth-cache-blocked-events.ts'), 'utf8');
const topNavigationSource = readFileSync(join(projectRoot, 'components/TopNavigation.tsx'), 'utf8');
const homePageSource = readFileSync(join(projectRoot, 'app/page.tsx'), 'utf8');
const joinPageSource = readFileSync(join(projectRoot, 'app/join/page.tsx'), 'utf8');
const settingsPageSource = readFileSync(join(projectRoot, 'app/settings/page.tsx'), 'utf8');
const staffStatusMonitorSource = readFileSync(join(projectRoot, 'hooks/useStaffStatusMonitor.ts'), 'utf8');
const clearLocalDesignSource = readFileSync(join(projectRoot, 'docs/CLEAR_LOCAL_AND_RESYNC_DESIGN_2026_06_30.md'), 'utf8');
const cloudRebuildPlanSource = readFileSync(join(projectRoot, 'docs/CLOUD_REBUILD_FIRST_RECOVERY_PLAN_2026_06_30.md'), 'utf8');
const highRiskPlanSource = readFileSync(join(projectRoot, 'docs/HIGH_RISK_SYNC_AND_DATA_EXECUTION_PLAN.md'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function createTableMock<T>(rows: T[]) {
  return {
    async toArray() {
      return rows;
    },
    where() {
      return {
        anyOf(statuses: string[]) {
          return {
            async toArray() {
              return rows.filter((row: any) => statuses.includes(row.sync_status ?? row.status));
            },
            async count() {
              return rows.filter((row: any) => statuses.includes(row.sync_status ?? row.status)).length;
            },
          };
        },
      };
    },
  };
}

function mockNavigatorOnline(isOnline: boolean): () => void {
  const originalNavigator = globalThis.navigator;

  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: isOnline },
    configurable: true,
  });

  return () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  };
}

function report(overrides: Partial<LocalPendingWriteReport>): LocalPendingWriteReport {
  const blockingReasonCodes = overrides.blockingReasonCodes ?? [];
  return {
    checkedAt: 1_700_000_000_000,
    userId: 'user-1',
    isOnline: true,
    syncLocked: false,
    pendingEventCount: 0,
    pendingEventIds: [],
    pendingEventCountByType: {},
    pendingEventCountByActorId: {},
    actorMismatchEventIds: [],
    unfinishedSyncQueueCount: 0,
    pendingSalesPhotoEvidenceCreationCount: 0,
    pendingSalesPhotoEvidenceCreationIds: [],
    pendingSalesPhotoEvidenceCreationCountByStatus: {},
    pendingSalesPhotoEvidencePayloadCount: 0,
    pendingSalesPhotoEvidencePayloadIds: [],
    blockingReasonCodes,
    isClean: blockingReasonCodes.length === 0,
    ...overrides,
  };
}

console.log('\n=== Authenticated cache destruction guard ===');

runTest('plan consolidates cache reset recovery and pending pre-clear guardrails', () => {
  assert.ok(existsSync(planPath));
  const source = readFileSync(planPath, 'utf8');

  assert.match(source, /manual sign-out/);
  assert.match(source, /passive Supabase signed-out event/);
  assert.match(source, /identity switch/);
  assert.match(source, /recovery clear-local-and-resync/);
  assert.match(source, /future replace-cache execute/);
  assert.match(source, /count local `events` with `sync_status` of `pending` or `local_only`/);
  assert.match(source, /Force discard requires an explicit option/i);
  assert.match(source, /does not approve:[\s\S]*pending-operation drain/);
});

runTest('local pending write report is read-only and classifies blocking reasons', async () => {
  const originalEventsWhere = db.events.where.bind(db.events);
  const originalSyncQueueWhere = db.syncQueue.where.bind(db.syncQueue);
  const originalSalesPhotoEvidencePendingCreationsWhere = db.salesPhotoEvidencePendingCreations.where.bind(
    db.salesPhotoEvidencePendingCreations
  );
  const originalSalesPhotoEvidencePendingPayloads = (db as any).salesPhotoEvidencePendingPayloads;
  const restoreNavigator = mockNavigatorOnline(false);

  try {
    (db.events as any).where = createTableMock([
      {
        id: 'event-1',
        type: 'deal_closed',
        actor_id: 'user-1',
        sync_status: 'local_only',
      },
      {
        id: 'event-2',
        type: 'interaction_recorded',
        actor_id: 'other-user',
        sync_status: 'pending',
      },
      {
        id: 'event-3',
        type: 'market_created',
        actor_id: 'user-1',
        sync_status: 'synced',
      },
    ]).where;

    (db.syncQueue as any).where = createTableMock([
      { id: 'queue-1', status: 'pending' },
      { id: 'queue-2', status: 'success' },
    ]).where;

    (db.salesPhotoEvidencePendingCreations as any).where = createTableMock([
      { queueId: 'photo-evidence-1', status: 'waiting_for_event_sync' },
      { queueId: 'photo-evidence-2', status: 'created' },
      { queueId: 'photo-evidence-3', status: 'failed_retryable' },
    ]).where;
    (db as any).salesPhotoEvidencePendingPayloads = createTableMock([
      { queueId: 'photo-payload-1' },
      { queueId: 'photo-payload-2' },
    ]);

    const report = await getLocalPendingWriteReport('user-1');

    assert.equal(report.isClean, false);
    assert.equal(report.pendingEventCount, 2);
    assert.deepEqual(report.pendingEventIds, ['event-1', 'event-2']);
    assert.equal(report.pendingEventCountByType.deal_closed, 1);
    assert.equal(report.pendingEventCountByType.interaction_recorded, 1);
    assert.equal(report.pendingEventCountByActorId['user-1'], 1);
    assert.equal(report.pendingEventCountByActorId['other-user'], 1);
    assert.deepEqual(report.actorMismatchEventIds, ['event-2']);
    assert.equal(report.unfinishedSyncQueueCount, 1);
    assert.equal(report.pendingSalesPhotoEvidenceCreationCount, 2);
    assert.deepEqual(report.pendingSalesPhotoEvidenceCreationIds, ['photo-evidence-1', 'photo-evidence-3']);
    assert.equal(report.pendingSalesPhotoEvidenceCreationCountByStatus.waiting_for_event_sync, 1);
    assert.equal(report.pendingSalesPhotoEvidenceCreationCountByStatus.failed_retryable, 1);
    assert.equal(report.pendingSalesPhotoEvidencePayloadCount, 2);
    assert.deepEqual(report.pendingSalesPhotoEvidencePayloadIds, ['photo-payload-1', 'photo-payload-2']);
    assert.ok(report.blockingReasonCodes.includes('local_pending_events'));
    assert.ok(report.blockingReasonCodes.includes('local_sync_queue_unfinished'));
    assert.ok(report.blockingReasonCodes.includes('local_pending_sales_photo_evidence'));
    assert.ok(report.blockingReasonCodes.includes('actor_mismatch'));
    assert.ok(report.blockingReasonCodes.includes('offline'));
  } finally {
    (db.events as any).where = originalEventsWhere;
    (db.syncQueue as any).where = originalSyncQueueWhere;
    (db.salesPhotoEvidencePendingCreations as any).where = originalSalesPhotoEvidencePendingCreationsWhere;
    (db as any).salesPhotoEvidencePendingPayloads = originalSalesPhotoEvidencePendingPayloads;
    restoreNavigator();
  }
});

runTest('local pending write report observes active sync lock', async () => {
  const originalEventsWhere = db.events.where.bind(db.events);
  const originalSyncQueueWhere = db.syncQueue.where.bind(db.syncQueue);
  const originalSalesPhotoEvidencePendingCreationsWhere = db.salesPhotoEvidencePendingCreations.where.bind(
    db.salesPhotoEvidencePendingCreations
  );
  const originalSalesPhotoEvidencePendingPayloads = (db as any).salesPhotoEvidencePendingPayloads;
  const restoreNavigator = mockNavigatorOnline(true);

  try {
    (db.events as any).where = createTableMock([]).where;
    (db.syncQueue as any).where = createTableMock([]).where;
    (db.salesPhotoEvidencePendingCreations as any).where = createTableMock([]).where;
    (db as any).salesPhotoEvidencePendingPayloads = createTableMock([]);

    assert.equal(acquireSyncLock(), true);
    const report = await getLocalPendingWriteReport('user-1');

    assert.equal(report.syncLocked, true);
    assert.equal(report.isClean, false);
    assert.deepEqual(report.blockingReasonCodes, ['sync_locked']);
  } finally {
    releaseSyncLock();
    (db.events as any).where = originalEventsWhere;
    (db.syncQueue as any).where = originalSyncQueueWhere;
    (db.salesPhotoEvidencePendingCreations as any).where = originalSalesPhotoEvidencePendingCreationsWhere;
    (db as any).salesPhotoEvidencePendingPayloads = originalSalesPhotoEvidencePendingPayloads;
    restoreNavigator();
  }
});

runTest('guard clears immediately when the report is clean', async () => {
  const calls: string[] = [];

  const result = await guardedAuthenticatedCacheReset(
    { scope: 'full', reason: 'manual_signout', userId: 'user-1', allowSyncAttempt: true },
    {
      getReport: async () => report({}),
      push: async () => {
        calls.push('push');
        return 0;
      },
      reset: async () => {
        calls.push('reset');
      },
    }
  );

  assert.equal(result.decision, 'cleared');
  assert.deepEqual(calls, ['reset']);
});

runTest('guard syncs once then clears when pending local events are resolved', async () => {
  const calls: string[] = [];
  const reports = [
    report({
      pendingEventCount: 1,
      pendingEventIds: ['event-1'],
      blockingReasonCodes: ['local_pending_events'],
      isClean: false,
    }),
    report({}),
  ];

  const result = await guardedAuthenticatedCacheReset(
    { scope: 'full', reason: 'manual_signout', userId: 'user-1', allowSyncAttempt: true },
    {
      getReport: async () => reports.shift()!,
      push: async () => {
        calls.push('push');
        return 1;
      },
      reset: async () => {
        calls.push('reset');
      },
    }
  );

  assert.equal(result.decision, 'cleared_after_sync');
  assert.deepEqual(calls, ['push', 'reset']);
});

runTest('guard blocks offline pending writes without clearing cache', async () => {
  const calls: string[] = [];

  const result = await guardedAuthenticatedCacheReset(
    { scope: 'full', reason: 'manual_signout', userId: 'user-1', allowSyncAttempt: true },
    {
      getReport: async () => report({
        isOnline: false,
        pendingEventCount: 1,
        pendingEventIds: ['event-1'],
        blockingReasonCodes: ['offline', 'local_pending_events'],
        isClean: false,
      }),
      push: async () => {
        calls.push('push');
        return 0;
      },
      reset: async () => {
        calls.push('reset');
      },
    }
  );

  assert.equal(result.decision, 'blocked');
  assert.deepEqual(result.blockingReasonCodes, ['offline']);
  assert.deepEqual(calls, []);
});

runTest('guard blocks pending sales photo evidence without using the event push path', async () => {
  const calls: string[] = [];

  const result = await guardedAuthenticatedCacheReset(
    { scope: 'full', reason: 'manual_signout', userId: 'user-1', allowSyncAttempt: true },
    {
      getReport: async () => report({
        pendingSalesPhotoEvidenceCreationCount: 1,
        pendingSalesPhotoEvidenceCreationIds: ['photo-evidence-1'],
        pendingSalesPhotoEvidenceCreationCountByStatus: {
          waiting_for_event_sync: 1,
        },
        blockingReasonCodes: ['local_pending_sales_photo_evidence'],
        isClean: false,
      }),
      push: async () => {
        calls.push('push');
        return 0;
      },
      reset: async () => {
        calls.push('reset');
      },
    }
  );

  assert.equal(result.decision, 'blocked');
  assert.deepEqual(result.blockingReasonCodes, ['local_pending_sales_photo_evidence']);
  assert.deepEqual(calls, []);
});

runTest('guard blocks pending local photo payloads without using the event push path', async () => {
  const calls: string[] = [];

  const result = await guardedAuthenticatedCacheReset(
    { scope: 'full', reason: 'manual_signout', userId: 'user-1', allowSyncAttempt: true },
    {
      getReport: async () => report({
        pendingSalesPhotoEvidencePayloadCount: 1,
        pendingSalesPhotoEvidencePayloadIds: ['photo-payload-1'],
        blockingReasonCodes: ['local_pending_sales_photo_evidence'],
        isClean: false,
      }),
      push: async () => {
        calls.push('push');
        return 0;
      },
      reset: async () => {
        calls.push('reset');
      },
    }
  );

  assert.equal(result.decision, 'blocked');
  assert.deepEqual(result.blockingReasonCodes, ['local_pending_sales_photo_evidence']);
  assert.deepEqual(calls, []);
});

runTest('guard requires explicit force flag before discarding local changes', async () => {
  const calls: string[] = [];

  const result = await guardedAuthenticatedCacheReset(
    {
      scope: 'full',
      reason: 'force_discard',
      userId: 'user-1',
      forceDiscardLocalChanges: true,
    },
    {
      getReport: async () => report({
        pendingEventCount: 1,
        pendingEventIds: ['event-1'],
        blockingReasonCodes: ['local_pending_events'],
        isClean: false,
      }),
      push: async () => {
        calls.push('push');
        return 0;
      },
      reset: async () => {
        calls.push('reset');
      },
    }
  );

  assert.equal(result.decision, 'discarded');
  assert.deepEqual(calls, ['reset']);
});

runTest('auth context routes cache clears through the guard instead of direct reset', () => {
  assert.doesNotMatch(authContextSource, /import \{ resetAuthenticatedCache \}/);
  assert.doesNotMatch(authContextSource, /await resetAuthenticatedCache\(/);
  assert.match(authContextSource, /guardedAuthenticatedCacheReset\(/);
  assert.match(authContextSource, /reason:\s*['"]manual_signout['"]/);
  assert.match(authContextSource, /reason:\s*['"]passive_signout['"]/);
  assert.match(authContextSource, /reason:\s*['"]identity_switch['"]/);
  assert.match(authContextSource, /forceDiscardLocalChanges/);
});

runTest('manual sign-out entry points use shared discard confirmation helper', () => {
  for (const source of [topNavigationSource, joinPageSource]) {
    assert.match(source, /confirmDiscardLocalChangesForSignOut/);
    assert.match(source, /forceDiscardLocalChanges:\s*true/);
  }

  assert.doesNotMatch(homePageSource, /\bsignOut\s*\(/);
});

runTest('settings and staff destructive clear paths use pending-write guards', () => {
  assert.match(settingsPageSource, /getLocalPendingWriteReport/);
  assert.match(settingsPageSource, /if \(!report\.isClean && !forceDiscardLocalChanges\)[\s\S]*return false/);
  assert.match(settingsPageSource, /pendingSalesPhotoEvidenceCreationCount/);
  assert.match(settingsPageSource, /confirmationText="DELETE"/);
  assert.doesNotMatch(settingsPageSource, /window\.confirm\(|\bprompt\(/);
  assert.match(staffStatusMonitorSource, /guardedAuthenticatedCacheReset\(/);
  assert.match(staffStatusMonitorSource, /reason:\s*['"]staff_status_reset['"]/);
  assert.match(staffStatusMonitorSource, /dispatchAuthCacheBlockedEvent\(/);
  assert.doesNotMatch(staffStatusMonitorSource, /await resetAuthenticatedCache\(/);
});

runTest('blocked state UX is mounted and listens for auth cache blocked events', () => {
  assert.match(authCacheBlockedEventsSource, /AUTH_CACHE_BLOCKED_EVENT/);
  assert.match(authCacheBlockedDialogSource, /AUTH_CACHE_BLOCKED_EVENT/);
  assert.match(authCacheBlockedDialogSource, /Sign in to sync/);
  assert.match(authCacheBlockedDialogSource, /Discard local changes/);
  assert.match(authCacheBlockedDialogSource, /pending sales photo evidence item/);
  assert.match(authCacheBlockedDialogSource, /pending local photo payload/);
  assert.match(authCacheBlockedDialogSource, /forceDiscardLocalChanges:\s*true/);
  assert.match(appChromeSource, /import \{ AuthCacheBlockedDialog \}/);
  assert.match(appChromeSource, /<AuthCacheBlockedDialog \/>/);
  assert.match(authContextSource, /dispatchAuthCacheBlockedEvent\(\s*['"]passive_signout['"]/);
  assert.match(authContextSource, /dispatchAuthCacheBlockedEvent\(\s*['"]identity_switch['"]/);
});

runTest('recovery planning reuses the shared local pending write report', () => {
  for (const source of [clearLocalDesignSource, cloudRebuildPlanSource, highRiskPlanSource]) {
    assert.match(source, /local-pending-write-report\.ts/);
  }

  assert.match(clearLocalDesignSource, /must reuse this report instead of creating a separate pending\/local-only detector/);
  assert.match(cloudRebuildPlanSource, /must not introduce a second local pending-write detector/);
});

runTest('full test suite includes auth cache destruction guard tests', () => {
  assert.match(testManifestSource, /tsx tests\/auth-cache-destruction-guard\.test\.ts/);
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
    throw new Error(`${failed} auth cache destruction guard tests failed`);
  }
}

main().catch((error) => {
  console.error('FAIL auth cache destruction guard');
  throw error;
});
