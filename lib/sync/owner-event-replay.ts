import { db } from '@/lib/db';
import { eventHandlers } from '@/lib/db/events';
import { normalizeEventPayloadForLocal } from '@/lib/data-mappers';
import { getDealItems, getDealItemProductId, getEventMarketId, getTombstoneTargetEventId } from '@/lib/events/event-read-model';
import type { Event } from '@/types/db';

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
  options: { onProgress?: (current: number, total: number) => void; assertActive?: () => void } = {},
): Promise<void> {
  const existing = await db.events.toArray();
  const ordered = orderOwnerReplayEvents(incoming, existing);
  const existingIds = new Set(existing.map(e => e.id));
  const deletedTargets = new Set(existing.filter(e => e.type === 'deal_deleted' || e.type === 'interaction_deleted')
    .map(e => `${getEventMarketId(e)}:${getTombstoneTargetEventId(e)}`));
  const batchSize = 50;
  for (let start = 0; start < ordered.length; start += batchSize) {
    options.assertActive?.();
    const batch = ordered.slice(start, start + batchSize);
    await db.transaction('rw', [db.events, db.markets, db.products, db.dailyStats, db.settings, db.venues, db.operationSchedules], async () => {
      for (const event of batch) {
        options.assertActive?.();
        if (existingIds.has(event.id)) continue;
        // Hydration already supplies the market's current metadata. Do not reset it
        // or mistake its expected existing ID for an arbitrary ConstraintError.
        const hydratedCreation = event.type === 'market_created' && await db.markets.get(getEventMarketId(event) ?? '');
        const targetKey = `${getEventMarketId(event)}:${getTombstoneTargetEventId(event)}`;
        const isDeletion = event.type === 'deal_deleted' || event.type === 'interaction_deleted';
        const handler = eventHandlers[event.type];
        if (!handler) throw new Error(`Unsupported cloud event type: ${event.type}`);
        await db.events.add(event);
        if (!hydratedCreation && !(isDeletion && deletedTargets.has(targetKey))) {
          await handler({ ...event, payload: normalizeEventPayloadForLocal(event.payload) }, db);
        }
        if (isDeletion) deletedTargets.add(targetKey);
      }
    });
    options.onProgress?.(Math.min(start + batchSize, ordered.length), ordered.length);
  }
}
