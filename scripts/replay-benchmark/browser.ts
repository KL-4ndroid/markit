/** Standalone loopback benchmark only. Not imported by app routes or mobile builds. */
import { db } from '../../lib/db';
import { eventHandlers } from '../../lib/db/events';
import { replayOwnerEvents } from '../../lib/sync/owner-event-replay';
import type { Event } from '../../types/db';
import type { DBCoreTable } from 'dexie';

type Metric = { calls: number; ms: number };
let metrics: Record<string, Metric> = {};
let measuring = false;
function timed<T>(name: string, action: () => Promise<T>): Promise<T> {
  if (!measuring) return action();
  const metric = metrics[name] ??= { calls: 0, ms: 0 };
  const start = performance.now(); metric.calls++;
  return action().then(value => { metric.ms += performance.now() - start; return value; }, error => { metric.ms += performance.now() - start; throw error; });
}
db.use({ stack: 'dbcore', name: 'isolated-replay-profile', level: -100,
  create: down => ({ ...down, table: name => {
    const table = down.table(name);
    return { ...table, ...Object.fromEntries(['get', 'getMany', 'query', 'mutate', 'count', 'openCursor'].map(method => [method,
      (request: never) => timed(`${name}.${method}`, () => (table[method as keyof DBCoreTable] as (request: never) => Promise<unknown>)(request)),
    ])) } as DBCoreTable;
  } }),
});
for (const [type, handler] of Object.entries(eventHandlers)) {
  eventHandlers[type as Event['type']] = (event, local, context) => timed(`handler.${type}`, () => handler!(event, local, context));
}

