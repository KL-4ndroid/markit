'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowRight,
  CalendarDays,
  Camera,
  ChevronRight,
  Clock3,
  MapPin,
  RefreshCw,
  Settings,
  Store,
  WifiOff,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { SyncStatusIndicator } from '@/components/common/SyncStatusIndicator';
import { StaffBadge } from '@/components/staff/StaffBadge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { StateView } from '@/components/ui/StateView';
import { SyncStatus } from '@/hooks/useSync';
import { useUserRole } from '@/hooks/useUserRole';
import { db } from '@/lib/db';
import { useMarkets } from '@/lib/db/hooks';
import {
  buildTodayViewModel,
  getTodayMarketActionLabel,
  type TodayMarketPhase,
  type TodayMarketViewItem,
} from '@/lib/home/today-view-model';
import {
  OWNER_BRAND_NAME_UPDATED_EVENT,
  loadOwnerBrandName,
  readCachedOwnerBrandName,
} from '@/lib/owner-brand';
import { useSyncContext } from '@/lib/sync-context';
import { useAuth } from '@/lib/supabase/auth-context';
import { getGradientClass } from '@/lib/theme-config';
import type { Market } from '@/types/db';

const DASHBOARD_ROLE_NOT_READY_OWNER_ID = '__role_not_ready__';

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date);
}

function formatDateKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(year, month - 1, day));
}

function marketTimeLabel(market: Market): string | null {
  const start = market.operatingStartTime ?? market.startTime;
  const end = market.operatingEndTime ?? market.endTime;
  if (start && end) return `${start} - ${end}`;
  return start ?? end ?? null;
}

function phaseClasses(phase: TodayMarketPhase): string {
  if (phase === 'operating') return 'bg-status-good-bg text-status-good-text';
  if (phase === 'ended') return 'bg-muted text-muted-foreground';
  return 'bg-status-warn-bg text-status-warn-text';
}

interface TaskRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onClick?: () => void;
}

function TaskRow({ icon, title, description, actionLabel, onClick }: TaskRowProps) {
  const content = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      {actionLabel && <span className="text-xs font-medium text-primary">{actionLabel}</span>}
      {onClick && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </>
  );

  if (!onClick) {
    return <div className="flex min-h-16 items-center gap-3 py-3">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 py-3 outline-none transition-colors hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-primary"
    >
      {content}
    </button>
  );
}

interface TodayMarketCardProps {
  item: TodayMarketViewItem;
  isStaff: boolean;
  onOpen: () => void;
}

function TodayMarketCard({ item, isStaff, onOpen }: TodayMarketCardProps) {
  const timeLabel = marketTimeLabel(item.market);

  return (
    <article className="rounded-card border border-primary/15 bg-white p-5 shadow-sm shadow-primary/5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${phaseClasses(item.phase)}`}>
            {item.phaseLabel}
          </span>
          <h2 className="mt-3 break-words text-xl font-semibold text-foreground">{item.market.name}</h2>
        </div>
        <Store className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
      </div>

      <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
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
        onClick={onOpen}
        className="mt-5 w-full sm:w-auto"
        leadingIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
      >
        {getTodayMarketActionLabel(item.phase, isStaff)}
      </Button>
    </article>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { userRole, isStaff } = useUserRole();
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
    const taskQuery = task ? `?task=${task}` : '';
    router.push(`/markets/${marketId}${taskQuery}`);
  };

  const pendingPhotoMarketId = pendingPhotoItems[0]?.marketId;
  const showSyncTask = status === SyncStatus.ERROR
    || status === SyncStatus.OFFLINE
    || (pendingCount > 0 && status !== SyncStatus.SYNCING);
  const staffWorkspaceName = userRole.ownerEmail
    ? `${userRole.ownerEmail.split('@')[0]} 團隊`
    : '團隊工作區';

  return (
    <div className="min-h-screen bg-background">
      <header className={`${getGradientClass(isStaff)} border-b border-white/15 px-5 pb-7 pt-[calc(1.5rem+env(safe-area-inset-top))] text-white`}>
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
          <div className="min-w-0">
            {isStaff ? (
              <p className="truncate text-sm text-white/80">{staffWorkspaceName}</p>
            ) : (
              <p className="truncate text-sm text-white/80">{ownerBrandName}</p>
            )}
            <h1 className="mt-1 text-2xl font-semibold">今日</h1>
            <p className="mt-1 text-sm text-white/80">{formatDateLabel(now)}</p>
            {isStaff && <div className="mt-3"><StaffBadge /></div>}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <SyncStatusIndicator />
            <IconButton
              label="開啟更多設定"
              tooltip="更多"
              tone="inverse"
              icon={<Settings className="h-5 w-5" aria-hidden="true" />}
              onClick={() => router.push('/settings')}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-6">
        <section aria-labelledby="today-focus-title">
          <div className="mb-3">
            <p className="text-xs font-medium text-primary">現在</p>
            <h2 id="today-focus-title" className="mt-1 text-lg font-semibold text-foreground">
              {isStaff ? '你的今日工作' : '今天的營運重點'}
            </h2>
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
            <h2 id="today-tasks-title" className="text-base font-semibold text-foreground">待處理</h2>
            <div className="mt-2 divide-y divide-primary/10 border-y border-primary/10">
              {pendingPhotoItems.length > 0 && (
                <TaskRow
                  icon={<Camera className="h-5 w-5" aria-hidden="true" />}
                  title={`待補照片 ${pendingPhotoItems.length} 筆`}
                  description="完成今日尚未上傳的成交照片"
                  actionLabel="處理"
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
                  onClick={status === SyncStatus.OFFLINE ? undefined : () => void sync()}
                />
              )}
            </div>
          </section>
        )}

        {todayView.todayMarkets.length > 1 && (
          <section className="mt-8" aria-labelledby="other-today-title">
            <h2 id="other-today-title" className="text-base font-semibold text-foreground">今日其他場次</h2>
            <div className="mt-2 divide-y divide-primary/10 border-y border-primary/10">
              {todayView.todayMarkets.slice(1).map(item => (
                <button
                  key={item.market.id ?? item.market.name}
                  type="button"
                  onClick={() => openMarket(item.market.id)}
                  className="flex min-h-16 w-full items-center gap-3 py-3 text-left hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${phaseClasses(item.phase)}`}>
                    {item.phaseLabel}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{item.market.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 border-t border-primary/10 pt-6" aria-labelledby="upcoming-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-secondary">接下來</p>
              <h2 id="upcoming-title" className="mt-1 text-lg font-semibold text-foreground">近期市集</h2>
            </div>
            <button
              type="button"
              onClick={() => router.push('/markets')}
              className="flex min-h-11 items-center gap-1 rounded-control px-2 text-sm font-medium text-primary hover:bg-white focus-visible:ring-2 focus-visible:ring-primary"
            >
              查看全部
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {todayView.upcomingMarkets.length > 0 ? (
            <div className="mt-3 divide-y divide-primary/10 border-y border-primary/10">
              {todayView.upcomingMarkets.slice(0, 3).map(item => (
                <button
                  key={item.market.id ?? `${item.market.name}-${item.nextDate}`}
                  type="button"
                  onClick={() => openMarket(item.market.id)}
                  className="flex min-h-16 w-full items-center gap-3 py-3 text-left hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex h-10 min-w-14 shrink-0 items-center justify-center rounded-control bg-white px-2 text-xs font-medium text-primary">
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
      </main>
    </div>
  );
}
