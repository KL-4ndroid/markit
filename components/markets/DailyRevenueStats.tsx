'use client';

import { useMemo, useEffect, useState } from 'react';
import { Calendar, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { useDateRangeStats } from '@/lib/db/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getInteractionButtons } from '@/lib/interaction-buttons-store';
import { getActiveInteractionEvents } from '@/lib/db/event-tombstones';
import { getEventMarketId, getLocalDateStringFromTimestamp } from '@/lib/markets/event-view-utils';
import type { Market, Event, InteractionRecordedPayload } from '@/types/db';

interface DailyRevenueStatsProps {
  market: Market;
  onAddRevenue: (date: string) => void;
  onDateClick: (date: string) => void;  // ✅ 新增：點擊日期查看成交記錄
}

/**
 * 每日收入統計組件
 * 
 * 顯示多天市集的每日收入明細
 * 支持補登收入功能
 */
export function DailyRevenueStats({ market, onAddRevenue, onDateClick }: DailyRevenueStatsProps) {
  const stats = useDateRangeStats(market.startDate, market.endDate);
  const [interactionEvents, setInteractionEvents] = useState<Event<InteractionRecordedPayload>[]>([]);
  const [interactionButtons, setInteractionButtons] = useState<Array<{ id: string; label: string; emoji: string }>>([]);

  // 載入互動事件和按鈕配置
  useEffect(() => {
    const loadData = async () => {
      try {
        // 載入互動按鈕配置
        const buttons = getInteractionButtons();
        setInteractionButtons(buttons);

        // ✅ 修復：使用 dates 陣列或降級到連續日期範圍
        const marketDates = market.dates && market.dates.length > 0 
          ? market.dates 
          : (() => {
              // 降級：生成連續日期範圍
              const dates: string[] = [];
              const start = new Date(market.startDate);
              const end = new Date(market.endDate);
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                dates.push(dateStr);
              }
              return dates;
            })();

        // 獲取互動事件 - 只篩選在 marketDates 中的日期
        const interactions = (await getActiveInteractionEvents())
          .filter(e => {
            if (getEventMarketId(e) !== market.id) return false;
            return marketDates.includes(getLocalDateStringFromTimestamp(e.timestamp));
          });

        setInteractionEvents(interactions);
      } catch (error) {
        console.error('載入互動數據失敗：', error);
      }
    };

    loadData();

    // 監聽互動記錄事件，重新載入數據
    const handleInteractionRecorded = () => {
      loadData();
    };

    window.addEventListener('interaction-recorded', handleInteractionRecorded);

    return () => {
      window.removeEventListener('interaction-recorded', handleInteractionRecorded);
    };
  }, [market.id, market.startDate, market.endDate, market.dates]);
  
  // 生成市集日期範圍內的所有日期
  const dateRange = useMemo(() => {
    // ✅ 修復：優先使用 dates 陣列，降級到連續日期範圍
    if (market.dates && market.dates.length > 0) {
      // 使用 dates 陣列（多選日期）
      return [...market.dates].sort(); // 排序確保順序正確
    }
    
    // 降級：生成連續日期範圍（舊邏輯）
    const dates: string[] = [];
    const start = new Date(market.startDate);
    const end = new Date(market.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // ✅ 使用本地日期，避免時區問題
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push(localDate);
    }
    
    return dates;
  }, [market.startDate, market.endDate, market.dates]);
  
  // 按日期組織統計數據（包含互動次數）
  const dailyData = useMemo(() => {
    const dataMap = new Map<string, {
      revenue: number;
      profit: number;
      deals: number;
      interactions: Record<string, number>;
    }>();

    // 初始化所有日期為 0
    dateRange.forEach(date => {
      const interactionCounts: Record<string, number> = {};
      interactionButtons.forEach(btn => {
        interactionCounts[btn.id] = 0;
      });
      dataMap.set(date, {
        revenue: 0,
        profit: 0,
        deals: 0,
        interactions: interactionCounts,
      });
    });

    // ✅ 修復：只累加當前市集的統計數據
    stats?.forEach(stat => {
      // 檢查是否屬於當前市集且在日期範圍內
      if (stat.marketId === market.id && dateRange.includes(stat.date)) {
        const existing = dataMap.get(stat.date);
        if (existing) {
          dataMap.set(stat.date, {
            ...existing,
            revenue: stat.revenue || 0,
            profit: stat.profit || 0,
            deals: stat.dealCount || 0,
            // ✅ 合并 extraInteractions（自定義按鈕統計）
            interactions: {
              ...existing.interactions,
              ...(stat.extraInteractions || {}),
            },
          });
        }
      }
    });

    // ✅ 統計每日的互動次數（從事件記錄）
    interactionEvents.forEach(event => {
      const dateStr = getLocalDateStringFromTimestamp(event.timestamp);

      const dayData = dataMap.get(dateStr);
      if (dayData) {
        const type = event.payload.type;
        // 初始化該類型（如果尚未初始化）
        if (dayData.interactions[type] === undefined) {
          dayData.interactions[type] = 0;
        }
        dayData.interactions[type]++;
      }
    });

    return Array.from(dataMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }, [stats, dateRange, market.id, interactionEvents, interactionButtons]);
  
  // 判斷是否為單日市集
  const isSingleDay = market.startDate === market.endDate;
  
  return (
    <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium flex items-center gap-2 text-[#3A3A3A]">
          <Calendar className="w-5 h-5 text-[#7B9FA6]" />
          {isSingleDay ? '收入明細' : '每日收入明細'}
        </h2>
        {!isSingleDay && (
          <div className="text-xs text-[#6B6B6B]">
            共 {dateRange.length} 天
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        {dailyData.map((day) => {
          // ✅ 使用本地日期，避免時區問題
          const now = new Date();
          const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          const isPast = day.date < today;
          const isToday = day.date === today;
          const isFuture = day.date > today;
          
          return (
            <div
              key={day.date}
              onClick={() => !isFuture && onDateClick(day.date)}  // ✅ 新增：點擊日期查看成交記錄
              className={`rounded-xl border-2 p-4 transition-all ${
                isFuture 
                  ? 'border-gray-200 bg-gray-50 opacity-60'
                  : 'cursor-pointer hover:shadow-md hover:scale-[1.02]'
              } ${
                isToday
                  ? 'border-[#7B9FA6] bg-[#7B9FA6]/5'
                  : isFuture
                  ? ''
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
                    onClick={(e) => {
                      e.stopPropagation();  // ✅ 阻止冒泡，避免觸發日期點擊
                      onAddRevenue(day.date);
                    }}
                    className="flex items-center gap-1 text-xs text-[#7B9FA6] hover:text-[#6A8E95] transition-colors z-10 bg-white rounded-full px-2 py-1"
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

              {/* 互動次數統計 */}
              {interactionButtons.length > 0 && !isFuture && (
                <div className="mt-3 pt-3 border-t border-[#7B9FA6]/10">
                  <div className="flex items-center gap-2 text-xs text-[#6B6B6B] flex-wrap">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>互動：</span>
                    {Object.values(day.interactions).some(count => count > 0) ? (
                      // 有互動記錄：顯示各類互動次數
                      interactionButtons
                        .filter(button => (day.interactions[button.id] || 0) > 0)
                        .map((button, index, filteredArray) => {
                          const count = day.interactions[button.id] || 0;
                          return (
                            <span key={button.id} className="text-[#3A3A3A]">
                              {button.label} <span className="font-medium">{count}</span>
                              {index < filteredArray.length - 1 && <span className="mx-1">•</span>}
                            </span>
                          );
                        })
                    ) : (
                      // 無互動記錄：顯示提示
                      <span className="text-[#6B6B6B] italic">當日無任何互動記錄</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* 總計 */}
      {!isSingleDay && (
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
      )}
      
      {/* 提示 */}
      <div className="mt-4 bg-[#FFF8E7] border border-[#D4A574]/20 rounded-xl p-3 text-xs text-[#3A3A3A]">
        <p className="font-semibold mb-1">💡 提示：</p>
        <p>
          {isSingleDay 
            ? '點擊卡片可查看成交記錄明細。點擊「補登」可以補登收入記錄。'
            : '點擊日期卡片可查看該日的成交記錄明細。點擊「補登」可以為指定日期補登收入記錄。'
          }
        </p>
      </div>
    </div>
  );
}
