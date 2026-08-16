import type { CapabilityAccessDecision } from '@/lib/subscription/subscription-access';

export const SETTLEMENT_PDF_RUNTIME_ENABLED = true;

type BlockedCapabilityAccessDecision = Extract<CapabilityAccessDecision, { allowed: false }>;

export type SettlementReportSubscriptionMode = 'blocked' | 'free_preview' | 'full';

export type SettlementReportSubscriptionView = {
  mode: SettlementReportSubscriptionMode;
  blockDecision: BlockedCapabilityAccessDecision | null;
  previewUpgradeDecision: BlockedCapabilityAccessDecision | null;
  pdfDecision: CapabilityAccessDecision;
  canReadMarkets: boolean;
  canReadDailyStats: boolean;
  canReadProducts: boolean;
  canBuildFreePreview: boolean;
  canBuildFullReport: boolean;
  canBuildPdfViewModel: boolean;
};

export type ResolveSettlementReportSubscriptionViewInput = {
  reportAccess: CapabilityAccessDecision;
  pdfAccess: CapabilityAccessDecision;
  pdfRuntimeEnabled?: boolean;
};

const PDF_RUNTIME_DISABLED_DECISION: BlockedCapabilityAccessDecision = {
  allowed: false,
  reason: 'runtime_disabled',
};

function blocked(
  decision: BlockedCapabilityAccessDecision,
  pdfDecision: CapabilityAccessDecision,
): SettlementReportSubscriptionView {
  return {
    mode: 'blocked',
    blockDecision: decision,
    previewUpgradeDecision: null,
    pdfDecision,
    canReadMarkets: false,
    canReadDailyStats: false,
    canReadProducts: false,
    canBuildFreePreview: false,
    canBuildFullReport: false,
    canBuildPdfViewModel: false,
  };
}

export function resolveSettlementReportSubscriptionView({
  reportAccess,
  pdfAccess,
  pdfRuntimeEnabled = SETTLEMENT_PDF_RUNTIME_ENABLED,
}: ResolveSettlementReportSubscriptionViewInput): SettlementReportSubscriptionView {
  const effectivePdfDecision = pdfRuntimeEnabled ? pdfAccess : PDF_RUNTIME_DISABLED_DECISION;

  if (!reportAccess.allowed) {
    if (reportAccess.reason !== 'plan_required') {
      return blocked(reportAccess, effectivePdfDecision);
    }

    return {
      mode: 'free_preview',
      blockDecision: null,
      previewUpgradeDecision: reportAccess,
      pdfDecision: effectivePdfDecision,
      canReadMarkets: true,
      canReadDailyStats: true,
      canReadProducts: false,
      canBuildFreePreview: true,
      canBuildFullReport: false,
      canBuildPdfViewModel: false,
    };
  }

  return {
    mode: 'full',
    blockDecision: null,
    previewUpgradeDecision: null,
    pdfDecision: effectivePdfDecision,
    canReadMarkets: true,
    canReadDailyStats: true,
    canReadProducts: true,
    canBuildFreePreview: false,
    canBuildFullReport: true,
    canBuildPdfViewModel: pdfRuntimeEnabled && effectivePdfDecision.allowed,
  };
}
