/**
 * Diagnosis Engine - 診斷分析引擎
 * 
 * 🔥 v3.3 架構升級：
 * - 分離關注點：專注於市集診斷分析
 * - 基於統計分析：使用平均值和標準差判斷
 */

import type { MarketMetrics, MarketDiagnosis, MarketDiagnosisType } from './types';

// ==================== 統計工具函數 ====================

/**
 * 計算平均值和標準差
 */
function calculateStats(values: number[]): { mean: number; std: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 0 };
  
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  
  if (n === 1) return { mean, std: 0 };
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  
  return { mean, std };
}

// ==================== 診斷引擎 ====================

/**
 * 診斷市集的經營問題並提供分類（基於預先計算的 metrics）
 * 
 * 診斷類型：
 * - 流量不足：互動數低於平均 - 標準差
 * - 轉換不足：互動數高但轉換率低
 * - 客單價偏低：成交數高但客單價低
 * - 精準高效：互動數低但轉換率和客單價都高
 * - 均衡穩定：其他情況
 * 
 * @param marketMetrics - 市集與 metrics 的配對陣列
 * @returns 市集診斷結果陣列
 * 
 * @example
 * const diagnoses = calculateDiagnosis(marketMetrics);
 * console.log(`市集診斷: ${diagnoses[0].diagnosisType}`);
 */
export function calculateDiagnosis(
  marketMetrics: Array<{ marketId: string; metrics: MarketMetrics }>
): MarketDiagnosis[] {
  console.group('🔬 診斷引擎 - calculateDiagnosis');
  
  if (!marketMetrics || marketMetrics.length === 0) {
    console.log('⚠️ 無市集數據，返回空陣列');
    console.groupEnd();
    return [];
  }

  console.log(`📊 分析 ${marketMetrics.length} 個市集`);

  // 提取指標數據
  const metricsData = marketMetrics.map(({ marketId, metrics }) => ({
    marketId,
    interaction: metrics.uniqueEngaged,
    deals: metrics.totalDeals,
    revenue: metrics.totalRevenue,
    conversionRate: metrics.conversionRate,
    aov: metrics.aov,
  }));

  console.log('📋 提取的指標數據:', metricsData);

  // 計算全體平均值和標準差
  const interactions = metricsData.map(m => m.interaction);
  const deals = metricsData.map(m => m.deals);
  const conversionRates = metricsData.map(m => m.conversionRate);
  const aovs = metricsData.map(m => m.aov);

  const interactionStats = calculateStats(interactions);
  const dealStats = calculateStats(deals);
  const conversionStats = calculateStats(conversionRates);
  const aovStats = calculateStats(aovs);

  const avgInteraction = interactionStats.mean;
  const stdInteraction = interactionStats.std;
  const avgDeals = dealStats.mean;
  const avgConversion = conversionStats.mean;
  const avgAOV = aovStats.mean;

  console.log('📈 統計數據:');
  console.log('   - 互動數: 平均', avgInteraction.toFixed(1), '標準差', stdInteraction.toFixed(1));
  console.log('   - 成交數: 平均', avgDeals.toFixed(1));
  console.log('   - 轉換率: 平均', (avgConversion * 100).toFixed(1) + '%');
  console.log('   - 客單價: 平均 $', avgAOV.toFixed(0));

  // 對每個市集進行診斷
  const results = metricsData.map(data => {
    console.group(`🏪 診斷市集: ${data.marketId}`);
    console.log('當前數據:', {
      互動數: data.interaction,
      成交數: data.deals,
      轉換率: (data.conversionRate * 100).toFixed(1) + '%',
      客單價: '$' + data.aov.toFixed(0),
    });

    let diagnosisType: MarketDiagnosisType;
    let reason = '';

    // 優先級 1：流量不足
    if (data.interaction < avgInteraction - stdInteraction) {
      diagnosisType = "流量不足";
      reason = `互動數 ${data.interaction} < 平均 ${avgInteraction.toFixed(1)} - 標準差 ${stdInteraction.toFixed(1)} = ${(avgInteraction - stdInteraction).toFixed(1)}`;
    }
    // 優先級 2：精準高效
    else if (
      data.interaction < avgInteraction &&
      data.conversionRate > avgConversion &&
      data.aov > avgAOV
    ) {
      diagnosisType = "精準高效";
      reason = `互動數 ${data.interaction} < 平均 ${avgInteraction.toFixed(1)} 且 轉換率 ${(data.conversionRate * 100).toFixed(1)}% > 平均 ${(avgConversion * 100).toFixed(1)}% 且 客單價 $${data.aov.toFixed(0)} > 平均 $${avgAOV.toFixed(0)}`;
    }
    // 優先級 3：轉換不足
    else if (
      data.interaction > avgInteraction &&
      data.conversionRate < avgConversion
    ) {
      diagnosisType = "轉換不足";
      reason = `互動數 ${data.interaction} > 平均 ${avgInteraction.toFixed(1)} 但 轉換率 ${(data.conversionRate * 100).toFixed(1)}% < 平均 ${(avgConversion * 100).toFixed(1)}%`;
    }
    // 優先級 4：客單價偏低
    else if (
      data.deals > avgDeals &&
      data.aov < avgAOV
    ) {
      diagnosisType = "客單價偏低";
      reason = `成交數 ${data.deals} > 平均 ${avgDeals.toFixed(1)} 但 客單價 $${data.aov.toFixed(0)} < 平均 $${avgAOV.toFixed(0)}`;
    }
    // 其他：均衡穩定
    else {
      diagnosisType = "均衡穩定";
      reason = '各項指標均在正常範圍內';
    }

    console.log('✅ 診斷結果:', diagnosisType);
    console.log('📝 判斷依據:', reason);
    console.groupEnd();

    return {
      marketId: data.marketId,
      diagnosisType,
    };
  });

  console.log('🎯 診斷完成，結果:', results);
  console.groupEnd();
  
  return results;
}

/**
 * 根據診斷類型取得市集改善建議
 * 
 * @param type - 診斷類型
 * @returns 改善建議文字
 */
export function getSuggestion(type: MarketDiagnosisType): string {
  switch (type) {
    case "流量不足":
      return "建議優化攤位位置或提前宣傳";
    case "轉換不足":
      return "建議優化銷售話術或定價";
    case "客單價偏低":
      return "可嘗試組合銷售提升單筆金額";
    case "精準高效":
      return "建議增加曝光或擴大備貨";
    case "均衡穩定":
      return "維持策略並持續觀察";
  }
}
