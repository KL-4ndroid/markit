import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db, MarketPulseDB, clearAllData } from '../lib/db';
import { resetAuthenticatedCache } from '../lib/db/clear-user-data';
import { FinancialReviewRepository, type FinancialReviewCloudPort } from '../lib/markets/financial-review-repository';
import { FinancialReviewDraftSession } from '../lib/markets/financial-review-draft-session';
import { emptyFinancialDay, type FinancialReviewSnapshot } from '../lib/markets/financial-reviews';
import { dailyFinancialBasis, marketFeeBasis } from '../lib/analytics/financial-record-quality';
import { hasEffectiveEntitlement, resolveModelAccountCapabilities } from '../lib/subscription/subscription-capabilities';
import { installNetworkPort } from '../lib/platform/network-capability';
import { subscribeFinancialReviewScope } from '../lib/markets/financial-review-scope';
import { replayOwnerEvents } from '../lib/sync/owner-event-replay';
import type { Event, Market } from '../types/db';

const date = '2026-10-30';
const market = { id: 'fixture-market', owner_id: 'owner-a', name: 'isolated', location: 'isolated', startDate: date,
  endDate: date, status: 'completed', boothCost: 100, registrationFee: 100, createdAt: 0, updatedAt: 0 } as Market;
const raw = { ...emptyFinancialDay(market.id!, date), revenue: 50, profit: 50, dealCount: 1 };
const remote: FinancialReviewSnapshot = { ownerId: 'owner-a', marketId: market.id!, dates: [date], feeBasis: JSON.parse(marketFeeBasis(market)),
  feeKey: 'f'.repeat(32), feeTotal: 100, days: { [date]: { key: 'a'.repeat(32), revenue: 50, deals: 1, count: 1, valid: true, zeroAllowed: true } },
  reviews: [{ owner_id: 'owner-a', market_id: market.id!, review_key: date, mode: 'cost', amount: 0,
    observed: JSON.parse(dailyFinancialBasis(raw)), source_key: 'a'.repeat(32), revision: 1, mutation_id: 'initial', updated_at: date, valid: true }] };

