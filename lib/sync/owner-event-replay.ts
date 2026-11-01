import { db } from '@/lib/db';
import { eventHandlers } from '@/lib/db/events';
import { normalizeEventPayloadForLocal } from '@/lib/data-mappers';
import { getDealItems, getDealItemProductId, getEventMarketId, getTombstoneTargetEventId } from '@/lib/events/event-read-model';
import type { Event } from '@/types/db';
import { createReplayProjectionBatch } from './replay-projection-batch';

/** Conservative structural equality; JSON.stringify would conflate NaN and null. */
function sameReplayRecord(left: unknown, right: unknown): boolean {
  const pending: [unknown, unknown][] = [[left, right]];
  const visited = new WeakSet<object>();
  while (pending.length) {
    const [a, b] = pending.pop()!;
    if (Object.is(a, b)) continue;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    if (visited.has(a)) return false;
    visited.add(a);
    if (!Array.isArray(a) && (Object.getPrototypeOf(a) !== Object.prototype || Object.getPrototypeOf(b) !== Object.prototype)) return false;
    if (Array.isArray(a) && a.length !== (b as unknown[]).length) return false;
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      pending.push([(a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]]);
    }
  }
  return true;
}

/** Stable dependency ordering: historical backfills may be dated after their deletion. */
export function orderOwnerReplayEvents(incoming: readonly Event[], existing: readonly Event[] = []): Event[] {
  const byId = new Map(existing.concat(incoming).filter(e => e.id).map(e => [e.id!, e]));
  const incomingIds = new Set(incoming.map(e => e.id));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const productCreations = new Map(incoming.filter(e => e.type === 'product_created').map(e => [e.payload.productId ?? e.payload.product_id, e]));
  const marketCreations = new Map(incoming.filter(e => e.type === 'market_created').map(e => [getEventMarketId(e), e]));
  const ordered: Event[] = [];
  const visit = (event: Event) => {
    if (!event.id) throw new Error('Cloud event is missing its ID');
    if (visited.has(event.id)) return;
    if (visiting.has(event.id)) throw new Error('Cyclic cloud event dependency');
    visiting.add(event.id);
    const marketCreation = marketCreations.get(getEventMarketId(event));
    if (marketCreation && marketCreation.id !== event.id) visit(marketCreation);
    const productIds = event.type === 'deal_closed'
      ? getDealItems(event).map(getDealItemProductId)
      : event.type === 'product_updated' || event.type === 'product_deleted' ? [event.payload.productId ?? event.payload.product_id] : [];
    for (const productId of productIds) {
      const creation = productCreations.get(productId);
      if (creation) visit(creation);
    }
    if (event.type === 'deal_deleted' || event.type === 'interaction_deleted') {
      const original = byId.get(getTombstoneTargetEventId(event) ?? '');
      const expected = event.type === 'deal_deleted' ? 'deal_closed' : 'interaction_recorded';
      if (!original || original.type !== expected || !getEventMarketId(event)
        || getEventMarketId(original) !== getEventMarketId(event)) {
        throw new Error('Deletion source is missing or belongs to another market');
      }
      if (incomingIds.has(original.id)) visit(original);
    }
    visited.add(event.id);
    visiting.delete(event.id);
    ordered.push(event);
  };
  [...incoming].sort((a, b) => a.timestamp - b.timestamp).forEach(visit);
  return ordered;
}

/** Each bounded batch commits both event IDs and projections, or neither. */
export async function replayOwnerEvents(
  incoming: readonly Event[],
  options: { onProgress?: (current: number, total: number) => void; assertActive?: () => void; refreshSyncedPayloads?: boolean;
    /** false is reserved for reference-path parity tests and profiling. */
    projectionBatching?: boolean } = {},
): Promise<void> {
  options.assertActive?.();
  if (!incoming.length) return;
  const ids = [...new Set(incoming.map(event => event.id).filter((id): id is string => !!id))];
  const incomingIds = new Set(ids);
  const deletions = incoming.filter(event => event.type === 'deal_deleted' || event.type === 'interaction_deleted');
  const dependencyIds = [...new Set(deletions.map(getTombstoneTargetEventId).filter((id): id is string => !!id && !incomingIds.has(id)))];
  // Incremental reads must not deserialize every historical sale on this device.
  const hasLocalHistory = await db.events.count() > 0;
  const [existingRows, dependencies, priorDeletions] = hasLocalHistory ? await Promise.all([
    db.events.bulkGet(ids), db.events.bulkGet(dependencyIds),
    deletions.length ? db.events.where('type').anyOf(['deal_deleted', 'interaction_deleted']).toArray() : Promise.resolve([]),
  ]) : [[], [], []];
  options.assertActive?.();
  const existing = existingRows.filter((event): event is Event => !!event);
  const ordered = orderOwnerReplayEvents(incoming, [...existing, ...dependencies.filter((event): event is Event => !!event)]);
  const existingIds = new Set(existing.map(e => e.id));
  const existingById = new Map(existing.map(event => [event.id, event]));
  const unchangedIds = new Set(ordered.filter(event => {
    const previous = existingById.get(event.id);
    return options.refreshSyncedPayloads && previous?.sync_status === 'synced' && sameReplayRecord(previous, event);
  }).map(event => event.id));
  const deletedTargets = new Set(priorDeletions
    .map(e => `${getEventMarketId(e)}:${getTombstoneTargetEventId(e)}`));
  const batchSize = 50;
  for (let start = 0; start < ordered.length; start += batchSize) {
    options.assertActive?.();
    const batch = ordered.slice(start, start + batchSize);
    if (batch.every(event => existingIds.has(event.id) && (!options.refreshSyncedPayloads || unchangedIds.has(event.id)))) {
      options.onProgress?.(Math.min(start + batchSize, ordered.length), ordered.length);
      continue;
    }
    await db.transaction('rw', [db.events, db.markets, db.products, db.dailyStats, db.settings, db.venues, db.operationSchedules], async () => {
      const projectionBatch = options.projectionBatching === false ? null
        : await createReplayProjectionBatch(db, batch.filter(event => !existingIds.has(event.id)), () => options.assertActive?.());
      for (const event of batch) {
        options.assertActive?.();
        if (existingIds.has(event.id)) {
          // A Free read may have stored a masked foundation payload. Restore the
          // complete cloud record without replaying projections twice or touching drafts.
          if (options.refreshSyncedPayloads && !unchangedIds.has(event.id) && (await db.events.get(event.id!))?.sync_status === 'synced') await db.events.put(event);
          continue;
        }
        // Hydration already supplies the market's current metadata. Do not reset it
        // or mistake its expected existing ID for an arbitrary ConstraintError.
        const hydratedCreation = event.type === 'market_created' && await db.markets.get(getEventMarketId(event) ?? '');
        const targetKey = `${getEventMarketId(event)}:${getTombstoneTargetEventId(event)}`;
        const isDeletion = event.type === 'deal_deleted' || event.type === 'interaction_deleted';
        const handler = eventHandlers[event.type];
        if (!handler) throw new Error(`Unsupported cloud event type: ${event.type}`);
        await db.events.add(event);
        if (!hydratedCreation && !(isDeletion && deletedTargets.has(targetKey))) {
          await handler({ ...event, payload: normalizeEventPayloadForLocal(event.payload) }, projectionBatch?.database ?? db, { quiet: true });
        }
        if (isDeletion) deletedTargets.add(targetKey);
      }
      await projectionBatch?.flush();
    });
    options.onProgress?.(Math.min(start + batchSize, ordered.length), ordered.length);
  }
}
