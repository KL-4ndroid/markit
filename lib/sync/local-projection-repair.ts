import { db } from '@/lib/db';
import {
  getDealEventCost,
  getDealEventCount,
  getDealEventDate,
  getDealEventRevenue,
  getDealItemPrice,
  getDealItemCost,
  getDealItemProductId,
  getDealItemQuantity,
  getDealItems,
  getEventMarketId,
  getLocalDateStringFromTimestamp,
  getTombstoneTargetEventId,
  isManualDealEvent,
} from '@/lib/events/event-read-model';
import type { DailyStats, DealClosedPayload, Event, InteractionRecordedPayload } from '@/types/db';

export interface LocalProjectionRepairOptions {
  marketIds?: string[];
  dryRun: boolean;
}

export interface ProjectionSnapshot {
  marketTotalRevenue: number;
  marketTotalDeals: number;
  marketTotalInteractions: number;
  dailyStatsRevenue: number;
  dailyStatsDealCount: number;
  dailyStatsTouchCount: number;
  dailyStatsInquiryCount: number;
  dailyStatsExtraInteractionCount: number;
  dailyStatsRows: number;
  eventRevenue: number;
  eventCount: number;
  eventInteractionCount: number;
}

export interface LocalProjectionRepairItem {
  marketId: string;
  before: ProjectionSnapshot;
  after: ProjectionSnapshot;
}

export interface LocalProjectionRepairResult {
  repaired: LocalProjectionRepairItem[];
  skipped: Array<{
    marketId: string;
    reason:
      | 'blank_market_id'
      | 'local_market_not_found'
      | 'no_deal_events'
      | 'already_consistent'
      | 'projection_lower_than_events';
  }>;
  warnings: string[];
}

type ProductSoldEntry = DailyStats['productsSold'][number];

interface DealProjection {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  dealCount: number;
  productsSold: DailyStats['productsSold'];
}

interface InteractionProjection {
  date: string;
  type: string;
  updatedAt: number;
}

