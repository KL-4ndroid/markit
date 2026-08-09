'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowRight,
  CalendarDays,
  Camera,
  ChevronRight,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { TodayMarketCard, todayMarketPhaseClasses } from '@/components/home/TodayMarketCard';
import { StaffBadge } from '@/components/staff/StaffBadge';
import { Button } from '@/components/ui/Button';
import { StateView } from '@/components/ui/StateView';
import { SyncStatus } from '@/hooks/useSync';
import { useRoleContext } from '@/lib/role-context';
import { db } from '@/lib/db';
import { useMarkets } from '@/lib/db/hooks';
import {
  buildTodayViewModel,
} from '@/lib/home/today-view-model';
import {
  OWNER_BRAND_NAME_UPDATED_EVENT,
  loadOwnerBrandName,
  readCachedOwnerBrandName,
} from '@/lib/owner-brand';
import { useSyncContext } from '@/lib/sync-context';
import { useAuth } from '@/lib/supabase/auth-context';
import { buildMarketDetailHref } from '@/lib/navigation/market-detail-route';

const DASHBOARD_ROLE_NOT_READY_OWNER_ID = '__role_not_ready__';

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 11) return '早安，慢慢準備好今天';
  if (hour < 17) return '午安，現場辛苦了';
  return '晚安，今天也辛苦了';
}

function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(year, month - 1, day));
}

interface TaskRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onClick?: () => void;
  tone?: 'sage' | 'apricot' | 'blue' | 'rose';
}

const TASK_TONE_CLASSES = {
  sage: 'bg-atelier-sage-soft text-primary',
  apricot: 'bg-atelier-apricot-soft text-atelier-clay',
  blue: 'bg-atelier-blue-soft text-atelier-blue',
  rose: 'bg-atelier-rose-soft text-atelier-rose',
} as const;

