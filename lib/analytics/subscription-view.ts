import type { CapabilityAccessDecision } from '@/lib/subscription/subscription-access';

export type AnalyticsRange = 'all' | 'recent3' | 'recent10' | 'single';
export type AnalyticsTab = 'summary' | 'trends' | 'products' | 'advanced';
export type AnalyticsSubscriptionMode = 'blocked' | 'free_preview' | 'basic' | 'full';

type BlockedCapabilityAccessDecision = Extract<CapabilityAccessDecision, { allowed: false }>;

export interface AnalyticsSubscriptionView {
  mode: AnalyticsSubscriptionMode;
  blockDecision: BlockedCapabilityAccessDecision | null;
  previewUpgradeDecision: BlockedCapabilityAccessDecision | null;
  canBuildRecentMarketPreview: boolean;
  canReadSummaryEvents: boolean;
  canComputeMarketMetrics: boolean;
  canComputeMarketRecap: boolean;
  canComputeActionableInsights: boolean;
  canComputeFullMarketTrend: boolean;
  canReadDailyRevenue: boolean;
  canReadBasicProductRanking: boolean;
  canReadFullProductRanking: boolean;
  canReadProductAffinity: boolean;
}

interface ResolveAnalyticsSubscriptionViewInput {
  range: AnalyticsRange;
  tab: AnalyticsTab;
  basicAccess: CapabilityAccessDecision;
  advancedAccess: CapabilityAccessDecision;
}

function blocked(decision: BlockedCapabilityAccessDecision): AnalyticsSubscriptionView {
  return {
    mode: 'blocked',
    blockDecision: decision,
    previewUpgradeDecision: null,
    canBuildRecentMarketPreview: false,
    canReadSummaryEvents: false,
    canComputeMarketMetrics: false,
    canComputeMarketRecap: false,
    canComputeActionableInsights: false,
    canComputeFullMarketTrend: false,
    canReadDailyRevenue: false,
    canReadBasicProductRanking: false,
    canReadFullProductRanking: false,
    canReadProductAffinity: false,
  };
}

function freePreview(decision: BlockedCapabilityAccessDecision): AnalyticsSubscriptionView {
  return {
    mode: 'free_preview',
    blockDecision: null,
    previewUpgradeDecision: decision,
    canBuildRecentMarketPreview: true,
    canReadSummaryEvents: false,
    canComputeMarketMetrics: false,
    canComputeMarketRecap: false,
    canComputeActionableInsights: false,
    canComputeFullMarketTrend: false,
    canReadDailyRevenue: false,
    canReadBasicProductRanking: true,
    canReadFullProductRanking: false,
    canReadProductAffinity: false,
  };
}

function basic(): AnalyticsSubscriptionView {
  return {
    mode: 'basic',
    blockDecision: null,
    previewUpgradeDecision: null,
    canBuildRecentMarketPreview: false,
    canReadSummaryEvents: true,
    canComputeMarketMetrics: true,
    canComputeMarketRecap: true,
    canComputeActionableInsights: false,
    canComputeFullMarketTrend: false,
    canReadDailyRevenue: false,
    canReadBasicProductRanking: true,
    canReadFullProductRanking: false,
    canReadProductAffinity: false,
  };
}

function full(): AnalyticsSubscriptionView {
  return {
    mode: 'full',
    blockDecision: null,
    previewUpgradeDecision: null,
    canBuildRecentMarketPreview: false,
    canReadSummaryEvents: true,
    canComputeMarketMetrics: true,
    canComputeMarketRecap: true,
    canComputeActionableInsights: true,
    canComputeFullMarketTrend: true,
    canReadDailyRevenue: true,
    canReadBasicProductRanking: false,
    canReadFullProductRanking: true,
    canReadProductAffinity: true,
  };
}

export function resolveAnalyticsSubscriptionView(
  input: ResolveAnalyticsSubscriptionViewInput,
): AnalyticsSubscriptionView {
  if (input.range === 'single') {
    if (!input.basicAccess.allowed) return blocked(input.basicAccess);
    if (input.tab === 'advanced' && !input.advancedAccess.allowed) {
      return blocked(input.advancedAccess);
    }
    return input.advancedAccess.allowed ? full() : basic();
  }

  if (input.range === 'recent3' && !input.advancedAccess.allowed) {
    if (input.advancedAccess.reason !== 'plan_required' || input.tab === 'advanced') {
      return blocked(input.advancedAccess);
    }
    return freePreview(input.advancedAccess);
  }

  if (!input.advancedAccess.allowed) return blocked(input.advancedAccess);
  return full();
}