const output = document.querySelector<HTMLPreElement>('#result')!;
const status = document.querySelector<HTMLElement>('#status')!;
const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')];
const results: unknown[] = [];
async function run(count: number) {
  buttons.forEach(button => button.disabled = true);
  try {
    const batching = document.querySelector<HTMLSelectElement>('#mode')!.value === 'batched';
    status.textContent = `Preparing ${count} synthetic events`;
    await db.open();
    await db.transaction('rw', [db.events, db.markets, db.products, db.dailyStats], async () => {
      await db.events.clear(); await db.markets.clear(); await db.products.clear(); await db.dailyStats.clear();
      await db.markets.bulkPut(Array.from({ length: 80 }, (_, i) => ({ id: `bench-market-${i}`, owner_id: 'isolated-owner', name: 'Synthetic',
        startDate: '2026-10-30', endDate: '2026-10-30', status: 'completed', totalRevenue: 0, totalProfit: 0, totalDeals: 0, totalInteractions: 0 } as any)));
    });
    const events = Array.from({ length: count }, (_, i): Event => ({ id: `bench-event-${i}`, market_id: `bench-market-${i % 80}`,
      actor_id: 'isolated-owner', timestamp: 1793318400000 + i, sync_status: 'synced', type: i % 5 === 0 ? 'interaction_recorded' : 'deal_closed',
      payload: i % 5 === 0 ? { market_id: `bench-market-${i % 80}`, type: 'touch' }
        : { market_id: `bench-market-${i % 80}`, items: [], totalAmount: 10, manualRevenue: 10, manualCost: 3, manualDealCount: 1,
          isManualEntry: true, isBackfill: true, dealDate: '2026-10-30' } }));
    await new Promise(requestAnimationFrame);
    metrics = {}; measuring = true;
    const started = performance.now();
    const longTasks: number[] = [];
    const observer = PerformanceObserver.supportedEntryTypes.includes('longtask') ? new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (entry.startTime >= started) longTasks.push(entry.duration);
    }) : null;
    observer?.observe({ entryTypes: ['longtask'] });
    let maxHeartbeatGap = 0, previous = performance.now();
    const heartbeat = setInterval(() => { const now = performance.now(); maxHeartbeatGap = Math.max(maxHeartbeatGap, now - previous); previous = now; }, 25);
    let completed = false;
    try {
      await replayOwnerEvents(events, { projectionBatching: batching, onProgress: (current, total) => { status.textContent = `Replaying ${current} / ${total}`; } });
      completed = true;
    } finally { measuring = false; clearInterval(heartbeat); observer?.disconnect(); }
    const elapsedMs = performance.now() - started;
    const markets = await db.markets.toArray(), daily = await db.dailyStats.toArray();
    const totals = { revenue: markets.reduce((sum, row) => sum + (row.totalRevenue ?? 0), 0), profit: markets.reduce((sum, row) => sum + (row.totalProfit ?? 0), 0),
      deals: markets.reduce((sum, row) => sum + (row.totalDeals ?? 0), 0), interactions: markets.reduce((sum, row) => sum + (row.totalInteractions ?? 0), 0),
      events: await db.events.count(), dailyRevenue: daily.reduce((sum, row) => sum + row.revenue, 0) };
    const correct = completed && totals.events === count && totals.revenue === count * 8 && totals.profit === count * 5.6
      && totals.deals === count * .8 && totals.interactions === count * .2 && totals.dailyRevenue === totals.revenue;
    const result = { mode: batching ? 'batched' : 'reference', count, elapsedMs: Math.round(elapsedMs), correct, totals, maxHeartbeatGapMs: Math.round(maxHeartbeatGap),
      longTasks: { count: longTasks.length, maxMs: Math.round(Math.max(0, ...longTasks)) },
      metrics: Object.fromEntries(Object.entries(metrics).map(([key, value]) => [key, { calls: value.calls, ms: Math.round(value.ms) }])) };
    results.push(result); output.textContent = JSON.stringify(results, null, 2); status.textContent = correct ? 'PASS' : 'FAIL totals';
  } catch (error) { status.textContent = 'FAIL'; output.textContent = error instanceof Error ? error.stack ?? String(error) : String(error); }
  finally { buttons.forEach(button => button.disabled = false); }
}
async function atomicChecks() {
  buttons.forEach(button => button.disabled = true);
  status.textContent = 'Checking rollback, retry and context';
  const original = db.markets.bulkPut;
  try {
    await db.open();
    await db.transaction('rw', [db.events, db.markets, db.dailyStats], async () => {
      await db.events.clear(); await db.markets.clear(); await db.dailyStats.clear();
      await db.markets.put({ id: 'atomic-market', totalRevenue: 0, totalProfit: 0, totalDeals: 0 } as any);
    });
    const event: Event = { id: 'atomic', market_id: 'atomic-market', timestamp: 1793318400000, type: 'deal_closed', sync_status: 'synced',
      payload: { market_id: 'atomic-market', items: [], totalAmount: 10, manualRevenue: 10, manualCost: 3,
        manualDealCount: 1, isManualEntry: true, isBackfill: true, dealDate: '2026-10-30' } };
    db.markets.bulkPut = () => { throw new Error('expected flush failure'); };
    let failed = false;
    try { await replayOwnerEvents([event]); } catch { failed = true; }
    db.markets.bulkPut = original;
    const rollback = failed && await db.events.count() === 0 && await db.dailyStats.count() === 0
      && (await db.markets.get('atomic-market'))?.totalRevenue === 0;
    await replayOwnerEvents([event]); await replayOwnerEvents([event]);
    const retry = await db.events.count() === 1 && (await db.markets.get('atomic-market'))?.totalRevenue === 10;
    let active = true;
    const handler = eventHandlers.deal_closed!;
    eventHandlers.deal_closed = async (...args) => { await handler(...args); active = false; };
    let cancelled = false;
    try { await replayOwnerEvents([{ ...event, id: 'cancelled' }], { assertActive: () => { if (!active) throw new Error('inactive'); } }); }
    catch { cancelled = true; }
    finally { eventHandlers.deal_closed = handler; }
    const context = cancelled && await db.events.count() === 1 && (await db.markets.get('atomic-market'))?.totalRevenue === 10;
    const result = { realIndexedDBAtomicChecks: { rollback, retry, context }, correct: rollback && retry && context };
    results.push(result); output.textContent = JSON.stringify(results, null, 2); status.textContent = result.correct ? 'PASS' : 'FAIL atomic checks';
  } catch (error) { status.textContent = 'FAIL'; output.textContent = String(error); }
  finally { db.markets.bulkPut = original; buttons.forEach(button => button.disabled = false); }
}
buttons.forEach(button => button.addEventListener('click', () => void (button.dataset.count ? run(Number(button.dataset.count)) : atomicChecks())));
