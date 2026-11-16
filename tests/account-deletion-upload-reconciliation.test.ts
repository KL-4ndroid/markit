import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createUploadReconciliationPort, type UploadDrainPort, type UploadReviewScope } from '../lib/subscription/account-deletion-upload-reconciliation.server';
import { DeletionEngineFailure } from '../lib/subscription/account-deletion-engine.server';

async function main() {
  const owner = randomUUID(), attemptId = randomUUID(), entity = randomUUID(), photo = randomUUID();
  const identity = { requestId: randomUUID(), leaseToken: randomUUID(), attemptId };
  const a = `product-cover-photos/${owner}/${entity}/${photo}/v1/display.webp`, b = a.replace('display', 'thumbnail');
  const hash = 'a'.repeat(64), calls: string[] = [];
  let now = Date.now(), reads = 0, mode = 'valid', lostAck = false, committed = false;
  const scope: UploadReviewScope = { outcome: 'review_required', attemptId, ownerId: owner, actorId: owner, sourceHash: hash, keys: [a, b], issuedKeys: [a] };
  const payloads: unknown[] = [];
  const client = { async rpc(_name: string, args: Record<string, unknown>) {
    calls.push(String(args.p_action));
    if (args.p_action === 'commit') {
      committed = true; payloads.push(args.p_evidence);
      if (lostAck) { lostAck = false; return { data: null, error: { code: 'network' } }; }
      return { data: { outcome: 'reconciled', evidenceHash: hash }, error: null };
    }
    if (mode === 'already') return { data: { outcome: 'reconciled', evidenceHash: hash }, error: null };
    if (mode === 'duplicate') return { data: { ...scope, keys: [a, a] }, error: null };
    if (mode === 'foreign') return { data: { ...scope, keys: [a.replace(owner, randomUUID()), b] }, error: null };
    if (mode === 'issued') return { data: { ...scope, issuedKeys: ['unknown'] }, error: null };
    if (mode === 'wrong_attempt') return { data: { ...scope, attemptId: randomUUID() }, error: null };
    return { data: scope, error: null };
  } };
  const drain: UploadDrainPort = {
    async verify(value) {
      assert.ok(Object.isFrozen(value) && Object.isFrozen(value.keys));
      if (mode === 'active') throw Error('Sensitive provider response');
      return { scopeHash: mode === 'wrong_proof' ? 'b'.repeat(64) : hash, evidenceHash: hash, expiresAt: new Date(now + (mode === 'expired' ? -1 : mode === 'future' ? 121000 : 1000)).toISOString() };
    },
    async assertStillDrained() { if (mode === 'lost_drain') throw Error('Sensitive transport response'); },
  };
  const objects = { async isAbsent(key: string) {
    reads++;
    if (mode === 'unreadable') throw Error('Sensitive 403/timeout response');
    if (mode === 'slow') now += 1000;
    return key === b;
  } };
  const input = { endpoint: 'http://127.0.0.1:54321', client, drain, objects, reviewerHash: hash, now: () => now };
  assert.throws(() => createUploadReconciliationPort({ ...input, endpoint: 'https://real.supabase.co' }));
  assert.throws(() => createUploadReconciliationPort({ ...input, reviewerHash: 'email@example.test' }));
  const port = createUploadReconciliationPort(input);
  await assert.rejects(() => port.prepare({ ...identity, attemptId: 'invalid' })); assert.equal(calls.length, 0);
  for (mode of ['duplicate', 'foreign', 'issued', 'wrong_attempt', 'active', 'wrong_proof', 'expired', 'future', 'unreadable', 'slow', 'lost_drain']) {
    await assert.rejects(() => port.prepare(identity), error => error instanceof DeletionEngineFailure && !error.message.includes('Sensitive'));
    assert.equal(committed, false);
  }
  mode = 'valid';
  const prepared = await port.prepare(identity); assert.ok('identity' in prepared);
  assert.ok(Object.isFrozen(prepared) && Object.isFrozen(prepared.evidence) && Object.isFrozen(prepared.evidence.observations));
  assert.deepEqual(prepared.evidence.observations, [{ key: a, state: 'present' }, { key: b, state: 'absent' }]);
  lostAck = true; await assert.rejects(() => port.commit(prepared));
  assert.deepEqual(await port.commit(prepared), { outcome: 'reconciled', evidenceHash: hash });
  assert.equal(payloads[0], payloads[1]);
  mode = 'already'; const previousReads = reads;
  assert.deepEqual(await port.prepare(identity), { outcome: 'reconciled', evidenceHash: hash }); assert.equal(reads, previousReads);
  console.log('PASS local-only review, immutable exact scope, authoritative drain/expiry holds, unknown object errors, preserved evidence retry and receipt readback');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
