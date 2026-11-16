import type { DailyStats, Market } from '@/types/db';

export function buildMonthlySalesRecords(
  markets: readonly Market[], stats: readonly DailyStats[], ownerId: string, monthStart: string, today: string,
) {
  const accessible = new Map(markets.flatMap(market => (
    market.id && market.owner_id === ownerId && market.access_type !== 'staff' && !market.isDeleted
      ? [[market.id, market.name] as const] : []
  )));
  const totals = new Map<string, { id: string; name: string; revenue: number; deals: number; latest: string }>();
  let revenue = 0;
  let deals = 0;
  for (const day of stats) {
    if (!day.marketId || day.date < monthStart || day.date > today || (!day.revenue && !day.dealCount)) continue;
    const name = accessible.get(day.marketId);
    if (name === undefined) continue;
    const previous = totals.get(day.marketId);
    totals.set(day.marketId, {
      id: day.marketId, name,
      revenue: (previous?.revenue ?? 0) + day.revenue,
      deals: (previous?.deals ?? 0) + day.dealCount,
      latest: previous && previous.latest > day.date ? previous.latest : day.date,
    });
    revenue += day.revenue;
    deals += day.dealCount;
  }
  return { revenue, deals, markets: [...totals.values()].sort((a, b) => b.latest.localeCompare(a.latest)) };
}

export function selectBasicHistory(markets: readonly Market[], ownerId: string, today: string, search: string) {
  const query = search.trim().toLocaleLowerCase();
  return markets.filter(m => m.owner_id === ownerId && m.access_type !== 'staff' && !m.isDeleted && m.startDate <= today
    && (!query || `${m.name} ${m.location} ${m.startDate}`.toLocaleLowerCase().includes(query)))
    .sort((a,b) => b.startDate.localeCompare(a.startDate));
}
