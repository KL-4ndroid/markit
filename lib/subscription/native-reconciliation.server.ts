import 'server-only';
import { createHash } from 'node:crypto';
import type { NativeStoreVerificationAdapter, NativeStoreVerificationContext, VerifiedNativeStoreSubscription } from './native-store-verification-contract';
import { isValidNativeStoreVerificationContext, parseNativeStoreVerificationRequest } from './native-store-verification-contract';
import {
  decideNativeReconciliation, validateNativeReconciliationSnapshot,
  type NativeReconciliationCode, type NativeReconciliationDecision, type NativeReconciliationState, type ReconciliationMapping,
} from './native-reconciliation-decision';

export type NativeReconciliationTransaction = {
  readState(snapshot: VerifiedNativeStoreSubscription, reconciliationKey: string): Promise<NativeReconciliationState>;
  readMapping(snapshot: VerifiedNativeStoreSubscription): Promise<ReconciliationMapping | null>;
  recordDecision(input: Readonly<{
    reconciliationKey: string; snapshot: VerifiedNativeStoreSubscription; decision: NativeReconciliationDecision;
  }>): Promise<void>;
  /** Persist the winning normalized subscription snapshot and billing projection;
   * enforce binding uniqueness and protect admin/promotion again at the DB boundary. */
  applyBillingProjection(input: Readonly<{
    snapshot: VerifiedNativeStoreSubscription; decision: NativeReconciliationDecision;
  }>): Promise<void>;
};
export type NativeReconciliationRepository = {
  /** Serialize owner, enforce globally unique provider binding, and commit/rollback ALL effects atomically.
   * Resolve only after commit; an ambiguous commit must reject and be safely replayable.
   * Decision audit is append-only, deduplicated by key/code; held decisions can
   * later receive a corrective-forward outcome under the same key. Only an
   * applied projection is terminal for that key. No concrete DB/RPC is installed. */
  withOwnerTransaction<T>(ownerId: string, work: (transaction: NativeReconciliationTransaction) => Promise<T>): Promise<T>;
};
export type NativeReconciliationResult = Readonly<{
  outcome: 'applied' | 'unchanged' | 'review_required' | 'rejected' | 'unavailable';
  code: NativeReconciliationCode | 'invalid_request' | 'authentication_required' | 'configuration_unavailable'
    | 'verification_unavailable' | 'current_state_unavailable' | 'repository_unavailable';
}>;

/** Private server orchestration, intentionally unconnected to routes and production repositories. */
export function createNativeReconciliationService(dependencies: {
  authenticateOwner(): Promise<NativeStoreVerificationContext | null>;
  adapter: NativeStoreVerificationAdapter;
  repository: NativeReconciliationRepository;
  now(): number;
  scheduleDeadline?: (callback: () => void, milliseconds: number) => () => void;
}) {
  const schedule = dependencies.scheduleDeadline ?? ((callback, milliseconds) => {
    const timer = setTimeout(callback, milliseconds); return () => clearTimeout(timer);
  });
  async function bounded<T>(action: () => Promise<T>): Promise<T> {
    let cancel = () => {};
    try {
      return await Promise.race([Promise.resolve().then(action), new Promise<never>((_, reject) => {
        cancel = schedule(() => reject(new Error('provider_deadline')), 10_000);
      })]);
    } finally { cancel(); }
  }
  return async (untrustedRequest: unknown): Promise<NativeReconciliationResult> => {
    const parsed = parseNativeStoreVerificationRequest(untrustedRequest);
    if (!parsed.ok) return { outcome: 'rejected', code: 'invalid_request' };
    let context: NativeStoreVerificationContext | null;
    try { context = await dependencies.authenticateOwner(); } catch { context = null; }
    if (!context || !isValidNativeStoreVerificationContext(context)) return { outcome: 'rejected', code: 'authentication_required' };
    context = Object.freeze({ ...context });
    const { adapter } = dependencies;
    if (adapter.origin !== parsed.value.store || adapter.environment !== context.environment) return { outcome: 'unavailable', code: 'configuration_unavailable' };
    try {
      const proof = await bounded(() => adapter.verifyPurchase({ context, request: parsed.value }));
      if (!proof?.ok) return { outcome: 'unavailable', code: 'verification_unavailable' };
      if (!validateNativeReconciliationSnapshot(proof.value, context, dependencies.now(), false)
        || proof.value.origin !== adapter.origin || proof.value.productId !== parsed.value.productId) {
        return { outcome: 'rejected', code: 'snapshot_invalid' };
      }
      // Receipt delivery can be late. Only the authoritative CURRENT subscription can drive a projection.
      let current: Awaited<ReturnType<NativeStoreVerificationAdapter['querySubscription']>>;
      try {
        current = await bounded(() => adapter.querySubscription({ context, origin: adapter.origin,
          providerSubscriptionRef: proof.value.providerSubscriptionRef }));
      } catch { return { outcome: 'unavailable', code: 'current_state_unavailable' }; }
      if (!current?.ok) return { outcome: 'unavailable', code: 'current_state_unavailable' };
      const nowMs = dependencies.now();
      if (!validateNativeReconciliationSnapshot(current.value, context, nowMs) || current.value.origin !== adapter.origin
        || current.value.providerSubscriptionRef !== proof.value.providerSubscriptionRef) return { outcome: 'rejected', code: 'snapshot_invalid' };
      const snapshot = Object.freeze({ ...current.value });
      const key = createHash('sha256').update(JSON.stringify([
        snapshot.ownerId, snapshot.origin, snapshot.environment, snapshot.providerSubscriptionRef,
        snapshot.storeObservedAt, snapshot.snapshotHash,
      ])).digest('hex');
      try {
        return await dependencies.repository.withOwnerTransaction(context.authenticatedOwnerId, async transaction => {
          const state = await transaction.readState(snapshot, key);
          const mapping = await transaction.readMapping(snapshot);
          // Time spent waiting for the owner lock must not extend verification freshness.
          const decision = decideNativeReconciliation({ context, snapshot, mapping, state, nowMs: dependencies.now() });
          if (decision.appendDecision) await transaction.recordDecision({ reconciliationKey: key, snapshot, decision });
          if (decision.outcome === 'apply') await transaction.applyBillingProjection({ snapshot, decision });
          return { outcome: decision.outcome === 'apply' ? 'applied' : decision.outcome === 'reject' ? 'rejected' : decision.outcome,
            code: decision.code } as NativeReconciliationResult;
        });
      } catch { return { outcome: 'unavailable', code: 'repository_unavailable' }; }
    } catch { return { outcome: 'unavailable', code: 'verification_unavailable' }; }
  };
}
