/**
 * Analytics Engine - 統一分析引擎
 * 
 * 🔥 v3.3 架構升級：
 * - Engine 架構：分離關注點，每個引擎專注於特定分析
 * - Metrics Cache：使用 WeakMap 避免重複計算
 * - Confidence Score：評估數據可信度
 * - Lift 指標：更準確的商品關聯分析
 * 
 * 🔥 v3.4 新增：
 * - 批次補登偵測：自動識別大額補登
 * - 啟發式數據拆解：預估實際成交次數
 * - 防止轉換率和客單價失真
 * 
 * 架構：
 * UI
 *  ↓
 * Analytics Engine (統一入口)
 *  ↓
 * ├─ Metrics Engine (核心指標計算 + Cache + 批次補登偵測)
 * ├─ Health Score Engine (健康評分 + 小樣本保護)
 * ├─ Diagnosis Engine (診斷分析)
 * ├─ Quadrant Engine (象限分類)
 * └─ Product Affinity Engine (商品親和力 + Lift)
 */

import type { Market } from '@/types/db';
import type { MarketPulseDB } from '@/lib/db';
import type { MarketAnalytics, MarketOverview } from './types';

// 導入各個引擎（用於內部函數）
import { calculateMarketMetrics, calculateBatchMetrics, clearMetricsCache } from './metrics-engine';
import { calculateHealthScores, getSummaryLabel } from './health-score-engine';
import { calculateDiagnosis, getSuggestion } from './diagnosis-engine';
import { calculateQuadrants } from './quadrant-engine';
import { getAnalyticsCache } from './cache-manager';

// 重新導出型別
export type * from './types';

// 重新導出引擎函數
export { calculateMarketMetrics, calculateBatchMetrics, clearMetricsCache } from './metrics-engine';
export { calculateHealthScores, getSummaryLabel } from './health-score-engine';
export { calculateDiagnosis, getSuggestion } from './diagnosis-engine';
export { calculateQuadrants } from './quadrant-engine';
export { 
  calculateProductAffinity, 
  filterStrongAssociations, 
  getProductRecommendations,
  calculateDailyRevenue 
} from './product-affinity-engine';

// 重新導出快取管理器
export { getAnalyticsCache, resetAnalyticsCache, AnalyticsCache } from './cache-manager';

// 重新導出解鎖邏輯
export { 
  getUnlockStatus, 
  getFeatureUnlockStatus, 
  getDataReliability,
  UNLOCK_MILESTONES 
} from './unlock-logic';
export type { FeatureType, UnlockMilestone, UnlockStatus } from './unlock-logic';

// ==================== 統一分析引擎 ====================

/**
 * 計算單一市集的完整分析結果
 * 
 * 🔥 v3.3 架構優化：
 * - 使用 Engine 架構
 * - Metrics Cache：避免重複計算
 * - Confidence Score：評估數據可信度
 * 
 * 🔥 v3.4 新增：
 * - 批次補登偵測：自動識別大額補登並調整成交次數
 * 
 * @param market - 市集資料
 * @param options - 選項
 * @returns 完整的市集分析結果
 * 
 * @example
 * const analytics = await computeMarketAnalytics(market, { db, allMarkets });
 * console.log(`健康評分: ${analytics.healthScore.healthScore} 分`);
 * console.log(`可信度: ${analytics.metrics.confidenceLevel}`);
 * if (analytics.metrics.batchEntryWarnings) {
 *   console.log(`偵測到 ${analytics.metrics.batchEntryWarnings.length} 筆批次補登`);
 * }
 */
export async function computeMarketAnalytics(
  market: Market,
  options: { 
    useCache?: boolean; 
    verbose?: boolean;
    db?: MarketPulseDB;
    allMarkets?: Market[];
    enableBatchEntryCorrection?: boolean;
  } = {}
): Promise<MarketAnalytics> {
  // 使用批次分析（避免重複計算）
  const batchResults = await computeBatchMarketAnalytics([market], options);
  return batchResults[0];
}

