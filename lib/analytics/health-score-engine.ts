/**
 * Health Score Engine - 健康評分計算引擎
 * 
 * 🔥 v3.3 架構升級：
 * - 分離關注點：專注於健康評分計算
 * - 小樣本保護：< 5 個市集使用百分位數評分
 * - Z-score 標準化：≥ 5 個市集使用 Z-score
 */

import type { MarketMetrics, MarketHealthScore } from './types';

// ==================== 統計工具函數 ====================

/**
 * 計算平均值和標準差
 */
function calculateStats(values: number[]): { mean: number; std: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 0 };
  
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  
  if (n === 1) return { mean, std: 1 }; // 避免除以零
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  
  return { mean, std: std === 0 ? 1 : std }; // 避免除以零
}

/**
 * 計算百分位數排名
 */
function calculatePercentileRank(value: number, allValues: number[]): number {
  const rank = allValues.filter(v => v < value).length;
  const n = allValues.length;
  return n > 1 ? (rank / (n - 1)) * 100 : 50; // 單一值返回 50%
}

/**
 * 根據評分取得評級
 */
function getGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 85) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  return 'D';
}

// ==================== 健康評分引擎 ====================

/**
 * 計算市集綜合健康評分（基於預先計算的 metrics）
 * 
 * 🔥 v3.3 優化：
 * - 小樣本保護（< 5 個市集使用百分位數評分）
 * - 大樣本使用 Z-score 標準化
 * - 權重分配：每小時淨利 40%、攤位費回收率 20%、轉換率 20%、客單價 20%
 * 
 * @param marketMetrics - 市集與 metrics 的配對陣列
 * @returns 市集健康評分陣列
 * 
 * @example
 * const scores = calculateHealthScores(marketMetrics);
 * console.log(`市集評分: ${scores[0].healthScore.toFixed(1)} 分`);
 * console.log(`評級: ${scores[0].grade}`);
 */
