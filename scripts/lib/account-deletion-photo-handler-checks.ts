import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beginConfiguredDeletionUpload } from '../../lib/subscription/account-deletion-upload-barrier.server';
import { terminalPutTargetHash } from '../../lib/subscription/account-deletion-terminal-put.server';
import { isOwnedDeletionObjectKey } from '../../lib/subscription/account-deletion-engine.server';
import {createAccountDeletionStepExecutor} from '../../lib/subscription/account-deletion-engine.server';
import {createDeletionDatabasePort,createDeletionObjectPort} from '../../lib/subscription/account-deletion-engine-adapters.server';
import { quoteSql as q, quoteIdentifier as qi } from './account-deletion-catalog-fixture';

type Result = { data: unknown; error: { code?: string; message: string } | null };
type Client = { rpc(n: string, a: Record<string, unknown>): Promise<{ data: unknown; error: { code?: string } | null }> };
type Req = { id: string; actor: string; token: string; kind: string };
type Fixture = {
  sql(s: string): string; denied(s: string, code?: string): void; client: Client;
  insert(t: string, d: Record<string, unknown>, prefix?: string): void;
  request(actor: string): Req; step(r: Req, s: string): void;
  starts: { id: string; token: string; owner: string }[]; owner: string; other: string; product: string; otherProduct: string;
  live?:Awaited<ReturnType<typeof import('./account-deletion-candidate-services')['startCandidateServices']>>;
  staff?:string;legacy?:string;
  sourceHashes?:{path:string;sha256:string}[];
};
type Mode = 'success' | 'cleanup_failed' | 'unknown_put' | 'finalize_lost' | 'ack_lost' | 'conflict' | 'freeze';
type Control = { actor: string; mode: Mode; mime:string;keys: string[]; puts: number; deletes: string[]; requestedDeletes:string[]; lost: boolean; frozen?: Req };
const req = createRequire(import.meta.url), marker = req.resolve('server-only'), stub = new Module(marker);
stub.filename = marker; stub.loaded = true; stub.exports = {}; req.cache[marker] = stub;
const { createProductCoverPhotoUploadHandler } = req('../../app/api/product-cover-photo/upload/route') as typeof import('../../app/api/product-cover-photo/upload/route');
const { createSalesPhotoEvidenceUploadRouteHandlers } = req('../../app/api/sales-photo-evidence/upload/route') as typeof import('../../app/api/sales-photo-evidence/upload/route');
const { createSalesPhotoEvidenceServerMutationRepository } = req('../../lib/supabase/sales-photo-evidence-server-mutation-repository.server') as typeof import('../../lib/supabase/sales-photo-evidence-server-mutation-repository.server');
const { buildProductCoverPhotoObjectKey } = req('../../lib/products/product-cover-photo-model') as typeof import('../../lib/products/product-cover-photo-model');
const { checkServerSubscriptionWrite }=req('../../lib/subscription/write-access.server') as typeof import('../../lib/subscription/write-access.server');

