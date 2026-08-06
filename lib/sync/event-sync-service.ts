/**
 * Event Sync Status Service
 *
 * Centralized helpers for mutating sync metadata on event records.
 * Only sync operational fields are updated — id, type, payload,
 * timestamp, and market_id are never touched.
 */

import { db } from '@/lib/db';

/**
 * Extended metadata shape used by the sync service.
 * Merges the base Event metadata with sync-specific fields.
 */
interface SyncMetadata {
  userId?: string;
  deviceId?: string;
  version?: string;
  invalid_reason?: string;
  original_actor_id?: string;
  blocked_at?: number;
  [key: string]: unknown;
}

function assertNonBlank(value: string, name: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} must be a non-blank string`);
  }
}

/**
 * Bind a real actor ID to an event that was created in local-only mode.
 * Only actor_id is updated.
 */
export async function bindEventActor(eventId: string, actorId: string): Promise<void> {
  assertNonBlank(eventId, 'eventId');
  assertNonBlank(actorId, 'actorId');

  const existing = await db.events.get(eventId);
  if (!existing) {
    throw new Error(`Event not found: ${eventId}`);
  }

  await db.events.update(eventId, { actor_id: actorId });
}

/**
 * Mark an event as successfully synced to the cloud.
 * Only sync_status is updated.
 */
export async function markEventSynced(eventId: string): Promise<void> {
  assertNonBlank(eventId, 'eventId');

  const existing = await db.events.get(eventId);
  if (!existing) {
    throw new Error(`Event not found: ${eventId}`);
  }

  await db.events.update(eventId, { sync_status: 'synced' });
}

/**
 * Mark an event as local-only (sync not possible, will retry).
 * Only sync_status is updated.
 */
export async function markEventLocalOnly(eventId: string): Promise<void> {
  assertNonBlank(eventId, 'eventId');

  const existing = await db.events.get(eventId);
  if (!existing) {
    throw new Error(`Event not found: ${eventId}`);
  }

  await db.events.update(eventId, { sync_status: 'local_only' });
}

/**
 * Mark an event as blocked from syncing, preserving metadata for audit.
 * Updates sync_status to 'synced' (event will not retry) and merges
 * blocking metadata into the existing event metadata.
 */
export async function markEventBlocked(
  eventId: string,
  reason: string,
  originalActorId?: string,
): Promise<void> {
  assertNonBlank(eventId, 'eventId');
  assertNonBlank(reason, 'reason');

  const existing = await db.events.get(eventId);
  if (!existing) {
    throw new Error(`Event not found: ${eventId}`);
  }

  await db.events.update(eventId, {
    sync_status: 'synced',
    metadata: {
      ...(existing.metadata as SyncMetadata | undefined),
      invalid_reason: reason,
      original_actor_id: originalActorId ?? existing.actor_id,
      blocked_at: Date.now(),
    } as SyncMetadata,
  });
}
