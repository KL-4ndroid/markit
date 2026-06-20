import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { previewCacheReplacement } from '../lib/sync/cache-replacement-preview';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

runTest('owner preview classifies add update keep and delete candidates', () => {
  const preview = previewCacheReplacement({
    scope: 'owner-full',
    authorizedIds: ['add-1', 'update-1', 'keep-1', 'delete-1'],
    localRecords: [
      { id: 'update-1', updatedAt: '2026-06-19T00:00:00.000Z', sync_status: 'synced' },
      { id: 'keep-1', updatedAt: '2026-06-20T00:00:00.000Z', sync_status: 'synced' },
      { id: 'delete-1', updatedAt: '2026-06-18T00:00:00.000Z', sync_status: 'synced' },
    ],
    remoteRecords: [
      { id: 'add-1', updatedAt: '2026-06-20T00:00:00.000Z' },
      { id: 'update-1', updatedAt: '2026-06-20T00:00:00.000Z' },
      { id: 'keep-1', updatedAt: '2026-06-20T00:00:00.000Z' },
    ],
  });

  assert.deepEqual(preview.wouldAdd.map(record => record.id), ['add-1']);
  assert.deepEqual(preview.wouldUpdate.map(pair => pair.local.id), ['update-1']);
  assert.deepEqual(preview.wouldKeep.map(record => record.id), ['keep-1']);
  assert.deepEqual(preview.wouldDeleteCandidates.map(record => record.id), ['delete-1']);
  assert.deepEqual(preview.warnings, []);
});

runTest('preview protects pending local-only and blocked records', () => {
  const preview = previewCacheReplacement({
    scope: 'owner-full',
    authorizedIds: ['pending-1', 'local-1', 'blocked-1', 'blocked-meta-1'],
    localRecords: [
      { id: 'pending-1', sync_status: 'pending', updatedAt: '2026-06-19T00:00:00.000Z' },
      { id: 'local-1', sync_status: 'local_only', updatedAt: '2026-06-19T00:00:00.000Z' },
      { id: 'blocked-1', status: 'blocked_permission', updatedAt: '2026-06-19T00:00:00.000Z' },
      {
        id: 'blocked-meta-1',
        sync_status: 'synced',
        metadata: { blocked_at: 1_700_000_000_000 },
        updatedAt: '2026-06-19T00:00:00.000Z',
      },
    ],
    remoteRecords: [
      { id: 'pending-1', updatedAt: '2026-06-20T00:00:00.000Z' },
      { id: 'local-1', updatedAt: '2026-06-20T00:00:00.000Z' },
      { id: 'blocked-1', updatedAt: '2026-06-20T00:00:00.000Z' },
      { id: 'blocked-meta-1', updatedAt: '2026-06-20T00:00:00.000Z' },
    ],
  });

  assert.deepEqual(preview.wouldSkipPending.map(record => record.id), ['pending-1']);
  assert.deepEqual(preview.wouldSkipLocalOnly.map(record => record.id), ['local-1']);
  assert.deepEqual(preview.wouldSkipBlocked.map(record => record.id), ['blocked-1', 'blocked-meta-1']);
  assert.deepEqual(preview.wouldUpdate, []);
  assert.deepEqual(preview.wouldDeleteCandidates, []);
});

runTest('staff preview is limited to authorized view scope', () => {
  const preview = previewCacheReplacement({
    scope: 'staff-view',
    authorizedIds: ['visible-1', 'missing-visible-1'],
    localRecords: [
      { id: 'visible-1', updatedAt: '2026-06-20T00:00:00.000Z', sync_status: 'synced' },
      { id: 'hidden-local-1', updatedAt: '2026-06-20T00:00:00.000Z', sync_status: 'synced' },
      { id: 'missing-visible-1', updatedAt: '2026-06-20T00:00:00.000Z', sync_status: 'synced' },
    ],
    remoteRecords: [
      { id: 'visible-1', updatedAt: '2026-06-20T00:00:00.000Z' },
      { id: 'hidden-remote-1', updatedAt: '2026-06-20T00:00:00.000Z' },
    ],
  });

  assert.deepEqual(preview.wouldKeep.map(record => record.id), ['visible-1']);
  assert.deepEqual(preview.wouldDeleteCandidates.map(record => record.id), ['missing-visible-1']);
  assert.equal(preview.warnings.includes('remote record hidden-remote-1 is outside authorized scope'), true);
  assert.equal(
    preview.warnings.includes('staff-view preview ignored 1 local record(s) outside authorized scope'),
    true
  );
});

runTest('preview is side-effect free', () => {
  const localRecords = [
    { id: 'record-1', updatedAt: '2026-06-19T00:00:00.000Z', sync_status: 'synced' },
  ];
  const remoteRecords = [
    { id: 'record-1', updatedAt: '2026-06-20T00:00:00.000Z' },
  ];
  const localBefore = JSON.stringify(localRecords);
  const remoteBefore = JSON.stringify(remoteRecords);

  previewCacheReplacement({
    scope: 'owner-full',
    authorizedIds: ['record-1'],
    localRecords,
    remoteRecords,
  });

  assert.equal(JSON.stringify(localRecords), localBefore);
  assert.equal(JSON.stringify(remoteRecords), remoteBefore);
});

runTest('production sync paths do not import cache replacement preview', () => {
  const projectRoot = join(__dirname, '..');
  const productionSyncFiles = [
    'hooks/useSync.ts',
    'lib/sync/sync-push-service.ts',
    'lib/sync/owner-pull-service.ts',
    'lib/sync/staff-pull-service.ts',
    'lib/sync/local-cache-writer.ts',
  ];

  const matches = productionSyncFiles.filter(file => {
    const source = readFileSync(join(projectRoot, file), 'utf8');
    return /cache-replacement-preview/.test(source);
  });

  assert.deepEqual(matches, []);
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
    throw new Error(`${failed} cache replacement preview tests failed`);
  }
}

main();
