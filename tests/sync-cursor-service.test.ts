import assert from 'node:assert/strict';
import { db } from '../lib/db';
import {
  getLastSyncTimestamp,
  updateLastSyncTimestamp,
} from '../lib/sync/sync-cursor-service';

async function main(): Promise<void> {
  const settingsStore = [{ id: 'settings-1', lastSyncAt: 1_700_000_000_000 }];
  const updates: Array<{ id: string; changes: Record<string, unknown> }> = [];

  const originalToArray = db.settings.toArray.bind(db.settings);
  const originalUpdate = db.settings.update.bind(db.settings);

  try {
    db.settings.toArray = (() => Promise.resolve(settingsStore)) as typeof db.settings.toArray;
    db.settings.update = ((id: string, changes: Record<string, unknown>) => {
      updates.push({ id, changes });
      Object.assign(settingsStore[0], changes);
      return Promise.resolve(1);
    }) as typeof db.settings.update;

    const initialCursor = await getLastSyncTimestamp();
    assert.equal(initialCursor, 1_700_000_000_000);
    console.log('PASS getLastSyncTimestamp reads settings cursor');

    await updateLastSyncTimestamp(1_700_000_001_234);
    assert.deepEqual(updates, [
      { id: 'settings-1', changes: { lastSyncAt: 1_700_000_001_234 } },
    ]);
    assert.equal(settingsStore[0].lastSyncAt, 1_700_000_001_234);
    console.log('PASS updateLastSyncTimestamp writes valid created_at cursor');

    await updateLastSyncTimestamp(Number.NaN);
    await updateLastSyncTimestamp(Number.POSITIVE_INFINITY);
    assert.equal(updates.length, 1, 'invalid cursors must not update settings');
    console.log('PASS updateLastSyncTimestamp refuses invalid cursors');

    db.settings.toArray = (() => {
      throw new Error('db unavailable');
    }) as typeof db.settings.toArray;

    const missingCursor = await getLastSyncTimestamp();
    assert.equal(missingCursor, null);
    console.log('PASS getLastSyncTimestamp returns null on read failure');
  } finally {
    db.settings.toArray = originalToArray as typeof db.settings.toArray;
    db.settings.update = originalUpdate as typeof db.settings.update;
  }
}

main().catch((error) => {
  console.error('FAIL sync cursor service');
  throw error;
});
