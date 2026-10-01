import type { MarketPulseDB } from '@/lib/db';
import { calculateBatchMetrics } from '@/lib/analytics/metrics-engine';
import { calculateHealthScores } from '@/lib/analytics/health-score-engine';
import { calculateQuadrants } from '@/lib/analytics/quadrant-engine';
import type { MarketHealthScore, MarketMetrics, QuadrantResult } from '@/lib/analytics/types';
import type { Market } from '@/types/db';

export interface MarketMetricItem {
  market: Market;
  marketId: string;
  metrics: MarketMetrics;
}

export interface MarketMetricsViewModel {
  items: MarketMetricItem[];
  profitableRanking: MarketMetricItem[];
  averageOrderValueRanking: MarketMetricItem[];
  averageConversionRate: number;
}

export interface AdvancedMarketMetricsViewModel {
  quadrants: QuadrantResult;
  healthScores: MarketHealthScore[];
}

export const EMPTY_MARKET_METRICS_VIEW_MODEL: MarketMetricsViewModel = {
  items: [],
  profitableRanking: [],
  averageOrderValueRanking: [],
  averageConversionRate: 0,
};

export function composeMarketMetricsViewModel(items: MarketMetricItem[]): MarketMetricsViewModel {
  const profitableRanking = items
    .filter(item => item.metrics.netProfit >= 0 && item.metrics.hourlyProfit >= 0)
    .sort((left, right) => (
      right.metrics.hourlyProfit - left.metrics.hourlyProfit
      || right.metrics.boothROI - left.metrics.boothROI
    ));

  const averageOrderValueRanking = items
    .filter(item => item.metrics.totalDeals > 0)
    .sort((left, right) => right.metrics.aov - left.metrics.aov);

  const conversionItems = items.filter(item => item.metrics.uniqueEngaged > 0);
  const averageConversionRate = conversionItems.length > 0
    ? conversionItems.reduce((sum, item) => sum + item.metrics.conversionRate, 0) / conversionItems.length
    : 0;

  return {
    items,
    profitableRanking,
    averageOrderValueRanking,
    averageConversionRate,
  };
}

export function composeAdvancedMarketMetricsViewModel(
  viewModel: MarketMetricsViewModel,
): AdvancedMarketMetricsViewModel {
  const eligibleItems = viewModel.items.filter(item => (
    item.metrics.netProfit >= 0 && item.metrics.hourlyProfit >= 0
  ));

  return {
    quadrants: calculateQuadrants(
      viewModel.items.map(item => ({ market: item.market, metrics: item.metrics })),
    ),
    healthScores: calculateHealthScores(
      eligibleItems.map(item => ({ marketId: item.marketId, metrics: item.metrics })),
    ),
  };
}

export async function loadMarketMetricsViewModel(
  markets: Market[],
  database: MarketPulseDB,
): Promise<MarketMetricsViewModel> {
  if (markets.length === 0) return EMPTY_MARKET_METRICS_VIEW_MODEL;

  const items = await calculateBatchMetrics(markets, {
    db: database,
    useCache: false,
    enableBatchEntryCorrection: true,
  });

  return composeMarketMetricsViewModel(items);
}
