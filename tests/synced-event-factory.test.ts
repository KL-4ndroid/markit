import assert from 'node:assert/strict';
import { createCanonicalSyncedEvent } from '../lib/sync/synced-event-factory';

function main(): void {
  const event = createCanonicalSyncedEvent({
    id: 'event-1',
    type: 'deal_closed',
    payload: {
      market_id: 'market-1',
      payment_method: 'cash',
      total_amount: 1200,
    },
    actor_id: 'owner-1',
    market_id: 'market-1',
    timestamp: '2026-06-20T12:34:56.000Z',
    metadata: { version: 'test' },
  });

  assert.equal(event.id, 'event-1');
  assert.equal(event.type, 'deal_closed');
  assert.equal(event.actor_id, 'owner-1');
  assert.equal(event.market_id, 'market-1');
  assert.equal(event.timestamp, new Date('2026-06-20T12:34:56.000Z').getTime());
  assert.equal(event.sync_status, 'synced');
  assert.deepEqual(event.metadata, { version: 'test' });
  assert.deepEqual(event.payload, {
    market_id: 'market-1',
    marketId: 'market-1',
    payment_method: 'cash',
    total_amount: 1200,
    totalAmount: 1200,
  });
  console.log('PASS createCanonicalSyncedEvent builds local synced event');
}

try {
  main();
} catch (error) {
  console.error('FAIL synced event factory');
  throw error;
}
