import {
  finiteInsightNumber,
  isInactiveInsightMarket,
} from '@/lib/analytics/insight-quality';
import { hasCapability, type RoleCapabilities } from '@/lib/permissions/role-capabilities';
import type { SettlementReportPeriod } from '@/lib/reporting/settlement-report';
import type { DailyStats, Market } from '@/types/db';

export type SettlementFreePreviewReadiness = 'empty' | 'needs_attention' | 'ready';

export type SettlementFreePreviewModel = {
  brandName: string;
  period: SettlementReportPeriod;
  includedMarketCount: number;
  marketsWithStatsCount: number;
  totalRevenue: number;
  totalDeals: number;
  readiness: SettlementFreePreviewReadiness;
  dataGuidance: string[];
};

export type BuildSettlementFreePreviewInput = {
  capabilities: RoleCapabilities;
  period: SettlementReportPeriod;
  brandName?: string;
  markets: Market[];
  dailyStats: DailyStats[];
};

function assertOwnerPreviewAllowed(capabilities: RoleCapabilities): void {
  if (
    !hasCapability(capabilities, 'canImportExport') ||
    !hasCapability(capabilities, 'canViewOwnerFinance')
  ) {
    throw new Error('Settlement free preview is owner-only and requires owner finance access');
  }
}

function normalizeBrandName(brandName: string | undefined): string {
  const normalized = typeof brandName === 'string' ? brandName.trim().slice(0, 40) : '';
  return normalized.length > 0 ? normalized : '我的品牌';
}

function overlapsPeriod(market: Market, period: SettlementReportPeriod): boolean {
  return market.startDate <= period.endDate && market.endDate >= period.startDate;
}

export function buildSettlementFreePreview({
  capabilities,
  period,
  brandName,
  markets,
  dailyStats,
}: BuildSettlementFreePreviewInput): SettlementFreePreviewModel {
  assertOwnerPreviewAllowed(capabilities);

  const includedMarkets = markets.filter(market => (
    !isInactiveInsightMarket(market) && overlapsPeriod(market, period)
  ));
  const includedMarketIds = new Set(
    includedMarkets.flatMap(market => market.id ? [market.id] : []),
  );
  const statsInPeriod = dailyStats.filter(stat => (
    Boolean(stat.marketId) &&
    includedMarketIds.has(stat.marketId ?? '') &&
    stat.date >= period.startDate &&
    stat.date <= period.endDate
  ));
  const marketsWithStats = new Set(statsInPeriod.flatMap(stat => stat.marketId ? [stat.marketId] : []));
  const totalRevenue = statsInPeriod.reduce(
    (total, stat) => total + finiteInsightNumber(stat.revenue),
    0,
  );
  const totalDeals = statsInPeriod.reduce(
    (total, stat) => total + finiteInsightNumber(stat.dealCount),
    0,
  );
  const dataGuidance: string[] = [];

  if (includedMarkets.length === 0) {
    dataGuidance.push('這個期間沒有可納入的市集，請先確認日期或市集狀態。');
  } else {
    const missingStatsCount = includedMarkets.length - marketsWithStats.size;
    const salesStats = statsInPeriod.filter(stat => finiteInsightNumber(stat.revenue) > 0);
    const missingCostCount = salesStats.filter(stat => finiteInsightNumber(stat.cost) <= 0).length;
    const missingProductDetailCount = salesStats.filter(stat => (stat.productsSold ?? []).length === 0).length;

    if (missingStatsCount > 0) {
      dataGuidance.push(`${missingStatsCount} 個市集還沒有這段期間的每日或收攤統計。`);
    }
    if (statsInPeriod.length > 0 && totalRevenue <= 0) {
      dataGuidance.push('目前已有統計紀錄，但尚未記錄營收；收攤後可補上總額。');
    }
    if (missingCostCount > 0) {
      dataGuidance.push(`${missingCostCount} 筆有營收的紀錄尚未補上商品成本。`);
    }
    if (missingProductDetailCount > 0) {
      dataGuidance.push(`${missingProductDetailCount} 筆有營收的紀錄尚未包含商品明細。`);
    }
  }

  if (dataGuidance.length === 0) {
    dataGuidance.push('本期基本紀錄已齊全，可繼續累積資料以支援後續決策。');
  }

  return {
    brandName: normalizeBrandName(brandName),
    period,
    includedMarketCount: includedMarkets.length,
    marketsWithStatsCount: marketsWithStats.size,
    totalRevenue,
    totalDeals,
    readiness: includedMarkets.length === 0
      ? 'empty'
      : dataGuidance.length === 1 && dataGuidance[0].startsWith('本期基本紀錄')
        ? 'ready'
        : 'needs_attention',
    dataGuidance,
  };
}
