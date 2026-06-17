'use client';

import { useState, useMemo, Fragment, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, TrendingUp, XCircle, AlertTriangle, CheckCircle, Lightbulb, BarChart3, DollarSign, Timer, Calculator, type LucideIcon } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { useMarkets, useProducts } from '@/lib/db/hooks';
import { useAuth } from '@/lib/supabase/auth-context';
import { useUserRole } from '@/hooks/useUserRole';
import { db } from '@/lib/db';
import {
  getActiveDealEventsForMarkets,
  getActiveInteractionEventsForMarkets,
} from '@/lib/events/active-event-service';
import { DateRangeFilter, type AnalyticsRange } from '@/components/analytics/DateRangeFilter';
import { ActionableInsightsCard } from '@/components/analytics/ActionableInsightsCard';
import { MarketRecapCard } from '@/components/analytics/MarketRecapCard';
import { MarketTrendCard } from '@/components/analytics/MarketTrendCard';
import { AdvancedAnalysisGate } from '@/components/analytics/AdvancedAnalysisGate';
import { EmptyState } from '@/components/analytics/EmptyState';
import { MarketROICard } from '@/components/analytics/MarketROICard';
import { MarketAOVCard } from '@/components/analytics/MarketAOVCard';
import { TopProductsCard } from '@/components/analytics/TopProductsCard';
import { KPICards } from '@/components/analytics/KPICards';
import { QuadrantGrid } from '@/components/analytics/QuadrantGrid';
import { ProductAffinityCard } from '@/components/analytics/ProductAffinityCard';
import { DailyRevenueChart } from '@/components/analytics/DailyRevenueChart';
import { MetricGuide } from '@/components/analytics/MetricGuide';
import { MarketHealthScoreCard } from '@/components/analytics/MarketHealthScoreCard';
import { useAnalyticsCacheInvalidation, useAnalyticsCache } from '@/hooks/useAnalyticsCache';
import {
  calculateQuadrants,
  calculateProductAffinity,
  calculateDailyRevenue,
  calculateHealthScores,
  calculateMarketMetrics,
  buildMarketOverview,
  getDataReliability,
} from '@/lib/analytics';
import { UnlockGuard } from '@/components/analytics/UnlockGuard';
import { StaffModeNotice } from '@/components/staff/StaffModeNotice';
import { buildActionableAnalytics } from '@/lib/analytics/actionable-insights';
import { buildMarketRecapReport } from '@/lib/analytics/market-recap';
import { buildMarketTrend } from '@/lib/analytics/market-trend';
import { calculateTopProductsFromEvents, createEmptyTopProductsResult } from '@/lib/analytics/top-products';
import type { Event, Market } from '@/types/db';
import type { ProductPair, MarketHealthScore } from '@/lib/analytics';

/**
 * 數據分析頁面
 * 
 * 功能：這場市集值不值得再來？
 * - 日期範圍篩選（預設本月、可自訂區間）
 * - 計算單場淨利、每小時淨利、攤位費回收率
 * - 按每小時淨利排序，次排序攤位費回收率
 * - 顯示前三名市集卡片
 */
