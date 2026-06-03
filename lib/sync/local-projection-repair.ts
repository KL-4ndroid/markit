import { db } from '@/lib/db';
import type { DailyStats, DealClosedPayload, Event } from '@/types/db';

export interface LocalProjectionRepairOptions {
  marketIds?: string[];
  dryRun: boolean;
}

export interface ProjectionSnapshot {
  marketTotalRevenue: number;
  marketTotalDeals: number;
  dailyStatsRevenue: number;
  dailyStatsDealCount: number;
  dailyStatsRows: number;
  eventRevenue: number;
  eventCount: number;
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

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatLocalDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDealDate(event: Event<DealClosedPayload>): string {
  return event.payload.dealDate ?? formatLocalDate(event.timestamp);
}

function getEventMarketId(event: Event<DealClosedPayload>): string | undefined {
  return event.market_id ?? event.payload.market_id ?? (event.payload as unknown as { marketId?: string }).marketId;
}

function getItemPrice(item: DealClosedPayload['items'][number]): number {
  return finiteNumber(
    item.price_at_time_of_sale ??
      (item as unknown as { priceAtTimeOfSale?: number }).priceAtTimeOfSale ??
      item.price
  );
}

function getItemCost(item: DealClosedPayload['items'][number]): number {
  return finiteNumber(
    item.cost_at_time_of_sale ??
      (item as unknown as { costAtTimeOfSale?: number }).costAtTimeOfSale ??
      (item as unknown as { cost?: number }).cost
  );
}

function projectDealEvent(event: Event<DealClosedPayload>): DealProjection {
  const payload = event.payload;
  const productsSold: DailyStats['productsSold'] = [];

  if (payload.isManualEntry) {
    const revenue = finiteNumber(payload.manualRevenue ?? payload.totalAmount);
    const cost = finiteNumber(payload.manualCost);
    return {
      date: getDealDate(event),
      revenue,
      cost,
      profit: revenue - cost,
      dealCount: finiteNumber(payload.manualDealCount, 1),
      productsSold,
    };
  }

  if (Array.isArray(payload.items) && payload.items.length > 0) {
    let revenue = 0;
    let cost = 0;

    for (const item of payload.items) {
      const quantity = finiteNumber(item.quantity);
      const itemRevenue = getItemPrice(item) * quantity;
      revenue += itemRevenue;
      cost += getItemCost(item) * quantity;

      if (nonBlankString(item.productId)) {
        productsSold.push({
          productId: item.productId,
          quantity,
          revenue: itemRevenue,
        });
      }
    }

    return {
      date: getDealDate(event),
      revenue: revenue || finiteNumber(payload.totalAmount),
      cost: cost || finiteNumber((payload as unknown as { totalCost?: number }).totalCost),
      profit: (revenue || finiteNumber(payload.totalAmount)) - (cost || finiteNumber((payload as unknown as { totalCost?: number }).totalCost)),
      dealCount: 1,
      productsSold: mergeProductsSold([], productsSold),
    };
  }

  const revenue = finiteNumber(payload.totalAmount);
  const cost = finiteNumber((payload as unknown as { totalCost?: number }).totalCost);
  return {
    date: getDealDate(event),
    revenue,
    cost,
    profit: revenue - cost,
    dealCount: 1,
    productsSold,
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
  dealEvents: Array<Event<DealClosedPayload>>
): DailyStats[] {
  const byDate = new Map<string, DailyStats>();

  for (const event of dealEvents) {
    const projected = projectDealEvent(event);
    const current = byDate.get(projected.date);

    if (current) {
      current.dealCount += projected.dealCount;
      current.revenue += projected.revenue;
      current.cost += projected.cost;
      current.profit += projected.profit;
      current.productsSold = mergeProductsSold(current.productsSold, projected.productsSold);
      current.updatedAt = Math.max(finiteNumber(current.updatedAt), event.timestamp);
    } else {
      byDate.set(projected.date, {
        date: projected.date,
        marketId,
        touchCount: 0,
        inquiryCount: 0,
        dealCount: projected.dealCount,
        revenue: projected.revenue,
        cost: projected.cost,
        profit: projected.profit,
        productsSold: projected.productsSold,
        updatedAt: event.timestamp,
      });
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function summarizeDailyStats(stats: DailyStats[]): Pick<ProjectionSnapshot, 'dailyStatsRevenue' | 'dailyStatsDealCount' | 'dailyStatsRows'> {
  return {
    dailyStatsRevenue: stats.reduce((sum, stat) => sum + finiteNumber(stat.revenue), 0),
    dailyStatsDealCount: stats.reduce((sum, stat) => sum + finiteNumber(stat.dealCount), 0),
    dailyStatsRows: stats.length,
  };
}

function summarizeEvents(dealEvents: Array<Event<DealClosedPayload>>): Pick<ProjectionSnapshot, 'eventRevenue' | 'eventCount'> {
  return {
    eventRevenue: dealEvents.reduce((sum, event) => sum + projectDealEvent(event).revenue, 0),
    eventCount: dealEvents.length,
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
    .and(event => getEventMarketId(event as Event<DealClosedPayload>) === marketId)
    .toArray() as Array<Event<DealClosedPayload>>;
}

function makeSnapshot(
  marketTotalRevenue: unknown,
  marketTotalDeals: unknown,
  dailyStats: DailyStats[],
  dealEvents: Array<Event<DealClosedPayload>>
): ProjectionSnapshot {
  return {
    marketTotalRevenue: finiteNumber(marketTotalRevenue),
    marketTotalDeals: finiteNumber(marketTotalDeals),
    ...summarizeDailyStats(dailyStats),
    ...summarizeEvents(dealEvents),
  };
}

function projectionsAreEqual(before: ProjectionSnapshot, after: ProjectionSnapshot): boolean {
  return (
    before.marketTotalRevenue === after.marketTotalRevenue &&
    before.marketTotalDeals === after.marketTotalDeals &&
    before.dailyStatsRevenue === after.dailyStatsRevenue &&
    before.dailyStatsDealCount === after.dailyStatsDealCount
  );
}

function projectionIsInflated(before: ProjectionSnapshot, after: ProjectionSnapshot): boolean {
  return (
    before.marketTotalRevenue > after.marketTotalRevenue ||
    before.marketTotalDeals > after.marketTotalDeals ||
    before.dailyStatsRevenue > after.dailyStatsRevenue ||
    before.dailyStatsDealCount > after.dailyStatsDealCount
  );
}

function projectionIsLowerThanEvents(before: ProjectionSnapshot, after: ProjectionSnapshot): boolean {
  return (
    before.marketTotalRevenue < after.marketTotalRevenue ||
    before.marketTotalDeals < after.marketTotalDeals ||
    before.dailyStatsRevenue < after.dailyStatsRevenue ||
    before.dailyStatsDealCount < after.dailyStatsDealCount
  );
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

    const [currentDailyStats, dealEvents] = await Promise.all([
      db.dailyStats.where('marketId').equals(marketId).toArray(),
      getDealEventsForMarket(marketId),
    ]);

    if (dealEvents.length === 0) {
      skipped.push({ marketId, reason: 'no_deal_events' });
      continue;
    }

    const rebuiltDailyStats = buildDailyStatsFromEvents(marketId, dealEvents);
    const before = makeSnapshot(
      market.totalRevenue,
      market.totalDeals,
      currentDailyStats,
      dealEvents
    );
    const rebuiltSummary = summarizeDailyStats(rebuiltDailyStats);
    const after = makeSnapshot(
      before.eventRevenue,
      rebuiltSummary.dailyStatsDealCount,
      rebuiltDailyStats,
      dealEvents
    );

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

    await db.transaction('rw', [db.markets, db.dailyStats], async () => {
      for (const stat of currentDailyStats) {
        if (stat.id !== undefined) {
          await db.dailyStats.delete(stat.id);
        } else {
          warnings.push(`market ${marketId}: dailyStats row without id was not deleted`);
        }
      }

      for (const stat of rebuiltDailyStats) {
        await db.dailyStats.add(stat);
      }

      await db.markets.update(marketId, {
        totalRevenue: after.marketTotalRevenue,
        totalDeals: after.marketTotalDeals,
        totalProfit: rebuiltDailyStats.reduce((sum, stat) => sum + finiteNumber(stat.profit), 0),
        updatedAt: Date.now(),
      });
    });
  }

  return { repaired, skipped, warnings };
}
