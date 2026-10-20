import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  decideNativeReconciliation, validateNativeReconciliationSnapshot, NATIVE_RECONCILIATION_FRESHNESS_MS,
  type NativeReconciliationState, type ReconciliationMapping, type ReconciliationProjection,
} from '../lib/subscription/native-reconciliation-decision';
import { createNativeReconciliationService, type NativeReconciliationRepository, type NativeReconciliationTransaction } from '../lib/subscription/native-reconciliation.server';
import type { NativeStoreVerificationAdapter, NativeStoreVerificationContext, VerifiedNativeStoreSubscription } from '../lib/subscription/native-store-verification-contract';
import { SUBSCRIPTION_PRICE_CATALOG } from '../lib/subscription/subscription-pricing';

const now = Date.parse('2026-10-20T12:00:00.000Z');
const context: NativeStoreVerificationContext = { authenticatedOwnerId: 'fixture-owner', expectedAccountBindingToken: 'fixture-server-binding', environment: 'sandbox' };
const snapshot: VerifiedNativeStoreSubscription = {
  verification: 'verified', accountBinding: 'matched', ownerId: context.authenticatedOwnerId, origin: 'apple_app_store', environment: 'sandbox',
  providerSubscriptionRef: 'fixture-chain', providerTransactionRef: 'fixture-transaction', productId: 'fixture.pro.monthly', basePlanId: null, offerId: null,
  mappedPriceVersionId: 'pro_monthly_twd_launch_v1', mappedPlanCode: 'pro', mappedCadence: 'monthly', status: 'active', autoRenewEnabled: true,
  currentPeriodStartsAt: '2026-10-01T00:00:00.000Z', currentPeriodEndsAt: '2026-11-01T00:00:00.000Z',
  storeObservedAt: '2026-10-20T11:59:59.000Z', verifiedAt: '2026-10-20T12:00:00.000Z', snapshotHash: 'a'.repeat(64),
};
const mapping: ReconciliationMapping = {
  origin: snapshot.origin, environment: 'sandbox', productId: snapshot.productId, basePlanId: null, offerId: null, status: 'active',
  price: { ...SUBSCRIPTION_PRICE_CATALOG.pro_monthly_twd_launch_v1, runtimeStatus: 'active', effectiveAt: '2026-10-01T00:00:00.000Z' },
};
const empty: NativeReconciliationState = {
  ownerId: context.authenticatedOwnerId, referenceOwnerId: null, previous: null, receipt: null, projectionSource: 'free', subscriptions: [],
};
const decide = (changes: Partial<Parameters<typeof decideNativeReconciliation>[0]> = {}) => decideNativeReconciliation({ context, snapshot, mapping, state: empty, nowMs: now, ...changes });
function memoryRepository() {
  let state = structuredClone(empty); let projection: ReconciliationProjection | null = null; let records = 0; let writes = 0;
  let receipts = new Map<string, NonNullable<NativeReconciliationState['receipt']>>(); let tail = Promise.resolve(); let failApply = false; let beforeRead = () => {};
  const repository: NativeReconciliationRepository = {
    async withOwnerTransaction<T>(ownerId: string, work: (transaction: NativeReconciliationTransaction) => Promise<T>): Promise<T> {
      let unlock!: () => void; const previous = tail; tail = new Promise<void>(resolve => { unlock = resolve; }); await previous;
      try {
        assert.equal(ownerId, context.authenticatedOwnerId);
        const staged = structuredClone(state); const stagedReceipts = new Map(receipts);
        let stagedProjection = projection; let added = 0; let updated = 0;
        const result = await work({ readState: async (_, key) => { beforeRead(); return { ...staged, receipt: stagedReceipts.get(key) ?? null }; },
          readMapping: async current => current.productId === mapping.productId ? mapping : null,
          recordDecision: async input => {
            stagedReceipts.set(input.reconciliationKey, { snapshotHash: input.snapshot.snapshotHash, ownerId, lastDecision: input.decision.code }); added++;
          },
          applyBillingProjection: async input => {
            if (failApply) throw new Error('private-db-detail');
            assert.equal(input.decision.outcome, 'apply'); assert.ok(input.decision.projection);
            stagedProjection = input.decision.projection; updated++;
            staged.referenceOwnerId = ownerId; staged.projectionSource = 'billing';
            staged.previous = { snapshotHash: input.snapshot.snapshotHash, storeObservedAt: input.snapshot.storeObservedAt };
          },
        });
        state = staged; receipts = stagedReceipts; projection = stagedProjection; records += added; writes += updated;
        return result;
      } finally { unlock(); }
    },
  };
  return { repository, get projection() { return projection; }, get records() { return records; }, get writes() { return writes; },
    subscriptions: (value: NativeReconciliationState['subscriptions']) => { state = { ...state, subscriptions: value }; },
    clearProjection: () => { state = { ...state, projectionSource: 'free' }; projection = null; },
    failApply: (value: boolean) => { failApply = value; }, beforeRead: (fn: () => void) => { beforeRead = fn; } };
}

