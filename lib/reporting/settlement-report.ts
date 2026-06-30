import { hasCapability, type RoleCapabilities } from '@/lib/permissions/role-capabilities';
import {
  clampInsightNumber as clamp,
  finiteInsightNumber as finiteNumber,
  getDailyStatInsightId as getDailyStatId,
  getDailyStatInsightKey as getDailyStatKey,
  hasMarketProjectionMismatch as hasProjectionMismatch,
  hasOutlierDailyStatValues as hasOutlierValues,
  isInactiveInsightMarket as isInactiveSettlementMarket,
  isOngoingOrFutureInsightMarket as isOngoingOrFutureMarket,
  isPartialPeriodInsightMarket,
  optionalFiniteInsightNumber as optionalFiniteNumber,
  ratioInsightNumbers as ratio,
  type InsightConfidence,
  type InsightLimitation,
  type InsightLimitationCode,
  type InsightSignalStatus,
} from '@/lib/analytics/insight-quality';
import type { DailyStats, Market, Product } from '@/types/db';

export type SettlementReportKind = 'weekly' | 'monthly';
export type SettlementReportConfidence = InsightConfidence;
export type SettlementReportGrade = 'A' | 'B' | 'C' | 'D';
export type SettlementReportSignalStatus = InsightSignalStatus;
export type SettlementReportRecommendation =
  | 'strong_rejoin'
  | 'rejoin'
  | 'observe'
  | 'caution'
  | 'avoid';

export type SettlementReportLimitationCode = InsightLimitationCode;

export type SettlementReportPeriod = {
  kind: SettlementReportKind;
  startDate: string;
  endDate: string;
  label: string;
};

export type SettlementReportMoneySummary = {
  totalRevenue: number;
  productCost: number;
  grossProfit: number;
  fixedMarketCost: number;
  commissionFee: number;
  netProfit: number;
};

export type SettlementReportActivitySummary = {
  totalDeals: number;
  totalInteractions: number;
  averageOrderValue: number;
  includedMarketCount: number;
  marketsWithSalesCount: number;
};

export type SettlementMarketRow = {
  marketId: string;
  marketName: string;
  startDate: string;
  endDate: string;
  location: string;
  revenue: number;
  productCost: number;
  grossProfit: number;
  fixedMarketCost: number;
  commissionFee: number;
  netProfit: number;
  dealCount: number;
  interactionCount: number;
  averageOrderValue: number;
  syncStatus: string | null;
};

export type SettlementProductRow = {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  estimatedCost: number | null;
  estimatedGrossProfit: number | null;
};

export type SettlementReportDataQuality = {
  includedDailyStatCount: number;
  marketsWithoutDailyStats: string[];
  missingProductNames: string[];
  unsyncedMarketIds: string[];
  excludedMarketIds: string[];
  ongoingOrFutureMarketIds: string[];
  projectionMismatchMarketIds: string[];
  possibleDuplicateDailyStatKeys: string[];
  outlierDailyStatIds: string[];
  manualEntryDominantMarketIds: string[];
  zeroCostMarketIds: string[];
  costBasisEstimatedProductIds: string[];
  partialPeriodMarketIds: string[];
  costTrackedRevenue: number;
  productDetailRevenue: number;
  interactionTrackedMarketCount: number;
  costCoverageRatio: number;
  productDetailCoverageRatio: number;
  interactionCoverageRatio: number;
  syncCoverageRatio: number;
  confidence: SettlementReportConfidence;
  limitations: SettlementReportLimitation[];
  notes: string[];
};

export type SettlementReportLimitation = InsightLimitation;

export type SettlementReportAnalysisAvailability = {
  profitAnalysis: SettlementReportSignalStatus;
  productAnalysis: SettlementReportSignalStatus;
  conversionAnalysis: SettlementReportSignalStatus;
  marketRejoinAnalysis: SettlementReportSignalStatus;
};

export type SettlementReportScoreComponent = {
  key:
    | 'profit'
    | 'revenue_deals'
    | 'cost_pressure'
    | 'average_order_value'
    | 'conversion'
    | 'product_fit';
  label: string;
  weight: number;
  score: number | null;
  status: SettlementReportSignalStatus;
  reason: string;
};

export type SettlementMarketDecision = {
  marketId: string;
  marketName: string;
  rejoinScore: number;
  grade: SettlementReportGrade;
  recommendation: SettlementReportRecommendation;
  confidence: SettlementReportConfidence;
  reasons: string[];
  limitations: SettlementReportLimitationCode[];
};

export type SettlementReportDecision = {
  overallScore: number;
  grade: SettlementReportGrade;
  recommendation: SettlementReportRecommendation;
  confidence: SettlementReportConfidence;
  summary: string;
  scoreComponents: SettlementReportScoreComponent[];
  analysisAvailability: SettlementReportAnalysisAvailability;
};

