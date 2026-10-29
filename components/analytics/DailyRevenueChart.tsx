/**
 * 每日收入趨勢圖組件
 *
 * 使用簡單的 CSS/SVG 柱狀圖顯示每日收入
 */

'use client';

import { TrendingUp, Calendar, ChevronDown, Lightbulb } from 'lucide-react';
import { MetricGuide } from './MetricGuide';

interface DailyRevenueChartProps {
  revenueMap: Map<string, number>;
  startDate: string;
  endDate: string;
}

export function DailyRevenueChart({
  revenueMap,
  startDate,
  endDate,
}: DailyRevenueChartProps) {
  // 生成日期範圍
  const generateDateRange = (start: string, end: string): string[] => {
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      dates.push(dateStr);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  const dateRange = generateDateRange(startDate, endDate);

  // 限制顯示最近 30 天
  const displayDates = dateRange.slice(-30);

  // 準備圖表數據
  const chartData = displayDates.map(date => ({
    date,
    revenue: revenueMap.get(date) || 0,
  }));

  // 計算最大值（用於縮放）
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);

  // 計算總收入
  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);

  // 計算平均收入
  const avgRevenue = totalRevenue / chartData.length;

  // ✅ 如果沒有數據，顯示灰色虛線基準線
  if (totalRevenue === 0) {
    return (
      <div className="bg-card rounded-[1.5rem] p-6 shadow-lg shadow-primary/10">
        <h2 className="text-xl font-medium text-foreground mb-4">
          每日收入趨勢
        </h2>

        {/* 空狀態圖表 */}
        <div className="relative h-40 flex items-center justify-center">
          {/* 灰色虛線基準線 */}
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-dashed border-muted-foreground/20"></div>
          </div>

          {/* 提示文字 */}
          <div className="relative bg-card px-4 py-2 rounded-full border border-muted-foreground/10">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              等待首筆數據輸入...
            </p>
          </div>
        </div>

        {/* 引導說明 */}
        <div className="mt-6 bg-background rounded-xl p-4">
          <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-foreground" strokeWidth={1.75} />
            <span>
              <span className="font-medium text-foreground">提示：</span>
              開始記錄市集交易後，這裡將顯示每日收入變化趨勢，幫助您掌握營業狀況。
            </span>
          </p>
        </div>
      </div>
    );
  }

  // 格式化日期顯示（只顯示月/日）
  const formatDate = (dateStr: string) => {
    const [, month, day] = dateStr.split('-');
    return `${parseInt(month)}/${parseInt(day)}`;
  };

  // 格式化金額
  const formatCurrency = (amount: number) => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}萬`;
    }
    return amount.toLocaleString();
  };

  return (
    <section className="rounded-card border border-primary/10 bg-card p-4 sm:p-5" aria-labelledby="daily-revenue-title">
      {/* 標題 */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <h2 id="daily-revenue-title" className="text-base font-semibold text-foreground">
            每日收入趨勢
          </h2>
          <MetricGuide
            title="收入趨勢分析"
            content="顯示過去 30 天的每日營收波動與平均線，讓您清楚看見收入的起伏變化。"
            value="觀察品牌成長週期，判斷哪些日期是銷售旺季，以便提前規劃庫存、調整參展策略，把握最佳商機。"
            icon={<TrendingUp className="w-6 h-6 text-primary" strokeWidth={1.75} />}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          最近 {displayDates.length} 天的收入變化
        </p>
      </div>

      {/* 統計摘要 */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-background rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">總收入</p>
          <p className="text-lg font-medium text-foreground tabular-nums">
            ${formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="bg-background rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1">日均收入</p>
          <p className="text-lg font-medium text-foreground tabular-nums">
            ${formatCurrency(avgRevenue)}
          </p>
        </div>
      </div>

      {/* 柱狀圖 */}
      <div className="relative h-40 mb-10" role="img" aria-label="每日收入趨勢：實心柱高於平均，外框柱低於或等於平均；每日金額可展開下方表格查看。">
        {/* 平均線 */}
        <div
          className="absolute left-0 right-0 h-1.5 bg-card z-10"
          style={{ top: `${100 - (avgRevenue / maxRevenue) * 100}%` }}
        >
          <span className="absolute inset-x-0 top-0.5 border-t-2 border-dashed border-secondary" aria-hidden="true" />
          <span className="absolute -top-2 right-0 text-xs text-foreground bg-card px-1">
            平均
          </span>
        </div>

        {/* 柱狀圖容器 */}
        <div className="flex items-end justify-between gap-1 h-40 relative">
          {chartData.map((data, index) => {
            const heightPercent = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
            const isHighlight = data.revenue > avgRevenue;

            return (
              <div
                key={data.date}
                className="relative h-full flex-1 group"
              >
                {/* 柱子 */}
                <div
                  className={`absolute inset-x-0 bottom-0 rounded-t-md ${
                    isHighlight
                      ? 'bg-primary'
                      : 'border-2 border-primary bg-card'
                  }`}
                  style={{ height: `${heightPercent}%`, display: data.revenue > 0 ? undefined : 'none' }}
                >
                  {/* Tooltip */}
                  {data.revenue > 0 && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 left-1/2 transform -translate-x-1/2 bg-card text-foreground text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-20">
                      ${data.revenue.toLocaleString()}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-card"></div>
                    </div>
                  )}
                </div>

                {/* 日期標籤（每隔幾天顯示一次，避免擁擠） */}
                {(displayDates.length <= 7 || index % Math.ceil(displayDates.length / 7) === 0) && (
                  <span className="absolute left-0 top-full text-xs text-muted-foreground mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                    {formatDate(data.date)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 圖例 */}
      <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary"></div>
          <span>高於平均</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-primary bg-card"></div>
          <span>低於或等於平均</span>
        </div>
      </div>

      <details className="group mt-5 border-t border-primary/10 pt-3">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
          查看每日收入表格
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-primary/10">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">每日收入趨勢的表格資料</caption>
            <thead className="sticky top-0 bg-background text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">日期</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">營收</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {chartData.map((data) => (
                <tr key={data.date}>
                  <th scope="row" className="px-3 py-2 font-medium text-foreground">{formatDate(data.date)}</th>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">${data.revenue.toLocaleString('zh-TW')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
