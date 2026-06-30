import { hasCapability, type RoleCapabilities } from '@/lib/permissions/role-capabilities';
import type {
  SettlementReportConfidence,
  SettlementReportLimitation,
  SettlementReportModel,
  SettlementReportRecommendation,
  SettlementReportSignalStatus,
} from '@/lib/reporting/settlement-report';

export type SettlementReportPreviewReadiness = 'ready' | 'limited' | 'not_ready';

export type SettlementReportPreviewLimitation = {
  code: string;
  severity: 'info' | 'warning';
  affectedSections: string[];
  message: string;
  recommendation: string;
  placement: 'top' | 'section';
};

export type SettlementReportPreviewSection = {
  key:
    | 'executive_summary'
    | 'data_quality'
    | 'score_explanation'
    | 'market_performance'
    | 'product_performance'
    | 'cost_and_profit'
    | 'next_actions';
  title: string;
  status: SettlementReportSignalStatus;
  reason: string;
};

export type SettlementReportPreviewModel = {
  header: {
    kind: 'weekly' | 'monthly';
    periodLabel: string;
    confidence: SettlementReportConfidence;
    readiness: SettlementReportPreviewReadiness;
    readinessReason: string;
  };
  executiveSummary: {
    totalRevenue: number;
    netProfit: number;
    totalDeals: number;
    averageOrderValue: number;
    overallScore: number;
    grade: string;
    recommendation: SettlementReportRecommendation;
    summary: string;
  };
  reliability: {
    confidence: SettlementReportConfidence;
    warningCount: number;
    infoCount: number;
    limitations: SettlementReportPreviewLimitation[];
  };
  sections: SettlementReportPreviewSection[];
  topWarnings: SettlementReportPreviewLimitation[];
  nextActions: string[];
};

export type BuildSettlementReportPreviewModelInput = {
  capabilities: RoleCapabilities;
  report: SettlementReportModel;
};

function assertOwnerPreviewAllowed(capabilities: RoleCapabilities): void {
  if (
    !hasCapability(capabilities, 'canImportExport') ||
    !hasCapability(capabilities, 'canViewOwnerFinance')
  ) {
    throw new Error('Settlement report preview is owner-only and requires owner finance access');
  }
}

function hasCriticalWarning(limitations: SettlementReportLimitation[]): boolean {
  return limitations.some(limitation => (
    limitation.severity === 'warning' &&
    limitation.affectedSections.some(section => (
      section === 'overall_score' ||
      section === 'market_rejoin' ||
      section === 'profit' ||
      section === 'data_quality'
    ))
  ));
}

function getReadiness(report: SettlementReportModel): {
  readiness: SettlementReportPreviewReadiness;
  reason: string;
} {
  const warningCount = report.dataQuality.limitations.filter(limitation => limitation.severity === 'warning').length;
  const infoCount = report.dataQuality.limitations.filter(limitation => limitation.severity === 'info').length;

  if (hasCriticalWarning(report.dataQuality.limitations) || report.dataQuality.confidence === 'low') {
    return {
      readiness: 'not_ready',
      reason: 'Critical data-quality warnings or low confidence make this preview unsuitable for final sharing.',
    };
  }

  if (warningCount > 0 || infoCount > 0 || report.dataQuality.confidence === 'medium') {
    return {
      readiness: 'limited',
      reason: 'The preview is useful, but some conclusions should be treated as directional.',
    };
  }

  return {
    readiness: 'ready',
    reason: 'The preview has no recorded limitations and enough confidence for final review.',
  };
}

function getDataQualityStatus(report: SettlementReportModel): SettlementReportSignalStatus {
  const readiness = getReadiness(report).readiness;
  if (readiness === 'not_ready') return 'unavailable';
  if (readiness === 'limited') return 'limited';
  return 'available';
}

function buildPreviewLimitations(report: SettlementReportModel): SettlementReportPreviewLimitation[] {
  return report.dataQuality.limitations.map(limitation => ({
    code: limitation.code,
    severity: limitation.severity,
    affectedSections: [...limitation.affectedSections],
    message: limitation.message,
    recommendation: limitation.recommendation,
    placement: limitation.severity === 'warning' ? 'top' : 'section',
  }));
}

function dedupeActions(actions: string[]): string[] {
  return Array.from(new Set(actions.filter(action => action.trim().length > 0)));
}

export function buildSettlementReportPreviewModel({
  capabilities,
  report,
}: BuildSettlementReportPreviewModelInput): SettlementReportPreviewModel {
  assertOwnerPreviewAllowed(capabilities);

  const readiness = getReadiness(report);
  const limitations = buildPreviewLimitations(report);

  return {
    header: {
      kind: report.period.kind,
      periodLabel: report.period.label,
      confidence: report.dataQuality.confidence,
      readiness: readiness.readiness,
      readinessReason: readiness.reason,
    },
    executiveSummary: {
      totalRevenue: report.money.totalRevenue,
      netProfit: report.money.netProfit,
      totalDeals: report.activity.totalDeals,
      averageOrderValue: report.activity.averageOrderValue,
      overallScore: report.decision.overallScore,
      grade: report.decision.grade,
      recommendation: report.decision.recommendation,
      summary: report.decision.summary,
    },
    reliability: {
      confidence: report.dataQuality.confidence,
      warningCount: limitations.filter(limitation => limitation.severity === 'warning').length,
      infoCount: limitations.filter(limitation => limitation.severity === 'info').length,
      limitations,
    },
    sections: [
      {
        key: 'executive_summary',
        title: 'Executive Summary',
        status: report.activity.includedMarketCount > 0 ? 'available' : 'unavailable',
        reason: 'Uses the settlement report decision and headline totals.',
      },
      {
        key: 'data_quality',
        title: 'Data Quality And Reliability',
        status: getDataQualityStatus(report),
        reason: 'Shows confidence, warnings, and next data actions before conclusions are trusted.',
      },
      {
        key: 'score_explanation',
        title: 'Score Explanation',
        status: 'available',
        reason: 'Uses the existing settlement report score components.',
      },
      {
        key: 'market_performance',
        title: 'Market Performance',
        status: report.marketRows.length > 0 ? 'available' : 'unavailable',
        reason: 'Uses included market rows and market-level recommendations.',
      },
      {
        key: 'product_performance',
        title: 'Product Performance',
        status: report.decision.analysisAvailability.productAnalysis,
        reason: 'Uses product rows only when item-level sales support product conclusions.',
      },
      {
        key: 'cost_and_profit',
        title: 'Cost And Profit',
        status: report.decision.analysisAvailability.profitAnalysis,
        reason: 'Uses cost coverage to decide whether profit conclusions are reliable.',
      },
      {
        key: 'next_actions',
        title: 'Next Actions',
        status: 'available',
        reason: 'Uses model-generated market, product, and data-quality actions.',
      },
    ],
    topWarnings: limitations.filter(limitation => limitation.placement === 'top'),
    nextActions: dedupeActions([
      ...report.content.marketActions,
      ...report.content.productActions,
      ...report.content.dataActions,
    ]),
  };
}
