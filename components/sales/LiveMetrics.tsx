'use client';

import { useMemo } from 'react';
import { TrendingUp, DollarSign, Users, Target } from 'lucide-react';
import { useEvents } from '@/lib/db/hooks';
import { calculateLiveMetrics } from '@/lib/sales/live-metrics';

interface LiveMetricsProps {
  marketId: string;
}

/**
 * 即時營業指標組件
 * 顯示當前市集的營業數據
 */
export function LiveMetrics({ marketId }: LiveMetricsProps) {
  const events = useEvents();

  // 計算即時指標
  const metrics = useMemo(() => {
    return calculateLiveMetrics(events, marketId);
  }, [events, marketId]);

  return (
    <div className="bg-white rounded-[1.5rem] p-4 shadow-lg shadow-primary/10">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-medium text-foreground">即時營業指標</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 成交金額 */}
        <div className="bg-gradient-to-br from-soft-green to-primary/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">成交金額</span>
          </div>
          <div className="text-2xl font-medium text-primary tabular-nums">
            ${metrics.totalRevenue.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {metrics.dealCount} 筆交易
          </div>
        </div>

        {/* 客單價 */}
        <div className="bg-gradient-to-br from-soft-yellow to-secondary/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-secondary" />
            <span className="text-xs text-muted-foreground">客單價</span>
          </div>
          <div className="text-2xl font-medium text-secondary tabular-nums">
            ${Math.round(metrics.averageOrderValue).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            AOV
          </div>
        </div>

        {/* 互動次數 */}
        <div className="bg-gradient-to-br from-cat-art to-cat-art/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-foreground" />
            <span className="text-xs text-muted-foreground">互動次數</span>
          </div>
          <div className="text-2xl font-medium text-foreground tabular-nums">
            {metrics.interactionCount}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            次
          </div>
        </div>

        {/* 轉換率 */}
        <div className="bg-gradient-to-br from-cat-clothing to-cat-clothing/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-foreground" />
            <span className="text-xs text-muted-foreground">轉換率</span>
          </div>
          <div className="text-2xl font-medium text-foreground tabular-nums">
            {metrics.conversionRate.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            成交 / 互動
          </div>
        </div>
      </div>
    </div>
  );
}
