'use client';

import dynamic from 'next/dynamic';
import { AlertCircle, ArrowLeft, CalendarDays, Plus, Store } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';

import { WorkspacePageHeader } from '@/components/layout/WorkspacePageHeader';
import { MarketDetailLoadingShell } from '@/components/markets/MarketDetailLoadingShell';
import { MarketListCard } from '@/components/markets/MarketListCard';
import Link from 'next/link';
import { marketJournalsEnabled } from '@/lib/markets/market-journal';
import { MarketSearchField } from '@/components/markets/MarketSearchField';
import { matchesMarketSearch } from '@/lib/markets/market-planning-view-model';
import { comparePaymentDeadlines } from '@/lib/markets/market-payment-deadline';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { StateView } from '@/components/ui/StateView';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { initializeDatabaseSafely, type DatabaseInitResult } from '@/lib/db';
import { useMarkets } from '@/lib/db/hooks';
import {
  buildMarketListGroups,
  type MarketPreparationFilter,
  type MarketListStage,
  type MarketListViewItem,
} from '@/lib/markets/market-list-view-model';
import { isEntityCreateDeepLink } from '@/lib/navigation/entity-create-deep-link';
import { hideNavigation, showNavigation } from '@/lib/navigation-store';
import { buildMarketDetailHref } from '@/lib/navigation/market-detail-route';
import {
  beginMarketDetailTransition,
  type MarketDetailTransitionSnapshot,
} from '@/lib/navigation/market-detail-transition';
import { getDeepLinkPort } from '@/lib/platform/interaction-capabilities';
import { getSessionStatePort } from '@/lib/platform/session-state-capability';
import { useRoleContext } from '@/lib/role-context';
import { useAuth } from '@/lib/supabase/auth-context';
import MarketsLoading from './loading';

const AddMarketForm = dynamic(
  () => import('@/components/markets/AddMarketForm').then(module => module.AddMarketForm),
  { ssr: false },
);
const AddOperationDialog = dynamic(
  () => import('@/components/recurring-operations/AddOperationDialog').then(module => module.AddOperationDialog),
  { ssr: false },
);
const FixedScheduleForm = dynamic(
  () => import('@/components/recurring-operations/FixedScheduleForm').then(module => module.FixedScheduleForm),
  { ssr: false },
);

type PrimaryMarketView = Exclude<MarketListStage, 'cancelled'>;

interface MarketListReturnState {
  view: MarketListStage;
  preparationFilter: MarketPreparationFilter;
  scrollY: number;
  searchQuery: string;
}

const PRIMARY_VIEWS: readonly PrimaryMarketView[] = ['active', 'preparing', 'ended'];
const MARKET_LIST_RETURN_STATE_KEY = 'market-list:return-state:v1';
const ROLE_NOT_READY_OWNER_ID = '__role_not_ready__';

function isMarketListStage(value: unknown): value is MarketListStage {
  return value === 'active' || value === 'preparing' || value === 'ended' || value === 'cancelled';
}

function isMarketPreparationFilter(value: unknown): value is MarketPreparationFilter {
  return value === 'all' || value === 'awaiting_decision' || value === 'payment_due';
}

