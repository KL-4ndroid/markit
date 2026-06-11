import assert from 'node:assert/strict';
import {
  getDealClosedManualProjection,
  getDealClosedMode,
  getDealClosedTransactionDate,
} from '../lib/db/deal-closed-projection';
import type { DealClosedPayload, Event } from '../types/db';

const TS = new Date(2026, 5, 11, 10, 30, 0).getTime();

function deal(payload: Record<string, unknown>, timestamp = TS): Event<DealClosedPayload> {
  return {
    id: 'deal-1',
    type: 'deal_closed',
    market_id: 'market-1',
    actor_id: 'actor-1',
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

function run() {
  const camelManual = deal({
    isManualEntry: true,
    dealDate: '2026-06-10',
    manualRevenue: 1200,
    manualCost: 250,
    manualDealCount: 4,
  });
  assert.equal(getDealClosedMode(camelManual), 'manual');
  assert.equal(getDealClosedTransactionDate(camelManual), '2026-06-10');
  assert.deepEqual(getDealClosedManualProjection(camelManual), {
    date: '2026-06-10',
    revenue: 1200,
    cost: 250,
    profit: 950,
    dealCount: 4,
  });

  const snakeManual = deal({
    is_manual_entry: true,
    deal_date: '2026-06-09',
    manual_revenue: 900,
    manual_cost: 100,
    manual_deal_count: 3,
  });
  assert.equal(getDealClosedMode(snakeManual), 'manual');
  assert.equal(getDealClosedTransactionDate(snakeManual), '2026-06-09');
  assert.deepEqual(getDealClosedManualProjection(snakeManual), {
    date: '2026-06-09',
    revenue: 900,
    cost: 100,
    profit: 800,
    dealCount: 3,
  });

  const timestampFallback = deal({
    isManualEntry: true,
    totalAmount: 500,
  });
  assert.equal(getDealClosedTransactionDate(timestampFallback), '2026-06-11');
  assert.deepEqual(getDealClosedManualProjection(timestampFallback), {
    date: '2026-06-11',
    revenue: 500,
    cost: 0,
    profit: 500,
    dealCount: 1,
  });

  assert.equal(getDealClosedMode(deal({ isBackfill: true })), 'backfill');
  assert.equal(getDealClosedMode(deal({ is_backfill: true })), 'backfill');
  assert.equal(getDealClosedMode(deal({})), 'normal');

  console.log('PASS deal closed projection helpers');
}

run();
