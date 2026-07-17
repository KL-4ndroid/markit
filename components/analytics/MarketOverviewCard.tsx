/**
 * Market Overview Card - 市集總覽卡片
 * 
 * 顯示市集的關鍵數據和趨勢
 */

import React from 'react';
import {
  BarChart3,
  Star,
  Clock,
  DollarSign,
  Lightbulb,
  Target,
  Footprints,
  Eye,
  ShoppingCart,
  Scale,
  AlertTriangle,
} from 'lucide-react';
import type { MarketAnalytics } from '@/lib/analytics';

interface MarketOverviewCardProps {
  analytics: MarketAnalytics;
  marketName: string;
  previousAnalytics?: MarketAnalytics;
}

export default function MarketOverviewCard({ 
  analytics, 
  marketName,
  previousAnalytics 
}: MarketOverviewCardProps) {
  const { metrics, healthScore, diagnosis } = analytics;
  
  // 計算趨勢
  const getTrend = (current: number, previous?: number) => {
    if (!previous) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: change,
      isPositive: change > 0,
      text: `${change > 0 ? '+' : ''}${change.toFixed(0)}%`,
    };
  };

  const hourlyProfitTrend = getTrend(
    metrics.hourlyProfit,
    previousAnalytics?.metrics.hourlyProfit
  );
  
  const conversionRateTrend = getTrend(
    metrics.conversionRate,
    previousAnalytics?.metrics.conversionRate
  );
  
  const aovTrend = getTrend(
    metrics.aov,
    previousAnalytics?.metrics.aov
  );

  // 取得診斷類型對應的 icon
  const getDiagnosisIcon = (diagnosisType: string) => {
    if (diagnosisType === '精準高效') return Target;
    if (diagnosisType === '流量不足') return Footprints;
    if (diagnosisType === '轉換不足') return Eye;
    if (diagnosisType === '客單價偏低') return ShoppingCart;
    return Scale;
  };

  return (
    <div className="rounded-card border border-primary/10 bg-atelier-blue-soft/70 p-6 shadow-atelier">
      {/* 標題 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary shrink-0" strokeWidth={1.75} />
          {marketName}
        </h2>
        <p className="text-sm text-gray-600">
          市集總覽 · {new Date().toLocaleDateString('zh-TW')}
        </p>
      </div>

      {/* 關鍵指標 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* 健康評分 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-6 h-6 text-yellow-500 shrink-0" strokeWidth={1.75} />
            {healthScore.grade === 'S' && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">
                S 級
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-1">綜合評分</p>
          <p className="text-3xl font-bold text-gray-800">
            {healthScore.healthScore.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">滿分 100</p>
        </div>

        {/* 時薪 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-primary shrink-0" strokeWidth={1.75} />
            {hourlyProfitTrend && (
              <span className={`text-xs font-medium ${
                hourlyProfitTrend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {hourlyProfitTrend.isPositive ? '↑' : '↓'} {Math.abs(hourlyProfitTrend.value).toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-1">時薪</p>
          <p className="text-3xl font-bold text-gray-800">
            ${metrics.hourlyProfit.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">每小時淨利</p>
        </div>

        {/* 成交率 */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-6 h-6 text-primary shrink-0" strokeWidth={1.75} />
            {conversionRateTrend && (
              <span className={`text-xs font-medium ${
                conversionRateTrend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {conversionRateTrend.isPositive ? '↑' : '↓'} {Math.abs(conversionRateTrend.value).toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-1">成交率</p>
          <p className="text-3xl font-bold text-gray-800">
            {(metrics.conversionRate * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {Math.round(metrics.conversionRate * 10)}/10 人買單
          </p>
        </div>
      </div>

      {/* 快速洞察 */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-secondary shrink-0" strokeWidth={1.75} />
          快速洞察
        </h3>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            {(() => {
              const DiagnosisIcon = getDiagnosisIcon(diagnosis.diagnosisType);
              return <DiagnosisIcon className="w-5 h-5 mt-0.5 text-primary shrink-0" strokeWidth={1.75} />;
            })()}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">
                {diagnosis.diagnosisType}
              </p>
              <p className="text-xs text-gray-600">
                {analytics.overview.suggestion}
              </p>
            </div>
          </div>

          {metrics.confidenceLevel === '低' && (
            <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
              <AlertTriangle className="w-5 h-5 mt-0.5 text-yellow-600 shrink-0" strokeWidth={1.75} />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-700">
                  數據量偏少
                </p>
                <p className="text-xs text-gray-600">
                  建議多參加幾次市集，累積更多數據
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
