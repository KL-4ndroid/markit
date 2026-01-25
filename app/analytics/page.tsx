'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, DollarSign, ShoppingCart, Users, Calendar, Package, Download } from 'lucide-react';
import { useDateRangeStats, useProducts, useMarkets } from '@/lib/db/hooks';
import { RevenueChart } from '@/components/analytics/RevenueChart';
import { CategoryPieChart } from '@/components/analytics/CategoryPieChart';
import { ConversionFunnel } from '@/components/analytics/ConversionFunnel';
import { MetricCard } from '@/components/analytics/MetricCard';
import { DateRangeFilter } from '@/components/analytics/DateRangeFilter';
import { EmptyState } from '@/components/analytics/EmptyState';
import { InteractionComparisonChart } from '@/components/analytics/InteractionComparisonChart';
import { MarketDetailList } from '@/components/analytics/MarketDetailList';
import { CostAnalysis } from '@/components/analytics/CostAnalysis';
import { InteractionPreferenceChart } from '@/components/analytics/InteractionPreferenceChart';
import { InteractionTimeHeatmap } from '@/components/analytics/InteractionTimeHeatmap';
import { BehaviorInsightCard } from '@/components/analytics/BehaviorInsightCard';
import { db } from '@/lib/db';
import { getQuickActionButtons } from '@/lib/quick-actions-store';
import { exportMarketReport } from '@/lib/export-utils';
import { toast } from 'sonner';
import type { Event, InteractionRecordedPayload, DealClosedPayload } from '@/types/db';

/**
 * 數據分析頁面
 * 
 * 功能：
 * - 日期範圍篩選（今日、本週、本月、全選）
 * - 關鍵指標卡片（總營收、淨利潤、平均客單價、總成交數）
 * - 營收趨勢圖（AreaChart）
 * - 分類佔比圖（PieChart）
 * - 轉換漏斗圖（BarChart）
 */
