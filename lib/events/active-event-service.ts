import type { DealClosedPayload, Event, InteractionRecordedPayload } from '@/types/db';
import { db } from '@/lib/db';
import {
  getActiveDealEvents,
  getActiveInteractionEvents,
  withoutDeletedDealEvents,
} from '@/lib/db/event-tombstones';
import {
  getDealEventCount,
  getDealEventDate,
  getDealEventRevenue,
  getEventMarketId,
  getLocalDateStringFromTimestamp,
} from '@/lib/events/event-read-model';

type DealDeletedEventView = Event<Record<string, unknown>>;

export interface DealSummaryByDate {
  date: string;
  dealCount: number;
  eventCount: number;
  revenue: number;
}

export interface DealSummary {
  marketId: string;
  dealCount: number;
  eventCount: number;
  revenue: number;
  byDate: DealSummaryByDate[];
}

function sortEventsByTimestamp<T extends Pick<Event, 'timestamp'>>(events: T[]): T[] {
  return [...events].sort((a, b) => a.timestamp - b.timestamp);
}

function sortSummaryByDate(rows: DealSummaryByDate[]): DealSummaryByDate[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}

export function filterDealEventsForMarket(
  events: Event<DealClosedPayload>[],
  marketId: string
): Event<DealClosedPayload>[] {
  if (!marketId) return [];
  return sortEventsByTimestamp(events.filter(event => getEventMarketId(event) === marketId));
}

export function filterDealEventsForMarkets(
  events: Event<DealClosedPayload>[],
  marketIds: Iterable<string>
): Event<DealClosedPayload>[] {
  const ids = new Set(Array.from(marketIds).filter(id => typeof id === 'string' && id.trim().length > 0));
  if (ids.size === 0) return [];
  return sortEventsByTimestamp(events.filter(event => {
    const marketId = getEventMarketId(event);
    return !!marketId && ids.has(marketId);
  }));
}

export function filterDealEventsForDate(
  events: Event<DealClosedPayload>[],
  marketId: string,
  date: string
): Event<DealClosedPayload>[] {
  if (!date) return [];
  return filterDealEventsForMarket(events, marketId)
    .filter(event => getDealEventDate(event) === date);
}

export function filterActiveDealEventsForMarket(
  events: Event<DealClosedPayload>[],
  deletedEvents: DealDeletedEventView[],
  marketId: string
): Event<DealClosedPayload>[] {
  return filterDealEventsForMarket(
    withoutDeletedDealEvents(events, deletedEvents),
    marketId
  );
}

export function filterActiveDealEventsForMarkets(
  events: Event<DealClosedPayload>[],
  deletedEvents: DealDeletedEventView[],
  marketIds: Iterable<string>
): Event<DealClosedPayload>[] {
  return filterDealEventsForMarkets(
    withoutDeletedDealEvents(events, deletedEvents),
    marketIds
  );
}

export function filterActiveDealEventsForDate(
  events: Event<DealClosedPayload>[],
  deletedEvents: DealDeletedEventView[],
  marketId: string,
  date: string
): Event<DealClosedPayload>[] {
  return filterDealEventsForDate(
    withoutDeletedDealEvents(events, deletedEvents),
    marketId,
    date
  );
}

export function filterInteractionEventsForMarket(
  events: Event<InteractionRecordedPayload>[],
  marketId: string
): Event<InteractionRecordedPayload>[] {
  if (!marketId) return [];
  return sortEventsByTimestamp(events.filter(event => getEventMarketId(event) === marketId));
}

export function filterInteractionEventsForMarkets(
  events: Event<InteractionRecordedPayload>[],
  marketIds: Iterable<string>
): Event<InteractionRecordedPayload>[] {
  const ids = new Set(Array.from(marketIds).filter(id => typeof id === 'string' && id.trim().length > 0));
  if (ids.size === 0) return [];
  return sortEventsByTimestamp(events.filter(event => {
    const marketId = getEventMarketId(event);
    return !!marketId && ids.has(marketId);
  }));
}

export function filterInteractionEventsForDate(
  events: Event<InteractionRecordedPayload>[],
  marketId: string,
  date: string
): Event<InteractionRecordedPayload>[] {
  if (!date) return [];
  return filterInteractionEventsForMarket(events, marketId)
    .filter(event => getLocalDateStringFromTimestamp(event.timestamp) === date);
}

export function buildDealSummaryFromActiveEvents(
  marketId: string,
  activeDeals: Event<DealClosedPayload>[]
): DealSummary {
  const byDate = new Map<string, DealSummaryByDate>();
  let revenue = 0;
  let dealCount = 0;

  for (const event of filterDealEventsForMarket(activeDeals, marketId)) {
    const date = getDealEventDate(event);
    if (!date) continue;

    const eventRevenue = getDealEventRevenue(event);
    const eventDealCount = getDealEventCount(event);

    revenue += eventRevenue;
    dealCount += eventDealCount;

    const existing = byDate.get(date) ?? {
      date,
      dealCount: 0,
      eventCount: 0,
      revenue: 0,
    };

    existing.dealCount += eventDealCount;
    existing.eventCount += 1;
    existing.revenue += eventRevenue;
    byDate.set(date, existing);
  }

  return {
    marketId,
    dealCount,
    eventCount: Array.from(byDate.values()).reduce((sum, row) => sum + row.eventCount, 0),
    revenue,
    byDate: sortSummaryByDate(Array.from(byDate.values())),
  };
}

export async function getActiveDealEventsForMarket(
  marketId: string
): Promise<Event<DealClosedPayload>[]> {
  const events = await getActiveDealEvents();
  return filterDealEventsForMarket(events, marketId);
}

export async function getActiveDealEventsForMarkets(
  marketIds: Iterable<string>
): Promise<Event<DealClosedPayload>[]> {
  const events = await getActiveDealEvents();
  return filterDealEventsForMarkets(events, marketIds);
}

export async function getActiveDealEventsForDate(
  marketId: string,
  date: string
): Promise<Event<DealClosedPayload>[]> {
  const events = await getActiveDealEvents();
  return filterDealEventsForDate(events, marketId, date);
}

export async function getActiveInteractionEventsForMarket(
  marketId: string
): Promise<Event<InteractionRecordedPayload>[]> {
  const events = await getActiveInteractionEvents();
  return filterInteractionEventsForMarket(events, marketId);
}

export async function getActiveInteractionEventsForMarkets(
  marketIds: Iterable<string>
): Promise<Event<InteractionRecordedPayload>[]> {
  const events = await getActiveInteractionEvents();
  return filterInteractionEventsForMarkets(events, marketIds);
}

export async function getActiveInteractionEventsForDate(
  marketId: string,
  date: string
): Promise<Event<InteractionRecordedPayload>[]> {
  const events = await getActiveInteractionEvents();
  return filterInteractionEventsForDate(events, marketId, date);
}

export async function getDealSummaryFromEvents(marketId: string): Promise<DealSummary> {
  const events = await getActiveDealEventsForMarket(marketId);
  return buildDealSummaryFromActiveEvents(marketId, events);
}

export async function getRawDealEventsForMarket(
  marketId: string
): Promise<Event<DealClosedPayload>[]> {
  if (!marketId) return [];
  const events = await db.events
    .where('type')
    .equals('deal_closed')
    .toArray() as Event<DealClosedPayload>[];
  return filterDealEventsForMarket(events, marketId);
}
