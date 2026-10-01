import type { Market } from '@/types/db';

function amount(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function calculateTrackedMarketFixedCost(market: Market): number {
  const tableRental = market.tableFree ? 0 : amount(market.tableRental);
  const chairRental = market.chairFree ? 0 : amount(market.chairRental);
  const umbrellaRental = market.umbrellaFree ? 0 : amount(market.umbrellaRental);
  const tableclothRental = market.tableclothFree ? 0 : amount(market.tableclothRental);

  return amount(market.registrationFee)
    + amount(market.boothCost)
    + tableRental
    + chairRental
    + umbrellaRental
    + tableclothRental;
}

export function calculateEstimatedMarketNetProfit(market: Market): number {
  const revenue = amount(market.totalRevenue);
  const grossProfit = market.totalProfit == null ? revenue : amount(market.totalProfit);
  const commission = revenue * (amount(market.commissionRate) / 100);

  return grossProfit - calculateTrackedMarketFixedCost(market) - commission;
}
