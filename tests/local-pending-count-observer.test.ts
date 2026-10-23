import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import type { Event } from '../types/db';
import { subscribeLocalPendingCount } from '../lib/sync/local-pending-count-observer';

async function main() {
  const db = new Dexie(`pending-count-test-${Date.now()}`);
  db.version(1).stores({ events: 'id,sync_status' });
  const events = db.table<Event, string>('events');
  const counts: number[] = [];
  const errors: unknown[] = [];
  const stop = subscribeLocalPendingCount(events, count => counts.push(count), error => errors.push(error));
  async function expectLatest(expected: number) {
    const deadline = Date.now() + 2000;
    while (counts.at(-1) !== expected && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(counts.at(-1), expected);
    assert.deepEqual(errors, []);
  }
  try {
    await expectLatest(0);
    const event = (id: string, sync_status: Event['sync_status']) => ({
      id, sync_status, type: 'deal_closed', actor_id: 'test-owner', timestamp: Date.now(), payload: {},
    }) as Event;
    await events.add(event('offline-backfill', 'local_only'));
    await expectLatest(1);
    await events.add(event('pending-edit', 'pending'));
    await expectLatest(2);
    await events.update('offline-backfill', { sync_status: 'synced' });
    await expectLatest(1);
    await events.update('pending-edit', { sync_status: 'blocked' });
    await expectLatest(0);
    stop();
    const delivered = counts.length;
    await events.add(event('after-unmount', 'local_only'));
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(counts.length, delivered, 'unmounted/changed-identity observer must stop publishing');
  } finally {
    stop();
    await db.delete();
  }
  console.log('PASS pending indicator follows offline local writes and stops on cleanup');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
