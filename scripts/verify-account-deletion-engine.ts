// Destructive ONLY to newly created, labelled, disposable containers. No dotenv/cloud credentials.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac, randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { S3Client } from '@aws-sdk/client-s3';
import { createAccountDeletionStepExecutor, type DeletionLease, type DeletionIdentityPort } from '../lib/subscription/account-deletion-engine.server';
import { createDeletionDatabasePort, createDeletionIdentityPort, createDeletionObjectPort } from '../lib/subscription/account-deletion-engine-adapters.server';
import { runAccountDeletionSagaTick, type AccountDeletionSagaRepository } from '../lib/subscription/account-deletion-saga.server';

async function main() {
  assert.deepEqual(process.argv.slice(2), ['--isolated']);
  assert.ok(!process.env.DOCKER_HOST && !process.env.DOCKER_CONTEXT && !process.env.VERCEL && !process.env.VERCEL_ENV);
  const docker = (args: string[], input?: string) => execFileSync('docker', ['--context', 'desktop-linux', ...args], {
    input, encoding: 'utf8', timeout: 30_000, maxBuffer: 4*1024*1024, stdio: ['pipe','pipe','pipe'],
  }).trim();
  assert.equal(docker(['context','inspect','desktop-linux','--format','{{.Endpoints.docker.Host}}']), 'npipe:////./pipe/dockerDesktopLinuxEngine');
  const suffix = randomUUID(); const db = `deletion-engine-db-${suffix}`; const auth = `deletion-engine-auth-${suffix}`;
  const network = `deletion-engine-${suffix}`; const purpose = 'account-deletion-engine-isolated';
  const secret = randomBytes(48).toString('hex');
  const sql = (query: string) => docker(['exec','-i',db,'psql','-XAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-U','postgres','-d','deletion_engine_test'],query);
  const q = (value: unknown): string => value === null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
  const hash = (value: string) => createHash('sha256').update(value).digest('hex');
  const jwt = (role: string) => {
    const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
    const b=Buffer.from(JSON.stringify({role,iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
    return `${h}.${b}.${createHmac('sha256',secret).update(`${h}.${b}`).digest('base64url')}`;
  };
  const checks: string[] = []; const pass=(name: string) => { checks.push(name); console.log(`PASS ${name}`); };
  const objects = new Set<string>(); const deletes = new Map<string,number>();
  let deleteFailure: string | null=null; let headFailure: string | null=null;
  const s3 = createServer((req,res) => {
    const key=decodeURIComponent(new URL(req.url!, 'http://127.0.0.1').pathname.replace(/^\/deletion-test\//,''));
    if(req.method==='DELETE') {
      if(key===deleteFailure) {res.writeHead(503);res.end('<Error><Code>ServiceUnavailable</Code></Error>');return;}
      objects.delete(key);deletes.set(key,(deletes.get(key)??0)+1);res.writeHead(204);res.end();return;
    }
    if(req.method==='HEAD') {res.writeHead(key===headFailure?403:objects.has(key)?200:404,{'Content-Length':'0'});res.end();return;}
    res.writeHead(405);res.end();
  });
  await new Promise<void>(resolve=>s3.listen(0,'127.0.0.1',resolve));
  const s3port=(s3.address() as {port:number}).port; const endpoint=`http://127.0.0.1:${s3port}`;
  const objectClient=new S3Client({region:'auto',endpoint,forcePathStyle:true,maxAttempts:1,credentials:{accessKeyId:'synthetic',secretAccessKey:'synthetic'}});
  const objectPort=createDeletionObjectPort({client:objectClient,bucket:'deletion-test',endpoint});
  const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}} as const;
  let startedDb=false,startedAuth=false,startedNetwork=false;
  try {
    docker(['network','create','--label',`feria-purpose=${purpose}`,network]);startedNetwork=true;
    docker(['run','--rm','-d','--name',db,'--network',network,'--label',`feria-purpose=${purpose}`,
      '-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=deletion_engine_test','postgres:17-alpine']);startedDb=true;
    for(let i=0;i<60;i++) {
      try {sql('SELECT 1;');break;} catch {if(i===59)throw new Error('Disposable PostgreSQL unavailable');await new Promise(r=>setTimeout(r,100));}
    }
    sql('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;');
    docker(['run','--rm','-d','--name',auth,'--network',network,'--label',`feria-purpose=${purpose}`,'-p','127.0.0.1::9999',
      '-e','GOTRUE_API_HOST=0.0.0.0','-e','GOTRUE_API_PORT=9999','-e','API_EXTERNAL_URL=http://127.0.0.1',
      '-e','GOTRUE_SITE_URL=http://127.0.0.1','-e','GOTRUE_DB_DRIVER=postgres',
      '-e',`GOTRUE_DB_DATABASE_URL=postgres://postgres@${db}:5432/deletion_engine_test?sslmode=disable&search_path=auth`,
      '-e','GOTRUE_DB_NAMESPACE=auth','-e',`GOTRUE_JWT_SECRET=${secret}`,'-e','GOTRUE_JWT_ADMIN_ROLES=service_role',
      '-e','GOTRUE_JWT_AUD=authenticated','-e','GOTRUE_MAILER_AUTOCONFIRM=true','-e','GOTRUE_DISABLE_SIGNUP=false',
      'public.ecr.aws/supabase/gotrue:v2.196.0']);startedAuth=true;
    const inspect=JSON.parse(docker(['inspect',auth]))[0];
    const bindings=inspect.HostConfig.PortBindings['9999/tcp'];
    assert.equal(bindings[0].HostIp,'127.0.0.1');
    const authPort=inspect.NetworkSettings.Ports['9999/tcp'][0].HostPort;
    const authEndpoint=`http://127.0.0.1:${authPort}`;
    let healthy=false;
    for(let i=0;i<100;i++) {
      try {if((await fetch(`${authEndpoint}/health`)).ok){healthy=true;break;}} catch { /* service boot */ }
      await new Promise(r=>setTimeout(r,100));
    }
    if(!healthy)throw new Error('Disposable GoTrue failed to become healthy (private logs not printed)');
    const authFetch: typeof fetch=(input,init)=>{
      const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
      assert.equal(url.origin,authEndpoint);url.pathname=url.pathname.replace(/^\/auth\/v1/,'');
      return fetch(url,init);
    };
    const admin=createClient(authEndpoint,jwt('service_role'),{...opts,global:{fetch:authFetch}});
    const identity=createDeletionIdentityPort(admin,authEndpoint);
    sql(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
      CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),email text,display_name text);
      CREATE TABLE public.markets(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES profiles(id),name text);
      CREATE TABLE public.products(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES profiles(id),name text);
      CREATE TABLE public.events(id uuid PRIMARY KEY,actor_id uuid REFERENCES profiles(id),market_id uuid REFERENCES markets(id),payload jsonb,metadata jsonb);
      CREATE TABLE public.staff_relationships(id uuid PRIMARY KEY,owner_id uuid REFERENCES profiles(id),staff_id uuid REFERENCES profiles(id),staff_email text,status text);
      CREATE TABLE public.staff_invitations(id uuid PRIMARY KEY,owner_id uuid REFERENCES profiles(id),token text);
      CREATE TABLE public.market_members(market_id uuid REFERENCES markets(id),user_id uuid REFERENCES profiles(id));
      CREATE TABLE public.user_settings(user_id uuid PRIMARY KEY REFERENCES profiles(id),settings jsonb);
      CREATE TABLE public.subscription_accounts(owner_id uuid PRIMARY KEY REFERENCES profiles(id),plan_code text,billing_status text);
      CREATE TABLE public.product_cover_photos(id uuid PRIMARY KEY,owner_id uuid REFERENCES profiles(id),display_object_key text,thumbnail_object_key text);
      CREATE TABLE public.sale_photo_evidence(id uuid PRIMARY KEY,owner_id uuid REFERENCES profiles(id),captured_by_staff_id uuid REFERENCES profiles(id),r2_object_key text,r2_thumbnail_key text);
      CREATE FUNCTION public.delete_current_user_app_data() RETURNS void LANGUAGE sql AS 'SELECT';
      REVOKE ALL ON FUNCTION public.delete_current_user_app_data() FROM PUBLIC;
      GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
    sql(readFileSync('supabase/migrations/071_add_account_deletion_request_foundation.sql','utf8'));
    for(const path of ['docs/subscription/drafts/ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.sql','docs/subscription/drafts/ACCOUNT_DELETION_ENGINE_2026_11_02.sql']) {
      const draft=readFileSync(path,'utf8');assert.match(draft,/ROLLBACK;\s*$/);sql(draft.replace(/ROLLBACK;\s*$/,'COMMIT;'));
    }
    sql(`GRANT SELECT,INSERT,UPDATE,DELETE ON public.profiles,public.markets,public.products,public.events TO authenticated;
      CREATE POLICY fixture_read ON profiles TO authenticated USING(true) WITH CHECK(true);
      CREATE POLICY fixture_read ON markets TO authenticated USING(true) WITH CHECK(true);
      CREATE POLICY fixture_read ON products TO authenticated USING(true) WITH CHECK(true);
      CREATE POLICY fixture_read ON events TO authenticated USING(true) WITH CHECK(true);`);
    async function user(kind:string) {
      const email=`engine-${kind}-${suffix}@example.test`;const password=`Synthetic-${suffix}!`;
      const u=await admin.auth.admin.createUser({email,password,email_confirm:true});
      assert.ok(!u.error&&u.data.user,`Synthetic Auth create failed: ${u.error?.status ?? 'unknown'} ${u.error?.code ?? 'unknown'} ${u.error?.message ?? ''}`);const id=u.data.user.id;
      sql(`INSERT INTO profiles VALUES(${q(id)},${q(email)},${q(`Synthetic ${kind}`)});`);
      return {id,email,password};
    }
    const owner=await user('owner'); const other=await user('other'); const staff=await user('staff'); const blocked=await user('billing'); const unknown=await user('unknown');
    const market=randomUUID(),otherMarket=randomUUID(),sale=randomUUID();
    sql(`INSERT INTO markets VALUES('${market}','${owner.id}','Disposable owner'),('${otherMarket}','${other.id}','Preserved owner');
      INSERT INTO products VALUES('${randomUUID()}','${owner.id}','Disposable product'),('${randomUUID()}','${other.id}','Preserved product');
      INSERT INTO staff_relationships VALUES('${randomUUID()}','${owner.id}','${staff.id}',${q(staff.email)},'active');
      INSERT INTO market_members VALUES('${market}','${staff.id}');
      INSERT INTO events VALUES('${sale}','${staff.id}','${market}',${q(JSON.stringify({amount:99,staffId:staff.id,staffEmail:staff.email,nested:[{actorId:staff.id}]}))}::jsonb,'{}');
      INSERT INTO user_settings VALUES('${staff.id}','{}'),('${owner.id}','{}');
      INSERT INTO subscription_accounts VALUES('${owner.id}','team','none'),('${blocked.id}','pro','active');`);
    // Real GoTrue session, subsequently removed by Auth Admin hard deletion.
    const staffClient=createClient(authEndpoint,jwt('anon'),{...opts,global:{fetch:authFetch}});
    const login=await staffClient.auth.signInWithPassword({email:staff.email,password:staff.password});
    assert.ok(!login.error&&login.data.session,'Synthetic sign-in failed');
    assert.equal(sql(`SELECT count(*) FROM auth.sessions WHERE user_id='${staff.id}';`),'1');
    const keys=Array.from({length:23},(_,i)=>`product-cover-photos/${owner.id}/${randomUUID()}/${randomUUID()}/v${i+1}/display.webp`);
    const foreignKey=`product-cover-photos/${other.id}/${randomUUID()}/${randomUUID()}/v1/display.webp`;
    for(const key of [...keys,foreignKey])objects.add(key);
    for(const key of keys)sql(`INSERT INTO product_cover_photos VALUES('${randomUUID()}','${owner.id}',${q(key)},NULL);`);
    const call=(name:string,args:unknown[])=>sql(`SELECT ${name}(${args.map(q).join(',')});`);
    const rpc={async rpc(_name:string,args:Record<string,unknown>) {
      try{return {data:JSON.parse(call('bff_account_deletion_engine',[args.p_request_id,args.p_lease_token,args.p_step,args.p_kind,args.p_action,args.p_key])),error:null};}
      catch(error){const stderr=String((error as {stderr?:unknown}).stderr??'');return {data:null,error:{code:stderr.includes('55000')?'55000':'unknown'}};}
    }};
    const database=createDeletionDatabasePort(rpc,authEndpoint);
    const repository:AccountDeletionSagaRepository={
      async claimLease(i){const r=JSON.parse(sql(`SELECT bff_claim_account_deletion_lease(${q(i.requestId)},${q(i.workerId)},clock_timestamp(),${i.leaseDurationMs/1000});`));return r;},
      async recordStepResult(i){const r=i.result;call('bff_record_account_deletion_step',[i.requestId,i.leaseToken,i.stepCode,r.outcome,r.outcome==='completed'?r.affectedCount:null,r.outcome==='completed'?r.evidenceHash:null,r.outcome==='completed'?null:r.safeErrorCode]);},
      async finalizeCompletion(i){return call('bff_finalize_account_deletion',[i.requestId,i.leaseToken]) as 'completed'|'incomplete'|'lease_lost';},
      async releaseLease(i){call('bff_release_account_deletion_lease',[i.requestId,i.leaseToken]);},
    };
    const request=(actor:string)=>{
      const id=sql(`SELECT request_id FROM bff_create_account_deletion_request('${actor}','${hash(actor)}','${hash(actor)}','2026-08-17','clean');`);
      sql(`SELECT * FROM bff_confirm_account_deletion_request('${actor}','${id}','requested');`);return id;
    };
    const status=(id:string)=>sql(`SELECT status FROM account_deletion_requests WHERE id='${id}';`);
    let failAuth=false;
    const controlledIdentity:DeletionIdentityPort={...identity,async deleteIdentity(actor){if(failAuth)throw new Error('Synthetic Auth outage');await identity.deleteIdentity(actor);}};
    const executeStep=createAccountDeletionStepExecutor({database,objects:objectPort,identity:controlledIdentity});
    const tick=(id:string,repo=repository)=>runAccountDeletionSagaTick({requestId:id,workerId:'isolated-engine-worker',nowMs:Date.now(),leaseDurationMs:60_000,repository:repo,executeStep});
    const run=async(id:string)=>{for(let i=0;i<40;i++){await tick(id);const s=status(id);if(['completed','failed_retryable','manual_review'].includes(s))return s;}throw new Error('Bounded engine run exhausted');};
    const staffRequest=request(staff.id);
    // Lease held by one worker must prevent another, and wrong identity/step/token is rejected.
    const first=await repository.claimLease({requestId:staffRequest,workerId:'isolated-engine-first',nowMs:Date.now(),leaseDurationMs:60_000});
    assert.ok(first.claimed&&first.leaseToken);
    assert.equal((await tick(staffRequest)).outcome,'lease_not_acquired');
    const lease:DeletionLease={requestId:staffRequest,leaseToken:first.leaseToken!,accountKind:'staff',stepCode:'access_frozen'};
    await assert.rejects(database.context({...lease,leaseToken:randomUUID()}));
    await assert.rejects(database.context({...lease,accountKind:'owner'}));
    await assert.rejects(database.context({...lease,stepCode:'profile_deleted'}));
    sql(`UPDATE account_deletion_requests SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE id='${staffRequest}';`);
    await assert.rejects(database.context(lease));pass('live lease, identity kind, step order and two-worker fencing');
    // Lost record acknowledgement after a committed DB effect: replay uses durable receipt.
    let dropRecord=true;
    const flakyRepo={...repository,async recordStepResult(i:Parameters<AccountDeletionSagaRepository['recordStepResult']>[0]){
      if(i.stepCode==='staff_access_revoked'&&dropRecord){dropRecord=false;throw new Error('Synthetic lost acknowledgement');}
      return repository.recordStepResult(i);
    }};
    await tick(staffRequest); // freeze
    const bannedLogin=await staffClient.auth.signInWithPassword({email:staff.email,password:staff.password});
    assert.equal(bannedLogin.error?.code,'user_banned');
    assert.equal(sql(`BEGIN;SET LOCAL ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${staff.id}',true);SELECT count(*) FROM events;ROLLBACK;`).split('\n').at(-2),'0');
    assert.throws(()=>sql(`BEGIN;SET LOCAL ROLE authenticated;SELECT set_config('request.jwt.claim.sub','${staff.id}',true);INSERT INTO events VALUES('${randomUUID()}','${staff.id}','${market}','{}','{}');COMMIT;`));
    assert.equal((await tick(staffRequest,flakyRepo)).outcome,'repository_unavailable');
    assert.equal(sql(`SELECT count(*) FROM staff_relationships WHERE staff_id='${staff.id}';`),'0');
    await tick(staffRequest);
    assert.equal(sql(`SELECT affected_count FROM account_deletion_cleanup_steps WHERE request_id='${staffRequest}' AND step_code='staff_access_revoked';`),'2');
    pass('freeze blocks existing JWT reads; committed step survives lost acknowledgement');
    assert.equal(await run(staffRequest),'completed');
    assert.equal(await identity.isAbsent(staff.id),true);
    assert.equal(sql(`SELECT count(*) FROM auth.sessions WHERE user_id='${staff.id}';`),'0');
    assert.equal(sql(`SELECT count(*) FROM markets WHERE owner_id='${owner.id}';`),'1');
    const retained=sql(`SELECT row_to_json(e) FROM events e WHERE id='${sale}';`);
    assert.ok(!retained.includes(staff.id)&&!retained.includes(staff.email));assert.equal(JSON.parse(retained).payload.amount,99);
    assert.equal(sql(`SELECT active_actor_id IS NULL FROM account_deletion_requests WHERE id='${staffRequest}';`),'t');
    pass('real Auth staff deletion removes sessions and attribution, preserves owner sales/workspace');
    for(const role of ['anon','authenticated','service_role']) {
      assert.throws(()=>sql(`BEGIN;SET LOCAL ROLE ${role};SELECT * FROM deletion_engine_private.objects;ROLLBACK;`));
      if(role!=='service_role')assert.throws(()=>sql(`BEGIN;SET LOCAL ROLE ${role};SELECT bff_account_deletion_engine('${staffRequest}','${randomUUID()}','access_frozen','staff','context',NULL);ROLLBACK;`));
    }
    pass('private manifests/receipts inaccessible; client execution denied');
    const ownerRequest=request(owner.id);
    deleteFailure=[...keys].sort()[5];
    assert.equal(await run(ownerRequest),'failed_retryable');
    assert.equal(sql(`SELECT count(*) FROM profiles WHERE id='${owner.id}';`),'1');
    assert.equal(sql(`SELECT count(*) FROM product_cover_photos WHERE owner_id='${owner.id}';`),'23');
    const already=[...deletes.keys()];assert.ok(already.length>0&&already.length<23);
    deleteFailure=null;
    // SDK HEAD 403 cannot certify absence; no profile/metadata cleanup follows it.
    headFailure=[...keys].sort()[0];
    assert.equal(await run(ownerRequest),'failed_retryable');
    assert.equal(sql(`SELECT count(*) FROM profiles WHERE id='${owner.id}';`),'1');
    for(const k of already)assert.equal(deletes.get(k),1);
    assert.ok(objects.has(foreignKey));pass('partial S3 failure resumes without re-deleting acknowledged keys; 403 is not absence');
    headFailure=null;
    sql(`CREATE FUNCTION public.synthetic_cleanup_fault() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='synthetic rollback';END$$;
      CREATE TRIGGER synthetic_cleanup_fault BEFORE DELETE ON markets FOR EACH ROW EXECUTE FUNCTION synthetic_cleanup_fault();`);
    assert.equal(await run(ownerRequest),'manual_review');
    assert.equal(sql(`SELECT count(*) FROM product_cover_photos WHERE owner_id='${owner.id}';`),'23');
    assert.equal(sql(`SELECT count(*) FROM products WHERE owner_id='${owner.id}';`),'1');
    assert.equal(sql(`SELECT count(*) FROM markets WHERE owner_id='${owner.id}';`),'1');
    assert.equal(sql(`SELECT count(*) FROM deletion_engine_private.receipts WHERE request_id='${ownerRequest}' AND step='operational_data_cleaned';`),'0');
    sql('DROP TRIGGER synthetic_cleanup_fault ON markets;DROP FUNCTION synthetic_cleanup_fault();');
    pass('operational cleanup transaction rolls back metadata/product deletes and receipt on failure');
    failAuth=true;
    assert.equal(await run(ownerRequest),'failed_retryable');
    assert.equal(sql(`SELECT count(*) FROM profiles WHERE id='${owner.id}';`),'0');
    assert.equal(await identity.isAbsent(owner.id),false);
    assert.equal(sql(`SELECT count(*) FROM markets WHERE owner_id='${other.id}';`),'1');
    failAuth=false;assert.equal(await run(ownerRequest),'completed');
    assert.equal(await identity.isAbsent(owner.id),true);
    assert.ok(objects.has(foreignKey));assert.ok(keys.every(k=>!objects.has(k)));
    assert.equal(sql(`SELECT count(*) FROM deletion_engine_private.objects WHERE request_id='${ownerRequest}';`),'0');
    assert.equal((await tick(ownerRequest)).outcome,'lease_not_acquired');
    pass('owner batch cleanup, Auth-last retry and terminal completion; other owner untouched');
    const billRequest=request(blocked.id);assert.equal(await run(billRequest),'manual_review');
    assert.equal(sql(`SELECT count(*) FROM deletion_engine_private.frozen WHERE request_id='${billRequest}';`),'0');
    assert.equal(await identity.isAbsent(blocked.id),false);
    const unknownRequest=request(unknown.id);sql('CREATE TABLE public.unreviewed_identity_data(owner_id uuid);');
    assert.equal(await run(unknownRequest),'manual_review');
    sql('DROP TABLE public.unreviewed_identity_data;');
    assert.equal(sql(`SELECT count(*) FROM profiles WHERE id='${unknown.id}';`),'1');
    pass('billing and unreviewed schema stop before destructive work');
    sql(`INSERT INTO product_cover_photos VALUES('${randomUUID()}','${unknown.id}',${q(foreignKey)},NULL);`);
    assert.equal(await run(unknownRequest),'manual_review');assert.ok(objects.has(foreignKey));
    assert.equal(sql(`SELECT count(*) FROM profiles WHERE id='${unknown.id}';`),'1');
    pass('cross-owner object key in metadata is rejected without deleting the other object');
    // Restart actual PG, retaining its disposable container disk only; no host mount or backup.
    docker(['restart',db]);
    for(let i=0;i<60;i++){try{sql('SELECT 1;');break;}catch{await new Promise(r=>setTimeout(r,100));}}
    assert.equal(status(ownerRequest),'completed');assert.equal(status(staffRequest),'completed');
    assert.equal(sql(`SELECT count(*) FROM deletion_engine_private.receipts WHERE request_id IN ('${ownerRequest}','${staffRequest}');`), '17');
    pass('PostgreSQL restart preserves completion and durable receipts');
    mkdirSync('.codex-artifacts',{recursive:true});
    writeFileSync('.codex-artifacts/account-deletion-engine-acceptance.json',JSON.stringify({at:new Date().toISOString(),checks,scope:'disposable PostgreSQL + real GoTrue + S3 HTTP protocol fixture',productionEnabled:false,realR2:false},null,2));
  } finally {
    objectClient.destroy();await new Promise<void>(resolve=>s3.close(()=>resolve()));
    for(const [name,started] of [[auth,startedAuth],[db,startedDb]] as const) if(started){
      const c=JSON.parse(docker(['inspect',name]))[0];assert.equal(c.Config.Labels['feria-purpose'],purpose);
      assert.equal(c.HostConfig.NetworkMode,network);assert.equal((c.Mounts??[]).filter((m:{Type:string})=>m.Type==='bind').length,0);
      docker(['rm','-fv',name]);
    }
    if(startedNetwork){const n=JSON.parse(docker(['network','inspect',network]))[0];assert.equal(n.Labels['feria-purpose'],purpose);assert.equal(Object.keys(n.Containers??{}).length,0);docker(['network','rm',network]);}
  }
  console.log(`PASS isolated deletion engine (${checks.length} scenarios); disposable infrastructure removed`);
}
void main().catch(error=>{console.error(error instanceof Error?error.message:'Isolated engine verification failed');process.exitCode=1;});