interface MarketStatsRebuildPlan {
  marketId: string;
  before: ProjectionSnapshot;
  after: ProjectionSnapshot;
  rebuiltDailyStats: DailyStats[];
  currentDailyStats: DailyStats[];
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getEventDate(event: Event): string {
  return getLocalDateStringFromTimestamp(event.timestamp) ?? '';
}

function projectDealEvent(event: Event<DealClosedPayload>): DealProjection {
  const productsSold: DailyStats['productsSold'] = [];

  if (isManualDealEvent(event)) {
    const revenue = getDealEventRevenue(event);
    const cost = getDealEventCost(event);
    return {
      date: getDealEventDate(event),
      revenue,
      cost,
      profit: revenue - cost,
      dealCount: getDealEventCount(event),
      productsSold,
    };
  }

  const items = getDealItems(event);
  if (items.length > 0) {
    let revenue = 0;
    let cost = 0;

    for (const item of items) {
      const quantity = getDealItemQuantity(item);
      const itemRevenue = getDealItemPrice(item) * quantity;
      revenue += itemRevenue;
      cost += getDealItemCost(item) * quantity;

      const productId = getDealItemProductId(item);
      if (nonBlankString(productId)) {
        productsSold.push({
          productId,
          quantity,
          revenue: itemRevenue,
        });
      }
    }

    return {
      date: getDealEventDate(event),
      revenue: revenue || getDealEventRevenue(event),
      cost: cost || getDealEventCost(event),
      profit: (revenue || getDealEventRevenue(event)) - (cost || getDealEventCost(event)),
      dealCount: 1,
      productsSold: mergeProductsSold([], productsSold),
    };
  }

  const revenue = getDealEventRevenue(event);
  const cost = getDealEventCost(event);
  return {
    date: getDealEventDate(event),
    revenue,
    cost,
    profit: revenue - cost,
    dealCount: 1,
    productsSold,
  };
}

function projectInteractionEvent(event: Event<InteractionRecordedPayload>): InteractionProjection {
  return {
    date: getEventDate(event),
    type: nonBlankString(event.payload.type) ? event.payload.type : 'unknown',
    updatedAt: event.timestamp,
  };
}

function mergeProductsSold(
  existing: DailyStats['productsSold'],
  additions: DailyStats['productsSold']
): DailyStats['productsSold'] {
  const merged = new Map<string, ProductSoldEntry>();

  for (const item of existing) {
    if (!nonBlankString(item.productId)) continue;
    merged.set(item.productId, {
      productId: item.productId,
      quantity: finiteNumber(item.quantity),
      revenue: finiteNumber(item.revenue),
    });
  }

  for (const item of additions) {
    if (!nonBlankString(item.productId)) continue;
    const current = merged.get(item.productId) ?? {
      productId: item.productId,
      quantity: 0,
      revenue: 0,
    };
    merged.set(item.productId, {
      productId: item.productId,
      quantity: current.quantity + finiteNumber(item.quantity),
      revenue: current.revenue + finiteNumber(item.revenue),
    });
  }

  return Array.from(merged.values());
}

function buildDailyStatsFromEvents(
  marketId: string,
  dealEvents: Array<Event<DealClosedPayload>>,
  interactionEvents: Array<Event<InteractionRecordedPayload>> = []
): DailyStats[] {
  const byDate = new Map<string, DailyStats>();

  function getOrCreate(date: string, updatedAt: number): DailyStats {
    const current = byDate.get(date);
    if (current) return current;

    const stat: DailyStats = {
      date,
      marketId,
      touchCount: 0,
      inquiryCount: 0,
      dealCount: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      productsSold: [],
      updatedAt,
    };
    byDate.set(date, stat);
    return stat;
  }

  for (const event of dealEvents) {
    const projected = projectDealEvent(event);
    const current = getOrCreate(projected.date, event.timestamp);
    current.dealCount += projected.dealCount;
    current.revenue += projected.revenue;
    current.cost += projected.cost;
    current.profit += projected.profit;
    current.productsSold = mergeProductsSold(current.productsSold, projected.productsSold);
    current.updatedAt = Math.max(finiteNumber(current.updatedAt), event.timestamp);
  }

  for (const event of interactionEvents) {
    const projected = projectInteractionEvent(event);
    const current = getOrCreate(projected.date, event.timestamp);

    if (projected.type === 'touch') {
      current.touchCount = finiteNumber(current.touchCount) + 1;
    } else if (projected.type === 'inquiry') {
      current.inquiryCount = finiteNumber(current.inquiryCount) + 1;
    } else {
      const extraInteractions = current.extraInteractions ?? {};
      current.extraInteractions = {
        ...extraInteractions,
        [projected.type]: finiteNumber(extraInteractions[projected.type]) + 1,
      };
    }
    current.updatedAt = Math.max(finiteNumber(current.updatedAt), projected.updatedAt);
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function summarizeDailyStats(
  stats: DailyStats[]
): Pick<
  ProjectionSnapshot,
  'dailyStatsRevenue' | 'dailyStatsDealCount' | 'dailyStatsTouchCount' | 'dailyStatsInquiryCount' | 'dailyStatsExtraInteractionCount' | 'dailyStatsRows'
> {
  return {
    dailyStatsRevenue: stats.reduce((sum, stat) => sum + finiteNumber(stat.revenue), 0),
    dailyStatsDealCount: stats.reduce((sum, stat) => sum + finiteNumber(stat.dealCount), 0),
    dailyStatsTouchCount: stats.reduce((sum, stat) => sum + finiteNumber(stat.touchCount), 0),
    dailyStatsInquiryCount: stats.reduce((sum, stat) => sum + finiteNumber(stat.inquiryCount), 0),
    dailyStatsExtraInteractionCount: stats.reduce((sum, stat) => {
      const extra = stat.extraInteractions ?? {};
      return sum + Object.values(extra).reduce((extraSum, count) => extraSum + finiteNumber(count), 0);
    }, 0),
    dailyStatsRows: stats.length,
  };
}

function summarizeEvents(dealEvents: Array<Event<DealClosedPayload>>): Pick<ProjectionSnapshot, 'eventRevenue' | 'eventCount'> {
  return {
    eventRevenue: dealEvents.reduce((sum, event) => sum + projectDealEvent(event).revenue, 0),
    eventCount: dealEvents.length,
  };
}

function summarizeInteractionEvents(
  interactionEvents: Array<Event<InteractionRecordedPayload>>
): Pick<ProjectionSnapshot, 'eventInteractionCount'> {
  return {
    eventInteractionCount: interactionEvents.length,
  };
}

async function getDealEventsForMarket(marketId: string): Promise<Array<Event<DealClosedPayload>>> {
  const directMatches = await db.events
    .where('market_id')
    .equals(marketId)
    .and(event => event.type === 'deal_closed')
    .toArray() as Array<Event<DealClosedPayload>>;

  if (directMatches.length > 0) {
    return directMatches;
  }

  return await db.events
    .where('type')
    .equals('deal_closed')
    .and(event => getEventMarketId(event as Event<any>) === marketId)
    .toArray() as Array<Event<DealClosedPayload>>;
}

async function getEventsByTypeForMarket<TPayload>(
  type: Event['type'],
  marketId: string
): Promise<Array<Event<TPayload>>> {
  return await db.events
    .where('type')
    .equals(type)
    .and(event => getEventMarketId(event as Event<any>) === marketId)
    .toArray() as Array<Event<TPayload>>;
}

async function getDeletedEventIdsForMarket(marketId: string): Promise<Set<string>> {
  const deletedEvents = [
    ...await getEventsByTypeForMarket<Record<string, unknown>>('deal_deleted', marketId),
    ...await getEventsByTypeForMarket<Record<string, unknown>>('interaction_deleted', marketId),
  ];

  return new Set(
    deletedEvents
      .map(event => getTombstoneTargetEventId(event))
      .filter(nonBlankString)
  );
}

function withoutDeletedEvents<T extends Event>(events: T[], deletedEventIds: Set<string>): T[] {
  return events.filter(event => !event.id || !deletedEventIds.has(event.id));
}

async function getActiveStatsEventsForMarket(marketId: string): Promise<{
  dealEvents: Array<Event<DealClosedPayload>>;
  interactionEvents: Array<Event<InteractionRecordedPayload>>;
}> {
  const [dealEvents, interactionEvents, deletedEventIds] = await Promise.all([
    getDealEventsForMarket(marketId),
    getEventsByTypeForMarket<InteractionRecordedPayload>('interaction_recorded', marketId),
    getDeletedEventIdsForMarket(marketId),
  ]);

  return {
    dealEvents: withoutDeletedEvents(dealEvents, deletedEventIds).sort((a, b) => a.timestamp - b.timestamp),
    interactionEvents: withoutDeletedEvents(interactionEvents, deletedEventIds).sort((a, b) => a.timestamp - b.timestamp),
  };
}

function makeSnapshot(
  marketTotalRevenue: unknown,
  marketTotalDeals: unknown,
  marketTotalInteractions: unknown,
  dailyStats: DailyStats[],
  dealEvents: Array<Event<DealClosedPayload>>,
  interactionEvents: Array<Event<InteractionRecordedPayload>>
): ProjectionSnapshot {
  return {
    marketTotalRevenue: finiteNumber(marketTotalRevenue),
    marketTotalDeals: finiteNumber(marketTotalDeals),
    marketTotalInteractions: finiteNumber(marketTotalInteractions),
    ...summarizeDailyStats(dailyStats),
    ...summarizeEvents(dealEvents),
    ...summarizeInteractionEvents(interactionEvents),
  };
}

function projectionsAreEqual(before: ProjectionSnapshot, after: ProjectionSnapshot): boolean {
  return (
    before.marketTotalRevenue === after.marketTotalRevenue &&
    before.marketTotalDeals === after.marketTotalDeals &&
    before.marketTotalInteractions === after.marketTotalInteractions &&
    before.dailyStatsRevenue === after.dailyStatsRevenue &&
    before.dailyStatsDealCount === after.dailyStatsDealCount &&
    before.dailyStatsTouchCount === after.dailyStatsTouchCount &&
    before.dailyStatsInquiryCount === after.dailyStatsInquiryCount &&
    before.dailyStatsExtraInteractionCount === after.dailyStatsExtraInteractionCount
  );
}

function projectionIsInflated(before: ProjectionSnapshot, after: ProjectionSnapshot): boolean {
  return (
    before.marketTotalRevenue > after.marketTotalRevenue ||
    before.marketTotalDeals > after.marketTotalDeals ||
    before.marketTotalInteractions > after.marketTotalInteractions ||
    before.dailyStatsRevenue > after.dailyStatsRevenue ||
    before.dailyStatsDealCount > after.dailyStatsDealCount ||
    before.dailyStatsTouchCount > after.dailyStatsTouchCount ||
    before.dailyStatsInquiryCount > after.dailyStatsInquiryCount ||
    before.dailyStatsExtraInteractionCount > after.dailyStatsExtraInteractionCount
  );
}

function projectionIsLowerThanEvents(before: ProjectionSnapshot, after: ProjectionSnapshot): boolean {
  return (
    before.marketTotalRevenue < after.marketTotalRevenue ||
    before.marketTotalDeals < after.marketTotalDeals ||
    before.marketTotalInteractions < after.marketTotalInteractions ||
    before.dailyStatsRevenue < after.dailyStatsRevenue ||
    before.dailyStatsDealCount < after.dailyStatsDealCount ||
    before.dailyStatsTouchCount < after.dailyStatsTouchCount ||
    before.dailyStatsInquiryCount < after.dailyStatsInquiryCount ||
    before.dailyStatsExtraInteractionCount < after.dailyStatsExtraInteractionCount
  );
}

async function buildMarketStatsRebuildPlan(marketId: string): Promise<MarketStatsRebuildPlan | undefined> {
  const market = await db.markets.get(marketId);
  if (!market) return undefined;

  const [currentDailyStats, activeEvents] = await Promise.all([
    db.dailyStats.where('marketId').equals(marketId).toArray(),
    getActiveStatsEventsForMarket(marketId),
  ]);

  const { dealEvents, interactionEvents } = activeEvents;
  if (dealEvents.length === 0 && interactionEvents.length === 0) {
    return undefined;
  }

  const rebuiltDailyStats = buildDailyStatsFromEvents(marketId, dealEvents, interactionEvents);
  const before = makeSnapshot(
    market.totalRevenue,
    market.totalDeals,
    market.totalInteractions,
    currentDailyStats,
    dealEvents,
    interactionEvents
  );
  const rebuiltSummary = summarizeDailyStats(rebuiltDailyStats);
  const after = makeSnapshot(
    before.eventRevenue,
    rebuiltSummary.dailyStatsDealCount,
    interactionEvents.length,
    rebuiltDailyStats,
    dealEvents,
    interactionEvents
  );

  return {
    marketId,
    before,
    after,
    rebuiltDailyStats,
    currentDailyStats,
  };
}

export async function rebuildMarketStatsFromEvents(
  marketId: string,
  options: { dryRun: boolean }
): Promise<LocalProjectionRepairItem | undefined> {
  if (!nonBlankString(marketId)) return undefined;

  const plan = await buildMarketStatsRebuildPlan(marketId);
  if (!plan) return undefined;

  if (!options.dryRun) {
    await db.transaction('rw', [db.markets, db.dailyStats], async () => {
      for (const stat of plan.currentDailyStats) {
        if (stat.id !== undefined) {
          await db.dailyStats.delete(stat.id);
        }
      }

      for (const stat of plan.rebuiltDailyStats) {
        await db.dailyStats.add(stat);
      }

      await db.markets.update(marketId, {
        totalRevenue: plan.after.marketTotalRevenue,
        totalDeals: plan.after.marketTotalDeals,
        totalInteractions: plan.after.marketTotalInteractions,
        totalProfit: plan.rebuiltDailyStats.reduce((sum, stat) => sum + finiteNumber(stat.profit), 0),
        updatedAt: Date.now(),
      });
    });
  }

  return {
    marketId,
    before: plan.before,
    after: plan.after,
  };
}

export async function repairLocalMarketProjections(
  options: LocalProjectionRepairOptions
): Promise<LocalProjectionRepairResult> {
  const repaired: LocalProjectionRepairItem[] = [];
  const skipped: LocalProjectionRepairResult['skipped'] = [];
  const warnings: string[] = [];

  const uniqueMarketIds = options.marketIds && options.marketIds.length > 0
    ? Array.from(new Set(options.marketIds))
    : (await db.markets.toArray())
        .map(market => market.id)
        .filter(nonBlankString);

  for (const marketId of uniqueMarketIds) {
    if (!nonBlankString(marketId)) {
      skipped.push({ marketId: String(marketId ?? ''), reason: 'blank_market_id' });
      continue;
    }

    const market = await db.markets.get(marketId);
    if (!market) {
      skipped.push({ marketId, reason: 'local_market_not_found' });
      continue;
    }

    const plan = await buildMarketStatsRebuildPlan(marketId);
    if (!plan) {
      skipped.push({ marketId, reason: 'no_deal_events' });
      continue;
    }

    const { before, after } = plan;

    if (projectionsAreEqual(before, after)) {
      skipped.push({ marketId, reason: 'already_consistent' });
      continue;
    }

    if (!projectionIsInflated(before, after)) {
      if (projectionIsLowerThanEvents(before, after)) {
        skipped.push({ marketId, reason: 'projection_lower_than_events' });
      } else {
        skipped.push({ marketId, reason: 'already_consistent' });
      }
      continue;
    }

    repaired.push({ marketId, before, after });

    if (options.dryRun) continue;

    for (const stat of plan.currentDailyStats) {
      if (stat.id === undefined) {
        warnings.push(`market ${marketId}: dailyStats row without id was not deleted`);
      }
    }
    await rebuildMarketStatsFromEvents(marketId, { dryRun: false });
  }

  return { repaired, skipped, warnings };
}
