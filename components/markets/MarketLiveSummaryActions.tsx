'use client';

import type { MarketOperatingSession } from '@/lib/markets/market-operating-session';
import type { MarketLiveStage } from '@/lib/markets/market-live-presentation';
import { MarketOperatingSessionControl } from './MarketOperatingSessionControl';

interface MarketLiveSummaryActionsProps {
  stage: MarketLiveStage;
  session: MarketOperatingSession;
  canManage: boolean;
  isUpdating: boolean;
  onStartEarly: () => Promise<void> | void;
  onCloseToday: () => Promise<void> | void;
  onManage: () => void;
  onReview: () => void;
  onBackfill?: () => void;
}

const actionClass = 'inline-flex min-h-11 items-center justify-center rounded-control border border-primary/20 bg-atelier-paper px-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50';

export function MarketLiveSummaryActions({
  stage, session, canManage, isUpdating, onStartEarly, onCloseToday, onManage, onReview, onBackfill,
}: MarketLiveSummaryActionsProps) {
  if (stage === 'closed') return (
    <div className="flex flex-wrap gap-2">
      {canManage && onBackfill && <button type="button" className={actionClass} onClick={onBackfill}>補登收入</button>}
      <button type="button" className={actionClass} onClick={onReview}>查看回顧</button>
    </div>
  );

  return <>
    <MarketOperatingSessionControl
      session={session}
      canManage={canManage}
      isUpdating={isUpdating}
      showCloseAction
      embedded
      onStartEarly={onStartEarly}
      onCloseToday={onCloseToday}
    />
    {stage === 'preparing' && !session.canStartEarly && (
      <button type="button" className={actionClass} onClick={onManage}>查看市集管理</button>
    )}
  </>;
}
