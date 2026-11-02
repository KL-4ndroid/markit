import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { beginDeletionUploadSession } from '../../lib/subscription/account-deletion-upload-barrier.server';
import { createUploadReconciliationPort, type PreparedUploadReview, type UploadDrainPort } from '../../lib/subscription/account-deletion-upload-reconciliation.server';
import { quoteSql as q } from './account-deletion-catalog-fixture';

type Request = { id: string; actor: string; token: string; kind: string };
type Client = { rpc(name: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { code?: string } | null }> };
type Fixture = {
  sql(s: string): string; denied(s: string, code?: string): void; client: Client;
  whileLocked(leaderSql: string, follower: () => void): Promise<void>;
  insert(name: string, row: Record<string, unknown>): void;
  request(actor: string): Request; step(r: Request, step: string): void; call(r: Request, step: string, action?: string): string;
  starts: { id: string; token: string; owner: string }[];
  owner: string; other: string; staff: string; product: string; otherProduct: string;
  legacy: string; legacyProduct: string; market: string; sale: string; oldA: string; oldB: string; newId: string;
};

export async function checkUploadReconciliation(f: Fixture) {
  const { sql, denied, client } = f, checks: string[] = [];
  const pass = (s: string) => { checks.push(s); console.log('PASS ' + s); };
  const hash = 'a'.repeat(64), endpoint = 'http://127.0.0.1:54321';
  let drained = true, lost = false, objectReads = 0;
  // Explicit fixture attestation, not a provider/runtime drain implementation.
  const drain: UploadDrainPort = {
    async verify(scope) { assert.ok(drained, 'Injected transport still active'); return { scopeHash: scope.sourceHash, evidenceHash: hash, expiresAt: new Date(Date.now() + 60000).toISOString() }; },
    async assertStillDrained() { assert.ok(drained, 'Injected drain barrier lost'); },
  };
  const present = new Set([f.oldA, f.oldB]);
  const objects = { async isAbsent(key: string) { objectReads++; return !present.has(key); } };
  const factory = (c = client, d = drain, o = objects) => createUploadReconciliationPort({ endpoint, client: c, drain: d, objects: o, reviewerHash: hash });
  const reviewArgs = (r: Request, id: string) => ({ requestId: r.id, leaseToken: r.token, attemptId: id });
  const prepare = async (r: Request, id: string) => { const out = await factory().prepare(reviewArgs(r, id)); assert.ok('identity' in out); return out as PreparedUploadReview; };
  const raw = (r: Request, id: string, action: string, evidence: unknown = null, role = '') => `${role}SELECT bff_reconcile_deletion_upload('${r.id}','${r.token}','${id}',${q(action)},${evidence === null ? 'NULL' : q(JSON.stringify(evidence)) + '::jsonb'});`;

  const s = await beginDeletionUploadSession(client, f.owner, f.owner), original = f.starts.at(-1)!;
  sql(`SELECT claim_product_cover_photo_upload('${f.owner}','${f.product}','${f.newId}',2::bigint,15,1000000,false);`);
  const a = `product-cover-photos/${f.owner}/${f.product}/${f.newId}/v2/display.webp`, b = a.replace('display', 'thumbnail');
  await s.bind({ kind: 'product', entityId: f.product, keys: [a, b, f.oldA, f.oldB], writeKeys: [a, b], expected: { photoId: f.newId, version: 2 } });
  await assert.rejects(() => s.put(a, async () => { present.add(a); throw Error('Injected response lost after write'); })); await s.finish();
  const ownerRequest = f.request(f.owner);
  denied(raw(ownerRequest, original.id, 'inspect'), '55000');
  f.step(ownerRequest, 'access_frozen');
  denied(raw(ownerRequest, original.id, 'inspect'), '55000');
  f.step(ownerRequest, 'staff_access_revoked');
  denied(raw({ ...ownerRequest, token: randomUUID() }, original.id, 'inspect'), '55000');
  denied(`SELECT deletion_engine_private.assert_uploads_quiescent('${f.owner}');`, '55000');
  pass('recovery requires exact live deletion lease, matching freeze and completed freeze/revoke steps; uncertain cleanup remains held');

  drained = false; const readsBefore = objectReads;
  await assert.rejects(() => prepare(ownerRequest, original.id)); assert.equal(objectReads, readsBefore);
  drained = true;
  const wrong = factory(client, { ...drain, async verify(scope) { return { ...await drain.verify(scope), scopeHash: 'b'.repeat(64) }; } });
  await assert.rejects(() => wrong.prepare(reviewArgs(ownerRequest, original.id)));
  const unreadable = factory(client, drain, { async isAbsent() { throw Error('Injected 403/timeout; not absence'); } });
  await assert.rejects(() => unreadable.prepare(reviewArgs(ownerRequest, original.id)));
  assert.equal(sql('SELECT count(*) FROM deletion_upload_private.reviews;'), '0');
  pass('active transport, wrong drain scope and unreadable objects cannot create a recovery receipt');

  const prepared = await prepare(ownerRequest, original.id);
  for (const evidence of [
    { ...prepared.evidence, expiresAt: new Date(Date.now() - 10000).toISOString() },
    { ...prepared.evidence, sourceHash: 'b'.repeat(64) },
    { ...prepared.evidence, observations: prepared.evidence.observations.slice(1) },
    { ...prepared.evidence, observations: prepared.evidence.observations.map((o, i) => i === 0 ? { ...o, state: 'unavailable' } : o) },
    { ...prepared.evidence, observations: prepared.evidence.observations.map(() => prepared.evidence.observations[0]) },
    { ...prepared.evidence, observations: prepared.evidence.observations.map((o, i) => i === 0 ? { ...o, key: a.replace(f.owner, f.other) } : o) },
  ]) denied(raw(ownerRequest, original.id, 'commit', evidence));
  assert.equal(sql(`SELECT state FROM deletion_upload_private.attempts WHERE id='${original.id}';`), 'uncertain');
  pass('expired evidence, stale source, missing/duplicate/cross-owner keys and unknown object states roll back without release');

  // Controlled fixture drift, not a bypass in a product worker. Restore trigger config
  // in the same transaction so the access catalog continues to attest real guards.
  sql(`BEGIN;ALTER TABLE product_cover_photos DISABLE TRIGGER USER;UPDATE product_cover_photos SET updated_at=clock_timestamp() WHERE product_id='${f.product}';ALTER TABLE product_cover_photos ENABLE TRIGGER USER;COMMIT;`);
  denied(raw(ownerRequest, original.id, 'commit', prepared.evidence), '55000');
  const current = await prepare(ownerRequest, original.id);
  const metadataBefore = sql(`SELECT row_to_json(p) FROM product_cover_photos p WHERE product_id='${f.product}';`);
  const presentBefore = [...present].sort(), photoCountBefore = sql('SELECT count(*) FROM product_cover_photos;');
  const lossyClient: Client = { async rpc(name, args) { const result = await client.rpc(name, args); if (args.p_action === 'commit' && !lost && !result.error) { lost = true; return { data: null, error: { code: 'network' } }; } return result; } };
  const lossy = factory(lossyClient); await assert.rejects(() => lossy.commit(current));
  const receipt = await lossy.commit(current); assert.equal(receipt.outcome, 'reconciled');
  assert.equal(sql('SELECT count(*) FROM deletion_upload_private.reviews;'), '1');
  denied(raw(ownerRequest, original.id, 'commit', { ...current.evidence, drainHash: 'c'.repeat(64) }), '55000');
  assert.equal(sql(`SELECT row_to_json(p) FROM product_cover_photos p WHERE product_id='${f.product}';`), metadataBefore);
  assert.equal(sql('SELECT count(*) FROM product_cover_photos;'), photoCountBefore); assert.deepEqual([...present].sort(), presentBefore);
  denied(`SELECT bff_finish_deletion_upload('${original.id}','${original.token}','uncertain');`, '55000');
  denied(`UPDATE deletion_upload_private.reviews SET drain_hash='${hash}';`, '55000');
  pass('metadata CAS rejects drift; lost commit acknowledgement replays one immutable receipt, preserving photos/metadata and rejecting conflicting or stale writer completion');

  f.step(ownerRequest, 'object_manifest_built');
  assert.equal(sql(`SELECT count(*) FROM deletion_engine_private.objects WHERE request_id='${ownerRequest.id}';`), '4');
  assert.equal(sql(`SELECT present_count||','||absent_count FROM deletion_upload_private.reviews WHERE attempt_id='${original.id}';`), '3,1');
  pass('normal manifest resumes with all four old/new keys; present/missing observations are evidence, never object deletion or metadata repair');

  const staffSession = await beginDeletionUploadSession(client, f.staff, f.other), stAttempt = f.starts.at(-1)!;
  const uploadId = randomUUID();
  const evidence = JSON.parse(sql(`SELECT to_jsonb(bff_claim_sale_photo_evidence_upload('${f.staff}','${f.other}','${f.market}','${f.sale}',NULL,'${uploadId}',clock_timestamp()));`));
  const sa = `sales-evidence/7d/${f.other}/staff-review.webp`, sb = `sales-evidence-thumbs/7d/${f.other}/staff-review.webp`;
  await staffSession.bind({ kind: 'sale', entityId: evidence.id, keys: [sa, sb], writeKeys: [sa, sb], expected: { attemptId: uploadId } });
  await staffSession.put(sa, async () => { present.add(sa); return true; });
  await assert.rejects(() => staffSession.put(sb, async () => { throw Error('Injected thumbnail outcome unknown; first object compensation failed'); }));
  sql(`SELECT bff_mark_sale_photo_evidence_upload_failed('${f.staff}','${evidence.id}','${f.other}','${f.market}','${f.sale}','${uploadId}','r2_thumbnail_upload_failed');`);
  const failureMetadataBefore = sql(`SELECT row_to_json(p) FROM sale_photo_evidence p WHERE id='${evidence.id}';`);
  const staffRequest = f.request(f.staff); f.step(staffRequest, 'access_frozen'); f.step(staffRequest, 'staff_access_revoked');
  denied(raw(staffRequest, stAttempt.id, 'inspect'), '55P03');
  sql(`UPDATE deletion_upload_private.attempts SET deadline=clock_timestamp()-interval '1 second' WHERE id='${stAttempt.id}';`);
  drained = false; await assert.rejects(() => prepare(staffRequest, stAttempt.id));
  drained = true; const staffPrepared = await prepare(staffRequest, stAttempt.id);
  // Owner request must not attest a staff upload into another brand.
  denied(raw(ownerRequest, stAttempt.id, 'inspect'), '55000');
  await factory().commit(staffPrepared);
  assert.equal(sql(`SELECT row_to_json(p) FROM sale_photo_evidence p WHERE id='${evidence.id}';`), failureMetadataBefore);
  assert.ok(present.has(sa));
  for (const step of ['staff_attribution_anonymized', 'operational_data_cleaned', 'profile_deleted']) f.step(staffRequest, step);
  assert.equal(sql(`SELECT count(*) FROM deletion_upload_private.attempts WHERE id='${stAttempt.id}' AND owner_id='${f.other}' AND actor_id IS NULL AND ${q(sa)}=ANY(keys);`), '1');
  assert.equal(sql(`SELECT count(*) FROM deletion_upload_private.reviews WHERE attempt_id='${stAttempt.id}';`), '1');
  pass('captured failure metadata with incomplete compensation stays intact; expired open still needs drain proof; staff recovery retains other-brand keys/receipt and removes actor attribution');

  const concurrent = await beginDeletionUploadSession(client, f.other, f.other), concurrentId = f.starts.at(-1)!;
  const cp = randomUUID(), ca = `product-cover-photos/${f.other}/${f.otherProduct}/${cp}/v1/display.webp`, cb = ca.replace('display', 'thumbnail');
  sql(`SELECT claim_product_cover_photo_upload('${f.other}','${f.otherProduct}','${cp}',1::bigint,15,1000000,false);`);
  await concurrent.bind({ kind: 'product', entityId: f.otherProduct, keys: [ca, cb, ca, cb], writeKeys: [ca, cb], expected: { photoId: cp, version: 1 } });
  // Real captured finalize commits, but its caller treats the response as lost.
  sql(`SELECT finalize_product_cover_photo_upload('${f.other}','${f.otherProduct}','${cp}',1::bigint,${q(ca)},${q(cb)},'${hash}','${hash}','image/webp','image/webp',10,5,1,1,false);`);
  present.add(ca); present.add(cb);
  concurrent.uncertain(); await concurrent.finish();
  const cr = f.request(f.other); f.step(cr, 'access_frozen'); f.step(cr, 'staff_access_revoked');
  const concurrentPrepared = await prepare(cr, concurrentId.id), originalLease = sql(`SELECT lease_expires_at FROM account_deletion_requests WHERE id='${cr.id}';`);
  assert.equal(concurrentPrepared.evidence.observations.length, 2);
  const publishedBefore = sql(`SELECT row_to_json(p) FROM product_cover_photos p WHERE product_id='${f.otherProduct}';`);
  const holdPair = `BEGIN;SELECT deletion_upload_private.lock_pair('${f.other}','${f.other}');SELECT 'REVIEW_LOCK_HELD';SELECT pg_sleep(1.3);COMMIT;`;
  sql(`UPDATE account_deletion_requests SET lease_expires_at=clock_timestamp()+interval '0.8 seconds' WHERE id='${cr.id}';`);
  await f.whileLocked(holdPair, () => denied(raw(cr, concurrentId.id, 'commit', concurrentPrepared.evidence), '55000'));
  sql(`UPDATE account_deletion_requests SET lease_expires_at=${q(originalLease)}::timestamptz WHERE id='${cr.id}';`);
  const shortProof = { ...concurrentPrepared.evidence, expiresAt: new Date(Date.now() + 800).toISOString() };
  await f.whileLocked(holdPair, () => denied(raw(cr, concurrentId.id, 'commit', shortProof), '55000'));
  assert.equal(sql(`SELECT state FROM deletion_upload_private.attempts WHERE id='${concurrentId.id}';`), 'uncertain');
  pass('two-session lock waits recheck DB-clock deletion lease and proof expiry; neither expired case releases the attempt');
  const commitSql = raw(cr, concurrentId.id, 'commit', concurrentPrepared.evidence);
  await f.whileLocked(`BEGIN;${commitSql}SELECT 'REVIEW_LOCK_HELD';SELECT pg_sleep(0.5);COMMIT;`,
    () => denied(raw(cr, concurrentId.id, 'commit', { ...concurrentPrepared.evidence, reviewerHash: 'b'.repeat(64) }), '55000'));
  assert.equal(sql(`SELECT count(*) FROM deletion_upload_private.reviews WHERE attempt_id='${concurrentId.id}';`), '1');
  assert.equal(sql(`SELECT state FROM deletion_upload_private.attempts WHERE id='${concurrentId.id}';`), 'settled');
  assert.equal(sql(`SELECT row_to_json(p) FROM product_cover_photos p WHERE product_id='${f.otherProduct}';`), publishedBefore);
  assert.ok(present.has(ca) && present.has(cb));
  pass('captured finalize success with lost response preserves published metadata/photos; concurrent reviewers produce one receipt and reject conflicting evidence');

  await beginDeletionUploadSession(client, f.legacy, f.legacy); const unbound = f.starts.at(-1)!;
  const legacyRequest = f.request(f.legacy); f.step(legacyRequest, 'access_frozen'); f.step(legacyRequest, 'staff_access_revoked');
  sql(`UPDATE deletion_upload_private.attempts SET deadline=clock_timestamp()-interval '1 second' WHERE id='${unbound.id}';`);
  denied(raw(legacyRequest, unbound.id, 'inspect'), '55000');
  for (const role of ['anon', 'authenticated']) denied(raw(legacyRequest, unbound.id, 'inspect', null, `SET ROLE ${role};`), '42501');
  denied('SET ROLE service_role;SELECT * FROM deletion_upload_private.reviews;', '42501');
  denied(`SELECT deletion_engine_private.assert_uploads_quiescent('${f.legacy}');`, '55000');
  pass('unbound/legacy outcomes stay held; client roles cannot reconcile and service cannot read private review records');

  // Live lease expires while external verification runs: no receipt/state change.
  sql(`UPDATE account_deletion_requests SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE id='${legacyRequest.id}';`);
  denied(raw(legacyRequest, unbound.id, 'inspect'), '55000');
  pass('expired deletion lease cannot inspect/release an attempt; formal cleanup remains disabled');
  mkdirSync('.codex-artifacts', { recursive: true });
  writeFileSync('.codex-artifacts/account-deletion-upload-reconciliation-acceptance.json', JSON.stringify({
    at: new Date().toISOString(), checks,
    scope: 'captured isolated PostgreSQL + real reconciliation/session ports; fixture terminal-drain attestor and object observations, no cloud/Auth/R2 writes',
    productionEnabled: false, productionDrainAttestorImplemented: false,
  }, null, 2));
  console.log(`PASS upload reconciliation (${checks.length} groups)`);
}
