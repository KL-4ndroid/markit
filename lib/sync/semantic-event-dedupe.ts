import type { DealClosedPayload, Event } from '@/types/db';

export type SyncEventLike = {
  id?: string;
  type?: string;
  payload?: any;
  market_id?: string;
  timestamp?: string | number;
};

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

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function formatLocalDate(timestamp: string | number | undefined): string | undefined {
  if (timestamp === undefined) return undefined;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDealClosedMarketId(event: SyncEventLike): string | undefined {
  return (
    event.payload?.market_id ??
    event.payload?.marketId ??
    event.market_id
  );
}

export function getDealClosedDate(event: SyncEventLike): string | undefined {
  return event.payload?.dealDate ?? event.payload?.deal_date ?? formatLocalDate(event.timestamp);
}

export function getDealClosedRevenue(event: SyncEventLike): number {
  const payload = event.payload ?? {};
  const directRevenue = payload.manualRevenue ?? payload.manual_revenue ?? payload.totalAmount ?? payload.total_amount;
  if (typeof directRevenue === 'number' && Number.isFinite(directRevenue)) {
    return directRevenue;
  }

  if (Array.isArray(payload.items)) {
    return payload.items.reduce((sum: number, item: any) => {
      const price = finiteNumber(item.price_at_time_of_sale ?? item.priceAtTimeOfSale ?? item.price);
      const quantity = finiteNumber(item.quantity);
      return sum + price * quantity;
    }, 0);
  }

  return 0;
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
