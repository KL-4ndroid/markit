import {
  rebuildMarketStatsFromEvents as rebuildLocalMarketStatsFromEvents,
  repairLocalMarketProjections,
  type LocalProjectionRepairItem,
  type LocalProjectionRepairOptions,
  type LocalProjectionRepairResult,
  type ProjectionSnapshot,
} from '@/lib/sync/local-projection-repair';

export type MarketProjectionRebuildOptions = {
  dryRun: boolean;
};

export type MarketProjectionComparisonStatus =
  | 'missing_or_no_events'
  | 'consistent'
  | 'inflated'
  | 'lower_than_events'
  | 'different';

export interface MarketProjectionComparison {
  marketId: string;
  status: MarketProjectionComparisonStatus;
  before?: ProjectionSnapshot;
  after?: ProjectionSnapshot;
}

export type MarketProjectionRebuildResult = LocalProjectionRepairItem;
export type MarketProjectionRepairOptions = LocalProjectionRepairOptions;
export type MarketProjectionRepairResult = LocalProjectionRepairResult;

function snapshotsAreEqual(before: ProjectionSnapshot, after: ProjectionSnapshot): boolean {
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

function snapshotIsInflated(before: ProjectionSnapshot, after: ProjectionSnapshot): boolean {
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

function snapshotIsLowerThanEvents(before: ProjectionSnapshot, after: ProjectionSnapshot): boolean {
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

export async function compareMarketProjectionWithEvents(
  marketId: string
): Promise<MarketProjectionComparison> {
  const rebuildPlan = await rebuildLocalMarketStatsFromEvents(marketId, { dryRun: true });

  if (!rebuildPlan) {
    return {
      marketId,
      status: 'missing_or_no_events',
    };
  }

  const { before, after } = rebuildPlan;

  if (snapshotsAreEqual(before, after)) {
    return { marketId, status: 'consistent', before, after };
  }

  if (snapshotIsInflated(before, after)) {
    return { marketId, status: 'inflated', before, after };
  }

  if (snapshotIsLowerThanEvents(before, after)) {
    return { marketId, status: 'lower_than_events', before, after };
  }

  return { marketId, status: 'different', before, after };
}

export async function rebuildMarketStatsFromEvents(
  marketId: string,
  options: MarketProjectionRebuildOptions
): Promise<MarketProjectionRebuildResult | undefined> {
  return rebuildLocalMarketStatsFromEvents(marketId, options);
}

export async function rebuildMarketDailyStatsFromEvents(
  marketId: string,
  options: MarketProjectionRebuildOptions
): Promise<MarketProjectionRebuildResult | undefined> {
  return rebuildLocalMarketStatsFromEvents(marketId, options);
}

export async function repairMarketProjectionsFromEvents(
  options: MarketProjectionRepairOptions
): Promise<MarketProjectionRepairResult> {
  return repairLocalMarketProjections(options);
}
