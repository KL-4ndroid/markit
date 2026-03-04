'use client';

import { useState, useMemo, Fragment, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, TrendingUp } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { toast } from 'sonner';
import { useMarkets } from '@/lib/db/hooks';
import { useAuth } from '@/lib/supabase/auth-context';
import { useUserRole } from '@/hooks/useUserRole';
import { db } from '@/lib/db';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
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
import {
  calculateQuadrants,
  calculateProductAffinity,
  calculateDailyRevenue,
  calculateMarketHealthScores,
  buildMarketOverview,
} from '@/lib/analytics-utils';
import type { Market } from '@/types/db';
import type { ProductPair, MarketHealthScore } from '@/lib/analytics-utils';

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
  const { userRole, isStaff } = useUserRole();
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showInfoTooltip, setShowInfoTooltip] = useState(false); // ✅ 控制ROI說明提示框
  const [showAOVInfoTooltip, setShowAOVInfoTooltip] = useState(false); // ✅ 控制客單價說明提示框
  const hasShownEmptyToast = useRef(false); // ✅ 追蹤是否已顯示過空狀態提示
  const [mode, setMode] = useState<'quick' | 'advanced'>('quick'); // ✅ 分析模式

  // 計算日期範圍
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // ✅ 使用本地日期格式化函數
    const formatLocalDate = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    
    switch (dateRange) {
      case 'today':
        return {
          startDate: formatLocalDate(today),
          endDate: formatLocalDate(today),
        };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return {
          startDate: formatLocalDate(weekAgo),
          endDate: formatLocalDate(today),
        };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return {
          startDate: formatLocalDate(monthAgo),
          endDate: formatLocalDate(today),
        };
      case 'custom':
        return {
          startDate: customStartDate || formatLocalDate(today),
          endDate: customEndDate || formatLocalDate(today),
        };
      case 'all':
        return {
          startDate: '2020-01-01',
          endDate: formatLocalDate(today),
        };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // 處理自訂日期變更
  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
  };

  // ✅ 根據用戶身份過濾市集（權限控制）
  const currentOwnerId = isStaff ? userRole.ownerId : user?.id;
  
  const allMarkets = useMarkets({
    ownerId: currentOwnerId,  // ✅ 根據擁有者 ID 過濾
  });
  
  // 篩選日期範圍內的市集
  const markets = useMemo(() => {
    if (!allMarkets) return [];
    return allMarkets.filter(market => {
      // 排除已取消的市集
      if (market.status === 'cancelled') return false;
      
      // ✅ 優先檢查 dates 陣列（多選日期）
      if (market.dates && market.dates.length > 0) {
        // 檢查是否有任何日期在範圍內
        return market.dates.some(date => date >= startDate && date <= endDate);
      }
      
      // ✅ 降級：使用 startDate（連續日期，向後兼容）
      return market.startDate >= startDate && market.startDate <= endDate;
    });
  }, [allMarkets, startDate, endDate]);

  // ✅ 全域空狀態處理：當無市集數據時顯示一次性提示
  useEffect(() => {
    if (markets.length === 0 && !hasShownEmptyToast.current) {
      toast.info('目前範圍內尚無市集數據', {
        description: '調整日期範圍或建立新市集開始記錄',
        duration: 4000,
      });
      hasShownEmptyToast.current = true;
    } else if (markets.length > 0) {
      // 重置標記，當有數據後再次變為空時可以再次提示
      hasShownEmptyToast.current = false;
    }
  }, [markets.length]);

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

    // 排序：先按每小時淨利降序，再按攤位費回收率降序
    return data.sort((a, b) => {
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
  const quadrantData = useMemo(() => {
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

    // ✅ 象限分析邏輯保護：檢查是否所有市集的互動數均為 0
    return calculateQuadrants(markets);
  }, [markets]);

  // ✅ 新增：計算市集健康評分
  const marketHealthScores = useMemo(() => {
    if (!markets || markets.length === 0) return [];
    return calculateMarketHealthScores(markets);
  }, [markets]);

  // ✅ 新增：計算市集總覽（取第一名市集）
  const topMarketOverview = useMemo(() => {
    if (!markets || markets.length === 0) return null;
    
    // 取得評分最高的市集
    const scores = calculateMarketHealthScores(markets);
    if (scores.length === 0) return null;
    
    const topScore = scores.sort((a, b) => b.healthScore - a.healthScore)[0];
    const topMarket = markets.find(m => m.id === topScore.marketId);
    
    if (!topMarket) return null;
    
    return buildMarketOverview(topMarket);
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
      return {
        topByQuantity: null,
        topByRevenue: null,
        topByProfit: null,
      };
    }

    // 從所有市集的事件中收集商品數據
    const productStats = new Map<string, {
      productName: string;
      quantity: number;
      revenue: number;
      profit: number;
    }>();

    // 遍歷所有市集
    for (const market of markets) {
      if (!market.id) continue;
      
      // 獲取該市集的所有成交事件
      const events = await db.events
        .where('market_id')
        .equals(market.id)
        .and(event => event.type === 'deal_closed')
        .toArray();

      // 處理每個成交事件
      for (const event of events) {
        const payload = event.payload as any;
        
        // 跳過手動輸入的交易（沒有具體商品）
        if (payload.isManualEntry) continue;
        
        // 處理交易項目
        if (payload.items && Array.isArray(payload.items)) {
          for (const item of payload.items) {
            const productId = item.productId;
            
            // ✅ 優先使用快照名稱，如果沒有則從商品表查詢
            let productName = item.product_name;
            if (!productName) {
              const product = await db.products.get(productId);
              productName = product?.name;
            }
            
            // ✅ 如果商品名稱仍然為空，跳過此商品
            if (!productName) {
              continue;
            }
            
            const quantity = item.quantity || 0;
            const price = item.price_at_time_of_sale || item.price || 0;
            const cost = item.cost_at_time_of_sale || 0;
            const revenue = price * quantity;
            const profit = (price - cost) * quantity;

            // 累加統計
            if (productStats.has(productId)) {
              const stats = productStats.get(productId)!;
              stats.quantity += quantity;
              stats.revenue += revenue;
              stats.profit += profit;
            } else {
              productStats.set(productId, {
                productName,
                quantity,
                revenue,
                profit,
              });
            }
          }
        }
      }
    }

    // 轉換為數組並排序
    const productsArray = Array.from(productStats.values());

    if (productsArray.length === 0) {
      return {
        topByQuantity: null,
        topByRevenue: null,
        topByProfit: null,
      };
    }

    // 找出各項第一名
    const topByQuantity = productsArray.reduce((max, p) => 
      p.quantity > max.quantity ? p : max
    );
    
    const topByRevenue = productsArray.reduce((max, p) => 
      p.revenue > max.revenue ? p : max
    );
    
    const topByProfit = productsArray.reduce((max, p) => 
      p.profit > max.profit ? p : max
    );

    return {
      topByQuantity: {
        productName: topByQuantity.productName,
        quantity: topByQuantity.quantity,
      },
      topByRevenue: {
        productName: topByRevenue.productName,
        revenue: topByRevenue.revenue,
      },
      topByProfit: {
        productName: topByProfit.productName,
        profit: topByProfit.profit,
      },
    };
  }, [markets]);

  // 檢查是否有數據
  const hasData = marketROIData.length > 0;

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-medium text-white opacity-90">數據分析</h1>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full">
              <span className="text-white text-sm">📊</span>
            </div>
          </div>
          
          <p className="text-white/80 text-sm">
            深入洞察營業數據，優化經營策略 ✨
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* 日期範圍篩選器 */}
        <div className="mb-6">
          <DateRangeFilter 
            value={dateRange} 
            onChange={setDateRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomDateChange={handleCustomDateChange}
          />
        </div>

        {/* 模式切換器 */}
        <div className="bg-white rounded-[1.5rem] p-2 shadow-md shadow-[#7B9FA6]/10 mb-6 flex gap-2">
          <button
            onClick={() => setMode('quick')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
              mode === 'quick'
                ? 'bg-gradient-to-r from-[#7B9FA6] to-[#6A8E95] text-white shadow-md'
                : 'text-[#6B6B6B] hover:bg-[#F5F5F3]'
            }`}
          >
            ⚡ 快速模式
          </button>
          <button
            onClick={() => setMode('advanced')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
              mode === 'advanced'
                ? 'bg-gradient-to-r from-[#7B9FA6] to-[#6A8E95] text-white shadow-md'
                : 'text-[#6B6B6B] hover:bg-[#F5F5F3]'
            }`}
          >
            📊 進階模式
          </button>
        </div>

        {hasData ? (
          <>
            {/* 市集總覽卡片 */}
            {topMarketOverview && (
              <div className="bg-gradient-to-br from-white to-[#F5F5F3] rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10 mb-6 border-2 border-[#7B9FA6]/20">
                {/* 標題 */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🟢</span>
                  <h2 className="text-xl font-medium text-[#3A3A3A]">
                    本場市集：{topMarketOverview.summaryLabel}
                  </h2>
                </div>

                {/* 健康分數 */}
                <div className="bg-white rounded-xl p-4 mb-4 border border-[#7B9FA6]/10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#6B6B6B]">健康分數</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-[#7B9FA6]">
                        {topMarketOverview.healthScore.toFixed(1)}
                      </span>
                      <span className="text-lg text-[#6B6B6B]">/100</span>
                    </div>
                  </div>
                </div>

                {/* 關鍵指標 */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {/* 人流品質 */}
                  <div className="bg-[#E8F3E8] rounded-xl p-3">
                    <p className="text-xs text-[#6B6B6B] mb-1">人流品質</p>
                    <p className="text-sm font-semibold text-[#3A3A3A]">
                      {topMarketOverview.diagnosisType}
                    </p>
                  </div>

                  {/* 成交效率 */}
                  <div className="bg-[#FFF8E7] rounded-xl p-3">
                    <p className="text-xs text-[#6B6B6B] mb-1">成交效率</p>
                    <p className="text-sm font-semibold text-[#3A3A3A]">
                      {topMarketOverview.keyStats.conversionRate.toFixed(1)}%
                    </p>
                  </div>

                  {/* 客單價 */}
                  <div className="bg-[#F5E6E8] rounded-xl p-3">
                    <p className="text-xs text-[#6B6B6B] mb-1">客單價</p>
                    <p className="text-sm font-semibold text-[#3A3A3A]">
                      ${topMarketOverview.keyStats.aov.toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* 建議 */}
                <div className="bg-[#7B9FA6]/10 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <div className="flex-1">
                      <p className="text-xs text-[#6B6B6B] mb-1">建議</p>
                      <p className="text-sm text-[#3A3A3A] leading-relaxed">
                        {topMarketOverview.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 核心 KPI 卡片 */}
            <KPICards
              avgConversionRate={quadrantData.averages.avgConversionRate}
              topPair={affinityPairs && affinityPairs.length > 0 ? affinityPairs[0] : null}
            />

            {/* 進階模式：顯示所有圖表 */}
            {mode === 'advanced' && (
              <>
                {/* 市集健康評分排行榜 */}
                {marketHealthScores.length > 0 && (
                  <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10 mb-6">
                    {/* 標題與說明 */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-medium text-[#3A3A3A]">
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
                          className="relative bg-[#FFF8E7] hover:bg-[#FFE8C7] p-1.5 rounded-full transition-colors"
                          aria-label="查看說明"
                        >
                          <svg 
                            className="w-4 h-4 text-[#D4A574]" 
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
                      <div className="bg-[#E8F3E8] rounded-xl p-3 text-center">
                        <p className="text-xs text-[#6B6B6B] mb-1">平均分數</p>
                        <p className="text-xl font-bold text-[#3A3A3A]">
                          {(marketHealthScores.reduce((sum, s) => sum + s.healthScore, 0) / marketHealthScores.length).toFixed(1)}
                        </p>
                      </div>
                      <div className="bg-[#FFF8E7] rounded-xl p-3 text-center">
                        <p className="text-xs text-[#6B6B6B] mb-1">最高分</p>
                        <p className="text-xl font-bold text-[#FFD700]">
                          {Math.max(...marketHealthScores.map(s => s.healthScore)).toFixed(1)}
                        </p>
                      </div>
                      <div className="bg-[#F5E6E8] rounded-xl p-3 text-center">
                        <p className="text-xs text-[#6B6B6B] mb-1">最低分</p>
                        <p className="text-xl font-bold text-[#D4A574]">
                          {Math.min(...marketHealthScores.map(s => s.healthScore)).toFixed(1)}
                        </p>
                      </div>
                    </div>

                    {/* 前三名市集健康評分卡片 */}
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
                    </div>

                    {/* 如果少於3個市集，顯示提示 */}
                    {marketHealthScores.length < 3 && marketHealthScores.length > 0 && (
                      <div className="mt-4 text-center">
                        <p className="text-xs text-[#6B6B6B]">
                          目前僅有 {marketHealthScores.length} 場市集數據
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 市集象限網格 */}
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

                {/* 商品關聯分析 */}
                <div className="mb-6">
                  <ProductAffinityCard
                    pairs={affinityPairs || []}
                    isLoading={affinityPairs === undefined}
                  />
                </div>

                {/* 最有價值市集 */}
                <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10 mb-6">
                  {/* 標題與說明 */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-medium text-[#3A3A3A]">
                        最有價值市集
                      </h2>
                      {/* 說明燈泡按鈕 */}
                      <button
                        onClick={() => setShowInfoTooltip(!showInfoTooltip)}
                        className="relative bg-[#FFF8E7] hover:bg-[#FFE8C7] p-1.5 rounded-full transition-colors"
                        aria-label="查看說明"
                      >
                        <svg 
                          className="w-4 h-4 text-[#D4A574]" 
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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all border border-[#7B9FA6]/10 relative">
                              {/* 關閉按鈕 */}
                              <button
                                onClick={() => setShowInfoTooltip(false)}
                                className="absolute top-4 right-4 text-[#6B6B6B] hover:text-[#3A3A3A] transition-colors"
                                aria-label="關閉"
                              >
                                <X className="w-5 h-5" />
                              </button>

                              <Dialog.Title className="font-medium text-[#3A3A3A] mb-4 text-lg pr-8">
                                💡 市集投資回報分析
                              </Dialog.Title>
                              
                              {/* 三個指標說明 */}
                              <div className="space-y-4 mb-6">
                                {/* 1. 淨利潤 */}
                                <div className="bg-[#E8F3E8] rounded-xl p-4">
                                  <h4 className="font-medium text-[#3A3A3A] mb-2 flex items-center gap-2">
                                    <span className="text-[#7B9FA6]">💰</span>
                                    淨利潤
                                  </h4>
                                  <p className="text-sm text-[#6B6B6B] leading-relaxed mb-2">
                                    <span className="font-medium text-[#3A3A3A]">計算方式：</span>
                                    <br />
                                    總利潤 - 攤位費 - 報名費 - 設備租金 - 抽成
                                  </p>
                                  <p className="text-xs text-[#6B6B6B]">
                                    <span className="font-medium">意義：</span>扣除所有成本後的實際獲利
                                  </p>
                                </div>

                                {/* 2. 每小時淨利 */}
                                <div className="bg-[#FFF8E7] rounded-xl p-4">
                                  <h4 className="font-medium text-[#3A3A3A] mb-2 flex items-center gap-2">
                                    <span className="text-[#D4A574]">⏱️</span>
                                    每小時淨利
                                  </h4>
                                  <p className="text-sm text-[#6B6B6B] leading-relaxed mb-2">
                                    <span className="font-medium text-[#3A3A3A]">計算方式：</span>
                                    <br />
                                    淨利潤 ÷ 總營業時數
                                  </p>
                                  <p className="text-xs text-[#6B6B6B]">
                                    <span className="font-medium">意義：</span>時間效益指標，數值越高代表時間投資報酬越好
                                  </p>
                                </div>

                                {/* 3. 回收率 */}
                                <div className="bg-[#F5E6E8] rounded-xl p-4">
                                  <h4 className="font-medium text-[#3A3A3A] mb-2 flex items-center gap-2">
                                    <span className="text-[#D4A574]">📈</span>
                                    回收率
                                  </h4>
                                  <p className="text-sm text-[#6B6B6B] leading-relaxed mb-2">
                                    <span className="font-medium text-[#3A3A3A]">計算方式：</span>
                                    <br />
                                    總收入 ÷ (攤位費 + 設備租賃費) × 100%
                                  </p>
                                  <p className="text-xs text-[#6B6B6B]">
                                    <span className="font-medium">意義：</span>固定成本回收倍數，200% 表示收入是成本的 2 倍
                                  </p>
                                </div>
                              </div>

                              <div className="bg-[#7B9FA6]/10 rounded-xl p-3 mb-4">
                                <p className="text-xs text-[#3A3A3A] leading-relaxed">
                                  <span className="font-medium">💡 排序規則：</span>
                                  <br />
                                  優先按「每小時淨利」排序，相同時再按「回收率」排序
                                </p>
                              </div>

                              <button
                                onClick={() => setShowInfoTooltip(false)}
                                className="w-full bg-[#7B9FA6] text-white py-3 rounded-2xl hover:bg-[#6A8E95] transition-colors font-medium"
                              >
                                知道了
                              </button>
                            </Dialog.Panel>
                          </Transition.Child>
                        </div>
                      </div>
                    </Dialog>
                  </Transition>

                  {/* 前三名市集卡片（垂直排列） */}
                  <div className="space-y-3">
                    {/* 第一名 */}
                    {marketROIData[0] && (
                      <MarketROICard
                        market={marketROIData[0].market}
                        rank={1}
                        netProfit={marketROIData[0].netProfit}
                        hourlyProfit={marketROIData[0].hourlyProfit}
                        boothROI={marketROIData[0].boothROI}
                        operatingHours={marketROIData[0].operatingHours}
                      />
                    )}
                    
                    {/* 第二名 */}
                    {marketROIData[1] && (
                      <MarketROICard
                        market={marketROIData[1].market}
                        rank={2}
                        netProfit={marketROIData[1].netProfit}
                        hourlyProfit={marketROIData[1].hourlyProfit}
                        boothROI={marketROIData[1].boothROI}
                        operatingHours={marketROIData[1].operatingHours}
                      />
                    )}
                    
                    {/* 第三名 */}
                    {marketROIData[2] && (
                      <MarketROICard
                        market={marketROIData[2].market}
                        rank={3}
                        netProfit={marketROIData[2].netProfit}
                        hourlyProfit={marketROIData[2].hourlyProfit}
                        boothROI={marketROIData[2].boothROI}
                        operatingHours={marketROIData[2].operatingHours}
                      />
                    )}
                  </div>

                  {/* 如果少於3個市集，顯示提示 */}
                  {marketROIData.length < 3 && marketROIData.length > 0 && (
                    <div className="mt-4 text-center">
                      <p className="text-xs text-[#6B6B6B]">
                        目前僅有 {marketROIData.length} 場市集數據
                      </p>
                    </div>
                  )}
                </div>

                {/* 客單價最高市集 */}
                {marketAOVData.length > 0 && (
              <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10 mb-6">
                {/* 標題與說明 */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-medium text-[#3A3A3A]">
                      客單價最高市集
                    </h2>
                    {/* 說明燈泡按鈕 */}
                    <button
                      onClick={() => setShowAOVInfoTooltip(!showAOVInfoTooltip)}
                      className="relative bg-[#FFF8E7] hover:bg-[#FFE8C7] p-1.5 rounded-full transition-colors"
                      aria-label="查看說明"
                    >
                      <svg 
                        className="w-4 h-4 text-[#D4A574]" 
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
                          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all border border-[#7B9FA6]/10 relative">
                            {/* 關閉按鈕 */}
                            <button
                              onClick={() => setShowAOVInfoTooltip(false)}
                              className="absolute top-4 right-4 text-[#6B6B6B] hover:text-[#3A3A3A] transition-colors"
                              aria-label="關閉"
                            >
                              <X className="w-5 h-5" />
                            </button>

                            <Dialog.Title className="font-medium text-[#3A3A3A] mb-4 text-lg pr-8">
                              💡 客單價分析
                            </Dialog.Title>
                            
                            {/* 客單價說明 */}
                            <div className="space-y-4 mb-6">
                              {/* 計算方式 */}
                              <div className="bg-[#E8F3E8] rounded-xl p-4">
                                <h4 className="font-medium text-[#3A3A3A] mb-2 flex items-center gap-2">
                                  <span className="text-[#7B9FA6]">🧮</span>
                                  計算方式
                                </h4>
                                <p className="text-sm text-[#6B6B6B] leading-relaxed">
                                  <span className="font-medium text-[#3A3A3A]">客單價 = 總收入 ÷ 成交數</span>
                                </p>
                              </div>

                              {/* 指標意義 */}
                              <div className="bg-[#FFF8E7] rounded-xl p-4">
                                <h4 className="font-medium text-[#3A3A3A] mb-2 flex items-center gap-2">
                                  <span className="text-[#D4A574]">📊</span>
                                  指標意義
                                </h4>
                                <p className="text-sm text-[#6B6B6B] leading-relaxed mb-2">
                                  反映每筆交易的平均金額，是衡量顧客消費能力的重要指標。
                                </p>
                                <ul className="text-xs text-[#6B6B6B] space-y-1 ml-4">
                                  <li>• 客單價越高 → 顧客願意花更多錢</li>
                                  <li>• 可能原因：商品定價高、顧客購買多件、高價值商品受歡迎</li>
                                </ul>
                              </div>

                              {/* 實際範例 */}
                              <div className="bg-[#F5E6E8] rounded-xl p-4">
                                <h4 className="font-medium text-[#3A3A3A] mb-2 flex items-center gap-2">
                                  <span className="text-[#D4A574]">💡</span>
                                  實際範例
                                </h4>
                                <div className="text-sm text-[#6B6B6B] leading-relaxed space-y-2">
                                  <div className="bg-white rounded-lg p-3">
                                    <p className="font-medium text-[#3A3A3A] mb-1">市集 A</p>
                                    <p className="text-xs">總收入：$10,000 ÷ 成交數：50 筆</p>
                                    <p className="text-xs font-medium text-[#7B9FA6]">→ 客單價：$200</p>
                                  </div>
                                  <div className="bg-white rounded-lg p-3">
                                    <p className="font-medium text-[#3A3A3A] mb-1">市集 B</p>
                                    <p className="text-xs">總收入：$10,000 ÷ 成交數：100 筆</p>
                                    <p className="text-xs font-medium text-[#D4A574]">→ 客單價：$100</p>
                                  </div>
                                  <p className="text-xs pt-2">
                                    市集 A 的客單價較高，表示顧客平均每次購買金額更多
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="bg-[#7B9FA6]/10 rounded-xl p-3 mb-4">
                              <p className="text-xs text-[#3A3A3A] leading-relaxed">
                                <span className="font-medium">💡 提升客單價的方法：</span>
                                <br />
                                提高商品定價、推出組合優惠、引導顧客購買多件商品
                              </p>
                            </div>

                            <button
                              onClick={() => setShowAOVInfoTooltip(false)}
                              className="w-full bg-[#7B9FA6] text-white py-3 rounded-2xl hover:bg-[#6A8E95] transition-colors font-medium"
                            >
                              知道了
                            </button>
                          </Dialog.Panel>
                        </Transition.Child>
                      </div>
                    </div>
                  </Dialog>
                </Transition>

                {/* 前三名市集卡片（垂直排列） */}
                <div className="space-y-3">
                  {/* 第一名 */}
                  {marketAOVData[0] && (
                    <MarketAOVCard
                      market={marketAOVData[0].market}
                      rank={1}
                      averageOrderValue={marketAOVData[0].averageOrderValue}
                      totalRevenue={marketAOVData[0].totalRevenue}
                      totalDeals={marketAOVData[0].totalDeals}
                    />
                  )}
                  
                  {/* 第二名 */}
                  {marketAOVData[1] && (
                    <MarketAOVCard
                      market={marketAOVData[1].market}
                      rank={2}
                      averageOrderValue={marketAOVData[1].averageOrderValue}
                      totalRevenue={marketAOVData[1].totalRevenue}
                      totalDeals={marketAOVData[1].totalDeals}
                    />
                  )}
                  
                  {/* 第三名 */}
                  {marketAOVData[2] && (
                    <MarketAOVCard
                      market={marketAOVData[2].market}
                      rank={3}
                      averageOrderValue={marketAOVData[2].averageOrderValue}
                      totalRevenue={marketAOVData[2].totalRevenue}
                      totalDeals={marketAOVData[2].totalDeals}
                    />
                  )}
                </div>

                {/* 如果少於3個市集，顯示提示 */}
                {marketAOVData.length < 3 && marketAOVData.length > 0 && (
                  <div className="mt-4 text-center">
                    <p className="text-xs text-[#6B6B6B]">
                      目前僅有 {marketAOVData.length} 場市集數據
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 商品排行（無標題） */}
            <TopProductsCard
              topByQuantity={topProductsData?.topByQuantity || null}
              topByRevenue={topProductsData?.topByRevenue || null}
              topByProfit={topProductsData?.topByProfit || null}
            />
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
