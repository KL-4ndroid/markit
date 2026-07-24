import assert from 'node:assert/strict';

import { SyncStatus } from '../lib/sync/sync-runtime-state';
import { getSyncPresentation } from '../lib/sync/sync-presentation';

const base = {
  lastSyncAt: null,
  pendingCount: 0,
  error: null,
  isOnline: true,
  now: 1_000_000,
};

const waiting = getSyncPresentation({ ...base, status: SyncStatus.IDLE });
assert.equal(waiting.kind, 'waiting');
assert.equal(waiting.label, '尚未完成同步檢查');
assert.doesNotMatch(waiting.accessibleLabel, /已同步/);

const successWithoutTimestamp = getSyncPresentation({ ...base, status: SyncStatus.SUCCESS });
assert.equal(successWithoutTimestamp.kind, 'waiting');

const synced = getSyncPresentation({
  ...base,
  status: SyncStatus.SUCCESS,
  lastSyncAt: base.now - 30_000,
});
assert.equal(synced.kind, 'synced');
assert.equal(synced.label, '已同步');

const pending = getSyncPresentation({
  ...base,
  status: SyncStatus.IDLE,
  pendingCount: 3,
});
assert.equal(pending.kind, 'pending');
assert.equal(pending.label, '3 筆待同步');

const offline = getSyncPresentation({
  ...base,
  status: SyncStatus.IDLE,
  isOnline: false,
  pendingCount: 2,
});
assert.equal(offline.kind, 'offline');
assert.equal(offline.canSync, false);

const error = getSyncPresentation({
  ...base,
  status: SyncStatus.ERROR,
  error: 'network',
});
assert.equal(error.kind, 'error');
assert.match(error.accessibleLabel, /network/);

console.log('PASS sync presentation truth states');
