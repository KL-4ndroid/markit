import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase/client';
import { pullOwnerEvents } from '../lib/sync/owner-pull-service';
import { pushEvents } from '../lib/sync/sync-push-service';
import { getUserSettings, saveUserSettings } from '../lib/supabase/settings';
import { acquireSyncLock, releaseSyncLock, getSyncLockGeneration, isSyncLockActive, resetSyncRuntimeState } from '../lib/sync/sync-runtime-state';

async function main() {
  const originalFrom = supabase.from;
  try {
    await db.settings.put({ id: 1, lastSyncAt: 123 } as any);
    await db.markets.put({ id: 'market', owner_id: 'owner', totalRevenue: 0, totalDeals: 0 } as any);
    const rows = Array.from({ length: 501 }, (_, i) => ({
      id: `event-${i}`, type: 'field_note_created', market_id: 'market', actor_id: 'owner', payload: {},
      timestamp: new Date(1000 + i).toISOString(), created_at: new Date(2000 + i).toISOString(),
    }));
    const requests: { table: string; range?: number[]; gte?: unknown[] }[] = [];
    let fail = true;
    (supabase as any).from = (table: string) => {
      const request: (typeof requests)[number] = { table }; requests.push(request);
      const builder: any = {
        select: () => builder, eq: () => builder, in: () => builder, or: () => builder, is: () => builder, order: () => builder,
        gte: (...args: unknown[]) => { request.gte = args; return builder; },
        range: (a: number, b: number) => { request.range = [a, b]; return builder; },
        then: (resolve: any, reject: any) => {
          if (table === 'market_members') return Promise.resolve({ data: [{ market_id: 'market', user_id: 'owner' }], error: null }).then(resolve, reject);
          if (table === 'markets') return Promise.resolve({ data: [{ id: 'market' }], error: null }).then(resolve, reject);
          const data = rows.slice(request.range![0], request.range![1] + 1).map(e => fail && e.id === 'event-499'
            ? { ...e, type: 'operation_schedule_updated', payload: { scheduleId: 'missing', updates: {} } } : e);
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return builder;
    };
    await assert.rejects(pullOwnerEvents('owner', () => {}, 3), /not found/);
    assert.equal((await db.settings.get(1))?.lastSyncAt, 123, 'failure cannot advance cursor');
    assert.equal(await db.events.count(), 450, 'earlier committed batches survive; failed batch rolls back');
    assert.equal(await db.events.get('event-499'), undefined);
    fail = false;
    const stages: string[] = [];
    await pullOwnerEvents('owner', (_c, _t, label) => { if (label) stages.push(label); }, 3);
    assert.equal(await db.events.count(), 501, 'retry completes remaining events without duplicate IDs');
    assert.equal((await db.settings.get(1))?.lastSyncAt, 2500);
    assert.ok(requests.some(r => r.range?.[0] === 500), 'download continues past first page');
    assert.ok(stages.includes('正在補齊市集資料') && stages.includes('正在整理歷史紀錄'));
    requests.length = 0;
    await pullOwnerEvents('owner', () => {}, 3);
    assert.deepEqual(requests.find(r => r.table === 'events')?.gte, ['created_at', new Date(2500).toISOString()]);
    requests.length = 0;
    assert.equal(await pushEvents('owner'), 0);
    assert.equal(requests.length, 0, 'no upload means no profile network lookup');

    let reads = 0;
    const resolvers: ((v: any) => void)[] = [];
    (supabase as any).from = () => {
      const builder: any = { select: () => builder, eq: () => builder,
        single: () => { reads++; return new Promise(resolve => resolvers.push(resolve)); },
        upsert: async () => ({ error: null }),
      }; return builder;
    };
    const first = getUserSettings('one');
    const second = getUserSettings('one');
    const other = getUserSettings('two');
    assert.equal(reads, 2, 'same user shares in-flight settings; other user stays isolated');
    resolvers[0]({ data: { user_id: 'one' }, error: null }); resolvers[1]({ data: { user_id: 'two' }, error: null });
    await Promise.all([first, second, other]);
    const stale = getUserSettings('one');
    await saveUserSettings('one', { brand_name: 'new' });
    const fresh = getUserSettings('one');
    assert.equal(reads, 4, 'saving invalidates an in-flight older read');
    resolvers[2]({ data: null, error: null }); resolvers[3]({ data: { brand_name: 'new' }, error: null });
    await Promise.all([stale, fresh]);
    resetSyncRuntimeState();
    assert.equal(acquireSyncLock(), true);
    const oldGeneration = getSyncLockGeneration();
    resetSyncRuntimeState();
    assert.equal(acquireSyncLock(), true);
    const newGeneration = getSyncLockGeneration();
    releaseSyncLock(oldGeneration);
    assert.equal(isSyncLockActive(), true, 'old identity cannot release the current identity lock');
    releaseSyncLock(newGeneration);
    assert.equal(isSyncLockActive(), false);
    console.log('PASS cold login pull: paginated recovery, failure/cursor boundary, resumable batches, readable stages, no-op push, settings coalescing and invalidation');
  } finally { (supabase as any).from = originalFrom; await db.delete(); }
}
void main();
