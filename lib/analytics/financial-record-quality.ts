import type { DailyStats, Market } from '@/types/db';
import { marketBusinessDates } from '@/lib/markets/market-business-dates';

export type AmountKnowledge = 'unknown' | 'recorded' | 'confirmed-zero' | 'invalid';

/** A zero is evidence only after the writer has explicitly distinguished it from an empty field. */
export function classifyFinancialAmount(value: number | undefined | null, confirmedZero = false): AmountKnowledge {
  if (value == null) return 'unknown';
  if (!Number.isFinite(value) || value < 0) return 'invalid';
  return value > 0 ? 'recorded' : confirmedZero ? 'confirmed-zero' : 'unknown';
}

/** Source-bound domain contract. Persistence/authorization belongs to the writer, never the report UI. */
export type FinancialZeroConfirmation = {
  kind: 'zero-income' | 'zero-sales-cost' | 'zero-fixed-fee';
  basis: string;
};

export function dailyFinancialBasis(stat: DailyStats): string {
  return JSON.stringify([stat.marketId, stat.date, stat.revenue, stat.cost, stat.profit, stat.dealCount]);
}

export function marketFeeBasis(market: Market): string {
  return JSON.stringify([market.id, marketBusinessDates(market), market.boothCost ?? 0, market.registrationFee ?? 0,
    market.tableRental ?? 0,market.tableFree === true,market.chairRental ?? 0,market.chairFree === true,
    market.umbrellaRental ?? 0,market.umbrellaFree === true,market.tableclothRental ?? 0,market.tableclothFree === true,market.commissionRate ?? 0]);
}

export function assessDailyFinancialRecord(stat: DailyStats, confirmations: readonly FinancialZeroConfirmation[] = []) {
  const basis = dailyFinancialBasis(stat);
  const confirmed = (kind: FinancialZeroConfirmation['kind']) => confirmations.some(row => row.kind === kind && row.basis === basis);
  const revenueValid = Number.isFinite(stat.revenue) && stat.revenue >= 0
    && Number.isSafeInteger(stat.dealCount) && stat.dealCount >= 0;
  const zeroIncomeConfirmed = confirmed('zero-income') && revenueValid
    && stat.revenue === 0 && stat.dealCount === 0 && stat.cost === 0 && stat.profit === 0;
  const costState = classifyFinancialAmount(stat.cost, confirmed('zero-sales-cost') || zeroIncomeConfirmed);
  const costConsistent = !stat.financialReviewPending && costState !== 'invalid' && Number.isFinite(stat.profit)
    && Math.abs(stat.revenue - stat.cost - stat.profit) < 0.02;
  return { revenueValid, costState, costConsistent, zeroIncomeConfirmed,
    costUsable: revenueValid && costConsistent && (costState === 'recorded' || costState === 'confirmed-zero') };
}

export function assessFixedMarketFee(market: Market, total: number, confirmations: readonly FinancialZeroConfirmation[] = []) {
  const fees = [market.boothCost, market.registrationFee,
    ...(!market.tableFree ? [market.tableRental] : []), ...(!market.chairFree ? [market.chairRental] : []),
    ...(!market.umbrellaFree ? [market.umbrellaRental] : []), ...(!market.tableclothFree ? [market.tableclothRental] : [])];
  if (fees.some(value=>value != null && (!Number.isFinite(value) || value < 0))) return 'invalid';
  const confirmed = confirmations.some(row => row.kind === 'zero-fixed-fee' && row.basis === marketFeeBasis(market));
  return classifyFinancialAmount(total, confirmed);
}
