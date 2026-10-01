import type { Market } from '@/types/db';

export type RecentMarketRevenueDirection = 'up' | 'down' | 'flat' | 'not_enough_data';

export interface RecentMarketRevenuePoint {
  marketId: string;
  marketName: string;
  date: string;
  revenue: number;
}

export interface RecentMarketRevenuePreview {
  direction: RecentMarketRevenueDirection;
  points: RecentMarketRevenuePoint[];
  summary: string;
}

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getMarketDate(market: Market): string {
  if (market.dates?.length) {
    return market.dates.reduce(
      (earliest, date) => date < earliest ? date : earliest,
      market.dates[0],
    );
  }
  return market.startDate;
}

function resolveDirection(points: RecentMarketRevenuePoint[]): RecentMarketRevenueDirection {
  if (points.length < 2) return 'not_enough_data';
  const firstRevenue = points[0].revenue;
  const latestRevenue = points[points.length - 1].revenue;
  const delta = latestRevenue - firstRevenue;
  const threshold = Math.max(100, Math.abs(firstRevenue) * 0.1);

  if (delta > threshold) return 'up';
  if (delta < -threshold) return 'down';
  return 'flat';
}

function buildSummary(
  direction: RecentMarketRevenueDirection,
  points: RecentMarketRevenuePoint[],
): string {
  if (direction === 'not_enough_data') return '至少完成兩場營收紀錄後，才會顯示場次變化。';

  const firstRevenue = Math.round(points[0].revenue).toLocaleString('zh-TW');
  const latestRevenue = Math.round(points[points.length - 1].revenue).toLocaleString('zh-TW');

  if (direction === 'up') return `最近一場營收由 $${firstRevenue} 增加至 $${latestRevenue}。`;
  if (direction === 'down') return `最近一場營收由 $${firstRevenue} 降至 $${latestRevenue}。`;
  return `最近幾場營收大致持平，第一場為 $${firstRevenue}，最近一場為 $${latestRevenue}。`;
}

export function buildRecentMarketRevenuePreview(
  markets: Market[] = [],
): RecentMarketRevenuePreview {
  const points = markets
    .filter(market => market.status !== 'cancelled' && market.isDeleted !== true && Boolean(market.id))
    .map(market => ({
      marketId: market.id as string,
      marketName: market.name,
      date: getMarketDate(market),
      revenue: finiteNumber(market.totalRevenue),
    }))
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-3);
  const direction = resolveDirection(points);

  return {
    direction,
    points,
    summary: buildSummary(direction, points),
  };
}
