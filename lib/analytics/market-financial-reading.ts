import { deriveRoleCapabilities } from '@/lib/permissions/role-capabilities';
import { buildReadableSettlementReport, type BuildReadableSettlementReportInput } from '@/lib/reporting/settlement-report-reading';
import type { DailyStats, Market } from '@/types/db';

export type MarketFinancialReading = {
  estimatedProfit: number | null;
  status: 'ready' | 'pending' | 'loading';
};
export type MarketFinancialReadings = ReadonlyMap<string, MarketFinancialReading>;

/** Owner presentation only. Uses the report's completeness rules, never aggregate profit as evidence. */
export function buildMarketFinancialReadings(input: {
  markets: readonly Market[];
  dailyStats: readonly DailyStats[];
  asOfDate: string;
  confirmations?: BuildReadableSettlementReportInput['financialConfirmations'];
  loading?: boolean;
}): MarketFinancialReadings {
  const grouped = new Map<string, DailyStats[]>();
  for (const stat of input.dailyStats) {
    if (!stat.marketId) continue;
    const rows = grouped.get(stat.marketId) ?? [];
    rows.push(stat);
    grouped.set(stat.marketId, rows);
  }
  return new Map(input.markets.flatMap(market => {
    if (!market.id || market.isDeleted || market.status === 'cancelled') return [];
    const estimatedProfit = input.loading ? null : buildReadableSettlementReport({
      capabilities: deriveRoleCapabilities({ isOwner: true, staffRole: null }),
      markets: [market],
      dailyStats: grouped.get(market.id) ?? [],
      financialConfirmations: input.confirmations,
      generatedAtDate: input.asOfDate,
      period: { kind: 'monthly', startDate: market.startDate, endDate: market.endDate, label: '整場' },
    }).reading?.estimatedProfit ?? null;
    return [[market.id, {
      estimatedProfit,
      status: input.loading ? 'loading' : estimatedProfit === null ? 'pending' : 'ready',
    } as MarketFinancialReading]];
  }));
}
