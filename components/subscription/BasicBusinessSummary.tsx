'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/layout/WorkspacePageHeader';
import { formatDisplayDate } from '@/lib/presentation/formatters';
import { buildMarketDetailHref } from '@/lib/navigation/market-detail-route';
import { useState } from 'react';
import { SyncStatusIndicator } from '@/components/common/SyncStatusIndicator';
import { buildBasicMonthlyTotals, selectBasicHistory } from '@/lib/subscription/basic-business-summary';
import { useAuth } from '@/lib/supabase/auth-context';
import { useMarketsQuery } from '@/lib/db/hooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { getActiveDealEventsForMarkets } from '@/lib/events/active-event-service';
import { formatCurrency } from '@/lib/utils';

export function BasicBusinessSummary() {
  const { user } = useAuth();
  const { markets } = useMarketsQuery({ ownerId: user?.id });
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const history = selectBasicHistory(markets, user?.id ?? '', `${month}-${String(now.getDate()).padStart(2, '0')}`, search);
  const idsKey = markets.filter(m => m.owner_id === user?.id && !m.isDeleted).flatMap(m => m.id ? [m.id] : []).sort().join('|');
  const summary = useLiveQuery(async () => {
    if (!user?.id || !idsKey) return { income: 0, deals: 0 };
    return buildBasicMonthlyTotals(await getActiveDealEventsForMarkets(idsKey.split('|')), month);
  }, [user?.id, idsKey, month]);
  return <div className="pb-6">
    <WorkspacePageHeader title="營業紀錄" eyebrow="每次出攤的成果" icon={BookOpen} action={<SyncStatusIndicator tone="default" />} />
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-5">
    <section className="rounded-card bg-atelier-paper p-5">
      <h2 className="font-semibold">{now.getFullYear()} 年 {now.getMonth() + 1} 月摘要</h2>
      {summary ? <dl className="mt-4 grid grid-cols-2 gap-4"><div><dt>總收入</dt><dd className="text-2xl font-semibold">{formatCurrency(summary.income)}</dd></div><div><dt>成交筆數</dt><dd className="text-2xl font-semibold">{summary.deals}</dd></div></dl> : <p role="status">正在讀取紀錄…</p>}
    </section>
    <label className="block text-sm font-medium">搜尋場次<input type="search" value={search} onChange={event => { setSearch(event.target.value); setVisibleCount(10); }} placeholder="名稱、地點或日期" className="mt-2 min-h-12 w-full rounded-xl border bg-atelier-paper px-3" /></label>
    <section aria-label="歷史場次" className="space-y-3"><h2 className="font-semibold">全部歷史場次</h2>
      {history.slice(0, visibleCount).map(m => <Link key={m.id} href={buildMarketDetailHref(m.id!, { returnTo: 'records' })} className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-atelier-paper p-4"><span>{m.name}<small className="block text-muted-foreground">{formatDisplayDate(m.startDate)}</small></span><span>{formatCurrency(m.totalRevenue ?? 0)}</span></Link>)}
    {visibleCount < history.length && <button type="button" onClick={() => setVisibleCount(count => count + 10)} className="min-h-11 w-full rounded-xl border border-border px-4 text-sm">顯示更多場次</button>}
    {history.length === 0 && <p className="text-sm text-muted-foreground">沒有符合條件的歷史場次。</p>}
    </section>
    <p className="text-xs text-muted-foreground">摘要依目前已讀取紀錄加總；尚未同步的資料可能影響結果。</p>
    <Link href="/subscription" className="inline-flex min-h-11 items-center text-primary">查看高階分析方案</Link>
    </div>
  </div>;
}