async function main() {
  assert.equal(decide().outcome, 'apply'); assert.equal(decide().projection?.entitlementStatus, 'active');
  assert.equal(validateNativeReconciliationSnapshot({ ...snapshot, opaqueVerificationPayload: 'client-receipt' }, context, now), false);
  for (const changes of [
    { verification: 'unverified' }, { accountBinding: 'mismatched' }, { ownerId: 'other-owner' }, { environment: 'production' },
    { origin: 'ecpay_web' }, { snapshotHash: 'not-a-digest' }, { providerTransactionRef: 'x\nsecret' }, { basePlanId: 'not-an-apple-field' },
    { currentPeriodStartsAt: '2026-02-30T00:00:00.000Z' }, { currentPeriodEndsAt: null },
    { storeObservedAt: '2026-10-20T12:00:01.000Z' }, { verifiedAt: '2026-10-20T12:00:01.000Z' },
  ]) assert.equal(validateNativeReconciliationSnapshot({ ...snapshot, ...changes }, context, now), false, JSON.stringify(changes));
  assert.equal(validateNativeReconciliationSnapshot(snapshot, context, now + NATIVE_RECONCILIATION_FRESHNESS_MS), false);
  for (const changes of [{ status: 'candidate' as const }, { environment: 'production' as const }, { productId: 'wrong' }, { offerId: 'unmapped' },
    { price: SUBSCRIPTION_PRICE_CATALOG.pro_monthly_twd_launch_v1 }, { price: { ...mapping.price, amountMinor: 1 } },
    { price: { ...mapping.price, effectiveAt: '2027-01-01T00:00:00.000Z' } }]) assert.equal(decide({ mapping: { ...mapping, ...changes } }).code, 'mapping_unavailable');
  assert.equal(decide({ state: { ...empty, ownerId: 'other-owner' } }).code, 'owner_mismatch');
  assert.equal(decide({ state: { ...empty, referenceOwnerId: 'other-owner' } }).code, 'reference_owned_elsewhere');
  assert.equal(decide({ state: { ...empty, receipt: { ownerId: 'other-owner', snapshotHash: snapshot.snapshotHash, lastDecision: 'projection_ready' } } }).code, 'replay_conflict');
  const heldReceipt = { ownerId: context.authenticatedOwnerId, snapshotHash: snapshot.snapshotHash, lastDecision: 'subscription_conflict' as const };
  assert.equal(decide({ state: { ...empty, receipt: heldReceipt } }).outcome, 'apply', 'a previously held snapshot can apply after conflict resolution');
  for (const source of ['admin', 'promotion'] as const) assert.equal(decide({ state: { ...empty, projectionSource: source } }).code, 'protected_projection');
  for (const status of ['trialing', 'past_due', 'disputed', 'unknown'] as const) {
    const result = decide({ snapshot: { ...snapshot, status } }); assert.equal(result.code, 'policy_review_required'); assert.equal(result.projection, null);
  }
  for (const status of ['active', 'cancel_at_period_end', 'cancelled', 'refunded'] as const) {
    const current = decide({ snapshot: { ...snapshot, status } });
    assert.equal(current.projection?.entitlementStatus, ['active', 'cancel_at_period_end'].includes(status) ? 'active' : 'inactive');
    const expired = decide({ snapshot: { ...snapshot, status, currentPeriodEndsAt: '2026-10-20T11:59:58.000Z' } });
    assert.equal(expired.projection?.entitlementStatus, 'inactive');
  }
  assert.equal(decide({ snapshot: { ...snapshot, currentPeriodEndsAt: new Date(now).toISOString() } }).projection?.entitlementStatus, 'active', 'match the existing shared entitlement inclusive end boundary');
  const previous = { storeObservedAt: snapshot.storeObservedAt, snapshotHash: snapshot.snapshotHash };
  assert.equal(decide({ state: { ...empty, previous, projectionSource: 'billing' } }).code, 'duplicate');
  assert.equal(decide({ state: { ...empty, previous } }).outcome, 'apply', 'same verified store state can rebuild a missing Free projection');
  assert.equal(decide({ state: { ...empty, previous: { ...previous, snapshotHash: 'b'.repeat(64) } } }).code, 'snapshot_conflict');
  assert.equal(decide({ state: { ...empty, previous: { storeObservedAt: snapshot.verifiedAt, snapshotHash: 'b'.repeat(64) } } }).code, 'stale');
  const other = { ownerId: context.authenticatedOwnerId, origin: 'google_play' as const, environment: 'sandbox' as const,
    providerSubscriptionRef: 'other-chain', entitlementStatus: 'active' as const, entitlementEndsAt: snapshot.currentPeriodEndsAt };
  assert.equal(decide({ state: { ...empty, subscriptions: [other] } }).code, 'subscription_conflict');
  assert.equal(decide({ state: { ...empty, receipt: heldReceipt, subscriptions: [other] } }).appendDecision, false, 'unchanged hold does not duplicate audit decisions');
  assert.equal(decide({ state: { ...empty, subscriptions: [{ ...other, origin: 'apple_app_store' }] } }).code, 'subscription_conflict');
  assert.equal(decide({ state: { ...empty, subscriptions: [{ ...other, entitlementStatus: 'unknown' }] } }).code, 'policy_review_required');
  assert.equal(decide({ state: { ...empty, subscriptions: [{ ...other, entitlementEndsAt: '2026-10-19T00:00:00.000Z' }] } }).outcome, 'apply');
  const google = { ...snapshot, origin: 'google_play' as const, basePlanId: 'monthly' };
  assert.equal(decide({ snapshot: google, mapping: { ...mapping, origin: 'google_play', basePlanId: 'monthly' } }).outcome, 'apply');

  const request = { schemaVersion: 1, store: 'apple_app_store', productId: snapshot.productId, opaqueVerificationPayload: 'fixture-proof' };
  const calls: string[] = []; let current = snapshot; let owner: NativeStoreVerificationContext | null = context; let clock = now;
  const adapter: NativeStoreVerificationAdapter = { origin: 'apple_app_store', environment: 'sandbox',
    verifyPurchase: async () => { calls.push('verify'); return { ok: true, value: snapshot }; },
    querySubscription: async () => { calls.push('query'); return { ok: true, value: current }; } };
  const memory = memoryRepository();
  const service = createNativeReconciliationService({ authenticateOwner: async () => owner, adapter, repository: memory.repository, now: () => clock });
  assert.equal((await service({ ...request, ownerId: 'forged' })).code, 'invalid_request'); assert.equal(calls.length, 0);
  owner = null; assert.equal((await service(request)).code, 'authentication_required'); owner = context; assert.equal(calls.length, 0);
  const races = await Promise.all(Array.from({ length: 8 }, () => service(request)));
  assert.equal(races.filter(value => value.outcome === 'applied').length, 1);
  assert.equal(races.filter(value => value.code === 'duplicate').length, 7);
  assert.equal(memory.writes, 1); assert.equal(memory.records, 1);
  assert.equal(calls.filter(call => call === 'verify').length, 8); assert.equal(calls.filter(call => call === 'query').length, 8);
  current = { ...snapshot, status: 'refunded', snapshotHash: 'b'.repeat(64), storeObservedAt: snapshot.verifiedAt };
  assert.equal((await service(request)).outcome, 'applied'); assert.equal(memory.projection?.entitlementStatus, 'inactive');
  current = { ...snapshot, snapshotHash: 'c'.repeat(64) };
  assert.equal((await service(request)).code, 'stale'); assert.equal(memory.projection?.entitlementStatus, 'inactive', 'old purchase cannot resurrect a refund');
  current = { ...snapshot, productId: 'fixture.current.unmapped', snapshotHash: 'd'.repeat(64) };
  assert.equal((await service(request)).code, 'mapping_unavailable', 'current product, not original receipt product, drives mapping');
  for (const changes of [{ ownerId: 'other-owner' }, { providerSubscriptionRef: 'other-chain' }, { environment: 'production' as const }]) {
    current = { ...snapshot, ...changes };
    assert.equal((await service(request)).code, 'snapshot_invalid'); assert.equal(memory.writes, 2);
  }
  const failed = memoryRepository(); failed.failApply(true); current = snapshot;
  const retry = createNativeReconciliationService({ authenticateOwner: async () => context, adapter, repository: failed.repository, now: () => clock });
  const error = await retry(request); assert.equal(error.code, 'repository_unavailable'); assert.equal(failed.records, 0); assert.equal(failed.writes, 0);
  assert.ok(!JSON.stringify(error).includes('private-db-detail')); failed.failApply(false);
  assert.equal((await retry(request)).outcome, 'applied', 'rollback must leave retry able to apply');
  const held = memoryRepository(); held.subscriptions([other]);
  const resume = createNativeReconciliationService({ authenticateOwner: async () => context, adapter, repository: held.repository, now: () => now });
  assert.equal((await resume(request)).code, 'subscription_conflict'); assert.equal(held.writes, 0);
  assert.equal((await resume(request)).code, 'subscription_conflict'); assert.equal(held.records, 1);
  held.subscriptions([]); assert.equal((await resume(request)).outcome, 'applied'); assert.equal(held.writes, 1); assert.equal(held.records, 2);
  const committed = memoryRepository(); let responseLost = true;
  const uncertain = createNativeReconciliationService({ authenticateOwner: async () => context, adapter,
    repository: { async withOwnerTransaction(ownerId, work) {
      const result = await committed.repository.withOwnerTransaction(ownerId, work);
      if (responseLost) { responseLost = false; throw new Error('commit-response-lost'); } return result;
    } }, now: () => now });
  assert.equal((await uncertain(request)).code, 'repository_unavailable'); assert.equal(committed.writes, 1);
  assert.equal((await uncertain(request)).code, 'duplicate'); assert.equal(committed.writes, 1, 'ambiguous commit is safe to replay');
  committed.clearProjection();
  current = { ...snapshot, storeObservedAt: snapshot.verifiedAt };
  assert.equal((await uncertain(request)).outcome, 'applied', 'a fresh authoritative restore rebuilds the cleared projection');
  assert.equal(committed.writes, 2); current = snapshot;
  const delayed = memoryRepository(); delayed.beforeRead(() => { clock += NATIVE_RECONCILIATION_FRESHNESS_MS; });
  const afterLock = createNativeReconciliationService({ authenticateOwner: async () => context, adapter, repository: delayed.repository, now: () => clock });
  assert.equal((await afterLock(request)).code, 'snapshot_invalid'); assert.equal(delayed.writes, 0); clock = now;
  const unavailable = createNativeReconciliationService({ authenticateOwner: async () => context,
    adapter: { ...adapter, verifyPurchase: async () => { throw new Error('private-receipt'); } }, repository: memory.repository, now: () => now });
  assert.deepEqual(await unavailable(request), { outcome: 'unavailable', code: 'verification_unavailable' });
  const denied = createNativeReconciliationService({ authenticateOwner: async () => context,
    adapter: { ...adapter, querySubscription: async () => ({ ok: false, error: { code: 'timeout', retryable: true, correlationId: null } }) }, repository: memory.repository, now: () => now });
  assert.deepEqual(await denied(request), { outcome: 'unavailable', code: 'current_state_unavailable' });
  {
    let deadline = () => {}; let resolveProof!: (value: Awaited<ReturnType<NativeStoreVerificationAdapter['verifyPurchase']>>) => void;
    const pending = new Promise<Awaited<ReturnType<NativeStoreVerificationAdapter['verifyPurchase']>>>(resolve => { resolveProof = resolve; });
    const late = memoryRepository(); let queried = false;
    const timed = createNativeReconciliationService({ authenticateOwner: async () => context,
      adapter: { ...adapter, verifyPurchase: () => pending, querySubscription: async () => { queried = true; return { ok: true, value: snapshot }; } },
      repository: late.repository, now: () => now, scheduleDeadline: callback => { deadline = callback; return () => {}; } });
    const result = timed(request); await new Promise<void>(resolve => setImmediate(resolve)); deadline();
    assert.equal((await result).code, 'verification_unavailable'); resolveProof({ ok: true, value: snapshot });
    await new Promise<void>(resolve => setImmediate(resolve)); assert.equal(queried, false); assert.equal(late.writes, 0);
  }
  assert.equal(existsSync('app/api/subscription/reconcile/route.ts'), false);
  assert.equal(existsSync('lib/subscription/entitlement-projection-writer.ts'), false);
  assert.match(readFileSync('lib/subscription/native-reconciliation.server.ts', 'utf8'), /import 'server-only'/);
  assert.doesNotMatch(readFileSync('lib/subscription/native-reconciliation-decision.ts', 'utf8'), /@capacitor|window\.|document\.|supabase|fetch\(/i);
  console.log('PASS native reconciliation decisions and private orchestration: lifecycle, owner/mapping denials, current query, parallel dedupe, refund replay, lock freshness, atomic rollback and safe failures; memory repository only');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
