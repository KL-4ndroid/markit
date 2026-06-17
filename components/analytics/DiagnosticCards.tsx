/**
 * Diagnostic Cards - 診斷卡片組件
 * 
 * 將技術指標翻譯成老闆語，提供可執行的處方箋
 */

import React from 'react';
import type { MarketAnalytics } from '@/lib/analytics';
import InfoTooltip, { tooltipContent } from './InfoTooltip';

// ==================== 型別定義 ====================

interface DiagnosticCardsProps {
  analytics: MarketAnalytics;
  previousAnalytics?: MarketAnalytics; // 用於趨勢對比
}

// ==================== 工具函數 ====================

/**
 * 取得評級資訊
 */
function getGradeInfo(grade: string) {
  const gradeMap = {
    'S': { label: '金牌市集', icon: '🌟', color: 'text-yellow-500', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    'A': { label: '優質市集', icon: '⭐', color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    'B': { label: '穩定市集', icon: '✅', color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    'C': { label: '待改善市集', icon: '⚠️', color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    'D': { label: '不推薦市集', icon: '❌', color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  };
  return gradeMap[grade as keyof typeof gradeMap] || gradeMap['C'];
}

/**
 * 取得診斷資訊
 */
function getDiagnosisInfo(type: string) {
  const diagnosisMap = {
    '流量不足': {
      icon: '🚶',
      color: 'text-orange-600',
      problem: '人流量太少',
      prescriptions: [
        { icon: '🎯', text: '換個人多的位置（靠近入口或美食區）' },
        { icon: '📢', text: '提前在社群宣傳（FB/IG 發文）' },
        { icon: '🎨', text: '攤位布置更吸睛（大海報、燈光）' },
      ],
      effect: '人流量提升 2-3 倍',
    },
    '轉換不足': {
      icon: '👀',
      color: 'text-blue-600',
      problem: '人很多，但不買單',
      prescriptions: [
        { icon: '💬', text: '改善銷售話術（主動介紹、試用）' },
        { icon: '💰', text: '調整定價策略（組合優惠、限時折扣）' },
        { icon: '🎁', text: '增加誘因（買一送一、集點卡）' },
      ],
      effect: '成交率提升到 20-25%',
    },
    '客單價偏低': {
      icon: '🛒',
      color: 'text-purple-600',
      problem: '客人買太少',
      prescriptions: [
        { icon: '📦', text: '推組合包（買 A 送 B，省 $100）' },
        { icon: '⬆️', text: '向上銷售（「要不要加購這個？」）' },
        { icon: '🎯', text: '設定門檻（滿 $500 送贈品）' },
      ],
      effect: '客單價提升到 $350-400',
    },
    '精準高效': {
      icon: '🎯',
      color: 'text-green-600',
      problem: '小而美，精準客群',
      prescriptions: [
        { icon: '📢', text: '擴大曝光（讓更多精準客戶知道你）' },
        { icon: '📦', text: '增加備貨（避免賣光）' },
        { icon: '💰', text: '提高定價（客人願意付更多）' },
      ],
      effect: '營收翻倍（人流 × 2）',
    },
    '均衡穩定': {
      icon: '⚖️',
      color: 'text-gray-600',
      problem: '表現穩定，中規中矩',
      prescriptions: [
        { icon: '📊', text: '持續觀察（記錄每次數據）' },
        { icon: '🔄', text: '小幅優化（測試不同話術）' },
        { icon: '📈', text: '設定目標（下次提升 10%）' },
      ],
      effect: '維持穩定，逐步成長',
    },
  };
  return diagnosisMap[type as keyof typeof diagnosisMap] || diagnosisMap['均衡穩定'];
}

/**
 * 計算百分位數排名
 */
function calculatePercentile(zScore: number): number {
  // 簡化的 Z-score 到百分位數轉換
  // Z = 0 → 50%, Z = 1 → 84%, Z = 2 → 98%
  const percentile = 50 + (zScore * 34);
  return Math.max(0, Math.min(100, percentile));
}

/**
 * 取得趨勢
 */
function getTrend(current: number, previous?: number) {
  if (!previous) return { icon: '➡️', text: '持平', color: 'text-gray-500' };
  
  const change = ((current - previous) / previous) * 100;
  
  if (change > 5) {
    return { icon: '📈', text: `↑ ${change.toFixed(0)}%`, color: 'text-green-500' };
  } else if (change < -5) {
    return { icon: '📉', text: `↓ ${Math.abs(change).toFixed(0)}%`, color: 'text-red-500' };
  } else {
    return { icon: '➡️', text: '持平', color: 'text-gray-500' };
  }
}

// ==================== 主組件 ====================

export default function DiagnosticCards({ analytics, previousAnalytics }: DiagnosticCardsProps) {
  const { metrics, healthScore, diagnosis, overview } = analytics;
  const gradeInfo = getGradeInfo(healthScore.grade);
  const diagnosisInfo = getDiagnosisInfo(diagnosis.diagnosisType);
  
  // 計算排名
  const percentile = calculatePercentile(
    (healthScore.zScores.hourlyProfitZ + 
     healthScore.zScores.boothROIZ + 
     healthScore.zScores.conversionRateZ + 
     healthScore.zScores.aovZ) / 4
  );

  return (
    <div className="space-y-6">
      {/* 市集健康總覽 */}
      <div className={`rounded-lg border-2 ${gradeInfo.borderColor} ${gradeInfo.bgColor} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{gradeInfo.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-2xl font-bold ${gradeInfo.color}`}>
                  {gradeInfo.label}
                </h3>
                <InfoTooltip {...tooltipContent.healthScore} />
              </div>
              <p className="text-sm text-gray-600">
                綜合評分：{healthScore.healthScore.toFixed(0)} 分
              </p>
            </div>
          </div>
          {metrics.confidenceLevel === '低' && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
              ⚠️ 數據量偏少
            </span>
          )}
        </div>
        
        {/* 進度條 */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full ${gradeInfo.color.replace('text', 'bg')}`}
              style={{ width: `${healthScore.healthScore}%` }}
            />
          </div>
        </div>
        
        <p className="text-lg font-medium text-gray-700">
          你的表現優於 <span className={`${gradeInfo.color} font-bold`}>
            {percentile.toFixed(0)}%
          </span> 的攤商
        </p>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            💡 建議：<span className="font-medium">{overview.summaryLabel}</span>
          </p>
        </div>
      </div>

      {/* 關鍵指標卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 時薪分析 */}
        <MetricCard
          icon="⏰"
          title="時薪分析"
          value={`$${metrics.hourlyProfit.toFixed(0)}/小時`}
          comparison={{
            label: '市場平均',
            value: `$${healthScore.metrics.hourlyProfit.toFixed(0)}/小時`,
          }}
          trend={getTrend(
            metrics.hourlyProfit,
            previousAnalytics?.metrics.hourlyProfit
          )}
          percentile={calculatePercentile(healthScore.zScores.hourlyProfitZ)}
        />

        {/* 成交效率 */}
        <MetricCard
          icon="💰"
          title="成交效率"
          value={`${(metrics.conversionRate * 100).toFixed(0)}%`}
          subtitle={`每 10 個客人，${Math.round(metrics.conversionRate * 10)} 個買單`}
          comparison={{
            label: '市場平均',
            value: `${healthScore.metrics.conversionRate.toFixed(0)}%`,
          }}
          trend={getTrend(
            metrics.conversionRate,
            previousAnalytics?.metrics.conversionRate
          )}
          percentile={calculatePercentile(healthScore.zScores.conversionRateZ)}
        />

        {/* 客單價分析 */}
        <MetricCard
          icon="💵"
          title="客單價分析"
          value={`$${metrics.aov.toFixed(0)}`}
          subtitle="平均每筆訂單"
          comparison={{
            label: '市場平均',
            value: `$${healthScore.metrics.aov.toFixed(0)}`,
          }}
          trend={getTrend(
            metrics.aov,
            previousAnalytics?.metrics.aov
          )}
          percentile={calculatePercentile(healthScore.zScores.aovZ)}
        />
      </div>

      {/* 攤位費回收 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- PWA icon 已是預優化小圖，不需要 next/image 額外處理 */}
          <img
            src="/icons/icon-192x192.png"
            alt="出攤本"
            className="w-12 h-12 object-contain"
          />
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800">攤位費划算嗎？</h3>
            <InfoTooltip {...tooltipContent.boothROI} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">花了</p>
            <p className="text-2xl font-bold text-red-600">
              ${metrics.totalFixedCost.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">攤位費 + 租金</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">賺回</p>
            <p className="text-2xl font-bold text-green-600">
              ${metrics.totalRevenue.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">營收</p>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">回收率</p>
          <p className="text-3xl font-bold text-green-600">
            {metrics.boothROI.toFixed(0)}%
          </p>
          <p className="text-sm text-gray-700 mt-2">
            {metrics.boothROI > 200 ? '✅ 很划算' : metrics.boothROI > 100 ? '✅ 有賺' : '⚠️ 需改善'}
            ，賺了 {(metrics.boothROI / 100).toFixed(1)} 倍
          </p>
        </div>
      </div>

      {/* 診斷處方箋 */}
      <div className="bg-white rounded-lg border-2 border-blue-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{diagnosisInfo.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-800">診斷處方箋</h3>
              <InfoTooltip {...tooltipContent.diagnosis} />
            </div>
            <p className={`text-sm ${diagnosisInfo.color} font-medium`}>
              {diagnosis.diagnosisType}
            </p>
          </div>
        </div>
        
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">問題：</p>
          <p className="text-base font-medium text-gray-800">
            {diagnosisInfo.problem}
          </p>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-3">處方箋：</p>
          <div className="space-y-2">
            {diagnosisInfo.prescriptions.map((prescription, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="text-xl flex-shrink-0">{prescription.icon}</span>
                <p className="text-sm text-gray-700">{prescription.text}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">預期效果：</p>
          <p className="text-base font-bold text-green-700">
            {diagnosisInfo.effect}
          </p>
        </div>
      </div>

      {/* 數據可靠度 */}
      {metrics.confidenceLevel !== '高' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📊</span>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-800">
                數據可靠度：{metrics.confidenceLevel}
              </h3>
              <InfoTooltip {...tooltipContent.confidenceScore} />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">互動數：</span>
              <span className="font-medium">
                {metrics.uniqueEngaged} 次
                {metrics.uniqueEngaged < 50 && (
                  <span className="ml-2 text-yellow-600">⚠️ 建議至少 50 次</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">成交數：</span>
              <span className="font-medium">
                {metrics.totalDeals} 筆
                {metrics.totalDeals < 20 && (
                  <span className="ml-2 text-yellow-600">⚠️ 建議至少 20 筆</span>
                )}
              </span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-yellow-200">
            <p className="text-sm text-gray-700">
              💡 建議：多參加幾次市集，累積更多數據後，評估會更準確
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 子組件 ====================

interface MetricCardProps {
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  comparison: {
    label: string;
    value: string;
  };
  trend: {
    icon: string;
    text: string;
    color: string;
  };
  percentile: number;
}

function MetricCard({ icon, title, value, subtitle, comparison, trend, percentile }: MetricCardProps) {
  const isGood = percentile > 50;
  
  // 根據標題選擇對應的 tooltip
  const getTooltipContent = (title: string) => {
    if (title.includes('時薪')) return tooltipContent.hourlyProfit;
    if (title.includes('成交')) return tooltipContent.conversionRate;
    if (title.includes('客單價')) return tooltipContent.aov;
    return null;
  };
  
  const tooltipData = getTooltipContent(title);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl">{icon}</span>
        <span className={`text-sm font-medium ${trend.color}`}>
          {trend.icon} {trend.text}
        </span>
      </div>
      
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm text-gray-600">{title}</h3>
        {tooltipData && <InfoTooltip {...tooltipData} />}
      </div>
      <p className="text-2xl font-bold text-gray-800 mb-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
      )}
      
      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">{comparison.label}</span>
          <span className="font-medium text-gray-700">{comparison.value}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${isGood ? 'bg-green-500' : 'bg-orange-500'}`}
              style={{ width: `${Math.min(percentile, 100)}%` }}
            />
          </div>
          <span className={`text-xs font-medium ${isGood ? 'text-green-600' : 'text-orange-600'}`}>
            {isGood ? '✅' : '⚠️'} {percentile.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
