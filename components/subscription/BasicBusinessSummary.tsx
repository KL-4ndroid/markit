'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { WorkspacePageHeader } from '@/components/layout/WorkspacePageHeader';
import { formatDisplayDate } from '@/lib/presentation/formatters';
import { buildMarketDetailHref } from '@/lib/navigation/market-detail-route';
import { useState } from 'react';
import { SyncStatusIndicator } from '@/components/common/SyncStatusIndicator';
import { selectBasicHistory } from '@/lib/subscription/basic-business-summary';
import { useAuth } from '@/lib/supabase/auth-context';
import { useMarketsQuery } from '@/lib/db/hooks';
import { MonthlySalesRecords } from '@/components/analytics/MonthlySalesRecords';
import { useSyncContext } from '@/lib/sync-context';
import { SyncStatus } from '@/lib/sync/sync-runtime-state';
import { getLocalDateString } from '@/lib/time-utils';
import { formatCurrency } from '@/lib/utils';

export function BasicBusinessSummary() {
  const { user } = useAuth();
  const { markets, isLoading, error } = useMarketsQuery({ ownerId: user?.id });
  const { lastSyncAt, pendingCount, status } = useSyncContext();
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const history = selectBasicHistory(markets, user?.id ?? '', getLocalDateString(), search);
  const isSyncing = pendingCount > 0 || !lastSyncAt || status === SyncStatus.SYNCING || status === SyncStatus.OFFLINE || status === SyncStatus.ERROR;
  return <div className="pb-6">
    <WorkspacePageHeader title="紀錄" eyebrow="每次出攤的成果" icon={BookOpen} action={<SyncStatusIndicator tone="default" />} />
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-5">
    {user?.id ? <MonthlySalesRecords key={user.id} ownerId={user.id} isSyncing={isSyncing} /> : null}
    <label className="block text-sm font-medium">搜尋場次<input type="search" value={search} onChange={event => { setSearch(event.target.value); setVisibleCount(10); }} placeholder="名稱、地點或日期" className="mt-2 min-h-12 w-full rounded-xl border bg-atelier-paper px-3" /></label>
    <section aria-label="歷史場次" className="space-y-3"><h2 className="font-semibold">全部歷史場次</h2>
      {history.slice(0, visibleCount).map(m => <Link key={m.id} href={buildMarketDetailHref(m.id!, { task: 'performance', returnTo: 'records' })} className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-atelier-paper p-4"><span>{m.name}<small className="block text-muted-foreground">{formatDisplayDate(m.startDate)}</small></span><span>{formatCurrency(m.totalRevenue ?? 0)}</span></Link>)}
    {visibleCount < history.length && <button type="button" onClick={() => setVisibleCount(count => count + 10)} className="min-h-11 w-full rounded-xl border border-border px-4 text-sm">顯示更多場次</button>}
    {error || isLoading || history.length === 0 ? <p role="status" className="text-sm text-muted-foreground">{error ?? (isLoading ? '正在讀取歷史場次…' : '沒有符合條件的歷史場次。')}</p> : null}
    </section>
    </div>
  </div>;
}