export default function AnalyticsPage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // 計算日期範圍
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateRange) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return {
          startDate: weekAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return {
          startDate: monthAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      case 'custom':
        return {
          startDate: customStartDate || today.toISOString().split('T')[0],
          endDate: customEndDate || today.toISOString().split('T')[0],
        };
      case 'all':
        return {
          startDate: '2020-01-01',
          endDate: today.toISOString().split('T')[0],
        };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // 處理自訂日期變更
  const handleCustomDateChange = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
  };

  // 獲取數據
  const stats = useDateRangeStats(startDate, endDate);
  const products = useProducts({ isActive: true });
  const allMarkets = useMarkets();
  
  // 篩選日期範圍內的市集
  const markets = useMemo(() => {
    if (!allMarkets) return [];
    return allMarkets.filter(market => 
      market.startDate >= startDate && market.startDate <= endDate
    );
  }, [allMarkets, startDate, endDate]);

  // 互動行為數據狀態
  const [interactionEvents, setInteractionEvents] = useState<Event<InteractionRecordedPayload>[]>([]);
  const [dealEvents, setDealEvents] = useState<Event<DealClosedPayload>[]>([]);
  const [buttonLabels, setButtonLabels] = useState<Record<string, { label: string; emoji: string }>>({});

  // 載入互動事件數據
  useEffect(() => {
    const loadInteractionData = async () => {
      try {
        // 獲取按鈕配置
        const buttons = getQuickActionButtons();
        const labelMap: Record<string, { label: string; emoji: string }> = {};
        buttons.forEach(btn => {
          labelMap[btn.id] = { label: btn.label, emoji: btn.emoji };
        });
        setButtonLabels(labelMap);

        // 計算時間範圍的時間戳
        const startTimestamp = new Date(startDate).getTime();
        const endTimestamp = new Date(endDate).getTime() + 86400000; // +1 天

        // 獲取互動事件
        const interactions = await db.events
          .where('type')
          .equals('interaction_recorded')
          .filter(e => e.timestamp >= startTimestamp && e.timestamp < endTimestamp)
          .toArray() as Event<InteractionRecordedPayload>[];

        // 篩選屬於當前日期範圍內市集的互動
        const marketIds = markets.map(m => m.id).filter((id): id is string => id !== undefined);
        const filteredInteractions = interactions.filter(e => 
          marketIds.includes(e.payload.marketId)
        );

        setInteractionEvents(filteredInteractions);

        // 獲取成交事件
        const deals = await db.events
          .where('type')
          .equals('deal_closed')
          .filter(e => e.timestamp >= startTimestamp && e.timestamp < endTimestamp)
          .toArray() as Event<DealClosedPayload>[];

        const filteredDeals = deals.filter(e => 
          marketIds.includes(e.payload.marketId)
        );

        setDealEvents(filteredDeals);
      } catch (error) {
        console.error('載入互動數據失敗：', error);
      }
    };

    if (markets.length > 0) {
      loadInteractionData();
    }
  }, [markets, startDate, endDate]);

  // 計算關鍵指標
  const metrics = useMemo(() => {
    if (!markets || markets.length === 0) {
      return {
        marketCount: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalCost: 0,
        averageOrderValue: 0,
        totalDeals: 0,
        totalInteractions: 0,
        conversionRate: 0,
      };
    }

    const totalRevenue = markets.reduce((sum, m) => sum + (m.totalRevenue || 0), 0);
    const totalProfit = markets.reduce((sum, m) => sum + (m.totalProfit || 0), 0);
    const totalDeals = markets.reduce((sum, m) => sum + (m.totalDeals || 0), 0);
    const totalInteractions = markets.reduce((sum, m) => sum + (m.totalInteractions || 0), 0);
    
    // 計算總成本
    const totalCost = markets.reduce((sum, m) => {
      const boothCost = m.boothCost || 0;
      const tableCost = m.tableFree ? 0 : (m.tableRental || 0);
      const chairCost = m.chairFree ? 0 : (m.chairRental || 0);
      const umbrellaCost = m.umbrellaFree ? 0 : (m.umbrellaRental || 0);
      const commission = ((m.totalRevenue || 0) * (m.commissionRate || 0)) / 100;
      return sum + boothCost + tableCost + chairCost + umbrellaCost + commission;
    }, 0);
    
    return {
      marketCount: markets.length,
      totalRevenue,
      totalProfit,
      totalCost,
      averageOrderValue: totalDeals > 0 ? totalRevenue / totalDeals : 0,
      totalDeals,
      totalInteractions,
      conversionRate: totalInteractions > 0 ? (totalDeals / totalInteractions) * 100 : 0,
    };
  }, [markets]);

  // 檢查是否有數據
  const hasData = stats && stats.length > 0 && metrics.totalRevenue > 0;

  // 計算互動偏好數據
  const interactionPreferenceData = useMemo(() => {
    const counts: Record<string, number> = {};
    
    interactionEvents.forEach(event => {
      const type = event.payload.type;
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts).map(([type, count]) => ({
      name: buttonLabels[type]?.label || type,
      emoji: buttonLabels[type]?.emoji || '❓',
      value: count,
    })).sort((a, b) => b.value - a.value);
  }, [interactionEvents, buttonLabels]);

  // 計算時序熱力圖數據
  const timeHeatmapData = useMemo(() => {
    // 初始化 24 小時數據
    const hourlyData: Record<number, { interactions: number; revenue: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { interactions: 0, revenue: 0 };
    }

    // 統計互動次數
    interactionEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyData[hour].interactions += 1;
    });

    // 統計成交金額
    dealEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyData[hour].revenue += event.payload.totalAmount;
    });

    // 轉換為圖表數據格式
    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: `${hour.padStart(2, '0')}:00`,
        interactions: data.interactions,
        revenue: data.revenue,
      }))
      .filter(d => d.interactions > 0 || d.revenue > 0); // 只顯示有數據的時段
  }, [interactionEvents, dealEvents]);

  // 生成智能洞察
  const behaviorInsights = useMemo(() => {
    const insights: string[] = [];

    // 洞察 1：最頻繁的互動類型
    if (interactionPreferenceData.length > 0) {
      const topInteraction = interactionPreferenceData[0];
      const totalInteractions = interactionPreferenceData.reduce((sum, item) => sum + item.value, 0);
      const percentage = ((topInteraction.value / totalInteractions) * 100).toFixed(0);
      insights.push(
        `本期間「${topInteraction.emoji} ${topInteraction.name}」最為頻繁，佔總互動 ${percentage}%。`
      );
    }

    // 洞察 2：轉換率分析
    const totalInteractions = interactionEvents.length;
    const totalDeals = dealEvents.length;
    if (totalInteractions > 0 && totalDeals > 0) {
      const conversionRate = ((totalDeals / totalInteractions) * 100).toFixed(1);
      const contribution = ((totalInteractions / totalDeals)).toFixed(1);
      insights.push(
        `平均每 ${contribution} 次互動產生 1 筆成交，整體轉換率為 ${conversionRate}%。`
      );
    }

    // 洞察 3：人氣高峰時段
    if (timeHeatmapData.length > 0) {
      const peakInteractionHour = timeHeatmapData.reduce((max, curr) => 
        curr.interactions > max.interactions ? curr : max
      );
      const peakRevenueHour = timeHeatmapData.reduce((max, curr) => 
        curr.revenue > max.revenue ? curr : max
      );

      if (peakInteractionHour.hour === peakRevenueHour.hour) {
        insights.push(
          `人氣與金流高峰都在 ${peakInteractionHour.hour}，建議在此時段加強服務與推廣。`
        );
      } else {
        insights.push(
          `人氣高峰在 ${peakInteractionHour.hour}，金流高峰在 ${peakRevenueHour.hour}，可針對不同時段調整策略。`
        );
      }
    }

    return insights;
  }, [interactionPreferenceData, interactionEvents, dealEvents, timeHeatmapData]);

  // 處理匯出報表
  const handleExportReport = () => {
    try {
      if (markets.length === 0) {
        toast.error('沒有可匯出的數據');
        return;
      }

      exportMarketReport(markets);
      toast.success('🎉 報表匯出成功', {
        description: '已下載 CSV 檔案',
      });
    } catch (error) {
      console.error('匯出報表失敗：', error);
      toast.error('匯出失敗，請稍後再試');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-medium text-white opacity-90">數據分析</h1>
            <div className="flex items-center gap-2">
              {/* 匯出報表按鈕 */}
              {hasData && (
                <button
                  onClick={handleExportReport}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors"
                  aria-label="匯出報表"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">匯出報表</span>
                </button>
              )}
              <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full">
                <span className="text-white text-sm">📊</span>
              </div>
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

        {hasData ? (
          <>
            {/* 關鍵指標卡片 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <MetricCard
                icon={Package}
                label="市集總數"
                value={metrics.marketCount}
                format="number"
                color="blue"
              />
              <MetricCard
                icon={DollarSign}
                label="總收入"
                value={metrics.totalRevenue}
                format="currency"
                color="wood"
              />
              <MetricCard
                icon={TrendingUp}
                label="總淨利潤"
                value={metrics.totalProfit}
                format="currency"
                color="pink"
              />
              <MetricCard
                icon={Users}
                label="平均轉換率"
                value={metrics.conversionRate}
                format="percent"
                color="green"
              />
            </div>

            {/* 營收趨勢圖 */}
            {stats && stats.length > 0 && (
              <div className="mb-6">
                <RevenueChart data={stats} />
              </div>
            )}

            {/* 互動與成交對比圖 */}
            <div className="mb-6">
              <InteractionComparisonChart markets={markets} />
            </div>

            {/* 轉換漏斗 */}
            <div className="mb-6">
              <ConversionFunnel
                touchCount={metrics.totalInteractions}
                inquiryCount={0}
                dealCount={metrics.totalDeals}
              />
            </div>

            {/* 成本分析 */}
            <div className="mb-6">
              <CostAnalysis
                totalRevenue={metrics.totalRevenue}
                totalCost={metrics.totalCost}
                totalProfit={metrics.totalProfit}
              />
            </div>

            {/* 顧客行為分析區塊 */}
            {interactionEvents.length > 0 && (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-medium text-[#3A3A3A] flex items-center gap-2">
                    📈 顧客行為分析
                  </h2>
                  <p className="text-sm text-[#6B6B6B] mt-1">
                    深入了解顧客互動模式與偏好
                  </p>
                </div>

                {/* 智能洞察提示 */}
                <div className="mb-6">
                  <BehaviorInsightCard insights={behaviorInsights} />
                </div>

                {/* 互動偏好佔比圖 */}
                {interactionPreferenceData.length > 0 && (
                  <div className="mb-6">
                    <InteractionPreferenceChart data={interactionPreferenceData} />
                  </div>
                )}

                {/* 互動時序熱力圖 */}
                {timeHeatmapData.length > 0 && (
                  <div className="mb-6">
                    <InteractionTimeHeatmap data={timeHeatmapData} />
                  </div>
                )}
              </>
            )}

            {/* 市集明細列表 */}
            <div className="mb-6">
              <MarketDetailList markets={markets} />
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
