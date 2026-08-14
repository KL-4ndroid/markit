import { CalendarDays, MapPin, Store } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import {
  getMarketListActionLabel,
  getMarketListProgressLabel,
  type MarketListStage,
  type MarketListViewItem,
} from '@/lib/markets/market-list-view-model';

function stageClasses(stage: MarketListStage): string {
  if (stage === 'active') return 'bg-status-good-bg text-status-good-text';
  if (stage === 'preparing') return 'bg-status-warn-bg text-status-warn-text';
  if (stage === 'cancelled') return 'bg-status-danger-bg text-status-danger-text';
  return 'bg-muted text-muted-foreground';
}

interface MarketListCardProps {
  item: MarketListViewItem;
  isStaff: boolean;
  contextLabel?: string;
  isOpening?: boolean;
  onOpen: () => void;
}

export function MarketListCard({ item, isStaff, contextLabel, isOpening = false, onOpen }: MarketListCardProps) {
  return (
    <article className="rounded-card border border-primary/10 bg-atelier-paper p-4 shadow-atelier transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-atelier-lift sm:p-5 xl:grid xl:grid-cols-[minmax(14rem,1.35fr)_minmax(10rem,.85fr)_minmax(10rem,1fr)_minmax(7rem,.65fr)_auto] xl:items-center xl:gap-4 xl:px-5 xl:py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stageClasses(item.stage)}`}>
              {item.statusLabel}
            </span>
            {contextLabel ? (
              <span className="inline-flex rounded-full bg-atelier-blue-soft px-2.5 py-1 text-xs font-medium text-atelier-blue">
                {contextLabel}
              </span>
            ) : null}
            {item.market.sessionOrigin === 'schedule' ? (
              <span className="inline-flex rounded-full bg-atelier-paper px-2.5 py-1 text-xs font-medium text-atelier-muted ring-1 ring-primary/10">
                固定
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 break-words text-base font-semibold text-foreground sm:text-lg">
            {item.market.name}
          </h2>
        </div>
        <Store className="h-5 w-5 shrink-0 text-primary xl:hidden" aria-hidden="true" />
      </div>

      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:contents">
        <p className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{item.dateRangeLabel}</span>
        </p>
        <p className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.market.location || '尚未設定地點'}</span>
        </p>
      </div>

      <p className="mt-3 hidden text-sm font-medium text-foreground xl:block">
        {getMarketListProgressLabel(item)}
      </p>

      <div className="mt-4 flex justify-end xl:mt-0">
        <Button
          variant={item.stage === 'active' ? 'primary' : 'secondary'}
          onClick={onOpen}
          disabled={isOpening}
          aria-busy={isOpening}
          className="w-full whitespace-nowrap sm:w-auto"
        >
          {isOpening ? '開啟中...' : getMarketListActionLabel(item.stage, isStaff)}
        </Button>
      </div>
    </article>
  );
}
