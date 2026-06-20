import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase/client';
import { normalizeEventPayloadForLocal } from '@/lib/data-mappers';
import { batchHydrateMarkets } from '@/lib/sync/owner-market-hydration-service';
import { getOwnerAccessibleMarketIds } from '@/lib/sync/owner-market-access-service';
import { collectProjectionMarketId } from '@/lib/sync/projection-reconciliation';
import { hasSemanticDuplicateDealClosedEvent } from '@/lib/sync/semantic-event-dedupe';
import { getLastSyncTimestamp, updateLastSyncTimestamp } from '@/lib/sync/sync-cursor-service';
import { reconcileSyncedProjectionMarkets } from '@/lib/sync/sync-projection-reconciliation-runner';
import { createCanonicalSyncedEvent } from '@/lib/sync/synced-event-factory';
import type { InfoLevel } from '@/lib/data-sanitization';
import type { Event } from '@/types/db';

export async function pullOwnerEvents(
  userId: string,
  onProgress: (current: number, total: number, currentItem?: string, phase?: 'incremental') => void,
  infoLevel: InfoLevel
): Promise<void> {
  const lastSyncAt = await getLastSyncTimestamp();
  const marketIds = await getOwnerAccessibleMarketIds(userId);

  let query = supabase
    .from('events')
    .select('*')
    .order('timestamp', { ascending: true });

  if (lastSyncAt) {
    query = query.gt('created_at', new Date(lastSyncAt).toISOString());
  }

  let teamMemberIds: string[] = [userId];

  if (marketIds.length > 0) {
    const { data: teamMembers } = await supabase
      .from('market_members')
      .select('user_id')
      .in('market_id', marketIds);

    if (teamMembers && teamMembers.length > 0) {
      teamMemberIds = Array.from(new Set([userId, ...teamMembers.map(m => m.user_id)]));
    }
  }

  if (marketIds.length > 0) {
    query = query.or(`market_id.in.(${marketIds.join(',')}),and(actor_id.in.(${teamMemberIds.join(',')}),market_id.is.null)`);
  } else {
    query = query.eq('actor_id', userId).is('market_id', null);
  }

  const { data: newEvents, error: eventsError } = await query;

  if (eventsError) throw eventsError;

  if (!newEvents || newEvents.length === 0) {
    return;
  }

  const total = newEvents.length;
  const touchedMarketIds = new Set<string>();
  for (const event of newEvents) {
    collectProjectionMarketId(touchedMarketIds, event);
  }

  const { hydrated: hydratedMarketIds, missing: missingMarketIds } = await batchHydrateMarkets(touchedMarketIds, infoLevel);
  void hydratedMarketIds;

  const existingIds = new Set<string>();
  const eventIds = newEvents.map(e => e.id);
  const existingEvents = await db.events.where('id').anyOf(eventIds).toArray();
  existingEvents.forEach(e => existingIds.add(e.id!));

  const eventsToProcess: any[] = [];
  let skippedByMissingMarket = 0;
  let semanticDuplicateCount = 0;
  for (const event of newEvents) {
    if (existingIds.has(event.id)) continue;

    if (await hasSemanticDuplicateDealClosedEvent(db, event)) {
      semanticDuplicateCount++;
      continue;
    }

    const eventMarketId = event.market_id ?? event.payload?.market_id ?? event.payload?.marketId;
    if (eventMarketId && missingMarketIds.has(eventMarketId)) {
      skippedByMissingMarket++;
      console.warn(`[hydration] Skipping event ${event.type} (${event.id?.slice(0, 8)}) because market ${eventMarketId} not found in Cloud`);
      continue;
    }

    eventsToProcess.push(event);
  }

  if (skippedByMissingMarket > 0) {
    console.warn(`[hydration] Skipped ${skippedByMissingMarket} events because their market is missing from Cloud`);
  }

  if (eventsToProcess.length === 0) {
    console.log(`All ${total} events were skipped as duplicates or unavailable`);
    if (semanticDuplicateCount > 0) {
      console.warn('[useSync] Skipped semantic duplicate deal_closed events', {
        semanticDuplicateCount,
      });
    }
    await reconcileSyncedProjectionMarkets(touchedMarketIds, 'owner-full');
    const validCreatedAt = newEvents
      .map(e => new Date(e.created_at).getTime())
      .filter(ts => Number.isFinite(ts));
    if (validCreatedAt.length > 0) {
      await updateLastSyncTimestamp(Math.max(...validCreatedAt));
    } else {
      console.warn('[useSync] pullAllEvents: no event has valid created_at, refusing to advance cursor');
    }
    return;
  }

  if (eventsToProcess.length < total) {
    console.log(`Processing ${eventsToProcess.length} of ${total} events after skipping ${existingIds.size} existing events`);
  }

  let processedCount = 0;
  for (let i = 0; i < eventsToProcess.length; i++) {
    const event = eventsToProcess[i];

    if (onProgress) {
      onProgress(i + 1, eventsToProcess.length, `${event.type} (${event.id?.substring(0, 8)}...)`, 'incremental');
    }

    try {
      const localEvent = createCanonicalSyncedEvent(event);
      await db.events.add(localEvent);

      const { eventHandlers } = await import('@/lib/db/events');
      const handler = eventHandlers[event.type as keyof typeof eventHandlers];

      if (handler) {
        const processedPayload = normalizeEventPayloadForLocal(localEvent.payload);

        await handler({
          id: localEvent.id,
          type: localEvent.type,
          payload: processedPayload,
          timestamp: localEvent.timestamp,
          actor_id: localEvent.actor_id,
          market_id: localEvent.market_id,
        } as Event, db);
      }

      processedCount++;
    } catch (error: any) {
      if (error.name === 'ConstraintError') {
        continue;
      }

      console.error(`Failed to replay event: ${event.type} (${event.id?.substring(0, 8)}...)`, error);
      continue;
    }
  }

  console.log(`Owner event pull complete: processed ${processedCount}/${eventsToProcess.length} events`);

  await reconcileSyncedProjectionMarkets(touchedMarketIds, 'owner-full');

  if (eventsToProcess.length > 0) {
    const validCreatedAt = newEvents
      .map(e => new Date(e.created_at).getTime())
      .filter(ts => Number.isFinite(ts));

    if (validCreatedAt.length > 0) {
      await updateLastSyncTimestamp(Math.max(...validCreatedAt));
    } else {
      console.warn('[useSync] pullAllEvents: no event has valid created_at, refusing to advance cursor');
    }
  }
}
