'use client';

import { useMemo } from 'react';
import { Calendar, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { useDateRangeStats } from '@/lib/db/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Market } from '@/types/db';

interface DailyRevenueStatsProps {
  market: Market;
  onAddRevenue: (date: string) => void;
}

/**
 * 每日收入統計組件
 * 
 * 顯示多天市集的每日收入明細
 * 支持補登收入功能
 */
export function DailyRevenueStats({ market, onAddRevenue }: DailyRevenueStatsProps) {
  const stats = useDateRangeStats(market.startDate, market.endDate);
  
  // 生成市集日期範圍內的所有日期
  const dateRange = useMemo(() => {
    const dates: string[] = [];
    const start = new Date(market.startDate);
    const end = new Date(market.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
    
    return dates;
  }, [market.startDate, market.endDate]);
  
  // 按日期組織統計數據
  const dailyData = useMemo(() => {
    const dataMap = new Map<string, { revenue: number; profit: number; deals: number }>();
    
    // 初始化所有日期為 0
    dateRange.forEach(date => {
      dataMap.set(date, { revenue: 0, profit: 0, deals: 0 });
    });
    
    // ✅ 修復：只累加當前市集的統計數據
    stats?.forEach(stat => {
      // 檢查是否屬於當前市集且在日期範圍內
      if (stat.marketId === market.id && dateRange.includes(stat.date)) {
        dataMap.set(stat.date, {
          revenue: stat.revenue || 0,
          profit: stat.profit || 0,
          deals: stat.dealCount || 0,
        });
      }
    });
    
    return Array.from(dataMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }, [stats, dateRange, market.id]);
  
  // 判斷是否為單日市集
  const isSingleDay = market.startDate === market.endDate;
  
  // 如果是單日市集，不顯示此組件
  if (isSingleDay) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium flex items-center gap-2 text-[#3A3A3A]">
          <Calendar className="w-5 h-5 text-[#7B9FA6]" />
          每日收入明細
        </h2>
        <div className="text-xs text-[#6B6B6B]">
          共 {dateRange.length} 天
        </div>
      </div>
      
      <div className="space-y-3">
        {dailyData.map((day) => {
          const today = new Date().toISOString().split('T')[0];
          const isPast = day.date < today;
          const isToday = day.date === today;
          const isFuture = day.date > today;
          
          return (
            <div
              key={day.date}
              className={`rounded-xl border-2 p-4 transition-all ${
                isToday
                  ? 'border-[#7B9FA6] bg-[#7B9FA6]/5'
                  : isFuture
                  ? 'border-gray-200 bg-gray-50 opacity-60'
                  : 'border-[#E8F3E8] bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-[#3A3A3A]">
                    {formatDate(day.date)}
                  </div>
                  {isToday && (
                    <span className="text-xs bg-[#7B9FA6] text-white px-2 py-0.5 rounded-full">
                      今天
                    </span>
                  )}
                  {isFuture && (
                    <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">
                      未來
                    </span>
                  )}
                </div>
                
                {/* 補登按鈕 - 只在過去或今天顯示 */}
                {!isFuture && (
                  <button
                    onClick={() => onAddRevenue(day.date)}
                    className="flex items-center gap-1 text-xs text-[#7B9FA6] hover:text-[#6A8E95] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    補登
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xs text-[#6B6B6B] mb-1">收入</div>
                  <div className="text-lg font-medium text-[#7B9FA6]">
                    {formatCurrency(day.revenue)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#6B6B6B] mb-1">利潤</div>
                  <div className={`text-lg font-medium ${
                    day.profit >= 0 ? 'text-[#3A3A3A]' : 'text-[#d4183d]'
                  }`}>
                    {formatCurrency(day.profit)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#6B6B6B] mb-1">成交</div>
                  <div className="text-lg font-medium text-[#D4A574]">
                    {day.deals}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 總計 */}
      <div className="mt-4 pt-4 border-t border-[#7B9FA6]/10">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-xs text-[#6B6B6B] mb-1">總收入</div>
            <div className="text-xl font-bold text-[#7B9FA6]">
              {formatCurrency(market.totalRevenue || 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#6B6B6B] mb-1">總利潤</div>
            <div className={`text-xl font-bold ${
              (market.totalProfit || 0) >= 0 ? 'text-[#3A3A3A]' : 'text-[#d4183d]'
            }`}>
              {formatCurrency(market.totalProfit || 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-[#6B6B6B] mb-1">總成交</div>
            <div className="text-xl font-bold text-[#D4A574]">
              {market.totalDeals || 0}
            </div>
          </div>
        </div>
      </div>
      
      {/* 提示 */}
      <div className="mt-4 bg-[#FFF8E7] border border-[#D4A574]/20 rounded-xl p-3 text-xs text-[#3A3A3A]">
        <p className="font-semibold mb-1">💡 提示：</p>
        <p>
          點擊「補登」可以為指定日期補登收入記錄。補登的收入會計入該日期的統計，不影響其他日期。
        </p>
      </div>
    </div>
  );
}
