import assert from 'node:assert/strict';
import {
  getDeletedEventIds,
  withoutDeletedDealEvents,
} from '../lib/db/event-tombstones';
import { db } from '../lib/db';
import type { DealClosedPayload, Event } from '../types/db';

const TS = new Date('2026-06-11T12:00:00+08:00').getTime();

function deal(
  id: string,
  overrides: Omit<Partial<Event<DealClosedPayload>>, 'payload'> & {
    payload?: Partial<DealClosedPayload>;
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
      dealDate: '2026-06-11',
      isManualEntry: true,
      items: [],
      totalAmount: 800,
      manualRevenue: 800,
      manualDealCount: 1,
      paymentMethod: 'cash',
      ...payloadOverrides,
    } as DealClosedPayload,
    ...eventOverrides,
  };
}

function dealDeleted(
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
      dealDate: '2026-06-11',
      totalAmount: 800,
      dealCount: 1,
      ...overrides.payload,
    },
    ...overrides,
  };
}

async function main(): Promise<void> {
  const activeById = withoutDeletedDealEvents(
    [deal('deal-1'), deal('deal-2', { payload: { totalAmount: 900, manualRevenue: 900 } })],
    [dealDeleted('delete-1', 'deal-1')]
  );

  assert.deepEqual(
    activeById.map(event => event.id),
    ['deal-2'],
    'id tombstone should remove its exact deal event',
  );

  const activeBySemanticFallback = withoutDeletedDealEvents(
    [
      deal('local-semantic-copy-1'),
      deal('local-semantic-copy-2'),
      deal('different-amount', { payload: { totalAmount: 900, manualRevenue: 900 } }),
    ],
    [dealDeleted('delete-cloud-id', 'cloud-deal-id-not-in-local')]
  );

  assert.deepEqual(
    activeBySemanticFallback.map(event => event.id),
    ['local-semantic-copy-2', 'different-amount'],
    'semantic tombstone fallback should remove only one matching local deal',
  );

  const activeBySnakeCaseSemanticFallback = withoutDeletedDealEvents(
    [
      deal('snake-local-copy-1', {
        payload: {
          totalAmount: 700,
          manualRevenue: 700,
          manualDealCount: 2,
        },
      }),
      deal('snake-local-copy-2', {
        payload: {
          totalAmount: 700,
          manualRevenue: 700,
          manualDealCount: 1,
        },
      }),
    ],
    [
      dealDeleted('delete-snake-semantic', 'cloud-deal-id-not-in-local', {
        payload: {
          eventId: undefined,
          event_id: 'cloud-deal-id-not-in-local',
          totalAmount: undefined,
          total_amount: 700,
          dealCount: undefined,
          deal_count: 2,
        },
      }),
    ]
  );

  assert.deepEqual(
    activeBySnakeCaseSemanticFallback.map(event => event.id),
    ['snake-local-copy-2'],
    'snake_case semantic tombstone should remove the deal with matching dealCount=2',
  );

  const originalWhere = db.events.where.bind(db.events);

  try {
    db.events.where = ((field: string) => {
      assert.equal(field, 'type');
      return {
        anyOf: () => ({
          toArray: async () => [
            {
              id: 'delete-snake',
              type: 'deal_deleted',
              payload: { event_id: 'snake-target' },
            },
          ],
        }),
      };
    }) as unknown as typeof db.events.where;

    const deletedIds = await getDeletedEventIds();
    assert.ok(deletedIds.has('snake-target'), 'snake_case event_id should be recognized');
  } finally {
    db.events.where = originalWhere;
  }

  console.log('PASS event tombstone compatibility');
}

main().catch((error) => {
  console.error('FAIL event tombstone compatibility');
  throw error;
});