export type SettlementReportContent = {
  cover: {
    title: string;
    primaryConclusion: string;
    supportingSummary: string;
  };
  highlights: string[];
  marketActions: string[];
  productActions: string[];
  dataActions: string[];
};

export type SettlementReportModel = {
  period: SettlementReportPeriod;
  money: SettlementReportMoneySummary;
  activity: SettlementReportActivitySummary;
  decision: SettlementReportDecision;
  marketRows: SettlementMarketRow[];
  marketDecisions: SettlementMarketDecision[];
  productRows: SettlementProductRow[];
  dataQuality: SettlementReportDataQuality;
  content: SettlementReportContent;
};

export type BuildSettlementReportModelInput = {
  capabilities: RoleCapabilities;
  period: SettlementReportPeriod;
  markets: Market[];
  dailyStats: DailyStats[];
  products?: Product[];
  generatedAtDate?: string;
};

function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

function isMarketOverlappingPeriod(market: Market, period: SettlementReportPeriod): boolean {
  return market.startDate <= period.endDate && market.endDate >= period.startDate;
}

function getMarketId(market: Market): string {
  return market.id ?? '';
}

function getFixedMarketCost(market: Market): number {
  const tableRental = market.tableFree ? 0 : finiteNumber(market.tableRental);
  const chairRental = market.chairFree ? 0 : finiteNumber(market.chairRental);
  const umbrellaRental = market.umbrellaFree ? 0 : finiteNumber(market.umbrellaRental);
  const tableclothRental = market.tableclothFree ? 0 : finiteNumber(market.tableclothRental);

  return (
    finiteNumber(market.registrationFee) +
    finiteNumber(market.boothCost) +
    tableRental +
    chairRental +
    umbrellaRental +
    tableclothRental
  );
}

function getCommissionFee(market: Market, revenue: number): number {
  return revenue * (finiteNumber(market.commissionRate) / 100);
}

