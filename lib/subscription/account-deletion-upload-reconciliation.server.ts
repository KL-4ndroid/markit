import { requireIsolatedEndpoint } from './account-deletion-engine-adapters.server';
import { DeletionEngineFailure, isOwnedDeletionObjectKey, type DeletionObjectPort } from './account-deletion-engine.server';

type Rpc = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: string } | null }> };
export type UploadReviewIdentity = Readonly<{ requestId: string; leaseToken: string; attemptId: string }>;
export type UploadReviewScope = Readonly<{
  outcome: 'review_required'; attemptId: string; ownerId: string; actorId: string;
  sourceHash: string; keys: readonly string[]; issuedKeys: readonly string[];
}>;
export type UploadDrainProof = Readonly<{ scopeHash: string; evidenceHash: string; expiresAt: string }>;
export type UploadDrainPort = {
  /** Authoritative terminal transport/provider drain for ALL issued tickets in this scope.
   * Process exit, an aborted request, lease expiry or an in-memory counter is insufficient.
   * The producer must remain unable to write after the proof; no production adapter exists yet. */
  verify(scope: UploadReviewScope): Promise<UploadDrainProof>;
  assertStillDrained(scope: UploadReviewScope, proof: UploadDrainProof): Promise<void>;
};
type Evidence = Readonly<{
  sourceHash: string; drainHash: string; reviewerHash: string; expiresAt: string;
  observations: readonly Readonly<{ key: string; state: 'present' | 'absent' }>[];
}>;
export type PreparedUploadReview = Readonly<{ identity: UploadReviewIdentity; evidence: Evidence }>;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
function stop(code: string): never { throw new DeletionEngineFailure('manual_review', code); }

/** Explicit local worker, no env/default credentials, route, auto-retry or object writes. */
export function createUploadReconciliationPort(input: {
  endpoint: string; client: Rpc; drain: UploadDrainPort;
  objects: Pick<DeletionObjectPort, 'isAbsent'>; reviewerHash: string; now?: () => number;
}) {
  requireIsolatedEndpoint(input.endpoint);
  if (!HASH.test(input.reviewerHash)) stop('upload_review_reviewer_invalid');
  const now = input.now ?? Date.now;
  function identity(i: UploadReviewIdentity) {
    if (![i.requestId, i.leaseToken, i.attemptId].every(v => UUID.test(v))) stop('upload_review_identity_invalid');
  }
  function expiry(value: string) {
    const ms = Date.parse(value), t = now();
    if (!Number.isFinite(ms) || ms <= t || ms > t + 120000) stop('upload_review_proof_expired');
  }
  async function rpc(i: UploadReviewIdentity, action: string, evidence: Evidence | null) {
    identity(i);
    let result: Awaited<ReturnType<Rpc['rpc']>>;
    try { result = await input.client.rpc('bff_reconcile_deletion_upload', {
      p_request: i.requestId, p_token: i.leaseToken, p_id: i.attemptId, p_action: action, p_evidence: evidence,
    }); } catch { throw new DeletionEngineFailure('failed_retryable', 'upload_review_database_unavailable'); }
    const { data, error } = result;
    if (error) throw new DeletionEngineFailure(['55000', '22023', '42501'].includes(error.code ?? '') ? 'manual_review' : 'failed_retryable', 'upload_review_database_stopped');
    return data;
  }
  function receipt(value: unknown) {
    if (!record(value) || value.outcome !== 'reconciled' || typeof value.evidenceHash !== 'string' || !HASH.test(value.evidenceHash)) stop('upload_review_receipt_invalid');
    return { outcome: 'reconciled' as const, evidenceHash: value.evidenceHash as string };
  }
  return {
    async prepare(i: UploadReviewIdentity): Promise<PreparedUploadReview | ReturnType<typeof receipt>> {
      try {
      const data = await rpc(i, 'inspect', null);
      if (record(data) && data.outcome === 'reconciled') return receipt(data);
      if (!record(data) || data.outcome !== 'review_required' || data.attemptId !== i.attemptId
        || typeof data.ownerId !== 'string' || !UUID.test(data.ownerId) || typeof data.actorId !== 'string' || !UUID.test(data.actorId)
        || typeof data.sourceHash !== 'string' || !HASH.test(data.sourceHash)
        || !Array.isArray(data.keys) || data.keys.length < 1 || data.keys.length > 8
        || data.keys.some(k => typeof k !== 'string' || !isOwnedDeletionObjectKey(k, data.ownerId as string))
        || new Set(data.keys).size !== data.keys.length || !Array.isArray(data.issuedKeys)
        || data.issuedKeys.some(k => !(data.keys as unknown[]).includes(k))) stop('upload_review_scope_invalid');
      const scope = Object.freeze({ ...data, keys: Object.freeze([...data.keys]), issuedKeys: Object.freeze([...data.issuedKeys]) }) as UploadReviewScope;
      const proof = Object.freeze({ ...await input.drain.verify(scope) });
      if (proof.scopeHash !== scope.sourceHash || !HASH.test(proof.evidenceHash)) stop('upload_review_drain_invalid');
      expiry(proof.expiresAt);
      const observations: { key: string; state: 'present' | 'absent' }[] = [];
      for (const key of scope.keys) {
        const absent = await input.objects.isAbsent(key); // Adapter must propagate 403/timeout/unknown errors.
        if (typeof absent !== 'boolean') stop('upload_review_object_unknown');
        observations.push({ key, state: absent ? 'absent' : 'present' });
      }
      await input.drain.assertStillDrained(scope, proof);
      expiry(proof.expiresAt);
      return Object.freeze({ identity: Object.freeze({ ...i }), evidence: Object.freeze({
        sourceHash: scope.sourceHash, drainHash: proof.evidenceHash, reviewerHash: input.reviewerHash,
        expiresAt: proof.expiresAt, observations: Object.freeze(observations.map(o => Object.freeze(o))),
      }) });
      } catch (error) {
        if (error instanceof DeletionEngineFailure) throw error;
        throw new DeletionEngineFailure('failed_retryable', 'upload_review_dependency_unavailable');
      }
    },
    async commit(prepared: PreparedUploadReview) {
      // Preserve this exact evidence when retrying an acknowledgement loss. DB replay is
      // allowed after expiry only when the original immutable receipt already exists.
      return receipt(await rpc(prepared.identity, 'commit', prepared.evidence));
    },
  };
}
