'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  BarChart3,
  CloudOff,
  FileText,
  PackageSearch,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';

import { ActionableInsightsCard } from '@/components/analytics/ActionableInsightsCard';
import { AnalyticsSummaryHighlights } from '@/components/analytics/AnalyticsSummaryHighlights';
import { AdvancedAnalysisGate } from '@/components/analytics/AdvancedAnalysisGate';
import { DateRangeFilter, type AnalyticsRange } from '@/components/analytics/DateRangeFilter';
import { MarketRecapCard } from '@/components/analytics/MarketRecapCard';
import { MarketTrendCard } from '@/components/analytics/MarketTrendCard';
import { IconButton } from '@/components/ui/IconButton';
import { StateView } from '@/components/ui/StateView';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { useAnalyticsCache, useAnalyticsCacheInvalidation } from '@/hooks/useAnalyticsCache';
import { SyncStatus } from '@/hooks/useSync';
import { useUserRole } from '@/hooks/useUserRole';
import { db } from '@/lib/db';
import { useMarkets, useProducts } from '@/lib/db/hooks';
import {
  getActiveDealEventsForMarkets,
  getActiveInteractionEventsForMarkets,
} from '@/lib/events/active-event-service';
import { buildActionableAnalytics } from '@/lib/analytics/actionable-insights';
import { buildMarketRecapReport } from '@/lib/analytics/market-recap';
import { buildMarketTrend } from '@/lib/analytics/market-trend';
import {
  clearMetricsCache,
} from '@/lib/analytics/metrics-engine';
import {
  EMPTY_MARKET_METRICS_VIEW_MODEL,
  loadMarketMetricsViewModel,
  type MarketMetricsViewModel,
} from '@/lib/analytics/market-metrics-view-model';
import {
  calculateTopProductsFromEvents,
  createEmptyTopProductsResult,
  type TopProductsResult,
} from '@/lib/analytics/top-products';
import { getDataReliability } from '@/lib/analytics/unlock-logic';
import { useSyncContext } from '@/lib/sync-context';
import { useAuth } from '@/lib/supabase/auth-context';
import { getGradientClass } from '@/lib/theme-config';
import type { DailyStats, Event } from '@/types/db';
import type { ProductPair } from '@/lib/analytics/types';

const DailyRevenueChart = dynamic(
  () => import('@/components/analytics/DailyRevenueChart').then(module => module.DailyRevenueChart),
  { ssr: false },
);

const TopProductsCard = dynamic(
  () => import('@/components/analytics/TopProductsCard').then(module => module.TopProductsCard),
  { ssr: false },
);

const ProductAffinityCard = dynamic(
  () => import('@/components/analytics/ProductAffinityCard').then(module => module.ProductAffinityCard),
  { ssr: false },
);

const AdvancedAnalyticsSection = dynamic(
  () => import('@/components/analytics/AdvancedAnalyticsSection').then(module => module.AdvancedAnalyticsSection),
  {
    ssr: false,
    loading: () => <StateView title="正在整理進階指標" description="這些比較只會在開啟進階頁籤時運算。" />,
  },
);

type AnalyticsTab = 'summary' | 'trends' | 'products' | 'advanced';

interface QueryResult<T> {
  data: T;
  error: string | null;
}

interface SummaryQueryData {
  events: Event[];
  dailyStats: DailyStats[];
}

const ANALYTICS_ROLE_BLOCKED_OWNER_ID = '__analytics_role_blocked__';

const ANALYTICS_TABS: readonly TabItem<AnalyticsTab>[] = [
  { id: 'summary', label: '摘要' },
  { id: 'trends', label: '趨勢' },
  { id: 'products', label: '商品' },
  { id: 'advanced', label: '進階' },
];

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '資料整理失敗';
}

