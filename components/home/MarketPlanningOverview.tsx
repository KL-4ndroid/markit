'use client';

import { ChevronRight, Clock, Wallet } from 'lucide-react';
import type { MarketPlanningViewModel } from '@/lib/markets/market-planning-view-model';
import type { MarketPreparationFilter } from '@/lib/markets/market-list-view-model';
import { paymentReminderSummary } from '@/lib/markets/market-payment-deadline';

interface MarketPlanningOverviewProps {
  planning: MarketPlanningViewModel;
  onOpenProgress: (filter: MarketPreparationFilter) => void;
}

export function MarketPlanningOverview({ planning, onOpenProgress }: MarketPlanningOverviewProps) {
  const deadlineSummary = paymentReminderSummary(planning.paymentDue.map(item => item.paymentReminder));
  const progress = [
    { id: 'payment_due' as const, label: '待繳費', items: planning.paymentDue, icon: Wallet, tone: 'bg-status-warn-bg text-status-warn-text' },
    { id: 'awaiting_decision' as const, label: '待錄取', items: planning.awaitingDecision, icon: Clock, tone: 'bg-atelier-paper text-foreground' },
  ];

  const hasPendingRegistration = progress.some(group => group.items.length > 0);

  return (
    <section className="mt-6" aria-labelledby="market-planning-title">
      <h2 id="market-planning-title" className="text-base font-semibold text-atelier-ink">報名與出攤準備</h2>
      {hasPendingRegistration ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {progress.map(group => (
            <button
              key={group.id}
              type="button"
              disabled={group.items.length === 0}
              aria-label={`${group.label} ${group.items.length} 場${group.items.length > 0 ? '，查看市集清單' : '，目前無待辦'}`}
              aria-describedby={group.id === 'payment_due' && deadlineSummary ? 'payment-deadline-summary' : undefined}
              onClick={() => onOpenProgress(group.id)}
              className={`flex min-h-28 min-w-0 flex-col justify-between gap-3 rounded-card border border-primary/10 p-4 text-left shadow-atelier transition-shadow enabled:hover:shadow-atelier-lift disabled:bg-atelier-paper disabled:text-muted-foreground disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${group.items.length > 0 ? group.tone : ''}`}
            >
              <span className="flex items-center gap-2 text-sm font-medium"><group.icon className="h-4 w-4 shrink-0" aria-hidden="true" />{group.label}</span>
              <span className="flex w-full items-center gap-1.5">
                <span className="break-all text-3xl font-semibold leading-none tabular-nums">{group.items.length}</span>
                <span className="shrink-0 text-sm">場</span>
                {group.items.length > 0 && <ChevronRight className="ml-auto h-4 w-4 shrink-0" aria-hidden="true" />}
              </span>
              {group.id === 'payment_due' && deadlineSummary ? (
                <span id="payment-deadline-summary" className="text-xs leading-5">{deadlineSummary}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">目前沒有待處理報名</p>
      )}
    </section>
  );
}
