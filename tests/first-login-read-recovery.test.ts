import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { liveQuery } from 'dexie';
import { db, clearAllData } from '../lib/db';
import { FinancialReviewRepository, type FinancialReviewCloudPort } from '../lib/markets/financial-review-repository';
import { FinancialReviewDraftSession } from '../lib/markets/financial-review-draft-session';
import { readFinancialReviewLocalState, readFinancialReviewsWithRecovery, waitForFinancialReadRetry } from '../lib/markets/financial-review-reading';
import { emptyFinancialDay, type FinancialReviewSnapshot } from '../lib/markets/financial-reviews';
import { dailyFinancialBasis, marketFeeBasis } from '../lib/analytics/financial-record-quality';
import { installNetworkPort } from '../lib/platform/network-capability';
import type { Market } from '../types/db';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

const day = '2026-10-30';
const market = { id: 'm', owner_id: 'owner-a', name: 'isolated first login', location: 'isolated', startDate: day, endDate: day,
  status: 'completed', boothCost: 100, registrationFee: 100, createdAt: 1, updatedAt: 1 } as Market;
const raw = { ...emptyFinancialDay('m', day), revenue: 50, profit: 50, dealCount: 1 };
const snapshot: FinancialReviewSnapshot = { ownerId: 'owner-a', marketId: 'm', dates: [day], feeKey: 'f'.repeat(32),
  feeBasis: JSON.parse(marketFeeBasis(market)), feeTotal: 100,
  days: { [day]: { key: 'a'.repeat(32), revenue: 50, deals: 1, count: 1, valid: true, zeroAllowed: true } },
  reviews: [{ owner_id: 'owner-a', market_id: 'm', review_key: day, mode: 'cost', amount: 0,
    observed: JSON.parse(dailyFinancialBasis(raw)), source_key: 'a'.repeat(32), revision: 1, mutation_id: 'initial', updated_at: day, valid: true }] };

