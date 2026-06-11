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
    <div className="bg-white rounded-[1.5rem] p-4 shadow-lg shadow-[#7B9FA6]/10">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[#7B9FA6]" />
        <h3 className="text-sm font-medium text-[#3A3A3A]">即時營業指標</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 成交金額 */}
        <div className="bg-gradient-to-br from-[#E8F3E8] to-[#7B9FA6]/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-[#7B9FA6]" />
            <span className="text-xs text-[#6B6B6B]">成交金額</span>
          </div>
          <div className="text-2xl font-medium text-[#7B9FA6] tabular-nums">
            ${metrics.totalRevenue.toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6B6B] mt-1">
            {metrics.dealCount} 筆交易
          </div>
        </div>

        {/* 客單價 */}
        <div className="bg-gradient-to-br from-[#FFF8E7] to-[#D4A574]/10 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#D4A574]" />
            <span className="text-xs text-[#6B6B6B]">客單價</span>
          </div>
          <div className="text-2xl font-medium text-[#D4A574] tabular-nums">
            ${Math.round(metrics.averageOrderValue).toLocaleString()}
          </div>
          <div className="text-xs text-[#6B6B6B] mt-1">
            AOV
          </div>
        </div>

        {/* 互動次數 */}
        <div className="bg-gradient-to-br from-[#F8E8F0] to-[#F8E8F0]/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#3A3A3A]" />
            <span className="text-xs text-[#6B6B6B]">互動次數</span>
          </div>
          <div className="text-2xl font-medium text-[#3A3A3A] tabular-nums">
            {metrics.interactionCount}
          </div>
          <div className="text-xs text-[#6B6B6B] mt-1">
            次
          </div>
        </div>

        {/* 轉換率 */}
        <div className="bg-gradient-to-br from-[#E8F0F8] to-[#E8F0F8]/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-[#3A3A3A]" />
            <span className="text-xs text-[#6B6B6B]">轉換率</span>
          </div>
          <div className="text-2xl font-medium text-[#3A3A3A] tabular-nums">
            {metrics.conversionRate.toFixed(1)}%
          </div>
          <div className="text-xs text-[#6B6B6B] mt-1">
            成交 / 互動
          </div>
        </div>
      </div>
    </div>
  );
}
