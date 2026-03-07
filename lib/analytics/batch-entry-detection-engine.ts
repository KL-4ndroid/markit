/**
 * Batch Entry Detection Engine - 批次補登偵測引擎
 * 
 * 🔥 v3.4 新增：啟發式數據拆解 (Heuristic Deconstruction)
 * 
 * 功能：
 * - 偵測大額補登記錄
 * - 預估實際成交次數
 * - 評估預估信心度
 * - 防止轉換率和客單價失真
 */

import type { Event, DealClosedPayload } from '@/types/db';
import type { BatchEntryDetectionResult } from './types';

// ==================== 統計工具函數 ====================

/**
 * 計算中位數
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

// ==================== 批次補登偵測引擎 ====================

/**
 * 偵測選項
 */
export interface BatchEntryDetectionOptions {
  multiplierThreshold?: number;  // 倍數閾值（預設 5）
  minHistoricalDeals?: number;   // 最少歷史記錄（預設 10）
  maxDealCountThreshold?: number; // 最大成交次數閾值（預設 3）
}

/**
 * 偵測是否為批次補登（大額補登）
 * 
 * 判斷標準：
 * 1. 是補登數據（isBackfill = true）
 * 2. 是手動輸入（isManualEntry = true）
 * 3. 成交次數極少（≤ 3 筆）
 * 4. 單筆金額 > 歷史中位數客單價的 N 倍（預設 5 倍）
 * 
 * @param dealEvent - 成交事件
 * @param historicalDeals - 歷史成交事件（用於計算中位數客單價）
 * @param options - 偵測選項
 * @returns 偵測結果
 * 
 * @example
 * const result = detectBatchEntry(dealEvent, historicalDeals);
 * if (result.isBatchEntry) {
 *   console.log(`預估成交次數: ${result.estimatedDealCount}`);
 * }
 */
export function detectBatchEntry(
  dealEvent: Event<DealClosedPayload>,
  historicalDeals: Event<DealClosedPayload>[],
  options?: BatchEntryDetectionOptions
): BatchEntryDetectionResult {
  const multiplier = options?.multiplierThreshold || 5;
  const minDeals = options?.minHistoricalDeals || 10;
  const maxDealCount = options?.maxDealCountThreshold || 3;
  
  const payload = dealEvent.payload;
  
  // 預設結果（非批次補登）
  const defaultResult: BatchEntryDetectionResult = {
    isBatchEntry: false,
    estimatedDealCount: payload.manualDealCount || 1,
    historicalMedianAOV: 0,
    actualAmount: payload.totalAmount,
    confidence: 'high',
    reason: '正常交易'
  };
  
  // 1. 必須是補登數據
  if (!payload.isBackfill) {
    return defaultResult;
  }
  
  // 2. 必須是手動輸入（簡化模式）
  if (!payload.isManualEntry) {
    return defaultResult;
  }
  
  // 3. 成交次數必須極少（≤ 3 筆）
  const dealCount = payload.manualDealCount || 1;
  if (dealCount > maxDealCount) {
    return defaultResult;
  }
  
  // 4. 必須有足夠的歷史數據
  if (historicalDeals.length < minDeals) {
    return {
      ...defaultResult,
      reason: `歷史數據不足（需要至少 ${minDeals} 筆，目前 ${historicalDeals.length} 筆）`
    };
  }
  
  // 5. 計算歷史中位數客單價
  const historicalAOVs = historicalDeals
    .filter(e => {
      const p = e.payload;
      // 排除其他補登數據，只用正常交易計算
      return !p.isBackfill && p.totalAmount > 0;
    })
    .map(e => {
      const p = e.payload;
      const amount = p.totalAmount;
      
      // 計算成交次數
      let count = 1;
      if (p.manualDealCount) {
        count = p.manualDealCount;
      } else if (p.items && p.items.length > 0) {
        count = p.items.length;
      }
      
      return amount / count;
    })
    .filter(aov => aov > 0); // 排除無效值
  
  if (historicalAOVs.length === 0) {
    return {
      ...defaultResult,
      reason: '無有效歷史數據（所有歷史記錄都是補登或無效）'
    };
  }
  
  // 計算中位數（比平均數更穩健）
  const medianAOV = median(historicalAOVs);
  
  if (medianAOV === 0) {
    return {
      ...defaultResult,
      reason: '歷史中位數客單價為 0'
    };
  }
  
  // 6. 計算當前客單價
  const currentAOV = payload.totalAmount / dealCount;
  
  // 7. 判斷是否異常（超過歷史中位數的 N 倍）
  const ratio = currentAOV / medianAOV;
  
  if (ratio > multiplier) {
    // 偵測到批次補登
    const estimatedCount = Math.max(1, Math.round(payload.totalAmount / medianAOV));
    
    // 計算信心度
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    
    if (historicalAOVs.length >= 30 && ratio > 10) {
      // 歷史數據充足且倍數很高 → 高信心度
      confidence = 'high';
    } else if (historicalAOVs.length < 15 || ratio < 7) {
      // 歷史數據不足或倍數較低 → 低信心度
      confidence = 'low';
    }
    
    return {
      isBatchEntry: true,
      estimatedDealCount: estimatedCount,
      historicalMedianAOV: medianAOV,
      actualAmount: payload.totalAmount,
      confidence,
      reason: `單筆金額 $${currentAOV.toFixed(0)} 是歷史中位數 $${medianAOV.toFixed(0)} 的 ${ratio.toFixed(1)} 倍`
    };
  }
  
  return defaultResult;
}

/**
 * 批次偵測多個成交事件
 * 
 * @param dealEvents - 成交事件列表
 * @param historicalDeals - 歷史成交事件
 * @param options - 偵測選項
 * @returns 偵測結果列表
 */
export function detectBatchEntries(
  dealEvents: Event<DealClosedPayload>[],
  historicalDeals: Event<DealClosedPayload>[],
  options?: BatchEntryDetectionOptions
): Array<{ eventId: string; detection: BatchEntryDetectionResult }> {
  return dealEvents.map(event => ({
    eventId: event.id!,
    detection: detectBatchEntry(event, historicalDeals, options)
  }));
}

/**
 * 計算調整後的總成交次數
 * 
 * @param originalDeals - 原始成交次數
 * @param detections - 偵測結果列表
 * @returns 調整後的成交次數
 */
export function calculateAdjustedDealCount(
  originalDeals: number,
  detections: Array<{ eventId: string; detection: BatchEntryDetectionResult }>
): number {
  let adjustment = 0;
  
  for (const { detection } of detections) {
    if (detection.isBatchEntry) {
      // 調整量 = 預估次數 - 原始次數
      const originalCount = 1; // 批次補登通常記錄為 1 筆
      adjustment += (detection.estimatedDealCount - originalCount);
    }
  }
  
  return originalDeals + adjustment;
}
