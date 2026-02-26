/**
 * 核心 KPI 卡片組件
 * 
 * 顯示平均轉換率和最強關聯組合
 */

'use client';

import { Percent, Link2 } from 'lucide-react';
import type { ProductPair } from '@/lib/analytics-utils';
import { MetricGuide } from './MetricGuide';

interface KPICardsProps {
  avgConversionRate: number;
  topPair: ProductPair | null;
}

export function KPICards({ avgConversionRate, topPair }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {/* 平均轉換率 */}
      <div className="bg-white rounded-[1.25rem] p-4 shadow-md shadow-[#7B9FA6]/5">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-[#E8F3E8] p-2 rounded-lg">
            <Percent className="w-4 h-4 text-[#7B9FA6]" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-[#6B6B6B]">平均轉換率</span>
            <MetricGuide
              title="轉換率分析"
              content="每一百個互動的客人中，有多少人最終下單。這是衡量銷售效率的關鍵指標。"
              value="反映商品吸引力與銷售力。若互動高但轉換低，可能需重新檢視定價、商品展示或銷售話術。"
              emoji="💯"
            />
          </div>
        </div>
        <p className="text-2xl font-medium text-[#3A3A3A] tabular-nums">
          {(avgConversionRate * 100).toFixed(1)}%
        </p>
        <p className="text-xs text-[#6B6B6B] mt-1">
          互動轉為成交的比例
        </p>
      </div>

      {/* 最強關聯組合 */}
      <div className="bg-white rounded-[1.25rem] p-4 shadow-md shadow-[#7B9FA6]/5">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-[#FFF8E7] p-2 rounded-lg">
            <Link2 className="w-4 h-4 text-[#D4A574]" />
          </div>
          <span className="text-xs text-[#6B6B6B]">最強關聯</span>
        </div>
        {topPair ? (
          <>
            <p className="text-sm font-medium text-[#3A3A3A] line-clamp-1 mb-1">
              {topPair.productA.length > 6 ? topPair.productA.substring(0, 6) + '...' : topPair.productA}
              {' + '}
              {topPair.productB.length > 6 ? topPair.productB.substring(0, 6) + '...' : topPair.productB}
            </p>
            <p className="text-xs text-[#6B6B6B]">
              共同出現 {topPair.coOccurrences} 次
            </p>
          </>
        ) : (
          <p className="text-xs text-[#6B6B6B] italic">
            暫無數據
          </p>
        )}
      </div>
    </div>
  );
}
