/**
 * Comparison Chart - 對比圖表
 * 
 * 視覺化顯示你 vs 平均的對比
 */

import React from 'react';
import type { MarketAnalytics } from '@/lib/analytics';

interface ComparisonChartProps {
  analytics: MarketAnalytics;
}

export default function ComparisonChart({ analytics }: ComparisonChartProps) {
  const { metrics, healthScore } = analytics;

  // 計算對比數據
  const comparisons = [
    {
      label: '時薪',
      icon: '⏰',
      yourValue: metrics.hourlyProfit,
      avgValue: healthScore.metrics.hourlyProfit,
      unit: '$',
      suffix: '/小時',
    },
    {
      label: '成交率',
      icon: '💰',
      yourValue: metrics.conversionRate * 100,
      avgValue: healthScore.metrics.conversionRate,
      unit: '',
      suffix: '%',
    },
    {
      label: '客單價',
      icon: '💵',
      yourValue: metrics.aov,
      avgValue: healthScore.metrics.aov,
      unit: '$',
      suffix: '',
    },
    {
      label: '攤位費回收',
      icon: '🎪',
      yourValue: metrics.boothROI,
      avgValue: healthScore.metrics.boothROI,
      unit: '',
      suffix: '%',
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-6">
        📈 關鍵指標對比
      </h3>

      <div className="space-y-6">
        {comparisons.map((item, index) => {
          const percentage = (item.yourValue / item.avgValue) * 100;
          const diff = ((item.yourValue - item.avgValue) / item.avgValue) * 100;
          const isGood = diff > 0;

          return (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
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
                  <span className={`text-sm font-bold ${
                    percentage > 50 ? 'text-white' : 'text-gray-700'
                  }`}>
                    {isGood ? '✅' : '⚠️'} {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
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
