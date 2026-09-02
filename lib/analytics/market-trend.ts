import type { Market } from '@/types/db';

export type MarketTrendDirection = 'improving' | 'declining' | 'flat' | 'not_enough_data';

export interface MarketTrendPoint {
  marketId: string;
  marketName: string;
  date: string;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  fixedCost: number;
  dealCount: number;
}

export interface MarketTrendResult {
  direction: MarketTrendDirection;
  points: MarketTrendPoint[];
  summary: string;
  nextAction: string;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getFixedCost(market: Market): number {
  const tableRental = market.tableFree ? 0 : toNumber(market.tableRental);
  const chairRental = market.chairFree ? 0 : toNumber(market.chairRental);
  const umbrellaRental = market.umbrellaFree ? 0 : toNumber(market.umbrellaRental);
  const tableclothRental = market.tableclothFree ? 0 : toNumber(market.tableclothRental);

  return (
    toNumber(market.registrationFee) +
    toNumber(market.boothCost) +
    tableRental +
    chairRental +
    umbrellaRental +
    tableclothRental
  );
}

function getNetProfit(market: Market): number {
  const revenue = toNumber(market.totalRevenue);
  const grossProfit = toNumber(market.totalProfit);
  const commission = revenue * (toNumber(market.commissionRate) / 100);

  return grossProfit - getFixedCost(market) - commission;
}

function getTrendDate(market: Market): string {
  if (market.dates && market.dates.length > 0) {
    return market.dates.reduce((earliest, date) => (date < earliest ? date : earliest), market.dates[0]);
  }

  return market.startDate;
}

function toPoint(market: Market): MarketTrendPoint | null {
  if (!market.id) return null;

  const revenue = toNumber(market.totalRevenue);
  if (revenue <= 0) return null;

  return {
    marketId: market.id,
    marketName: market.name,
    date: getTrendDate(market),
    revenue,
    grossProfit: toNumber(market.totalProfit),
    netProfit: getNetProfit(market),
    fixedCost: getFixedCost(market),
    dealCount: toNumber(market.totalDeals),
  };
}

function getAverageNetProfit(points: MarketTrendPoint[]): number {
  if (points.length === 0) return 0;
  return points.reduce((total, point) => total + point.netProfit, 0) / points.length;
}

function getDirection(points: MarketTrendPoint[]): MarketTrendDirection {
  if (points.length < 2) return 'not_enough_data';

  const splitIndex = Math.max(1, Math.floor(points.length / 2));
  const previousAverage = getAverageNetProfit(points.slice(0, splitIndex));
  const recentAverage = getAverageNetProfit(points.slice(splitIndex));
  const delta = recentAverage - previousAverage;
  const threshold = Math.max(300, Math.abs(previousAverage) * 0.1);

  if (delta > threshold) return 'improving';
  if (delta < -threshold) return 'declining';
  return 'flat';
}

function buildSummary(direction: MarketTrendDirection, points: MarketTrendPoint[]): string {
  if (direction === 'not_enough_data') {
    return '目前還沒有足夠的已營業市集資料，先累積至少 2 場有收入紀錄的市集。';
  }

  const first = points[0];
  const last = points[points.length - 1];

  if (direction === 'improving') {
    return `最近市集表現正在上升，淨利從 ${Math.round(first.netProfit)} 提升到 ${Math.round(last.netProfit)}。`;
  }

  if (direction === 'declining') {
    return `最近市集表現正在下滑，淨利從 ${Math.round(first.netProfit)} 下降到 ${Math.round(last.netProfit)}。`;
  }

  return '最近幾場市集表現大致持平，適合觀察不同場地費用與客單價差異。';
}

function buildNextAction(direction: MarketTrendDirection): string {
  if (direction === 'improving') {
    return '優先複製最近表現較好的市集條件，例如地點、攤位費區間、商品組合與營業時段。';
  }

  if (direction === 'declining') {
    return '先檢查最近場次的攤位費、交通與租借成本，避免只看營收而忽略固定成本壓力。';
  }

  if (direction === 'flat') {
    return '下一場可以只改一個變因，例如價格、主打商品或陳列方式，讓結果更容易比較。';
  }

  return '先完成每場市集的總收入與主要成本紀錄，分析會先從場次層級提供建議。';
}

export function buildMarketTrend(markets: Market[] = []): MarketTrendResult {
  const points = markets
    .filter((market) => market.status !== 'cancelled' && market.isDeleted !== true)
    .map(toPoint)
    .filter((point): point is MarketTrendPoint => point !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const direction = getDirection(points);

  return {
    direction,
    points,
    summary: buildSummary(direction, points),
    nextAction: buildNextAction(direction),
  };
}
