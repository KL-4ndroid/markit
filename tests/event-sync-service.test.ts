import assert from 'node:assert/strict';
import { db } from '../lib/db';
import {
  bindEventActor,
  markEventSynced,
  markEventLocalOnly,
  markEventBlocked,
} from '../lib/sync/event-sync-service';
import type { Event } from '../types/db';

const TS = 1_700_000_000_000;

const BASE_PAYLOAD = { name: 'Morning Market', location: 'Taipei', startDate: '2026-01-01', endDate: '2026-01-01', registrationFee: 0, boothCost: 0 };

function fixture(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    type: 'market_created',
    payload: BASE_PAYLOAD,
    timestamp: TS,
    actor_id: 'local',
    market_id: 'market-1',
    sync_status: 'pending',
    metadata: { version: '1.0.0', preExisting: 'keep-me' } as Event['metadata'],
    ...overrides,
  };
}

async function main(): Promise<void> {
  // Mutable in-memory store to simulate IndexedDB state
  const store = new Map<string, Event>([['evt-1', fixture()]]);

  const originalGet = db.events.get.bind(db.events);
  const originalUpdate = db.events.update.bind(db.events);

  try {
    db.events.get = ((id: string) =>
      Promise.resolve(store.get(id) ?? undefined)
    ) as typeof db.events.get;

    db.events.update = ((id: string, changes: Record<string, unknown>) => {
      const existing = store.get(id);
      if (!existing) return Promise.resolve(0);
      store.set(id, { ...existing, ...changes } as Event);
      return Promise.resolve(1);
    }) as typeof db.events.update;

    // --- markEventSynced ---

    await markEventSynced('evt-1');
    const afterSynced = store.get('evt-1')!;
    assert.equal(afterSynced.sync_status, 'synced', 'should set sync_status');
    assert.equal(afterSynced.id, 'evt-1', 'must preserve id');
    assert.equal(afterSynced.type, 'market_created', 'must preserve type');
    assert.deepEqual(afterSynced.payload, BASE_PAYLOAD, 'must preserve payload');
    assert.equal(afterSynced.timestamp, TS, 'must preserve timestamp');
    assert.equal(afterSynced.market_id, 'market-1', 'must preserve market_id');
    assert.equal(afterSynced.actor_id, 'local', 'must preserve actor_id');
    assert.deepEqual(afterSynced.metadata, { version: '1.0.0', preExisting: 'keep-me' }, 'must preserve metadata');
    console.log('PASS markEventSynced only updates sync_status');

    // --- markEventLocalOnly ---

    await markEventLocalOnly('evt-1');
    const afterLocal = store.get('evt-1')!;
    assert.equal(afterLocal.sync_status, 'local_only', 'should set sync_status');
    assert.equal(afterLocal.id, 'evt-1', 'must preserve id');
    assert.equal(afterLocal.type, 'market_created', 'must preserve type');
    assert.deepEqual(afterLocal.payload, BASE_PAYLOAD, 'must preserve payload');
    assert.equal(afterLocal.timestamp, TS, 'must preserve timestamp');
    assert.equal(afterLocal.market_id, 'market-1', 'must preserve market_id');
    assert.equal(afterLocal.actor_id, 'local', 'must preserve actor_id');
    console.log('PASS markEventLocalOnly only updates sync_status');

    // --- bindEventActor ---

    await bindEventActor('evt-1', 'user-abc');
    const afterBind = store.get('evt-1')!;
    assert.equal(afterBind.actor_id, 'user-abc', 'should set actor_id');
    assert.equal(afterBind.id, 'evt-1', 'must preserve id');
    assert.equal(afterBind.type, 'market_created', 'must preserve type');
    assert.deepEqual(afterBind.payload, BASE_PAYLOAD, 'must preserve payload');
    assert.equal(afterBind.timestamp, TS, 'must preserve timestamp');
    assert.equal(afterBind.market_id, 'market-1', 'must preserve market_id');
    assert.equal(afterBind.sync_status, 'local_only', 'must preserve sync_status');
    console.log('PASS bindEventActor only updates actor_id');

    // --- markEventBlocked ---

    await markEventBlocked('evt-1', 'actor_id_mismatch', 'evil-actor');
    const afterBlocked = store.get('evt-1')!;
    assert.equal(afterBlocked.sync_status, 'synced', 'should set sync_status');
    assert.equal(afterBlocked.id, 'evt-1', 'must preserve id');
    assert.equal(afterBlocked.type, 'market_created', 'must preserve type');
    assert.deepEqual(afterBlocked.payload, BASE_PAYLOAD, 'must preserve payload');
    assert.equal(afterBlocked.timestamp, TS, 'must preserve timestamp');
    assert.equal(afterBlocked.market_id, 'market-1', 'must preserve market_id');
    assert.equal(afterBlocked.actor_id, 'user-abc', 'must preserve actor_id');

    const meta = afterBlocked.metadata as Record<string, unknown>;
    assert.ok(typeof meta.invalid_reason === 'string', 'should set invalid_reason');
    assert.equal(meta.invalid_reason, 'actor_id_mismatch');
    assert.equal(meta.original_actor_id, 'evil-actor', 'should use provided originalActorId');
    assert.equal(meta.blocked_at, meta.blocked_at, 'should set blocked_at');
    assert.ok(meta.blocked_at !== undefined && meta.blocked_at !== null, 'blocked_at should be set');
    assert.equal(meta.preExisting, 'keep-me', 'should merge and keep existing metadata');
    console.log('PASS markEventBlocked updates sync_status + metadata, preserves existing metadata');

    // --- markEventBlocked without originalActorId (falls back to existing.actor_id) ---

    await markEventBlocked('evt-1', 'actor_id_mismatch');
    const afterBlocked2 = store.get('evt-1')!;
    const meta2 = afterBlocked2.metadata as Record<string, unknown>;
    assert.equal(meta2.original_actor_id, 'user-abc', 'should fall back to existing.actor_id');
    console.log('PASS markEventBlocked falls back to existing.actor_id');

    // --- blank eventId throws ---

    for (const blank of ['', '   ', '\t', '\n']) {
      await assert.rejects(
        () => markEventSynced(blank),
        /non-blank string/,
        `blank eventId ${JSON.stringify(blank)} should throw`,
      );
    }
    console.log('PASS blank eventId throws');

    // --- blank actorId throws ---

    for (const blank of ['', '   ', '\t', '\n']) {
      await assert.rejects(
        () => bindEventActor('evt-1', blank),
        /non-blank string/,
        `blank actorId ${JSON.stringify(blank)} should throw`,
      );
    }
    console.log('PASS blank actorId throws');

    // --- non-existent eventId throws ---

    for (const fn of [
      () => markEventSynced('nonexistent'),
      () => markEventLocalOnly('nonexistent'),
      () => bindEventActor('nonexistent', 'user-1'),
      () => markEventBlocked('nonexistent', 'reason'),
    ]) {
      await assert.rejects(
        fn,
        /Event not found/,
        'non-existent eventId should throw',
      );
    }
    console.log('PASS non-existent eventId throws');
  } finally {
    db.events.get = originalGet as typeof db.events.get;
    db.events.update = originalUpdate as typeof db.events.update;
  }

  console.log('PASS event sync status service');
}

main().catch((error) => {
  console.error('FAIL event sync status service');
  throw error;
});
