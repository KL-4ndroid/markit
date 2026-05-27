import type { Market } from '@/types/db';
import {
  buildActionableAnalytics,
  type ActionableAnalyticsInput,
  type AnalyticsConfidence,
} from './actionable-insights';
import type { AnalyticsDataLevel } from './data-completeness';

export interface MarketRecapReport {
  title: string;
  summary: string;
  resultLabel: 'strong' | 'watch' | 'needs_adjustment' | 'not_enough_data';
  dataLevel: AnalyticsDataLevel;
  confidence: AnalyticsConfidence;
  highlights: string[];
  opportunities: string[];
  nextActions: string[];
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function getFixedCost(market: Market): number {
  const tableRental = market.tableFree ? 0 : (market.tableRental ?? 0);
  const chairRental = market.chairFree ? 0 : (market.chairRental ?? 0);
  const umbrellaRental = market.umbrellaFree ? 0 : (market.umbrellaRental ?? 0);
  const tableclothRental = market.tableclothFree ? 0 : (market.tableclothRental ?? 0);

  return (
    (market.registrationFee ?? 0) +
    (market.boothCost ?? 0) +
    tableRental +
    chairRental +
    umbrellaRental +
    tableclothRental
  );
}

function getNetProfit(market: Market): number {
  const revenue = market.totalRevenue ?? 0;
  const grossProfit = market.totalProfit ?? revenue;
  const commission = revenue * ((market.commissionRate ?? 0) / 100);

  return grossProfit - getFixedCost(market) - commission;
}

function getReportTitle(markets: Market[]): string {
  if (markets.length === 1) {
    return `${markets[0].name} 回顧`;
  }

  return `市集回顧：${markets.length} 場`;
}

function getResultLabel(markets: Market[]): MarketRecapReport['resultLabel'] {
  const marketsWithRevenue = markets.filter((market) => isPositiveNumber(market.totalRevenue));
  if (marketsWithRevenue.length === 0) return 'not_enough_data';

  const totalRevenue = marketsWithRevenue.reduce((total, market) => total + (market.totalRevenue ?? 0), 0);
  const totalNetProfit = marketsWithRevenue.reduce((total, market) => total + getNetProfit(market), 0);
  const totalFixedCost = marketsWithRevenue.reduce((total, market) => total + getFixedCost(market), 0);
  const costRatio = totalRevenue > 0 ? totalFixedCost / totalRevenue : 0;

  if (totalNetProfit > 0 && costRatio <= 0.35) return 'strong';
  if (totalNetProfit > 0) return 'watch';
  return 'needs_adjustment';
}

function buildSummary(label: MarketRecapReport['resultLabel'], markets: Market[]): string {
  if (label === 'not_enough_data') {
    return '目前資料還不足以產生可靠回顧。先補上收入與主要成本，就能得到基本市集判斷。';
  }

  const totalRevenue = markets.reduce((total, market) => total + (market.totalRevenue ?? 0), 0);
  const totalNetProfit = markets.reduce((total, market) => total + getNetProfit(market), 0);

  if (label === 'strong') {
    return `這個範圍整體表現良好，收入約 ${Math.round(totalRevenue)}，估計淨利約 ${Math.round(totalNetProfit)}。`;
  }

  if (label === 'watch') {
    return `這個範圍仍有獲利，但成本或商品組合需要留意。收入約 ${Math.round(totalRevenue)}，估計淨利約 ${Math.round(totalNetProfit)}。`;
  }

  return `這個範圍的估計淨利偏弱。收入約 ${Math.round(totalRevenue)}，估計淨利約 ${Math.round(totalNetProfit)}。`;
}

function buildHighlights(input: ActionableAnalyticsInput): string[] {
  const analytics = buildActionableAnalytics(input);
  const highlights: string[] = [];

  if (analytics.dataCompleteness.capabilities.marketPerformance) {
    highlights.push(analytics.cards.find((card) => card.kind === 'market_decision')?.headline ?? '已有足夠資料檢視市集表現。');
  }

  if (analytics.productInsights.length > 0) {
    const topProduct = analytics.productInsights[0];
    highlights.push(`${topProduct.productName} 是目前最明顯的商品訊號，已記錄 ${topProduct.quantity} 件。`);
  }

  if (analytics.dataCompleteness.capabilities.conversionRate) {
    highlights.push('目前已有交易與互動資料，可以開始觀察互動與成交之間的關係。');
  }

  return highlights.length > 0 ? highlights : ['先從收入、成本與是否值得再次參加開始判斷。'];
}

function buildOpportunities(input: ActionableAnalyticsInput): string[] {
  const analytics = buildActionableAnalytics(input);
  const opportunities: string[] = [];

  const costCard = analytics.cards.find((card) => card.kind === 'cost_pressure');
  if (costCard?.tone === 'warning' || costCard?.tone === 'notice') {
    opportunities.push(costCard.headline);
  }

  if (!analytics.dataCompleteness.capabilities.productRanking) {
    opportunities.push('商品層級資料不足，暫時不適合做補貨或定價判斷。');
  }

  if (!analytics.dataCompleteness.capabilities.interactionConversion) {
    opportunities.push('互動與成交時間資料仍不足，暫時不做時段或互動轉換推論。');
  }

  return opportunities;
}

function buildNextActions(input: ActionableAnalyticsInput): string[] {
  const analytics = buildActionableAnalytics(input);
  const nextActions = [analytics.topAction.nextAction];

  const dataGuidance = analytics.cards.find((card) => card.kind === 'data_guidance');
  if (dataGuidance && dataGuidance.nextAction !== analytics.topAction.nextAction) {
    nextActions.push(dataGuidance.nextAction);
  }

  const productCard = analytics.cards.find((card) => card.kind === 'product_suggestion');
  if (productCard && productCard.blockedBy === undefined && productCard.nextAction !== analytics.topAction.nextAction) {
    nextActions.push(productCard.nextAction);
  }

  return nextActions.slice(0, 3);
}

export function buildMarketRecapReport(input: ActionableAnalyticsInput): MarketRecapReport {
  const markets = input.markets ?? [];
  const analytics = buildActionableAnalytics(input);
  const resultLabel = getResultLabel(markets);

  return {
    title: getReportTitle(markets),
    summary: buildSummary(resultLabel, markets),
    resultLabel,
    dataLevel: analytics.dataCompleteness.level,
    confidence: analytics.confidence,
    highlights: buildHighlights(input),
    opportunities: buildOpportunities(input),
    nextActions: buildNextActions(input),
  };
}
