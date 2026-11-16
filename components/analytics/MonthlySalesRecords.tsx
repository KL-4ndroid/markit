'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { StateView } from '@/components/ui/StateView';
import { db } from '@/lib/db';
import { buildMonthlySalesRecords } from '@/lib/subscription/basic-business-summary';
import { buildMarketDetailHref } from '@/lib/navigation/market-detail-route';
import { getLocalDateString } from '@/lib/time-utils';
import { formatCurrency } from '@/lib/utils';

export function MonthlySalesRecords({ ownerId, isSyncing }: { ownerId: string; isSyncing: boolean }) {
  const today = getLocalDateString();
  const monthStart = today.slice(0, 8) + '01';
  const result = useLiveQuery(async () => {
    try {
      const summary = await db.transaction('r', db.markets, db.dailyStats, async () => {
        const markets = await db.markets.where('owner_id').equals(ownerId).toArray();
        const marketIds = new Set(markets.map(market => market.id));
        const rows = await db.dailyStats.where('date').between(monthStart, today, true, true)
          .filter(row => Boolean(row.marketId && marketIds.has(row.marketId))).toArray();
        return buildMonthlySalesRecords(markets, rows, ownerId, monthStart, today);
      });
      return { summary, failed: false };
    } catch {
      return { summary: null, failed: true };
    }
  }, [ownerId, monthStart, today]);

  return <>
      {result?.failed ? <StateView title="暫時無法讀取營業紀錄" description="請重新整理後再試。" />
        : !result?.summary ? <StateView title="正在整理本月紀錄" />
        : <>
          <section aria-labelledby="monthly-records-title" className="rounded-card border border-border bg-atelier-paper p-4">
            <h2 id="monthly-records-title" className="font-semibold">本月紀錄</h2>
            <p className="mt-1 text-sm text-muted-foreground">{monthStart.replaceAll('-', '/')} 至 {today.replaceAll('-', '/')}</p>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div><dt className="text-sm text-muted-foreground">已記錄收入</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(result.summary.revenue)}</dd></div>
              <div><dt className="text-sm text-muted-foreground">成交筆數</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{result.summary.deals} 筆</dd></div>
            </dl>
            {isSyncing ? <p className="mt-3 text-sm text-muted-foreground" role="status">目前顯示這台裝置的紀錄，同步後金額可能更新。</p> : null}
          </section>
          <section aria-labelledby="monthly-records-markets" className="rounded-card border border-border bg-atelier-paper p-4">
            <h2 id="monthly-records-markets" className="font-semibold">本月有營業紀錄的場次</h2>
            {result.summary.markets.length ? <ul className="mt-2 divide-y divide-border">
              {result.summary.markets.map(row => <li key={row.id}>
                <Link href={buildMarketDetailHref(row.id, { task: 'performance', returnTo: 'records' })}
                  className="flex min-h-14 items-center gap-3 rounded-control py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <span className="min-w-0 flex-1 break-words text-sm font-medium">{row.name}</span>
                  <span className="shrink-0 text-right text-sm tabular-nums">{formatCurrency(row.revenue)}<span className="block text-xs text-muted-foreground">{row.deals} 筆</span></span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>)}
            </ul> : <p className="mt-2 text-sm text-muted-foreground">本月尚無已記錄的收入或成交。</p>}
          </section>
        </>}
  </>;
}