export async function checkPhotoHandlerReceipts(f: Fixture) {
  const { sql, denied } = f, checks: string[] = [], pass = (s: string) => { checks.push(s); console.log('PASS ' + s); };
  const objects = new Map<string, { body: Buffer; type: string }>(), allowed = new Set<string>(), bucket = 'markit-sales-photo-staging';
  const freezeLeases = new Map<string, Req>();
  let control: Control;
  const freeze = (actor: string) => { const r = f.request(actor); f.step(r, 'access_frozen'); f.step(r, 'staff_access_revoked'); freezeLeases.set(actor,r);return r; };
  const server = createServer((request, response) => { void (async () => {
    const key = decodeURIComponent((request.url ?? '').split('?')[0]).replace(`/${bucket}/`, '');
    if (!allowed.has(key)) { response.writeHead(403); response.end(); return; }
    if (request.method === 'PUT') {
      control.puts++; assert.equal(request.headers['if-none-match'], '*');
      const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk)); const body = Buffer.concat(chunks);
      assert.equal(request.headers['content-md5'], createHash('md5').update(body).digest('base64'));
      assert.equal(request.headers['content-type'], control.mime);
      if (objects.has(key)) { response.writeHead(412); response.end(); return; }
      if (control.mode === 'cleanup_failed' && control.puts === 2) { response.writeHead(503); response.end(); return; }
      objects.set(key, { body, type: String(request.headers['content-type']) });
      if (control.mode === 'unknown_put') { response.destroy(); return; }
      if (control.mode === 'freeze' && control.puts === 1) control.frozen = freeze(control.actor);
      response.writeHead(200, { etag: `"${createHash('md5').update(body).digest('hex')}"`, 'x-amz-request-id': randomUUID() }); response.end();
    } else if (request.method === 'DELETE') {
      control.deletes.push(key);
      if (control.mode === 'cleanup_failed' || control.mode === 'freeze') { response.writeHead(503); response.end(); return; }
      objects.delete(key); response.writeHead(204); response.end();
    } else if(request.method==='GET'){const o=objects.get(key);response.writeHead(o?200:404,o?{'content-type':o.type,'content-length':o.body.length}:{});response.end(o?.body);}
    else if (request.method === 'HEAD') { response.writeHead(objects.has(key) ? 200 : 404); response.end(); }
    else { response.writeHead(405); response.end(); }
  })().catch(() => response.destroy()); });
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r)); const address = server.address(); assert.ok(address && typeof address !== 'string');
  const endpoint = `http://127.0.0.1:${address.port}`, databaseEndpoint = 'http://127.0.0.1:54321';
  const env = { ACCOUNT_DELETION_UPLOAD_BARRIER_ENABLED: '1', ACCOUNT_DELETION_UPLOAD_RECEIPTS_ENABLED: '1', NEXT_PUBLIC_SUPABASE_URL: databaseEndpoint,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-public-key', SUPABASE_SECRET_KEY: 'sb_secret_' + 'x'.repeat(40),
    R2_ENDPOINT: endpoint, R2_BUCKET_NAME: bucket, R2_ACCESS_KEY_ID: 'isolated-key', R2_SECRET_ACCESS_KEY: 'isolated-secret' };
  const sdk = new S3Client({ endpoint, region: 'auto', forcePathStyle: true, maxAttempts: 1, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } });
  const target = { endpoint, bucket, mode: 'isolated' as const };
  sql(`INSERT INTO deletion_upload_private.transport_target VALUES(true,${q(terminalPutTargetHash(target))});`);
  const photoRpcs = new Set(['claim_product_cover_photo_upload', 'finalize_product_cover_photo_upload', 'mark_product_cover_photo_upload_failed',
    'bff_claim_sale_photo_evidence_upload', 'bff_finalize_sale_photo_evidence_upload', 'bff_mark_sale_photo_evidence_upload_failed']);
  const rpc = async (name: string, args: Record<string, unknown>): Promise<Result> => {
    if (!photoRpcs.has(name)) {
      if (name === 'bff_bind_deletion_upload') {
        control.keys = [...args.p_write_keys as string[]]; for (const key of control.keys) { assert.ok(isOwnedDeletionObjectKey(key, control.actor)); allowed.add(key); }
        if (control.mode === 'conflict') objects.set(control.keys[0], { body: Buffer.from('pre-existing photo'), type: 'image/webp' });
      }
      const result = await f.client.rpc(name, args);
      if(name==='bff_read_recorded_photo_upload'&&result.error)console.error('Readback SQL rejected: '+result.error.code);
      if (name === 'bff_record_deletion_upload_put' && args.p_action === 'ack' && control.mode === 'ack_lost' && !control.lost && !result.error) {
        control.lost = true; return { data: null, error: { code: 'FETCH_ERROR', message: 'Injected SQL acknowledgement loss' } };
      }
      return { data: result.data, error: result.error ? { code: result.error.code, message: 'Synthetic RPC stopped' } : null };
    }
    const values = Object.entries(args).map(([k, v]) => `${qi(k)}=>${v === null ? 'NULL' : q(String(v))}`).join(',');
    try {
      if(f.live){const r=await f.live.rpc(name,args);if(r.error)return {data:null,error:{code:r.error.code,message:'Candidate RPC rejected'}};if(name.includes('finalize_')&&control.mode==='finalize_lost')return {data:null,error:{code:'FETCH_ERROR',message:'Injected finalize reply loss'}};return {data:r.data,error:null};}
      const out = sql(`SELECT ${name.startsWith('bff_') ? 'to_jsonb(' : ''}public.${name}(${values})${name.startsWith('bff_') ? ')' : ''};`);
      if (name.includes('finalize_') && control.mode === 'finalize_lost') return { data: null, error: { code: 'FETCH_ERROR', message: 'Injected committed finalize response loss' } };
      return { data: name.startsWith('bff_') && out ? JSON.parse(out) as unknown : null, error: null };
    } catch (e) { return { data: null, error: { code: String((e as { stderr?: string }).stderr ?? '').match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1] ?? 'FETCH_ERROR', message: 'Synthetic RPC rejected' } }; }
  };
  const client = { rpc, from(table: string) {
    assert.ok(['product_cover_photos', 'events', 'markets', 'sale_photo_evidence', 'staff_relationships'].includes(table));
    const filters: string[] = [],restFilters:string[]=[];
    const query = { select() { return query; }, eq(col: string, value: string) { filters.push(`t.${qi(col)}=${q(value)}`);restFilters.push(`${col}=eq.${encodeURIComponent(value)}`); return query; },
      is(col: string, value: null) { assert.equal(value, null); filters.push(`t.${qi(col)} IS NULL`);restFilters.push(`${col}=is.null`); return query; },
      async maybeSingle() { const extra = table === 'events' ? "||jsonb_build_object('markets',(SELECT jsonb_build_object('owner_id',m.owner_id) FROM markets m WHERE m.id=t.market_id))" : '';
        if(f.live){try{return {data:await f.live.read(table,restFilters.join('&'),control.actor),error:null};}catch{return {data:null,error:Error('Candidate user read rejected')};}}
        const out = sql(`SELECT to_jsonb(t)${extra} FROM public.${qi(table)} t WHERE ${filters.join(' AND ') || 'false'};`); return { data: out ? JSON.parse(out) as unknown : null, error: null }; } };
    return query;
  } };
  const paid = { enabled: true, allowed: true, reason: 'allowed' as const };
  const authorize=(actorId:string,ownerId:string,feature:'product_photo'|'sales_photo')=>f.live?checkServerSubscriptionWrite({actorId,ownerId,feature},{enabled:true,client:f.live}):Promise.resolve(paid);
  const deleteObject = async (key: string) => { control.requestedDeletes.push(key);await sdk.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); return true; };
  const image = (thumbnail=false) => { const bytes = new Uint8Array(12);if(control.mime==='image/jpeg')bytes.set([255,216,255]);else{bytes.set([82,73,70,70]);bytes.set([87,69,66,80],8);}bytes[5]=thumbnail?1:0;return new Blob([bytes],{type:control.mime}); };
  const saved: { kind: string; mode: Mode; attemptId: string; keys: string[]; actor: string }[] = [];
  try {
    const before = f.starts.length;
    assert.equal(await beginConfiguredDeletionUpload(f.owner, f.owner, client, {}), null);
    for (const invalid of [
      { ...env, ACCOUNT_DELETION_UPLOAD_BARRIER_ENABLED: '0' }, { ...env, VERCEL: '1' },
      { ...env, NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' }, { ...env, R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com' },
      { ...env, R2_BUCKET_NAME: 'production-photos' },
    ]) await assert.rejects(() => beginConfiguredDeletionUpload(f.owner, f.owner, client, invalid));
    assert.equal(f.starts.length, before);
    pass('default-off and incompatible/deployed/remote configuration stops before registration, claim or photo writes');
    const focus=process.env.DELETION_CANDIDATE_FOCUS;
    for (const kind of focus==='cleanup'?[]:focus==='sale'?['sale']:['product', 'sale']) for (const mode of ['success', 'cleanup_failed', 'unknown_put', 'finalize_lost', 'ack_lost', 'conflict', 'freeze'] as const) {
      const actor = kind === 'product' ? f.owner : f.other;
      control = { actor, mode,mime:mode==='success'?'image/jpeg':'image/webp', keys: [], puts: 0, deletes: [], requestedDeletes:[], lost: false };
      const form = new FormData(); let handler: (r: Request) => Promise<Response>; let entity: string;
      if (kind === 'product') {
        entity = randomUUID(); const photoId = randomUUID();
        f.insert('products', { id: entity, owner_id: actor, name: 'Synthetic receipt product', category: 'other', is_active: true, price: 10 });
        for (const [k, v] of Object.entries({ productId: entity, photoId, width: '1', height: '1', version: '1' })) form.set(k, v);
        form.set('display', image()); form.set('thumbnail', image(true));
        const expected = buildProductCoverPhotoObjectKey({ ownerId: actor, productId: entity, photoId, version: 1, variant: 'display', mimeType:control.mime as 'image/webp'|'image/jpeg' });
        handler = createProductCoverPhotoUploadHandler({ isProductCoverPhotoUploadEnabled: () => true,
          authenticateAppApiRequest: async request => f.live?f.live.authenticate(request):({ ok: true, actor: { actorId: actor } }), createProductCoverPhotoServiceClient: () => client as unknown as SupabaseClient,
          resolveProductCoverPhotoAccess: async () => ({ ownerId: actor, canEdit: true }), checkServerSubscriptionWrite: input=>authorize(input.actorId,input.ownerId,'product_photo'),
          isProductCoverPhotoEntitlementRequired: () => false, resolveProductCoverPhotoPlanAccess: async () => ({ allowed: true, reason: 'open_access' }),
          beginConfiguredDeletionUpload: (a, o) => beginConfiguredDeletionUpload(a, o, client, env),
          putProductCoverPhotoObject: async () => { throw Error('Legacy upload fallback must not run'); },
          deleteProductCoverPhotoObject: async key => key ? deleteObject(key) : true });
        allowed.add(expected); allowed.add(expected.replace('display', 'thumbnail'));
      } else {
        const market = randomUUID(); entity = randomUUID(); const now = new Date().toISOString();
        f.insert('markets', { id: market, owner_id: actor, name: 'Synthetic receipt market', location: 'Synthetic', start_date: '2026-11-02', end_date: '2026-11-02', status: 'registered' });
        f.insert('events', { id: entity, actor_id: actor, market_id: market, type: 'deal_closed', timestamp: now, payload: { totalAmount: 10 } }, `SELECT set_config('request.jwt.claim.sub','${actor}',false);SELECT set_config('request.jwt.claim.role','authenticated',false);`);
        for (const [k, v] of Object.entries({ ownerId: actor, marketId: market, saleEventId: entity, capturedAt: now, saleCompletedAt: now })) form.set(k, v);
        for (const name of ['image', 'thumbnail']) { const blob = image(name==='thumbnail'); form.set(name, blob); form.set(name + 'Metadata', JSON.stringify({ kind: name, mimeType: blob.type, fileSizeBytes: blob.size, width: 1, height: 1 })); }
        const handlers = createSalesPhotoEvidenceUploadRouteHandlers({ isMetadataClaimEnabled: () => true, isR2UploadEnabled: () => true,
          resolveActor: async request => {if(!f.live)return {actorId:actor};const r=await f.live.authenticate(request);return r.ok?r.actor:null;}, authorizeSubscriptionWrite: (a,o)=>authorize(a,o,'sales_photo'),
          createRepository: () => client, createMutationRepository: (a, attemptId) => createSalesPhotoEvidenceServerMutationRepository(a.actorId, attemptId, { env, createMutationClient: () => ({ rpc }) }),
          beginDeletionUpload: (a, o) => beginConfiguredDeletionUpload(a, o, client, env),
          r2UploadAdapter: { async uploadObject() { throw Error('Legacy upload fallback must not run'); }, async deleteObject({ key }) { try { await deleteObject(key); return { ok: true, key }; } catch { return { ok: false, key, code: 'r2_delete_failed', message: 'Synthetic delete failure' }; } } } });
        handler = handlers.POST;
      }
      const makeRequest=()=>new Request('http://localhost/api/test-photo-upload',{method:'POST',body:form,headers:f.live?{authorization:`Bearer ${f.live.token(actor)}`}:{}});
      const response = await handler(makeRequest()), body = await response.json();
      const attemptId = f.starts.at(-1)!.id, state = sql(`SELECT state FROM deletion_upload_private.attempts WHERE id='${attemptId}';`);
      const receipts = Number(sql(`SELECT count(*) FROM deletion_upload_private.puts WHERE attempt_id='${attemptId}' AND receipt IS NOT NULL;`));
      if (mode === 'success') { assert.equal(response.status, 200, JSON.stringify(body)); assert.equal(state, 'settled'); assert.equal(receipts, 2); assert.equal(control.puts, 2); }
      else {
        assert.ok(response.status >= 400, JSON.stringify(body)); assert.equal(body.shouldKeepLocalPayload, true); assert.equal(state, 'uncertain');
        if (mode === 'finalize_lost') { assert.equal(receipts, 2); assert.ok(control.keys.every(k => objects.has(k))); assert.deepEqual(control.deletes, []); }
        if (mode === 'unknown_put') { assert.equal(receipts, 0); assert.ok(objects.has(control.keys[0])); assert.equal(control.puts, 1); assert.deepEqual(control.deletes, []); }
        if (mode === 'conflict') { assert.equal(receipts, 0); assert.equal(objects.get(control.keys[0])?.body.toString(), 'pre-existing photo'); assert.deepEqual(control.deletes, []); }
        if (mode === 'cleanup_failed' || mode === 'freeze') { assert.equal(receipts, 1); assert.ok(objects.has(control.keys[0]),`${kind}/${mode}: first object unexpectedly missing`); assert.ok(control.requestedDeletes.includes(control.keys[0]),`${kind}/${mode}: expected compensation request; response=${JSON.stringify(body)}; PUTs=${control.puts}; deletes=${control.deletes.length}; requested=${control.requestedDeletes.length}`); }
        if (mode === 'ack_lost') assert.equal(receipts, 1);
      }
      const status = sql(`SELECT status FROM ${kind === 'product' ? 'product_cover_photos WHERE product_id' : 'sale_photo_evidence WHERE sale_id'}='${entity}';`);
      if (mode === 'success' || mode === 'finalize_lost') assert.equal(status, 'uploaded');
      for (const key of control.keys.filter(k => objects.has(k))) assert.equal(objects.get(key)!.type,control.mime);
      if(mode==='success'||mode==='finalize_lost'){
        const count=control.puts,kept=[...control.keys];
        const replay=await handler(makeRequest());const replayBody=await replay.json();assert.equal(replay.status,200,JSON.stringify(replayBody));assert.equal(replayBody.replayed,true);assert.equal(control.puts,count);
        const changed=await makeRequest().formData(),name=kind==='product'?'display':'image',old=changed.get(name) as Blob,bytes=new Uint8Array(await old.arrayBuffer());bytes[4]^=1;changed.set(name,new Blob([bytes],{type:old.type}));
        const conflict=await handler(new Request('http://localhost/api/test-photo-upload',{method:'POST',body:changed,headers:f.live?{authorization:`Bearer ${f.live.token(actor)}`}:{}}));assert.equal(conflict.status,409);assert.equal(control.puts,count);
        const present=objects.get(kept[0])!;objects.delete(kept[0]);const missing=await handler(makeRequest());assert.equal(missing.status,503);assert.equal(control.puts,count);objects.set(kept[0],present);
        pass(`${kind} ${mode} replay: JPEG/WebP exact content readback, changed payload conflict, missing object holds, zero extra PUTs`);
      }
      if(mode==='unknown_put'||mode==='ack_lost'){
        const count=control.puts;const held=await handler(makeRequest());assert.equal(held.status,409);assert.equal((await held.json()).shouldRetryWithLocalPayload,false);assert.equal(control.puts,count);
      }
      saved.push({ kind, mode, attemptId, keys: [...control.keys], actor });
      pass(`${kind} handler ${mode}: actual claim/finalize SQL, receipt writes, MIME and local payload protection`);
    }
    for (const actor of [f.owner, f.other]) {
      const row = saved.find(x => x.actor === actor && x.mode === 'finalize_lost')!;
      if(!row)continue;
      assert.equal(sql(`SELECT state FROM deletion_upload_private.attempts WHERE id='${row.attemptId}';`),'settled');
      assert.ok(row.keys.every(k => objects.has(k))); denied(`SELECT deletion_engine_private.assert_uploads_quiescent('${actor}');`, '55000');
      const lease=freezeLeases.get(actor)!;
      const queue=JSON.parse(sql(`SELECT bff_account_deletion_upload_reviews('${lease.id}','${lease.token}');`));assert.equal(queue.canAutoRelease,false);assert.ok(queue.items.some((v:{reason:string})=>v.reason==='provider_outcome_unknown'));assert.ok(!JSON.stringify(queue).includes('object_key'));
      denied(`SELECT bff_account_deletion_upload_reviews('${lease.id}','${randomUUID()}');`,'55000');
    }
    pass('both readbacks retire only their confirmed attempt; unrelated unknown attempts still block account cleanup');
    if(f.live){await f.live.verifyAnonymous();const free=await authorize(f.legacy!,f.legacy!,'product_photo');assert.equal(free.allowed,false);const cross=await authorize(f.staff!,f.owner,'product_photo');assert.equal(cross.allowed,false);pass('real GoTrue password/bearer, PostgREST role/ACL and enabled canonical Free/cross-brand write denial in one candidate');}
    if(f.live&&(!focus||focus==='cleanup')){
      const r=f.request(f.legacy!),executor=createAccountDeletionStepExecutor({database:createDeletionDatabasePort(f.live,databaseEndpoint),objects:createDeletionObjectPort({client:sdk,endpoint,bucket}),identity:f.live.identity});
      assert.equal(r.kind,'owner');
      for(const step of ['access_frozen','staff_access_revoked','object_manifest_built','r2_objects_deleted','r2_absence_verified','billing_identity_detached','operational_data_cleaned','profile_deleted','auth_user_deleted','sessions_revoked']as const){
        const result=await executor({requestId:r.id,leaseToken:r.token,accountKind:'owner',stepCode:step});assert.equal(result.outcome,'completed',JSON.stringify({step,result}));if(result.outcome!=='completed')throw Error('Candidate deletion stopped');
        const saved=await f.live.rpc('bff_record_account_deletion_step',{p_request_id:r.id,p_lease_token:r.token,p_step_code:step,p_outcome:'completed',p_affected_count:result.affectedCount,p_evidence_hash:result.evidenceHash,p_safe_error_code:null});assert.equal(saved.error,null);
      }
      assert.equal(sql(`SELECT count(*) FROM auth.users WHERE id='${f.legacy}';`),'0');assert.equal(sql(`SELECT count(*) FROM auth.sessions WHERE user_id='${f.legacy}';`),'0');
      pass('same candidate clean owner: real REST worker runs all ten steps, real GoTrue freeze/hard delete, sessions absent; other unknown owners stay held');
    }
    mkdirSync('.codex-artifacts', { recursive: true });
    writeFileSync(focus?'.codex-artifacts/account-deletion-candidate-focus.json':f.live?'.codex-artifacts/account-deletion-integrated-candidate.json':'.codex-artifacts/account-deletion-photo-handlers.json', JSON.stringify({ at: new Date().toISOString(), checks,focus:focus??null,sourceHashes:f.sourceHashes, productionEnabled: false,
      scope:f.live?'real GoTrue bearer + real PostgREST JWT roles/reads/RPC + existing Next handler factories + captured PostgreSQL + loopback S3; canonical API subscription write decision enabled; captured triggers, not managed production Auth/Vercel/R2 acceptance':'real existing Next handler factories + captured isolated PostgreSQL/BFFs + real loopback S3 SDK; auth/plan gates injected, not GoTrue/PostgREST or production/R2 acceptance' }, null, 2));
  } finally { sdk.destroy(); server.closeAllConnections(); await new Promise<void>(r => server.close(() => r())); }
  console.log(`PASS existing photo handlers (${checks.length} groups); loopback HTTP closed`);
}
