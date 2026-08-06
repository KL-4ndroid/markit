import type { Market, MarketStatus } from '@/types/db';
import { formatDisplayDateRange } from '@/lib/presentation/formatters';

export type MarketListStage = 'active' | 'preparing' | 'ended' | 'cancelled';

export interface MarketListViewItem {
  market: Market;
  stage: MarketListStage;
  stageLabel: string;
  statusLabel: string;
  displayDate: string;
  dateRangeLabel: string;
}

export type MarketListGroups = Record<MarketListStage, MarketListViewItem[]>;

const STAGE_LABEL: Record<MarketListStage, string> = {
  active: '進行中',
  preparing: '待準備',
  ended: '已結束',
  cancelled: '已取消',
};

const MARKET_STATUS_LABEL: Record<MarketStatus, string> = {
  registered: '已報名',
  accepted: '已錄取',
  paid: '已繳費',
  ongoing: '如期舉行',
  completed: '已完成',
  postponed: '已延期',
  cancelled: '已取消',
};

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function minutes(value?: string): number | null {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return null;
  const [hours, mins] = value.split(':').map(Number);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return hours * 60 + mins;
}

function sortedDates(market: Market): string[] {
  if (market.dates && market.dates.length > 0) return [...market.dates].sort();
  return [market.startDate, market.endDate].filter(Boolean).sort();
}

export function formatMarketListDateRange(market: Market): string {
  const dates = sortedDates(market);
  const first = dates[0] ?? market.startDate;
  const last = dates[dates.length - 1] ?? market.endDate;
  return formatDisplayDateRange(first, last);
}

function occursToday(market: Market, today: string): boolean {
  if (market.dates && market.dates.length > 0) return market.dates.includes(today);
  return market.startDate <= today && market.endDate >= today;
}

function resolveStage(market: Market, now: Date): MarketListStage {
  if (market.status === 'cancelled') return 'cancelled';
  if (market.status === 'completed' || market.operationPhase === 'closing') return 'ended';

  const today = dateKey(now);
  const dates = sortedDates(market);
  const lastDate = dates[dates.length - 1] ?? market.endDate;
  if (lastDate && lastDate < today) return 'ended';

  if (market.operationPhase === 'operating') return 'active';
  if (!occursToday(market, today)) return 'preparing';

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startsAt = minutes(market.operatingStartTime ?? market.startTime);
  const endsAt = minutes(market.operatingEndTime ?? market.endTime);

  if (endsAt !== null && nowMinutes >= endsAt) return 'ended';
  if (startsAt !== null && nowMinutes >= startsAt && (endsAt === null || nowMinutes < endsAt)) {
    return 'active';
  }
  return 'preparing';
}

function displayDateForStage(market: Market, stage: MarketListStage, today: string): string {
  const dates = sortedDates(market);
  if (stage === 'preparing') return dates.find(date => date >= today) ?? dates[0] ?? market.startDate;
  if (stage === 'active') return today;
  return dates[dates.length - 1] ?? market.endDate;
}

export function buildMarketListGroups(
  markets: readonly Market[],
  now: Date = new Date(),
): MarketListGroups {
  const today = dateKey(now);
  const groups: MarketListGroups = {
    active: [],
    preparing: [],
    ended: [],
    cancelled: [],
  };

  for (const market of markets) {
    if (market.isDeleted) continue;
    const stage = resolveStage(market, now);
    groups[stage].push({
      market,
      stage,
      stageLabel: STAGE_LABEL[stage],
      statusLabel: stage === 'preparing' ? MARKET_STATUS_LABEL[market.status] : STAGE_LABEL[stage],
      displayDate: displayDateForStage(market, stage, today),
      dateRangeLabel: formatMarketListDateRange(market),
    });
  }

  groups.active.sort((a, b) => (
    (a.market.operatingStartTime ?? a.market.startTime ?? '').localeCompare(
      b.market.operatingStartTime ?? b.market.startTime ?? '',
    )
  ));
  groups.preparing.sort((a, b) => a.displayDate.localeCompare(b.displayDate));
  groups.ended.sort((a, b) => b.displayDate.localeCompare(a.displayDate));
  groups.cancelled.sort((a, b) => b.market.updatedAt - a.market.updatedAt);

  return groups;
}

export function getMarketListActionLabel(stage: MarketListStage, isStaff: boolean): string {
  if (stage === 'active') return '繼續現場';
  if (stage === 'preparing') return isStaff ? '查看任務' : '完成設定';
  if (stage === 'ended') return isStaff ? '查看紀錄' : '查看回顧';
  return '查看內容';
}
