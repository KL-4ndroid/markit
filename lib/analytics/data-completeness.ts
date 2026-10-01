import type { DailyStats, DealClosedPayload, Event, Market } from '@/types/db';
import {
  getDealItemPrice,
  getDealItemProductId,
  getDealItems,
  isBackfillDealEvent,
  isDealClosedEvent,
  isManualDealEvent,
} from '@/lib/events/event-read-model';

export type AnalyticsDataLevel =
  | 'summary_only'
  | 'transaction_amount'
  | 'product_detail'
  | 'full_behavior';

export interface AnalyticsCapability {
  marketPerformance: boolean;
  costPressure: boolean;
  rejoinGuidance: boolean;
  averageOrderValue: boolean;
  conversionRate: boolean;
  productRanking: boolean;
  restockSuggestion: boolean;
  pricingSuggestion: boolean;
  interactionConversion: boolean;
  timeOfDayInsight: boolean;
}

export interface AnalyticsDataCompletenessInput {
  markets?: Market[];
  events?: Event[];
  dailyStats?: DailyStats[];
}

export interface AnalyticsDataCompletenessResult {
  level: AnalyticsDataLevel;
  capabilities: AnalyticsCapability;
  counts: {
    marketsWithRevenue: number;
    transactionRecords: number;
    productDetailRecords: number;
    interactionRecords: number;
    realTimeBehaviorRecords: number;
    manualSummaryRecords: number;
  };
  missingSignals: string[];
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function hasValidProductId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasProductDetailInDeal(event: Event): boolean {
  if (!isDealClosedEvent(event)) return false;
  if (isManualDealEvent(event)) return false;

  return getDealItems(event).some((item) =>
    hasValidProductId(getDealItemProductId(item)) &&
    isPositiveNumber(item.quantity) &&
    isPositiveNumber(getDealItemPrice(item))
  );
}

function hasProductsSoldDetail(stat: DailyStats): boolean {
  return Array.isArray(stat.productsSold) && stat.productsSold.some((item) =>
    hasValidProductId(item.productId) &&
    isPositiveNumber(item.quantity) &&
    isPositiveNumber(item.revenue)
  );
}

function hasInteractionStats(stat: DailyStats): boolean {
  const extraTotal = stat.extraInteractions
    ? Object.values(stat.extraInteractions).reduce((sum, value) => sum + (isPositiveNumber(value) ? value : 0), 0)
    : 0;

  return stat.touchCount > 0 || stat.inquiryCount > 0 || extraTotal > 0;
}

function buildCapabilities(
  level: AnalyticsDataLevel,
  counts: AnalyticsDataCompletenessResult['counts']
): AnalyticsCapability {
  const hasSummary = counts.marketsWithRevenue > 0 || counts.manualSummaryRecords > 0;
  const hasTransactions = counts.transactionRecords > 0;
  const hasProducts = counts.productDetailRecords > 0;
  const hasInteractions = counts.interactionRecords > 0;
  const hasFullBehavior = level === 'full_behavior';

  return {
    marketPerformance: hasSummary || hasTransactions,
    costPressure: hasSummary || hasTransactions,
    rejoinGuidance: hasSummary || hasTransactions,
    averageOrderValue: hasTransactions,
    conversionRate: hasTransactions && hasInteractions,
    productRanking: hasProducts,
    restockSuggestion: hasProducts,
    pricingSuggestion: hasProducts,
    interactionConversion: hasFullBehavior,
    timeOfDayInsight: hasFullBehavior,
  };
}

function buildMissingSignals(capabilities: AnalyticsCapability): string[] {
  const missingSignals: string[] = [];

  if (!capabilities.averageOrderValue) {
    missingSignals.push('deal_count_or_transaction_amount');
  }

  if (!capabilities.productRanking) {
    missingSignals.push('product_level_sales');
  }

  if (!capabilities.interactionConversion) {
    missingSignals.push('interaction_and_realtime_deal_events');
  }

  if (!capabilities.timeOfDayInsight) {
    missingSignals.push('reliable_realtime_timestamps');
  }

  return missingSignals;
}

export function analyzeDataCompleteness(
  input: AnalyticsDataCompletenessInput
): AnalyticsDataCompletenessResult {
  const markets = input.markets ?? [];
  const events = input.events ?? [];
  const dailyStats = input.dailyStats ?? [];

  const marketsWithRevenue = markets.filter((market) => isPositiveNumber(market.totalRevenue)).length;
  const dailyStatsWithRevenue = dailyStats.filter((stat) => isPositiveNumber(stat.revenue)).length;
  const manualDealEvents = events.filter((event) => isDealClosedEvent(event) && isManualDealEvent(event)).length;

  const eventDealRecords = events.filter(
    (event) => isDealClosedEvent(event) && !isManualDealEvent(event)
  ).length;
  const dailyDealRecords = dailyStats.filter((stat) => stat.dealCount > 0).length;
  const marketDealRecords = markets.filter((market) => isPositiveNumber(market.totalDeals)).length;

  const productDetailFromEvents = events.filter(hasProductDetailInDeal).length;
  const productDetailFromStats = dailyStats.filter(hasProductsSoldDetail).length;

  const interactionEventRecords = events.filter((event) => event.type === 'interaction_recorded').length;
  const interactionStatRecords = dailyStats.filter(hasInteractionStats).length;
  const marketInteractionRecords = markets.filter((market) => isPositiveNumber(market.totalInteractions)).length;

  const realTimeBehaviorRecords = events.filter((event) => {
    if (event.type === 'interaction_recorded') return true;
    if (!isDealClosedEvent(event)) return false;
    return !isManualDealEvent(event) && !isBackfillDealEvent(event);
  }).length;

  const counts: AnalyticsDataCompletenessResult['counts'] = {
    marketsWithRevenue: marketsWithRevenue + dailyStatsWithRevenue,
    transactionRecords: eventDealRecords + dailyDealRecords + marketDealRecords,
    productDetailRecords: productDetailFromEvents + productDetailFromStats,
    interactionRecords: interactionEventRecords + interactionStatRecords + marketInteractionRecords,
    realTimeBehaviorRecords,
    manualSummaryRecords: manualDealEvents,
  };

  let level: AnalyticsDataLevel = 'summary_only';

  if (counts.productDetailRecords > 0 && counts.interactionRecords > 0 && counts.realTimeBehaviorRecords >= 2) {
    level = 'full_behavior';
  } else if (counts.productDetailRecords > 0) {
    level = 'product_detail';
  } else if (counts.transactionRecords > 0) {
    level = 'transaction_amount';
  }

  const capabilities = buildCapabilities(level, counts);

  return {
    level,
    capabilities,
    counts,
    missingSignals: buildMissingSignals(capabilities),
  };
}
