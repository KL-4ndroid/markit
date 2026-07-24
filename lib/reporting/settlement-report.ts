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
import { buildInsightQualityModel, type InsightQualityModel } from '@/lib/analytics/insight-quality-model';
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
    brandName: string;
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
  brandName: string;
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
  brandName?: string;
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

function getReportBrandName(brandName: string | undefined): string {
  const normalized = typeof brandName === 'string' ? brandName.trim().slice(0, 40) : '';
  return normalized.length > 0 ? normalized : '我的品牌';
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

function getConfidenceLabel(confidence: SettlementReportConfidence): string {
  if (confidence === 'high') return '高';
  if (confidence === 'medium') return '中';
  return '低';
}

function getSignalStatus(coverage: number): SettlementReportSignalStatus {
  if (coverage >= 0.75) return 'available';
  if (coverage > 0) return 'limited';
  return 'unavailable';
}

function buildSettlementInsightQualityModel(input: {
  limitations: SettlementReportLimitation[];
  includedMarketCount: number;
  marketsWithoutDailyStats: string[];
  costCoverageRatio: number;
  productDetailCoverageRatio: number;
  interactionCoverageRatio: number;
  syncCoverageRatio: number;
}): InsightQualityModel {
  const dailyStatsCoverage = ratio(
    input.includedMarketCount - input.marketsWithoutDailyStats.length,
    input.includedMarketCount
  );

  return buildInsightQualityModel({
    limitations: input.limitations,
    confidenceComponents: [
      {
        key: 'daily_stats_coverage',
        label: '每日統計覆蓋率',
        weight: 30,
        score: dailyStatsCoverage,
        status: getSignalStatus(dailyStatsCoverage),
        reason: '衡量納入報告的市集中，有多少具備報告期間的每日統計資料。',
      },
      {
        key: 'cost_coverage',
        label: '成本覆蓋率',
        weight: 25,
        score: input.costCoverageRatio,
        status: getSignalStatus(input.costCoverageRatio),
        reason: '衡量報告中的營收有多少具備成本資料。',
      },
      {
        key: 'product_detail_coverage',
        label: '商品明細覆蓋率',
        weight: 20,
        score: input.productDetailCoverageRatio,
        status: getSignalStatus(input.productDetailCoverageRatio),
        reason: '衡量報告中的營收有多少可連結到商品明細。',
      },
      {
        key: 'interaction_coverage',
        label: '互動資料覆蓋率',
        weight: 15,
        score: input.interactionCoverageRatio,
        status: getSignalStatus(input.interactionCoverageRatio),
        reason: '衡量納入報告的市集中，有多少具備互動資料。',
      },
      {
        key: 'sync_coverage',
        label: '同步覆蓋率',
        weight: 10,
        score: input.syncCoverageRatio,
        status: getSignalStatus(input.syncCoverageRatio),
        reason: '衡量納入報告的市集中，有多少已完成同步。',
      },
    ],
  });
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
    notes.push('部分納入報告的市集在此期間沒有每日統計資料。');
  }

  if (dataQuality.missingProductNames.length > 0) {
    notes.push('部分商品紀錄無法對應到商品名稱。');
  }

  if (dataQuality.unsyncedMarketIds.length > 0) {
    notes.push('部分納入報告的市集尚未標示為已同步。');
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
      message: '此報告期間沒有可納入結算的已完成市集。',
      recommendation: '請選擇包含已完成市集紀錄的期間，再用報告判斷是否再次參加。',
    });
  } else if (input.includedMarketCount === 1) {
    limitations.push({
      code: 'low_sample_size',
      severity: 'info',
      affectedSections: ['overall_score', 'market_rejoin', 'data_quality'],
      message: '此報告只包含一場市集，因此排行與趨勢結論較有限。',
      recommendation: '可先作為單場市集結案報告；若要做整體策略判斷，建議累積更多市集後再比較。',
    });
  }

  if (input.excludedMarketIds.length > 0) {
    limitations.push({
      code: 'excluded_inactive_market',
      severity: 'info',
      affectedSections: ['market_rejoin', 'data_quality'],
      message: '已取消、延期或刪除的市集未納入結算總額。',
      recommendation: '若需要呈現取消費、訂金或已投入成本，請另外檢視這些未納入的市集。',
    });
  }

  if (input.ongoingOrFutureMarketIds.length > 0) {
    limitations.push({
      code: 'ongoing_or_future_market',
      severity: 'warning',
      affectedSections: ['overall_score', 'market_rejoin', 'data_quality'],
      message: '部分納入的市集仍在進行中或日期在未來，因此這不是最終結案報告。',
      recommendation: '建議等市集完成後再產生報告，作為正式結算判斷。',
    });
  }

  if (input.marketsWithoutDailyStats.length > 0) {
    limitations.push({
      code: 'missing_daily_stats',
      severity: 'warning',
      affectedSections: ['overall_score', 'market_rejoin', 'data_quality'],
      message: '部分市集在此報告期間缺少每日統計資料。',
      recommendation: '請補齊這些市集的每日營收與成交紀錄，再依據市集排行做判斷。',
    });
  }

  if (input.costCoverageRatio < 0.75) {
    limitations.push({
      code: 'missing_cost_data',
      severity: input.costCoverageRatio === 0 ? 'warning' : 'info',
      affectedSections: ['overall_score', 'profit', 'market_rejoin'],
      message: '成本資料覆蓋不完整，因此淨利與利潤率分析屬於估算。',
      recommendation: '營收、成交數與平均客單價仍有參考價值；若要做利潤決策，請補上商品成本或手動成本。',
    });
  }

  if (input.zeroCostMarketIds.length > 0) {
    limitations.push({
      code: 'zero_or_missing_market_cost',
      severity: 'info',
      affectedSections: ['profit', 'market_rejoin', 'data_quality'],
      message: '部分有營收的市集沒有攤位費、報名費、租借費或抽成成本紀錄。',
      recommendation: '若這些市集並非免費參加，請先補上市集成本，再參考淨利與成本壓力結論。',
    });
  }

  if (input.productDetailCoverageRatio < 0.75) {
    limitations.push({
      code: 'missing_product_detail',
      severity: input.productDetailCoverageRatio === 0 ? 'warning' : 'info',
      affectedSections: ['product_ranking', 'product_actions'],
      message: '商品明細覆蓋不完整，因此商品排行與補貨建議較有限。',
      recommendation: '市集層級的銷售分析仍可參考；若要做商品決策，建議記錄商品層級銷售。',
    });
  }

  if (input.manualEntryDominantMarketIds.length > 0) {
    limitations.push({
      code: 'manual_entry_dominant',
      severity: 'info',
      affectedSections: ['product_ranking', 'product_actions', 'data_quality'],
      message: '此報告中有部分資料主要來自簡易收入登載。',
      recommendation: '營收、成交數與平均客單價仍可參考；但這些市集的商品排行應隱藏或標示為不可用。',
    });
  }

  if (input.costBasisEstimatedProductIds.length > 0) {
    limitations.push({
      code: 'cost_basis_estimated',
      severity: 'info',
      affectedSections: ['profit', 'product_actions', 'data_quality'],
      message: '部分商品利潤估算使用目前商品成本，而非成交當下的成本紀錄。',
      recommendation: '若未記錄成交當下成本，商品利潤請視為方向性參考。',
    });
  }

  if (input.interactionCoverageRatio < 0.75) {
    limitations.push({
      code: 'missing_interaction_data',
      severity: input.interactionCoverageRatio === 0 ? 'warning' : 'info',
      affectedSections: ['conversion'],
      message: '互動資料不完整，因此轉換率分析較有限。',
      recommendation: '請優先參考營收、成交數與平均客單價；若要判斷攤位吸引力，建議補充互動紀錄。',
    });
  }

  if (input.unsyncedMarketIds.length > 0) {
    limitations.push({
      code: 'unsynced_data',
      severity: 'warning',
      affectedSections: ['overall_score', 'data_quality'],
      message: '部分市集尚未標示為已同步，因此雲端確認後的報告可能不同。',
      recommendation: '若要作為正式分享檔案，請先完成同步。',
    });
  }

  if (input.projectionMismatchMarketIds.length > 0) {
    limitations.push({
      code: 'projection_mismatch',
      severity: 'warning',
      affectedSections: ['overall_score', 'market_rejoin', 'data_quality'],
      message: '部分市集彙總數字與此報告使用的期間每日統計不同。',
      recommendation: '若要作為正式財務紀錄，請先執行唯讀投影檢查。',
    });
  }

  if (input.possibleDuplicateDailyStatKeys.length > 0) {
    limitations.push({
      code: 'possible_duplicate_daily_stats',
      severity: 'warning',
      affectedSections: ['overall_score', 'market_rejoin', 'product_ranking', 'data_quality'],
      message: '偵測到同一市集、同一日期可能有重複的每日統計資料。',
      recommendation: '請先確認來源紀錄，再採信總額、排行或商品建議。',
    });
  }

  if (input.outlierDailyStatIds.length > 0) {
    limitations.push({
      code: 'outlier_values',
      severity: 'warning',
      affectedSections: ['overall_score', 'profit', 'market_rejoin', 'conversion', 'data_quality'],
      message: '偵測到異常負數、過大數值或內部不一致的資料。',
      recommendation: '請先檢查這些來源紀錄，再將評分視為最終結果。',
    });
  }

  if (input.partialPeriodMarketIds.length > 0) {
    limitations.push({
      code: 'partial_period_overlap',
      severity: 'info',
      affectedSections: ['profit', 'market_rejoin', 'data_quality'],
      message: '部分多日市集只和此報告期間部分重疊。',
      recommendation: '此模型會將固定市集成本計入一次；若需要精準分攤利潤，請使用完整市集期間。',
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
      label: '利潤表現',
      weight: 35,
      score: profitStatus === 'unavailable'
        ? null
        : scoreProfit(input.money.netProfit, input.money.totalRevenue),
      status: profitStatus,
      reason: profitStatus === 'unavailable'
        ? '缺少成本資料，因此不採用利潤評分。'
        : '使用扣除商品成本、固定市集成本與抽成後的淨利。',
    },
    {
      key: 'revenue_deals',
      label: '營收與成交量',
      weight: 20,
      score: scoreRevenueAndDeals(input.money.totalRevenue, input.activity.totalDeals),
      status: input.money.totalRevenue > 0 || input.activity.totalDeals > 0 ? 'available' : 'unavailable',
      reason: '使用報告期間的總營收與成交數。',
    },
    {
      key: 'cost_pressure',
      label: '市集成本壓力',
      weight: 15,
      score: scoreCostPressure(input.money.fixedMarketCost, input.money.commissionFee, input.money.totalRevenue),
      status: input.money.totalRevenue > 0 ? 'available' : 'unavailable',
      reason: '使用固定市集成本與抽成佔營收的比例。',
    },
    {
      key: 'average_order_value',
      label: '平均客單價',
      weight: 10,
      score: scoreAverageOrderValue(input.activity.averageOrderValue),
      status: input.activity.totalDeals > 0 ? 'available' : 'unavailable',
      reason: '使用營收除以成交數。',
    },
    {
      key: 'conversion',
      label: '互動轉換',
      weight: 10,
      score: conversionStatus === 'unavailable'
        ? null
        : scoreConversion(input.activity.totalDeals, input.activity.totalInteractions),
      status: conversionStatus,
      reason: conversionStatus === 'unavailable'
        ? '缺少互動資料，因此不採用轉換評分。'
        : '使用成交數除以已記錄互動數。',
    },
    {
      key: 'product_fit',
      label: '商品適配度',
      weight: 10,
      score: productStatus === 'unavailable'
        ? null
        : scoreProductFit(input.productRows, input.money.totalRevenue),
      status: productStatus,
      reason: productStatus === 'unavailable'
        ? '缺少商品明細，因此不採用商品適配度評分。'
        : '使用商品銷售覆蓋度與銷售集中度。',
    },
  ];
}

