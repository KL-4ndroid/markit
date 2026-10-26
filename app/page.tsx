'use client';

import { useSubscriptionExperience } from '@/components/subscription/SubscriptionExperienceProvider';
import { useHomePhotoReminders } from '@/hooks/useHomePhotoReminders';
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
import { toast } from 'sonner';

import { TodayMarketCard, todayMarketPhaseClasses } from '@/components/home/TodayMarketCard';
import { MarketPlanningOverview } from '@/components/home/MarketPlanningOverview';
import { SameDayMarketArrangements } from '@/components/home/SameDayMarketArrangements';
import { StaffBadge } from '@/components/staff/StaffBadge';
import { SyncStatus } from '@/hooks/useSync';
import { useRoleContext } from '@/lib/role-context';
import { startMarket, useMarketsQuery } from '@/lib/db/hooks';
import {
  buildTodayViewModel,
  summarizeTodayMarkets,
} from '@/lib/home/today-view-model';
import {
  OWNER_BRAND_NAME_UPDATED_EVENT,
  loadOwnerBrandName,
  readCachedOwnerBrandName,
} from '@/lib/owner-brand';
import { useSyncContext } from '@/lib/sync-context';
import { useAuth } from '@/lib/supabase/auth-context';
import { buildMarketDetailHref } from '@/lib/navigation/market-detail-route';
import { canStartScheduledMarket } from '@/lib/recurring-operations';
import { deriveRoleCapabilities, hasCapability } from '@/lib/permissions/role-capabilities';
import { buildMarketPlanningViewModel, getMarketRegistrationLabel } from '@/lib/markets/market-planning-view-model';

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
  if (hour < 17) return '午安，照自己的步調來';
  return '晚安，今天也辛苦了';
}

