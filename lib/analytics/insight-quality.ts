import type { DailyStats, Market } from '@/types/db';

export type InsightSignalStatus = 'available' | 'limited' | 'unavailable';

export type InsightConfidence = 'high' | 'medium' | 'low';

export type InsightLimitationSeverity = 'info' | 'warning';

export type InsightLimitationCode =
  | 'missing_daily_stats'
  | 'missing_cost_data'
  | 'missing_product_detail'
  | 'missing_interaction_data'
  | 'unsynced_data'
  | 'no_markets_in_period'
  | 'low_sample_size'
  | 'excluded_inactive_market'
  | 'ongoing_or_future_market'
  | 'projection_mismatch'
  | 'possible_duplicate_daily_stats'
  | 'outlier_values'
  | 'manual_entry_dominant'
  | 'zero_or_missing_market_cost'
  | 'cost_basis_estimated'
  | 'partial_period_overlap';

export type InsightAffectedSection =
  | 'overall_score'
  | 'profit'
  | 'market_rejoin'
  | 'product_ranking'
  | 'product_actions'
  | 'conversion'
  | 'data_quality';

export type InsightLimitation = {
  code: InsightLimitationCode;
  severity: InsightLimitationSeverity;
  affectedSections: InsightAffectedSection[];
  message: string;
  recommendation: string;
};

export type InsightProjectionComparable = {
  revenue: number;
  dealCount: number;
};

export function finiteInsightNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function optionalFiniteInsightNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function clampInsightNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function ratioInsightNumbers(numerator: number, denominator: number): number {
  return denominator > 0 ? clampInsightNumber(numerator / denominator, 0, 1) : 0;
}

export function isInactiveInsightMarket(market: Market): boolean {
  return market.isDeleted === true || market.status === 'cancelled' || market.status === 'postponed';
}

export function isOngoingOrFutureInsightMarket(market: Market, generatedAtDate?: string): boolean {
  if (market.status === 'ongoing') return true;
  if (!generatedAtDate) return false;
  return market.startDate > generatedAtDate || market.endDate > generatedAtDate;
}

export function getDailyStatInsightKey(stat: DailyStats): string {
  return `${stat.marketId ?? ''}:${stat.date}`;
}

export function getDailyStatInsightId(stat: DailyStats): string {
  return stat.id === undefined ? getDailyStatInsightKey(stat) : String(stat.id);
}

export function hasOutlierDailyStatValues(stat: DailyStats): boolean {
  const revenue = finiteInsightNumber(stat.revenue);
  const cost = finiteInsightNumber(stat.cost);
  const profit = finiteInsightNumber(stat.profit);
  const dealCount = finiteInsightNumber(stat.dealCount);
  const interactionCount = finiteInsightNumber(stat.touchCount) + finiteInsightNumber(stat.inquiryCount);

  return (
    revenue < 0 ||
    cost < 0 ||
    dealCount < 0 ||
    interactionCount < 0 ||
    Math.abs(profit) > Math.max(revenue + cost, 1) * 3 ||
    revenue > 1_000_000 ||
    dealCount > 1_000 ||
    interactionCount > 10_000
  );
}

export function hasMarketProjectionMismatch(
  market: Market,
  projection: InsightProjectionComparable
): boolean {
  const projectedRevenue = optionalFiniteInsightNumber(market.totalRevenue);
  const projectedDeals = optionalFiniteInsightNumber(market.totalDeals);
  const revenueMismatch = projectedRevenue !== null && Math.abs(projectedRevenue - projection.revenue) > 1;
  const dealMismatch = projectedDeals !== null && Math.abs(projectedDeals - projection.dealCount) > 0.01;

  return revenueMismatch || dealMismatch;
}

export function isPartialPeriodInsightMarket(
  market: Market,
  periodStartDate: string,
  periodEndDate: string
): boolean {
  return market.startDate < periodStartDate || market.endDate > periodEndDate;
}
