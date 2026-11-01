import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase/client';
import { readCloudPages, readCloudIdBatches } from '../lib/sync/bounded-cloud-reading';
import { getOwnerAccessibleMarketIds } from '../lib/sync/owner-market-access-service';
import { batchHydrateMarkets } from '../lib/sync/owner-market-hydration-service';
import { pullOwnerEvents, getLatestCloudEventTimestamp } from '../lib/sync/owner-pull-service';
import { replayOwnerEvents } from '../lib/sync/owner-event-replay';
import type { Event } from '../types/db';

async function main() {
  const originalFrom = supabase.from, originalRpc = supabase.rpc;
  try {
    let active = 0, peak = 0, calls = 0;
    const rows = Array.from({ length: 2501 }, (_, i) => i);
    const collected = await readCloudPages(async (start, end) => {
      active++; peak = Math.max(peak, active); calls++;
      await new Promise(resolve => setTimeout(resolve, start === 500 ? 8 : 1)); active--;
      return rows.slice(start, end + 1);
    });
    assert.deepEqual(collected, rows, 'out-of-order responses preserve page order');
    assert.equal(peak, 2); assert.equal(calls, 7, 'at most one empty lookahead request');
    calls = 0;
    assert.deepEqual(await readCloudPages(async () => { calls++; return [1]; }), [1]);
    assert.equal(calls, 1, 'small accounts do not pay for speculative requests');
    await assert.rejects(readCloudPages(async start => { if (start === 1000) throw new Error('offline'); return rows.slice(start, start + 500); }), /offline/);
    let cancelled = false;
    await assert.rejects(readCloudPages(async start => { cancelled = true; return rows.slice(start, start + 500); }, {
      assertActive: () => { if (cancelled) throw new Error('SYNC_CONTEXT_CHANGED'); },
    }), /SYNC_CONTEXT_CHANGED/);
    let maxIds = 0;
    const ids = Array.from({ length: 1201 }, (_, i) => `m-${String(i).padStart(4, '0')}`);
    assert.deepEqual(await readCloudIdBatches(ids, async group => { maxIds = Math.max(maxIds, group.length); return group; }, () => {}), ids);
    assert.equal(maxIds, 100);
    assert.equal(getLatestCloudEventTimestamp(Array.from({ length: 200001 }, (_, i) => ({ created_at: new Date(i).toISOString() }))), 200000);
    assert.equal(getLatestCloudEventTimestamp([{ created_at: 'invalid' }, {}]), null);
    console.log('PASS bounded ordered reads, small-account budget, lookahead failure, cancellation and bounded ID filters');

    let hydrateFailure = false, foreignHydration = false, eventFailure = false, contextActive = true;
    const seenEventQueries: { or: boolean; ranges: number[] }[] = [];
    const history = Array.from({ length: 1501 }, (_, i) => ({ id: `cloud-${i}`, type: 'field_note_created',
      market_id: ids[i % ids.length], actor_id: 'owner', payload: {}, timestamp: new Date(1000 + i).toISOString(), created_at: new Date(2000 + i).toISOString() }));
    (supabase as any).rpc = async () => ({ data: { ownerId: 'owner', enforced: true, scope: 'paid' }, error: null });
    (supabase as any).from = (table: string) => {
      let selected = '*', range = [0, 999], group: string[] | undefined;
      const query = { or: false, ranges: range };
      if (table === 'owner_accessible_events') seenEventQueries.push(query);
      const builder: any = {
        select: (value: string) => { selected = value; return builder; }, eq: () => builder, order: () => builder, gte: () => builder,
        or: () => { query.or = true; return builder; }, is: () => builder,
        in: (_field: string, value: string[]) => { group = value; assert.ok(value.length <= 100); return builder; },
        range: (start: number, end: number) => { range = [start, end]; query.ranges = range; return builder; },
        then: (resolve: any, reject: any) => {
          if (eventFailure && table === 'owner_accessible_events' && range[0] === 1000) return Promise.resolve({ data: null, error: new Error('page failed') }).then(resolve, reject);
          if (hydrateFailure && group?.includes(ids[150])) return Promise.resolve({ data: null, error: new Error('hydrate failed') }).then(resolve, reject);
          let data = table === 'market_members' ? [{ market_id: ids[0] }]
            : table === 'owner_accessible_events' ? [...history, { ...history[0], id: 'foreign-event', market_id: 'outside-access', created_at: new Date(999999).toISOString() }]
            : (group ?? ids).map(id => selected === 'id' ? { id } : { id, owner_id: 'owner', name: id, start_date: '2026-10-30', end_date: '2026-10-30', total_revenue: 999 });
          if (foreignHydration && group) data = [...data, { id: 'not-requested', owner_id: 'other' }] as any;
          return Promise.resolve({ data: data.slice(range[0], range[1] + 1), error: null }).then(resolve, reject);
        },
      }; return builder;
    };
    await db.open(); await db.settings.put({ id: 1, lastSyncAt: 123 } as any);
    assert.equal((await getOwnerAccessibleMarketIds('owner')).length, 1201, 'market IDs cross the API row cap without truncation');
    hydrateFailure = true;
    const failed = await batchHydrateMarkets(new Set(ids.slice(0, 250)), 3);
    assert.equal(failed.failed.size, 250); assert.equal(failed.missing.size, 0); assert.equal(await db.markets.count(), 0, 'failed reads do not write partial market metadata');
    hydrateFailure = false; foreignHydration = true;
    assert.equal((await batchHydrateMarkets(new Set(ids.slice(0, 2)), 3)).failed.size, 2);
    assert.equal(await db.markets.count(), 0);
    foreignHydration = false;
    const hydrated = await batchHydrateMarkets(new Set(ids), 3);
    assert.equal(hydrated.hydrated.size, 1201); assert.equal(hydrated.missing.size, 0);
    assert.equal((await db.markets.get(ids[0]))?.totalRevenue, 0, 'hydration retains projection reset');
    eventFailure = true;
    await assert.rejects(pullOwnerEvents('owner', () => {}, 3), /page failed/);
    assert.equal(await db.events.count(), 0); assert.equal((await db.settings.get(1))?.lastSyncAt, 123);
    assert.equal((await db.settings.get(1))?.ownerReplayRevision, undefined);
    eventFailure = false;
    const progress: string[] = [];
    await pullOwnerEvents('owner', (_current, _total, text) => { if (text) progress.push(text); }, 3, () => { if (!contextActive) throw new Error('SYNC_CONTEXT_CHANGED'); });
    assert.equal(await db.events.count(), 1501);
    assert.equal(await db.events.get('foreign-event'), undefined, 'the local market intersection still rejects out-of-scope rows');
    assert.equal((await db.settings.get(1))?.lastSyncAt, 3500);
    assert.ok(progress.some(label => label.includes('已讀取 1502 筆')));
    assert.ok(seenEventQueries.every(query => !query.or), 'the owner-scoped view avoids a URL proportional to all market IDs');
    contextActive = false;
    await assert.rejects(pullOwnerEvents('owner', () => {}, 3, () => { throw new Error('SYNC_CONTEXT_CHANGED'); }), /SYNC_CONTEXT_CHANGED/);
    console.log('PASS 1201 markets and 1501 events, hydration all-or-fail, no foreign rows, cursor failure boundary and progress');

    await db.events.clear();
    const unchanged = { id: 'same', type: 'field_note_created', timestamp: 1, market_id: ids[0], payload: {}, sync_status: 'synced' } as Event;
    await db.events.put(unchanged);
    const neighbor = { ...unchanged, id: 'unchanged-neighbor' };
    await db.events.put(neighbor);
    await db.events.bulkPut(Array.from({ length: 2000 }, (_, i) => ({ ...unchanged, id: `unrelated-${i}`, market_id: 'unrelated' })));
    let writes = 0;
    const countWrite = () => { writes++; };
    db.events.hook('updating', countWrite);
    const originalToArray = db.events.toArray;
    db.events.toArray = () => { throw new Error('Full event table read forbidden'); };
    try {
      await replayOwnerEvents([unchanged], { refreshSyncedPayloads: true });
      assert.equal(writes, 0, 'unchanged retained history is not rewritten');
      await replayOwnerEvents([{ ...unchanged, payload: { text: 'new cloud metadata' } }, neighbor], { refreshSyncedPayloads: true });
      assert.equal(writes, 1, 'changed synced payloads refresh without rewriting unchanged neighbors');
      await db.events.update('same', { payload: { value: NaN } });
      await replayOwnerEvents([{ ...unchanged, payload: { value: null } }], { refreshSyncedPayloads: true });
      assert.deepEqual((await db.events.get('same'))?.payload, { value: null }, 'lossy JSON equality must not skip repair of different values');
      await db.events.update('same', { sync_status: 'pending', payload: { draft: 'keep' } });
      await replayOwnerEvents([unchanged], { refreshSyncedPayloads: true });
      assert.deepEqual((await db.events.get('same'))?.payload, { draft: 'keep' });
    } finally { db.events.toArray = originalToArray; db.events.hook('updating').unsubscribe(countWrite); }
    console.log('PASS indexed replay reads, unchanged-history write elimination and changed/pending payload preservation');
    const originalLog = console.log; let replayLogs = 0;
    try {
      console.log = () => { replayLogs++; };
      await replayOwnerEvents(Array.from({ length: 100 }, (_, i) => ({ id: `quiet-${i}`, type: 'deal_closed', market_id: ids[0],
        actor_id: 'owner', timestamp: 1793318400000 + i, sync_status: 'synced', payload: { market_id: ids[0], items: [], totalAmount: 10,
          manualRevenue: 10, manualCost: 3, manualDealCount: 1, isManualEntry: true, isBackfill: true, dealDate: '2026-10-30' } } as Event)));
    } finally { console.log = originalLog; }
    assert.equal(replayLogs, 0, 'sales replay does not print hundreds of per-event messages');
    assert.equal((await db.markets.get(ids[0]))?.totalRevenue, 1000);
    assert.equal((await db.markets.get(ids[0]))?.totalProfit, 700);
    console.log('PASS quiet replay keeps revenue/profit calculations and atomic batches unchanged');
  } finally { (supabase as any).from = originalFrom; (supabase as any).rpc = originalRpc; await db.delete(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; db.close(); });
