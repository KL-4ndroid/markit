'use client';

import { CalendarDays, ChevronDown, ChevronRight } from 'lucide-react';
import { getMarketRegistrationLabel, type SameDayArrangement } from '@/lib/markets/market-planning-view-model';
import { formatDisplayDate } from '@/lib/presentation/formatters';
import type { Market } from '@/types/db';

interface SameDayMarketArrangementsProps {
  arrangements: SameDayArrangement[];
  onOpenMarket: (market: Market) => void;
}

export function SameDayMarketArrangements({ arrangements, onOpenMarket }: SameDayMarketArrangementsProps) {
  const nearest = arrangements[0];
  if (!nearest) return null;

  return (
    <section className="mt-6" aria-labelledby="same-day-arrangements-title">
      <details className="group overflow-hidden rounded-card border border-atelier-line bg-atelier-paper">
        <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 rounded-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
          <CalendarDays className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span id="same-day-arrangements-title" className="block text-sm font-semibold text-foreground">同日多場安排</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">最近 {formatDisplayDate(nearest.date)} 有 {nearest.markets.length} 場</span>
          </span>
          <span className="shrink-0 text-xs text-primary"><span className="group-open:hidden">展開</span><span className="hidden group-open:inline">收合</span></span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="px-4 pb-4">
          <p className="text-xs leading-5 text-muted-foreground">可能是候補或團隊分攤，請確認錄取進度、時間與人手即可。</p>
          <ul className="mt-3 space-y-4">
            {arrangements.map(arrangement => (
              <li key={arrangement.date}>
                <p className="text-xs font-semibold text-foreground">{formatDisplayDate(arrangement.date)}</p>
                <ul className="mt-1">
                  {arrangement.markets.map(market => (
                    <li key={market.id ?? market.name}>
                      <button type="button" disabled={!market.id} onClick={() => onOpenMarket(market)} className="flex min-h-14 w-full items-center gap-2 rounded-control py-2 text-left hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary">
                        <span className="min-w-0 flex-1"><span className="block break-words text-sm text-primary">{market.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{getMarketRegistrationLabel(market)}</span></span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  );
}
