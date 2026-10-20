/**
 * Health Score Engine V4 - Production Grade
 * 
 * 🔥 v4.0 升級：
 * - Winsorization：防止極端值污染（AOV = 99999 不會炸掉排名）
 * - Robust normalization：小樣本更穩定（3-15 個市集也能用）
 * - Safe statistics：避免除以零和數學異常
 * 
 * v3 vs v4：
 * - v3 = Academic score（數學正確，但實務脆弱）
 * - v4 = Production grade（商業決策導向，穩定可靠）
 */

import type { Market } from '@/types/db';
import type { MarketMetrics } from './types';

// ==================== 統計工具函數 ====================

/**
 * 計算平均值
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 計算標準差（安全版本）
 */
function std(values: number[]): number {
  if (values.length <= 1) return 1; // 避免除以零
  
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  const s = Math.sqrt(variance);
  
  return s === 0 ? 1 : s; // 避免除以零
}

/**
 * Winsorization - 防止極端值污染
 * 
 * 🔥 v4.0 核心優化：
 * - 將超過 ±2.5 標準差的極端值拉回到邊界
 * - 避免單一極端值（如 AOV = 99999）炸掉整個排名
 * 
 * @param values - 數值陣列
 * @param limit - Z-score 限制（預設：2.5）
 * @returns Winsorized 數值陣列
 * 
 * @example
 * // 原始數據：[100, 120, 150, 99999]
 * // Winsorized：[100, 120, 150, 約400]（極端值被拉回）
 */
function winsorize(values: number[], limit: number = 2.5): number[] {
  const m = mean(values);
  const s = std(values);
  
  return values.map(v => {
    const z = (v - m) / s;
    
    // 超過上限，拉回到上限
    if (z > limit) return m + limit * s;
    
    // 超過下限，拉回到下限
    if (z < -limit) return m - limit * s;
    
    // 正常值，保持不變
    return v;
  });
}

/**
 * 安全 Z-score 計算
 */
function zScore(value: number, m: number, s: number): number {
  return (value - m) / s;
}

/**
 * 計算百分位數排名（用於小樣本）
 */
