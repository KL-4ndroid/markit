import assert from 'node:assert/strict';
import {
  buildDealSummaryFromActiveEvents,
  filterActiveDealEventsForDate,
  filterActiveDealEventsForMarket,
  filterActiveDealEventsForMarkets,
  filterDealEventsForDate,
  filterInteractionEventsForDate,
  filterInteractionEventsForMarkets,
} from '../lib/events/active-event-service';
import type { DealClosedPayload, Event, InteractionRecordedPayload } from '../types/db';

const TS = new Date('2026-06-12T12:00:00+08:00').getTime();

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

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
      isManualEntry: true,
      items: [],
      totalAmount: 500,
      manualRevenue: 500,
      manualDealCount: 1,
      paymentMethod: 'cash',
      ...payloadOverrides,
    } as DealClosedPayload,
    ...eventOverrides,
  };
}

function deletedDeal(
  id: string,
  eventId: string,
  overrides: Partial<Event<Record<string, unknown>>> = {}
): Event<Record<string, unknown>> {
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
      ...overrides.payload,
    },
    ...overrides,
  };
}

function interaction(
  id: string,
  overrides: Omit<Partial<Event<InteractionRecordedPayload>>, 'payload'> & {
    payload?: Partial<InteractionRecordedPayload>;
  } = {}
): Event<InteractionRecordedPayload> {
  const { payload: payloadOverrides, ...eventOverrides } = overrides;

  return {
    id,
    type: 'interaction_recorded',
    market_id: 'market-1',
    timestamp: TS,
    actor_id: 'owner-1',
    payload: {
      market_id: 'market-1',
      type: 'touch',
      notes: '',
      ...payloadOverrides,
    },
    ...eventOverrides,
  };
}

runTest('filterDealEventsForDate returns full and manual backfill deals for the same market/date', () => {
  const events = [
    deal('full-backfill', {
      payload: {
        isBackfill: true,
        isManualEntry: false,
        items: [{ productId: 'product-1', quantity: 2, price: 250 }],
        totalAmount: 500,
      },
    }),
    deal('manual-backfill', {
      payload: {
        isBackfill: true,
        isManualEntry: true,
        manualRevenue: 300,
        manualDealCount: 2,
        totalAmount: 300,
      },
    }),
    deal('other-market', {
      market_id: 'market-2',
      payload: { market_id: 'market-2' },
    }),
  ];

  assert.deepEqual(
    filterDealEventsForDate(events, 'market-1', '2026-06-12').map(event => event.id),
    ['full-backfill', 'manual-backfill']
  );
});

runTest('filterActiveDealEventsForMarket removes exact tombstone target', () => {
  const active = filterActiveDealEventsForMarket(
    [deal('deal-1'), deal('deal-2', { payload: { totalAmount: 900, manualRevenue: 900 } })],
    [deletedDeal('delete-1', 'deal-1')],
    'market-1'
  );

  assert.deepEqual(active.map(event => event.id), ['deal-2']);
});

runTest('filterActiveDealEventsForMarkets returns only active deals for selected markets', () => {
  const active = filterActiveDealEventsForMarkets(
    [
      deal('deal-1', { timestamp: TS + 3 }),
      deal('deal-2', {
        market_id: 'market-2',
        timestamp: TS + 2,
        payload: { market_id: 'market-2' },
      }),
      deal('deal-3', {
        market_id: 'market-3',
        timestamp: TS + 1,
        payload: { market_id: 'market-3' },
      }),
    ],
    [
      deletedDeal('delete-1', 'deal-2', {
        market_id: 'market-2',
        payload: {
          eventId: 'deal-2',
          market_id: 'market-2',
          dealDate: '2026-06-12',
          totalAmount: 500,
          dealCount: 1,
        },
      }),
    ],
    ['market-1', 'market-2']
  );

  assert.deepEqual(active.map(event => event.id), ['deal-1']);
});

runTest('filterActiveDealEventsForDate applies semantic tombstone fallback only once', () => {
  const active = filterActiveDealEventsForDate(
    [
      deal('semantic-copy-1'),
      deal('semantic-copy-2'),
      deal('different-date', {
        payload: { dealDate: '2026-06-13' },
      }),
    ],
    [deletedDeal('delete-cloud-id', 'cloud-id-not-local')],
    'market-1',
    '2026-06-12'
  );

  assert.deepEqual(active.map(event => event.id), ['semantic-copy-2']);
});

runTest('buildDealSummaryFromActiveEvents groups revenue and deal counts by date', () => {
  const summary = buildDealSummaryFromActiveEvents('market-1', [
    deal('deal-1', {
      payload: { totalAmount: 500, manualRevenue: 500, manualDealCount: 1 },
    }),
    deal('deal-2', {
      payload: {
        dealDate: '2026-06-13',
        totalAmount: 700,
        manualRevenue: 700,
        manualDealCount: 3,
      },
    }),
    deal('other-market', {
      market_id: 'market-2',
      payload: { market_id: 'market-2', totalAmount: 999, manualRevenue: 999 },
    }),
  ]);

  assert.equal(summary.revenue, 1200);
  assert.equal(summary.dealCount, 4);
  assert.equal(summary.eventCount, 2);
  assert.deepEqual(summary.byDate, [
    { date: '2026-06-12', revenue: 500, dealCount: 1, eventCount: 1 },
    { date: '2026-06-13', revenue: 700, dealCount: 3, eventCount: 1 },
  ]);
});

runTest('filterInteractionEventsForDate uses local timestamp date and market id', () => {
  const events = [
    interaction('interaction-1'),
    interaction('interaction-2', {
      market_id: 'market-2',
      payload: { market_id: 'market-2' },
    }),
    interaction('interaction-3', {
      timestamp: new Date('2026-06-13T12:00:00+08:00').getTime(),
    }),
  ];

  assert.deepEqual(
    filterInteractionEventsForDate(events, 'market-1', '2026-06-12').map(event => event.id),
    ['interaction-1']
  );
});

runTest('filterInteractionEventsForMarkets returns selected market interactions sorted by timestamp', () => {
  const events = [
    interaction('interaction-1', { timestamp: TS + 3 }),
    interaction('interaction-2', {
      market_id: 'market-2',
      timestamp: TS + 2,
      payload: { market_id: 'market-2' },
    }),
    interaction('interaction-3', {
      market_id: 'market-3',
      timestamp: TS + 1,
      payload: { market_id: 'market-3' },
    }),
  ];

  assert.deepEqual(
    filterInteractionEventsForMarkets(events, ['market-1', 'market-2']).map(event => event.id),
    ['interaction-2', 'interaction-1']
  );
});
