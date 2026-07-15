import type { Market } from '@/types/db';

export type TodayMarketPhase = 'operating' | 'preparing' | 'ended';
export type TodayFocusState = TodayMarketPhase | 'idle';

export interface TodayMarketViewItem {
  market: Market;
  phase: TodayMarketPhase;
  phaseLabel: string;
}

export interface UpcomingMarketViewItem {
  market: Market;
  nextDate: string;
}

export interface TodayViewModel {
  dateKey: string;
  focusState: TodayFocusState;
  primaryMarket: TodayMarketViewItem | null;
  todayMarkets: TodayMarketViewItem[];
  upcomingMarkets: UpcomingMarketViewItem[];
}

const PHASE_PRIORITY: Record<TodayMarketPhase, number> = {
  operating: 0,
  preparing: 1,
  ended: 2,
};

const PHASE_LABEL: Record<TodayMarketPhase, string> = {
  operating: '營業中',
  preparing: '今日待開場',
  ended: '今日已收班',
};

export function toLocalDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function timeToMinutes(value?: string): number | null {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function marketOccursOnDate(market: Market, dateKey: string): boolean {
  if (market.dates && market.dates.length > 0) {
    return market.dates.includes(dateKey);
  }
  return market.startDate <= dateKey && market.endDate >= dateKey;
}

function resolveTodayMarketPhase(market: Market, nowMinutes: number): TodayMarketPhase {
  if (market.status === 'completed' || market.operationPhase === 'closing') return 'ended';
  if (market.operationPhase === 'operating') return 'operating';

  const startsAt = timeToMinutes(market.operatingStartTime ?? market.startTime);
  const endsAt = timeToMinutes(market.operatingEndTime ?? market.endTime);

  if (endsAt !== null && nowMinutes >= endsAt) return 'ended';
  if (startsAt !== null && nowMinutes >= startsAt && (endsAt === null || nowMinutes < endsAt)) {
    return 'operating';
  }
  return 'preparing';
}

function nextFutureDate(market: Market, dateKey: string): string | null {
  if (market.dates && market.dates.length > 0) {
    return [...market.dates].sort().find(date => date > dateKey) ?? null;
  }
  return market.startDate > dateKey ? market.startDate : null;
}

function marketStartSortValue(market: Market): string {
  return market.operatingStartTime ?? market.startTime ?? '23:59';
}

export function buildTodayViewModel(
  markets: readonly Market[],
  now: Date = new Date(),
): TodayViewModel {
  const dateKey = toLocalDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todayMarkets = markets
    .filter(market => !market.isDeleted && market.status !== 'cancelled')
    .filter(market => marketOccursOnDate(market, dateKey))
    .map(market => {
      const phase = resolveTodayMarketPhase(market, nowMinutes);
      return { market, phase, phaseLabel: PHASE_LABEL[phase] };
    })
    .sort((a, b) => (
      PHASE_PRIORITY[a.phase] - PHASE_PRIORITY[b.phase]
      || marketStartSortValue(a.market).localeCompare(marketStartSortValue(b.market))
    ));

  const todayMarketIds = new Set(todayMarkets.map(item => item.market.id).filter(Boolean));
  const upcomingMarkets = markets
    .filter(market => !market.isDeleted && market.status !== 'cancelled' && market.status !== 'completed')
    .filter(market => !market.id || !todayMarketIds.has(market.id))
    .flatMap(market => {
      const nextDate = nextFutureDate(market, dateKey);
      return nextDate ? [{ market, nextDate }] : [];
    })
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  const primaryMarket = todayMarkets[0] ?? null;

  return {
    dateKey,
    focusState: primaryMarket?.phase ?? 'idle',
    primaryMarket,
    todayMarkets,
    upcomingMarkets,
  };
}

export function getTodayMarketActionLabel(phase: TodayMarketPhase, isStaff: boolean): string {
  if (phase === 'operating') return isStaff ? '開始交易' : '進入現場';
  if (phase === 'ended') return isStaff ? '查看今日紀錄' : '查看今日回顧';
  return isStaff ? '查看今日工作' : '查看開場準備';
}
