/**
 * Comparison Chart - 對比圖表
 *
 * 視覺化顯示你 vs 平均的對比
 */

import React from 'react';
import type { MarketAnalytics } from '@/lib/analytics';
import { Clock, Coins, Banknote, Tent, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';

interface ComparisonChartProps {
  analytics: MarketAnalytics;
}

type ComparisonIconKey = 'hourly' | 'revenue' | 'averageOrder' | 'boothFee';

const comparisonIconMap: Record<ComparisonIconKey, typeof Clock> = {
  hourly: Clock,
  revenue: Coins,
  averageOrder: Banknote,
  boothFee: Tent,
};

export default function ComparisonChart({ analytics }: ComparisonChartProps) {
  const { metrics, healthScore } = analytics;

  // 計算對比數據
  const comparisons = [
    {
      label: '時薪',
      iconKey: 'hourly' as const,
      yourValue: metrics.hourlyProfit,
      avgValue: healthScore.metrics.hourlyProfit,
      unit: '$',
      suffix: '/小時',
    },
    {
      label: '成交率',
      iconKey: 'revenue' as const,
      yourValue: metrics.conversionRate * 100,
      avgValue: healthScore.metrics.conversionRate,
      unit: '',
      suffix: '%',
    },
    {
      label: '客單價',
      iconKey: 'averageOrder' as const,
      yourValue: metrics.aov,
      avgValue: healthScore.metrics.aov,
      unit: '$',
      suffix: '',
    },
    {
      label: '攤位費回收',
      iconKey: 'boothFee' as const,
      yourValue: metrics.boothROI,
      avgValue: healthScore.metrics.boothROI,
      unit: '',
      suffix: '%',
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" strokeWidth={1.75} />
        關鍵指標對比
      </h3>

      <div className="space-y-6">
        {comparisons.map((item, index) => {
          const percentage = (item.yourValue / item.avgValue) * 100;
          const diff = ((item.yourValue - item.avgValue) / item.avgValue) * 100;
          const isGood = diff > 0;
          const ItemIcon = comparisonIconMap[item.iconKey];

          return (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {ItemIcon && <ItemIcon className="w-5 h-5 text-primary" strokeWidth={1.75} />}
                  <span className="text-sm font-medium text-gray-700">
                    {item.label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-800">
                    你 {item.unit}{item.yourValue.toFixed(0)}{item.suffix}
                  </span>
                  <span className="text-sm text-gray-500 mx-2">vs</span>
                  <span className="text-sm text-gray-600">
                    平均 {item.unit}{item.avgValue.toFixed(0)}{item.suffix}
                  </span>
                </div>
              </div>

              {/* 進度條 */}
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    className={`h-8 rounded-full transition-all duration-500 ${
                      isGood ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gradient-to-r from-orange-400 to-orange-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-sm font-bold inline-flex items-center gap-1 ${
                    percentage > 50 ? 'text-white' : 'text-gray-700'
                  }`}>
                    {isGood ? (
                      <CheckCircle className="w-4 h-4" strokeWidth={1.75} />
                    ) : (
                      <AlertTriangle className="w-4 h-4" strokeWidth={1.75} />
                    )}
                    {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* 說明文字 */}
              <p className="text-xs text-gray-500 mt-1">
                {isGood ? (
                  <>你的 {item.label} 比平均高 {Math.abs(diff).toFixed(0)}%</>
                ) : (
                  <>你的 {item.label} 比平均低 {Math.abs(diff).toFixed(0)}%</>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
