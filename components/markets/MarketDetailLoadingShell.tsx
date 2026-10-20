import { ArrowLeft, CalendarDays, MapPin, Store } from 'lucide-react';

import type { MarketDetailTransitionSnapshot } from '@/lib/navigation/market-detail-transition';

interface MarketDetailLoadingShellProps {
  snapshot?: MarketDetailTransitionSnapshot | null;
}

function LoadingBar({ className }: { className: string }) {
  return <div className={`rounded bg-muted skeleton-shimmer ${className}`} aria-hidden="true" />;
}

export function MarketDetailLoadingShell({ snapshot }: MarketDetailLoadingShellProps) {
  return (
    <div className="min-h-screen bg-background pb-24" role="status" aria-label="正在開啟市集" aria-busy="true">
      <div className="japanese-gradient-header rounded-b-[2rem] px-4 pb-7 pt-6 sm:px-6 sm:pt-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-white/90 text-primary shadow-sm" aria-hidden="true">
              <ArrowLeft className="h-5 w-5" />
            </div>
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
        <div className="grid h-14 grid-cols-3 items-center rounded-control bg-atelier-paper p-1 shadow-atelier" aria-hidden="true">
          {['現場', '回顧', '管理'].map((label, index) => (
            <div key={label} className={`flex h-11 items-center justify-center gap-2 rounded-control text-sm font-medium ${index === 0 ? 'bg-primary text-white' : 'text-atelier-muted'}`}>
              {label}
            </div>
          ))}
        </div>

        <section className="mt-4 rounded-card bg-atelier-sage-soft/70 p-4 shadow-atelier" aria-hidden="true">
          <div className="flex items-center justify-between">
            <LoadingBar className="h-4 w-20" />
            <LoadingBar className="h-4 w-24" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[0, 1, 2].map(item => (
              <div key={item} className="space-y-2">
                <LoadingBar className="h-3 w-12" />
                <LoadingBar className="h-7 w-16" />
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 rounded-control bg-atelier-paper p-1 shadow-atelier lg:hidden" aria-hidden="true">
          <div className="flex h-11 items-center justify-center rounded-control bg-primary text-sm font-medium text-white">收款與互動</div>
          <div className="flex h-11 items-center justify-center text-sm font-medium text-atelier-muted">現場工作</div>
        </div>

        <section className="mt-4 overflow-hidden rounded-card bg-atelier-paper shadow-atelier" aria-hidden="true">
          <div className="bg-atelier-apricot-soft/70 p-4">
            <LoadingBar className="h-3 w-16" />
            <LoadingBar className="mt-2 h-6 w-40" />
            <LoadingBar className="mt-2 h-3 w-48" />
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 rounded-control bg-atelier-sage-soft/70 p-1">
              <div className="h-11 rounded-control bg-white" />
              <div className="h-11" />
            </div>
            <LoadingBar className="mt-5 h-3 w-20" />
            <div className="mt-3 h-24 rounded-card bg-atelier-ink/85 skeleton-shimmer-dark" />
          </div>
        </section>
      </div>
    </div>
  );
}
