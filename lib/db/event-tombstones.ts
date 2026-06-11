import type { DealClosedPayload, Event, InteractionRecordedPayload } from '@/types/db';
import { getDealEventDate, getDealEventRevenue, getEventMarketId } from '@/lib/markets/event-view-utils';
import { db } from './index';

type DeletedEventPayload = {
  eventId?: string;
  event_id?: string;
};

type DealDeletedPayloadView = DeletedEventPayload & {
  market_id?: string;
  marketId?: string;
  dealDate?: string;
  deal_date?: string;
  totalAmount?: number;
  total_amount?: number;
  dealCount?: number;
  deal_count?: number;
};

function getDeletedPayloadEventId(payload: DeletedEventPayload | undefined): string | undefined {
  const eventId = payload?.eventId ?? payload?.event_id;
  return typeof eventId === 'string' && eventId.length > 0 ? eventId : undefined;
}

export async function getDeletedEventIds(): Promise<Set<string>> {
  const deletedEvents = await db.events
    .where('type')
    .anyOf(['interaction_deleted', 'deal_deleted'])
    .toArray() as Event<DeletedEventPayload>[];

  return new Set(
    deletedEvents
      .map(event => getDeletedPayloadEventId(event.payload))
      .filter((eventId): eventId is string => typeof eventId === 'string' && eventId.length > 0)
  );
}

export function withoutDeletedEvents<T extends Event>(
  events: T[],
  deletedEventIds: Set<string>
): T[] {
  return events.filter(event => !event.id || !deletedEventIds.has(event.id));
}

function getDealCountForKey(event: Event<DealClosedPayload> | Event<DealDeletedPayloadView>): number {
  const payload = event.payload as DealClosedPayload & DealDeletedPayloadView;
  const dealCount = payload.dealCount ?? payload.deal_count ?? payload.manualDealCount ?? 1;
  return typeof dealCount === 'number' && Number.isFinite(dealCount) ? dealCount : 1;
}

function getDealTombstoneKey(event: Event<DealClosedPayload> | Event<DealDeletedPayloadView>): string | undefined {
  const marketId = getEventMarketId(event);
  const date = getDealEventDate(event as Event<DealClosedPayload>);
  const revenue = getDealEventRevenue(event as Event<DealClosedPayload>);
  const dealCount = getDealCountForKey(event);

  if (!marketId || !date || !Number.isFinite(revenue) || !Number.isFinite(dealCount)) {
    return undefined;
  }

  return `${marketId}|${date}|${revenue}|${dealCount}`;
}

export function withoutDeletedDealEvents(
  events: Event<DealClosedPayload>[],
  deletedEvents: Event<DealDeletedPayloadView>[]
): Event<DealClosedPayload>[] {
  const eventIds = new Set(events.map(event => event.id).filter((id): id is string => typeof id === 'string'));
  const deletedEventIds = new Set<string>();
  const semanticDeleteCounts = new Map<string, number>();

  for (const deletedEvent of deletedEvents) {
    const deletedEventId = getDeletedPayloadEventId(deletedEvent.payload);
    if (deletedEventId) {
      deletedEventIds.add(deletedEventId);
    }

    // If the exact target exists locally, id-based filtering is more precise.
    if (deletedEventId && eventIds.has(deletedEventId)) {
      continue;
    }

    const key = getDealTombstoneKey(deletedEvent);
    if (!key) continue;

    semanticDeleteCounts.set(key, (semanticDeleteCounts.get(key) ?? 0) + 1);
  }

  return events.filter(event => {
    if (event.id && deletedEventIds.has(event.id)) {
      return false;
    }

    const key = getDealTombstoneKey(event);
    if (!key) return true;

    const remainingDeletes = semanticDeleteCounts.get(key) ?? 0;
    if (remainingDeletes <= 0) return true;

    if (remainingDeletes === 1) {
      semanticDeleteCounts.delete(key);
    } else {
      semanticDeleteCounts.set(key, remainingDeletes - 1);
    }

    return false;
  });
}

export async function getActiveInteractionEvents(): Promise<Event<InteractionRecordedPayload>[]> {
  const [events, deletedEventIds] = await Promise.all([
    db.events.where('type').equals('interaction_recorded').toArray() as Promise<Event<InteractionRecordedPayload>[]>,
    getDeletedEventIds(),
  ]);

  return withoutDeletedEvents(events, deletedEventIds);
}

export async function getActiveDealEvents(): Promise<Event<DealClosedPayload>[]> {
  const [events, deletedEvents] = await Promise.all([
    db.events.where('type').equals('deal_closed').toArray() as Promise<Event<DealClosedPayload>[]>,
    db.events.where('type').equals('deal_deleted').toArray() as Promise<Event<DealDeletedPayloadView>[]>,
  ]);

  return withoutDeletedDealEvents(events, deletedEvents);
}