/**
 * 批次計算多個市集的完整分析結果
 * 
 * 🔥 v3.3 架構優化：
 * - Engine 架構：各引擎分工明確
 * - 一次性計算所有指標（避免重複計算）
 * - Metrics Cache：React rerender 時不會重算
 * - 包含象限分類（需要比較所有市集）
 * 
 * 🔥 v3.4 新增：
 * - 批次補登偵測：自動識別大額補登並調整成交次數
 * 
 * 🔥 v3.5 新增：
 * - 智能快取：已結束市集從 localStorage 讀取
 * - 自動偵測補登：有新補登時自動重新計算
 * 
 * @param markets - 市集陣列
 * @param options - 選項
 * @returns 完整的市集分析結果陣列
 * 
 * @example
 * const analyticsArray = await computeBatchMarketAnalytics(markets, { db });
 * const starMarkets = analyticsArray.filter(a => a.quadrant === 'star');
 * const withBatchEntry = analyticsArray.filter(a => a.metrics.batchEntryWarnings);
 * console.log(`明星市集: ${starMarkets.length} 個`);
 * console.log(`有批次補登: ${withBatchEntry.length} 個`);
 */
export async function computeBatchMarketAnalytics(
  markets: Market[],
  options: { 
    useCache?: boolean; 
    verbose?: boolean;
    db?: MarketPulseDB;
    enableBatchEntryCorrection?: boolean;
  } = {}
): Promise<MarketAnalytics[]> {
  if (!markets || markets.length === 0) {
    return [];
  }
  
  const { useCache = true, db } = options;
  
  // 🔥 v3.5: 使用快取管理器
  let allMetrics;
  
  if (useCache && db) {
    const cache = getAnalyticsCache();
    allMetrics = await cache.getBatchMarketMetrics(markets, db);
  } else {
    // 不使用快取，直接計算
    allMetrics = await calculateBatchMetrics(markets, options);
  }
  
  // Step 2: 計算象限分類（使用 Quadrant Engine）
  const quadrants = calculateQuadrants(
    allMetrics.map(({ market, metrics }) => ({ market, metrics }))
  );
  
  // 建立市集 ID 到象限的映射
  const marketToQuadrant = new Map<string, 'star' | 'potential' | 'precise' | 'observable'>();
  
  quadrants.stars.forEach(m => marketToQuadrant.set(m.id!, 'star'));
  quadrants.potentials.forEach(m => marketToQuadrant.set(m.id!, 'potential'));
  quadrants.precisies.forEach(m => marketToQuadrant.set(m.id!, 'precise'));
  quadrants.observables.forEach(m => marketToQuadrant.set(m.id!, 'observable'));
  
  // Step 3: 批次計算健康評分（使用 Health Score Engine）
  const healthScores = calculateHealthScores(
    allMetrics.map(({ marketId, metrics }) => ({ marketId, metrics }))
  );
  const healthScoreMap = new Map(healthScores.map(h => [h.marketId, h]));
  
  // Step 4: 批次計算診斷結果（使用 Diagnosis Engine）
  const diagnoses = calculateDiagnosis(
    allMetrics.map(({ marketId, metrics }) => ({ marketId, metrics }))
  );
  const diagnosisMap = new Map(diagnoses.map(d => [d.marketId, d]));
  
  // Step 5: 組合所有分析結果
  return allMetrics.map(({ market, marketId, metrics }) => {
    const healthScore = healthScoreMap.get(marketId)!;
    const diagnosis = diagnosisMap.get(marketId)!;
    const quadrant = marketToQuadrant.get(marketId);
    
    // 建立 overview
    const summaryLabel = getSummaryLabel(healthScore.healthScore);
    const suggestion = getSuggestion(diagnosis.diagnosisType);
    
    const overview: MarketOverview = {
      healthScore: healthScore.healthScore,
      summaryLabel,
      diagnosisType: diagnosis.diagnosisType,
      suggestion,
      keyStats: {
        hourlyProfit: metrics.hourlyProfit,
        conversionRate: metrics.conversionRate * 100,
        aov: metrics.aov,
      },
    };
    
    return {
      marketId,
      metrics,
      healthScore,
      diagnosis,
      quadrant,
      overview,
    };
  });
}

// ==================== 工具函數 ====================

/**
 * 清除所有快取（用於測試或強制重新計算）
 */
export function clearAllCaches(): void {
  clearMetricsCache();
}

/**
 * 建立市集的完整總覽資訊
 * 
 * 🔥 v3.3 架構：組合各個 Engine 的結果
 * 
 * 整合健康評分、摘要標籤、診斷類型和改善建議
 * 
 * @param market - 市集資料
 * @param options - 選項
 * @returns 市集總覽物件
 * 
 * @example
 * const overview = await buildMarketOverview(market, { db, allMarkets });
 * console.log(`評分: ${overview.healthScore} 分`);
 * console.log(`標籤: ${overview.summaryLabel}`);
 * console.log(`診斷: ${overview.diagnosisType}`);
 * console.log(`建議: ${overview.suggestion}`);
 */
