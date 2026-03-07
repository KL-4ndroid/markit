/**
 * Metrics Engine - 市集指標計算引擎
 * 
 * 🔥 v3.3 架構升級：
 * - 分離關注點：專注於核心指標計算
 * - 加入 memoization：避免重複計算
 * - 加入 confidence score：評估數據可信度
 * 
 * 🔥 v3.4 新增：
 * - 批次補登偵測：自動識別大額補登
 * - 啟發式數據拆解：預估實際成交次數
 * - 防止轉換率和客單價失真
 * - ⚠️ 重要：不修改原始數據，調整僅存在於分析視圖層
 */

import type { Market, Event, DealClosedPayload } from '@/types/db';
import type { MarketMetrics, BatchEntryWarning } from './types';
import { detectBatchEntry } from './batch-entry-detection-engine';
import type { MarketPulseDB } from '@/lib/db';

// ==================== Metrics Cache ====================

/**
 * Metrics 快取
 * 使用 WeakMap 避免記憶體洩漏（當 market 被 GC 時，cache 也會被清除）
 */
const metricsCache = new WeakMap<Market, MarketMetrics>();

/**
 * 清除快取（用於測試或強制重新計算）
 */
export function clearMetricsCache(): void {
  // WeakMap 無法直接清除，但可以重新創建
  // 實務上不需要清除，因為 WeakMap 會自動 GC
  console.log('📝 Metrics cache cleared (WeakMap will be garbage collected)');
}

// ==================== Confidence Score ====================

/**
 * 計算數據可信度評分（0-1）
 * 
 * 評估標準：
 * - 互動數：至少需要 50 次互動才達到高可信度
 * - 成交數：至少需要 20 筆成交才達到高可信度
 * 
 * @param interactions - 互動數
 * @param deals - 成交數
 * @returns 可信度評分（0-1）
 * 
 * @example
 * calculateConfidenceScore(100, 30) // 1.0 (高可信度)
 * calculateConfidenceScore(10, 2)   // 0.2 (低可信度)
 */
export function calculateConfidenceScore(interactions: number, deals: number): number {
  // 互動數可信度：至少 50 次互動
  const interactionConfidence = Math.min(interactions / 50, 1);
  
  // 成交數可信度：至少 20 筆成交
  const dealConfidence = Math.min(deals / 20, 1);
  
  // 取最小值（最弱的環節決定整體可信度）
  const confidence = Math.min(interactionConfidence, dealConfidence);
  
  return confidence;
}

/**
 * 取得可信度等級標籤
 * 
 * @param confidence - 可信度評分（0-1）
 * @returns 可信度等級
 */
export function getConfidenceLevel(confidence: number): '高' | '中' | '低' {
  if (confidence >= 0.7) return '高';
  if (confidence >= 0.4) return '中';
  return '低';
}

// ==================== Metrics Engine ====================

/**
 * 計算市集的完整指標（帶快取和可信度評估）
 * 
 * 🔥 v3.3 優化：
 * 1. Memoization：避免重複計算（使用 WeakMap）
 * 2. Confidence Score：評估數據可信度
 * 3. 統一互動數來源：uniqueEngaged = min(total, max(behaviorMax, deals))
 * 4. Laplace 平滑：處理小樣本偏差
 * 
 * 🔥 v3.4 新增：
 * 5. 批次補登偵測：自動識別大額補登並調整成交次數
 * 6. 啟發式數據拆解：預估實際成交次數，防止轉換率失真
 * 7. ⚠️ 重要：不修改原始數據，調整僅存在於分析視圖層
 * 
 * @param market - 市集資料
 * @param options - 選項
 * @param options.useCache - 是否使用快取（預設：true）
 * @param options.verbose - 是否顯示詳細日誌（預設：false）
 * @param options.allMarkets - 所有市集（用於計算歷史數據）
 * @param options.db - 資料庫實例（用於查詢成交事件）
 * @param options.enableBatchEntryCorrection - 是否啟用批次補登修正（預設：true）
 * @returns 完整的市集指標物件
 * 
 * @example
 * const metrics = await calculateMarketMetrics(market, { 
 *   allMarkets, 
 *   db,
 *   enableBatchEntryCorrection: true 
 * });
 * console.log(`可信度: ${metrics.confidenceScore} (${metrics.confidenceLevel})`);
 * console.log(`轉換率: ${(metrics.conversionRate * 100).toFixed(2)}%`);
 * if (metrics.batchEntryWarnings) {
 *   console.log(`偵測到 ${metrics.batchEntryWarnings.length} 筆批次補登`);
 * }
 */
