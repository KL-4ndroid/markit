import type {
  SettlementMarketDecision,
  SettlementProductRow,
  SettlementReportLimitation,
  SettlementReportLimitationCode,
  SettlementReportModel,
  SettlementReportRecommendation,
  SettlementReportSignalStatus,
} from '@/lib/reporting/settlement-report';

export type SettlementReportPdfPageKey =
  | 'cover_summary'
  | 'data_confidence_score'
  | 'market_performance'
  | 'product_performance'
  | 'cost_profit_actions';

export type SettlementReportPdfFontPlan = {
  family: 'Noto Sans TC';
  license: 'SIL Open Font License 1.1';
  assetBasePath: '/fonts/report/';
  assetFileName: 'NotoSansTC-VariableFont_wght.ttf';
  assetPath: '/fonts/report/NotoSansTC-VariableFont_wght.ttf';
  format: 'ttf';
  distribution: 'variable';
  weights: Array<'regular' | 'medium' | 'bold'>;
  source: 'Official Noto / Google Fonts distribution';
  renderSmokeTestRequired: true;
};

export type SettlementReportPdfMetric = {
  label: string;
  value: string;
  note?: string;
};

export type SettlementReportPdfWarning = {
  code: string;
  severity: 'info' | 'warning';
  message: string;
  recommendation: string;
};

export type SettlementReportPdfPageBase = {
  key: SettlementReportPdfPageKey;
  pageNumber: number;
  title: string;
  purpose: string;
};

export type SettlementReportPdfCoverPage = SettlementReportPdfPageBase & {
  key: 'cover_summary';
  brandName: string;
  reportTypeLabel: string;
  periodLabel: string;
  recommendationLabel: string;
  recommendationSummary: string;
  scoreLabel: string;
  gradeLabel: string;
  confidenceLabel: string;
  readinessLabel: string;
  metrics: SettlementReportPdfMetric[];
  topWarnings: SettlementReportPdfWarning[];
};

export type SettlementReportPdfScoreRow = {
  key: string;
  label: string;
  weightLabel: string;
  scoreLabel: string;
  status: SettlementReportSignalStatus;
  statusLabel: string;
  reason: string;
};

export type SettlementReportPdfDataConfidencePage = SettlementReportPdfPageBase & {
  key: 'data_confidence_score';
  confidenceLabel: string;
  warningCount: number;
  infoCount: number;
  limitations: SettlementReportPdfWarning[];
  scoreRows: SettlementReportPdfScoreRow[];
};

export type SettlementReportPdfMarketRow = {
  marketId: string;
  marketName: string;
  revenueLabel: string;
  netProfitLabel: string;
  dealCountLabel: string;
  averageOrderValueLabel: string;
  scoreLabel: string;
  gradeLabel: string;
  recommendationLabel: string;
  warningCodes: string[];
};

export type SettlementReportPdfMarketPage = SettlementReportPdfPageBase & {
  key: 'market_performance';
  rows: SettlementReportPdfMarketRow[];
  omittedRowCount: number;
  emptyMessage: string | null;
};

export type SettlementReportPdfProductRow = {
  productId: string;
  productName: string;
  quantityLabel: string;
  revenueLabel: string;
  grossProfitLabel: string;
  isProfitDirectional: boolean;
};

export type SettlementReportPdfProductPage = SettlementReportPdfPageBase & {
  key: 'product_performance';
  rows: SettlementReportPdfProductRow[];
  omittedRowCount: number;
  dataNeededMessage: string | null;
};

export type SettlementReportPdfActionGroup = {
  title: string;
  actions: string[];
};

export type SettlementReportPdfCostProfitPage = SettlementReportPdfPageBase & {
  key: 'cost_profit_actions';
  metrics: SettlementReportPdfMetric[];
  costCoverageLabel: string;
  profitReliabilityLabel: string;
  actionGroups: SettlementReportPdfActionGroup[];
};

export type SettlementReportPdfPage =
  | SettlementReportPdfCoverPage
  | SettlementReportPdfDataConfidencePage
  | SettlementReportPdfMarketPage
  | SettlementReportPdfProductPage
  | SettlementReportPdfCostProfitPage;

export type SettlementReportPdfViewModel = {
  version: 1;
  pageSize: 'A4';
  orientation: 'portrait';
  totalPages: 5;
  font: SettlementReportPdfFontPlan;
  meta: {
    brandName: string;
    reportTypeLabel: string;
    periodLabel: string;
    fileNameBase: string;
  };
  pages: [
    SettlementReportPdfCoverPage,
    SettlementReportPdfDataConfidencePage,
    SettlementReportPdfMarketPage,
    SettlementReportPdfProductPage,
    SettlementReportPdfCostProfitPage,
  ];
};

export type BuildSettlementReportPdfViewModelInput = {
  report: SettlementReportModel;
};

const MARKET_ROW_LIMIT = 8;
const PRODUCT_ROW_LIMIT = 8;