async function main() {
  process.env.NEXT_PUBLIC_FINANCIAL_REVIEWS_ENABLED = 'true';
  const restoreNetwork = installNetworkPort({ getCurrentStatus: () => ({ connected: true, connectionType: 'unknown' }), subscribe: () => () => {} });
  const deviceB = new MarketPulseDB('FinancialReviewDraftTests-DeviceB');
  const seed = async (local: MarketPulseDB) => { await local.markets.put(market); await local.dailyStats.put({ ...raw, id: 1 }); };
  let actor = 'owner-a', now = Date.parse('2026-10-31T00:00:00Z');
  const ends = now + 60_000;
  let expiry: string | null = new Date(ends).toISOString(), writes = 0, loseReply = false;
  const receiptIds = new Set<string>();
  function paid() {
    const capability = resolveModelAccountCapabilities({ ownerId: 'owner-a', planCode: 'pro', planSource: 'admin', billingStatus: 'none',
      entitlementStatus: 'active', capabilityEvaluatedAt: new Date(now).toISOString(), capabilityRefreshAfter: new Date(now + 300_000).toISOString(), entitlementEndsAt: expiry });
    if (actor !== 'owner-a' || !hasEffectiveEntitlement(capability, now)) throw new Error('FINANCE_SCOPE');
  }
  const cloud: FinancialReviewCloudPort = {
    assertIdentity: async owner => { if (owner !== actor) throw new Error('FINANCE_SCOPE'); },
    read: async () => { paid(); return [structuredClone(remote)]; },
    save: async write => {
      paid();
      if (receiptIds.has(write.mutationId)) return;
      const row = remote.reviews[0];
      if (write.revision !== row.revision) throw new Error('FINANCE_CONFLICT');
      if (write.sourceKey !== remote.days[date].key) throw new Error('FINANCE_SOURCE');
      remote.reviews[0] = { ...row, mode: write.mode, amount: write.amount, revision: row.revision + 1, mutation_id: write.mutationId,
        source_key: write.sourceKey, observed: write.observed };
      receiptIds.add(write.mutationId); writes++;
      if (loseReply) { loseReply = false; throw new Error('response_lost_after_commit'); }
    },
  };
  const repo = (local = db, owner = 'owner-a') => new FinancialReviewRepository(owner, cloud, local);
  const session = (local = db) => new FinancialReviewDraftSession(repo(local), market.id!);
  try {
    await db.open(); await deviceB.open(); await clearAllData(); await seed(db); await seed(deviceB);
    let a = session();
    await a.open(date, 'cost');
    await Promise.all([a.changeAmount('1'), a.changeAmount('12'), a.changeAmount('123')]);
    assert.equal(a.getSnapshot().draft!.editor.amount, '123', 'A slower write must not roll back rapid keystrokes');
    assert.equal((await repo().listDrafts(market.id!))[0].editor.amount, '123');
    assert.equal(writes, 0, 'Opening, typing and autosaving must never write cloud data');
    a.close(); db.close(); await db.open();
    a = session(); await a.restore((await repo().listDrafts(market.id!))[0]);
    assert.equal(a.getSnapshot().draft!.editor.amount, '123', 'Reopening a persistent database restores input');
    assert.equal(writes, 0);
    console.log('PASS durable reopen, rapid edits, explicit restore and zero automatic cloud writes');

    now = ends + 1;
    const expired = session(); await expired.restore((await repo().listDrafts(market.id!))[0]); await expired.save();
    assert.match(expired.getSnapshot().error, /身分或方案/);
    assert.equal(writes, 0);
    assert.equal((await repo().listDrafts(market.id!))[0].editor.amount, '123');
    expiry = null; // Restore a legitimate non-expiring test grant, no store/billing adapter.
    const renewed = session(); await renewed.restore((await repo().listDrafts(market.id!))[0]);
    assert.equal(renewed.getSnapshot().draft!.editor.amount, '123');
    assert.equal(renewed.getSnapshot().error, '');
    console.log('PASS actual entitlement end boundary blocks reads/saves, retains input and restores after entitlement returns');

    const oldRepo = repo();
    const recurringEvents: Event[] = [
      { id: 'venue-event', actor_id: actor, type: 'venue_created', timestamp: 1, sync_status: 'synced',
        payload: { venueId: 'venue-fixture', name: 'isolated venue', status: 'active' } },
      { id: 'schedule-event', actor_id: actor, type: 'operation_schedule_created', timestamp: 2, sync_status: 'synced',
        payload: { scheduleId: 'schedule-fixture', venueId: 'venue-fixture', timezone: 'Asia/Taipei',
          recurrence: { frequency: 'weekly', interval: 1, weekdays: [5], startDate: date },
          startTime: '10:00', endTime: '18:00', endsNextDay: false, defaults: {}, status: 'active', revision: 1 } },
    ];
    await replayOwnerEvents(recurringEvents);
    let scopeChanges = 0;
    const unsubscribeScope = subscribeFinancialReviewScope(() => { scopeChanges++; });
    await resetAuthenticatedCache('role_switch', actor);
    assert.equal(await db.venues.count(), 0, 'Role reset must remove venue projections alongside their source events');
    assert.equal(await db.operationSchedules.count(), 0, 'Role reset must remove recurring schedule projections');
    assert.equal(scopeChanges, 1, 'Mounted readers must be notified when the authenticated cache scope changes');
    actor = 'owner-b';
    await assert.rejects(oldRepo.listDrafts(market.id!), /FINANCE_SCOPE/);
    await db.markets.put({ ...market, id: 'b-market', owner_id: actor });
    assert.equal((await repo(db, actor).listDrafts('b-market')).length, 0);
    await assert.rejects(repo(db, actor).listDrafts(market.id!), /FINANCE_SCOPE/);
    const bSession = new FinancialReviewDraftSession(repo(db, actor), 'b-market');
    const retained = (await db.financialReviewDrafts.toArray())[0];
    await bSession.restore(retained);
    assert.equal(bSession.getSnapshot().draft, null, 'Another account must never render the draft');
    // Simulate cached recurring projections before a later full sign-out.
    await replayOwnerEvents(recurringEvents);
    await resetAuthenticatedCache('full', actor);
    assert.equal(await db.venues.count(), 0);
    assert.equal(await db.operationSchedules.count(), 0);
    assert.equal(scopeChanges, 2); unsubscribeScope();
    actor = 'owner-a'; await seed(db);
    await replayOwnerEvents(recurringEvents);
    assert.equal(await db.venues.count(), 1, 'Returning owner can rebuild once without duplicate-key failure');
    assert.equal(await db.operationSchedules.count(), 1);
    a = session(); await a.restore((await repo().listDrafts(market.id!))[0]);
    assert.equal(a.getSnapshot().draft!.editor.amount, '123', 'Owner input survives both auth cache resets');
    await a.discard(a.getSnapshot().draft!);
    console.log('PASS full/role cache resets retain private drafts, invalidate old sessions and isolate the next account');

    a = session(); const b = session(deviceB);
    await a.open(date, 'cost'); await b.open(date, 'cost');
    await a.changeAmount('11'); await b.changeAmount('22');
    await b.save(); assert.equal(remote.reviews[0].amount, 22);
    await a.save(); assert.match(a.getSnapshot().error, /來源或核對紀錄已更新/);
    assert.equal(writes, 1); assert.equal(a.getSnapshot().draft!.editor.amount, '11');
    await a.recheck(); assert.equal(a.getSnapshot().conflict, true);
    await a.save(); assert.equal(writes, 1, 'A stale writer cannot silently overwrite another device');
    await a.acceptLatest(); assert.equal(a.getSnapshot().draft!.editor.amount, '11');
    assert.equal(writes, 1, 'Accepting latest source is not a save');
    await a.save(); assert.equal(remote.reviews[0].amount, 11); assert.equal(writes, 2);
    console.log('PASS independent devices, revision conflict, input retention and explicit conflict resolution');

    const lost = session(deviceB); await lost.open(date, 'cost'); await lost.changeAmount('33');
    loseReply = true; await lost.save();
    assert.equal(writes, 3); assert.ok(lost.getSnapshot().draft!.attempt);
    const recovered = session(deviceB); await recovered.restore((await repo(deviceB).listDrafts(market.id!))[0]);
    assert.equal(recovered.getSnapshot().draft, null);
    assert.match(recovered.getSnapshot().status, /沒有重複送出/);
    assert.equal(writes, 3); assert.equal((await repo(deviceB).listDrafts(market.id!)).length, 0);
    console.log('PASS commit with lost reply, persisted mutation identity and reopen reconciliation without duplicate writes');

    const tabOne = session(); await tabOne.open(date, 'cost');
    const sameRow = (await repo().listDrafts(market.id!))[0];
    const tabTwo = session(); await tabTwo.restore(sameRow);
    await tabOne.changeAmount('44'); await tabTwo.changeAmount('55');
    assert.equal(tabTwo.getSnapshot().localError, true);
    assert.equal((await repo().listDrafts(market.id!))[0].editor.amount, '44');
    await tabTwo.save(); assert.equal(writes, 3);
    await tabTwo.discard(sameRow);
    assert.equal((await repo().listDrafts(market.id!)).length, 1, 'Stale discard cannot delete newer input');
    await tabOne.discard(tabOne.getSnapshot().draft!);
    console.log('PASS same-device windows cannot overwrite or discard a newer draft');

    const storageRepo = repo(); const storageFailure = new FinancialReviewDraftSession(storageRepo, market.id!);
    await storageFailure.open(date, 'cost');
    const stage = storageRepo.stageDraft.bind(storageRepo);
    storageRepo.stageDraft = async () => { throw new Error('QuotaExceededError'); };
    await storageFailure.changeAmount('66'); await storageFailure.save(); storageFailure.close();
    assert.equal(storageFailure.getSnapshot().localError, true);
    assert.equal(storageFailure.getSnapshot().draft!.editor.amount, '66'); assert.equal(writes, 3);
    storageRepo.stageDraft = stage; await storageFailure.retryLocal(); storageFailure.close();
    assert.equal((await repo().listDrafts(market.id!))[0].editor.amount, '66');
    console.log('PASS local storage failure blocks cloud writes and reports unsaved input before closing');

    const oldGeneration = (await repo().listDrafts(market.id!))[0];
    await repo().discardDraft(oldGeneration);
    const replacement = session(); await replacement.open(date, 'cost'); await replacement.changeAmount('77');
    const replacementRow = (await repo().listDrafts(market.id!))[0];
    assert.equal(replacementRow.localRevision, oldGeneration.localRevision);
    assert.notEqual(replacementRow.generation, oldGeneration.generation);
    await assert.rejects(repo().stageDraft(oldGeneration), /FINANCE_DRAFT_CONFLICT/);
    await assert.rejects(repo().discardDraft(oldGeneration), /FINANCE_DRAFT_CONFLICT/);
    await replacement.discard(replacement.getSnapshot().draft!);
    console.log('PASS discarded/recreated draft generations cannot be overwritten by an older window with the same revision');

    let releaseSave!: () => void, announceCommit!: () => void;
    const held = new Promise<void>(resolve => { releaseSave = resolve; });
    const committed = new Promise<void>(resolve => { announceCommit = resolve; });
    const delayedCloud: FinancialReviewCloudPort = { ...cloud, save: async write => { await cloud.save(write); announceCommit(); await held; } };
    const inFlight = new FinancialReviewDraftSession(new FinancialReviewRepository('owner-a', delayedCloud), market.id!);
    await inFlight.open(date, 'cost'); await inFlight.changeAmount('88');
    const saving = inFlight.save(); await committed;
    const committedWrites = writes;
    await resetAuthenticatedCache('full', actor); actor = 'owner-b';
    releaseSave(); await saving;
    assert.match(inFlight.getSnapshot().error, /身分或方案/);
    assert.equal(await db.financialReviewDrafts.count(), 1, 'Sign-out during an acknowledged server write must retain delivery identity');
    actor = 'owner-a'; await seed(db);
    const afterSwitch = session(); await afterSwitch.restore((await repo().listDrafts(market.id!))[0]);
    assert.equal(afterSwitch.getSnapshot().draft, null); assert.equal(writes, committedWrites);
    console.log('PASS account switch during cloud response cannot clear the draft or replay the successful old-account mutation');

    assert.equal(await db.events.count(), 0); assert.equal(await db.products.count(), 0);
    assert.equal((await db.dailyStats.get(1))!.revenue, 50); assert.equal((await db.dailyStats.get(1))!.cost, 0);
    await clearAllData(); assert.equal(await db.financialReviewDrafts.count(), 0, 'Explicit local erasure still removes private drafts');
  } finally { restoreNetwork(); db.close(); await deviceB.delete(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; db.close(); });
