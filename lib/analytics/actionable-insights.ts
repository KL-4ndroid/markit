import type { DailyStats, Event, Market, Product } from '@/types/db';
import {
  analyzeDataCompleteness,
  type AnalyticsDataCompletenessResult,
  type AnalyticsDataLevel,
} from './data-completeness';
import {
  buildProductRecommendations,
  type ProductRecommendationAction,
} from './product-recommendations';

export type AnalyticsConfidence = 'low' | 'medium' | 'high';
export type AnalyticsInsightTone = 'positive' | 'notice' | 'warning';
export type AnalyticsInsightKind =
  | 'market_decision'
  | 'cost_pressure'
  | 'product_suggestion'
  | 'data_guidance';

export interface AnalyticsActionCard {
  kind: AnalyticsInsightKind;
  tone: AnalyticsInsightTone;
  title: string;
  headline: string;
  body: string;
  nextAction: string;
  confidence: AnalyticsConfidence;
  dataLevel: AnalyticsDataLevel;
  blockedBy?: string[];
}

export interface ProductInsight {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
  action: ProductRecommendationAction;
  reason: string;
  confidence: AnalyticsConfidence;
  isEstimated?: boolean;
  estimatedReason?: string;
}

export interface ActionableAnalyticsInput {
  markets?: Market[];
  events?: Event[];
  dailyStats?: DailyStats[];
  products?: Product[];
}