function readReturnState(): MarketListReturnState | null {
  try {
    const raw = getSessionStatePort().read(MARKET_LIST_RETURN_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MarketListReturnState>;
    if (!isMarketListStage(parsed.view)) return null;
    return {
      view: parsed.view,
      preparationFilter: isMarketPreparationFilter(parsed.preparationFilter) ? parsed.preparationFilter : 'all',
      scrollY: Number.isFinite(parsed.scrollY) ? Math.max(0, Number(parsed.scrollY)) : 0,
      searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
    };
  } catch {
    return null;
  }
}

function writeReturnState(state: MarketListReturnState): void {
  try {
    getSessionStatePort().write(MARKET_LIST_RETURN_STATE_KEY, JSON.stringify(state));
  } catch {
    // Session storage is an enhancement; navigation remains usable without it.
  }
}

export default function MarketsPage() {
  return <Suspense fallback={<MarketsLoading />}><MarketsPageContent /></Suspense>;
}

function MarketsPageContent() {
  const searchParams = useSearchParams();
  const shortcutAction = searchParams.get('action');
  const requestedView = searchParams.get('view');
  const requestedProgress = searchParams.get('progress');
  const router = useRouter();
  const { userRole, roleRefreshState } = useRoleContext();
  const { user } = useAuth();
  const isRoleReady = roleRefreshState.stage === 'ready';
  const isStaffMode = isRoleReady ? userRole.isStaff : true;
  const currentOwnerId = isRoleReady ? (isStaffMode ? userRole.ownerId : user?.id) : undefined;
  const scopedOwnerId = currentOwnerId ?? ROLE_NOT_READY_OWNER_ID;
  const canLoadScopedData = isRoleReady && Boolean(currentOwnerId);

  const [initialReturnState] = useState(readReturnState);
  const [selectedView, setSelectedView] = useState<MarketListStage | null>(() => (
    isMarketListStage(requestedView) ? requestedView : initialReturnState?.view ?? null
  ));
  const [preparationFilter, setPreparationFilter] = useState<MarketPreparationFilter>(() => (
    isMarketListStage(requestedView)
      ? isMarketPreparationFilter(requestedProgress) ? requestedProgress : 'all'
      : initialReturnState?.preparationFilter ?? 'all'
  ));
  const [searchQuery, setSearchQuery] = useState(() => (
    isMarketListStage(requestedView) ? '' : initialReturnState?.searchQuery ?? ''
  ));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAddChoiceOpen, setIsAddChoiceOpen] = useState(false);
  const [isFixedFormOpen, setIsFixedFormOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseInitResult | null>(null);
  const [openingMarketId, setOpeningMarketId] = useState<string | null>(null);
  const [openingMarketSnapshot, setOpeningMarketSnapshot] = useState<MarketDetailTransitionSnapshot | null>(null);
  const [now, setNow] = useState(() => new Date());
  const activeViewRef = useRef<MarketListStage>('active');
  const preparationFilterRef = useRef<MarketPreparationFilter>('all');
  const searchQueryRef = useRef('');
  const canPersistReturnStateRef = useRef(false);
  const openingFromListRef = useRef(false);
  const pendingScrollRestoreRef = useRef<number | null>(initialReturnState?.scrollY ?? null);
  canPersistReturnStateRef.current = canLoadScopedData && dbStatus?.ok === true;
  const shortcutHandledRef = useRef(false);

  useEffect(() => {
    if (!isRoleReady || !currentOwnerId) {
      setDbStatus(null);
      return;
    }

    setDbStatus(null);
    initializeDatabaseSafely({ profile: isStaffMode ? 'staff_scoped' : 'owner_full' })
      .then(result => setDbStatus(result))
      .catch(error => {
        console.error('資料庫初始化失敗：', error);
        setDbStatus({
          ok: false,
          error: error instanceof Error ? error : new Error(String(error)),
          recoverable: true,
        });
      });
  }, [currentOwnerId, isRoleReady, isStaffMode]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (isMarketListStage(requestedView)) {
      const progress = isMarketPreparationFilter(requestedProgress) ? requestedProgress : 'all';
      setSelectedView(requestedView);
      setPreparationFilter(progress);
      setSearchQuery('');
      pendingScrollRestoreRef.current = 0;
      writeReturnState({ view: requestedView, preparationFilter: progress, searchQuery: '', scrollY: 0 });
      router.replace('/markets', { scroll: false });
      return;
    }
    const state = readReturnState();
    if (!state) return;
    setSelectedView(state.view);
    setPreparationFilter(state.preparationFilter);
    setSearchQuery(state.searchQuery);
    pendingScrollRestoreRef.current = state.scrollY;
  }, [requestedProgress, requestedView, router]);

  useEffect(() => () => {
    // Strict Mode replays cleanup before the restored state or scoped data is ready.
    // Never replace a saved search with the loading screen's default view.
    if (!canPersistReturnStateRef.current || openingFromListRef.current) return;
    writeReturnState({ view: activeViewRef.current, preparationFilter: preparationFilterRef.current, searchQuery: searchQueryRef.current, scrollY: window.scrollY });
  }, []);

  const allMarkets = useMarkets({
    orderBy: 'startDate',
    order: 'desc',
    ownerId: scopedOwnerId,
  });
  const groups = useMemo(() => buildMarketListGroups(allMarkets, now), [allMarkets, now]);
  const searchedGroups = useMemo(() => ({
    active: groups.active.filter(item => matchesMarketSearch(item.market, searchQuery)),
    preparing: groups.preparing.filter(item => matchesMarketSearch(item.market, searchQuery)),
    ended: groups.ended.filter(item => matchesMarketSearch(item.market, searchQuery)),
    cancelled: groups.cancelled.filter(item => matchesMarketSearch(item.market, searchQuery)),
  }), [groups, searchQuery]);
  const defaultView: PrimaryMarketView = groups.active.length > 0
    ? 'active'
    : groups.preparing.length > 0
      ? 'preparing'
      : 'ended';
  const activeView = selectedView ?? defaultView;
  activeViewRef.current = activeView;
  preparationFilterRef.current = preparationFilter;
  searchQueryRef.current = searchQuery;
  const filteredMarkets = activeView === 'preparing' && preparationFilter !== 'all'
    ? searchedGroups.preparing.filter(item => item.preparationAttention === preparationFilter)
    : searchedGroups[activeView];
  if (activeView === 'preparing' && preparationFilter === 'payment_due') {
    filteredMarkets.sort((a, b) => comparePaymentDeadlines(a.market, b.market) || a.displayDate.localeCompare(b.displayDate) || a.market.name.localeCompare(b.market.name));
  }
  useEffect(() => {
    if (!canLoadScopedData || dbStatus?.ok !== true || pendingScrollRestoreRef.current === null) return;
    if (pendingScrollRestoreRef.current > 0 && allMarkets.length === 0) return;
    const scrollY = pendingScrollRestoreRef.current;
    const timerId = window.setTimeout(() => {
      window.scrollTo({ top: scrollY });
      pendingScrollRestoreRef.current = null;
    }, 80);
    return () => window.clearTimeout(timerId);
  }, [activeView, allMarkets.length, canLoadScopedData, dbStatus?.ok, preparationFilter, searchQuery]);
  const preparationFilters: readonly { id: MarketPreparationFilter; label: string; count: number }[] = [
    { id: 'all', label: '全部', count: searchedGroups.preparing.length },
    { id: 'awaiting_decision', label: '等待錄取', count: searchedGroups.preparing.filter(item => item.preparationAttention === 'awaiting_decision').length },
    { id: 'payment_due', label: '待繳費', count: searchedGroups.preparing.filter(item => item.preparationAttention === 'payment_due').length },
  ];

  useEffect(() => {
    for (const item of filteredMarkets.slice(0, 8)) {
      if (item.market.id) router.prefetch(buildMarketDetailHref(item.market.id));
    }
  }, [filteredMarkets, router]);

  const tabs: readonly TabItem<PrimaryMarketView>[] = [
    { id: 'active', label: '進行中', count: searchedGroups.active.length },
    { id: 'preparing', label: '待準備', count: searchedGroups.preparing.length },
    { id: 'ended', label: '已結束', count: searchedGroups.ended.length },
  ];

  const selectView = (view: MarketListStage, nextPreparationFilter = preparationFilter, nextSearchQuery = searchQuery) => {
    setSelectedView(view);
    writeReturnState({ view, preparationFilter: nextPreparationFilter, searchQuery: nextSearchQuery, scrollY: 0 });
  };

  const selectPreparationFilter = (filter: MarketPreparationFilter) => {
    setPreparationFilter(filter);
    writeReturnState({ view: 'preparing', preparationFilter: filter, searchQuery, scrollY: 0 });
  };

  const openMarket = (item: MarketListViewItem) => {
    const marketId = item.market.id;
    if (!marketId) return;
    // Capture before the loading shell shortens the page or navigation resets scroll.
    writeReturnState({ view: activeView, preparationFilter, searchQuery, scrollY: window.scrollY });
    openingFromListRef.current = true;
    const snapshot = beginMarketDetailTransition({
      marketId,
      actorId: user?.id ?? '',
      name: item.market.name,
      dateRangeLabel: item.dateRangeLabel,
      location: item.market.location || '尚未設定地點',
    });
    flushSync(() => {
      setOpeningMarketId(marketId);
      setOpeningMarketSnapshot(snapshot);
    });
    router.push(buildMarketDetailHref(marketId));
  };

  useEffect(() => {
    if (!openingMarketSnapshot) return;
    const timeoutId = window.setTimeout(() => {
      openingFromListRef.current = false;
      setOpeningMarketId(null);
      setOpeningMarketSnapshot(null);
      toast.error('市集開啟時間較久，請再試一次');
    }, 8_000);
    return () => window.clearTimeout(timeoutId);
  }, [openingMarketSnapshot]);

  const handleAddSuccess = () => {
    toast.success('市集建立成功', { description: '已加入待準備清單。' });
    setSearchQuery('');
    setPreparationFilter('all');
    selectView('preparing', 'all', '');
    showNavigation();
  };

  const handleOpenAddChoice = () => {
    if (!canLoadScopedData || dbStatus?.ok === false) return;
    setIsAddChoiceOpen(true);
    hideNavigation();
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    showNavigation();
  };

  const handleCloseAddChoice = () => {
    setIsAddChoiceOpen(false);
    showNavigation();
  };

  const handleSelectSingle = () => {
    setIsAddChoiceOpen(false);
    setIsFormOpen(true);
  };

  const handleSelectWeekly = () => {
    setIsAddChoiceOpen(false);
    setIsFixedFormOpen(true);
  };

  const handleCloseFixedForm = () => {
    setIsFixedFormOpen(false);
    showNavigation();
  };

  const handleFixedSuccess = () => {
    toast.success('固定安排已建立', { description: '可以在固定安排頁暫停、恢復或封存。' });
    showNavigation();
    router.push('/markets/schedules');
  };

  useEffect(() => {
    if (shortcutAction !== 'add') { shortcutHandledRef.current = false; return; }
    if (shortcutHandledRef.current || !isRoleReady || dbStatus === null) return;

    let active = true;
    const handle = (url: string | null) => {
      if (!active || shortcutHandledRef.current || !isEntityCreateDeepLink(url, '/markets')) return;
      shortcutHandledRef.current = true;
      router.replace('/markets');
      if (isStaffMode || !canLoadScopedData || dbStatus.ok === false) return;
      setIsFormOpen(true);
      hideNavigation();
    };
    const links = getDeepLinkPort();
    void links.getCurrentUrl().then(url => handle(url)).catch(() => undefined);

    return () => { active = false; };
  }, [canLoadScopedData, dbStatus, isRoleReady, isStaffMode, router, shortcutAction]);

  if (openingMarketSnapshot) return <MarketDetailLoadingShell snapshot={openingMarketSnapshot} />;

  if (!canLoadScopedData || dbStatus === null) return <MarketsLoading />;

  if (dbStatus.ok === false) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
        <StateView
          icon={<AlertCircle className="h-5 w-5" aria-hidden="true" />}
          title="本機資料庫無法正常存取"
          description="可能是儲存空間不足、隱私模式或資料庫結構異常。你的雲端資料不會因此被刪除。"
          className="w-full"
          action={(
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => router.push('/support')}>取得協助</Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>重新整理</Button>
            </div>
          )}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader
        title="市集"
        eyebrow={isStaffMode ? '團隊工作區' : '營運管理'}
        icon={Store}
        isStaff={isStaffMode}
        widthMode="workspace"
        action={!isStaffMode ? (
            <IconButton
              label="新增營業"
              tone="inverse"
              icon={<Plus className="h-5 w-5" aria-hidden="true" />}
              onClick={handleOpenAddChoice}
            />
        ) : undefined}
      />

      <div className="mx-auto max-w-5xl px-4 pb-8 pt-6 sm:px-6">
        {!isStaffMode && marketJournalsEnabled() && <Link href="/markets/journals" className="mb-4 inline-flex min-h-11 items-center rounded-xl border border-primary/20 bg-white px-4 text-sm font-medium text-primary">出攤心得・集中回顧</Link>}
        {activeView === 'cancelled' ? (
          <div className="mb-5 flex items-center gap-3">
            <IconButton
              label="返回市集分類"
              icon={<ArrowLeft className="h-5 w-5" aria-hidden="true" />}
              onClick={() => selectView(defaultView)}
            />
            <div>
              <h2 className="text-lg font-semibold text-foreground">已取消市集</h2>
              <p className="text-sm text-muted-foreground">共 {groups.cancelled.length} 場</p>
            </div>
          </div>
        ) : (
          <Tabs
            items={tabs}
            value={PRIMARY_VIEWS.includes(activeView as PrimaryMarketView) ? activeView as PrimaryMarketView : defaultView}
            onChange={selectView}
            ariaLabel="市集工作階段"
          />
        )}

        <MarketSearchField value={searchQuery} onChange={setSearchQuery} />
        {searchQuery.trim() && (
          <p className="mt-2 text-xs leading-5 text-muted-foreground" role="status">
            此分類找到 {filteredMarkets.length} 場；上方分類數字為搜尋結果數量。
          </p>
        )}

        {activeView === 'preparing' && (
          <section className="mt-4" aria-labelledby="preparation-filter-label">
            <p id="preparation-filter-label" className="text-xs font-semibold text-muted-foreground">報名進度</p>
            <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="待準備報名進度篩選">
              {preparationFilters.map(filter => {
                const selected = preparationFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectPreparationFilter(filter.id)}
                    className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary ${selected
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-primary/15 bg-atelier-paper text-foreground hover:border-primary/35 hover:bg-primary/5'}`}
                  >
                    <span>{filter.label}</span>
                    <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-xs tabular-nums ${selected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                      {filter.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {filteredMarkets.length > 0 ? (
          <div className="mt-5 space-y-3">
            <div className="hidden grid-cols-[minmax(14rem,1.35fr)_minmax(10rem,.85fr)_minmax(10rem,1fr)_minmax(7rem,.65fr)] gap-4 px-5 text-xs font-semibold text-muted-foreground xl:grid">
              <span>市集與狀態</span>
              <span>日期</span>
              <span>地點</span>
              <span>結果</span>
            </div>
            {filteredMarkets.map(item => (
              <MarketListCard
                key={item.market.id ?? `${item.market.name}-${item.displayDate}`}
                item={item}
                isStaff={isStaffMode}
                isOpening={openingMarketId === item.market.id}
                onOpen={() => openMarket(item)}
              />
            ))}
          </div>
        ) : (
          <StateView
            className="mt-5"
            icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
            title={searchQuery.trim() ? '此分類沒有符合的市集' : activeView === 'active'
              ? '目前沒有進行中的市集'
              : activeView === 'preparing'
                ? preparationFilter === 'awaiting_decision'
                  ? '目前沒有等待錄取的市集'
                  : preparationFilter === 'payment_due'
                    ? '目前沒有待繳費的市集'
                    : '目前沒有待準備的市集'
                : activeView === 'ended'
                  ? '尚無已結束的市集'
                  : '沒有已取消的市集'}
            description={searchQuery.trim() ? '可更換名稱或地點關鍵字，或查看其他分類的搜尋結果。' : activeView === 'preparing' && preparationFilter !== 'all'
              ? '切換其他報名進度查看市集。'
              : activeView === 'preparing' && !isStaffMode
                ? '新增下一場市集後，會從這裡開始準備。'
                : '切換其他分類查看市集。'}
            action={searchQuery.trim() ? <Button variant="secondary" onClick={() => setSearchQuery('')}>清除搜尋</Button> : activeView === 'preparing' && preparationFilter === 'all' && !isStaffMode
              ? <Button onClick={handleOpenAddChoice} leadingIcon={<Plus className="h-4 w-4" />}>新增營業</Button>
              : undefined}
          />
        )}

        {activeView !== 'cancelled' && groups.cancelled.length > 0 && (
          <button
            type="button"
            onClick={() => selectView('cancelled')}
            className="mt-6 min-h-11 rounded-control px-2 text-sm text-muted-foreground hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
          >
            查看已取消市集 ({searchedGroups.cancelled.length})
          </button>
        )}
      </div>

      {isFormOpen && (
        <AddMarketForm
          isOpen
          onClose={handleCloseForm}
          onSuccess={handleAddSuccess}
        />
      )}
      <AddOperationDialog
        open={isAddChoiceOpen}
        onClose={handleCloseAddChoice}
        onSingle={handleSelectSingle}
        onWeekly={handleSelectWeekly}
        onManage={() => {
          setIsAddChoiceOpen(false);
          showNavigation();
          router.push('/markets/schedules');
        }}
      />
      <FixedScheduleForm
        open={isFixedFormOpen}
        onClose={handleCloseFixedForm}
        onSuccess={handleFixedSuccess}
      />
    </div>
  );
}