async function main() {
  process.env.NEXT_PUBLIC_FINANCIAL_REVIEWS_ENABLED = 'true';
  const restoreNetwork = installNetworkPort({ getCurrentStatus: () => ({ connected: true, connectionType: 'unknown' }), subscribe: () => () => {} });
  await db.open(); await clearAllData(); await db.settings.clear();
  let reads = 0, writes = 0, fail: unknown = null;
  const cloud: FinancialReviewCloudPort = {
    assertIdentity: async owner => assert.equal(owner, 'owner-a'),
    read: async () => { reads++; if (fail) throw fail; return [structuredClone(snapshot)]; },
    save: async () => { writes++; },
  };
  const repo = new FinancialReviewRepository('owner-a', cloud);
  const controller = new AbortController();
  const options = { signal: controller.signal, assertCurrent() {}, wait: async (delay: number) => { assert.equal(delay, 800); } };
  let observation: ReturnType<ReturnType<typeof liveQuery>['subscribe']> | undefined;
  try {
    // This is the old broken boundary: a valid cloud fallback is not yet a local cache row.
    await assert.rejects(repo.refresh(['m']), /FINANCE_SCOPE/);
    assert.equal(reads, 0);
    const missing = await readFinancialReviewLocalState(db, 'owner-a', ['m']);
    assert.equal(missing.localReady, false);
    const prepared = deferred<void>();
    observation = liveQuery(() => readFinancialReviewLocalState(db, 'owner-a', ['m'])).subscribe({
      next: state => { if (state.localReady && state.historyVerified) prepared.resolve(); },
      error: error => { throw error; },
    });
    await db.markets.put(market);
    assert.equal((await readFinancialReviewLocalState(db, 'owner-a', ['m'])).historyVerified, false);
    await db.settings.put({ id: 1, theme: 'auto', language: 'zh-TW', defaultCurrency: 'TWD', enableNotifications: false, autoBackup: false,
      updatedAt: 1, ownerReplayRevision: 'owner-b:dependency-order-v2-product-owners:paid', lastSyncAt: 1000 });
    assert.equal((await readFinancialReviewLocalState(db, 'owner-a', ['m'])).historyVerified, false);
    await db.settings.update(1, { ownerReplayRevision: 'owner-a:dependency-order-v2-product-owners:paid' });
    let preparationTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([prepared.promise, new Promise<never>((_, reject) => {
        preparationTimer = setTimeout(() => reject(new Error('Cache readiness was not observed')), 5000);
      })]);
    } finally { clearTimeout(preparationTimer); }
    await readFinancialReviewsWithRecovery(repo, ['m'], options);
    assert.equal(reads, 1, 'Preparation becomes observable without a manual refresh or failed premature request');
    assert.equal(writes, 0);
    observation.unsubscribe(); observation = undefined;
    console.log('PASS missing cache, staged history readiness, owner-bound completion and observable preparation');

    reads = 0; let retries = 0;
    const transient: FinancialReviewCloudPort = { ...cloud, read: async () => {
      reads++; if (reads === 1) throw new TypeError('Failed to fetch'); return [structuredClone(snapshot)];
    } };
    await readFinancialReviewsWithRecovery(new FinancialReviewRepository('owner-a', transient), ['m'], {
      ...options, wait: async delay => { assert.equal(delay, 800); retries++; },
    });
    assert.equal(reads, 2); assert.equal(retries, 1); assert.equal(writes, 0);
    console.log('PASS one transient read failure recovers automatically with bounded backoff and no save');

    for (const error of [{ code: '42501', message: 'denied' }, { status: 401, message: 'Failed to fetch' },
      { status: 403, message: 'forbidden' }, { status: 429, message: 'Failed to fetch' }, new Error('FINANCE_SCOPE'), new Error('FINANCE_SOURCE')]) {
      fail = error; reads = 0; let waits = 0;
      await assert.rejects(readFinancialReviewsWithRecovery(repo, ['m'], { ...options, wait: async () => { waits++; } }));
      assert.equal(reads, 1); assert.equal(waits, 0);
    }
    fail = new Error('JOURNAL_TIMEOUT'); reads = 0;
    await assert.rejects(readFinancialReviewsWithRecovery(repo, ['m'], options), /JOURNAL_TIMEOUT/);
    assert.equal(reads, 2, 'Persistent network failures stop, rather than looping'); fail = null;
    console.log('PASS authorization, rate limit and source failures never auto-retry; persistent timeout stops after two attempts');

    const beforeCache = JSON.stringify(await db.financialReviewCache.toArray());
    const started = deferred<void>(), reply = deferred<FinancialReviewSnapshot[]>();
    const obsolete = new AbortController();
    const slow: FinancialReviewCloudPort = { ...cloud, read: () => { started.resolve(); return reply.promise; } };
    const pending = readFinancialReviewsWithRecovery(new FinancialReviewRepository('owner-a', slow), ['m'], {
      signal: obsolete.signal, assertCurrent() {},
    });
    await started.promise; obsolete.abort();
    reply.resolve([{ ...structuredClone(snapshot), reviews: [{ ...snapshot.reviews[0], amount: 99 }] }]);
    await assert.rejects(pending, /READ_CANCELLED/);
    assert.equal(JSON.stringify(await db.financialReviewCache.toArray()), beforeCache, 'Late reads cannot replace the current cache');
    const waiting = new AbortController(), wait = waitForFinancialReadRetry(30_000, waiting.signal);
    waiting.abort(); await assert.rejects(wait, /READ_CANCELLED/);
    console.log('PASS cancellation during network wait and backoff prevents stale cache writes and later requests');

    await db.dailyStats.put(raw);
    const draft = new FinancialReviewDraftSession(repo, 'm'); await draft.open(day, 'cost'); await draft.changeAmount('12');
    const originals = JSON.stringify({ market: await db.markets.get('m'), stats: await db.dailyStats.toArray(), drafts: await db.financialReviewDrafts.toArray() });
    reads = 0;
    await readFinancialReviewsWithRecovery(new FinancialReviewRepository('owner-a', transient), ['m'], options);
    assert.equal(JSON.stringify({ market: await db.markets.get('m'), stats: await db.dailyStats.toArray(), drafts: await db.financialReviewDrafts.toArray() }), originals);
    assert.equal(writes, 0);
    await db.markets.update('m', { owner_id: 'owner-b' });
    const denied = await readFinancialReviewLocalState(db, 'owner-a', ['m']);
    assert.equal(denied.denied, true); assert.deepEqual(denied.snapshots, []);
    console.log('PASS read recovery preserves private draft input and original financial records; wrong owner receives no snapshots');
  } finally { observation?.unsubscribe(); db.close(); restoreNetwork(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; db.close(); });
