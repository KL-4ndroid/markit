'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, TrendingUp, Plus } from 'lucide-react';
import { useDateRangeStats } from '@/lib/db/hooks';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getInteractionButtons } from '@/lib/interaction-buttons-store';
import { computeDailyTotals, hasDailyRevenueRecord } from '@/lib/ui/daily-revenue-totals';
import type { Market,DailyStats } from '@/types/db';

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
  reviewMode?: boolean;
  dealRecordCountByDate?: Readonly<Record<string, number>>;
  focusDate?: string;
  reviewedStats?: readonly DailyStats[];
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
  reviewMode = false,
  dealRecordCountByDate,
  focusDate,
  reviewedStats,
}: DailyRevenueStatsProps) {
  const originalStats = useDateRangeStats(market.startDate, market.endDate);
  const stats = !hideProfit && reviewedStats ? reviewedStats : originalStats;
  const [dateView, setDateView] = useState<'auto' | 'recorded' | 'all' | 'empty'>('auto');
  const [showEmptyReviewDates, setShowEmptyReviewDates] = useState(false);
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
      profitPending?: boolean;
      zeroIncomeConfirmed?: boolean;
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
            profitPending:stat.financialReviewPending,
            zeroIncomeConfirmed:!hideProfit && stat.financialZeroIncomeConfirmed === true && !stat.financialReviewPending,
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
  }, [stats, dateRange, market.id, interactionButtons, hideProfit]);

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
  const recordedDays = useMemo(() => dailyData.filter(hasDailyRevenueRecord), [dailyData]);
  const emptyPastDays = useMemo(() => dailyData.filter(day => (
    day.date <= today &&
    !hasDailyRevenueRecord(day)
  )), [dailyData, today]);
  const validFocusDate = focusDate && dateRange.includes(focusDate) ? focusDate : undefined;
  const effectiveDateView = dateView === 'auto' && validFocusDate ? 'all' : dateView === 'auto'
    ? market.status === 'completed' && dailyData.length > 7 && recordedDays.length > 0
      ? 'recorded'
      : 'all'
    : dateView;
  const visibleDailyData = effectiveDateView === 'recorded'
    ? recordedDays
    : effectiveDateView === 'empty'
      ? emptyPastDays
      : dailyData;
  const isEmptyReview = reviewMode && recordedDays.length === 0 && !validFocusDate;
  const latestRecordableDate = useMemo(
    () => [...dailyData].reverse().find(day => day.date <= today)?.date ?? null,
    [dailyData, today]
  );

  useEffect(() => {
    setDateView('auto');
    setShowEmptyReviewDates(false);
  }, [market.id]);

  const focusedWindowStartDate = useMemo(() => {
    if (validFocusDate && visibleDailyData.some(day=>day.date === validFocusDate)) return validFocusDate;
    if (visibleDailyData.length <= 3) return visibleDailyData[0]?.date;

    const todayIndex = visibleDailyData.findIndex((day) => day.date === today);
    if (todayIndex >= 0) {
      return visibleDailyData[Math.max(0, todayIndex - 1)]?.date;
    }

    const nextIndex = visibleDailyData.findIndex((day) => day.date > today);
    if (nextIndex >= 0) {
      return visibleDailyData[Math.max(0, nextIndex - 1)]?.date;
    }

    return visibleDailyData[Math.max(0, visibleDailyData.length - 3)]?.date;
  }, [visibleDailyData, today, validFocusDate]);

  useEffect(() => {
    const list = dailyListRef.current;
    const focusedDay = focusedDayRef.current;
    if (!list || !focusedDay) return;

    list.scrollTop = Math.max(0, focusedDay.offsetTop - list.offsetTop);
  }, [focusedWindowStartDate]);
  
  return (
    <section className="mb-5 overflow-hidden rounded-card bg-atelier-paper shadow-atelier">
      <div className="flex min-h-16 items-center justify-between border-b border-atelier-line bg-atelier-paper px-4 py-4 sm:px-5">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            營運節奏
          </p>
          <h2 className="mt-1 text-base font-semibold text-atelier-ink">
            {isSingleDay ? '收入明細' : '每日表現'}
          </h2>
        </div>
        {!isSingleDay && (
          <div className="rounded-full bg-muted/45 px-3 py-1 text-xs font-medium text-muted-foreground">
            共 {dateRange.length} 天
          </div>
        )}
      </div>

      {validFocusDate && <a href={`#daily-revenue-${validFocusDate}`} className="mx-4 inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4">查看報告指定日期 {formatDate(validFocusDate)}</a>}
      {!isEmptyReview && !isSingleDay && dateRange.length > 5 && (
        <div className="border-b border-atelier-line bg-atelier-paper px-4 py-3 sm:px-5">
          <div className="grid grid-cols-3 rounded-control bg-muted/35 p-1" role="group" aria-label="每日表現顯示範圍">
            {([
              ['recorded', `有紀錄 ${recordedDays.length}`],
              ['all', `全部 ${dailyData.length}`],
              ['empty', `尚無紀錄 ${emptyPastDays.length}`],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={effectiveDateView === value}
                onClick={() => setDateView(value)}
                className={`min-h-10 rounded-control px-2 text-xs font-medium transition-colors ${
                  effectiveDateView === value
                    ? 'bg-primary/10 font-semibold text-foreground ring-1 ring-inset ring-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isEmptyReview && (
        <div className="border-b border-atelier-line bg-atelier-paper px-4 py-7 text-center sm:px-5">
          <p className="text-sm font-semibold text-foreground">這場市集尚無營運紀錄</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
            目前沒有收入、成交或顧客互動資料。可補登最近場次，或展開日期確認各日狀態。
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {canAddRevenue && latestRecordableDate && (
              <button
                type="button"
                onClick={() => onAddRevenue(latestRecordableDate)}
                className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                補登最近場次
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowEmptyReviewDates(value => !value)}
              aria-expanded={showEmptyReviewDates}
              className="min-h-11 rounded-control border border-atelier-line bg-atelier-canvas px-4 text-sm font-medium text-atelier-ink transition-colors hover:bg-muted/50"
            >
              {showEmptyReviewDates ? '收合日期' : '查看全部日期'}
            </button>
          </div>
        </div>
      )}

      {(!isEmptyReview || showEmptyReviewDates) && (
        <div
          ref={dailyListRef}
          className={`relative py-1 ${visibleDailyData.length > 5 ? 'max-h-[28rem] overflow-y-auto overscroll-contain' : ''}`}
        >
          {visibleDailyData.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">這個篩選條件目前沒有日期。</p>
          ) : visibleDailyData.map((day, dayIndex) => {
          const isToday = day.date === today;
          const isFuture = day.date > today;
          const recordCount = dealRecordCountByDate?.[day.date] ?? 0;
          const viewLabel = dealRecordCountByDate
            ? `查看 ${recordCount} 筆${recordCount === day.deals ? '成交' : '紀錄'}`
            : '查看成交紀錄';

          return (
            <div
              key={day.date}
              id={`daily-revenue-${day.date}`}
              ref={day.date === focusedWindowStartDate ? focusedDayRef : null}
              className={`relative scroll-mt-4 px-4 py-4 transition-colors sm:px-5 ${
                isFuture ? 'opacity-55' : ''
              } ${isToday || day.date === validFocusDate ? 'bg-primary/5' : 'bg-atelier-paper'}`}
            >
              {day.date === validFocusDate && <p className="mb-2 pl-7 text-xs font-medium text-primary">報告指定日期</p>}
              {dayIndex < visibleDailyData.length - 1 && (
                <span className="absolute bottom-0 left-[1.22rem] top-8 w-px bg-atelier-line sm:left-[1.47rem]" aria-hidden="true" />
              )}
              <span
                className={`absolute left-4 top-[1.35rem] h-3 w-3 rounded-full ring-4 ring-atelier-paper sm:left-5 ${
                  isToday ? 'bg-primary' : 'bg-atelier-line'
                }`}
                aria-hidden="true"
              />

              <div className="pl-7 sm:pl-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{formatDate(day.date)}</span>
                  {isToday && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">今天</span>}
                  {isFuture && <span className="rounded-full bg-atelier-canvas px-2 py-0.5 text-xs text-atelier-muted">尚未開始</span>}
                  {day.zeroIncomeConfirmed && <span className="text-xs text-muted-foreground">已確認零收入</span>}
                </div>

                <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">當日收入</div>
                    <div className="mt-0.5 break-words text-xl font-semibold leading-tight tabular-nums text-foreground">
                      {formatCurrency(day.revenue)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-atelier-muted">
                      {hideProfit ? null : (
                        <span>
                          銷售利潤 <strong className={`font-semibold tabular-nums ${day.profit >= 0 ? 'text-foreground' : 'text-danger'}`}>
                            {day.profitPending ? '待核對' : formatCurrency(day.profit)}
                          </strong>
                        </span>
                      )}
                      <span>
                        成交 <strong className="font-semibold tabular-nums text-foreground">{day.deals} 筆</strong>
                      </span>
                    </div>

                  </div>
                </div>

                {!isFuture && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onDateClick(day.date)}
                      aria-label={`${formatDate(day.date)} ${viewLabel}`}
                      className="min-h-11 rounded-control border border-primary/20 px-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {viewLabel}
                    </button>
                    {canAddRevenue && (
                      <button
                        type="button"
                        onClick={() => onAddRevenue(day.date)}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-control border border-primary/25 bg-atelier-paper px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        title="補登收入"
                        aria-label={`${formatDate(day.date)}補登收入`}
                      >
                        <Plus className="h-4 w-4" />
                        補登收入
                      </button>
                    )}
                  </div>
                )}

                {showInteractions && interactionButtons.length > 0 && !isFuture && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-control bg-muted/35 px-3 py-2 text-xs text-atelier-muted">
                    <TrendingUp className="h-3.5 w-3.5 text-atelier-blue" />
                    <span>互動</span>
                    {Object.values(day.interactions).some((count) => count > 0) ? (
                      interactionButtons
                        .filter((button) => (day.interactions[button.id] || 0) > 0)
                        .map((button) => (
                          <span key={button.id} className="font-medium text-foreground">
                            {button.label} {day.interactions[button.id] || 0}
                          </span>
                        ))
                    ) : (
                      <span>無紀錄</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}

      {showTotals && !isSingleDay && !isEmptyReview && (
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-atelier-line bg-muted/35 px-4 py-4 sm:px-5">
          <div>
            <div className="text-xs text-muted-foreground">這場市集合計</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-foreground">{formatCurrency(dailyTotals.totalRevenue)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-atelier-muted">
            {hideProfit ? null : (
              <span>
                銷售利潤合計 <strong className={`font-semibold tabular-nums ${dailyTotals.totalProfit >= 0 ? 'text-foreground' : 'text-danger'}`}>
                  {dailyData.some(day=>day.profitPending) ? '待核對' : formatCurrency(dailyTotals.totalProfit)}
                </strong>
              </span>
            )}
            <span>
              總成交 <strong className="font-semibold tabular-nums text-foreground">{dailyTotals.totalDeals} 筆</strong>
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
