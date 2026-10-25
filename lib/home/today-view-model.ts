import type { Market } from '@/types/db';
import { resolveMarketOperatingSession } from '@/lib/markets/market-operating-session';
import { isScheduleOccurrenceVisible } from '@/lib/recurring-operations/occurrence-visibility';

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
  ended: '今日已收攤',
};

export function toLocalDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function marketOccursOnDate(market: Market, dateKey: string): boolean {
  if (market.dates && market.dates.length > 0) {
    return market.dates.includes(dateKey);
  }
  return market.startDate <= dateKey && market.endDate >= dateKey;
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

  const todayMarkets = markets
    .filter(market => !market.isDeleted && market.status !== 'cancelled' && isScheduleOccurrenceVisible(market))
    .filter(market => marketOccursOnDate(market, dateKey))
    .map(market => {
      const session = resolveMarketOperatingSession(market, now);
      const phase: TodayMarketPhase = session.canRecordLiveActivity
        ? 'operating'
        : session.phase === 'closed' || session.workspacePhase === 'ended'
          ? 'ended'
          : 'preparing';
      return {
        market,
        phase,
        phaseLabel: phase === 'ended' && market.status === 'completed' ? '整場已結束'
          : phase === 'preparing' && market.sessionOrigin === 'schedule' ? '固定場次待開始'
          : phase === 'preparing' && market.status === 'registered' ? '等待錄取'
          : phase === 'preparing' && market.status === 'accepted' ? '待繳費'
          : phase === 'preparing' && market.status === 'postponed' ? '已延期'
          : phase === 'preparing' && session.phase === 'unavailable' ? '營業時間待確認'
          : PHASE_LABEL[phase],
      };
    })
    .sort((a, b) => (
      PHASE_PRIORITY[a.phase] - PHASE_PRIORITY[b.phase]
      || (a.phase === 'ended'
        ? (b.market.operatingEndTime ?? b.market.endTime ?? marketStartSortValue(b.market)).localeCompare(a.market.operatingEndTime ?? a.market.endTime ?? marketStartSortValue(a.market))
        : marketStartSortValue(a.market).localeCompare(marketStartSortValue(b.market)))
    ));

  const todayMarketIds = new Set(todayMarkets.map(item => item.market.id).filter(Boolean));
  const upcomingMarkets = markets
    .filter(market => !market.isDeleted && market.status !== 'cancelled' && market.status !== 'completed' && isScheduleOccurrenceVisible(market))
    .filter(market => !market.id || !todayMarketIds.has(market.id))
    .flatMap(market => {
      const nextDate = nextFutureDate(market, dateKey);
      return nextDate ? [{ market, nextDate }] : [];
    })
    .sort((a, b) => (
      a.nextDate.localeCompare(b.nextDate)
      || marketStartSortValue(a.market).localeCompare(marketStartSortValue(b.market))
      || a.market.name.localeCompare(b.market.name)
    ));

  const primaryMarket = todayMarkets[0] ?? null;

  return {
    dateKey,
    focusState: primaryMarket?.phase ?? 'idle',
    primaryMarket,
    todayMarkets,
    upcomingMarkets,
  };
}

/** Every count uses the exact same collection as today's cards. */
export function summarizeTodayMarkets(items: readonly TodayMarketViewItem[]) {
  return {
    total: items.length,
    operating: items.filter(item => item.phase === 'operating').length,
    preparing: items.filter(item => item.phase === 'preparing').length,
    ended: items.filter(item => item.phase === 'ended').length,
  };
}

export function getTodayMarketActionLabel(phase: TodayMarketPhase, isStaff: boolean): string {
  if (phase === 'operating') return isStaff ? '開始交易' : '進入現場';
  if (phase === 'ended') return isStaff ? '查看今日紀錄' : '查看今日回顧';
  return isStaff ? '查看今日工作' : '查看開場準備';
}
