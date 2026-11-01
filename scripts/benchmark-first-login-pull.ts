/** Isolated benchmark: fake IndexedDB and synthetic cloud reads; never calls live APIs. */
import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase/client';
import { pullOwnerEvents } from '../lib/sync/owner-pull-service';

async function main() {
  const originalFrom = supabase.from, originalRpc = supabase.rpc, originalLog = console.log;
  const marketCount = 80, eventCount = 5000, latencyMs = 80;
  const markets = Array.from({ length: marketCount }, (_, i) => ({ id: `market-${i}`, owner_id: 'benchmark-owner', name: 'Synthetic',
    start_date: '2026-10-30', end_date: '2026-10-30', status: 'completed', created_at: '2026-10-01', updated_at: '2026-10-30' }));
  const events = Array.from({ length: eventCount }, (_, i) => ({ id: `event-${String(i).padStart(6, '0')}`, type: 'deal_closed',
    market_id: markets[i % marketCount].id, actor_id: 'benchmark-owner', timestamp: new Date(1793318400000 + i).toISOString(),
    created_at: new Date(1793318400000 + i).toISOString(), payload: { market_id: markets[i % marketCount].id, items: [],
      totalAmount: 10, manualRevenue: 10, manualCost: 3, manualDealCount: 1, isManualEntry: true, isBackfill: true, dealDate: '2026-10-30' } }));
  let requests = 0, inFlight = 0, maxInFlight = 0, maxFilterIds = 0;
  (supabase as any).rpc = async () => ({ data: { ownerId: 'benchmark-owner', enforced: true, scope: 'paid' }, error: null });
  (supabase as any).from = (table: string) => {
    let range = [0, 999], selected = '*', ids: string[] | undefined;
    const builder: any = {
      select: (value: string) => { selected = value; return builder; }, eq: () => builder, order: () => builder, gte: () => builder,
      is: () => builder, or: () => builder,
      in: (_column: string, value: string[]) => { ids = value; maxFilterIds = Math.max(maxFilterIds, value.length); return builder; },
      range: (start: number, end: number) => { range = [start, end]; return builder; },
      then: (resolve: any, reject: any) => {
        requests++; inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
        return new Promise(resolveRead => setTimeout(() => {
          inFlight--;
          const source = table === 'market_members' ? [] : table === 'owner_accessible_events' ? events
            : markets.filter(row => !ids || ids.includes(row.id)).map(row => selected === 'id' ? { id: row.id } : row);
          resolveRead({ data: source.slice(range[0], range[1] + 1), error: null });
        }, latencyMs)).then(resolve, reject);
      },
    }; return builder;
  };
  console.log = () => {};
  try {
    await db.open(); await db.settings.put({ id: 1 } as any);
    const started = performance.now(); let downloadedAt = 0, replayedAt = 0;
    await pullOwnerEvents('benchmark-owner', (current, total, item) => {
      if (item === '正在補齊市集資料') downloadedAt = performance.now();
      if (total === eventCount && current === eventCount) replayedAt = performance.now();
    }, 3);
    const coldMs = performance.now() - started;
    assert.equal(await db.events.count(), eventCount);
    const localMarkets = await db.markets.toArray();
    assert.equal(localMarkets.reduce((sum, row) => sum + (row.totalRevenue ?? 0), 0), eventCount * 10);
    assert.equal(localMarkets.reduce((sum, row) => sum + (row.totalDeals ?? 0), 0), eventCount);
    // A retry of a complete history models an interrupted cursor/verification, not a new sale.
    await db.settings.update(1, { lastSyncAt: undefined, ownerReplayRevision: undefined });
    const repeatStarted = performance.now(); await pullOwnerEvents('benchmark-owner', () => {}, 3);
    const repeatMs = performance.now() - repeatStarted;
    assert.equal(await db.events.count(), eventCount);
    assert.equal((await db.markets.toArray()).reduce((sum, row) => sum + (row.totalRevenue ?? 0), 0), eventCount * 10);
    originalLog(JSON.stringify({ marketCount, eventCount, simulatedReadLatencyMs: latencyMs, requests, maxInFlight, maxFilterIds,
      coldMs: Math.round(coldMs), downloadMs: Math.round(downloadedAt - started),
      replayAndHydrationMs: Math.round(replayedAt - downloadedAt), repeatedFullHistoryMs: Math.round(repeatMs) }));
  } finally { console.log = originalLog; (supabase as any).from = originalFrom; (supabase as any).rpc = originalRpc; await db.delete(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
