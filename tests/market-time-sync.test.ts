import assert from 'node:assert/strict';
import { marketUpdatesToSnake, marketCreatedPayloadToCloud, normalizeEventPayloadForCloud } from '../lib/data-mappers';
import { completeSyncState } from '../lib/sync/sync-completion';
import { SyncStatus, type SyncState } from '../lib/sync/sync-runtime-state';

const patch = { earlyEntryTime: '', checkInTime: '12:00', operatingStartTime: undefined, notes: '' };
const before = JSON.stringify(patch);
assert.deepEqual(marketUpdatesToSnake(patch), { early_entry_time: null, check_in_time: '12:00', notes: '' });
assert.equal(JSON.stringify(patch), before, 'serializing must preserve the local event evidence');
assert.deepEqual(marketUpdatesToSnake({ early_entry_time: ' ', operatingEndTime: null }), { early_entry_time: null, operating_end_time: null });
assert.deepEqual(normalizeEventPayloadForCloud('market_updated', { market_id: 'test', updates: patch }), {
  market_id: 'test', updates: { early_entry_time: null, check_in_time: '12:00', notes: '' },
});
const created = marketCreatedPayloadToCloud({ earlyEntryTime: '', startDate: '2026-10-24', endDate: '2026-10-24' } as never);
assert.equal(created.early_entry_time, null);
assert.equal(created.earlyEntryTime, null, 'legacy camel-case fallback must not reintroduce an empty time');
const previous: SyncState = { status: SyncStatus.SYNCING, lastSyncAt: 10, pendingCount: 1, error: null };
assert.equal(completeSyncState(previous, 1, 20).status, SyncStatus.ERROR);
assert.equal(completeSyncState(previous, 1, 20).lastSyncAt, 10);
assert.equal(completeSyncState(previous, 0, 20).status, SyncStatus.SUCCESS);
assert.equal(completeSyncState(previous, 0, 20).lastSyncAt, 20);
console.log('PASS nullable cloud time encoding and incomplete sync feedback');
