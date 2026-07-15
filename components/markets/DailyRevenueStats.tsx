'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Calendar, TrendingUp, Plus } from 'lucide-react';
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
  showTotals?: boolean;
  showInteractions?: boolean;
}

/**
 * 每日收入統計組件
 * 
 * 顯示多天市集的每日收入明細
 * 支持補登收入功能
 */
export function DailyRevenueStats({
  market,
  onAddRevenue,
  onDateClick,
  canAddRevenue = true,
  hideProfit = false,
  showTotals = true,
  showInteractions = false,
}: DailyRevenueStatsProps) {
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
    <section className="mb-4 overflow-hidden rounded-lg border border-border bg-white">
      <div className="flex min-h-14 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          {isSingleDay ? '收入明細' : '每日表現'}
        </h2>
        {!isSingleDay && <div className="text-xs text-muted-foreground">共 {dateRange.length} 天</div>}
      </div>

      <div
        ref={dailyListRef}
        className={`divide-y divide-border ${dailyData.length > 5 ? 'max-h-[28rem] overflow-y-auto overscroll-contain' : ''}`}
      >
        {dailyData.map((day) => {
          const isToday = day.date === today;
          const isFuture = day.date > today;

          return (
            <div
              key={day.date}
              ref={day.date === focusedWindowStartDate ? focusedDayRef : null}
              onClick={() => !isFuture && onDateClick(day.date)}
              className={`px-4 py-3 transition-colors ${
                isFuture ? 'cursor-not-allowed bg-background opacity-60' : 'cursor-pointer hover:bg-background'
              } ${isToday ? 'bg-primary/5' : 'bg-white'}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{formatDate(day.date)}</span>
                  {isToday && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">今天</span>}
                  {isFuture && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-muted-foreground">尚未開始</span>}
                </div>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <div className={`grid ${hideProfit ? 'grid-cols-2' : 'grid-cols-3'} flex-1 gap-4 sm:flex-none`}>
                    <div className="text-center">
                      <div className="text-[11px] text-muted-foreground">收入</div>
                      <div className="text-sm font-semibold text-primary">{formatCurrency(day.revenue)}</div>
                    </div>
                    {hideProfit ? null : (
                      <div className="text-center">
                        <div className="text-[11px] text-muted-foreground">利潤</div>
                        <div className={`text-sm font-semibold ${day.profit >= 0 ? 'text-foreground' : 'text-danger'}`}>
                          {formatCurrency(day.profit)}
                        </div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-[11px] text-muted-foreground">成交</div>
                      <div className="text-sm font-semibold text-foreground">{day.deals}</div>
                    </div>
                  </div>

                  {!isFuture && canAddRevenue && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAddRevenue(day.date);
                      }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border text-primary transition-colors hover:bg-primary/10"
                      title="補登收入"
                      aria-label={`${formatDate(day.date)}補登收入`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {showInteractions && interactionButtons.length > 0 && !isFuture && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>互動</span>
                  {Object.values(day.interactions).some((count) => count > 0) ? (
                    interactionButtons
                      .filter((button) => (day.interactions[button.id] || 0) > 0)
                      .map((button) => (
                        <span key={button.id} className="text-foreground">
                          {button.label} {day.interactions[button.id] || 0}
                        </span>
                      ))
                  ) : (
                    <span>無紀錄</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showTotals && !isSingleDay && (
        <div className="border-t border-border px-4 py-3">
          <div className={`grid ${hideProfit ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">總收入</div>
              <div className="mt-1 text-base font-semibold text-primary">{formatCurrency(dailyTotals.totalRevenue)}</div>
            </div>
            {hideProfit ? null : (
              <div className="text-center">
                <div className="text-xs text-muted-foreground">總利潤</div>
                <div className={`mt-1 text-base font-semibold ${dailyTotals.totalProfit >= 0 ? 'text-foreground' : 'text-danger'}`}>
                  {formatCurrency(dailyTotals.totalProfit)}
                </div>
              </div>
            )}
            <div className="text-center">
              <div className="text-xs text-muted-foreground">總成交</div>
              <div className="mt-1 text-base font-semibold text-foreground">{dailyTotals.totalDeals}</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
