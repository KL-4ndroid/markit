import type { Market, MarketStatus } from '@/types/db';
import { calculateEstimatedMarketNetProfit } from '@/lib/analytics/market-financial-summary';
import { formatDisplayDateRange } from '@/lib/presentation/formatters';
import {
  resolveMarketOperatingSession,
  type MarketOperatingSession,
} from '@/lib/markets/market-operating-session';
import { isScheduleOccurrenceVisible } from '@/lib/recurring-operations/occurrence-visibility';

export type MarketListStage = 'active' | 'preparing' | 'ended' | 'cancelled';
export type MarketPreparationFilter = 'all' | 'awaiting_decision' | 'payment_due';
export type MarketPreparationAttention = Exclude<MarketPreparationFilter, 'all'> | null;

export interface MarketEquipmentSummaryItem {
  id: 'table' | 'chair' | 'umbrella';
  label: string;
  status: 'rental' | 'provided' | 'self_supplied';
  amount: number | null;
}

export interface MarketPreparationSummary {
  timeStatus: 'provided' | 'preset' | 'missing';
  checkInTime: string | null;
  operatingStartTime: string | null;
  operatingEndTime: string | null;
  equipment: MarketEquipmentSummaryItem[];
  estimatedExpense: number;
  deposit: number;
}

export interface MarketCompletionSummary {
  totalRevenue: number | null;
  estimatedNetProfit: number | null;
  totalDeals: number | null;
}

export interface MarketListViewItem {
  market: Market;
  stage: MarketListStage;
  preparationAttention: MarketPreparationAttention;
  preparationSummary: MarketPreparationSummary | null;
  completionSummary: MarketCompletionSummary | null;
  stageLabel: string;
  statusLabel: string;
  displayDate: string;
  dateRangeLabel: string;
}

function positiveAmount(value: number | null | undefined): number | null {
  const normalized = finiteAmount(value);
  return normalized > 0 ? normalized : null;
}

function buildCompletionSummary(
  market: Market,
  stage: MarketListStage,
): MarketCompletionSummary | null {
  if (stage !== 'ended') return null;

  const totalRevenue = positiveAmount(market.totalRevenue);
  const totalDeals = positiveAmount(market.totalDeals);
  if (totalRevenue === null && totalDeals === null) return null;

  return {
    totalRevenue,
    estimatedNetProfit: totalRevenue === null ? null : calculateEstimatedMarketNetProfit(market),
    totalDeals,
  };
}

function finiteAmount(value: number | null | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Number(value)) : 0;
}

function equipmentSummaryItem(
  id: MarketEquipmentSummaryItem['id'],
  label: string,
  rental: number | null | undefined,
  isFree: boolean | undefined,
): MarketEquipmentSummaryItem {
  const amount = finiteAmount(rental);
  if (isFree) return { id, label, status: 'provided', amount: null };
  if (amount > 0) return { id, label, status: 'rental', amount };
  return { id, label, status: 'self_supplied', amount: null };
}

function buildPreparationSummary(
  market: Market,
  stage: MarketListStage,
): MarketPreparationSummary | null {
  if (stage !== 'preparing') return null;

  const tableRental = market.tableFree ? 0 : finiteAmount(market.tableRental);
  const chairRental = market.chairFree ? 0 : finiteAmount(market.chairRental);
  const umbrellaRental = market.umbrellaFree ? 0 : finiteAmount(market.umbrellaRental);
  const hasAnyTime = Boolean(
    market.checkInTime || market.operatingStartTime || market.operatingEndTime,
  );
  const usesSingleMarketPreset = market.sessionOrigin !== 'schedule'
    && market.checkInTime === '12:00'
    && market.operatingStartTime === '13:00'
    && market.operatingEndTime === '19:00';

  return {
    timeStatus: usesSingleMarketPreset ? 'preset' : hasAnyTime ? 'provided' : 'missing',
    checkInTime: market.checkInTime || null,
    operatingStartTime: market.operatingStartTime || null,
    operatingEndTime: market.operatingEndTime || null,
    equipment: [
      equipmentSummaryItem('table', '桌', market.tableRental, market.tableFree),
      equipmentSummaryItem('chair', '椅', market.chairRental, market.chairFree),
      equipmentSummaryItem('umbrella', '傘', market.umbrellaRental, market.umbrellaFree),
    ],
    estimatedExpense: finiteAmount(market.registrationFee)
      + finiteAmount(market.boothCost)
      + tableRental
      + chairRental
      + umbrellaRental,
    deposit: finiteAmount(market.deposit),
  };
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

function resolvePreparationAttention(
  market: Market,
  stage: MarketListStage,
): MarketPreparationAttention {
  if (stage !== 'preparing' || market.sessionOrigin === 'schedule') return null;
  if (market.status === 'registered') return 'awaiting_decision';
  if (market.status === 'accepted') return 'payment_due';
  return null;
}

function preparingStatusLabel(market: Market): string {
  if (market.sessionOrigin === 'schedule') return '已排定';
  if (market.status === 'registered') return '已報名 · 等待錄取';
  if (market.status === 'accepted') return '已錄取 · 待繳費';
  return MARKET_STATUS_LABEL[market.status];
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
      preparationAttention: resolvePreparationAttention(market, stage),
      preparationSummary: buildPreparationSummary(market, stage),
      completionSummary: buildCompletionSummary(market, stage),
      stageLabel: STAGE_LABEL[stage],
      statusLabel: stage === 'preparing' ? preparingStatusLabel(market) : STAGE_LABEL[stage],
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

export function getMarketListProgressLabel(item: MarketListViewItem): string {
  if (item.stage === 'active') return '現場記錄中';
  if (item.stage === 'preparing') return '尚未開始';
  if (item.stage === 'cancelled') return '停止作業';

  return item.completionSummary ? '成果已記錄' : '回顧可查看';
}