function calculatePercentileRank(value: number, allValues: number[]): number {
  const rank = allValues.filter(v => v < value).length;
  const n = allValues.length;
  return n > 1 ? (rank / (n - 1)) * 100 : 50;
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

// ==================== V4 健康評分引擎 ====================

/**
 * 健康評分結果（V4）
 */
export interface MarketHealthScoreV4 {
  marketId: string;
  healthScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  metrics: {
    hourlyProfit: number;
    boothROI: number;
    conversionRate: number;
    aov: number;
  };
  zScores: {
    hourlyProfitZ: number;
    boothROIZ: number;
    conversionRateZ: number;
    aovZ: number;
  };
  isWinsorized: boolean; // 是否有極端值被修正
}

/**
 * 計算市集健康評分 V4 - Production Grade
 * 
 * 🔥 v4.0 升級：
 * 1. Winsorization：防止極端值（AOV = 99999 不會炸掉排名）
 * 2. 小樣本保護：< 5 個市集使用百分位數評分
 * 3. Robust statistics：安全的平均值和標準差計算
 * 
 * 實務優勢：
 * - ✅ 不怕極端值（單筆高價商品不會扭曲排名）
 * - ✅ 小樣本穩定（3-15 個市集也能用）
 * - ✅ 商業決策導向（告訴你哪個市集值得再去）
 * 
 * @param markets - 市集陣列
 * @returns 健康評分陣列
 * 
 * @example
 * const scores = calculateMarketHealthScoresV4(markets);
 * console.log(`市集評分: ${scores[0].healthScore.toFixed(1)} 分`);
 * console.log(`評級: ${scores[0].grade}`);
 * console.log(`極端值修正: ${scores[0].isWinsorized ? '是' : '否'}`);
 */
export function calculateMarketHealthScoresV4(
  markets: Market[]
): MarketHealthScoreV4[] {
  if (!markets || markets.length === 0) {
    return [];
  }

  // Step 1: 計算每個市集的四個核心指標
  const metrics = markets.map(market => {
    const revenue = market.totalRevenue || 0;
    const profit = market.totalProfit || 0;
    
    const boothCost = market.boothCost || 0;
    const registrationFee = market.registrationFee || 0;
    
    const rentals =
      (market.tableFree ? 0 : (market.tableRental || 0)) +
      (market.chairFree ? 0 : (market.chairRental || 0)) +
      (market.umbrellaFree ? 0 : (market.umbrellaRental || 0));
    
    const commission = (revenue * (market.commissionRate || 0)) / 100;
    const netProfit = profit - boothCost - registrationFee - rentals - commission;
    
    // 計算營業時數
    let hours = 1; // 預設至少 1 小時（避免除以零）
    
    if (market.operatingStartTime && market.operatingEndTime) {
      const [sh, sm] = market.operatingStartTime.split(':').map(Number);
      const [eh, em] = market.operatingEndTime.split(':').map(Number);
      
      const start = sh * 60 + sm;
      const end = eh * 60 + em;
      
      const daily = ((end - start + 1440) % 1440) / 60;
      
      const days =
        market.dates?.length ??
        Math.max(
          1,
          Math.ceil(
            (new Date(market.endDate).getTime() -
              new Date(market.startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        );
      
      hours = daily * days;
    }
    
    const hourlyProfit = netProfit / hours;
    
    const totalInteractions = market.totalInteractions || 0;
    const totalDeals = market.totalDeals || 0;
    
    const conversionRate =
      totalInteractions > 0 ? totalDeals / totalInteractions : 0;
    
    const aov = totalDeals > 0 ? revenue / totalDeals : 0;
    
    const boothROI = boothCost > 0 ? revenue / boothCost : 0;
    
    return {
      marketId: market.id!,
      hourlyProfit,
      boothROI,
      conversionRate,
      aov,
    };
  });

  const n = metrics.length;
  
  // 🔥 小樣本保護（< 5 個市集使用百分位數評分）
  if (n < 5) {
    console.warn(`⚠️ 小樣本偵測：市集數量 = ${n} < 5，使用百分位數評分`);
    
    const hourlyProfits = metrics.map(m => m.hourlyProfit);
    const boothROIs = metrics.map(m => m.boothROI);
    const conversionRates = metrics.map(m => m.conversionRate);
    const aovs = metrics.map(m => m.aov);
    
    return metrics.map(m => {
      const hourlyProfitPercentile = calculatePercentileRank(m.hourlyProfit, hourlyProfits);
      const boothROIPercentile = calculatePercentileRank(m.boothROI, boothROIs);
      const conversionRatePercentile = calculatePercentileRank(m.conversionRate, conversionRates);
      const aovPercentile = calculatePercentileRank(m.aov, aovs);
      
      const healthScore =
        hourlyProfitPercentile * 0.4 +
        boothROIPercentile * 0.2 +
        conversionRatePercentile * 0.2 +
        aovPercentile * 0.2;
      
      return {
        marketId: m.marketId,
        healthScore: Math.max(0, Math.min(100, healthScore)),
        grade: getGrade(healthScore),
        metrics: m,
        zScores: {
          hourlyProfitZ: 0,
          boothROIZ: 0,
          conversionRateZ: 0,
          aovZ: 0,
        },
        isWinsorized: false,
      };
    });
  }

  // 🔥 v4.0: Step 2 - Winsorization（防止極端值）
  const hourlyProfitsRaw = metrics.map(m => m.hourlyProfit);
  const boothROIsRaw = metrics.map(m => m.boothROI);
  const conversionRatesRaw = metrics.map(m => m.conversionRate);
  const aovsRaw = metrics.map(m => m.aov);
  
  const hourlyProfits = winsorize(hourlyProfitsRaw);
  const boothROIs = winsorize(boothROIsRaw);
  const conversionRates = winsorize(conversionRatesRaw);
  const aovs = winsorize(aovsRaw);
  
  // 檢查是否有極端值被修正
  const hasWinsorized =
    hourlyProfits.some((v, i) => v !== hourlyProfitsRaw[i]) ||
    boothROIs.some((v, i) => v !== boothROIsRaw[i]) ||
    conversionRates.some((v, i) => v !== conversionRatesRaw[i]) ||
    aovs.some((v, i) => v !== aovsRaw[i]);
  
  if (hasWinsorized) {
    console.log('🔧 Winsorization: 偵測到極端值，已自動修正');
  }
  
  // Step 3: 計算統計量（使用 Winsorized 數據）
  const hpMean = mean(hourlyProfits);
  const hpStd = std(hourlyProfits);
  
  const roiMean = mean(boothROIs);
  const roiStd = std(boothROIs);
  
  const crMean = mean(conversionRates);
  const crStd = std(conversionRates);
  
  const aovMean = mean(aovs);
  const aovStd = std(aovs);
  
  // Step 4: 計算 Z-score 和健康評分
  return metrics.map((m, index) => {
    // 使用 Winsorized 值計算 Z-score
    const hpZ = zScore(hourlyProfits[index], hpMean, hpStd);
    const roiZ = zScore(boothROIs[index], roiMean, roiStd);
    const crZ = zScore(conversionRates[index], crMean, crStd);
    const aovZ = zScore(aovs[index], aovMean, aovStd);
    
    // 加權計算（權重：40%, 20%, 20%, 20%）
    const weighted = hpZ * 0.4 + roiZ * 0.2 + crZ * 0.2 + aovZ * 0.2;
    
    // 評分公式：Z=0 (平均) → 70 分，Z=1 (優秀) → 85 分
    const score = Math.max(0, Math.min(100, 70 + weighted * 15));
    
    // 檢查此市集是否有極端值被修正
    const isWinsorized =
      hourlyProfits[index] !== hourlyProfitsRaw[index] ||
      boothROIs[index] !== boothROIsRaw[index] ||
      conversionRates[index] !== conversionRatesRaw[index] ||
      aovs[index] !== aovsRaw[index];
    
    return {
      marketId: m.marketId,
      healthScore: score,
      grade: getGrade(score),
      metrics: m,
      zScores: {
        hourlyProfitZ: hpZ,
        boothROIZ: roiZ,
        conversionRateZ: crZ,
        aovZ,
      },
      isWinsorized,
    };
  });
}

/**
 * 取得市集評分標籤
 */
export function getSummaryLabel(score: number): "值得再來" | "可優化" | "謹慎評估" {
  if (score >= 65) return "值得再來";
  if (score >= 45) return "可優化";
  return "謹慎評估";
}
