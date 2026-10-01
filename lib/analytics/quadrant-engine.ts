/**
 * Quadrant Engine - 象限分析引擎
 * 
 * 🔥 v3.3 架構升級：
 * - 分離關注點：專注於象限分類
 * - 基於互動數和轉換率的二維分析
 */

import type { Market, MarketMetrics, QuadrantResult } from './types';

// ==================== 象限分析引擎 ====================

/**
 * 將市集分類到四個象限（基於預先計算的 metrics）
 * 
 * 象限定義：
 * - 明星市集（Stars）：高互動 + 高轉換率
 * - 潛力市集（Potentials）：高互動 + 低轉換率
 * - 精準市集（Precisies）：低互動 + 高轉換率
 * - 觀察市集（Observables）：低互動 + 低轉換率
 * 
 * @param marketMetrics - 市集與 metrics 的配對陣列
 * @returns 象限分析結果
 * 
 * @example
 * const quadrants = calculateQuadrants(marketMetrics);
 * console.log(`明星市集: ${quadrants.stars.length} 個`);
 */
export function calculateQuadrants(
  marketMetrics: Array<{ market: Market; metrics: MarketMetrics }>
): QuadrantResult {
  // 檢查是否所有市集的互動數均為 0
  const hasAnyInteraction = marketMetrics.some(item => item.metrics.uniqueEngaged > 0);
  
  if (!hasAnyInteraction) {
    return {
      stars: [],
      potentials: [],
      precisies: [],
      observables: [],
      averages: {
        avgInteractions: 0,
        avgConversionRate: 0,
      },
      isEmpty: true,
    };
  }
  
  // 篩選有效市集（有互動數據）
  const validMarkets = marketMetrics.filter(item => item.metrics.isValidForQuadrant);
  
  // 若無有效市集，返回空結果
  if (validMarkets.length === 0) {
    return {
      stars: [],
      potentials: [],
      precisies: [],
      observables: [],
      averages: {
        avgInteractions: 0,
        avgConversionRate: 0,
      },
      isEmpty: true,
    };
  }
  
  // 計算平均值
  const totalInteractions = validMarkets.reduce(
    (sum, item) => sum + item.metrics.uniqueEngaged,
    0
  );
  const totalConversionRate = validMarkets.reduce(
    (sum, item) => sum + item.metrics.conversionRate,
    0
  );
  
  const avgInteractions = totalInteractions / validMarkets.length;
  const avgConversionRate = totalConversionRate / validMarkets.length;
  
  // 分類到象限
  const stars: Market[] = [];
  const potentials: Market[] = [];
  const precisies: Market[] = [];
  const observables: Market[] = [];
  
  for (const { market, metrics } of validMarkets) {
    const interactions = metrics.uniqueEngaged;
    const conversionRate = metrics.conversionRate;
    
    const isHighInteraction = interactions >= avgInteractions;
    const isHighConversion = conversionRate >= avgConversionRate;
    
    if (isHighInteraction && isHighConversion) {
      stars.push(market);
    } else if (isHighInteraction && !isHighConversion) {
      potentials.push(market);
    } else if (!isHighInteraction && isHighConversion) {
      precisies.push(market);
    } else {
      observables.push(market);
    }
  }
  
  return {
    stars,
    potentials,
    precisies,
    observables,
    averages: {
      avgInteractions,
      avgConversionRate,
    },
  };
}
