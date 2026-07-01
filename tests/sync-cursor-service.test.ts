import assert from 'node:assert/strict';
import { db } from '../lib/db';
import {
  clearLastSyncTimestamp,
  getLastSyncTimestamp,
  updateLastSyncTimestamp,
} from '../lib/sync/sync-cursor-service';
import type { Settings } from '../types/db';

async function main(): Promise<void> {
  const settingsStore: Settings[] = [{
    id: 1,
    theme: 'auto',
    language: 'zh-TW',
    defaultCurrency: 'TWD',
    enableNotifications: true,
    autoBackup: false,
    updatedAt: 1_700_000_000_000,
    lastSyncAt: 1_700_000_000_000,
  }];
  const updates: Array<{ id: unknown; changes: Record<string, unknown> }> = [];

  const originalToArray = db.settings.toArray.bind(db.settings);
  const originalUpdate = db.settings.update.bind(db.settings);

  try {
    db.settings.toArray = (() => Promise.resolve(settingsStore)) as unknown as typeof db.settings.toArray;
    db.settings.update = ((id: unknown, changes: Record<string, unknown>) => {
      updates.push({ id, changes });
      Object.assign(settingsStore[0], changes);
      return Promise.resolve(1);
    }) as unknown as typeof db.settings.update;

    const initialCursor = await getLastSyncTimestamp();
    assert.equal(initialCursor, 1_700_000_000_000);
    console.log('PASS getLastSyncTimestamp reads settings cursor');

    await updateLastSyncTimestamp(1_700_000_001_234);
    assert.deepEqual(updates, [
      { id: 1, changes: { lastSyncAt: 1_700_000_001_234 } },
    ]);
    assert.equal(settingsStore[0].lastSyncAt, 1_700_000_001_234);
    console.log('PASS updateLastSyncTimestamp writes valid created_at cursor');

    await updateLastSyncTimestamp(Number.NaN);
    await updateLastSyncTimestamp(Number.POSITIVE_INFINITY);
    assert.equal(updates.length, 1, 'invalid cursors must not update settings');
    console.log('PASS updateLastSyncTimestamp refuses invalid cursors');

    await clearLastSyncTimestamp();
    assert.deepEqual(updates[1], {
      id: 1,
      changes: { lastSyncAt: undefined },
    });
    assert.equal(settingsStore[0].lastSyncAt, undefined);
    console.log('PASS clearLastSyncTimestamp clears settings cursor');

    db.settings.toArray = (() => {
      throw new Error('db unavailable');
    }) as unknown as typeof db.settings.toArray;

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
