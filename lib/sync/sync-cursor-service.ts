import { db } from '@/lib/db';

/**
 * Get the last synced cloud events.created_at cursor from local settings.
 */
export async function getLastSyncTimestamp(): Promise<number | null> {
  try {
    const settings = await db.settings.toArray();
    return settings[0]?.lastSyncAt || null;
  } catch {
    return null;
  }
}

/**
 * Clear the local cloud event cursor while preserving user preferences.
 */
export async function clearLastSyncTimestamp(): Promise<void> {
  try {
    const settings = await db.settings.toArray();
    if (settings[0]) {
      await db.settings.update(settings[0].id!, {
        lastSyncAt: undefined,
      });
    }
  } catch (error) {
    console.error('[useSync] clearLastSyncTimestamp: failed to clear settings cursor', error);
  }
}

/**
 * Update the local sync cursor with the max processed cloud events.created_at timestamp.
 */
export async function updateLastSyncTimestamp(lastSyncedCreatedAt: number): Promise<void> {
  if (lastSyncedCreatedAt == null || !Number.isFinite(lastSyncedCreatedAt)) {
    console.error('[useSync] updateLastSyncTimestamp: invalid lastSyncedCreatedAt, refusing to advance cursor');
    return;
  }

  try {
    const settings = await db.settings.toArray();
    if (settings[0]) {
      await db.settings.update(settings[0].id!, {
        lastSyncAt: lastSyncedCreatedAt,
      });
    }
  } catch (error) {
    console.error('更新同步時間戳失敗:', error);
  }
}
