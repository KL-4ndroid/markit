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
    brandName: string;
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
      reason: '資料品質有重要警示，或信心度偏低，因此目前不適合作為正式分享版本。',
    };
  }

  if (warningCount > 0 || infoCount > 0 || report.dataQuality.confidence === 'medium') {
    return {
      readiness: 'limited',
      reason: '這份預覽可以參考，但部分結論應視為方向性判斷。',
    };
  }

  return {
    readiness: 'ready',
    reason: '目前未記錄明顯限制，資料信心度足以進行最終檢視。',
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
      brandName: report.brandName,
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
        title: '重點摘要',
        status: report.activity.includedMarketCount > 0 ? 'available' : 'unavailable',
        reason: '使用結算報告的整體判斷與主要數字。',
      },
      {
        key: 'data_quality',
        title: '資料品質與可靠度',
        status: getDataQualityStatus(report),
        reason: '在採信結論前，先顯示信心度、警示與資料補強建議。',
      },
      {
        key: 'score_explanation',
        title: '評分說明',
        status: 'available',
        reason: '使用既有結算報告評分項目。',
      },
      {
        key: 'market_performance',
        title: '市集表現',
        status: report.marketRows.length > 0 ? 'available' : 'unavailable',
        reason: '使用已納入的市集資料與市集層級建議。',
      },
      {
        key: 'product_performance',
        title: '商品表現',
        status: report.decision.analysisAvailability.productAnalysis,
        reason: '只有在商品明細足以支撐結論時，才使用商品表現分析。',
      },
      {
        key: 'cost_and_profit',
        title: '成本與利潤',
        status: report.decision.analysisAvailability.profitAnalysis,
        reason: '使用成本覆蓋程度判斷利潤結論是否可靠。',
      },
      {
        key: 'next_actions',
        title: '下一步行動',
        status: 'available',
        reason: '使用模型整理出的市集、商品與資料補強行動。',
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