export function calculateHealthScores(
  marketMetrics: Array<{ marketId: string; metrics: MarketMetrics }>
): MarketHealthScore[] {
  console.group('💯 健康評分引擎 - calculateHealthScores');
  
  if (!marketMetrics || marketMetrics.length === 0) {
    console.log('⚠️ 無市集數據，返回空陣列');
    console.groupEnd();
    return [];
  }

  console.log(`📊 分析 ${marketMetrics.length} 個市集`);

  // 提取四個核心指標
  const metricsData = marketMetrics.map(({ marketId, metrics }) => ({
    marketId,
    hourlyProfit: metrics.hourlyProfit,
    boothROI: metrics.boothROI,
    conversionRate: metrics.conversionRate * 100, // 轉為百分比
    aov: metrics.aov,
  }));

  console.log('📋 提取的核心指標:', metricsData);

  const n = metricsData.length;
  
  // 🔥 小樣本保護（< 5 個市集使用百分位數評分）
  if (n < 5) {
    console.warn(`⚠️ 小樣本偵測：市集數量 = ${n} < 5，使用百分位數評分以避免 Z-score 不穩定`);
    
    const hourlyProfits = metricsData.map(m => m.hourlyProfit);
    const boothROIs = metricsData.map(m => m.boothROI);
    const conversionRates = metricsData.map(m => m.conversionRate);
    const aovs = metricsData.map(m => m.aov);
    
    const results = metricsData.map(data => {
      console.group(`🏪 評分市集: ${data.marketId}`);
      
      // 計算每個指標的百分位數排名
      const hourlyProfitPercentile = calculatePercentileRank(data.hourlyProfit, hourlyProfits);
      const boothROIPercentile = calculatePercentileRank(data.boothROI, boothROIs);
      const conversionRatePercentile = calculatePercentileRank(data.conversionRate, conversionRates);
      const aovPercentile = calculatePercentileRank(data.aov, aovs);
      
      console.log('📊 百分位數排名:');
      console.log(`   - 每小時淨利: ${hourlyProfitPercentile.toFixed(1)}%`);
      console.log(`   - 攤位費回收率: ${boothROIPercentile.toFixed(1)}%`);
      console.log(`   - 轉換率: ${conversionRatePercentile.toFixed(1)}%`);
      console.log(`   - 客單價: ${aovPercentile.toFixed(1)}%`);
      
      // 加權計算（權重：40%, 20%, 20%, 20%）
      const rawScore = 
        (hourlyProfitPercentile * 0.4) +
        (boothROIPercentile * 0.2) +
        (conversionRatePercentile * 0.2) +
        (aovPercentile * 0.2);
      
      console.log('🧮 加權計算:');
      console.log(`   ${hourlyProfitPercentile.toFixed(1)} × 40% + ${boothROIPercentile.toFixed(1)} × 20% + ${conversionRatePercentile.toFixed(1)} × 20% + ${aovPercentile.toFixed(1)} × 20%`);
      console.log(`   原始評分: ${rawScore.toFixed(1)} 分`);
      
      // 🔥 初期數據穩定化：3-4 場時向 70 分靠攏 30%
      let healthScore = rawScore;
      if (n === 3 || n === 4) {
        healthScore = (rawScore * 0.7) + (70 * 0.3);
        console.log('🎯 初期穩定化調整:');
        console.log(`   ${rawScore.toFixed(1)} × 70% + 70 × 30% = ${healthScore.toFixed(1)} 分`);
      }
      
      console.log(`✅ 健康評分: ${healthScore.toFixed(1)} 分`);
      console.log(`🏆 評級: ${getGrade(healthScore)}`);
      console.groupEnd();
      
      return {
        marketId: data.marketId,
        healthScore: Math.max(0, Math.min(100, healthScore)),
        metrics: {
          hourlyProfit: data.hourlyProfit,
          boothROI: data.boothROI,
          conversionRate: data.conversionRate,
          aov: data.aov,
        },
        zScores: {
          hourlyProfitZ: 0, // 小樣本不使用 Z-score
          boothROIZ: 0,
          conversionRateZ: 0,
          aovZ: 0,
        },
        grade: getGrade(healthScore),
      };
    });
    
    console.log('🎯 評分完成 (小樣本模式)');
    console.groupEnd();
    return results;
  }

  // 🔥 大樣本（≥ 5）：使用 Z-score 標準化
  console.log('📈 大樣本模式：使用 Z-score 標準化');
  
  const hourlyProfits = metricsData.map(m => m.hourlyProfit);
  const boothROIs = metricsData.map(m => m.boothROI);
  const conversionRates = metricsData.map(m => m.conversionRate);
  const aovs = metricsData.map(m => m.aov);

  const hourlyProfitStats = calculateStats(hourlyProfits);
  const boothROIStats = calculateStats(boothROIs);
  const conversionRateStats = calculateStats(conversionRates);
  const aovStats = calculateStats(aovs);

  console.log('📊 統計數據:');
  console.log(`   - 每小時淨利: 平均 $${hourlyProfitStats.mean.toFixed(0)}, 標準差 $${hourlyProfitStats.std.toFixed(0)}`);
  console.log(`   - 攤位費回收率: 平均 ${boothROIStats.mean.toFixed(1)}%, 標準差 ${boothROIStats.std.toFixed(1)}%`);
  console.log(`   - 轉換率: 平均 ${conversionRateStats.mean.toFixed(1)}%, 標準差 ${conversionRateStats.std.toFixed(1)}%`);
  console.log(`   - 客單價: 平均 $${aovStats.mean.toFixed(0)}, 標準差 $${aovStats.std.toFixed(0)}`);

  const results = metricsData.map(data => {
    console.group(`🏪 評分市集: ${data.marketId}`);
    console.log('當前數據:', {
      每小時淨利: '$' + data.hourlyProfit.toFixed(0),
      攤位費回收率: data.boothROI.toFixed(1) + '%',
      轉換率: data.conversionRate.toFixed(1) + '%',
      客單價: '$' + data.aov.toFixed(0),
    });
    
    // 計算 Z-scores
    const hourlyProfitZ = (data.hourlyProfit - hourlyProfitStats.mean) / hourlyProfitStats.std;
    const boothROIZ = (data.boothROI - boothROIStats.mean) / boothROIStats.std;
    const conversionRateZ = (data.conversionRate - conversionRateStats.mean) / conversionRateStats.std;
    const aovZ = (data.aov - aovStats.mean) / aovStats.std;

    console.log('📊 Z-scores:');
    console.log(`   - 每小時淨利: ${hourlyProfitZ.toFixed(2)}`);
    console.log(`   - 攤位費回收率: ${boothROIZ.toFixed(2)}`);
    console.log(`   - 轉換率: ${conversionRateZ.toFixed(2)}`);
    console.log(`   - 客單價: ${aovZ.toFixed(2)}`);

    // 加權計算（權重：40%, 20%, 20%, 20%）
    const weightedScore = 
      (hourlyProfitZ * 0.4) +
      (boothROIZ * 0.2) +
      (conversionRateZ * 0.2) +
      (aovZ * 0.2);

    console.log('🧮 加權 Z-score:');
    console.log(`   ${hourlyProfitZ.toFixed(2)} × 40% + ${boothROIZ.toFixed(2)} × 20% + ${conversionRateZ.toFixed(2)} × 20% + ${aovZ.toFixed(2)} × 20% = ${weightedScore.toFixed(2)}`);

    // 評分公式：Z=0 (平均) → 70 分，Z=1 (優秀) → 85 分
    const healthScore = Math.max(0, Math.min(100, 70 + weightedScore * 15));

    console.log('🧮 健康評分計算:');
    console.log(`   70 + ${weightedScore.toFixed(2)} × 15 = ${healthScore.toFixed(1)} 分`);
    console.log(`✅ 最終評分: ${healthScore.toFixed(1)} 分`);
    console.log(`🏆 評級: ${getGrade(healthScore)}`);
    console.groupEnd();

    return {
      marketId: data.marketId,
      healthScore,
      metrics: {
        hourlyProfit: data.hourlyProfit,
        boothROI: data.boothROI,
        conversionRate: data.conversionRate,
        aov: data.aov,
      },
      zScores: {
        hourlyProfitZ,
        boothROIZ,
        conversionRateZ,
        aovZ,
      },
      grade: getGrade(healthScore),
    };
  });

  console.log('🎯 評分完成 (大樣本模式)');
  console.groupEnd();
  return results;
}

/**
 * 取得市集評分標籤
 * 
 * @param score - 健康評分（0-100）
 * @returns 市集摘要標籤
 */
export function getSummaryLabel(score: number): "值得再來" | "可優化" | "謹慎評估" {
  if (score >= 65) return "值得再來";
  if (score >= 45) return "可優化";
  return "謹慎評估";
}
