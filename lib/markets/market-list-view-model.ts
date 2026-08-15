import type { Market, MarketStatus } from '@/types/db';
import { formatDisplayDateRange } from '@/lib/presentation/formatters';
import {
  resolveMarketOperatingSession,
  type MarketOperatingSession,
} from '@/lib/markets/market-operating-session';
import { isScheduleOccurrenceVisible } from '@/lib/recurring-operations/occurrence-visibility';

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

function resolveStage(market: Market, now: Date): MarketListStage {
  if (market.status === 'cancelled') return 'cancelled';
  if (market.status === 'completed') return 'ended';

  const today = dateKey(now);
  const dates = sortedDates(market);
  const lastDate = dates[dates.length - 1] ?? market.endDate;
  if (lastDate && lastDate < today) return 'ended';

  const session = resolveMarketOperatingSession(market, now);
  if (session.workspacePhase === 'operating') return 'active';
  if (session.workspacePhase === 'ended') return 'ended';
  return 'preparing';
}

function displayDateForStage(
  market: Market,
  stage: MarketListStage,
  today: string,
  session: MarketOperatingSession,
): string {
  const dates = sortedDates(market);
  if (stage === 'preparing') {
    if (market.operationPhase === 'closing' && !market.operationSessionDate) {
      return dates.find(date => date > today)
        ?? dates[dates.length - 1]
        ?? market.endDate;
    }
    if (session.phase === 'closed' && session.sessionDate) {
      const closedDate = session.sessionDate;
      return dates.find(date => date > closedDate)
        ?? closedDate;
    }
    if (session.sessionDate && session.sessionDate >= today && dates.includes(session.sessionDate)) {
      return session.sessionDate;
    }
    return dates.find(date => date >= today)
      ?? dates[0]
      ?? market.startDate;
  }
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
    if (market.isDeleted || !isScheduleOccurrenceVisible(market)) continue;
    const session = resolveMarketOperatingSession(market, now);
    const stage = resolveStage(market, now);
    groups[stage].push({
      market,
      stage,
      stageLabel: STAGE_LABEL[stage],
      statusLabel: stage === 'preparing' && market.sessionOrigin === 'schedule'
        ? '已排定'
        : stage === 'preparing'
          ? MARKET_STATUS_LABEL[market.status]
          : STAGE_LABEL[stage],
      displayDate: displayDateForStage(market, stage, today, session),
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
  if (stage === 'preparing') return isStaff ? '查看任務' : '查看準備';
  if (stage === 'ended') return isStaff ? '查看紀錄' : '查看回顧';
  return '查看內容';
}

export function getMarketListProgressLabel(item: MarketListViewItem): string {
  if (item.stage === 'active') return '現場記錄中';
  if (item.stage === 'preparing') return '尚未開始';
  if (item.stage === 'cancelled') return '停止作業';

  const dealCount = item.market.totalDeals ?? 0;
  return dealCount > 0 ? `成交 ${dealCount} 筆` : '回顧可查看';
}