export default function AnalyticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { userRole, isStaff, isLoading: isRoleLoading, roleError } = useUserRole();
  const [dateRange, setDateRange] = useState<AnalyticsRange>('all');
  const [selectedMarketId, setSelectedMarketId] = useState<string>('');
  const [showInfoTooltip, setShowInfoTooltip] = useState(false); // ✅ 控制ROI說明提示框
  const [showAOVInfoTooltip, setShowAOVInfoTooltip] = useState(false); // ✅ 控制客單價說明提示框
  const hasShownEmptyToast = useRef(false); // ✅ 追蹤是否已顯示過空狀態提示
  const [mode, setMode] = useState<'quick' | 'advanced'>('quick'); // ✅ 分析模式
  const [isRecalculating, setIsRecalculating] = useState(false); // ✅ 重新計算狀態
  
  // 🔥 監聽補登操作，自動清除快取
  useAnalyticsCacheInvalidation();
  
  // 🔥 快取管理
  const { clearAllCache } = useAnalyticsCache();

  const todayString = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // ✅ 根據用戶身份過濾市集（權限控制）
  const currentOwnerId = isStaff ? userRole.ownerId : user?.id;
  
  const allMarkets = useMarkets({
    ownerId: currentOwnerId,  // ✅ 根據擁有者 ID 過濾
  });
  
  // 篩選日期範圍內的市集
  const products = useProducts({
    ownerId: currentOwnerId,
  });

  const selectableMarkets = useMemo(() => {
    if (!allMarkets) return [];
    return allMarkets
      .filter(market => {
      if (market.status === 'cancelled') return false;

      if (market.dates && market.dates.length > 0) {
        return market.dates.some(date => date <= todayString);
      }

      return market.startDate <= todayString;
    })
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [allMarkets, todayString]);

  const markets = useMemo(() => {
    switch (dateRange) {
      case 'recent3':
        return selectableMarkets.slice(0, 3);
      case 'recent10':
        return selectableMarkets.slice(0, 10);
      case 'single':
        return selectableMarkets.filter(market => market.id === selectedMarketId);
      case 'all':
        return selectableMarkets;
    }
  }, [dateRange, selectableMarkets, selectedMarketId]);

  useEffect(() => {
    if (dateRange !== 'single') return;
    if (selectedMarketId && selectableMarkets.some(market => market.id === selectedMarketId)) return;
    const firstMarket = selectableMarkets[0];
    if (firstMarket?.id) {
      setSelectedMarketId(firstMarket.id);
    }
  }, [dateRange, selectableMarkets, selectedMarketId]);

  const { startDate, endDate } = useMemo(() => {
    if (markets.length === 0) {
      return { startDate: todayString, endDate: todayString };
    }

    const marketDates = markets.flatMap((market) => {
      if (market.dates && market.dates.length > 0) return market.dates;
      return [market.startDate, market.endDate];
    });

    return {
      startDate: marketDates.reduce((earliest, date) => date < earliest ? date : earliest, marketDates[0]),
      endDate: marketDates.reduce((latest, date) => date > latest ? date : latest, marketDates[0]),
    };
  }, [markets, todayString]);

  // ✅ 全域空狀態處理：當無市集數據時顯示一次性提示
  useEffect(() => {
    if (markets.length === 0 && !hasShownEmptyToast.current) {
      toast.info('目前範圍內尚無市集數據', {
        description: '調整分析範圍或建立新市集開始記錄',
        duration: 4000,
      });
      hasShownEmptyToast.current = true;
    } else if (markets.length > 0) {
      // 重置標記，當有數據後再次變為空時可以再次提示
      hasShownEmptyToast.current = false;
    }
  }, [markets.length]);

  // 🔥 處理重新計算
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    
    try {
      // 1. 清除所有快取
      clearAllCache();
      
      // 2. 顯示提示
      toast.loading('正在清除快取並重新計算...', {
        id: 'recalculate',
      });
      
      // 3. 等待一小段時間讓 UI 更新
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 4. 強制重新計算（透過重新渲染觸發）
      // React 會自動重新執行所有 useMemo 和 useLiveQuery
      
      // 5. 顯示成功提示
      toast.success('快取已清除，數據已重新計算', {
        id: 'recalculate',
        duration: 3000,
      });
    } catch (error) {
      console.error('重新計算失敗:', error);
      toast.error('重新計算失敗，請稍後再試', {
        id: 'recalculate',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  // 計算市集 ROI 數據
  interface MarketROIData {
    market: Market;
    netProfit: number;
    hourlyProfit: number;
    boothROI: number;
    operatingHours: number;
  }

  const marketROIData = useMemo(() => {
    if (!markets || markets.length === 0) return [];

    const data: MarketROIData[] = markets.map(market => {
      // A. 計算單場淨利（扣除攤位費和設備費用）
      const totalRevenue = market.totalRevenue || 0;
      const totalProfit = market.totalProfit || 0; // 這是扣除商品成本後的利潤
      const boothCost = market.boothCost || 0;
      const registrationFee = market.registrationFee || 0;
      
      // 設備租金
      const tableRental = market.tableFree ? 0 : (market.tableRental || 0);
      const chairRental = market.chairFree ? 0 : (market.chairRental || 0);
      const umbrellaRental = market.umbrellaFree ? 0 : (market.umbrellaRental || 0);
      const rentals = tableRental + chairRental + umbrellaRental;
      
      // 抽成
      const commission = (totalRevenue * (market.commissionRate || 0)) / 100;
      
      // ✅ 淨利潤 = 總利潤 - 攤位費 - 報名費 - 設備租金 - 抽成
      const netProfit = totalProfit - boothCost - registrationFee - rentals - commission;
      
      // B. 計算營業時長（小時）- ✅ 多天市集需要疊加
      let operatingHours = 0;
      if (market.operatingStartTime && market.operatingEndTime) {
        const [startHour, startMinute] = market.operatingStartTime.split(':').map(Number);
        const [endHour, endMinute] = market.operatingEndTime.split(':').map(Number);
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        const dailyHours = (endMinutes - startMinutes) / 60;
        
        // ✅ 計算市集天數
        let days = 1;
        
        // 優先使用 dates 陣列（多選日期）
        if (market.dates && market.dates.length > 0) {
          days = market.dates.length;
        } else {
          // 降級：使用 startDate 和 endDate 計算天數（連續日期，向後兼容）
          const startDate = new Date(market.startDate);
          const endDate = new Date(market.endDate);
          days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
        
        operatingHours = dailyHours * days;
      }
      
      // 每小時淨利
      const hourlyProfit = operatingHours > 0 ? netProfit / operatingHours : 0;
      
      // C. 攤位費回收率 = 總收入 ÷ (攤位費 + 設備租賃費) × 100%
      const totalFixedCost = boothCost + rentals;
      const boothROI = totalFixedCost > 0 ? (totalRevenue / totalFixedCost) * 100 : 0;
      
      return {
        market,
        netProfit,
        hourlyProfit,
        boothROI,
        operatingHours,
      };
    });

    // ✅ 過濾掉淨利潤或每小時淨利為負值的市集
    const filteredData = data.filter(item => item.netProfit >= 0 && item.hourlyProfit >= 0);

    // 排序：先按每小時淨利降序，再按攤位費回收率降序
    return filteredData.sort((a, b) => {
      if (b.hourlyProfit !== a.hourlyProfit) {
        return b.hourlyProfit - a.hourlyProfit;
      }
      return b.boothROI - a.boothROI;
    });
  }, [markets]);

  // ✅ 新增：計算客單價數據
  interface MarketAOVData {
    market: Market;
    averageOrderValue: number;
    totalRevenue: number;
    totalDeals: number;
  }

  const marketAOVData = useMemo(() => {
    if (!markets || markets.length === 0) return [];

    const data: MarketAOVData[] = markets
      .filter(market => (market.totalDeals || 0) > 0) // 只包含有成交的市集
      .map(market => {
        const totalRevenue = market.totalRevenue || 0;
        const totalDeals = market.totalDeals || 0;
        const averageOrderValue = totalDeals > 0 ? totalRevenue / totalDeals : 0;
        
        return {
          market,
          averageOrderValue,
          totalRevenue,
          totalDeals,
        };
      });

    // 排序：按客單價降序
    return data.sort((a, b) => b.averageOrderValue - a.averageOrderValue);
  }, [markets]);

  // ✅ 新增：計算象限數據（使用 useMemo 優化性能，包含邏輯判斷）
  const quadrantData = useLiveQuery(async () => {
    if (!markets || markets.length === 0) {
      return {
        stars: [],
        potentials: [],
        precisies: [],
        observables: [],
        averages: {
          avgInteractions: 0,
          avgConversionRate: 0,
        },
        isEmpty: true,
      };
    }

    // 🔥 使用新架構：先計算 metrics，再計算象限
    const marketMetrics = [];
    for (const market of markets) {
      const metrics = await calculateMarketMetrics(market, { db, allMarkets: markets });
      marketMetrics.push({
        market,
        metrics,
      });
    }
    
    return calculateQuadrants(marketMetrics);
  }, [markets]);

  // ✅ 新增：計算市集健康評分（過濾負值）
  const marketHealthScores = useLiveQuery(async () => {
    if (!markets || markets.length === 0) return [];
    
    // 🔥 使用新架構：先計算 metrics，再計算健康評分
    const marketMetrics = [];
    for (const market of markets) {
      const metrics = await calculateMarketMetrics(market, { db, allMarkets: markets });
      
      // ✅ 只包含淨利潤和每小時淨利為正值的市集
      if (metrics.netProfit >= 0 && metrics.hourlyProfit >= 0) {
        marketMetrics.push({
          marketId: market.id!,
          metrics,
        });
      }
    }
    
    return calculateHealthScores(marketMetrics);
  }, [markets]);

  // ✅ 新增：計算市集總覽（取第一名市集）
  const topMarketOverview = useLiveQuery(async () => {
    if (!markets || markets.length === 0) return null;
    
    // 取得評分最高的市集
    const marketMetrics = [];
    for (const market of markets) {
      const metrics = await calculateMarketMetrics(market, { db, allMarkets: markets });
      marketMetrics.push({
        marketId: market.id!,
        metrics,
      });
    }
    
    const scores = calculateHealthScores(marketMetrics);
    if (scores.length === 0) return null;
    
    const topScore = scores.sort((a, b) => b.healthScore - a.healthScore)[0];
    const topMarket = markets.find(m => m.id === topScore.marketId);
    
    if (!topMarket) return null;
    
    return await buildMarketOverview(topMarket, { db, allMarkets: markets });
  }, [markets]);

  // ✅ 新增：計算商品親和力（使用 useLiveQuery 確保與 Dexie 同步）
  const affinityPairs = useLiveQuery(async () => {
    if (!markets || markets.length === 0) {
      return [];
    }

    try {
      return await calculateProductAffinity(markets, db);
    } catch (error) {
      console.error('計算商品親和力失敗:', error);
      return [];
    }
  }, [markets]) as ProductPair[] | undefined;

  // ✅ 新增：計算每日收入數據（使用 useLiveQuery）
  const dailyRevenueData = useLiveQuery(async () => {
    if (!markets || markets.length === 0) {
      return new Map<string, number>();
    }

    try {
      return await calculateDailyRevenue(markets, db, startDate, endDate);
    } catch (error) {
      console.error('計算每日收入失敗:', error);
      return new Map<string, number>();
    }
  }, [markets, startDate, endDate]);

  // ✅ 新增：計算商品排行數據
  const topProductsData = useLiveQuery(async () => {
    if (!markets || markets.length === 0) {
      return createEmptyTopProductsResult();
    }

    const marketIds = new Set(markets.map(market => market.id).filter((id): id is string => !!id));
    const activeDeals = await getActiveDealEventsForMarkets(marketIds);

    return calculateTopProductsFromEvents(
      activeDeals,
      marketIds,
      async (productId) => {
        const product = await db.products.get(productId);
        return product?.name;
      }
    );
  }, [markets]);

  // 檢查是否有數據
  const analyticsEvents = useLiveQuery(async () => {
    const marketIds = new Set(markets.map((market) => market.id).filter((id): id is string => !!id));
    if (marketIds.size === 0) return [];

    const [activeDeals, activeInteractions] = await Promise.all([
      getActiveDealEventsForMarkets(marketIds),
      getActiveInteractionEventsForMarkets(marketIds),
    ]);

    return [...activeDeals, ...activeInteractions] as Event[];
  }, [markets]);

  const analyticsDailyStats = useLiveQuery(async () => {
    const marketIds = new Set(markets.map((market) => market.id).filter(Boolean));
    if (marketIds.size === 0) return [];

    const stats = await db.dailyStats.where('date').between(startDate, endDate, true, true).toArray();
    return stats.filter((stat) => stat.marketId && marketIds.has(stat.marketId));
  }, [markets, startDate, endDate]);

  const analyticsInput = useMemo(() => ({
    markets,
    events: analyticsEvents ?? [],
    dailyStats: analyticsDailyStats ?? [],
    products,
  }), [markets, analyticsEvents, analyticsDailyStats, products]);
  const actionableAnalytics = useMemo(() => buildActionableAnalytics(analyticsInput), [analyticsInput]);
  const marketRecap = useMemo(() => buildMarketRecapReport(analyticsInput), [analyticsInput]);
  const marketTrend = useMemo(() => buildMarketTrend(markets), [markets]);
  const analyticsCapabilities = actionableAnalytics.dataCompleteness.capabilities;

  const hasData = marketROIData.length > 0;

  // 🔥 計算有效市集數量（用於解鎖邏輯和可信度計算）
  // 基於當前日期範圍內，只計算有收入的市集（排除未來預先輸入的市集）
  const validMarketCount = useMemo(() => {
    if (!markets || markets.length === 0) return 0;
    return markets.filter(market => {
      // 排除已取消的市集
      if (market.status === 'cancelled') return false;
      // 只計算有收入的市集
      return (market.totalRevenue || 0) > 0;
    }).length;
  }, [markets]); // 注意：依賴 markets（已經過濾日期範圍）
  
  // 🔥 取得數據可信度（基於當前日期範圍內的有效市集數量）
  const dataReliability = useMemo(() => {
    return getDataReliability(validMarketCount);
  }, [validMarketCount]);

  // 數據可信度 icon 對照（lib 層只回傳語意 key，UI 層決定實際 icon）
  const reliabilityIconMap: Record<'insufficient' | 'medium' | 'high', LucideIcon> = {
    insufficient: XCircle,
    medium: AlertTriangle,
    high: CheckCircle,
  };
  const ReliabilityIcon = reliabilityIconMap[dataReliability.iconKey];

  // ✅ 角色守衛（RoleGuard）已由 layout 級別統一處理（C2.28B）
  //   - 這裡不需要再寫 if (isRoleLoading || roleError) return <RoleLoadingFallback />
  //   - 到這層時角色必定已載入
  //   - fail-closed 仍由 useUserRole 的 deriveRolePermissions 提供雙層保護

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-medium text-white opacity-90">數據分析</h1>
            <div className="flex items-center gap-2">
              {/* 重新計算按鈕 */}
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-full transition-all flex items-center gap-2"
                aria-label="重新計算"
              >
                <svg 
                  className={`w-4 h-4 text-white ${isRecalculating ? 'animate-spin' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
                <span className="text-white text-sm font-medium">
                  {isRecalculating ? '計算中' : '更新'}
                </span>
              </button>
              
              <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full">
                <BarChart3 className="w-4 h-4 text-white" strokeWidth={1.75} aria-label="分析" />
              </div>
            </div>
          </div>
          
          <p className="text-white/80 text-sm">
            依照你的紀錄完整度，整理可採取的下一步建議。
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        <StaffModeNotice className="mb-4" />

        {/* 日期範圍篩選器 */}
        <div className="mb-6">
          <DateRangeFilter 
            value={dateRange} 
            onChange={setDateRange}
            markets={selectableMarkets}
            selectedMarketId={selectedMarketId}
            onMarketChange={setSelectedMarketId}
          />
        </div>

        {/* 模式切換器 */}
        <div className="bg-white rounded-[1.5rem] p-2 shadow-md shadow-primary/10 mb-6 flex gap-2">
          <button
            onClick={() => setMode('quick')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
              mode === 'quick'
                ? 'bg-gradient-to-r from-primary to-primary/85 text-white shadow-md'
                : 'text-muted-foreground hover:bg-[#F5F5F3]'
            }`}
          >
            重點建議
          </button>
          <button
            onClick={() => setMode('advanced')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
              mode === 'advanced'
                ? 'bg-gradient-to-r from-primary to-primary/85 text-white shadow-md'
                : 'text-muted-foreground hover:bg-[#F5F5F3]'
            }`}
          >
            進階分析
          </button>
        </div>

        {mode === 'advanced' && (
          <div className="bg-[#F5F5F3] border border-primary/15 rounded-[1.25rem] p-4 mb-6">
            <p className="text-sm font-medium text-foreground mb-1">進階分析是輔助判斷</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              下方圖表適合用來檢查細節；主要決策仍建議先看行動建議與市集回顧。
            </p>
          </div>
        )}

        {/* 🔥 數據可信度標籤 */}
        <div className={`rounded-[1.5rem] p-4 mb-6 ${
          dataReliability.level === 'insufficient' 
            ? 'bg-red-50 border-2 border-red-200' 
            : dataReliability.level === 'medium'
            ? 'bg-yellow-50 border-2 border-yellow-200'
            : 'bg-green-50 border-2 border-green-200'
        }`}>
          <div className="flex items-center gap-3">
            <ReliabilityIcon className="w-6 h-6 text-muted-foreground" strokeWidth={1.75} />
            <div className="flex-1">
              <p className="font-medium text-foreground text-sm">
                {dataReliability.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {dataReliability.description} ({validMarketCount} 場有效市集)
              </p>
            </div>
          </div>
        </div>

        <ActionableInsightsCard result={actionableAnalytics} />
        <MarketRecapCard report={marketRecap} />
        <MarketTrendCard trend={marketTrend} />

        {hasData ? (
          <>
            {/* ✅ 市集總覽卡片（暫時註解） */}
            {/* {topMarketOverview && (
              <div className="bg-gradient-to-br from-white to-[#F5F5F3] rounded-[1.5rem] p-6 shadow-lg shadow-primary/10 mb-6 border-2 border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🟢</span>
                  <h2 className="text-xl font-medium text-foreground">
                    本場市集：{topMarketOverview.summaryLabel}
                  </h2>
                </div>

                <div className="bg-white rounded-xl p-4 mb-4 border border-primary/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">健康分數</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-primary">
                        {topMarketOverview.healthScore.toFixed(1)}
                      </span>
                      <span className="text-lg text-muted-foreground">/100</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-soft-green rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">人流品質</p>
                    <p className="text-sm font-semibold text-foreground">
                      {topMarketOverview.diagnosisType}
                    </p>
                  </div>

                  <div className="bg-soft-yellow rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">成交效率</p>
                    <p className="text-sm font-semibold text-foreground">
                      {topMarketOverview.keyStats.conversionRate.toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-soft-pink rounded-xl p-3">
                    <p className="text-xs text-muted-foreground mb-1">客單價</p>
                    <p className="text-sm font-semibold text-foreground">
                      ${topMarketOverview.keyStats.aov.toFixed(0)}
                    </p>
                  </div>
                </div>

                <div className="bg-primary/10 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">建議</p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {topMarketOverview.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )} */}

            {/* ✅ 最有價值市集（移到最上層，快速模式顯示） */}
            <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10 mb-6">
              {/* 標題與說明 */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-medium text-foreground">
                    最有價值市集
                  </h2>
                  {/* 說明燈泡按鈕 */}
                  <button
                    onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                    className="relative bg-soft-yellow hover:bg-[#FFE8C7] p-1.5 rounded-full transition-colors"
                    aria-label="查看說明"
                  >
                    <svg 
                      className="w-4 h-4 text-secondary" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 2a6 6 0 016 6v3.586l.707.707A1 1 0 0116 14h-1v1a3 3 0 11-6 0v-1H8a1 1 0 01-.707-1.707L8 11.586V8a6 6 0 016-6zM10 18a1 1 0 100-2 1 1 0 000 2z"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* 說明提示框（使用 Headless UI） */}
              <Transition appear show={showInfoTooltip} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setShowInfoTooltip(false)}>
                  {/* 背景遮罩 */}
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="fixed inset-0 bg-black/50" />
                  </Transition.Child>

                  {/* 彈窗容器 */}
                  <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-start justify-center p-4 pt-20">
                      <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                      >
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all border border-primary/10 relative">
                          {/* 關閉按鈕 */}
                          <button
                            onClick={() => setShowInfoTooltip(false)}
                            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="關閉"
                          >
                            <X className="w-5 h-5" />
                          </button>

                          <Dialog.Title className="font-medium text-foreground mb-4 text-lg pr-8 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-secondary" strokeWidth={1.75} />
                            市集投資回報分析
                          </Dialog.Title>
                          
                          {/* 三個指標說明 */}
                          <div className="space-y-4 mb-6">
                            {/* 1. 淨利潤 */}
                            <div className="bg-soft-green rounded-xl p-4">
                              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-primary" strokeWidth={1.75} />
                                淨利潤
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                <span className="font-medium text-foreground">計算方式：</span>
                                <br />
                                總利潤 - 攤位費 - 報名費 - 設備租金 - 抽成
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">意義：</span>扣除所有成本後的實際獲利
                              </p>
                            </div>

                            {/* 2. 每小時淨利 */}
                            <div className="bg-soft-yellow rounded-xl p-4">
                              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                <Timer className="w-4 h-4 text-secondary" strokeWidth={1.75} />
                                每小時淨利
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                <span className="font-medium text-foreground">計算方式：</span>
                                <br />
                                淨利潤 ÷ 總營業時數
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">意義：</span>時間效益指標，數值越高代表時間投資報酬越好
                              </p>
                            </div>

                            {/* 3. 回收率 */}
                            <div className="bg-soft-pink rounded-xl p-4">
                              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-secondary" strokeWidth={1.75} />
                                回收率
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                <span className="font-medium text-foreground">計算方式：</span>
                                <br />
                                總收入 ÷ (攤位費 + 設備租賃費) × 100%
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">意義：</span>固定成本回收倍數，200% 表示收入是成本的 2 倍
                              </p>
                            </div>
                          </div>

                          <div className="bg-primary/10 rounded-xl p-3 mb-4">
                            <p className="text-xs text-foreground leading-relaxed flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-secondary" strokeWidth={1.75} />
                              <span>
                                <span className="font-medium">排序規則：</span>
                                <br />
                                優先按「每小時淨利」排序，相同時再按「回收率」排序
                              </span>
                            </p>
                          </div>

                          <button
                            onClick={() => setShowInfoTooltip(false)}
                            className="w-full bg-primary text-white py-3 rounded-2xl hover:bg-primary/85 transition-colors font-medium"
                          >
                            知道了
                          </button>
                        </Dialog.Panel>
                      </Transition.Child>
                    </div>
                  </div>
                </Dialog>
              </Transition>

              {/* 前三名市集卡片（垂直排列） - 只顯示有效排名 */}
              {marketROIData.length > 0 ? (
                <div className="space-y-3">
                  {marketROIData.slice(0, 3).map((data, index) => (
                    <MarketROICard
                      key={data.market.id}
                      market={data.market}
                      rank={index + 1}
                      netProfit={data.netProfit}
                      hourlyProfit={data.hourlyProfit}
                      boothROI={data.boothROI}
                      operatingHours={data.operatingHours}
                    />
                  ))}
                  
                  {/* 如果少於3個市集，顯示提示 */}
                  {marketROIData.length < 3 && (
                    <div className="mt-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        目前僅有 {marketROIData.length} 場符合條件的市集數據
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    目前沒有獲利的市集數據
                  </p>
                </div>
              )}
            </div>

            {/* ✅ 客單價最高市集（移到最上層，快速模式顯示） */}
            {marketAOVData.length > 0 && (
              <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10 mb-6">
                {/* 標題與說明 */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-medium text-foreground">
                      客單價最高市集
                    </h2>
                    {/* 說明燈泡按鈕 */}
                    <button
                      onClick={() => setShowAOVInfoTooltip(!showAOVInfoTooltip)}
                      className="relative bg-soft-yellow hover:bg-[#FFE8C7] p-1.5 rounded-full transition-colors"
                      aria-label="查看說明"
                    >
                      <svg 
                        className="w-4 h-4 text-secondary" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 2a6 6 0 016 6v3.586l.707.707A1 1 0 0116 14h-1v1a3 3 0 11-6 0v-1H8a1 1 0 01-.707-1.707L8 11.586V8a6 6 0 016-6zM10 18a1 1 0 100-2 1 1 0 000 2z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 說明提示框（使用 Headless UI） */}
                <Transition appear show={showAOVInfoTooltip} as={Fragment}>
                  <Dialog as="div" className="relative z-50" onClose={() => setShowAOVInfoTooltip(false)}>
                    {/* 背景遮罩 */}
                    <Transition.Child
                      as={Fragment}
                      enter="ease-out duration-300"
                      enterFrom="opacity-0"
                      enterTo="opacity-100"
                      leave="ease-in duration-200"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <div className="fixed inset-0 bg-black/50" />
                    </Transition.Child>

                    {/* 彈窗容器 */}
                    <div className="fixed inset-0 overflow-y-auto">
                      <div className="flex min-h-full items-start justify-center p-4 pt-20">
                        <Transition.Child
                          as={Fragment}
                          enter="ease-out duration-300"
                          enterFrom="opacity-0 scale-95"
                          enterTo="opacity-100 scale-100"
                          leave="ease-in duration-200"
                          leaveFrom="opacity-100 scale-100"
                          leaveTo="opacity-0 scale-95"
                        >
                          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all border border-primary/10 relative">
                            {/* 關閉按鈕 */}
                            <button
                              onClick={() => setShowAOVInfoTooltip(false)}
                              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="關閉"
                            >
                              <X className="w-5 h-5" />
                            </button>

                            <Dialog.Title className="font-medium text-foreground mb-4 text-lg pr-8 flex items-center gap-2">
                              <Lightbulb className="w-5 h-5 text-secondary" strokeWidth={1.75} />
                              客單價分析
                            </Dialog.Title>
                            
                            {/* 客單價說明 */}
                            <div className="space-y-4 mb-6">
                              {/* 計算方式 */}
                              <div className="bg-soft-green rounded-xl p-4">
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                  <Calculator className="w-4 h-4 text-primary" strokeWidth={1.75} />
                                  計算方式
                                </h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  <span className="font-medium text-foreground">客單價 = 總收入 ÷ 成交數</span>
                                </p>
                              </div>

                              {/* 指標意義 */}
                              <div className="bg-soft-yellow rounded-xl p-4">
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                  <BarChart3 className="w-4 h-4 text-secondary" strokeWidth={1.75} />
                                  指標意義
                                </h4>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                  反映每筆交易的平均金額，是衡量顧客消費能力的重要指標。
                                </p>
                                <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                                  <li>• 客單價越高 → 顧客願意花更多錢</li>
                                  <li>• 可能原因：商品定價高、顧客購買多件、高價值商品受歡迎</li>
                                </ul>
                              </div>

                              {/* 實際範例 */}
                              <div className="bg-soft-pink rounded-xl p-4">
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                  <Lightbulb className="w-4 h-4 text-secondary" strokeWidth={1.75} />
                                  實際範例
                                </h4>
                                <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                                  <div className="bg-white rounded-lg p-3">
                                    <p className="font-medium text-foreground mb-1">市集 A</p>
                                    <p className="text-xs">總收入：$10,000 ÷ 成交數：50 筆</p>
                                    <p className="text-xs font-medium text-primary">→ 客單價：$200</p>
                                  </div>
                                  <div className="bg-white rounded-lg p-3">
                                    <p className="font-medium text-foreground mb-1">市集 B</p>
                                    <p className="text-xs">總收入：$10,000 ÷ 成交數：100 筆</p>
                                    <p className="text-xs font-medium text-secondary">→ 客單價：$100</p>
                                  </div>
                                  <p className="text-xs pt-2">
                                    市集 A 的客單價較高，表示顧客平均每次購買金額更多
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-primary/10 rounded-xl p-3 mb-4">
                              <p className="text-xs text-foreground leading-relaxed flex items-start gap-2">
                                <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-secondary" strokeWidth={1.75} />
                                <span>
                                  <span className="font-medium">提升客單價的方法：</span>
                                  <br />
                                  提高商品定價、推出組合優惠、引導顧客購買多件商品
                                </span>
                              </p>
                            </div>

                            <button
                              onClick={() => setShowAOVInfoTooltip(false)}
                              className="w-full bg-primary text-white py-3 rounded-2xl hover:bg-primary/85 transition-colors font-medium"
                            >
                              知道了
                            </button>
                          </Dialog.Panel>
                        </Transition.Child>
                      </div>
                    </div>
                  </Dialog>
                </Transition>

                {/* 前三名市集卡片（垂直排列） - 只顯示有效排名 */}
                {marketAOVData.length > 0 ? (
                  <div className="space-y-3">
                    {marketAOVData.slice(0, 3).map((data, index) => (
                      <MarketAOVCard
                        key={data.market.id}
                        market={data.market}
                        rank={index + 1}
                        averageOrderValue={data.averageOrderValue}
                        totalRevenue={data.totalRevenue}
                        totalDeals={data.totalDeals}
                      />
                    ))}
                    
                    {/* 如果少於3個市集，顯示提示 */}
                    {marketAOVData.length < 3 && (
                      <div className="mt-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          目前僅有 {marketAOVData.length} 場有成交的市集數據
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      目前沒有成交記錄的市集數據
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 核心 KPI 卡片 */}
            <KPICards
              avgConversionRate={quadrantData?.averages.avgConversionRate || 0}
              topPair={affinityPairs && affinityPairs.length > 0 ? affinityPairs[0] : null}
            />

            {/* 進階模式：顯示所有圖表 */}
            {mode === 'advanced' && (
              <>
                {/* 🔥 市集健康評分排行榜 - 基礎診斷（3場解鎖） */}
                <UnlockGuard
                  currentCount={validMarketCount}
                  requiredCount={3}
                  featureName="基礎診斷"
                >
                  {marketHealthScores && marketHealthScores.length > 0 && (
                    <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10 mb-6">
                      {/* 標題與說明 */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-medium text-foreground">
                            市集綜合評分
                          </h2>
                          {/* 說明燈泡按鈕 */}
                          <button
                            onClick={() => {
                              toast.info('市集健康評分說明', {
                                description: '綜合評估每小時淨利(40%)、回收率(20%)、轉換率(20%)、客單價(20%)，使用 Z-score 標準化後計算 0-100 分',
                                duration: 6000,
                              });
                            }}
                            className="relative bg-soft-yellow hover:bg-[#FFE8C7] p-1.5 rounded-full transition-colors"
                            aria-label="查看說明"
                          >
                            <svg 
                              className="w-4 h-4 text-secondary" 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 2a6 6 0 016 6v3.586l.707.707A1 1 0 0116 14h-1v1a3 3 0 11-6 0v-1H8a1 1 0 01-.707-1.707L8 11.586V8a6 6 0 016-6zM10 18a1 1 0 100-2 1 1 0 000 2z"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* 評分統計摘要 */}
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-soft-green rounded-xl p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">平均分數</p>
                          <p className="text-xl font-bold text-foreground">
                            {(marketHealthScores.reduce((sum, s) => sum + s.healthScore, 0) / marketHealthScores.length).toFixed(1)}
                          </p>
                        </div>
                        <div className="bg-soft-yellow rounded-xl p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">最高分</p>
                          <p className="text-xl font-bold text-[#FFD700]">
                            {Math.max(...marketHealthScores.map(s => s.healthScore)).toFixed(1)}
                          </p>
                        </div>
                        <div className="bg-soft-pink rounded-xl p-3 text-center">
                          <p className="text-xs text-muted-foreground mb-1">最低分</p>
                          <p className="text-xl font-bold text-secondary">
                            {Math.min(...marketHealthScores.map(s => s.healthScore)).toFixed(1)}
                          </p>
                        </div>
                      </div>

                      {/* 前三名市集健康評分卡片 - 只顯示有效排名 */}
                      {marketHealthScores.length > 0 ? (
                        <div className="space-y-4">
                          {marketHealthScores
                            .sort((a, b) => b.healthScore - a.healthScore)
                            .slice(0, 3)
                            .map((scoreData, index) => {
                              const market = markets.find(m => m.id === scoreData.marketId);
                              if (!market) return null;
                              return (
                                <MarketHealthScoreCard
                                  key={scoreData.marketId}
                                  market={market}
                                  score={scoreData}
                                  rank={index + 1}
                                />
                              );
                            })}
                          
                          {/* 如果少於3個市集，顯示提示 */}
                          {marketHealthScores.length < 3 && (
                            <div className="mt-4 text-center">
                              <p className="text-xs text-muted-foreground">
                                目前僅有 {marketHealthScores.length} 場符合條件的市集數據
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-sm text-muted-foreground">
                            目前沒有符合評分條件的市集數據
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </UnlockGuard>

                {/* 🔥 市集象限網格 + 每日收入趨勢圖 - 深度對比（8場解鎖） */}
                <UnlockGuard
                  currentCount={validMarketCount}
                  requiredCount={8}
                  featureName="深度對比"
                >
                  {/* 市集象限網格 */}
                  {quadrantData && (
                    <div className="mb-6">
                      <QuadrantGrid
                        stars={quadrantData.stars}
                        potentials={quadrantData.potentials}
                        precisies={quadrantData.precisies}
                        observables={quadrantData.observables}
                        averages={quadrantData.averages}
                        isEmpty={quadrantData.isEmpty}
                      />
                    </div>
                  )}

                  {/* 每日收入趨勢圖 */}
                  {dailyRevenueData && (
                    <div className="mb-6">
                      <DailyRevenueChart
                        revenueMap={dailyRevenueData}
                        startDate={startDate}
                        endDate={endDate}
                      />
                    </div>
                  )}
                </UnlockGuard>

                {/* 🔥 商品關聯分析 - 品牌定位（15場解鎖） */}
                {analyticsCapabilities.productRanking ? (
                  <UnlockGuard
                    currentCount={validMarketCount}
                    requiredCount={15}
                    featureName="品牌定位"
                  >
                    <div className="mb-6">
                      <ProductAffinityCard
                        pairs={affinityPairs || []}
                        isLoading={affinityPairs === undefined}
                      />
                    </div>
                  </UnlockGuard>
                ) : (
                  <AdvancedAnalysisGate
                    title="商品關聯分析需要商品明細"
                    description="目前資料還不足以判斷哪些商品經常一起被購買。系統會先避免做不可靠的商品關聯推論。"
                    requirement="記錄商品、數量與成交金額；如果現場很忙，可以先從熱銷前 3 個商品開始。"
                  />
                )}

                {/* 商品排行（無標題） */}
                {analyticsCapabilities.productRanking ? (
                  <TopProductsCard
                    topByQuantity={topProductsData?.topByQuantity || null}
                    topByRevenue={topProductsData?.topByRevenue || null}
                    topByProfit={topProductsData?.topByProfit || null}
                  />
                ) : (
                  <AdvancedAnalysisGate
                    title="商品排行需要商品銷售資料"
                    description="目前可以分析市集表現與成本，但還不能可靠排序商品。"
                    requirement="至少記錄商品 ID、銷售數量與收入。"
                  />
                )}
              </>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
