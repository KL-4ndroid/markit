import { ArrowRight, BadgeDollarSign, Percent, Receipt } from 'lucide-react';

import type { MarketMetricsViewModel } from '@/lib/analytics/market-metrics-view-model';

interface AnalyticsSummaryHighlightsProps {
  viewModel: MarketMetricsViewModel;
}

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString('zh-TW')}`;
}

export function AnalyticsSummaryHighlights({ viewModel }: AnalyticsSummaryHighlightsProps) {
  const topProfit = viewModel.profitableRanking[0];
  const topAov = viewModel.averageOrderValueRanking[0];

  return (
    <section className="rounded-card border border-primary/10 bg-white" aria-labelledby="summary-highlights-title">
      <div className="flex items-center justify-between gap-3 border-b border-primary/10 px-4 py-4">
        <div>
          <p className="text-xs font-medium text-primary">關鍵比較</p>
          <h2 id="summary-highlights-title" className="mt-1 text-base font-semibold text-foreground">目前最值得注意的表現</h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Percent className="h-3.5 w-3.5" aria-hidden="true" />
          轉換 {(viewModel.averageConversionRate * 100).toFixed(1)}%
        </span>
      </div>

      <div className="divide-y divide-primary/10">
        <div className="flex items-center gap-3 px-4 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soft-green text-primary">
            <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">每小時淨利最高</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{topProfit?.market.name ?? '尚無可比較資料'}</p>
          </div>
          {topProfit && (
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(topProfit.metrics.hourlyProfit)}</p>
              <p className="text-xs text-muted-foreground">每小時</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soft-yellow text-secondary">
            <Receipt className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">客單價最高</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground">{topAov?.market.name ?? '尚無成交資料'}</p>
          </div>
          {topAov && (
            <div className="flex shrink-0 items-center gap-2 text-right">
              <p className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(topAov.metrics.aov)}</p>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
