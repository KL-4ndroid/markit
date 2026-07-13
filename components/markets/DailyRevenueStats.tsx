'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Calendar, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { useDateRangeStats } from '@/lib/db/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getInteractionButtons } from '@/lib/interaction-buttons-store';
import { computeDailyTotals } from '@/lib/ui/daily-revenue-totals';
import type { Market } from '@/types/db';

interface DailyRevenueStatsProps {
  market: Market;
  onAddRevenue: (date: string) => void;
  canAddRevenue?: boolean;
  onDateClick: (date: string) => void;  // ✅ 新增：點擊日期查看成交記錄
  /**
   * 物理隱藏「利潤」相關 UI（每日卡片的「利潤」格 + 多日市集總計的「總利潤」格）。
   * 用途：員工模式（hideProfit=true）只顯示「收入 / 成交」總計，不顯示利潤。
   * 預設 false：老闆模式維持原本 3 格（收入 / 利潤 / 成交）。
   * 注意：這是 UI 層脫敏，底層 dailyStats.profit 仍存在（可由 DevTools 讀到），
   * 資料層脫敏由 C2.30C PermissionGate 統一處理。
   */
  hideProfit?: boolean;
}

/**
 * 每日收入統計組件
 * 
 * 顯示多天市集的每日收入明細
 * 支持補登收入功能
 */
export function DailyRevenueStats({ market, onAddRevenue, onDateClick, canAddRevenue = true, hideProfit = false }: DailyRevenueStatsProps) {
  const stats = useDateRangeStats(market.startDate, market.endDate);
  const dailyListRef = useRef<HTMLDivElement | null>(null);
  const focusedDayRef = useRef<HTMLDivElement | null>(null);

  // 互動按鈕配置（從 store 讀取，computed per render）
  const interactionButtons = useMemo(() => getInteractionButtons(), []);
  
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

    // ✅ 統計每日的互動次數（從 dailyStats.extraInteractions 讀取，取代 raw events 查詢）
    // 此邏輯已在上方的 stats?.forEach 中透過 stat.extraInteractions 合併

    return Array.from(dataMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }, [stats, dateRange, market.id, interactionButtons]);

  // ✅ C3.4 修復：總計必須來自每日卡片加總，**不**直接讀 market.total*
  // 否則可能出現「下方總計 ≠ 每日卡片加總」的 UI 內部矛盾
  // （水水市集案例：dailyStats 算 100,376，但 market.totalRevenue 已被污染為 12,900）。
  const dailyTotals = useMemo(() => computeDailyTotals(dailyData), [dailyData]);

  // 判斷是否為單日市集
  const isSingleDay = market.startDate === market.endDate;
  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);
  const focusedWindowStartDate = useMemo(() => {
    if (dailyData.length <= 3) return dailyData[0]?.date;

    const todayIndex = dailyData.findIndex((day) => day.date === today);
    if (todayIndex >= 0) {
      return dailyData[Math.max(0, todayIndex - 1)]?.date;
    }

    const nextIndex = dailyData.findIndex((day) => day.date > today);
    if (nextIndex >= 0) {
      return dailyData[Math.max(0, nextIndex - 1)]?.date;
    }

    return dailyData[Math.max(0, dailyData.length - 3)]?.date;
  }, [dailyData, today]);

  useEffect(() => {
    const list = dailyListRef.current;
    const focusedDay = focusedDayRef.current;
    if (!list || !focusedDay) return;

    list.scrollTop = Math.max(0, focusedDay.offsetTop - list.offsetTop);
  }, [focusedWindowStartDate]);
  
  return (
    <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
          <Calendar className="w-5 h-5 text-primary" />
          {isSingleDay ? '收入明細' : '每日收入明細'}
        </h2>
        {!isSingleDay && (
          <div className="text-xs text-muted-foreground">
            共 {dateRange.length} 天
          </div>
        )}
      </div>
      
      <div
        ref={dailyListRef}
        className={`space-y-3 pr-1 ${dailyData.length > 3 ? 'max-h-[28rem] overflow-y-auto overscroll-contain' : ''}`}
      >
        {dailyData.map((day) => {
          // ✅ 使用本地日期，避免時區問題
          const isPast = day.date < today;
          const isToday = day.date === today;
          const isFuture = day.date > today;
          
          return (
            <div
              key={day.date}
              ref={day.date === focusedWindowStartDate ? focusedDayRef : null}
              onClick={() => !isFuture && onDateClick(day.date)}  // ✅ 新增：點擊日期查看成交記錄
              className={`rounded-xl border-2 p-4 transition-all ${
                isFuture 
                  ? 'border-gray-200 bg-gray-50 opacity-60'
                  : 'cursor-pointer hover:shadow-md hover:scale-[1.02]'
              } ${
                isToday
                  ? 'border-primary bg-primary/5'
                  : isFuture
                  ? ''
                  : 'border-soft-green bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-foreground">
                    {formatDate(day.date)}
                  </div>
                  {isToday && (
                    <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
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
                {!isFuture && canAddRevenue && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();  // ✅ 阻止冒泡，避免觸發日期點擊
                      onAddRevenue(day.date);
                    }}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/85 transition-colors z-10 bg-white rounded-full px-2 py-1"
                  >
                    <Plus className="w-4 h-4" />
                    補登
                  </button>
                )}
              </div>
              
              <div className={`grid ${hideProfit ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">收入</div>
                  <div className="text-lg font-medium text-primary">
                    {formatCurrency(day.revenue)}
                  </div>
                </div>
                {hideProfit ? null : (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">利潤</div>
                    <div className={`text-lg font-medium ${
                      day.profit >= 0 ? 'text-foreground' : 'text-danger'
                    }`}>
                      {formatCurrency(day.profit)}
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">成交</div>
                  <div className="text-lg font-medium text-secondary">
                    {day.deals}
                  </div>
                </div>
              </div>

              {/* 互動次數統計 */}
              {interactionButtons.length > 0 && !isFuture && (
                <div className="mt-3 pt-3 border-t border-primary/10">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>互動：</span>
                    {Object.values(day.interactions).some(count => count > 0) ? (
                      // 有互動記錄：顯示各類互動次數
                      interactionButtons
                        .filter(button => (day.interactions[button.id] || 0) > 0)
                        .map((button, index, filteredArray) => {
                          const count = day.interactions[button.id] || 0;
                          return (
                            <span key={button.id} className="text-foreground">
                              {button.label} <span className="font-medium">{count}</span>
                              {index < filteredArray.length - 1 && <span className="mx-1">•</span>}
                            </span>
                          );
                        })
                    ) : (
                      // 無互動記錄：顯示提示
                      <span className="text-muted-foreground italic">當日無任何互動記錄</span>
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
        <div className="mt-4 pt-4 border-t border-primary/10">
          <div className={`grid ${hideProfit ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">總收入</div>
              <div className="text-xl font-bold text-primary">
                {formatCurrency(dailyTotals.totalRevenue)}
              </div>
            </div>
            {hideProfit ? null : (
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">總利潤</div>
                <div className={`text-xl font-bold ${
                  dailyTotals.totalProfit >= 0 ? 'text-foreground' : 'text-danger'
                }`}>
                  {formatCurrency(dailyTotals.totalProfit)}
                </div>
              </div>
            )}
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">總成交</div>
              <div className="text-xl font-bold text-secondary">
                {dailyTotals.totalDeals}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 提示 */}
      <div className="mt-4 bg-soft-yellow border border-secondary/20 rounded-xl p-3 text-xs text-foreground">
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
