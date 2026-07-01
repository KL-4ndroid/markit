import { db } from '@/lib/db';
import { isSyncLockActive } from '@/lib/sync/sync-runtime-state';
import type { Event } from '@/types/db';

export type LocalPendingWriteBlockingReason =
  | 'local_pending_events'
  | 'local_sync_queue_unfinished'
  | 'actor_mismatch'
  | 'offline'
  | 'sync_locked'
  | 'read_failed';

export interface LocalPendingWriteReport {
  checkedAt: number;
  userId?: string;
  isOnline: boolean;
  syncLocked: boolean;
  pendingEventCount: number;
  pendingEventIds: string[];
  pendingEventCountByType: Record<string, number>;
  pendingEventCountByActorId: Record<string, number>;
  actorMismatchEventIds: string[];
  unfinishedSyncQueueCount: number;
  blockingReasonCodes: LocalPendingWriteBlockingReason[];
  isClean: boolean;
}

const PENDING_EVENT_STATUSES = ['pending', 'local_only'] as const;
const UNFINISHED_SYNC_QUEUE_STATUSES = ['pending', 'syncing', 'failed'] as const;

function increment(map: Record<string, number>, key: string | undefined): void {
  const normalized = key && key.trim().length > 0 ? key : 'unknown';
  map[normalized] = (map[normalized] ?? 0) + 1;
}

function getBrowserOnlineState(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

function isActorMismatch(event: Event, userId?: string): boolean {
  if (!userId) return false;
  if (!event.actor_id || event.actor_id === 'local') return false;
  return event.actor_id !== userId;
}

export async function getLocalPendingWriteReport(userId?: string): Promise<LocalPendingWriteReport> {
  const isOnline = getBrowserOnlineState();
  const syncLocked = isSyncLockActive();
  const blockingReasonCodes = new Set<LocalPendingWriteBlockingReason>();
  const pendingEventCountByType: Record<string, number> = {};
  const pendingEventCountByActorId: Record<string, number> = {};

  if (!isOnline) blockingReasonCodes.add('offline');
  if (syncLocked) blockingReasonCodes.add('sync_locked');

  try {
    const pendingEvents = await db.events
      .where('sync_status')
      .anyOf([...PENDING_EVENT_STATUSES])
      .toArray();

    const unfinishedSyncQueueCount = await db.syncQueue
      .where('status')
      .anyOf([...UNFINISHED_SYNC_QUEUE_STATUSES])
      .count();

    const pendingEventIds: string[] = [];
    const actorMismatchEventIds: string[] = [];

    for (const event of pendingEvents) {
      if (event.id) pendingEventIds.push(event.id);
      increment(pendingEventCountByType, event.type);
      increment(pendingEventCountByActorId, event.actor_id);

      if (isActorMismatch(event, userId)) {
        if (event.id) actorMismatchEventIds.push(event.id);
      }
    }

    if (pendingEvents.length > 0) blockingReasonCodes.add('local_pending_events');
    if (unfinishedSyncQueueCount > 0) blockingReasonCodes.add('local_sync_queue_unfinished');
    if (actorMismatchEventIds.length > 0) blockingReasonCodes.add('actor_mismatch');

    const codes = Array.from(blockingReasonCodes);

    return {
      checkedAt: Date.now(),
      userId,
      isOnline,
      syncLocked,
      pendingEventCount: pendingEvents.length,
      pendingEventIds,
      pendingEventCountByType,
      pendingEventCountByActorId,
      actorMismatchEventIds,
      unfinishedSyncQueueCount,
      blockingReasonCodes: codes,
      isClean: codes.length === 0,
    };
  } catch {
    blockingReasonCodes.add('read_failed');
    const codes = Array.from(blockingReasonCodes);

    return {
      checkedAt: Date.now(),
      userId,
      isOnline,
      syncLocked,
      pendingEventCount: 0,
      pendingEventIds: [],
      pendingEventCountByType,
      pendingEventCountByActorId,
      actorMismatchEventIds: [],
      unfinishedSyncQueueCount: 0,
      blockingReasonCodes: codes,
      isClean: false,
    };
  }
}