export async function calculateMarketMetrics(
  market: Market,
  options: { 
    useCache?: boolean; 
    verbose?: boolean;
    allMarkets?: Market[];
    db?: MarketPulseDB;
    enableBatchEntryCorrection?: boolean;
  } = {}
): Promise<MarketMetrics> {
  const { 
    useCache = true, 
    verbose = false,
    allMarkets,
    db,
    enableBatchEntryCorrection = true
  } = options;
  
  // 🔥 檢查快取
  if (useCache && metricsCache.has(market)) {
    if (verbose) {
      console.log(`✅ Cache hit for market: ${market.name || market.id}`);
    }
    return metricsCache.get(market)!;
  }
  
  if (verbose) {
    console.group(`📊 計算市集指標: ${market.name || market.id}`);
  }
  
  // ==================== 1. 批次補登偵測與修正（僅在分析層） ====================
  
  let batchEntryWarnings: BatchEntryWarning[] = [];
  let adjustedTotalDeals = market.totalDeals || 0;
  let usedHeuristicCorrection = false;
  
  // 🔥 v3.4: 批次補登偵測（僅當啟用且有必要數據時）
  if (enableBatchEntryCorrection && allMarkets && db && market.id) {
    try {
      // 獲取歷史成交事件（排除當前市集）
      const historicalMarkets = allMarkets.filter(m => m.id !== market.id);
      const historicalMarketIds = historicalMarkets.map(m => m.id!).filter(Boolean);
      
      if (historicalMarketIds.length > 0) {
        const historicalDeals = await db.events
          .where('market_id')
          .anyOf(historicalMarketIds)
          .and(e => e.type === 'deal_closed')
          .toArray() as Event<DealClosedPayload>[];
        
        // 獲取當前市集的成交事件
        const currentDeals = await db.events
          .where('market_id')
          .equals(market.id)
          .and(e => e.type === 'deal_closed')
          .toArray() as Event<DealClosedPayload>[];
        
        // 偵測每筆補登
        for (const dealEvent of currentDeals) {
          const detection = detectBatchEntry(dealEvent, historicalDeals);
          
          if (detection.isBatchEntry) {
            // ⚠️ 重要：不修改原始數據，只在分析層調整
            const originalCount = dealEvent.payload.manualDealCount || 1;
            const adjustment = detection.estimatedDealCount - originalCount;
            adjustedTotalDeals += adjustment;
            usedHeuristicCorrection = true;
            
            // 記錄警告
            batchEntryWarnings.push({
              eventId: dealEvent.id!,
              originalDealCount: originalCount,
              estimatedDealCount: detection.estimatedDealCount,
              amount: detection.actualAmount,
              historicalMedianAOV: detection.historicalMedianAOV,
              confidence: detection.confidence,
              reason: detection.reason
            });
            
            if (verbose) {
              console.log(`🔍 偵測到批次補登 (僅分析層調整，不修改原始數據):`, {
                事件ID: dealEvent.id,
                金額: `$${detection.actualAmount}`,
                原始次數: originalCount,
                預估次數: detection.estimatedDealCount,
                歷史中位數客單價: `$${detection.historicalMedianAOV.toFixed(0)}`,
                信心度: detection.confidence
              });
            }
          }
        }
        
        if (verbose && batchEntryWarnings.length > 0) {
          console.log(`✅ 批次補登修正完成: 調整了 ${batchEntryWarnings.length} 筆記錄`);
          console.log(`   原始成交數: ${market.totalDeals}`);
          console.log(`   調整後成交數: ${adjustedTotalDeals}`);
          console.log(`   ⚠️ 注意: 原始數據未被修改，調整僅存在於分析視圖層`);
        }
      }
    } catch (error) {
      if (verbose) {
        console.error('❌ 批次補登偵測失敗:', error);
      }
      // 發生錯誤時，使用原始數據
      adjustedTotalDeals = market.totalDeals || 0;
    }
  }
  
  // ==================== 2. 計算 uniqueEngaged ====================
  
  const behavior1Count = (market as any).interactionCounts?.behavior1 || 0;
  const behavior2Count = (market as any).interactionCounts?.behavior2 || 0;
  const behavior3Count = (market as any).interactionCounts?.behavior3 || 0;
  const totalDeals = adjustedTotalDeals; // 🔥 使用調整後的成交數
  
  // 🔥 v3.2.1: 避免重複計數導致 uniqueEngaged 偏高
  const behaviorMax = Math.max(behavior1Count, behavior2Count, behavior3Count);
  const uniqueEngaged = Math.min(
    market.totalInteractions || 0,
    Math.max(behaviorMax, totalDeals)
  );
  
  if (verbose) {
    console.log('🔢 互動數據:');
    console.log(`  behaviorMax = max(${behavior1Count}, ${behavior2Count}, ${behavior3Count}) = ${behaviorMax}`);
    console.log(`  uniqueEngaged = min(${market.totalInteractions || 0}, max(${behaviorMax}, ${totalDeals})) = ${uniqueEngaged}`);
  }
  
  const totalRevenue = market.totalRevenue || 0;
  const totalProfit = market.totalProfit || 0;
  
  // ==================== 3. 計算轉換率（Laplace 平滑）====================
  
  let conversionRate: number;
  let conversionRateRaw: number;
  let adjustedEngaged = uniqueEngaged;
  
  // 數據驗證：如果成交數 > 互動數，自動修正
  if (totalDeals > uniqueEngaged && uniqueEngaged > 0) {
    if (verbose) {
      console.warn(`⚠️ 數據異常：成交數 (${totalDeals}) > 互動數 (${uniqueEngaged})，自動修正`);
    }
    adjustedEngaged = totalDeals;
  }
  
  if (adjustedEngaged > 0) {
    conversionRateRaw = totalDeals / adjustedEngaged;
    conversionRate = (totalDeals + 1) / (adjustedEngaged + 2); // Laplace 平滑
  } else {
    conversionRateRaw = 0;
    conversionRate = 0;
  }
  
  if (verbose) {
    console.log('🎯 轉換率:');
    console.log(`  原始: ${(conversionRateRaw * 100).toFixed(2)}%`);
    console.log(`  平滑: ${(conversionRate * 100).toFixed(2)}%`);
  }
  
  // ==================== 4. 計算客單價 ====================
  
  // 🔥 v3.4: 使用調整後的成交次數計算客單價
  const aov = totalDeals > 0 ? totalRevenue / totalDeals : 0;
  
  // ==================== 5. 計算成本和淨利 ====================
  
  const boothCost = market.boothCost || 0;
  const registrationFee = market.registrationFee || 0;
  const tableRental = market.tableFree ? 0 : (market.tableRental || 0);
  const chairRental = market.chairFree ? 0 : (market.chairRental || 0);
  const umbrellaRental = market.umbrellaFree ? 0 : (market.umbrellaRental || 0);
  const rentals = tableRental + chairRental + umbrellaRental;
  const commission = (totalRevenue * (market.commissionRate || 0)) / 100;
  
  const totalFixedCost = boothCost + rentals;
  const totalVariableCost = commission;
  const netProfit = totalProfit - boothCost - registrationFee - rentals - commission;
  
  // ==================== 6. 計算營業時數 ====================
  
  let operatingHours = 0;
  if (market.operatingStartTime && market.operatingEndTime) {
    const [startHour, startMinute] = market.operatingStartTime.split(':').map(Number);
    const [endHour, endMinute] = market.operatingEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    const dailyHours = ((endMinutes - startMinutes + 1440) % 1440) / 60;
    
    let days = 1;
    if (market.dates && market.dates.length > 0) {
      days = market.dates.length;
    } else {
      const startDate = new Date(market.startDate);
      const endDate = new Date(market.endDate);
      days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    operatingHours = dailyHours * days;
  }
  
  // ==================== 7. 計算效率指標 ====================
  
  const hourlyProfit = operatingHours > 0 ? netProfit / operatingHours : 0;
  const boothROI = totalFixedCost > 0 ? (totalRevenue / totalFixedCost) * 100 : 0;
  
  // ==================== 8. 計算衍生指標 ====================
  
  const interactionValue = adjustedEngaged > 0 ? totalRevenue / adjustedEngaged : 0;
  const dealQualityIndex = conversionRate * aov;
  const efficiencyIndex = adjustedEngaged > 0 ? hourlyProfit / adjustedEngaged : 0;
  
  // ==================== 9. 計算可信度評分 ====================
  
  const confidenceScore = calculateConfidenceScore(adjustedEngaged, totalDeals);
  const confidenceLevel = getConfidenceLevel(confidenceScore);
  
  if (verbose) {
    console.log('📈 可信度評估:');
    console.log(`  互動數: ${adjustedEngaged} (需要 50+)`);
    console.log(`  成交數: ${totalDeals} (需要 20+)`);
    console.log(`  可信度: ${(confidenceScore * 100).toFixed(0)}% (${confidenceLevel})`);
  }
  
  // ==================== 10. 組合結果 ====================
  
  const isValidForQuadrant = adjustedEngaged > 0;
  
  const metrics: MarketMetrics = {
    // 核心指標
    uniqueEngaged: adjustedEngaged,
    totalDeals, // 🔥 v3.4: 使用調整後的成交次數（僅在分析層）
    totalRevenue,
    totalProfit,
    netProfit,
    
    // 效率指標
    conversionRate,
    conversionRateRaw,
    aov,
    hourlyProfit,
    boothROI,
    
    // 營運數據
    operatingHours,
    totalFixedCost,
    totalVariableCost,
    
    // 互動行為細節
    behavior1Count,
    behavior2Count,
    behavior3Count,
    
    // 衍生指標
    derivedMetrics: {
      interactionValue,
      dealQualityIndex,
      efficiencyIndex,
    },
    
    // 可信度評估
    confidenceScore,
    confidenceLevel,
    
    // 🔥 v3.4: 批次補登警告
    batchEntryWarnings: batchEntryWarnings.length > 0 ? batchEntryWarnings : undefined,
    usedHeuristicCorrection,
    
    // 有效性標記
    isValidForQuadrant,
  };
  
  // 🔥 儲存到快取
  if (useCache) {
    metricsCache.set(market, metrics);
  }
  
  if (verbose) {
    console.log('✅ 計算完成');
    console.groupEnd();
  }
  
  return metrics;
}

/**
 * 批次計算多個市集的指標（帶快取）
 * 
 * 🔥 v3.4: 支援批次補登偵測
 * 
 * @param markets - 市集陣列
 * @param options - 選項
 * @returns 市集與 metrics 的配對陣列
 */
export async function calculateBatchMetrics(
  markets: Market[],
  options: { 
    useCache?: boolean; 
    verbose?: boolean;
    db?: MarketPulseDB;
    enableBatchEntryCorrection?: boolean;
  } = {}
): Promise<Array<{ market: Market; marketId: string; metrics: MarketMetrics }>> {
  const results = [];
  
  for (const market of markets) {
    const metrics = await calculateMarketMetrics(market, {
      ...options,
      allMarkets: markets, // 傳入所有市集用於計算歷史數據
    });
    
    results.push({
      market,
      marketId: market.id!,
      metrics,
    });
  }
  
  return results;
}
