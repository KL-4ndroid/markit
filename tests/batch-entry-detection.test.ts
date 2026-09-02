import assert from 'node:assert/strict';
import {
  calculateAdjustedDealCount,
  detectBatchEntries,
  detectBatchEntry,
} from '../lib/analytics/batch-entry-detection-engine';
import type { DealClosedPayload, Event } from '../types/db';

const timestamp = new Date('2026-06-11T12:00:00+08:00').getTime();

function deal(id: string, payload: Record<string, unknown>): Event<DealClosedPayload> {
  return {
    id,
    type: 'deal_closed',
    actor_id: 'owner-1',
    market_id: 'market-1',
    timestamp,
    sync_status: 'synced',
    payload: {
      market_id: 'market-1',
      paymentMethod: 'cash',
      totalAmount: 0,
      items: [],
      ...payload,
    } as DealClosedPayload,
  };
}

function historicalDeals(count: number): Event<DealClosedPayload>[] {
  return Array.from({ length: count }, (_, index) => deal(`historical-${index}`, {
    totalAmount: 100,
    items: [{ productId: `product-${index}`, quantity: 1, price: 100 }],
  }));
}

async function main(): Promise<void> {
  const regular = detectBatchEntry(
    deal('regular', { totalAmount: 300, isBackfill: false, isManualEntry: true }),
    historicalDeals(12)
  );
  assert.equal(regular.isBatchEntry, false);

  const snakeCaseBatch = detectBatchEntry(
    deal('batch-1', {
      totalAmount: undefined,
      total_amount: 1200,
      is_backfill: true,
      is_manual_entry: true,
      manual_deal_count: 1,
    }),
    historicalDeals(12),
    { multiplierThreshold: 5, minHistoricalDeals: 10 }
  );

  assert.equal(snakeCaseBatch.isBatchEntry, true);
  assert.equal(snakeCaseBatch.actualAmount, 1200);
  assert.equal(snakeCaseBatch.estimatedDealCount, 12);
  assert.equal(snakeCaseBatch.historicalMedianAOV, 100);
  assert.equal(snakeCaseBatch.confidence, 'low');

  const enoughManualCount = detectBatchEntry(
    deal('already-counted', {
      totalAmount: 1200,
      isBackfill: true,
      isManualEntry: true,
      manualDealCount: 4,
    }),
    historicalDeals(12),
    { maxDealCountThreshold: 3 }
  );
  assert.equal(enoughManualCount.isBatchEntry, false);
  assert.equal(enoughManualCount.estimatedDealCount, 4);

  const insufficientHistory = detectBatchEntry(
    deal('short-history', {
      totalAmount: 1200,
      isBackfill: true,
      isManualEntry: true,
    }),
    historicalDeals(3),
    { minHistoricalDeals: 10 }
  );
  assert.equal(insufficientHistory.isBatchEntry, false);
  assert.match(insufficientHistory.reason, /歷史資料不足/);

  const detections = detectBatchEntries(
    [
      deal('batch-1', { totalAmount: 1200, isBackfill: true, isManualEntry: true }),
      deal('regular-2', { totalAmount: 100, isBackfill: false, isManualEntry: false }),
    ],
    historicalDeals(12)
  );
  assert.equal(detections.length, 2);
  assert.equal(detections[0].eventId, 'batch-1');
  assert.equal(calculateAdjustedDealCount(2, detections), 13);

  console.log('PASS batch entry detection');
}

main().catch((error) => {
  console.error('FAIL batch entry detection');
  throw error;
});