function formatDateKey(dateKey: string, options: Intl.DateTimeFormatOptions = {
  month: 'numeric', day: 'numeric', weekday: 'short',
}): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('zh-TW', options).format(new Date(year, month - 1, day));
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
  const { canAnalyze } = useSubscriptionExperience();
  const { user } = useAuth();
  const { userRole, isStaff, isOwner, roleRefreshState } = useRoleContext();
  const { status, pendingCount, sync, lastSyncAt, isOnline } = useSyncContext();
  const [now, setNow] = useState(() => new Date());
  const [ownerBrandName, setOwnerBrandName] = useState('Féria - 出攤筆記');
  const [startingMarketId, setStartingMarketId] = useState<string | null>(null);

  const currentOwnerId = isStaff ? userRole.ownerId : user?.id;
  const scopedOwnerId = currentOwnerId ?? DASHBOARD_ROLE_NOT_READY_OWNER_ID;
  const { markets: allMarkets, isLoading: marketsLoading, error: marketsError } = useMarketsQuery({
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
  const todaySummary = summarizeTodayMarkets(todayView.todayMarkets);
  const otherOpenMarkets = todayView.todayMarkets.slice(1).filter(item => item.phase !== 'ended');
  const otherClosedMarkets = todayView.todayMarkets.slice(1).filter(item => item.phase === 'ended');
  const canViewOwnerPlanning = roleRefreshState.stage === 'ready' && isOwner;
  const planning = useMemo(
    () => buildMarketPlanningViewModel(canViewOwnerPlanning ? allMarkets : [], now),
    [allMarkets, canViewOwnerPlanning, now],
  );
  const todayArrangement = planning.sameDayArrangements.find(arrangement => arrangement.date === todayView.dateKey);
  const canStartMarketByRole = roleRefreshState.stage === 'ready'
    && roleRefreshState.isAuthorizationFresh
    && hasCapability(deriveRoleCapabilities({
      isOwner: roleRefreshState.permissions.isOwner,
      staffRole: userRole.staffRole,
    }), 'canEditMarketBasic');
  const todayMarketIds = useMemo(
    () => todayView.todayMarkets.flatMap(item => item.market.id ? [item.market.id] : []),
    [todayView.todayMarkets],
  );
  const photoReminders = useHomePhotoReminders({
    actorId: user?.id, ownerId: currentOwnerId, marketIds: todayMarketIds,
    canRead: canAnalyze && roleRefreshState.stage === 'ready' && roleRefreshState.shouldMountProtectedChildren,
    canRecover: canAnalyze && isOwner && roleRefreshState.isAuthorizationFresh,
    syncReady: isOnline && lastSyncAt !== null && status !== SyncStatus.SYNCING && status !== SyncStatus.OFFLINE && status !== SyncStatus.ERROR,
    isOnline,
    syncFailed: status === SyncStatus.ERROR,
    lastSyncAt,
  });
  const pendingPhotoItems = photoReminders.items;

  const openMarket = (marketId?: string, task?: 'pending-photos') => {
    if (!marketId) return;
    router.push(buildMarketDetailHref(marketId, { task, returnTo: 'today' }));
  };

  const startScheduledMarket = async (marketId: string) => {
    const market = allMarkets.find(candidate => candidate.id === marketId);
    if (
      !market
      || !canStartMarketByRole
      || !canStartScheduledMarket(market, now)
    ) {
      toast.error('目前無法開始這個固定場次，請重新整理後再試。');
      return;
    }

    setStartingMarketId(marketId);
    try {
      await startMarket(marketId);
      toast.success('今天的營業已開始');
      openMarket(marketId);
    } catch (error) {
      console.error('開始固定營業失敗：', error);
      toast.error('尚未開始營業，本機資料仍會保留，請再試一次。');
    } finally {
      setStartingMarketId(null);
    }
  };

  const pendingPhotoMarketId = pendingPhotoItems[0]?.marketId;
  const showSyncTask = status === SyncStatus.ERROR
    || status === SyncStatus.OFFLINE
    || (pendingCount > 0 && status !== SyncStatus.SYNCING);
  const staffWorkspaceName = userRole.ownerEmail
    ? `${userRole.ownerEmail.split('@')[0]} 團隊`
    : '團隊工作區';
  const greeting = getGreeting(now);

  // An unresolved query or a first cloud restore cannot prove an empty account.
  if (marketsLoading || marketsError || (allMarkets.length === 0 && user && !lastSyncAt)) {
    const needsRetry = Boolean(marketsError) || status === SyncStatus.ERROR || status === SyncStatus.OFFLINE;
    return (
      <div className="min-h-screen bg-atelier-canvas px-4 py-12 text-center">
        <p role="status" className="text-sm text-muted-foreground">
          {needsRetry ? (marketsError ?? '資料尚未載入完成，請連線後重試。') : '正在載入市集資料…'}
        </p>
        {needsRetry && <button type="button" onClick={() => sync()} className="mt-4 min-h-11 rounded-control bg-primary px-5 text-white">重新載入</button>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-atelier-canvas/80 text-atelier-ink">
      <header className="japanese-warm-header overflow-hidden rounded-b-[1.5rem] px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] text-white shadow-atelier sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="min-w-0">
            {isStaff ? (
              <p className="truncate text-xs font-semibold text-white/90">{staffWorkspaceName}</p>
            ) : (
              <p className="truncate text-xs font-semibold text-white/90">{ownerBrandName}</p>
            )}
          </div>

          <div className="mt-2 min-w-0">
            <h1 className="text-lg font-medium leading-snug text-white">{greeting}</h1>
            <p className="mt-1 text-xs text-white/90">{formatDateLabel(now)}</p>
            {isStaff && <div className="mt-2"><StaffBadge tone="default" /></div>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-8 pt-5 sm:px-6">
        <section aria-labelledby="today-focus-title">
          <div className="mb-3">
            <p className="text-xs font-semibold text-atelier-clay">現在</p>
            <h2 id="today-focus-title" className="mt-1 text-lg font-semibold text-atelier-ink">
              {isStaff ? '你的今日工作' : '今天的營運重點'}
            </h2>
            {todaySummary.total > 0 && <p className="mt-2 text-sm leading-6 text-muted-foreground">
              今日 {todaySummary.total} 場：營業中 {todaySummary.operating}・待確認／準備 {todaySummary.preparing}・已收攤 {todaySummary.ended}
            </p>}
          </div>

          {todayView.primaryMarket ? (
            <TodayMarketCard
              item={todayView.primaryMarket}
              isStaff={isStaff}
              onOpen={() => openMarket(todayView.primaryMarket?.market.id)}
              onStart={todayView.primaryMarket.market.id
                && canStartMarketByRole
                && canStartScheduledMarket(todayView.primaryMarket.market, now)
                ? () => void startScheduledMarket(todayView.primaryMarket!.market.id!)
                : undefined}
              isStarting={startingMarketId === todayView.primaryMarket.market.id}
            />
          ) : (
            <button
              type="button"
              onClick={() => router.push('/markets')}
              className="flex min-h-20 w-full items-center gap-3 rounded-card bg-atelier-blue-soft/50 px-4 py-3 text-left transition-colors hover:bg-atelier-blue-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <CalendarDays className="h-5 w-5 shrink-0 text-atelier-blue" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">今天沒有排定市集</span>
                <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
                  {todayView.upcomingMarkets[0]
                    ? `下一場：${formatDateKey(todayView.upcomingMarkets[0].nextDate)} ${todayView.upcomingMarkets[0].market.name}`
                    : isStaff ? '目前沒有可執行的市集工作。' : '可先安排下一場市集。'}
                </span>
                <span className="mt-1 block text-xs font-medium text-primary">{isStaff ? '查看可用市集' : '查看市集安排'}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          )}
          {canViewOwnerPlanning && todayArrangement && (
            <p className="mt-3 flex items-start gap-2 rounded-control bg-atelier-blue-soft/50 px-3 py-3 text-sm text-foreground">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-atelier-blue" aria-hidden="true" />
              今天有同日多場安排，請確認時間與人手；不一定有時段重疊。
            </p>
          )}
        </section>

        {canViewOwnerPlanning && (
          <MarketPlanningOverview
            planning={planning}
            onOpenProgress={filter => router.push(`/markets?view=preparing&progress=${filter}`)}
          />
        )}

        {(pendingPhotoItems.length > 0 || photoReminders.loading || photoReminders.warning || showSyncTask) && (
          <section className="mt-8" aria-labelledby="today-tasks-title">
            <div className="flex items-center gap-3">
              <h2 id="today-tasks-title" className="text-base font-semibold text-atelier-ink">待處理</h2>
            </div>
            <div className="mt-3 space-y-2">
              {pendingPhotoItems.length === 0 && (photoReminders.loading || photoReminders.warning) && (
                <TaskRow icon={<Camera className="h-5 w-5" aria-hidden="true" />}
                  title={photoReminders.loading ? '正在確認待補照片' : '照片待補狀態尚未確認'}
                  description={photoReminders.warning ?? '正在核對今日成交與雲端照片紀錄'}
                  actionLabel={photoReminders.canRefresh && !photoReminders.loading ? '重試' : undefined}
                  onClick={photoReminders.canRefresh && !photoReminders.loading ? photoReminders.refresh : undefined} tone="rose" />
              )}
              {pendingPhotoItems.length > 0 && (
                <TaskRow
                  icon={<Camera className="h-5 w-5" aria-hidden="true" />}
                  title={`待補照片 ${pendingPhotoItems.length} 筆`}
                  description={photoReminders.warning ?? "查看今日待補提醒；未上傳原圖仍在來源裝置"}
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
                  description={pendingCount > 0 ? `${pendingCount} 筆紀錄只保存在這台裝置，尚未送達雲端` : '尚無法確認最新雲端資料；已保存的本機紀錄仍保留'}
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
              {otherOpenMarkets.map(item => (
                <button
                  key={item.market.id ?? item.market.name}
                  type="button"
                  onClick={() => openMarket(item.market.id)}
                  className="flex min-h-16 w-full items-center gap-3 rounded-card bg-atelier-paper px-3 py-3 text-left shadow-atelier transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-atelier-lift focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${todayMarketPhaseClasses(item.phase)}`}>
                    {item.phaseLabel}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">{item.market.name}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
              {otherClosedMarkets.length > 0 && <details className="rounded-card border border-border bg-atelier-paper px-3">
                <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  {todayView.primaryMarket?.phase === 'ended' ? '其他已收攤' : '今日已收攤'} {otherClosedMarkets.length} 場
                </summary>
                <div className="divide-y divide-border">
                  {otherClosedMarkets.map(item => <button key={item.market.id ?? item.market.name} type="button" onClick={() => openMarket(item.market.id)} className="flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <span className="min-w-0 break-words">{item.market.name}</span>
                    <span className="shrink-0 text-muted-foreground">查看回顧</span>
                  </button>)}
                </div>
              </details>}
            </div>
          </section>
        )}

        <section className="-mx-4 mt-7 bg-upcoming-section px-4 py-5 sm:-mx-6 sm:px-6" aria-labelledby="upcoming-title">
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
                  className="flex min-h-20 w-full items-start gap-3 rounded-card bg-atelier-paper/90 px-3 py-3 text-left shadow-sm transition-colors hover:bg-atelier-paper focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex min-h-12 w-14 shrink-0 flex-col items-center justify-center rounded-control bg-upcoming-date-badge px-1 py-1.5 text-atelier-blue">
                    <span className="text-base font-semibold tabular-nums">{Number(item.nextDate.slice(5, 7))}/{Number(item.nextDate.slice(8, 10))}</span>
                    <span className="mt-0.5 text-xs">{formatDateKey(item.nextDate, { weekday: 'short' })}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-base font-medium leading-6 text-foreground">{item.market.name}</span>
                    {canViewOwnerPlanning && (
                      <span className={`mt-1 inline-flex rounded-control px-2 py-0.5 text-xs font-medium ${item.market.status === 'accepted' ? 'bg-status-warn-bg text-status-warn-text' : 'bg-primary/10 text-primary'}`}>
                        {getMarketRegistrationLabel(item.market)}
                      </span>
                    )}
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{item.market.location || '尚未設定地點'}</span>
                  </span>
                  <ChevronRight className="mt-4 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 py-4 text-sm text-muted-foreground">目前沒有即將到來的市集。</p>
          )}
        </section>

        {canViewOwnerPlanning && (
          <SameDayMarketArrangements
            arrangements={planning.sameDayArrangements}
            onOpenMarket={market => market.id && router.push(buildMarketDetailHref(market.id, { task: 'registration', returnTo: 'today' }))}
          />
        )}
      </div>
    </div>
  );
}