function sumNumbers(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

function scoreFromThresholds(
  value: number,
  thresholds: Array<{ min: number; score: number }>,
  fallback: number
): number {
  for (const threshold of thresholds) {
    if (value >= threshold.min) return threshold.score;
  }
  return fallback;
}

function getGrade(score: number): SettlementReportGrade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

function getRecommendation(score: number): SettlementReportRecommendation {
  if (score >= 85) return 'strong_rejoin';
  if (score >= 70) return 'rejoin';
  if (score >= 55) return 'observe';
  if (score >= 40) return 'caution';
  return 'avoid';
}

function getConfidence(score: number): SettlementReportConfidence {
  if (score >= 0.75) return 'high';
  if (score >= 0.45) return 'medium';
  return 'low';
}

function getSignalStatus(coverage: number): SettlementReportSignalStatus {
  if (coverage >= 0.75) return 'available';
  if (coverage > 0) return 'limited';
  return 'unavailable';
}

function assertOwnerSettlementReportAllowed(capabilities: RoleCapabilities): void {
  if (
    !hasCapability(capabilities, 'canImportExport') ||
    !hasCapability(capabilities, 'canViewOwnerFinance')
  ) {
    throw new Error('Settlement reports are owner-only and require owner finance access');
  }
}

function buildDataQualityNotes(dataQuality: Omit<SettlementReportDataQuality, 'notes'>): string[] {
  const notes: string[] = [];

  if (dataQuality.marketsWithoutDailyStats.length > 0) {
    notes.push('Some included markets have no daily stats in this period.');
  }

  if (dataQuality.missingProductNames.length > 0) {
    notes.push('Some product rows could not be matched to product names.');
  }

  if (dataQuality.unsyncedMarketIds.length > 0) {
    notes.push('Some included markets are not marked as synced.');
  }

  for (const limitation of dataQuality.limitations) {
    notes.push(limitation.message);
  }

  return notes;
}

function buildLimitations(input: {
  includedMarketCount: number;
  marketsWithoutDailyStats: string[];
  unsyncedMarketIds: string[];
  excludedMarketIds: string[];
  ongoingOrFutureMarketIds: string[];
  projectionMismatchMarketIds: string[];
  possibleDuplicateDailyStatKeys: string[];
  outlierDailyStatIds: string[];
  manualEntryDominantMarketIds: string[];
  zeroCostMarketIds: string[];
  costBasisEstimatedProductIds: string[];
  partialPeriodMarketIds: string[];
  costCoverageRatio: number;
  productDetailCoverageRatio: number;
  interactionCoverageRatio: number;
}): SettlementReportLimitation[] {
  const limitations: SettlementReportLimitation[] = [];

  if (input.includedMarketCount === 0) {
    limitations.push({
      code: 'no_markets_in_period',
      severity: 'warning',
      affectedSections: ['overall_score', 'market_rejoin', 'data_quality'],
      message: 'No eligible completed markets were found in this report period.',
      recommendation: 'Choose a period with completed market records before using this report for rejoin decisions.',
    });
  } else if (input.includedMarketCount === 1) {
    limitations.push({
      code: 'low_sample_size',
      severity: 'info',
      affectedSections: ['overall_score', 'market_rejoin', 'data_quality'],
      message: 'This report is based on one market, so ranking and trend conclusions are limited.',
      recommendation: 'Use this as a single-market closing report; compare across more markets before making broader strategy decisions.',
    });
  }

  if (input.excludedMarketIds.length > 0) {
    limitations.push({
      code: 'excluded_inactive_market',
      severity: 'info',
      affectedSections: ['market_rejoin', 'data_quality'],
      message: 'Cancelled, postponed, or deleted markets were excluded from settlement totals.',
      recommendation: 'Review excluded markets separately if cancellation fees, deposits, or sunk costs should be reported.',
    });
  }

  if (input.ongoingOrFutureMarketIds.length > 0) {
    limitations.push({
      code: 'ongoing_or_future_market',
      severity: 'warning',
      affectedSections: ['overall_score', 'market_rejoin', 'data_quality'],
      message: 'Some included markets are ongoing or future-dated, so this is not a final closing report.',
      recommendation: 'Generate the report after those markets are completed for final settlement decisions.',
    });
  }

  if (input.marketsWithoutDailyStats.length > 0) {
    limitations.push({
      code: 'missing_daily_stats',
      severity: 'warning',
      affectedSections: ['overall_score', 'market_rejoin', 'data_quality'],
      message: 'Some markets do not have daily stats in this report period.',
      recommendation: 'Add daily revenue/deal records for those markets before relying on market ranking.',
    });
  }

  if (input.costCoverageRatio < 0.75) {
    limitations.push({
      code: 'missing_cost_data',
      severity: input.costCoverageRatio === 0 ? 'warning' : 'info',
      affectedSections: ['overall_score', 'profit', 'market_rejoin'],
      message: 'Cost coverage is incomplete, so net profit and profit-margin analysis are estimates.',
      recommendation: 'Revenue, deal count, and average order value remain useful; add product or manual cost when profit decisions matter.',
    });
  }

  if (input.zeroCostMarketIds.length > 0) {
    limitations.push({
      code: 'zero_or_missing_market_cost',
      severity: 'info',
      affectedSections: ['profit', 'market_rejoin', 'data_quality'],
      message: 'Some markets with revenue have no recorded booth, registration, rental, or commission cost.',
      recommendation: 'If those markets were not actually free, add market costs before relying on net profit and cost-pressure conclusions.',
    });
  }

  if (input.productDetailCoverageRatio < 0.75) {
    limitations.push({
      code: 'missing_product_detail',
      severity: input.productDetailCoverageRatio === 0 ? 'warning' : 'info',
      affectedSections: ['product_ranking', 'product_actions'],
      message: 'Product detail coverage is incomplete, so product ranking and restock advice are limited.',
      recommendation: 'Market-level sales analysis remains useful; record item-level sales when product decisions matter.',
    });
  }

  if (input.manualEntryDominantMarketIds.length > 0) {
    limitations.push({
      code: 'manual_entry_dominant',
      severity: 'info',
      affectedSections: ['product_ranking', 'product_actions', 'data_quality'],
      message: 'Simple revenue entry appears to dominate part of this report.',
      recommendation: 'Revenue, deals, and average order value remain useful; product ranking should be hidden or marked unavailable for those markets.',
    });
  }

  if (input.costBasisEstimatedProductIds.length > 0) {
    limitations.push({
      code: 'cost_basis_estimated',
      severity: 'info',
      affectedSections: ['profit', 'product_actions', 'data_quality'],
      message: 'Some product profit estimates use the current product cost, not a recorded cost at time of sale.',
      recommendation: 'Use product profit as directional unless sale-time cost is captured for those products.',
    });
  }

  if (input.interactionCoverageRatio < 0.75) {
    limitations.push({
      code: 'missing_interaction_data',
      severity: input.interactionCoverageRatio === 0 ? 'warning' : 'info',
      affectedSections: ['conversion'],
      message: 'Interaction data is incomplete, so conversion analysis is limited.',
      recommendation: 'Use revenue, deal count, and average order value first; add interaction tracking to judge booth attraction.',
    });
  }

  if (input.unsyncedMarketIds.length > 0) {
    limitations.push({
      code: 'unsynced_data',
      severity: 'warning',
      affectedSections: ['overall_score', 'data_quality'],
      message: 'Some markets are not marked as synced, so cloud-confirmed reporting may differ.',
      recommendation: 'Sync before using this report as a final shared file.',
    });
  }

  if (input.projectionMismatchMarketIds.length > 0) {
    limitations.push({
      code: 'projection_mismatch',
      severity: 'warning',
      affectedSections: ['overall_score', 'market_rejoin', 'data_quality'],
      message: 'Some market projection totals differ from the period daily stats used by this report.',
      recommendation: 'Run a read-only projection audit before using this report as a final financial record.',
    });
  }

  if (input.possibleDuplicateDailyStatKeys.length > 0) {
    limitations.push({
      code: 'possible_duplicate_daily_stats',
      severity: 'warning',
      affectedSections: ['overall_score', 'market_rejoin', 'product_ranking', 'data_quality'],
      message: 'Possible duplicate daily stat rows were detected for the same market and date.',
      recommendation: 'Verify the source records before trusting totals, rankings, or product advice.',
    });
  }

  if (input.outlierDailyStatIds.length > 0) {
    limitations.push({
      code: 'outlier_values',
      severity: 'warning',
      affectedSections: ['overall_score', 'profit', 'market_rejoin', 'conversion', 'data_quality'],
      message: 'Unusual negative, extremely large, or internally inconsistent values were detected.',
      recommendation: 'Review those source records before treating the score as final.',
    });
  }

  if (input.partialPeriodMarketIds.length > 0) {
    limitations.push({
      code: 'partial_period_overlap',
      severity: 'info',
      affectedSections: ['profit', 'market_rejoin', 'data_quality'],
      message: 'Some multi-day markets only partially overlap this report period.',
      recommendation: 'Fixed market costs are counted once in this model; use a full market period when exact profit allocation matters.',
    });
  }

  return limitations;
}

function scoreProfit(netProfit: number, totalRevenue: number): number {
  if (totalRevenue <= 0) return 10;
  const margin = netProfit / totalRevenue;
  if (margin >= 0.3) return 95;
  if (margin >= 0.2) return 85;
  if (margin >= 0.1) return 70;
  if (margin >= 0) return 55;
  if (margin >= -0.1) return 40;
  return 25;
}

function scoreRevenueAndDeals(totalRevenue: number, totalDeals: number): number {
  const revenueScore = scoreFromThresholds(
    totalRevenue,
    [
      { min: 30000, score: 90 },
      { min: 15000, score: 75 },
      { min: 5000, score: 60 },
      { min: 1, score: 40 },
    ],
    10
  );
  const dealsScore = scoreFromThresholds(
    totalDeals,
    [
      { min: 50, score: 90 },
      { min: 20, score: 75 },
      { min: 5, score: 60 },
      { min: 1, score: 40 },
    ],
    10
  );

  return (revenueScore + dealsScore) / 2;
}

function scoreCostPressure(fixedMarketCost: number, commissionFee: number, totalRevenue: number): number {
  if (totalRevenue <= 0) return 10;
  const pressure = (fixedMarketCost + commissionFee) / totalRevenue;
  if (pressure <= 0.2) return 90;
  if (pressure <= 0.35) return 75;
  if (pressure <= 0.5) return 55;
  if (pressure <= 0.75) return 35;
  return 20;
}

function scoreAverageOrderValue(averageOrderValue: number): number {
  return scoreFromThresholds(
    averageOrderValue,
    [
      { min: 800, score: 90 },
      { min: 500, score: 75 },
      { min: 250, score: 60 },
      { min: 1, score: 40 },
    ],
    10
  );
}

function scoreConversion(totalDeals: number, totalInteractions: number): number {
  if (totalInteractions <= 0) return 0;
  const conversion = totalDeals / totalInteractions;
  if (conversion >= 0.3) return 90;
  if (conversion >= 0.15) return 75;
  if (conversion >= 0.05) return 60;
  if (conversion > 0) return 40;
  return 15;
}

function scoreProductFit(productRows: SettlementProductRow[], totalRevenue: number): number {
  if (productRows.length === 0 || totalRevenue <= 0) return 0;
  const topProductRevenue = productRows[0]?.revenue ?? 0;
  const topShare = topProductRevenue / totalRevenue;
  if (productRows.length >= 3 && topShare <= 0.65) return 85;
  if (productRows.length >= 2 && topShare <= 0.8) return 75;
  return 60;
}

function weightedScore(components: SettlementReportScoreComponent[]): number {
  const available = components.filter(component => component.score !== null);
  const activeWeight = sumNumbers(available.map(component => component.weight));
  if (activeWeight <= 0) return 0;

  return roundScore(
    sumNumbers(available.map(component => (component.score ?? 0) * component.weight)) / activeWeight
  );
}

function buildScoreComponents(input: {
  money: SettlementReportMoneySummary;
  activity: SettlementReportActivitySummary;
  productRows: SettlementProductRow[];
  dataQuality: Omit<SettlementReportDataQuality, 'notes'>;
}): SettlementReportScoreComponent[] {
  const profitStatus = getSignalStatus(input.dataQuality.costCoverageRatio);
  const conversionStatus = getSignalStatus(input.dataQuality.interactionCoverageRatio);
  const productStatus = getSignalStatus(input.dataQuality.productDetailCoverageRatio);

  return [
    {
      key: 'profit',
      label: 'Profit performance',
      weight: 35,
      score: profitStatus === 'unavailable'
        ? null
        : scoreProfit(input.money.netProfit, input.money.totalRevenue),
      status: profitStatus,
      reason: profitStatus === 'unavailable'
        ? 'Cost data is missing, so profit score is not used.'
        : 'Uses net profit after product cost, fixed market cost, and commission.',
    },
    {
      key: 'revenue_deals',
      label: 'Revenue and deal volume',
      weight: 20,
      score: scoreRevenueAndDeals(input.money.totalRevenue, input.activity.totalDeals),
      status: input.money.totalRevenue > 0 || input.activity.totalDeals > 0 ? 'available' : 'unavailable',
      reason: 'Uses total revenue and deal count for the report period.',
    },
    {
      key: 'cost_pressure',
      label: 'Market cost pressure',
      weight: 15,
      score: scoreCostPressure(input.money.fixedMarketCost, input.money.commissionFee, input.money.totalRevenue),
      status: input.money.totalRevenue > 0 ? 'available' : 'unavailable',
      reason: 'Uses fixed market costs and commission as a share of revenue.',
    },
    {
      key: 'average_order_value',
      label: 'Average order value',
      weight: 10,
      score: scoreAverageOrderValue(input.activity.averageOrderValue),
      status: input.activity.totalDeals > 0 ? 'available' : 'unavailable',
      reason: 'Uses revenue divided by deal count.',
    },
    {
      key: 'conversion',
      label: 'Interaction conversion',
      weight: 10,
      score: conversionStatus === 'unavailable'
        ? null
        : scoreConversion(input.activity.totalDeals, input.activity.totalInteractions),
      status: conversionStatus,
      reason: conversionStatus === 'unavailable'
        ? 'Interaction data is missing, so conversion score is not used.'
        : 'Uses deals divided by recorded interactions.',
    },
    {
      key: 'product_fit',
      label: 'Product fit',
      weight: 10,
      score: productStatus === 'unavailable'
        ? null
        : scoreProductFit(input.productRows, input.money.totalRevenue),
      status: productStatus,
      reason: productStatus === 'unavailable'
        ? 'Product detail is missing, so product fit score is not used.'
        : 'Uses product sales coverage and concentration.',
    },
  ];
}

function recommendationSummary(recommendation: SettlementReportRecommendation): string {
  switch (recommendation) {
    case 'strong_rejoin':
      return 'Strong performance. Prioritize similar markets next time.';
    case 'rejoin':
      return 'Good performance. Rejoin is recommended if schedule and booth cost are acceptable.';
    case 'observe':
      return 'Mixed performance. Keep observing before making this a priority.';
    case 'caution':
      return 'Weak or uncertain performance. Rejoin only with a clear adjustment plan.';
    case 'avoid':
      return 'Poor performance. Do not prioritize similar markets unless conditions change.';
  }
}

function buildOverallDecision(input: {
  money: SettlementReportMoneySummary;
  activity: SettlementReportActivitySummary;
  productRows: SettlementProductRow[];
  dataQuality: Omit<SettlementReportDataQuality, 'notes'>;
}): SettlementReportDecision {
  const scoreComponents = buildScoreComponents(input);
  const overallScore = weightedScore(scoreComponents);
  const recommendation = getRecommendation(overallScore);

  return {
    overallScore,
    grade: getGrade(overallScore),
    recommendation,
    confidence: input.dataQuality.confidence,
    summary: recommendationSummary(recommendation),
    scoreComponents,
    analysisAvailability: {
      profitAnalysis: getSignalStatus(input.dataQuality.costCoverageRatio),
      productAnalysis: getSignalStatus(input.dataQuality.productDetailCoverageRatio),
      conversionAnalysis: getSignalStatus(input.dataQuality.interactionCoverageRatio),
      marketRejoinAnalysis: input.dataQuality.includedDailyStatCount > 0 ? 'available' : 'unavailable',
    },
  };
}

function buildMarketDecisions(
  marketRows: SettlementMarketRow[],
  dataQuality: Omit<SettlementReportDataQuality, 'notes'>
): SettlementMarketDecision[] {
  return marketRows.map(row => {
    const revenueDeals = scoreRevenueAndDeals(row.revenue, row.dealCount);
    const costPressure = scoreCostPressure(row.fixedMarketCost, row.commissionFee, row.revenue);
    const averageOrderValue = scoreAverageOrderValue(row.averageOrderValue);
    const conversion = row.interactionCount > 0 ? scoreConversion(row.dealCount, row.interactionCount) : null;
    const profit = dataQuality.costCoverageRatio > 0 ? scoreProfit(row.netProfit, row.revenue) : null;

    const components: SettlementReportScoreComponent[] = [
      {
        key: 'profit',
        label: 'Profit performance',
        weight: 35,
        score: profit,
        status: profit === null ? 'unavailable' : getSignalStatus(dataQuality.costCoverageRatio),
        reason: profit === null ? 'Cost data is missing.' : 'Uses market net profit.',
      },
      {
        key: 'revenue_deals',
        label: 'Revenue and deal volume',
        weight: 25,
        score: revenueDeals,
        status: row.revenue > 0 || row.dealCount > 0 ? 'available' : 'unavailable',
        reason: 'Uses market revenue and deal count.',
      },
      {
        key: 'cost_pressure',
        label: 'Market cost pressure',
        weight: 20,
        score: costPressure,
        status: row.revenue > 0 ? 'available' : 'unavailable',
        reason: 'Uses market fixed cost and commission pressure.',
      },
      {
        key: 'average_order_value',
        label: 'Average order value',
        weight: 10,
        score: averageOrderValue,
        status: row.dealCount > 0 ? 'available' : 'unavailable',
        reason: 'Uses market average order value.',
      },
      {
        key: 'conversion',
        label: 'Interaction conversion',
        weight: 10,
        score: conversion,
        status: conversion === null ? 'unavailable' : getSignalStatus(dataQuality.interactionCoverageRatio),
        reason: conversion === null ? 'Interaction data is missing.' : 'Uses market interaction conversion.',
      },
    ];

    const rejoinScore = weightedScore(components);
    const recommendation = getRecommendation(rejoinScore);
    const limitations: SettlementReportLimitationCode[] = [];
    if (profit === null || dataQuality.costCoverageRatio < 0.75) limitations.push('missing_cost_data');
    if (conversion === null || dataQuality.interactionCoverageRatio < 0.75) limitations.push('missing_interaction_data');
    if (row.syncStatus !== null && row.syncStatus !== 'synced') limitations.push('unsynced_data');

    const reasons = [
      `Revenue ${Math.round(row.revenue)} with ${Math.round(row.dealCount)} deals.`,
      `Average order value ${Math.round(row.averageOrderValue)}.`,
    ];

    if (profit !== null) {
      reasons.push(`Net profit estimate ${Math.round(row.netProfit)}.`);
    }

    if (conversion !== null) {
      reasons.push(`Interaction conversion uses ${Math.round(row.interactionCount)} recorded interactions.`);
    }

    return {
      marketId: row.marketId,
      marketName: row.marketName,
      rejoinScore,
      grade: getGrade(rejoinScore),
      recommendation,
      confidence: getConfidence(
        (dataQuality.costCoverageRatio * 0.35) +
        (dataQuality.interactionCoverageRatio * 0.2) +
        (dataQuality.syncCoverageRatio * 0.15) +
        0.3
      ),
      reasons,
      limitations,
    };
  });
}

function buildReportContent(input: {
  period: SettlementReportPeriod;
  money: SettlementReportMoneySummary;
  activity: SettlementReportActivitySummary;
  decision: SettlementReportDecision;
  marketRows: SettlementMarketRow[];
  marketDecisions: SettlementMarketDecision[];
  productRows: SettlementProductRow[];
  dataQuality: SettlementReportDataQuality;
}): SettlementReportContent {
  const bestMarket = input.marketDecisions[0];
  const topProduct = input.productRows[0];
  const highlights = [
    `Total revenue ${Math.round(input.money.totalRevenue)} across ${input.activity.totalDeals} deals.`,
    `Average order value ${Math.round(input.activity.averageOrderValue)}.`,
  ];

  if (bestMarket) {
    highlights.push(`Best market candidate: ${bestMarket.marketName} (${bestMarket.grade}).`);
  }

  if (topProduct) {
    highlights.push(`Top product by recorded revenue: ${topProduct.productName}.`);
  }

  const marketActions = input.marketDecisions.slice(0, 3).map(decision =>
    `${decision.marketName}: ${recommendationSummary(decision.recommendation)}`
  );

  const productActions = input.productRows.length === 0
    ? ['Product ranking is unavailable because item-level sales were not recorded.']
    : input.productRows.slice(0, 3).map(product =>
      `${product.productName}: recorded revenue ${Math.round(product.revenue)} from ${Math.round(product.quantity)} units.`
    );

  const dataActions = input.dataQuality.limitations.map(limitation => limitation.recommendation);

  return {
    cover: {
      title: `${input.period.label} Settlement Report`,
      primaryConclusion: input.decision.summary,
      supportingSummary: `Overall grade ${input.decision.grade}, score ${input.decision.overallScore}, confidence ${input.decision.confidence}.`,
    },
    highlights,
    marketActions,
    productActions,
    dataActions,
  };
}

export function buildSettlementReportModel({
  capabilities,
  period,
  markets,
  dailyStats,
  products = [],
  generatedAtDate,
}: BuildSettlementReportModelInput): SettlementReportModel {
  assertOwnerSettlementReportAllowed(capabilities);

  const overlappingMarkets = markets.filter(isMarket => isMarketOverlappingPeriod(isMarket, period));
  const excludedMarketIds = overlappingMarkets
    .filter(isInactiveSettlementMarket)
    .map(getMarketId)
    .filter(Boolean);
  const marketsInPeriod = overlappingMarkets.filter(market => !isInactiveSettlementMarket(market));
  const marketById = new Map(marketsInPeriod.map(market => [getMarketId(market), market]));
  const productById = new Map(products.map(product => [product.id ?? '', product]));
  const statsInPeriod = dailyStats.filter(stat =>
    stat.marketId !== undefined &&
    marketById.has(stat.marketId) &&
    isDateInRange(stat.date, period.startDate, period.endDate)
  );

  const statsByMarketId = new Map<string, DailyStats[]>();
  for (const stat of statsInPeriod) {
    const marketId = stat.marketId ?? '';
    const current = statsByMarketId.get(marketId) ?? [];
    current.push(stat);
    statsByMarketId.set(marketId, current);
  }

  const marketRows: SettlementMarketRow[] = marketsInPeriod.map(market => {
    const marketId = getMarketId(market);
    const stats = statsByMarketId.get(marketId) ?? [];
    const revenue = sumNumbers(stats.map(stat => finiteNumber(stat.revenue)));
    const productCost = sumNumbers(stats.map(stat => finiteNumber(stat.cost)));
    const grossProfit = sumNumbers(stats.map(stat => finiteNumber(stat.profit)));
    const fixedMarketCost = getFixedMarketCost(market);
    const commissionFee = getCommissionFee(market, revenue);
    const dealCount = sumNumbers(stats.map(stat => finiteNumber(stat.dealCount)));
    const interactionCount = sumNumbers(stats.map(stat =>
      finiteNumber(stat.touchCount) + finiteNumber(stat.inquiryCount)
    ));

    return {
      marketId,
      marketName: market.name,
      startDate: market.startDate,
      endDate: market.endDate,
      location: market.location,
      revenue,
      productCost,
      grossProfit,
      fixedMarketCost,
      commissionFee,
      netProfit: grossProfit - fixedMarketCost - commissionFee,
      dealCount,
      interactionCount,
      averageOrderValue: dealCount > 0 ? revenue / dealCount : 0,
      syncStatus: market.sync_status ?? null,
    };
  }).sort((a, b) => b.netProfit - a.netProfit || b.revenue - a.revenue || a.marketName.localeCompare(b.marketName));

  const marketRowById = new Map(marketRows.map(row => [row.marketId, row]));
  const ongoingOrFutureMarketIds = marketsInPeriod
    .filter(market => isOngoingOrFutureMarket(market, generatedAtDate))
    .map(getMarketId)
    .filter(Boolean);
  const partialPeriodMarketIds = marketsInPeriod
    .filter(market => isPartialPeriodInsightMarket(market, period.startDate, period.endDate))
    .map(getMarketId)
    .filter(Boolean);
  const projectionMismatchMarketIds = marketsInPeriod
    .filter(market => {
      const row = marketRowById.get(getMarketId(market));
      return row !== undefined && hasProjectionMismatch(market, row);
    })
    .map(getMarketId)
    .filter(Boolean);
  const zeroCostMarketIds = marketRows
    .filter(row => row.revenue > 0 && row.fixedMarketCost === 0 && row.commissionFee === 0)
    .map(row => row.marketId);
  const manualEntryDominantMarketIds = marketRows
    .filter(row => row.revenue > 0 && (statsByMarketId.get(row.marketId) ?? []).every(stat => (stat.productsSold ?? []).length === 0))
    .map(row => row.marketId);
  const dailyStatKeyCounts = new Map<string, number>();
  for (const stat of statsInPeriod) {
    const key = getDailyStatKey(stat);
    dailyStatKeyCounts.set(key, (dailyStatKeyCounts.get(key) ?? 0) + 1);
  }
  const possibleDuplicateDailyStatKeys = Array.from(dailyStatKeyCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
  const outlierDailyStatIds = statsInPeriod
    .filter(hasOutlierValues)
    .map(getDailyStatId);

  const productTotals = new Map<string, { quantity: number; revenue: number }>();
  for (const stat of statsInPeriod) {
    for (const sold of stat.productsSold ?? []) {
      const productId = sold.productId;
      if (!productId) continue;
      const current = productTotals.get(productId) ?? { quantity: 0, revenue: 0 };
      current.quantity += finiteNumber(sold.quantity);
      current.revenue += finiteNumber(sold.revenue);
      productTotals.set(productId, current);
    }
  }

  const missingProductNames: string[] = [];
  const productRows: SettlementProductRow[] = Array.from(productTotals.entries()).map(([productId, totals]) => {
    const product = productById.get(productId);
    if (!product?.name) {
      missingProductNames.push(productId);
    }

    const unitCost = optionalFiniteNumber(product?.cost);
    const estimatedCost = unitCost === null ? null : unitCost * totals.quantity;

    return {
      productId,
      productName: product?.name ?? productId,
      quantity: totals.quantity,
      revenue: totals.revenue,
      estimatedCost,
      estimatedGrossProfit: estimatedCost === null ? null : totals.revenue - estimatedCost,
    };
  }).sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity || a.productName.localeCompare(b.productName));
  const costBasisEstimatedProductIds = productRows
    .filter(row => row.estimatedCost !== null)
    .map(row => row.productId);

  const marketsWithoutDailyStats = marketsInPeriod
    .filter(market => !statsByMarketId.has(getMarketId(market)))
    .map(getMarketId)
    .filter(Boolean);
  const unsyncedMarketIds = marketsInPeriod
    .filter(market => market.sync_status !== undefined && market.sync_status !== 'synced')
    .map(getMarketId)
    .filter(Boolean);

  const money: SettlementReportMoneySummary = {
    totalRevenue: sumNumbers(marketRows.map(row => row.revenue)),
    productCost: sumNumbers(marketRows.map(row => row.productCost)),
    grossProfit: sumNumbers(marketRows.map(row => row.grossProfit)),
    fixedMarketCost: sumNumbers(marketRows.map(row => row.fixedMarketCost)),
    commissionFee: sumNumbers(marketRows.map(row => row.commissionFee)),
    netProfit: sumNumbers(marketRows.map(row => row.netProfit)),
  };

  const totalDeals = sumNumbers(marketRows.map(row => row.dealCount));
  const costTrackedRevenue = sumNumbers(statsInPeriod
    .filter(stat => finiteNumber(stat.cost) > 0)
    .map(stat => finiteNumber(stat.revenue)));
  const productDetailRevenue = sumNumbers(productRows.map(row => finiteNumber(row.revenue)));
  const interactionTrackedMarketCount = marketRows.filter(row => row.interactionCount > 0).length;
  const costCoverageRatio = ratio(costTrackedRevenue, money.totalRevenue);
  const productDetailCoverageRatio = ratio(productDetailRevenue, money.totalRevenue);
  const interactionCoverageRatio = ratio(interactionTrackedMarketCount, marketsInPeriod.length);
  const syncCoverageRatio = ratio(marketsInPeriod.length - unsyncedMarketIds.length, marketsInPeriod.length);
  const limitations = buildLimitations({
    includedMarketCount: marketsInPeriod.length,
    marketsWithoutDailyStats,
    unsyncedMarketIds,
    excludedMarketIds,
    ongoingOrFutureMarketIds,
    projectionMismatchMarketIds,
    possibleDuplicateDailyStatKeys,
    outlierDailyStatIds,
    manualEntryDominantMarketIds,
    zeroCostMarketIds,
    costBasisEstimatedProductIds,
    partialPeriodMarketIds,
    costCoverageRatio,
    productDetailCoverageRatio,
    interactionCoverageRatio,
  });

  const baseDataQuality: Omit<SettlementReportDataQuality, 'notes'> = {
    includedDailyStatCount: statsInPeriod.length,
    marketsWithoutDailyStats,
    missingProductNames,
    unsyncedMarketIds,
    excludedMarketIds,
    ongoingOrFutureMarketIds,
    projectionMismatchMarketIds,
    possibleDuplicateDailyStatKeys,
    outlierDailyStatIds,
    manualEntryDominantMarketIds,
    zeroCostMarketIds,
    costBasisEstimatedProductIds,
    partialPeriodMarketIds,
    costTrackedRevenue,
    productDetailRevenue,
    interactionTrackedMarketCount,
    costCoverageRatio,
    productDetailCoverageRatio,
    interactionCoverageRatio,
    syncCoverageRatio,
    confidence: getConfidence(
      (ratio(marketsInPeriod.length - marketsWithoutDailyStats.length, marketsInPeriod.length) * 0.3) +
      (costCoverageRatio * 0.25) +
      (productDetailCoverageRatio * 0.2) +
      (interactionCoverageRatio * 0.15) +
      (syncCoverageRatio * 0.1)
    ),
    limitations,
  };

  const activity: SettlementReportActivitySummary = {
    totalDeals,
    totalInteractions: sumNumbers(marketRows.map(row => row.interactionCount)),
    averageOrderValue: totalDeals > 0 ? money.totalRevenue / totalDeals : 0,
    includedMarketCount: marketsInPeriod.length,
    marketsWithSalesCount: marketRows.filter(row => row.revenue > 0).length,
  };
  const decision = buildOverallDecision({
    money,
    activity,
    productRows,
    dataQuality: baseDataQuality,
  });
  const marketDecisions = buildMarketDecisions(marketRows, baseDataQuality);
  const dataQuality: SettlementReportDataQuality = {
    ...baseDataQuality,
    notes: buildDataQualityNotes(baseDataQuality),
  };
  const content = buildReportContent({
    period,
    money,
    activity,
    decision,
    marketRows,
    marketDecisions,
    productRows,
    dataQuality,
  });

  return {
    period,
    money,
    activity,
    decision,
    marketRows,
    marketDecisions,
    productRows,
    dataQuality,
    content,
  };
}
