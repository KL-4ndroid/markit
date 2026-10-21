import type { Market } from '@/types/db';
import { buildMarketListGroups, type MarketListViewItem } from './market-list-view-model';

export interface SameDayArrangement {
  date: string;
  markets: Market[];
}

export interface MarketPlanningViewModel {
  paymentDue: MarketListViewItem[];
  awaitingDecision: MarketListViewItem[];
  sameDayArrangements: SameDayArrangement[];
}

function normalizedSearch(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('zh-TW').trim();
}

export function matchesMarketSearch(market: Market, query: string): boolean {
  const terms = normalizedSearch(query).split(/\s+/).filter(Boolean);
  const text = normalizedSearch(`${market.name} ${market.location ?? ''}`);
  return terms.every(term => text.includes(term));
}

export function getMarketRegistrationLabel(market: Market): string {
  if (market.sessionOrigin === 'schedule') return '固定營業';
  switch (market.status) {
    case 'registered': return '等待錄取';
    case 'accepted': return '待繳費';
    case 'paid': return '已繳費';
    case 'ongoing': return '如期舉行';
    case 'postponed': return '已延期';
    case 'completed': return '已完成';
    case 'cancelled': return '已取消';
  }
}

function validDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function occursOn(market: Market, date: string): boolean {
  return market.dates?.length
    ? market.dates.includes(date)
    : market.startDate <= date && date <= market.endDate;
}

function firstSharedDate(a: Market, b: Market, today: string): string | null {
  const explicitDates = a.dates?.length ? a.dates : b.dates?.length ? b.dates : null;
  if (explicitDates) {
    return [...explicitDates].sort().find(date => (
      validDateKey(date) && date >= today && occursOn(a, date) && occursOn(b, date)
    )) ?? null;
  }
  if (![a.startDate, a.endDate, b.startDate, b.endDate].every(validDateKey)) return null;
  const rangeStart = a.startDate > b.startDate ? a.startDate : b.startDate;
  const first = rangeStart > today ? rangeStart : today;
  const last = a.endDate < b.endDate ? a.endDate : b.endDate;
  return first <= last ? first : null;
}

/** Read-only planning hints. A shared date is a prompt to check staffing, not a booking conflict. */
export function buildMarketPlanningViewModel(
  markets: readonly Market[],
  now: Date = new Date(),
): MarketPlanningViewModel {
  const groups = buildMarketListGroups(markets, now);
  const candidates = [...groups.active, ...groups.preparing]
    .sort((a, b) => a.displayDate.localeCompare(b.displayDate) || a.market.name.localeCompare(b.market.name));
  const manual = groups.preparing.filter(item => item.market.sessionOrigin !== 'schedule');
  const [year, month, day] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const today = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const arranged = candidates.filter(item => item.market.status !== 'postponed');
  const shared = new Map<string, Set<Market>>();
  for (let i = 0; i < arranged.length; i++) {
    for (let j = i + 1; j < arranged.length; j++) {
      const a = arranged[i].market;
      const b = arranged[j].market;
      if (a.id && a.id === b.id) continue;
      const date = firstSharedDate(a, b, today);
      if (!date) continue;
      const entries = shared.get(date) ?? new Set<Market>();
      entries.add(a);
      entries.add(b);
      shared.set(date, entries);
    }
  }
  return {
    paymentDue: manual.filter(item => item.market.status === 'accepted'),
    awaitingDecision: manual.filter(item => item.market.status === 'registered'),
    sameDayArrangements: [...shared.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, entries]) => ({ date, markets: [...entries] })),
  };
}
