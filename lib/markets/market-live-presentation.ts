import type { Market } from '@/types/db';
import type { MarketOperatingSessionPhase, MarketOperatingWorkspacePhase } from './market-operating-session';
import { marketBusinessDates } from './market-business-dates';

export type MarketLiveStage = 'preparing' | 'operating' | 'closed';
export type MarketLiveSection = 'activity' | 'timeline' | 'fieldwork' | 'cash';

/** Presentation consumes the canonical session; it never opens sales. */
export function getMarketLiveStage(
  phase: MarketOperatingSessionPhase | undefined,
  workspacePhase: MarketOperatingWorkspacePhase,
): MarketLiveStage {
  if (phase === 'closed' || phase === 'ended' || workspacePhase === 'ended') return 'closed';
  return workspacePhase === 'operating' ? 'operating' : 'preparing';
}

export function getMarketLiveSectionOrder(stage: MarketLiveStage): readonly MarketLiveSection[] {
  if (stage === 'preparing') return ['timeline', 'fieldwork', 'cash'];
  if (stage === 'closed') return ['cash', 'fieldwork', 'timeline'];
  return ['activity', 'fieldwork', 'cash', 'timeline'];
}

/** Select an existing, non-future business date for the existing backfill dialog. */
export function getMarketLiveBackfillDate(
  market: Pick<Market, 'dates' | 'startDate' | 'endDate'>,
  sessionDate: string | null | undefined,
  today: string,
): string | null {
  const dates = marketBusinessDates(market).filter(date => date <= today);
  return sessionDate && dates.includes(sessionDate) ? sessionDate : dates.at(-1) ?? null;
}