function recommendationSummary(recommendation: SettlementReportRecommendation): string {
  switch (recommendation) {
    case 'strong_rejoin':
      return '表現強。下次可優先考慮相似市集。';
    case 'rejoin':
      return '表現良好。若時間與攤位成本可接受，建議再次參加。';
    case 'observe':
      return '表現有好有壞。建議持續觀察，不急著列為優先。';
    case 'caution':
      return '表現偏弱或不確定。只有在有明確調整計畫時才建議再參加。';
    case 'avoid':
      return '表現不佳。除非條件改變，否則不建議優先參加相似市集。';
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
        label: '利潤表現',
        weight: 35,
        score: profit,
        status: profit === null ? 'unavailable' : getSignalStatus(dataQuality.costCoverageRatio),
        reason: profit === null ? '缺少成本資料。' : '使用市集淨利。',
      },
      {
        key: 'revenue_deals',
        label: '營收與成交量',
        weight: 25,
        score: revenueDeals,
        status: row.revenue > 0 || row.dealCount > 0 ? 'available' : 'unavailable',
        reason: '使用市集營收與成交數。',
      },
      {
        key: 'cost_pressure',
        label: '市集成本壓力',
        weight: 20,
        score: costPressure,
        status: row.revenue > 0 ? 'available' : 'unavailable',
        reason: '使用市集固定成本與抽成壓力。',
      },
      {
        key: 'average_order_value',
        label: '平均客單價',
        weight: 10,
        score: averageOrderValue,
        status: row.dealCount > 0 ? 'available' : 'unavailable',
        reason: '使用市集平均客單價。',
      },
      {
        key: 'conversion',
        label: '互動轉換',
        weight: 10,
        score: conversion,
        status: conversion === null ? 'unavailable' : getSignalStatus(dataQuality.interactionCoverageRatio),
        reason: conversion === null ? '缺少互動資料。' : '使用市集互動轉換率。',
      },
    ];

    const rejoinScore = weightedScore(components);
    const recommendation = getRecommendation(rejoinScore);
    const limitations: SettlementReportLimitationCode[] = [];
    if (profit === null || dataQuality.costCoverageRatio < 0.75) limitations.push('missing_cost_data');
    if (conversion === null || dataQuality.interactionCoverageRatio < 0.75) limitations.push('missing_interaction_data');
    if (row.syncStatus !== null && row.syncStatus !== 'synced') limitations.push('unsynced_data');

    const reasons = [
      `營收 ${Math.round(row.revenue)}，成交 ${Math.round(row.dealCount)} 筆。`,
      `平均客單價 ${Math.round(row.averageOrderValue)}。`,
    ];

    if (profit !== null) {
      reasons.push(`淨利估算 ${Math.round(row.netProfit)}。`);
    }

    if (conversion !== null) {
      reasons.push(`互動轉換使用 ${Math.round(row.interactionCount)} 筆已記錄互動。`);
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
  brandName: string;
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
    `總營收 ${Math.round(input.money.totalRevenue)}，共 ${input.activity.totalDeals} 筆成交。`,
    `平均客單價 ${Math.round(input.activity.averageOrderValue)}。`,
  ];

  if (bestMarket) {
    highlights.push(`最佳市集候選：${bestMarket.marketName}（${bestMarket.grade}）。`);
  }

  if (topProduct) {
    highlights.push(`已記錄營收最高商品：${topProduct.productName}。`);
  }

  const marketActions = input.marketDecisions.slice(0, 3).map(decision =>
    `${decision.marketName}: ${recommendationSummary(decision.recommendation)}`
  );

  const productActions = input.productRows.length === 0
    ? ['因未記錄商品層級銷售，商品排行目前不可用。']
    : input.productRows.slice(0, 3).map(product =>
      `${product.productName}：已記錄營收 ${Math.round(product.revenue)}，售出 ${Math.round(product.quantity)} 件。`
    );

  const dataActions = input.dataQuality.limitations.map(limitation => limitation.recommendation);

  return {
    cover: {
      brandName: input.brandName,
      title: `${input.brandName} ${input.period.label} 結算報告`,
      primaryConclusion: input.decision.summary,
      supportingSummary: `整體等級 ${input.decision.grade}，評分 ${input.decision.overallScore}，信心度 ${getConfidenceLabel(input.decision.confidence)}。`,
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
  brandName: inputBrandName,
  generatedAtDate,
}: BuildSettlementReportModelInput): SettlementReportModel {
  assertOwnerSettlementReportAllowed(capabilities);
  const brandName = getReportBrandName(inputBrandName);

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
  const reportInsightQuality = buildSettlementInsightQualityModel({
    limitations,
    includedMarketCount: marketsInPeriod.length,
    marketsWithoutDailyStats,
    costCoverageRatio,
    productDetailCoverageRatio,
    interactionCoverageRatio,
    syncCoverageRatio,
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
    confidence: reportInsightQuality.confidence,
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
    brandName,
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
    brandName,
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
