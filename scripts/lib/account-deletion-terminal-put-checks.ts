import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from 'dotenv';
import { S3Client, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { beginDeletionUploadSession } from '../../lib/subscription/account-deletion-upload-barrier.server';
import { createUploadReconciliationPort, type PreparedUploadReview } from '../../lib/subscription/account-deletion-upload-reconciliation.server';
import { createReceiptBackedUploadDrain, createTerminalPutWriter, terminalPutTargetHash, type TerminalPutTarget } from '../../lib/subscription/account-deletion-terminal-put.server';
import { createDeletionObjectPort } from '../../lib/subscription/account-deletion-engine-adapters.server';
import { createStagingDeletionProbe, DELETION_R2_TEST_BUCKET } from './account-deletion-r2-staging';
import { quoteSql as q } from './account-deletion-catalog-fixture';

type Request = { id: string; actor: string; token: string; kind: string };
type Client = { rpc(n: string, a: Record<string, unknown>): Promise<{ data: unknown; error: { code?: string } | null }> };
type Fixture = {
  sql(s: string): string; denied(s: string, code?: string): void; client: Client;
  insert(t: string, d: Record<string, unknown>, beforeSql?: string): void; request(actor: string): Request; step(r: Request, s: string): void;
  starts: { id: string; token: string; owner: string }[]; owner: string; other: string; legacy: string; market: string; sale: string;
};
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; };
async function bounded(p: Promise<void>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await Promise.race([p, new Promise<never>((_r, reject) => { timer = setTimeout(() => reject(Error('Terminal PUT checkpoint timed out')), 25000); })]); }
  finally { if (timer) clearTimeout(timer); }
}
async function listen(handler: (r: IncomingMessage, s: ServerResponse) => void) {
  const server = createServer(handler); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  return { server, url: `http://127.0.0.1:${address.port}`, async close() { server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); } };
}
export async function checkTerminalPuts(f: Fixture, live: boolean) {
  const { sql, denied, client } = f, checks: string[] = [], pass = (s: string) => { checks.push(s); console.log('PASS ' + s); };
  const runId = randomUUID(), databaseEndpoint = 'http://127.0.0.1:54321', payload = Buffer.from(`disposable terminal PUT ${runId}`);
  const hash = 'a'.repeat(64), objects = new Map<string, Buffer>(), puts = new Map<string, number>();
  const providerAccepted = deferred(), releaseProvider = deferred(), checkpoint = deferred(), releaseProducer = deferred();
  let backend: Awaited<ReturnType<typeof listen>> | undefined, producer: Awaited<ReturnType<typeof listen>> | undefined;
  let target: TerminalPutTarget, credentials: { accessKeyId: string; secretAccessKey: string };
  const attempted = new Set<string>(), absent = new Set<string>(), allKeys: string[] = [], writers: ReturnType<typeof createTerminalPutWriter>[] = [];
  const manifest = `.codex-artifacts/terminal-put-${runId}.manifest.json`;
  const probes = new Map<string, ReturnType<typeof createStagingDeletionProbe>>();
  let sdk: S3Client | undefined, completed = false, cleanupComplete = true;
  mkdirSync('.codex-artifacts', { recursive: true });
  const persist = () => writeFileSync(manifest, JSON.stringify({ runId, bucket: DELETION_R2_TEST_BUCKET, scope: live ? 'self-created staging markers only' : 'loopback HTTP provider only', keys: allKeys, attempted: [...attempted], confirmedAbsent: [...absent] }, null, 2));
  try {
    if (live) {
      const env = parse(readFileSync('.env.local'));
      assert.equal(env.R2_BUCKET_NAME?.trim(), DELETION_R2_TEST_BUCKET);
      const endpoint = env.R2_ENDPOINT?.trim() || `https://${env.R2_ACCOUNT_ID?.trim()}.r2.cloudflarestorage.com`;
      assert.equal(new URL(endpoint).hostname, `${env.R2_ACCOUNT_ID?.trim()}.r2.cloudflarestorage.com`);
      assert.ok(env.R2_ACCESS_KEY_ID?.trim() && env.R2_SECRET_ACCESS_KEY?.trim());
      credentials = { accessKeyId: env.R2_ACCESS_KEY_ID.trim(), secretAccessKey: env.R2_SECRET_ACCESS_KEY.trim() };
      target = { mode: 'staging-disposable', endpoint, bucket: DELETION_R2_TEST_BUCKET };
    } else {
      backend = await listen((req, res) => { void (async () => {
        const key = decodeURIComponent((req.url ?? '').split('?')[0]).replace(`/${DELETION_R2_TEST_BUCKET}/`, '');
        if (!allKeys.includes(key)) { res.writeHead(403); res.end(); return; }
        if (req.method === 'PUT') {
          puts.set(key, (puts.get(key) ?? 0) + 1); assert.equal(req.headers['if-none-match'], '*');
          const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk)); const body = Buffer.concat(chunks);
          assert.equal(req.headers['content-md5'], createHash('md5').update(body).digest('base64'));
          if (objects.has(key)) { res.writeHead(412); res.end(); return; }
          if (key.endsWith('/image.webp')) { providerAccepted.resolve(); await releaseProvider.promise; }
          objects.set(key, body);
          if (key.includes('/unknown-')) { res.destroy(); return; }
          res.writeHead(200, { etag: `"${createHash('md5').update(body).digest('hex')}"`, 'x-amz-request-id': randomUUID() }); res.end();
        } else if (req.method === 'HEAD') { res.writeHead(objects.has(key) ? 200 : 404); res.end(); }
        else if (req.method === 'DELETE') { objects.delete(key); res.writeHead(204); res.end(); }
        else { res.writeHead(405); res.end(); }
      })().catch(() => { res.destroy(); }); });
      target = { mode: 'isolated', endpoint: backend.url, bucket: DELETION_R2_TEST_BUCKET };
      credentials = { accessKeyId: 'isolated-key', secretAccessKey: 'isolated-secret' };
    }
    const targetHash = terminalPutTargetHash(target);
    assert.throws(() => terminalPutTargetHash({ ...target, bucket: 'production-photos' }));
    assert.throws(() => terminalPutTargetHash({ ...target, endpoint: target.endpoint + '/other-path' }));
    sql(`INSERT INTO deletion_upload_private.transport_target VALUES(true,${q(targetHash)});`);
    sdk = new S3Client({ region: 'auto', endpoint: target.endpoint, credentials, maxAttempts: 1, forcePathStyle: true });
    const localObjects = live ? null : createDeletionObjectPort({ client: sdk, endpoint: target.endpoint, bucket: target.bucket });
    async function setup(actor: string, label: string, existing = false) {
      const market = existing ? f.market : randomUUID(), sale = existing ? f.sale : randomUUID();
      if (!existing) {
        f.insert('markets', { id: market, owner_id: actor, name: 'Synthetic terminal PUT', location: 'Synthetic', start_date: '2026-11-02', end_date: '2026-11-02', status: 'registered' });
        f.insert('events', { id: sale, actor_id: actor, market_id: market, type: 'deal_closed', timestamp: new Date().toISOString(), payload: { totalAmount: 10 } },
          `SELECT set_config('request.jwt.claim.sub','${actor}',false);SELECT set_config('request.jwt.claim.role','authenticated',false);`);
      }
      const session = await beginDeletionUploadSession(client, actor, actor), start = f.starts.at(-1)!, uploadId = randomUUID();
      const row = JSON.parse(sql(`SELECT to_jsonb(bff_claim_sale_photo_evidence_upload('${actor}','${actor}','${market}','${sale}',NULL,'${uploadId}',clock_timestamp()));`));
      const root = (r: string) => `${r}/7d/${actor}/__deletion_acceptance/${runId}/`;
      const keys = [root('sales-evidence') + label + '.webp', root('sales-evidence-thumbs') + label + '.webp'];
      allKeys.push(...keys); persist();
      const probe = live ? createStagingDeletionProbe({ client: sdk!, endpoint: target.endpoint, bucket: target.bucket, actorId: actor, runId, keys }) : localObjects!;
      if (live) for (const key of keys) probes.set(key, probe as ReturnType<typeof createStagingDeletionProbe>);
      for (const key of keys) assert.equal(await probe.isAbsent(key), true, 'Never overwrite an existing marker');
      await session.bind({ kind: 'sale', entityId: row.id, keys, writeKeys: keys, expected: { attemptId: uploadId } });
      return { session, start, keys, probe };
    }
    function writer(start: { id: string; token: string }, keys: string[], c = client) {
      const result = createTerminalPutWriter({ databaseEndpoint, client: c, attemptId: start.id, token: start.token, target, credentials,
        assertKey(k) { assert.ok(keys.includes(k)); } }); writers.push(result); return result;
    }
    async function write(w: ReturnType<typeof writer>, key: string) { attempted.add(key); persist(); return w.write(key, payload, runId); }
    function freeze(actor: string) { const r = f.request(actor); f.step(r, 'access_frozen'); f.step(r, 'staff_access_revoked'); return r; }
    function reviewer(r: Request, start: { id: string }, probe: { isAbsent(k: string): Promise<boolean> }) {
      const identity = { requestId: r.id, leaseToken: r.token, attemptId: start.id };
      return createUploadReconciliationPort({ endpoint: databaseEndpoint, client, reviewerHash: hash, objects: probe,
        drain: createReceiptBackedUploadDrain({ endpoint: databaseEndpoint, client, identity, target }) });
    }
    const confirmed = await setup(f.other, 'image', true);
    let ackLost = false;
    const lossy: Client = { async rpc(n, a) { const result = await client.rpc(n, a); if (live && n === 'bff_record_deletion_upload_put' && a.p_action === 'ack' && !result.error && !ackLost) { ackLost = true; return { data: null, error: { code: 'network' } }; } return result; } };
    const knownWriter = writer(confirmed.start, confirmed.keys, lossy);
    producer = await listen((req, res) => { void (async () => {
      if (req.method !== 'POST' || req.url !== '/upload' || req.headers.authorization !== `Bearer ${runId}`) { res.writeHead(403); res.end(); return; }
      try { await confirmed.session.put(confirmed.keys[0], () => write(knownWriter, confirmed.keys[0])); }
      catch { confirmed.session.uncertain(); }
      checkpoint.resolve(); await releaseProducer.promise;
      await assert.rejects(() => confirmed.session.put(confirmed.keys[1], () => write(knownWriter, confirmed.keys[1])));
      confirmed.session.uncertain(); await confirmed.session.finish(); res.destroy(); // HTTP caller never receives success.
    })().catch(() => { checkpoint.resolve(); res.destroy(); }); });
    const response = fetch(producer.url + '/upload', { method: 'POST', headers: { authorization: `Bearer ${runId}` }, signal: AbortSignal.timeout(30000) }).then(() => false, () => true);
    if (live) await bounded(checkpoint.promise); else await bounded(providerAccepted.promise);
    const r = freeze(f.other); releaseProvider.resolve(); await bounded(checkpoint.promise); releaseProducer.resolve(); assert.equal(await response, true);
    const review = reviewer(r, confirmed.start, confirmed.probe), identity = { requestId: r.id, leaseToken: r.token, attemptId: confirmed.start.id };
    const prepared = await review.prepare(identity); assert.ok('identity' in prepared);
    denied(`SELECT bff_reconcile_deletion_upload('${r.id}','${r.token}','${confirmed.start.id}','commit',${q(JSON.stringify({ ...prepared.evidence, drainHash: hash }))}::jsonb);`, '55000');
    await review.commit(prepared as PreparedUploadReview);
    assert.equal(await confirmed.probe.isAbsent(confirmed.keys[0]), false); assert.equal(await confirmed.probe.isAbsent(confirmed.keys[1]), true);
    assert.equal(sql(`SELECT count(*) FROM deletion_upload_private.puts WHERE attempt_id='${confirmed.start.id}' AND receipt IS NOT NULL;`), '1');
    assert.equal(attempted.has(confirmed.keys[1]), false);
    pass(live ? 'real staging R2 200 receipt survives lost SQL acknowledgement and lost HTTP response; fresh DB-backed proof reconciles; second PUT is frozen' : 'actual loopback S3 PUT finishes after freeze; durable receipt and a new proof reader reconcile despite lost producer HTTP response; second PUT is fenced');
    await assert.rejects(() => knownWriter.write(confirmed.keys[0], payload, runId));
    pass('forged drain hash is rejected inside SQL commit; reusing a writer cannot issue another network PUT');
    await assert.rejects(() => knownWriter.write(confirmed.keys[0], payload, randomUUID()));
    pass('production bucket, alternate endpoint path and mismatched disposable run are rejected before any network write');

    if (!live) {
      const unknown = await setup(f.owner, 'unknown-image'), unknownWriter = writer(unknown.start, unknown.keys);
      await assert.rejects(() => unknown.session.put(unknown.keys[0], () => write(unknownWriter, unknown.keys[0]))); await unknown.session.finish();
      const ur = freeze(f.owner), uReview = reviewer(ur, unknown.start, unknown.probe), ui = { requestId: ur.id, leaseToken: ur.token, attemptId: unknown.start.id };
      assert.equal(puts.get(unknown.keys[0]), 1, 'No SDK automatic retry');
      assert.ok(objects.has(unknown.keys[0]), 'Provider committed before losing its HTTP response');
      objects.delete(unknown.keys[0]); assert.equal(await unknown.probe.isAbsent(unknown.keys[0]), true);
      sql(`UPDATE deletion_upload_private.attempts SET deadline=clock_timestamp()-interval '1 day' WHERE id='${unknown.start.id}';`);
      await assert.rejects(() => uReview.prepare(ui));
      objects.set(unknown.keys[0], payload); await assert.rejects(() => uReview.prepare(ui));
      assert.equal(sql(`SELECT count(*) FROM deletion_upload_private.reviews WHERE attempt_id='${unknown.start.id}';`), '0');
      pass('real HTTP socket loss remains unconfirmed after HEAD 404, lease expiry and late reappearance; one SDK attempt only, no fake terminal proof');
      const ack = JSON.parse(sql(`SELECT receipt FROM deletion_upload_private.puts WHERE attempt_id='${confirmed.start.id}';`));
      for (const changes of [{ bodyHash: 'b'.repeat(64) }, { targetHash: 'b'.repeat(64) }, { attempts: 2 }, { etagHash: 'bad' }]) {
        denied(`SELECT bff_record_deletion_upload_put('${confirmed.start.id}','${confirmed.start.token}',${q(confirmed.keys[0])},'ack',${q(JSON.stringify({ ...ack, ...changes }))}::jsonb);`, '55000');
      }
      for (const role of ['anon', 'authenticated']) denied(`SET ROLE ${role};SELECT bff_get_deletion_upload_drain('${r.id}','${r.token}','${confirmed.start.id}','${hash}','${targetHash}');`, '42501');
      denied('SET ROLE service_role;SELECT * FROM deletion_upload_private.puts;', '42501');
      pass('body/target mismatch, retry-count claims and changed receipts reject; client roles cannot attest and private receipts stay unreadable');
    }
    completed = true;
  } finally {
    releaseProvider.resolve(); releaseProducer.resolve();
    if (producer) await producer.close();
    for (const key of attempted) {
      try {
        if (live) { const probe = probes.get(key)!; await probe.deleteObject(key); assert.equal(await probe.isAbsent(key), true); }
        else { await sdk!.send(new DeleteObjectCommand({ Bucket: DELETION_R2_TEST_BUCKET, Key: key })); await assert.rejects(() => sdk!.send(new HeadObjectCommand({ Bucket: DELETION_R2_TEST_BUCKET, Key: key })), e => (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404); }
        absent.add(key); persist();
      } catch { cleanupComplete = false; }
    }
    for (const w of writers) w.destroy(); sdk?.destroy(); if (backend) await backend.close();
    writeFileSync(`.codex-artifacts/account-deletion-terminal-put-${live ? 'staging' : 'isolated'}.json`, JSON.stringify({
      at: new Date().toISOString(), checks, scenarioPassed: completed, cleanupComplete, attemptedMarkers: attempted.size, confirmedAbsent: absent.size,
      scope: live ? 'real staging R2 + real loopback producer HTTP + captured isolated PostgreSQL; SQL ack and producer response loss injected; no production SQL/Auth/objects' : 'real loopback HTTP/S3 SDK + captured isolated PostgreSQL; controlled provider, no cloud operations',
      productionEnabled: false, productionUploadRaceClosed: false,
    }, null, 2));
    assert.ok(cleanupComplete, 'Retain scoped manifest: cleanup incomplete');
  }
  console.log(`PASS terminal PUT ${live ? 'staging' : 'isolated'} (${checks.length} groups); all attempted markers absent`);
}
