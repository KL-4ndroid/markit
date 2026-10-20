import type { DealClosedPayload, Event } from '@/types/db';
import {
  getDealEventDate,
  getDealEventRevenue,
  getPayloadPreferredEventMarketId,
  type EventLike,
} from '@/lib/events/event-read-model';

export type SyncEventLike = EventLike;

type EventsTableLike = {
  where: (index: string) => {
    equals: (value: string) => {
      and?: (predicate: (event: Event) => boolean) => {
        toArray: () => Promise<Event[]>;
      };
      toArray: () => Promise<Event[]>;
    };
  };
};

export type SemanticDedupeDbLike = {
  events: EventsTableLike;
};

export function getDealClosedMarketId(event: SyncEventLike): string | undefined {
  return getPayloadPreferredEventMarketId(event);
}

export function getDealClosedDate(event: SyncEventLike): string | undefined {
  return getDealEventDate(event) || undefined;
}

export function getDealClosedRevenue(event: SyncEventLike): number {
  return getDealEventRevenue(event);
}

export function isSemanticDuplicateDealClosedEvent(
  candidate: SyncEventLike,
  existing: SyncEventLike
): boolean {
  if (candidate.type !== 'deal_closed' || existing.type !== 'deal_closed') {
    return false;
  }

  const candidateMarketId = getDealClosedMarketId(candidate);
  const existingMarketId = getDealClosedMarketId(existing);
  if (!candidateMarketId || candidateMarketId !== existingMarketId) {
    return false;
  }

  const candidateDate = getDealClosedDate(candidate);
  const existingDate = getDealClosedDate(existing);
  if (!candidateDate || candidateDate !== existingDate) {
    return false;
  }

  return Math.abs(getDealClosedRevenue(candidate) - getDealClosedRevenue(existing)) < 0.0001;
}

export async function hasSemanticDuplicateDealClosedEvent(
  dbLike: SemanticDedupeDbLike,
  candidate: SyncEventLike
): Promise<boolean> {
  if (candidate.type !== 'deal_closed') {
    return false;
  }

  const marketId = getDealClosedMarketId(candidate);
  if (!marketId) {
    return false;
  }

  const collection = dbLike.events.where('type').equals('deal_closed');
  const existingEvents =
    typeof collection.and === 'function'
      ? await collection.and(event => getDealClosedMarketId(event as Event<DealClosedPayload>) === marketId).toArray()
      : await collection.toArray();

  return existingEvents.some(existing => isSemanticDuplicateDealClosedEvent(candidate, existing));
}
