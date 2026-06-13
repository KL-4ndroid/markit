import assert from 'node:assert/strict';
import type { Event, DealClosedPayload } from '../types/db';

const TS = new Date('2026-06-12T12:00:00+08:00').getTime();

function deal(
  id: string,
  overrides: Omit<Partial<Event<DealClosedPayload>>, 'payload'> & {
    payload?: Partial<DealClosedPayload> & Record<string, unknown>;
  } = {}
): Event<DealClosedPayload> {
  const { payload: payloadOverrides, ...eventOverrides } = overrides;
  return {
    id,
    type: 'deal_closed',
    market_id: 'market-1',
    timestamp: TS,
    actor_id: 'owner-1',
    payload: {
      market_id: 'market-1',
      dealDate: '2026-06-12',
      isBackfill: false,
      isManualEntry: false,
      items: [],
      totalAmount: 500,
      dealCount: 1,
      ...payloadOverrides,
    } as DealClosedPayload,
    ...eventOverrides,
  };
}

function tombstone(
  id: string,
  eventId: string,
  overrides: Partial<Event<Record<string, unknown>>> = {}
): Event<Record<string, unknown>> {
  const { payload: payloadOverrides, ...eventOverrides } = overrides;
  return {
    id,
    type: 'deal_deleted',
    market_id: 'market-1',
    timestamp: TS + 1,
    actor_id: 'owner-1',
    payload: {
      eventId,
      market_id: 'market-1',
      dealDate: '2026-06-12',
      totalAmount: 500,
      dealCount: 1,
      ...payloadOverrides,
    },
    ...eventOverrides,
  };
}

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Pure semantic matching tests
// A tombstone semantically matches a deal if and only if:
//   marketId + dealDate + totalAmount + dealCount are all equal
// ---------------------------------------------------------------------------

runTest('match: identical keys return true', () => {
  const t = tombstone('t1', 'deal-1');
  const d = deal('deal-1');
  const result = matchSemanticDeal(t, d);
  assert.equal(result, true);
});

runTest('match: different marketId returns false', () => {
  const t = tombstone('t1', 'deal-1');
  const d = deal('deal-1', {
    market_id: 'market-2',
    payload: { market_id: 'market-2' },
  });
  const result = matchSemanticDeal(t, d);
  assert.equal(result, false);
});

runTest('match: different dealDate returns false', () => {
  const t = tombstone('t1', 'deal-1');
  const d = deal('deal-1', {
    payload: { dealDate: '2026-06-13' },
  });
  const result = matchSemanticDeal(t, d);
  assert.equal(result, false);
});

runTest('match: different totalAmount returns false', () => {
  const t = tombstone('t1', 'deal-1');
  const d = deal('deal-1', {
    payload: { totalAmount: 600 },
  });
  const result = matchSemanticDeal(t, d);
  assert.equal(result, false);
});

runTest('match: different dealCount returns false', () => {
  const t = tombstone('t1', 'deal-1');
  const d = deal('deal-1', {
    payload: { dealCount: 2 },
  });
  const result = matchSemanticDeal(t, d);
  assert.equal(result, false);
});

runTest('match: snake_case dealDate in tombstone still matches', () => {
  const t = tombstone('t1', 'deal-1', {
    payload: { dealDate: undefined, deal_date: '2026-06-12' },
  });
  const d = deal('deal-1');
  const result = matchSemanticDeal(t, d);
  assert.equal(result, true);
});

runTest('match: snake_case totalAmount in tombstone still matches', () => {
  const t = tombstone('t1', 'deal-1', {
    payload: { totalAmount: undefined, total_amount: 500 },
  });
  const d = deal('deal-1');
  const result = matchSemanticDeal(t, d);
  assert.equal(result, true);
});

runTest('match: missing dealDate returns false', () => {
  const t = tombstone('t1', 'deal-1', {
    payload: { dealDate: undefined, deal_date: undefined },
  });
  const d = deal('deal-1');
  const result = matchSemanticDeal(t, d);
  assert.equal(result, false);
});

runTest('match: missing totalAmount returns false', () => {
  const t = tombstone('t1', 'deal-1', {
    payload: { totalAmount: undefined, total_amount: undefined },
  });
  const d = deal('deal-1');
  const result = matchSemanticDeal(t, d);
  assert.equal(result, false);
});

runTest('match: NaN revenue returns false', () => {
  const t = tombstone('t1', 'deal-1', {
    payload: { totalAmount: NaN },
  });
  const d = deal('deal-1');
  const result = matchSemanticDeal(t, d);
  assert.equal(result, false);
});

