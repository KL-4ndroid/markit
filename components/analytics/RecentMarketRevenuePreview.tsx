import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3 } from 'lucide-react';

import type {
  RecentMarketRevenueDirection,
  RecentMarketRevenuePreview as RecentMarketRevenuePreviewModel,
} from '@/lib/analytics/recent-market-revenue-preview';
import { formatDisplayDate } from '@/lib/presentation/formatters';

interface RecentMarketRevenuePreviewProps {
  preview: RecentMarketRevenuePreviewModel;
}

const directionLabels: Record<RecentMarketRevenueDirection, string> = {
  up: '營收上升',
  down: '營收下降',
  flat: '大致持平',
  not_enough_data: '資料不足',
};

function getDirectionIcon(direction: RecentMarketRevenueDirection) {
  if (direction === 'up') return ArrowUpRight;
  if (direction === 'down') return ArrowDownRight;
  return ArrowRight;
}

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString('zh-TW')}`;
}

export function RecentMarketRevenuePreview({ preview }: RecentMarketRevenuePreviewProps) {
  const DirectionIcon = getDirectionIcon(preview.direction);

  return (
    <section className="rounded-card border border-primary/10 bg-white" aria-labelledby="recent-market-preview-title">
      <div className="flex items-start justify-between gap-3 border-b border-primary/10 px-4 py-4">
        <div>
          <p className="text-xs font-medium text-primary">最近 3 場</p>
          <h2 id="recent-market-preview-title" className="mt-1 text-base font-semibold text-foreground">營收比較</h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-soft-green px-3 py-1 text-xs font-medium text-foreground">
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          Free 預覽
        </span>
      </div>

      <div className="flex items-center gap-2 px-4 pt-4 text-sm font-medium text-foreground">
        <DirectionIcon className="h-4 w-4 text-primary" aria-hidden="true" />
        {directionLabels[preview.direction]}
      </div>
      <p className="px-4 pb-4 pt-2 text-sm leading-6 text-muted-foreground">{preview.summary}</p>

      {preview.points.length > 0 && (
        <div className="divide-y divide-primary/10 border-t border-primary/10">
          {preview.points.slice().reverse().map(point => (
            <div key={point.marketId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{point.marketName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDisplayDate(point.date)}</p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatMoney(point.revenue)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
