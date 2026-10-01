import assert from 'node:assert/strict';
import {
  getDealClosedDate,
  getDealClosedMarketId,
  getDealClosedRevenue,
  hasSemanticDuplicateDealClosedEvent,
  isSemanticDuplicateDealClosedEvent,
  type SemanticDedupeDbLike,
  type SyncEventLike,
} from '../lib/sync/semantic-event-dedupe';

const MARKET_ID = 'market-1';

function dealEvent(overrides: Partial<SyncEventLike> = {}): SyncEventLike {
  return {
    id: 'event-1',
    type: 'deal_closed',
    market_id: MARKET_ID,
    timestamp: '2026-05-23T15:59:59.999Z',
    payload: {
      market_id: MARKET_ID,
      dealDate: '2026-05-23',
      totalAmount: 300,
      manualRevenue: 300,
      isManualEntry: true,
    },
    ...overrides,
  };
}

function makeDb(events: SyncEventLike[]): SemanticDedupeDbLike {
  return {
    events: {
      where: () => ({
        equals: () => ({
          and: (predicate: (event: any) => boolean) => ({
            toArray: async () => events.filter(event => event.type === 'deal_closed').filter(predicate) as any,
          }),
          toArray: async () => events.filter(event => event.type === 'deal_closed') as any,
        }),
      }),
    },
  };
}

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('extracts market id from payload snake, payload camel, then event market_id', () => {
  assert.equal(getDealClosedMarketId(dealEvent()), MARKET_ID);
  assert.equal(getDealClosedMarketId(dealEvent({ payload: { marketId: 'camel-market' } })), 'camel-market');
  assert.equal(getDealClosedMarketId(dealEvent({ payload: {}, market_id: 'event-market' })), 'event-market');
});

runTest('extracts deal date from payload or timestamp fallback', () => {
  assert.equal(getDealClosedDate(dealEvent()), '2026-05-23');
  assert.equal(getDealClosedDate(dealEvent({ payload: { deal_date: '2026-05-24' } })), '2026-05-24');
  assert.match(getDealClosedDate(dealEvent({ payload: {}, timestamp: '2026-05-25T12:00:00.000Z' })) ?? '', /^2026-05-25$/);
});

runTest('extracts deal revenue from manual revenue, total amount, or item totals', () => {
  assert.equal(getDealClosedRevenue(dealEvent()), 300);
  assert.equal(getDealClosedRevenue(dealEvent({ payload: { total_amount: 500 } })), 500);
  assert.equal(
    getDealClosedRevenue(
      dealEvent({
        payload: {
          items: [
            { price_at_time_of_sale: 100, quantity: 2 },
            { priceAtTimeOfSale: 50, quantity: 3 },
          ],
        },
      })
    ),
    350
  );
});

runTest('detects semantic duplicate deal_closed with different ids', () => {
  const local = dealEvent({ id: 'local-event' });
  const cloud = dealEvent({ id: 'cloud-event' });
  assert.equal(isSemanticDuplicateDealClosedEvent(cloud, local), true);
});

runTest('does not match different market, date, revenue, or type', () => {
  const local = dealEvent();
  assert.equal(isSemanticDuplicateDealClosedEvent(dealEvent({ payload: { ...local.payload, market_id: 'other' } }), local), false);
  assert.equal(isSemanticDuplicateDealClosedEvent(dealEvent({ payload: { ...local.payload, dealDate: '2026-05-24' } }), local), false);
  assert.equal(isSemanticDuplicateDealClosedEvent(dealEvent({ payload: { ...local.payload, totalAmount: 301, manualRevenue: 301 } }), local), false);
  assert.equal(isSemanticDuplicateDealClosedEvent({ ...dealEvent(), type: 'interaction_recorded' }, local), false);
});

runTest('checks IndexedDB-like event table for semantic duplicates', async () => {
  const db = makeDb([dealEvent({ id: 'local-event' })]);
  assert.equal(await hasSemanticDuplicateDealClosedEvent(db, dealEvent({ id: 'cloud-event' })), true);
});

runTest('does not treat a non-matching local deal as duplicate', async () => {
  const db = makeDb([dealEvent({ id: 'local-event', payload: { market_id: MARKET_ID, dealDate: '2026-05-23', totalAmount: 999 } })]);
  assert.equal(await hasSemanticDuplicateDealClosedEvent(db, dealEvent({ id: 'cloud-event' })), false);
});