function formatMoney(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value * 100)}%`;
}

function reportTypeLabel(kind: 'weekly' | 'monthly'): string {
  return kind === 'monthly' ? '月結報告' : '週結報告';
}

function confidenceLabel(confidence: 'high' | 'medium' | 'low'): string {
  if (confidence === 'high') return '高';
  if (confidence === 'medium') return '中';
  return '低';
}

function signalStatusLabel(status: SettlementReportSignalStatus): string {
  if (status === 'available') return '可用';
  if (status === 'limited') return '僅供方向參考';
  return '資料不足';
}

function recommendationLabel(recommendation: SettlementReportRecommendation): string {
  switch (recommendation) {
    case 'strong_rejoin':
      return '強烈建議再參加';
    case 'rejoin':
      return '建議再參加';
    case 'observe':
      return '可觀察';
    case 'caution':
      return '需謹慎';
    case 'avoid':
      return '不建議優先參加';
  }
}

function readinessLabel(report: SettlementReportModel): string {
  const hasWarning = report.dataQuality.limitations.some(limitation => limitation.severity === 'warning');
  if (hasWarning || report.dataQuality.confidence === 'low') return '尚不適合作為正式報告';
  if (report.dataQuality.limitations.length > 0 || report.dataQuality.confidence === 'medium') {
    return '可參考但需保留判斷';
  }
  return '可作為正式報告檢視';
}

function normalizeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'settlement-report';
}

function toPdfWarning(limitation: SettlementReportLimitation): SettlementReportPdfWarning {
  return {
    code: limitation.code,
    severity: limitation.severity,
    message: limitation.message,
    recommendation: limitation.recommendation,
  };
}

function marketWarningCodes(
  decision: SettlementMarketDecision,
  report: SettlementReportModel
): string[] {
  const codes = new Set<string>(decision.limitations);
  const marketId = decision.marketId;

  if (report.dataQuality.marketsWithoutDailyStats.includes(marketId)) codes.add('missing_daily_stats');
  if (report.dataQuality.unsyncedMarketIds.includes(marketId)) codes.add('unsynced_data');
  if (report.dataQuality.ongoingOrFutureMarketIds.includes(marketId)) codes.add('ongoing_or_future_market');
  if (report.dataQuality.projectionMismatchMarketIds.includes(marketId)) codes.add('projection_mismatch');
  if (report.dataQuality.zeroCostMarketIds.includes(marketId)) codes.add('zero_or_missing_market_cost');
  if (report.dataQuality.partialPeriodMarketIds.includes(marketId)) codes.add('partial_period_overlap');

  return Array.from(codes);
}

function buildCoverPage(report: SettlementReportModel): SettlementReportPdfCoverPage {
  const warningLimitations = report.dataQuality.limitations
    .filter(limitation => limitation.severity === 'warning')
    .slice(0, 3)
    .map(toPdfWarning);

  return {
    key: 'cover_summary',
    pageNumber: 1,
    title: '封面摘要',
    purpose: '先給老闆整體結論與本期關鍵數字。',
    brandName: report.brandName,
    reportTypeLabel: reportTypeLabel(report.period.kind),
    periodLabel: report.period.label,
    recommendationLabel: recommendationLabel(report.decision.recommendation),
    recommendationSummary: report.decision.summary,
    scoreLabel: `${Math.round(report.decision.overallScore)} / 100`,
    gradeLabel: `等級 ${report.decision.grade}`,
    confidenceLabel: confidenceLabel(report.decision.confidence),
    readinessLabel: readinessLabel(report),
    metrics: [
      { label: '總營收', value: formatMoney(report.money.totalRevenue) },
      { label: '淨利', value: formatMoney(report.money.netProfit) },
      { label: '成交數', value: formatNumber(report.activity.totalDeals) },
      { label: '平均客單價', value: formatMoney(report.activity.averageOrderValue) },
    ],
    topWarnings: warningLimitations,
  };
}

function buildDataConfidencePage(report: SettlementReportModel): SettlementReportPdfDataConfidencePage {
  const limitations = [...report.dataQuality.limitations]
    .sort((a, b) => {
      if (a.severity === b.severity) return a.code.localeCompare(b.code);
      return a.severity === 'warning' ? -1 : 1;
    })
    .map(toPdfWarning);

  return {
    key: 'data_confidence_score',
    pageNumber: 2,
    title: '資料信心與評分拆解',
    purpose: '說明報告可信度、限制與評分依據。',
    confidenceLabel: confidenceLabel(report.dataQuality.confidence),
    warningCount: limitations.filter(limitation => limitation.severity === 'warning').length,
    infoCount: limitations.filter(limitation => limitation.severity === 'info').length,
    limitations,
    scoreRows: report.decision.scoreComponents.map(component => ({
      key: component.key,
      label: component.label,
      weightLabel: `${component.weight}%`,
      scoreLabel: component.score === null ? '不採計' : `${Math.round(component.score)} / 100`,
      status: component.status,
      statusLabel: signalStatusLabel(component.status),
      reason: component.reason,
    })),
  };
}

function buildMarketPage(report: SettlementReportModel): SettlementReportPdfMarketPage {
  const rows = report.marketDecisions.slice(0, MARKET_ROW_LIMIT).map(decision => {
    const marketRow = report.marketRows.find(row => row.marketId === decision.marketId);
    return {
      marketId: decision.marketId,
      marketName: decision.marketName,
      revenueLabel: formatMoney(marketRow?.revenue ?? 0),
      netProfitLabel: formatMoney(marketRow?.netProfit ?? 0),
      dealCountLabel: formatNumber(marketRow?.dealCount ?? 0),
      averageOrderValueLabel: formatMoney(marketRow?.averageOrderValue ?? 0),
      scoreLabel: `${Math.round(decision.rejoinScore)} / 100`,
      gradeLabel: decision.grade,
      recommendationLabel: recommendationLabel(decision.recommendation),
      warningCodes: marketWarningCodes(decision, report),
    };
  });

  return {
    key: 'market_performance',
    pageNumber: 3,
    title: '市集表現',
    purpose: '協助判斷哪些市集值得再次參加。',
    rows,
    omittedRowCount: Math.max(0, report.marketDecisions.length - MARKET_ROW_LIMIT),
    emptyMessage: rows.length === 0 ? '此期間沒有可納入結算的已完成市集。' : null,
  };
}

function buildProductPage(report: SettlementReportModel): SettlementReportPdfProductPage {
  const rows = report.productRows.slice(0, PRODUCT_ROW_LIMIT).map((product: SettlementProductRow) => ({
    productId: product.productId,
    productName: product.productName,
    quantityLabel: `${formatNumber(product.quantity)} 件`,
    revenueLabel: formatMoney(product.revenue),
    grossProfitLabel: product.estimatedGrossProfit === null
      ? '毛利資料不足'
      : formatMoney(product.estimatedGrossProfit),
    isProfitDirectional: product.estimatedGrossProfit === null || report.dataQuality.costBasisEstimatedProductIds.includes(product.productId),
  }));

  const dataNeededMessage = rows.length === 0
    ? '此期間沒有可用的商品明細，商品排行與商品建議應標示為資料不足。'
    : report.decision.analysisAvailability.productAnalysis === 'limited'
      ? '商品明細不完整，商品結論僅供方向參考。'
      : null;

  return {
    key: 'product_performance',
    pageNumber: 4,
    title: '商品表現',
    purpose: '只在商品明細足夠時呈現商品層級決策。',
    rows,
    omittedRowCount: Math.max(0, report.productRows.length - PRODUCT_ROW_LIMIT),
    dataNeededMessage,
  };
}

function buildCostProfitPage(report: SettlementReportModel): SettlementReportPdfCostProfitPage {
  const profitAnalysis = report.decision.analysisAvailability.profitAnalysis;

  return {
    key: 'cost_profit_actions',
    pageNumber: 5,
    title: '成本、利潤與下一步行動',
    purpose: '整理成本壓力、利潤可靠度與後續營運建議。',
    metrics: [
      { label: '商品成本', value: formatMoney(report.money.productCost) },
      { label: '固定市集成本', value: formatMoney(report.money.fixedMarketCost) },
      { label: '抽成費', value: formatMoney(report.money.commissionFee) },
      { label: '毛利', value: formatMoney(report.money.grossProfit) },
      { label: '淨利', value: formatMoney(report.money.netProfit) },
    ],
    costCoverageLabel: formatPercent(report.dataQuality.costCoverageRatio),
    profitReliabilityLabel: signalStatusLabel(profitAnalysis),
    actionGroups: [
      { title: '市集決策', actions: report.content.marketActions },
      { title: '商品決策', actions: report.content.productActions },
      { title: '下次補強資料', actions: report.content.dataActions },
    ].filter(group => group.actions.length > 0),
  };
}

export function buildSettlementReportPdfViewModel({
  report,
}: BuildSettlementReportPdfViewModelInput): SettlementReportPdfViewModel {
  const reportType = reportTypeLabel(report.period.kind);

  return {
    version: 1,
    pageSize: 'A4',
    orientation: 'portrait',
    totalPages: 5,
    font: {
      family: 'Noto Sans TC',
      license: 'SIL Open Font License 1.1',
      assetBasePath: '/fonts/report/',
      assetFileName: 'NotoSansTC-VariableFont_wght.ttf',
      assetPath: '/fonts/report/NotoSansTC-VariableFont_wght.ttf',
      format: 'ttf',
      distribution: 'variable',
      weights: ['regular', 'medium', 'bold'],
      source: 'Official Noto / Google Fonts distribution',
      renderSmokeTestRequired: true,
    },
    meta: {
      brandName: report.brandName,
      reportTypeLabel: reportType,
      periodLabel: report.period.label,
      fileNameBase: normalizeFileNamePart(`${report.brandName}-${report.period.label}-${reportType}`),
    },
    pages: [
      buildCoverPage(report),
      buildDataConfidencePage(report),
      buildMarketPage(report),
      buildProductPage(report),
      buildCostProfitPage(report),
    ],
  };
}
