'use client';

import dynamic from 'next/dynamic';
import { AlertCircle, ArrowLeft, CalendarDays, MapPin, Plus, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { StateView } from '@/components/ui/StateView';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { initializeDatabaseSafely, type DatabaseInitResult } from '@/lib/db';
import { useMarkets } from '@/lib/db/hooks';
import {
  buildMarketListGroups,
  getMarketListActionLabel,
  type MarketListStage,
  type MarketListViewItem,
} from '@/lib/markets/market-list-view-model';
import { hideNavigation, showNavigation } from '@/lib/navigation-store';
import { buildMarketDetailHref } from '@/lib/navigation/market-detail-route';
import { useRoleContext } from '@/lib/role-context';
import { useAuth } from '@/lib/supabase/auth-context';
import { getGradientClass } from '@/lib/theme-config';
import MarketsLoading from './loading';

const AddMarketForm = dynamic(
  () => import('@/components/markets/AddMarketForm').then(module => module.AddMarketForm),
  { ssr: false },
);

type PrimaryMarketView = Exclude<MarketListStage, 'cancelled'>;

interface MarketListReturnState {
  view: MarketListStage;
  scrollY: number;
}

const PRIMARY_VIEWS: readonly PrimaryMarketView[] = ['active', 'preparing', 'ended'];
const MARKET_LIST_RETURN_STATE_KEY = 'market-list:return-state:v1';
const ROLE_NOT_READY_OWNER_ID = '__role_not_ready__';

function isMarketListStage(value: unknown): value is MarketListStage {
  return value === 'active' || value === 'preparing' || value === 'ended' || value === 'cancelled';
}

function readReturnState(): MarketListReturnState | null {
  try {
    const raw = sessionStorage.getItem(MARKET_LIST_RETURN_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MarketListReturnState>;
    if (!isMarketListStage(parsed.view)) return null;
    return {
      view: parsed.view,
      scrollY: Number.isFinite(parsed.scrollY) ? Math.max(0, Number(parsed.scrollY)) : 0,
    };
  } catch {
    return null;
  }
}

function writeReturnState(state: MarketListReturnState): void {
  try {
    sessionStorage.setItem(MARKET_LIST_RETURN_STATE_KEY, JSON.stringify(state));
  } catch {
    // Session storage is an enhancement; navigation remains usable without it.
  }
}

function stageClasses(stage: MarketListStage): string {
  if (stage === 'active') return 'bg-status-good-bg text-status-good-text';
  if (stage === 'preparing') return 'bg-status-warn-bg text-status-warn-text';
  if (stage === 'cancelled') return 'bg-status-danger-bg text-status-danger-text';
  return 'bg-muted text-muted-foreground';
}

interface MarketListCardProps {
  item: MarketListViewItem;
  isStaff: boolean;
  onOpen: () => void;
}

function MarketListCard({ item, isStaff, onOpen }: MarketListCardProps) {
  return (
    <article className="rounded-card border border-primary/10 bg-atelier-paper p-4 shadow-atelier transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-atelier-lift sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stageClasses(item.stage)}`}>
            {item.statusLabel}
          </span>
          <h2 className="mt-2 break-words text-base font-semibold text-foreground sm:text-lg">
            {item.market.name}
          </h2>
        </div>
        <Store className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      </div>

      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <p className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{item.dateRangeLabel}</span>
        </p>
        <p className="flex min-w-0 items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.market.location || '尚未設定地點'}</span>
        </p>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant={item.stage === 'active' ? 'primary' : 'secondary'}
          onClick={onOpen}
          className="w-full sm:w-auto"
        >
          {getMarketListActionLabel(item.stage, isStaff)}
        </Button>
      </div>
    </article>
  );
}

export default function MarketsPage() {
  const router = useRouter();
  const { userRole, roleRefreshState } = useRoleContext();
  const { user } = useAuth();
  const isRoleReady = roleRefreshState.stage === 'ready';
  const isStaffMode = isRoleReady ? userRole.isStaff : true;
  const currentOwnerId = isRoleReady ? (isStaffMode ? userRole.ownerId : user?.id) : undefined;
  const scopedOwnerId = currentOwnerId ?? ROLE_NOT_READY_OWNER_ID;
  const canLoadScopedData = isRoleReady && Boolean(currentOwnerId);

  const [selectedView, setSelectedView] = useState<MarketListStage | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseInitResult | null>(null);
  const [now, setNow] = useState(() => new Date());
  const activeViewRef = useRef<MarketListStage>('active');

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
    const state = readReturnState();
    if (!state) return;
    setSelectedView(state.view);
    const timerId = window.setTimeout(() => window.scrollTo({ top: state.scrollY }), 80);
    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => () => {
    writeReturnState({ view: activeViewRef.current, scrollY: window.scrollY });
  }, []);

  const allMarkets = useMarkets({
    orderBy: 'startDate',
    order: 'desc',
    ownerId: scopedOwnerId,
  });
  const groups = useMemo(() => buildMarketListGroups(allMarkets, now), [allMarkets, now]);
  const defaultView: PrimaryMarketView = groups.active.length > 0
    ? 'active'
    : groups.preparing.length > 0
      ? 'preparing'
      : 'ended';
  const activeView = selectedView ?? defaultView;
  activeViewRef.current = activeView;
  const filteredMarkets = groups[activeView];

  const tabs: readonly TabItem<PrimaryMarketView>[] = [
    { id: 'active', label: '進行中', count: groups.active.length },
    { id: 'preparing', label: '待準備', count: groups.preparing.length },
    { id: 'ended', label: '已結束', count: groups.ended.length },
  ];

  const selectView = (view: MarketListStage) => {
    setSelectedView(view);
    writeReturnState({ view, scrollY: 0 });
  };

  const openMarket = (marketId?: string) => {
    if (!marketId) return;
    writeReturnState({ view: activeView, scrollY: window.scrollY });
    router.push(buildMarketDetailHref(marketId));
  };

  const handleAddSuccess = () => {
    toast.success('市集建立成功', { description: '已加入待準備清單。' });
    selectView('preparing');
    showNavigation();
  };

  const handleOpenForm = () => {
    if (!canLoadScopedData || dbStatus?.ok === false) return;
    setIsFormOpen(true);
    hideNavigation();
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    showNavigation();
  };

  if (!canLoadScopedData || dbStatus === null) return <MarketsLoading />;

  if (dbStatus.ok === false) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
        <StateView
          icon={<AlertCircle className="h-5 w-5" aria-hidden="true" />}
          title="本機資料庫無法正常存取"
          description="可能是儲存空間不足、隱私模式或資料庫結構異常。你的雲端資料不會因此被刪除。"
          className="w-full"
          action={(
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => router.push('/recovery')}>前往資料修復</Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>重新整理</Button>
            </div>
          )}
        />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className={`${getGradientClass(isStaffMode)} rounded-b-[2rem] border-b border-white/15 px-5 pb-8 pt-[calc(1.5rem+env(safe-area-inset-top))] text-white shadow-atelier`}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/80">{isStaffMode ? '團隊工作區' : '營運管理'}</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
              <Store className="h-6 w-6" aria-hidden="true" />
              市集
            </h1>
          </div>
          {!isStaffMode && (
            <IconButton
              label="新增市集"
              tone="inverse"
              icon={<Plus className="h-5 w-5" aria-hidden="true" />}
              onClick={handleOpenForm}
            />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-6">
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

        {filteredMarkets.length > 0 ? (
          <div className="mt-5 space-y-3">
            {filteredMarkets.map(item => (
              <MarketListCard
                key={item.market.id ?? `${item.market.name}-${item.displayDate}`}
                item={item}
                isStaff={isStaffMode}
                onOpen={() => openMarket(item.market.id)}
              />
            ))}
          </div>
        ) : (
          <StateView
            className="mt-5"
            icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
            title={activeView === 'active'
              ? '目前沒有進行中的市集'
              : activeView === 'preparing'
                ? '目前沒有待準備的市集'
                : activeView === 'ended'
                  ? '尚無已結束的市集'
                  : '沒有已取消的市集'}
            description={activeView === 'preparing' && !isStaffMode ? '新增下一場市集後，會從這裡開始準備。' : '切換其他分類查看市集。'}
            action={activeView === 'preparing' && !isStaffMode
              ? <Button onClick={handleOpenForm} leadingIcon={<Plus className="h-4 w-4" />}>新增市集</Button>
              : undefined}
          />
        )}

        {activeView !== 'cancelled' && groups.cancelled.length > 0 && (
          <button
            type="button"
            onClick={() => selectView('cancelled')}
            className="mt-6 min-h-11 rounded-control px-2 text-sm text-muted-foreground hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
          >
            查看已取消市集 ({groups.cancelled.length})
          </button>
        )}
      </main>

      {isFormOpen && (
        <AddMarketForm
          isOpen
          onClose={handleCloseForm}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
}