function hasTopProductData(result: TopProductsResult): boolean {
  return Boolean(result.topByQuantity || result.topByRevenue || result.topByProfit);
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isStaff, isLoading: isRoleLoading, roleError } = useUserRole();
  const { status: syncStatus, pendingCount } = useSyncContext();
  const { clearAllCache } = useAnalyticsCache();
  const [dateRange, setDateRange] = useState<AnalyticsRange>('all');
  const [selectedMarketId, setSelectedMarketId] = useState('');
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('summary');
  const [refreshRevision, setRefreshRevision] = useState(0);
  const [isRecalculating, setIsRecalculating] = useState(false);

  useAnalyticsCacheInvalidation();

  const todayString = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const currentOwnerId = !isRoleLoading && !roleError && !isStaff ? user?.id : undefined;
  const scopedOwnerId = currentOwnerId ?? ANALYTICS_ROLE_BLOCKED_OWNER_ID;
  const allMarkets = useMarkets({ ownerId: scopedOwnerId });
  const products = useProducts({ ownerId: scopedOwnerId });

  const selectableMarkets = useMemo(() => allMarkets
    .filter(market => {
      if (market.status === 'cancelled' || market.isDeleted) return false;
      const dates = market.dates?.length ? market.dates : [market.startDate];
      return dates.some(date => date <= todayString);
    })
    .sort((left, right) => right.startDate.localeCompare(left.startDate)), [allMarkets, todayString]);

  const markets = useMemo(() => {
    if (dateRange === 'recent3') return selectableMarkets.slice(0, 3);
    if (dateRange === 'recent10') return selectableMarkets.slice(0, 10);
    if (dateRange === 'single') return selectableMarkets.filter(market => market.id === selectedMarketId);
    return selectableMarkets;
  }, [dateRange, selectableMarkets, selectedMarketId]);

  useEffect(() => {
    if (dateRange !== 'single') return;
    if (selectedMarketId && selectableMarkets.some(market => market.id === selectedMarketId)) return;
    setSelectedMarketId(selectableMarkets[0]?.id ?? '');
  }, [dateRange, selectableMarkets, selectedMarketId]);

  const { startDate, endDate } = useMemo(() => {
    const dates = markets.flatMap(market => market.dates?.length
      ? market.dates
      : [market.startDate, market.endDate]);
    if (dates.length === 0) return { startDate: todayString, endDate: todayString };
    return {
      startDate: dates.reduce((earliest, date) => date < earliest ? date : earliest, dates[0]),
      endDate: dates.reduce((latest, date) => date > latest ? date : latest, dates[0]),
    };
  }, [markets, todayString]);

  const marketIds = useMemo(
    () => markets.flatMap(market => market.id ? [market.id] : []),
    [markets],
  );
  const marketIdsKey = marketIds.join('|');
  const productNameKey = products.map(product => `${product.id}:${product.name}`).join('|');
  const validMarketCount = useMemo(
    () => markets.filter(market => (market.totalRevenue ?? 0) > 0).length,
    [markets],
  );
  const reliability = useMemo(() => getDataReliability(validMarketCount), [validMarketCount]);
  const needsMetrics = activeTab === 'summary' || activeTab === 'advanced';

  const metricsResult = useLiveQuery<QueryResult<MarketMetricsViewModel>>(async () => {
    if (!needsMetrics || markets.length === 0) {
      return { data: EMPTY_MARKET_METRICS_VIEW_MODEL, error: null };
    }
    try {
      return { data: await loadMarketMetricsViewModel(markets, db), error: null };
    } catch (error) {
      console.error('分析核心指標失敗:', error);
      return { data: EMPTY_MARKET_METRICS_VIEW_MODEL, error: toErrorMessage(error) };
    }
  }, [needsMetrics, marketIdsKey, refreshRevision]);

  const summaryResult = useLiveQuery<QueryResult<SummaryQueryData>>(async () => {
    if (activeTab !== 'summary' || marketIds.length === 0) {
      return { data: { events: [], dailyStats: [] }, error: null };
    }
    try {
      const marketIdSet = new Set(marketIds);
      const [deals, interactions, stats] = await Promise.all([
        getActiveDealEventsForMarkets(marketIdSet),
        getActiveInteractionEventsForMarkets(marketIdSet),
        db.dailyStats.where('date').between(startDate, endDate, true, true).toArray(),
      ]);
      return {
        data: {
          events: [...deals, ...interactions] as Event[],
          dailyStats: stats.filter(stat => stat.marketId && marketIdSet.has(stat.marketId)),
        },
        error: null,
      };
    } catch (error) {
      console.error('分析摘要資料失敗:', error);
      return { data: { events: [], dailyStats: [] }, error: toErrorMessage(error) };
    }
  }, [activeTab, marketIdsKey, startDate, endDate, refreshRevision]);

  const dailyRevenueResult = useLiveQuery<QueryResult<Map<string, number>>>(async () => {
    if (activeTab !== 'trends' || markets.length === 0) return { data: new Map(), error: null };
    try {
      const { calculateDailyRevenue } = await import('@/lib/analytics/product-affinity-engine');
      return { data: await calculateDailyRevenue(markets, db, startDate, endDate), error: null };
    } catch (error) {
      console.error('每日收入趨勢失敗:', error);
      return { data: new Map(), error: toErrorMessage(error) };
    }
  }, [activeTab, marketIdsKey, startDate, endDate, refreshRevision]);

  const topProductsResult = useLiveQuery<QueryResult<TopProductsResult>>(async () => {
    if (activeTab !== 'products' || marketIds.length === 0) {
      return { data: createEmptyTopProductsResult(), error: null };
    }
    try {
      const marketIdSet = new Set(marketIds);
      const activeDeals = await getActiveDealEventsForMarkets(marketIdSet);
      const productNames = new Map<string, string>(products.flatMap(product => (
        product.id ? [[product.id, product.name] as [string, string]] : []
      )));
      return {
        data: await calculateTopProductsFromEvents(
          activeDeals,
          marketIdSet,
          async productId => productNames.get(productId),
        ),
        error: null,
      };
    } catch (error) {
      console.error('商品排行分析失敗:', error);
      return { data: createEmptyTopProductsResult(), error: toErrorMessage(error) };
    }
  }, [activeTab, marketIdsKey, productNameKey, refreshRevision]);

  const affinityResult = useLiveQuery<QueryResult<ProductPair[]>>(async () => {
    if (activeTab !== 'products' || validMarketCount < 15) return { data: [], error: null };
    try {
      const { calculateProductAffinity } = await import('@/lib/analytics/product-affinity-engine');
      return { data: await calculateProductAffinity(markets, db), error: null };
    } catch (error) {
      console.error('商品關聯分析失敗:', error);
      return { data: [], error: toErrorMessage(error) };
    }
  }, [activeTab, marketIdsKey, validMarketCount, refreshRevision]);

  const analyticsInput = useMemo(() => ({
    markets,
    events: summaryResult?.data.events ?? [],
    dailyStats: summaryResult?.data.dailyStats ?? [],
    products,
  }), [markets, products, summaryResult]);
  const actionableAnalytics = useMemo(() => buildActionableAnalytics(analyticsInput), [analyticsInput]);
  const marketRecap = useMemo(() => buildMarketRecapReport(analyticsInput), [analyticsInput]);
  const marketTrend = useMemo(() => buildMarketTrend(markets), [markets]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      clearAllCache();
      clearMetricsCache();
      setRefreshRevision(revision => revision + 1);
      toast.success('分析資料已重新整理');
    } catch (error) {
      console.error('重新整理分析失敗:', error);
      toast.error('重新整理失敗，請稍後再試');
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isRoleLoading) {
    return <StateView className="mx-auto mt-20 max-w-xl" title="正在確認分析權限" description="完成後會載入你的營運資料。" />;
  }

  if (roleError || isStaff) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
        <StateView
          className="w-full"
          icon={<ShieldAlert className="h-5 w-5" aria-hidden="true" />}
          title="分析功能僅限老闆使用"
          description="分析包含營收、成本與利潤資料，員工帳號不會載入這些內容。"
        />
      </main>
    );
  }

  const isPotentiallyStale = pendingCount > 0
    || syncStatus === SyncStatus.ERROR
    || syncStatus === SyncStatus.OFFLINE;

  return (
    <div className="min-h-screen bg-background">
      <header className={`${getGradientClass(false)} border-b border-white/15 px-5 pb-7 pt-[calc(1.5rem+env(safe-area-inset-top))] text-white`}>
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/80">營運決策</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
              <BarChart3 className="h-6 w-6" aria-hidden="true" />
              分析
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {!isStaff && !isRoleLoading && !roleError && (
              <IconButton
                label="開啟結算報告"
                tooltip="結算報告"
                tone="inverse"
                icon={<FileText className="h-5 w-5" aria-hidden="true" />}
                onClick={() => router.push('/reports/settlement')}
              />
            )}
            <IconButton
              label="重新整理分析"
              tooltip="重新整理"
              tone="inverse"
              disabled={isRecalculating}
              icon={<RefreshCw className={`h-5 w-5 ${isRecalculating ? 'animate-spin' : ''}`} aria-hidden="true" />}
              onClick={() => void handleRecalculate()}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
        <DateRangeFilter
          value={dateRange}
          onChange={setDateRange}
          markets={selectableMarkets}
          selectedMarketId={selectedMarketId}
          onMarketChange={setSelectedMarketId}
        />

        {isPotentiallyStale && (
          <section className="mt-4 flex items-start gap-3 rounded-card border border-status-warn-border bg-status-warn-bg px-4 py-3 text-sm">
            <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-status-warn-text" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">目前顯示這台裝置的資料</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {pendingCount > 0 ? `${pendingCount} 筆變更仍在等待同步，` : ''}連線恢復後數字可能更新。
              </p>
            </div>
          </section>
        )}

        <Tabs
          className="mt-5"
          items={ANALYTICS_TABS}
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel="分析內容"
        />

        {markets.length === 0 ? (
          <StateView
            className="mt-5"
            icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
            title="目前範圍沒有可分析的市集"
            description="調整分析範圍，或完成第一場市集的營運紀錄。"
          />
        ) : (
          <div className="mt-5">
            {activeTab === 'summary' && (
              summaryResult === undefined || metricsResult === undefined ? (
                <StateView title="正在整理摘要" description="只會讀取目前範圍內的成交、互動與統計資料。" />
              ) : summaryResult.error || metricsResult.error ? (
                <StateView
                  icon={<AlertCircle className="h-5 w-5" aria-hidden="true" />}
                  title="摘要暫時無法完成"
                  description={summaryResult.error ?? metricsResult.error ?? undefined}
                />
              ) : (
                <div className="space-y-5">
                  <section className={`rounded-card border px-4 py-3 ${
                    reliability.level === 'high'
                      ? 'border-status-good-border bg-status-good-bg'
                      : reliability.level === 'medium'
                        ? 'border-status-warn-border bg-status-warn-bg'
                        : 'border-primary/10 bg-white'
                  }`}>
                    <p className="text-sm font-semibold text-foreground">{reliability.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{reliability.description}，目前包含 {validMarketCount} 場有效市集。</p>
                  </section>
                  {dateRange === 'single'
                    ? <MarketRecapCard report={marketRecap} />
                    : <ActionableInsightsCard result={actionableAnalytics} />}
                  <AnalyticsSummaryHighlights viewModel={metricsResult.data} />
                </div>
              )
            )}

            {activeTab === 'trends' && (
              <div className="space-y-5">
                <MarketTrendCard trend={marketTrend} />
                {dailyRevenueResult === undefined ? (
                  <StateView title="正在整理每日趨勢" />
                ) : dailyRevenueResult.error ? (
                  <StateView title="每日趨勢暫時無法完成" description={dailyRevenueResult.error} />
                ) : (
                  <DailyRevenueChart revenueMap={dailyRevenueResult.data} startDate={startDate} endDate={endDate} />
                )}
              </div>
            )}

            {activeTab === 'products' && (
              topProductsResult === undefined ? (
                <StateView title="正在整理商品表現" />
              ) : topProductsResult.error ? (
                <StateView title="商品分析暫時無法完成" description={topProductsResult.error} />
              ) : !hasTopProductData(topProductsResult.data) ? (
                <StateView
                  icon={<PackageSearch className="h-5 w-5" aria-hidden="true" />}
                  title="尚無商品層級銷售資料"
                  description="成交時選擇售出商品後，這裡會顯示銷量、營收與利潤排行。"
                />
              ) : (
                <div className="space-y-5">
                  <TopProductsCard
                    topByQuantity={topProductsResult.data.topByQuantity}
                    topByRevenue={topProductsResult.data.topByRevenue}
                    topByProfit={topProductsResult.data.topByProfit}
                  />
                  {validMarketCount < 15 ? (
                    <AdvancedAnalysisGate
                      title="商品關聯需要更多場次"
                      description="目前先顯示可靠的單品排行，累積更多市集後再比較商品搭配。"
                      requirement={`目前 ${validMarketCount} 場，累積 15 場後開放商品關聯。`}
                    />
                  ) : affinityResult === undefined ? (
                    <StateView title="正在整理商品關聯" />
                  ) : affinityResult.error ? (
                    <StateView title="商品關聯暫時無法完成" description={affinityResult.error} />
                  ) : (
                    <ProductAffinityCard pairs={affinityResult.data} isLoading={false} />
                  )}
                </div>
              )
            )}

            {activeTab === 'advanced' && (
              metricsResult === undefined ? (
                <StateView title="正在整理進階指標" description="核心指標只會計算一次，再供評分與象限共用。" />
              ) : metricsResult.error ? (
                <StateView title="進階分析暫時無法完成" description={metricsResult.error} />
              ) : (
                <AdvancedAnalyticsSection viewModel={metricsResult.data} validMarketCount={validMarketCount} />
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
