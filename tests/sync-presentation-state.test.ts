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
assert.equal(waiting.label, '正在確認同步狀態');
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
assert.equal(getSyncPresentation({ ...base, status: SyncStatus.OFFLINE }).canSync, true, 'network request failure must not require a physical offline/online toggle to retry');
assert.match(offline.detail, /2 筆紀錄尚未送達雲端/);
assert.equal(getSyncPresentation({ ...base, status: SyncStatus.SYNCING, isOnline: false }).kind, 'offline');
assert.equal(getSyncPresentation({ ...base, status: SyncStatus.SUCCESS, pendingCount: 2, lastSyncAt: base.now }).kind, 'pending');
assert.match(synced.accessibleLabel, /上次完成紀錄同步/);
assert.doesNotMatch(synced.detail, /所有資料|照片已/);

const error = getSyncPresentation({
  ...base,
  status: SyncStatus.ERROR,
  error: 'network',
});
assert.equal(error.kind, 'error');
assert.match(error.accessibleLabel, /network/);
assert.doesNotMatch(error.detail, /保存在這台裝置/, 'zero pending does not prove a local draft was saved');
assert.match(error.detail, /無法確認最新雲端資料/);

console.log('PASS sync presentation truth states');
