import { hasCapability, type RoleCapabilities } from '@/lib/permissions/role-capabilities';
import type { DailyStats, Market, Product } from '@/types/db';

export type SettlementReportKind = 'weekly' | 'monthly';

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
  notes: string[];
};

export type SettlementReportModel = {
  period: SettlementReportPeriod;
  money: SettlementReportMoneySummary;
  activity: SettlementReportActivitySummary;
  marketRows: SettlementMarketRow[];
  productRows: SettlementProductRow[];
  dataQuality: SettlementReportDataQuality;
};

export type BuildSettlementReportModelInput = {
  capabilities: RoleCapabilities;
  period: SettlementReportPeriod;
  markets: Market[];
  dailyStats: DailyStats[];
  products?: Product[];
};

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function optionalFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

function isMarketOverlappingPeriod(market: Market, period: SettlementReportPeriod): boolean {
  return market.startDate <= period.endDate && market.endDate >= period.startDate;
}

function getMarketId(market: Market): string {
  return market.id ?? '';
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
    notes.push('Some included markets have no daily stats in this period.');
  }

  if (dataQuality.missingProductNames.length > 0) {
    notes.push('Some product rows could not be matched to product names.');
  }

  if (dataQuality.unsyncedMarketIds.length > 0) {
    notes.push('Some included markets are not marked as synced.');
  }

  return notes;
}

export function buildSettlementReportModel({
  capabilities,
  period,
  markets,
  dailyStats,
  products = [],
}: BuildSettlementReportModelInput): SettlementReportModel {
  assertOwnerSettlementReportAllowed(capabilities);

  const marketsInPeriod = markets.filter(isMarket => isMarketOverlappingPeriod(isMarket, period));
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

  const marketsWithoutDailyStats = marketsInPeriod
    .filter(market => !statsByMarketId.has(getMarketId(market)))
    .map(getMarketId)
    .filter(Boolean);
  const unsyncedMarketIds = marketsInPeriod
    .filter(market => market.sync_status !== undefined && market.sync_status !== 'synced')
    .map(getMarketId)
    .filter(Boolean);

  const baseDataQuality = {
    includedDailyStatCount: statsInPeriod.length,
    marketsWithoutDailyStats,
    missingProductNames,
    unsyncedMarketIds,
  };

  const money: SettlementReportMoneySummary = {
    totalRevenue: sumNumbers(marketRows.map(row => row.revenue)),
    productCost: sumNumbers(marketRows.map(row => row.productCost)),
    grossProfit: sumNumbers(marketRows.map(row => row.grossProfit)),
    fixedMarketCost: sumNumbers(marketRows.map(row => row.fixedMarketCost)),
    commissionFee: sumNumbers(marketRows.map(row => row.commissionFee)),
    netProfit: sumNumbers(marketRows.map(row => row.netProfit)),
  };

  const totalDeals = sumNumbers(marketRows.map(row => row.dealCount));

  return {
    period,
    money,
    activity: {
      totalDeals,
      totalInteractions: sumNumbers(marketRows.map(row => row.interactionCount)),
      averageOrderValue: totalDeals > 0 ? money.totalRevenue / totalDeals : 0,
      includedMarketCount: marketsInPeriod.length,
      marketsWithSalesCount: marketRows.filter(row => row.revenue > 0).length,
    },
    marketRows,
    productRows,
    dataQuality: {
      ...baseDataQuality,
      notes: buildDataQualityNotes(baseDataQuality),
    },
  };
}

