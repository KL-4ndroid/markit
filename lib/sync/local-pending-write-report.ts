import { db } from '@/lib/db';
import { isSyncLockActive } from '@/lib/sync/sync-runtime-state';
import type { Event } from '@/types/db';
import { getNetworkPort } from '@/lib/platform/network-capability';

export type LocalPendingWriteBlockingReason =
  | 'local_pending_events'
  | 'local_sync_queue_unfinished'
  | 'local_pending_sales_photo_evidence'
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
  pendingSalesPhotoEvidenceCreationCount: number;
  pendingSalesPhotoEvidenceCreationIds: string[];
  pendingSalesPhotoEvidenceCreationCountByStatus: Record<string, number>;
  pendingSalesPhotoEvidencePayloadCount: number;
  pendingSalesPhotoEvidencePayloadIds: string[];
  blockingReasonCodes: LocalPendingWriteBlockingReason[];
  isClean: boolean;
}

const PENDING_EVENT_STATUSES = ['pending', 'local_only'] as const;
const UNFINISHED_SYNC_QUEUE_STATUSES = ['pending', 'syncing', 'failed'] as const;
const UNFINISHED_SALES_PHOTO_EVIDENCE_CREATION_STATUSES = [
  'waiting_for_event_sync',
  'creating',
  'failed_retryable',
  'failed_permanent',
  'blocked_invalid_source',
] as const;

function increment(map: Record<string, number>, key: string | undefined): void {
  const normalized = key && key.trim().length > 0 ? key : 'unknown';
  map[normalized] = (map[normalized] ?? 0) + 1;
}

function isActorMismatch(event: Event, userId?: string): boolean {
  if (!userId) return false;
  if (!event.actor_id || event.actor_id === 'local') return false;
  return event.actor_id !== userId;
}

export async function getLocalPendingWriteReport(userId?: string): Promise<LocalPendingWriteReport> {
  const isOnline = getNetworkPort().getCurrentStatus().connected;
  const syncLocked = isSyncLockActive();
  const blockingReasonCodes = new Set<LocalPendingWriteBlockingReason>();
  const pendingEventCountByType: Record<string, number> = {};
  const pendingEventCountByActorId: Record<string, number> = {};
  const pendingSalesPhotoEvidenceCreationCountByStatus: Record<string, number> = {};

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

    const pendingSalesPhotoEvidenceCreations = await db.salesPhotoEvidencePendingCreations
      .where('status')
      .anyOf([...UNFINISHED_SALES_PHOTO_EVIDENCE_CREATION_STATUSES])
      .toArray();

    const pendingSalesPhotoEvidencePayloads = await db.salesPhotoEvidencePendingPayloads.toArray();

    const pendingEventIds: string[] = [];
    const actorMismatchEventIds: string[] = [];
    const pendingSalesPhotoEvidenceCreationIds: string[] = [];
    const pendingSalesPhotoEvidencePayloadIds: string[] = [];

    for (const event of pendingEvents) {
      if (event.id) pendingEventIds.push(event.id);
      increment(pendingEventCountByType, event.type);
      increment(pendingEventCountByActorId, event.actor_id);

      if (isActorMismatch(event, userId)) {
        if (event.id) actorMismatchEventIds.push(event.id);
      }
    }

    for (const item of pendingSalesPhotoEvidenceCreations) {
      if (item.queueId) pendingSalesPhotoEvidenceCreationIds.push(item.queueId);
      increment(pendingSalesPhotoEvidenceCreationCountByStatus, item.status);
    }

    for (const item of pendingSalesPhotoEvidencePayloads) {
      if (item.queueId) pendingSalesPhotoEvidencePayloadIds.push(item.queueId);
    }

    if (pendingEvents.length > 0) blockingReasonCodes.add('local_pending_events');
    if (unfinishedSyncQueueCount > 0) blockingReasonCodes.add('local_sync_queue_unfinished');
    if (pendingSalesPhotoEvidenceCreations.length > 0) {
      blockingReasonCodes.add('local_pending_sales_photo_evidence');
    }
    if (pendingSalesPhotoEvidencePayloads.length > 0) {
      blockingReasonCodes.add('local_pending_sales_photo_evidence');
    }
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
      pendingSalesPhotoEvidenceCreationCount: pendingSalesPhotoEvidenceCreations.length,
      pendingSalesPhotoEvidenceCreationIds,
      pendingSalesPhotoEvidenceCreationCountByStatus,
      pendingSalesPhotoEvidencePayloadCount: pendingSalesPhotoEvidencePayloads.length,
      pendingSalesPhotoEvidencePayloadIds,
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
      pendingSalesPhotoEvidenceCreationCount: 0,
      pendingSalesPhotoEvidenceCreationIds: [],
      pendingSalesPhotoEvidenceCreationCountByStatus,
      pendingSalesPhotoEvidencePayloadCount: 0,
      pendingSalesPhotoEvidencePayloadIds: [],
      blockingReasonCodes: codes,
      isClean: false,
    };
  }
}
