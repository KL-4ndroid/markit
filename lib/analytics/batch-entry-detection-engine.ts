import type { Event, DealClosedPayload } from '@/types/db';
import type { BatchEntryDetectionResult } from './types';
import {
  getDealEventCount,
  getDealEventRevenue,
  getDealItems,
  isBackfillDealEvent,
  isManualDealEvent,
} from '@/lib/events/event-read-model';

function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function getHistoricalDealUnitCount(event: Event<DealClosedPayload>): number {
  const explicitCount = getDealEventCount(event);
  if (explicitCount !== 1) return explicitCount;

  const itemCount = getDealItems(event).length;
  return itemCount > 0 ? itemCount : 1;
}

export interface BatchEntryDetectionOptions {
  multiplierThreshold?: number;
  minHistoricalDeals?: number;
  maxDealCountThreshold?: number;
}

export function detectBatchEntry(
  dealEvent: Event<DealClosedPayload>,
  historicalDeals: Event<DealClosedPayload>[],
  options?: BatchEntryDetectionOptions
): BatchEntryDetectionResult {
  const multiplier = options?.multiplierThreshold || 5;
  const minDeals = options?.minHistoricalDeals || 10;
  const maxDealCount = options?.maxDealCountThreshold || 3;
  const currentAmount = getDealEventRevenue(dealEvent);
  const dealCount = getDealEventCount(dealEvent);

  const defaultResult: BatchEntryDetectionResult = {
    isBatchEntry: false,
    estimatedDealCount: dealCount,
    historicalMedianAOV: 0,
    actualAmount: currentAmount,
    confidence: 'high',
    reason: '正常交易',
  };

  if (!isBackfillDealEvent(dealEvent)) return defaultResult;
  if (!isManualDealEvent(dealEvent)) return defaultResult;
  if (dealCount > maxDealCount) return defaultResult;

  if (historicalDeals.length < minDeals) {
    return {
      ...defaultResult,
      reason: `歷史資料不足，需要至少 ${minDeals} 筆，目前 ${historicalDeals.length} 筆`,
    };
  }

  const historicalAOVs = historicalDeals
    .filter((event) => !isBackfillDealEvent(event) && getDealEventRevenue(event) > 0)
    .map((event) => getDealEventRevenue(event) / getHistoricalDealUnitCount(event))
    .filter((aov) => aov > 0);

  if (historicalAOVs.length === 0) {
    return {
      ...defaultResult,
      reason: '沒有可用的歷史客單價資料',
    };
  }

  const medianAOV = median(historicalAOVs);
  if (medianAOV === 0) {
    return {
      ...defaultResult,
      reason: '歷史客單價中位數為 0',
    };
  }

  const currentAOV = currentAmount / dealCount;
  const ratio = currentAOV / medianAOV;

  if (ratio > multiplier) {
    const estimatedCount = Math.max(1, Math.round(currentAmount / medianAOV));
    let confidence: 'high' | 'medium' | 'low' = 'medium';

    if (historicalAOVs.length >= 30 && ratio > 10) {
      confidence = 'high';
    } else if (historicalAOVs.length < 15 || ratio < 7) {
      confidence = 'low';
    }

    return {
      isBatchEntry: true,
      estimatedDealCount: estimatedCount,
      historicalMedianAOV: medianAOV,
      actualAmount: currentAmount,
      confidence,
      reason: `目前客單價 ${currentAOV.toFixed(0)} 是歷史中位數 ${medianAOV.toFixed(0)} 的 ${ratio.toFixed(1)} 倍`,
    };
  }

  return defaultResult;
}

export function detectBatchEntries(
  dealEvents: Event<DealClosedPayload>[],
  historicalDeals: Event<DealClosedPayload>[],
  options?: BatchEntryDetectionOptions
): Array<{ eventId: string; detection: BatchEntryDetectionResult }> {
  return dealEvents.map(event => ({
    eventId: event.id!,
    detection: detectBatchEntry(event, historicalDeals, options),
  }));
}

export function calculateAdjustedDealCount(
  originalDeals: number,
  detections: Array<{ eventId: string; detection: BatchEntryDetectionResult }>
): number {
  let adjustment = 0;

  for (const { detection } of detections) {
    if (detection.isBatchEntry) {
      adjustment += detection.estimatedDealCount - 1;
    }
  }

  return originalDeals + adjustment;
}
