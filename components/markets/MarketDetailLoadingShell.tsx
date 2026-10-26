import { CalendarDays, MapPin, Store } from 'lucide-react';
import { MarketReturnLink } from '@/components/markets/MarketReturnLink';

import type { MarketDetailTransitionSnapshot } from '@/lib/navigation/market-detail-transition';

interface MarketDetailLoadingShellProps {
  snapshot?: MarketDetailTransitionSnapshot | null;
  returnTo?: string | null;
}

function LoadingBar({ className }: { className: string }) {
  return <div className={`rounded bg-muted skeleton-shimmer ${className}`} aria-hidden="true" />;
}

export function MarketDetailLoadingShell({ snapshot, returnTo }: MarketDetailLoadingShellProps) {
  return (
    <div className="min-h-screen bg-background pb-24" role="status" aria-label="正在開啟市集" aria-busy="true">
      <div className="japanese-gradient-header rounded-b-[2rem] px-4 pb-7 pt-6 sm:px-6 sm:pt-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start gap-3">
            <MarketReturnLink returnTo={returnTo} />
            <div className="min-w-0 flex-1 pt-0.5">
              {snapshot ? (
                <>
                  <p className="text-xs font-medium text-white/75">一起顧好這場市集</p>
                  <h1 className="mt-0.5 truncate text-xl font-semibold text-white">{snapshot.name}</h1>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                      {snapshot.dateRangeLabel || '日期載入中'}
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{snapshot.location || '地點載入中'}</span>
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="h-3 w-24 rounded bg-white/20 skeleton-shimmer-header" aria-hidden="true" />
                  <div className="h-7 w-40 rounded-lg bg-white/30 skeleton-shimmer-header" aria-hidden="true" />
                  <div className="h-3 w-52 rounded bg-white/20 skeleton-shimmer-header" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-white/90 text-primary shadow-sm" aria-hidden="true">
              <Store className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-3 max-w-3xl px-4 sm:px-6">
        <section className="mt-4 space-y-4 rounded-card bg-atelier-paper p-4" aria-hidden="true">
          <LoadingBar className="h-5 w-28" />
          <LoadingBar className="h-12 w-full" />
          <LoadingBar className="h-4 w-2/3" />
          <LoadingBar className="h-20 w-full" />
        </section>
      </div>
    </div>
  );
}