export async function buildMarketOverview(
  market: Market,
  options: {
    db?: MarketPulseDB;
    allMarkets?: Market[];
    enableBatchEntryCorrection?: boolean;
  } = {}
): Promise<MarketOverview> {
  console.group(`🔍 市集總覽計算 - ${market.name}`);
  
  // 1. 計算 metrics
  console.log('📊 步驟 1: 計算市集指標 (metrics)');
  const metrics = await calculateMarketMetrics(market, options);
  console.log('✅ Metrics 計算完成:', {
    hourlyProfit: metrics.hourlyProfit,
    conversionRate: metrics.conversionRate,
    aov: metrics.aov,
    totalInteractions: metrics.uniqueEngaged,
    totalDeals: metrics.totalDeals,
    totalRevenue: metrics.totalRevenue,
  });
  
  // 2. 計算健康評分
  console.log('📊 步驟 2: 計算健康評分');
  const healthScores = calculateHealthScores([{ marketId: market.id!, metrics }]);
  const healthScoreData = healthScores[0];
  const healthScore = healthScoreData ? healthScoreData.healthScore : 0;
  console.log('✅ 健康評分:', healthScore, '分');
  if (healthScoreData) {
    console.log('   - 評分細節:', {
      hourlyProfitZ: healthScoreData.zScores.hourlyProfitZ,
      conversionRateZ: healthScoreData.zScores.conversionRateZ,
      aovZ: healthScoreData.zScores.aovZ,
    });
  }
  
  // 3. 取得摘要標籤
  console.log('📊 步驟 3: 取得摘要標籤');
  const summaryLabel = getSummaryLabel(healthScore);
  console.log('✅ 摘要標籤:', summaryLabel);
  
  // 4. 計算診斷類型
  console.log('📊 步驟 4: 計算診斷類型 (人流品質)');
  const diagnoses = calculateDiagnosis([{ marketId: market.id!, metrics }]);
  const diagnosis = diagnoses[0];
  const diagnosisType = diagnosis ? diagnosis.diagnosisType : "均衡穩定";
  console.log('✅ 診斷類型:', diagnosisType);
  if (diagnosis) {
    console.log('   - 診斷依據:', {
      conversionRate: `${(metrics.conversionRate * 100).toFixed(1)}%`,
      totalInteractions: metrics.uniqueEngaged,
      判斷邏輯: diagnosis.diagnosisType,
    });
  }
  
  // 5. 取得改善建議
  console.log('📊 步驟 5: 取得改善建議');
  const suggestion = getSuggestion(diagnosisType);
  console.log('✅ 改善建議:', suggestion);
  
  // 6. 組合結果
  const result = {
    healthScore,
    summaryLabel,
    diagnosisType,
    suggestion,
    keyStats: {
      hourlyProfit: metrics.hourlyProfit,
      conversionRate: metrics.conversionRate * 100, // 轉為百分比
      aov: metrics.aov,
    },
  };
  
  console.log('🎯 最終結果:', result);
  console.groupEnd();
  
  return result;
}

/**
 * 取得分析摘要統計
 * 
 * @param analyticsArray - 分析結果陣列
 * @returns 摘要統計
 */
export function getAnalyticsSummary(analyticsArray: MarketAnalytics[]) {
  const total = analyticsArray.length;
  
  if (total === 0) {
    return {
      total: 0,
      avgHealthScore: 0,
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0,
      stars: 0,
      potentials: 0,
      precisies: 0,
      observables: 0,
    };
  }
  
  const avgHealthScore = analyticsArray.reduce(
    (sum, a) => sum + a.healthScore.healthScore, 0
  ) / total;
  
  const highConfidence = analyticsArray.filter(
    a => a.metrics.confidenceLevel === '高'
  ).length;
  
  const mediumConfidence = analyticsArray.filter(
    a => a.metrics.confidenceLevel === '中'
  ).length;
  
  const lowConfidence = analyticsArray.filter(
    a => a.metrics.confidenceLevel === '低'
  ).length;
  
  const stars = analyticsArray.filter(a => a.quadrant === 'star').length;
  const potentials = analyticsArray.filter(a => a.quadrant === 'potential').length;
  const precisies = analyticsArray.filter(a => a.quadrant === 'precise').length;
  const observables = analyticsArray.filter(a => a.quadrant === 'observable').length;
  
  return {
    total,
    avgHealthScore,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    stars,
    potentials,
    precisies,
    observables,
  };
}