export interface ActionableAnalyticsResult {
  dataCompleteness: AnalyticsDataCompletenessResult;
  confidence: AnalyticsConfidence;
  topAction: AnalyticsActionCard;
  cards: AnalyticsActionCard[];
  productInsights: ProductInsight[];
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
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

function getConfidence(marketsWithRevenue: number): AnalyticsConfidence {
  if (marketsWithRevenue >= 8) return 'high';
  if (marketsWithRevenue >= 3) return 'medium';
  return 'low';
}

function buildMarketDecisionCard(
  markets: Market[],
  confidence: AnalyticsConfidence,
  dataLevel: AnalyticsDataLevel
): AnalyticsActionCard {
  const marketsWithRevenue = markets.filter((market) => isPositiveNumber(market.totalRevenue));

  if (marketsWithRevenue.length === 0) {
    return {
      kind: 'market_decision',
      tone: 'notice',
      title: '市集參加建議',
      headline: '先累積一筆有收入的市集紀錄',
      body: '目前資料還不足以判斷哪些市集值得再次參加。',
      nextAction: '結束營業後至少補登當日總收入與主要成本。',
      confidence,
      dataLevel,
      blockedBy: ['market_revenue'],
    };
  }

  const totalRevenue = sum(marketsWithRevenue.map((market) => market.totalRevenue ?? 0));
  const totalFixedCost = sum(marketsWithRevenue.map(getFixedCost));
  const totalNetProfit = sum(marketsWithRevenue.map(getNetProfit));
  const costRatio = totalRevenue > 0 ? totalFixedCost / totalRevenue : 0;

  if (totalNetProfit > 0 && costRatio <= 0.35) {
    return {
      kind: 'market_decision',
      tone: 'positive',
      title: '市集參加建議',
      headline: '目前表現支持繼續參加相似市集',
      body: '收入能覆蓋固定成本，整體淨利也維持正向。',
      nextAction: '下次優先準備這類市集的熱銷品與基本庫存。',
      confidence,
      dataLevel,
    };
  }

  if (totalNetProfit > 0) {
    return {
      kind: 'market_decision',
      tone: 'notice',
      title: '市集參加建議',
      headline: '可以再參加，但要先控制成本',
      body: '市集仍有獲利，不過固定成本吃掉較高比例的收入。',
      nextAction: '下次先檢查攤位費、租借費，或準備更高毛利的商品。',
      confidence,
      dataLevel,
    };
  }

  return {
    kind: 'market_decision',
    tone: 'warning',
    title: '市集參加建議',
    headline: '先暫緩相似市集，或降低參加成本',
    body: '目前紀錄顯示淨利不足，直接重複參加可能會增加壓力。',
    nextAction: '下次只在費用更低、客群更明確，或商品組合調整後再參加。',
    confidence,
    dataLevel,
  };
}

function buildCostPressureCard(
  markets: Market[],
  confidence: AnalyticsConfidence,
  dataLevel: AnalyticsDataLevel
): AnalyticsActionCard {
  const marketsWithRevenue = markets.filter((market) => isPositiveNumber(market.totalRevenue));

  if (marketsWithRevenue.length === 0) {
    return {
      kind: 'cost_pressure',
      tone: 'notice',
      title: '成本壓力',
      headline: '還沒有足夠資料判斷成本壓力',
      body: '成本分析至少需要收入與攤位相關費用。',
      nextAction: '補登收入時，同時記錄攤位費與租借費。',
      confidence,
      dataLevel,
      blockedBy: ['market_revenue', 'fixed_cost'],
    };
  }

  const totalRevenue = sum(marketsWithRevenue.map((market) => market.totalRevenue ?? 0));
  const totalFixedCost = sum(marketsWithRevenue.map(getFixedCost));
  const costRatio = totalRevenue > 0 ? totalFixedCost / totalRevenue : 0;
  const costPercent = Math.round(costRatio * 100);

  if (costRatio <= 0.25) {
    return {
      kind: 'cost_pressure',
      tone: 'positive',
      title: '成本壓力',
      headline: '固定成本目前健康',
      body: `固定成本約占收入 ${costPercent}%，目前沒有明顯壓力。`,
      nextAction: '維持目前成本結構，優先把精力放在熱銷商品準備。',
      confidence,
      dataLevel,
    };
  }

  if (costRatio <= 0.45) {
    return {
      kind: 'cost_pressure',
      tone: 'notice',
      title: '成本壓力',
      headline: '成本比例需要留意',
      body: `固定成本約占收入 ${costPercent}%，獲利容易受到天氣或人流影響。`,
      nextAction: '下次參加前先估算最低營收目標，再決定是否租借額外設備。',
      confidence,
      dataLevel,
    };
  }

  return {
    kind: 'cost_pressure',
    tone: 'warning',
    title: '成本壓力',
    headline: '固定成本偏高',
    body: `固定成本約占收入 ${costPercent}%，可能壓縮實際利潤。`,
    nextAction: '考慮降低租借費、合攤，或只參加預期客群更吻合的市集。',
    confidence,
    dataLevel,
  };
}

function buildDataGuidanceCard(
  completeness: AnalyticsDataCompletenessResult,
  confidence: AnalyticsConfidence
): AnalyticsActionCard {
  if (completeness.level === 'summary_only') {
    return {
      kind: 'data_guidance',
      tone: 'notice',
      title: '資料完整度',
      headline: '目前適合做市集與成本層級分析',
      body: '只補登總收入也是有效紀錄，但商品、補貨與互動建議需要更細的資料。',
      nextAction: '下次忙碌時只要多記錄前 3 個熱銷商品，就能解鎖商品分析。',
      confidence,
      dataLevel: completeness.level,
      blockedBy: completeness.missingSignals,
    };
  }

  if (completeness.level === 'transaction_amount') {
    return {
      kind: 'data_guidance',
      tone: 'notice',
      title: '資料完整度',
      headline: '已可分析交易金額，但商品建議仍有限',
      body: '目前可以看客單價與市集表現，但還不能可靠判斷補貨或定價。',
      nextAction: '下次至少為熱銷商品使用快速商品按鈕。',
      confidence,
      dataLevel: completeness.level,
      blockedBy: completeness.missingSignals,
    };
  }

  return {
    kind: 'data_guidance',
    tone: 'positive',
    title: '資料完整度',
    headline: '商品層級資料已可用',
    body: '目前資料足以產生商品排行與基礎補貨建議。',
    nextAction: '若想看互動轉換與時段洞察，請盡量在現場即時記錄互動與成交。',
    confidence,
    dataLevel: completeness.level,
    blockedBy: completeness.missingSignals,
  };
}

function buildProductInsights(
  input: ActionableAnalyticsInput,
  completeness: AnalyticsDataCompletenessResult,
  confidence: AnalyticsConfidence
): ProductInsight[] {
  if (!completeness.capabilities.productRanking) return [];

  return buildProductRecommendations({
    dailyStats: input.dailyStats,
    products: input.products,
    confidence,
  });
}

function buildProductCard(
  productInsights: ProductInsight[],
  completeness: AnalyticsDataCompletenessResult,
  confidence: AnalyticsConfidence
): AnalyticsActionCard {
  if (productInsights.length === 0) {
    return {
      kind: 'product_suggestion',
      tone: 'notice',
      title: '商品建議',
      headline: '需要商品銷售明細後才能提供補貨建議',
      body: '目前沒有足夠的商品、數量與收入資料，系統不會硬做不可靠的商品建議。',
      nextAction: '下次只要先記錄熱銷商品名稱與數量，就能開始產生商品排行。',
      confidence,
      dataLevel: completeness.level,
      blockedBy: ['product_level_sales'],
    };
  }

  const topProduct = productInsights[0];

  return {
    kind: 'product_suggestion',
    tone: topProduct.action === 'restock' ? 'positive' : 'notice',
    title: '商品建議',
    headline: `${topProduct.productName} 是目前最值得追蹤的商品`,
    body: `已記錄 ${topProduct.quantity} 件、收入 ${Math.round(topProduct.revenue)}。${topProduct.reason}`,
    nextAction: topProduct.action === 'restock'
      ? '下次市集前優先補足這項商品，並觀察是否提早售完。'
      : '下次可以把這項商品放在更容易被看到的位置，繼續累積紀錄。',
    confidence,
    dataLevel: completeness.level,
  };
}

export function buildActionableAnalytics(input: ActionableAnalyticsInput): ActionableAnalyticsResult {
  const markets = input.markets ?? [];
  const completeness = analyzeDataCompleteness(input);
  const marketsWithRevenue = markets.filter((market) => isPositiveNumber(market.totalRevenue)).length;
  const confidence = getConfidence(marketsWithRevenue);
  const productInsights = buildProductInsights(input, completeness, confidence);

  const marketDecisionCard = buildMarketDecisionCard(markets, confidence, completeness.level);
  const costPressureCard = buildCostPressureCard(markets, confidence, completeness.level);
  const dataGuidanceCard = buildDataGuidanceCard(completeness, confidence);
  const productCard = buildProductCard(productInsights, completeness, confidence);

  const cards = [
    marketDecisionCard,
    costPressureCard,
    dataGuidanceCard,
    productCard,
  ];

  const topAction = cards.find((card) => card.tone === 'warning') ?? marketDecisionCard;

  return {
    dataCompleteness: completeness,
    confidence,
    topAction,
    cards,
    productInsights,
  };
}
