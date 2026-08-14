import { ArrowRight, Clock3, MapPin, Store } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  getTodayMarketActionLabel,
  type TodayMarketPhase,
  type TodayMarketViewItem,
} from '@/lib/home/today-view-model';
import { formatClockTimeRange } from '@/lib/presentation/formatters';
import type { Market } from '@/types/db';

function marketTimeLabel(market: Market): string | null {
  const start = market.operatingStartTime ?? market.startTime;
  const end = market.operatingEndTime ?? market.endTime;
  return formatClockTimeRange(start, end) || null;
}

export function todayMarketPhaseClasses(phase: TodayMarketPhase): string {
  if (phase === 'operating') return 'bg-primary text-white';
  if (phase === 'ended') return 'bg-atelier-blue-soft text-atelier-blue';
  return 'bg-atelier-apricot-soft text-atelier-clay';
}

interface TodayMarketCardProps {
  item: TodayMarketViewItem;
  isStaff: boolean;
  onOpen: () => void;
  onStart?: () => void;
  isStarting?: boolean;
}

export function TodayMarketCard({ item, isStaff, onOpen, onStart, isStarting = false }: TodayMarketCardProps) {
  const timeLabel = marketTimeLabel(item.market);
  const surfaceClass = item.phase === 'operating'
    ? 'bg-atelier-sage-soft'
    : item.phase === 'ended'
      ? 'bg-home-ended-card'
      : 'bg-atelier-apricot-soft';
  const companionLine = item.phase === 'operating'
    ? '現場辛苦了，今天的每筆記錄都會留在這裡。'
    : item.phase === 'ended'
      ? '今天辛苦了，回顧與待處理都整理好了。'
      : '準備好了，就從這裡進入今天的市集。';

  return (
    <article className={`overflow-hidden rounded-card shadow-atelier-lift ${surfaceClass}`}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${todayMarketPhaseClasses(item.phase)}`}>
              {item.phaseLabel}
            </span>
            {item.market.sessionOrigin === 'schedule' && (
              <span className="ml-2 inline-flex rounded-full bg-white/65 px-2.5 py-1 text-xs font-medium text-atelier-muted">
                固定
              </span>
            )}
            <h2 className="mt-3 break-words text-[1.4rem] font-semibold leading-tight text-atelier-ink">
              {item.market.name}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-atelier-muted">{companionLine}</p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-atelier-paper/80 text-primary shadow-atelier">
            <Store className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-5 grid gap-2.5 text-sm text-atelier-muted sm:grid-cols-2">
          <p className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.market.location || '尚未設定地點'}</span>
          </p>
          {timeLabel && (
            <p className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{timeLabel}</span>
            </p>
          )}
        </div>

        <Button
          onClick={onStart ?? onOpen}
          isLoading={isStarting}
          className="mt-5 min-h-12 w-full bg-primary shadow-atelier hover:bg-primary/90 sm:w-auto"
          leadingIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
        >
          {onStart ? '開始今天營業' : getTodayMarketActionLabel(item.phase, isStaff)}
        </Button>
      </div>
    </article>
  );
}