function TaskRow({ icon, title, description, actionLabel, onClick, tone = 'sage' }: TaskRowProps) {
  const content = (
    <>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control ${TASK_TONE_CLASSES[tone]}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      {actionLabel && <span className="text-xs font-semibold text-atelier-clay">{actionLabel}</span>}
      {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );

  if (!onClick) {
    return <div className="flex min-h-16 items-center gap-3 rounded-card bg-atelier-paper px-3 py-3 shadow-atelier">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 rounded-card bg-atelier-paper px-3 py-3 shadow-atelier outline-none transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-atelier-lift focus-visible:ring-2 focus-visible:ring-primary"
    >
      {content}
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { userRole, isStaff } = useRoleContext();
  const { status, pendingCount, sync } = useSyncContext();
  const [now, setNow] = useState(() => new Date());
  const [ownerBrandName, setOwnerBrandName] = useState('Féria - 出攤筆記');

  const currentOwnerId = isStaff ? userRole.ownerId : user?.id;
  const scopedOwnerId = currentOwnerId ?? DASHBOARD_ROLE_NOT_READY_OWNER_ID;
  const allMarkets = useMarkets({
    orderBy: 'startDate',
    order: 'asc',
    ownerId: scopedOwnerId,
  });

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    const intervalId = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || isStaff) {
      setOwnerBrandName('Féria - 出攤筆記');
      return;
    }

    const cached = readCachedOwnerBrandName(user.id);
    if (cached) setOwnerBrandName(cached);

    loadOwnerBrandName(user.id)
      .then(brandName => {
        if (!cancelled) setOwnerBrandName(brandName);
      })
      .catch(error => {
        console.error('載入首頁品牌名稱失敗:', error);
      });

    const handleBrandNameUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerId?: string; brandName?: string }>).detail;
      if (detail?.ownerId === user.id && detail.brandName) setOwnerBrandName(detail.brandName);
    };

    window.addEventListener(OWNER_BRAND_NAME_UPDATED_EVENT, handleBrandNameUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener(OWNER_BRAND_NAME_UPDATED_EVENT, handleBrandNameUpdated);
    };
  }, [isStaff, user?.id]);

  const todayView = useMemo(() => buildTodayViewModel(allMarkets, now), [allMarkets, now]);
  const todayMarketIds = useMemo(
    () => todayView.todayMarkets.flatMap(item => item.market.id ? [item.market.id] : []),
    [todayView.todayMarkets],
  );
  const todayMarketIdsKey = todayMarketIds.join('|');
  const pendingPhotoItems = useLiveQuery(async () => {
    if (!todayMarketIdsKey) return [];
    const rows = await db.salesPhotoEvidencePendingCreations
      .where('marketId')
      .anyOf(todayMarketIds)
      .toArray();
    return rows.filter(item => item.status !== 'created');
  }, [todayMarketIdsKey], []);

  const openMarket = (marketId?: string, task?: 'pending-photos') => {
    if (!marketId) return;
    router.push(buildMarketDetailHref(marketId, { task }));
  };

  const pendingPhotoMarketId = pendingPhotoItems[0]?.marketId;
  const showSyncTask = status === SyncStatus.ERROR
    || status === SyncStatus.OFFLINE
    || (pendingCount > 0 && status !== SyncStatus.SYNCING);
  const staffWorkspaceName = userRole.ownerEmail
    ? `${userRole.ownerEmail.split('@')[0]} 團隊`
    : '團隊工作區';
  const greeting = getGreeting(now);

  return (
    <div className="min-h-screen bg-atelier-canvas/80 text-atelier-ink">
      <header className="japanese-warm-header overflow-hidden rounded-b-[2rem] px-5 pb-6 pt-[calc(1.25rem+env(safe-area-inset-top))] text-white shadow-atelier-lift">
        <div className="mx-auto max-w-3xl">
          <div className="min-w-0">
            {isStaff ? (
              <p className="truncate text-xs font-semibold text-white/90">{staffWorkspaceName}</p>
            ) : (
              <p className="truncate text-xs font-semibold text-white/90">{ownerBrandName}</p>
            )}
          </div>

          <div className="mt-5 min-w-0">
            <h1 className="text-[1.65rem] font-semibold leading-tight text-white">{greeting}</h1>
            <p className="mt-2 text-sm text-white/80">{formatDateLabel(now)}</p>
            {isStaff && <div className="mt-3"><StaffBadge tone="default" /></div>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-8 pt-7 sm:px-6">
        <section aria-labelledby="today-focus-title">
          <div className="mb-4">
            <div>
            <p className="text-xs font-semibold text-atelier-clay">現在</p>
            <h2 id="today-focus-title" className="mt-1 text-lg font-semibold text-atelier-ink">
              {isStaff ? '你的今日工作' : '今天的營運重點'}
            </h2>
            </div>
          </div>

          {todayView.primaryMarket ? (
            <TodayMarketCard
              item={todayView.primaryMarket}
              isStaff={isStaff}
              onOpen={() => openMarket(todayView.primaryMarket?.market.id)}
            />
          ) : (
            <StateView
              icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
              title="今天沒有排定市集"
              description={todayView.upcomingMarkets[0]
                ? `下一場是 ${formatDateKey(todayView.upcomingMarkets[0].nextDate)}的「${todayView.upcomingMarkets[0].market.name}」。`
                : isStaff
                  ? '目前沒有可執行的市集工作。'
                  : '可先建立下一場市集，或整理商品與備貨。'}
              action={(
                <Button variant="secondary" onClick={() => router.push('/markets')}>
                  {isStaff ? '查看可用市集' : '查看市集安排'}
                </Button>
              )}
            />
          )}
        </section>

        {(pendingPhotoItems.length > 0 || showSyncTask) && (
          <section className="mt-8" aria-labelledby="today-tasks-title">
            <div className="flex items-center gap-3">
              <h2 id="today-tasks-title" className="text-base font-semibold text-atelier-ink">待處理</h2>
            </div>
            <div className="mt-3 space-y-2">
              {pendingPhotoItems.length > 0 && (
                <TaskRow
                  icon={<Camera className="h-5 w-5" aria-hidden="true" />}
                  title={`待補照片 ${pendingPhotoItems.length} 筆`}
                  description="完成今日尚未上傳的成交照片"
                  actionLabel="處理"
                  tone="rose"
                  onClick={() => openMarket(pendingPhotoMarketId, 'pending-photos')}
                />
              )}
              {showSyncTask && (
                <TaskRow
                  icon={status === SyncStatus.OFFLINE
                    ? <WifiOff className="h-5 w-5" aria-hidden="true" />
                    : <RefreshCw className="h-5 w-5" aria-hidden="true" />}
                  title={status === SyncStatus.OFFLINE ? '目前離線' : status === SyncStatus.ERROR ? '同步需要重試' : `${pendingCount} 筆資料待同步`}
                  description={status === SyncStatus.OFFLINE ? '操作會先安全保存在這台裝置' : '本機資料仍在，可重新嘗試同步'}
                  actionLabel={status === SyncStatus.OFFLINE ? undefined : '重試'}
                  tone="blue"
                  onClick={status === SyncStatus.OFFLINE ? undefined : () => void sync()}
                />
              )}
            </div>
          </section>
        )}

        {todayView.todayMarkets.length > 1 && (
          <section className="mt-8" aria-labelledby="other-today-title">
            <h2 id="other-today-title" className="text-base font-semibold text-atelier-ink">今日其他場次</h2>
            <div className="mt-3 space-y-2">
              {todayView.todayMarkets.slice(1).map(item => (
                <button
                  key={item.market.id ?? item.market.name}
                  type="button"
                  onClick={() => openMarket(item.market.id)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-card bg-atelier-paper px-3 py-3 text-left shadow-atelier transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-atelier-lift focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${todayMarketPhaseClasses(item.phase)}`}>
                    {item.phaseLabel}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.market.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="-mx-4 mt-9 bg-upcoming-section px-4 py-6 sm:-mx-6 sm:px-6" aria-labelledby="upcoming-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-atelier-blue">接下來</p>
              <h2 id="upcoming-title" className="mt-1 text-lg font-semibold text-atelier-ink">近期市集</h2>
            </div>
            <button
              type="button"
              onClick={() => router.push('/markets')}
              className="flex min-h-11 items-center gap-1 rounded-control px-2 text-sm font-medium text-primary hover:bg-atelier-paper/80 focus-visible:ring-2 focus-visible:ring-primary"
            >
              查看全部
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {todayView.upcomingMarkets.length > 0 ? (
            <div className="mt-3 space-y-2">
              {todayView.upcomingMarkets.slice(0, 3).map(item => (
                <button
                  key={item.market.id ?? `${item.market.name}-${item.nextDate}`}
                  type="button"
                  onClick={() => openMarket(item.market.id)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-card bg-atelier-paper/90 px-3 py-3 text-left shadow-sm transition-colors hover:bg-atelier-paper focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex h-11 min-w-14 shrink-0 items-center justify-center rounded-control bg-upcoming-date-badge px-2 text-xs font-semibold text-atelier-blue">
                    {formatDateKey(item.nextDate)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{item.market.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.market.location || '尚未設定地點'}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 py-4 text-sm text-muted-foreground">目前沒有即將到來的市集。</p>
          )}
        </section>
      </div>
    </div>
  );
}