runTest('match: zero revenue matches zero revenue', () => {
  const t = tombstone('t1', 'deal-1', {
    payload: { totalAmount: 0 },
  });
  const d = deal('deal-1', {
    payload: { totalAmount: 0 },
  });
  const result = matchSemanticDeal(t, d);
  assert.equal(result, true);
});

runTest('match: undefined dealCount defaults to 1', () => {
  const t = tombstone('t1', 'deal-1', {
    payload: { dealCount: undefined, deal_count: undefined },
  });
  const d = deal('deal-1', {
    payload: { dealCount: undefined },
  });
  const result = matchSemanticDeal(t, d);
  assert.equal(result, true);
});

runTest('match: dealCount mismatch returns false', () => {
  const t = tombstone('t1', 'deal-1', {
    payload: { dealCount: 2 },
  });
  const d = deal('deal-1', {
    payload: { dealCount: 1 },
  });
  const result = matchSemanticDeal(t, d);
  assert.equal(result, false);
});

// ---------------------------------------------------------------------------
// getDealTombstoneKey tests
// ---------------------------------------------------------------------------

runTest('getDealTombstoneKey: valid event returns correct key', () => {
  const d = deal('deal-1');
  const key = getDealTombstoneKey(d);
  assert.equal(key, 'market-1|2026-06-12|500|1');
});

runTest('getDealTombstoneKey: missing date returns undefined', () => {
  const d = deal('deal-1', {
    payload: { dealDate: undefined, deal_date: undefined },
  });
  const key = getDealTombstoneKey(d);
  assert.equal(key, undefined);
});

runTest('getDealTombstoneKey: missing marketId returns undefined', () => {
  const d = deal('deal-1', {
    market_id: '',
    payload: { market_id: '' },
  });
  const key = getDealTombstoneKey(d);
  assert.equal(key, undefined);
});

runTest('getDealTombstoneKey: NaN revenue returns undefined', () => {
  const d = deal('deal-1', {
    payload: { totalAmount: NaN },
  });
  const key = getDealTombstoneKey(d);
  assert.equal(key, undefined);
});

// ---------------------------------------------------------------------------
// Pure functions extracted from event-tombstones.ts
// These are tested without any Dexie/IndexedDB dependency
// ---------------------------------------------------------------------------

/**
 * Returns true if a deal_deleted tombstone semantically matches a deal_closed event.
 * Two events match if marketId, dealDate, totalAmount, and dealCount are all equal.
 * Supports both camelCase (dealDate, totalAmount) and snake_case (deal_date, total_amount)
 * payload fields.
 */
function matchSemanticDeal(
  tombstone: Event<Record<string, unknown>>,
  deal: Event<DealClosedPayload>
): boolean {
  const tombPayload = tombstone.payload ?? {};
  const dealPayload = deal.payload ?? {};

  const tombDate = tombPayload.dealDate ?? tombPayload.deal_date;
  const dealDate = dealPayload.dealDate ?? dealPayload.deal_date;

  const tombRevenue = tombPayload.totalAmount ?? tombPayload.total_amount;
  const dealRevenue = dealPayload.totalAmount ?? dealPayload.total_amount;

  const tombCount = tombPayload.dealCount ?? tombPayload.deal_count ?? 1;
  const dealCount = dealPayload.dealCount ?? dealPayload.deal_count ?? 1;

  const tombMarketId =
    (tombstone as unknown as { market_id?: string }).market_id ??
    tombPayload.market_id ??
    tombPayload.marketId;
  const dealMarketId =
    (deal as unknown as { market_id?: string }).market_id ??
    dealPayload.market_id ??
    dealPayload.marketId;

  if (!tombDate || !dealDate) return false;
  if (!tombMarketId || !dealMarketId) return false;
  if (!Number.isFinite(tombRevenue) || !Number.isFinite(dealRevenue)) return false;
  if (!Number.isFinite(tombCount) || !Number.isFinite(dealCount)) return false;

  return (
    tombMarketId === dealMarketId &&
    tombDate === dealDate &&
    tombRevenue === dealRevenue &&
    tombCount === dealCount
  );
}

function getDealTombstoneKey(event: Event<DealClosedPayload> | Event<Record<string, unknown>>): string | undefined {
  const payload = event.payload ?? {};
  const marketId =
    (event as unknown as { market_id?: string }).market_id ??
    payload.market_id ??
    payload.marketId;
  const date = payload.dealDate ?? payload.deal_date;
  const revenue = payload.totalAmount ?? payload.total_amount;
  const count = payload.dealCount ?? payload.deal_count ?? 1;

  if (!marketId || !date || !Number.isFinite(revenue) || !Number.isFinite(count)) {
    return undefined;
  }

  return `${marketId}|${date}|${revenue}|${count}`;
}
