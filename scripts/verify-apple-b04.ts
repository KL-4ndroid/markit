// One disposable batch: real PostgreSQL, GoTrue and exported HTTP handlers; synthetic signed Apple API.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer, type Server} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {SignedDataVerifier,Environment,type StatusResponse} from '@apple/app-store-server-library';
import {startCandidateServices} from './lib/account-deletion-candidate-services';
import {createAppleSignedFixture} from '../tests/fixtures/apple-signed-fixture';
import {createAppleVerificationAdapter,createAppleSdk} from '../lib/subscription/apple-verification.server';
import {createApplePostgresRepository} from '../lib/subscription/apple-repository.server';
import {createAppleHandlers} from '../lib/subscription/apple-handlers.server';
import {CURRENT_SUBSCRIPTION_PRICE_CATALOG,SUBSCRIPTION_PRICE_CATALOG} from '../lib/subscription/subscription-pricing';

const purpose='apple-b04',databaseName='stallight_b04_test';
const read=(p:string)=>readFileSync(p,'utf8');
async function listen(server:Server){await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert.ok(address&&typeof address==='object');return 'http://127.0.0.1:'+address.port;}
async function main(){
 const b05=process.argv[2]==='--b05-isolated';
 assert.deepEqual(process.argv.slice(2),[b05?'--b05-isolated':'--isolated']);
 assert.ok(!process.env.DOCKER_HOST&&!process.env.DOCKER_CONTEXT&&!process.env.VERCEL);
 assert.ok(!Object.keys(process.env).some(k=>/SUPABASE|(^|_)R2_|APPLE_.*KEY|DATABASE_URL/.test(k)&&process.env[k]),'Provider credentials refused');
 for(const p of ['.env','.env.local','.env.production','.env.production.local'])assert.ok(!existsSync(p),'Active env file refused');
 const docker=(args:string[],input?:string)=>execFileSync('docker',['--context','desktop-linux',...args],{input,encoding:'utf8',timeout:90000,maxBuffer:4*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
 assert.equal(docker(['context','inspect','desktop-linux','--format','{{.Endpoints.docker.Host}}']),'npipe:////./pipe/dockerDesktopLinuxEngine');
 const db='apple-b04-'+randomUUID(),network=db+'-net';let dbStarted=false,netStarted=false;
 let services:Awaited<ReturnType<typeof startCandidateServices>>|undefined,pool:Pool|undefined;
 const servers:Server[]=[];const cryptographic=createAppleSignedFixture();const checks:string[]=[];
 const pass=(name:string)=>{checks.push(name);console.log('PASS B04 '+name);};
 const sql=(source:string)=>docker(['exec','-i',db,'psql','-h','127.0.0.1','-XqAt','-U','postgres','-d',databaseName,'-v','ON_ERROR_STOP=1'],source);
 try{
  docker(['network','create','--label','feria-purpose='+purpose,network]);netStarted=true;
  docker(['run','--rm','-d','--name',db,'--network',network,'--label','feria-purpose='+purpose,'-p','127.0.0.1::5432','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB='+databaseName,'postgres:17-alpine']);dbStarted=true;
  for(let i=0;i<80;i++){try{sql('SELECT 1');break;}catch{if(i===79)throw Error('DB unavailable');await new Promise(r=>setTimeout(r,100));}}
  sql('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;');
  services=await startCandidateServices({docker,db,network,purpose,databaseName});
  const users=await services.users();
  sql('CREATE TABLE public.profiles(id uuid PRIMARY KEY);CREATE TABLE public.staff_relationships(owner_id uuid,staff_id uuid,status text);CREATE TABLE public.markets(id uuid PRIMARY KEY,owner_id uuid,name text);');
  for(const u of Object.values(users))sql(`INSERT INTO public.profiles VALUES('${u.id}');`);
  for(const p of ['063_add_subscription_accounts.sql','066_add_subscription_price_catalog_foundation.sql','067_add_billing_event_transaction_ledger.sql'])sql(read('supabase/migrations/'+p));
  sql(read('docs/subscription/drafts/APPLE_B04_LOCAL_WRITER.sql'));
  sql(`INSERT INTO public.staff_relationships VALUES('${users.owner.id}','${users.staff.id}','active');INSERT INTO public.markets VALUES(gen_random_uuid(),'${users.owner.id}','B04 business data must survive');`);
  const d=JSON.parse(docker(['inspect',db]))[0];assert.equal(d.HostConfig.PortBindings['5432/tcp'][0].HostIp,'127.0.0.1');
  pool=new Pool({host:'127.0.0.1',port:Number(d.NetworkSettings.Ports['5432/tcp'][0].HostPort),database:databaseName,user:'postgres',max:8,connectionTimeoutMillis:3000});
  const store=createApplePostgresRepository(pool,'sandbox');
  const context=await store.context(users.owner.id),otherContext=await store.context(users.other.id),adminContext=await store.context(users.legacy.id);
  for(const p of Object.values(CURRENT_SUBSCRIPTION_PRICE_CATALOG))sql(`INSERT INTO public.subscription_price_versions(id,plan_code,cadence,currency,amount_minor,price_policy,commercial_status,effective_at) VALUES('${p.id}','${p.planCode}','${p.cadence}','TWD',${p.amountMinor},'standard','active',clock_timestamp()-interval '1 day');`);
  const pro='fixture.stallight.pro.monthly',team='fixture.stallight.team.monthly';
  sql(`INSERT INTO native_billing_private.mappings VALUES('sandbox','${pro}','pro_monthly_twd_2026_10_v1','active'),('sandbox','${team}','team_monthly_twd_2026_10_v1','active');`);
  sql(`INSERT INTO public.subscription_accounts(owner_id,plan_code,plan_source,billing_status,entitlement_status) VALUES('${users.legacy.id}','team','admin','none','active');`);
  await services.startRest();
  pass('isolated target / original063066067 / current prices / real Auth ready');
  for(const role of ['anon','authenticated','service_role']){
   const client=await pool.connect();try{await client.query('BEGIN');await client.query('SET LOCAL ROLE '+role);await assert.rejects(client.query("SELECT native_billing_private.command('binding',$1,'{}')",[users.owner.id]),e=>(e as{code:string}).code==='42501');}finally{await client.query('ROLLBACK');client.release();}
  }
  await assert.rejects(store.context(users.staff.id));pass('anonymous / ordinary / service / staff writer denial');
  assert.deepEqual(Object.values(CURRENT_SUBSCRIPTION_PRICE_CATALOG).map(p=>p.amountMinor),[59,588,249,2490]);assert.equal(SUBSCRIPTION_PRICE_CATALOG.pro_monthly_twd_launch_v1.amountMinor,199);
  assert.throws(()=>createAppleSdk({environment:'sandbox',bundleId:'com.stallight.fixture',subscriptionGroupId:'777',roots:[cryptographic.root],signingKey:'fixture',keyId:'fixture',issuerId:randomUUID()}));pass('production constructor rejects non-Apple root; historical price unchanged');
  const identity={environment:'sandbox' as const,bundleId:'com.stallight.fixture',subscriptionGroupId:'777'};
  const verifier=new SignedDataVerifier([cryptographic.root],false,Environment.SANDBOX,identity.bundleId);
  let state={productId:pro,transactionId:'10001',originalTransactionId:'10000',appAccountToken:context.expectedAccountBindingToken,status:1,renew:true,expired:false,revoked:false};
  const periodClock=Date.now();
  function transaction(overrides:object={}){const now=Date.now();return {environment:'Sandbox',bundleId:identity.bundleId,subscriptionGroupIdentifier:'777',type:'Auto-Renewable Subscription',inAppOwnershipType:'PURCHASED',quantity:1,productId:state.productId,transactionId:state.transactionId,originalTransactionId:state.originalTransactionId,appAccountToken:state.appAccountToken,purchaseDate:periodClock-86400000,expiresDate:state.expired?periodClock-1000:periodClock+86400000,signedDate:now,...(state.revoked?{revocationDate:periodClock-1}:{}),...overrides};}
  let providerFailure=false,delayNext=false,releaseOld:(()=>void)|undefined;
  const provider=createServer((_req,res)=>{const current={...state};void(async()=>{if(providerFailure){res.writeHead(503).end();return;}const tx=transaction();const signedTx=cryptographic.sign(tx),renewal=cryptographic.sign({environment:'Sandbox',originalTransactionId:current.originalTransactionId,productId:current.productId,appAccountToken:current.appAccountToken,autoRenewStatus:current.renew?1:0,signedDate:Date.now()});if(delayNext){delayNext=false;await new Promise<void>(r=>{releaseOld=r;});}res.setHeader('content-type','application/json');res.end(JSON.stringify({environment:'Sandbox',bundleId:identity.bundleId,data:[{subscriptionGroupIdentifier:'777',lastTransactions:[{originalTransactionId:current.originalTransactionId,status:current.status,signedTransactionInfo:signedTx,signedRenewalInfo:renewal}]}]}));})().catch(()=>res.writeHead(500).end());});
  servers.push(provider);const providerUrl=await listen(provider);
  const adapter=(c:typeof context)=>createAppleVerificationAdapter({...identity,verifier,client:{async getAllSubscriptionStatuses(ref){assert.match(ref,/^\d+$/);const r=await fetch(providerUrl+'/inApps/v1/subscriptions/'+ref,{signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('synthetic provider unavailable');return await r.json() as StatusResponse;}},mapping:p=>store.mapping(c,p),now:Date.now});
  const info=services.connectionInfo();
  const handlers=createAppleHandlers({enabled:true,identity,verifier,store,adapter,now:Date.now,authenticate:async request=>{const token=request.headers.get('authorization');if(!token)return null;const r=await fetch(info.authUrl+'/user',{headers:{authorization:token}});return r.ok?(await r.json()).id:null;}});
  let dropPurchaseAck=false;
  const api=createServer((req,res)=>{void(async()=>{const chunks:Buffer[]=[];for await(const c of req)chunks.push(Buffer.from(c));const request=new Request('http://127.0.0.1'+req.url,{method:'POST',headers:req.headers as Record<string,string>,body:Buffer.concat(chunks)});const response=await(req.url==='/notification'?handlers.notification(request):handlers.purchase(request));if(dropPurchaseAck&&req.url!=='/notification'&&response.ok){dropPurchaseAck=false;res.destroy();return;}res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));})().catch(()=>res.writeHead(500).end());});servers.push(api);const origin=await listen(api);
  const proof=(overrides:object={})=>({schemaVersion:1,store:'apple_app_store',productId:state.productId,opaqueVerificationPayload:cryptographic.sign(transaction(overrides))});
  const purchase=async(payload:unknown=proof(),actor=users.owner.id)=>{const r=await fetch(origin+'/purchase',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+services!.token(actor)},body:JSON.stringify(payload)});return {status:r.status,body:await r.json() as{code:string}};};
  const account=()=>JSON.parse(sql(`SELECT to_jsonb(a) FROM public.subscription_accounts a WHERE owner_id='${users.owner.id}';`));
  if(b05){
   const {runAppleB05Integration}=await import('./lib/apple-b05-integration');
   await runAppleB05Integration({origin,ownerId:users.owner.id,accessToken:services.token(users.owner.id),accountToken:context.expectedAccountBindingToken,productId:pro,
    proof,account,sql,dropAck:()=>{dropPurchaseAck=true;}});return;
  }
  const requests=await Promise.all([purchase(),purchase()]);assert.ok(requests.every(r=>r.status===200),JSON.stringify(requests));assert.equal(account().plan_code,'pro');assert.equal(account().plan_source,'billing');assert.equal(Number(sql('SELECT count(*) FROM public.billing_subscriptions;')),1);pass('real HTTP / verified signatures / concurrent purchase single subscription');
  const replay=await purchase();assert.equal(replay.body.code,'duplicate');pass('purchase replay is idempotent');
  state={...state,transactionId:'100010'};dropPurchaseAck=true;await assert.rejects(purchase());assert.equal((await purchase()).body.code,'duplicate');assert.equal(Number(sql('SELECT count(*) FROM public.billing_subscriptions;')),1);assert.equal(sql("SELECT provider_transaction_ref FROM public.billing_transactions LIMIT 1;"),'');pass('winning commit acknowledgement loss retries without duplicate subscription or invented charge');
  assert.equal((await purchase(proof(),users.other.id)).status,503);assert.equal(Number(sql('SELECT count(*) FROM public.billing_subscriptions;')),1);pass('mismatched authenticated owner cannot claim subscription');
  const original=proof();original.opaqueVerificationPayload=original.opaqueVerificationPayload.slice(0,-20)+'aaaaaaaaaaaaaaaaaaaa';assert.equal((await purchase(original)).status,503);
  for(const bad of [{bundleId:'com.wrong.app'},{environment:'Production'},{productId:'unknown'},{appAccountToken:otherContext.expectedAccountBindingToken},{type:'Consumable'},{inAppOwnershipType:'FAMILY_SHARED'}])assert.equal((await purchase(proof(bad))).status,503);
  pass('tampered signature / wrong app environment product account type ownership denied');
  assert.equal((await purchase(proof({offerType:1}))).body.code,'policy_review_required');pass('unconfigured trial or offer is explicitly held for policy review');
  sql(`UPDATE native_billing_private.mappings SET status='candidate' WHERE product_id='${pro}';`);assert.equal((await purchase()).status,503);sql(`UPDATE native_billing_private.mappings SET status='active' WHERE product_id='${pro}';`);pass('candidate mapping cannot authorize paid access');
  providerFailure=true;assert.equal((await purchase()).status,503);providerFailure=false;assert.equal(account().entitlement_status,'active');pass('provider outage preserves previous entitlement and is retryable');
  async function notification(payload:string){const r=await fetch(origin+'/notification',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({signedPayload:payload})});return {status:r.status,body:await r.json() as{code:string}};}
  function notificationProof(overrides:object={}){return cryptographic.sign({notificationType:'DID_RENEW',notificationUUID:randomUUID(),version:'2.0',signedDate:Date.now(),data:{environment:'Sandbox',bundleId:identity.bundleId,signedTransactionInfo:proof().opaqueVerificationPayload},...overrides});}
  state={...state,transactionId:'10002',renew:false};await new Promise(r=>setTimeout(r,5));const cancel=notificationProof();assert.equal((await notification(cancel)).status,200);assert.equal(account().billing_status,'cancel_at_period_end');assert.equal(account().entitlement_status,'active');assert.equal((await notification(cancel)).body.code,'notification_duplicate');pass('cancel renewal retains verified period and notification dedupe');
  state={...state,transactionId:'10003',productId:team,renew:true};await new Promise(r=>setTimeout(r,5));const renewal=notificationProof();providerFailure=true;assert.equal((await notification(renewal)).status,503);providerFailure=false;assert.equal((await notification(renewal)).status,200);assert.equal(account().plan_code,'team');pass('durable notification retry recovers to latest plan');
  const oldProof=proof({transactionId:'10001',productId:pro});oldProof.productId=pro;assert.equal((await purchase(oldProof)).status,200);assert.equal(account().plan_code,'team');pass('late purchase proof queries current state rather than reverting plan');
  state={...state,transactionId:'10004',status:4};await new Promise(r=>setTimeout(r,5));assert.equal((await notification(notificationProof())).body.code,'policy_review_required');assert.equal(account().plan_code,'team');assert.equal(account().entitlement_status,'active');pass('unapproved grace policy held; no invented extension');
  state={...state,transactionId:'10005',status:2,expired:true};await new Promise(r=>setTimeout(r,5));assert.equal((await notification(notificationProof())).status,200);assert.equal(account().entitlement_status,'inactive');assert.equal(Number(sql('SELECT count(*) FROM public.markets;')),1);pass('expiry restricts entitlement while preserving business records');
  state={...state,transactionId:'10006',status:1,expired:false,revoked:true};await new Promise(r=>setTimeout(r,5));assert.equal((await notification(notificationProof())).status,200);assert.equal(account().billing_status,'refunded');assert.equal(account().entitlement_status,'inactive');pass('verified revocation prevents access even with future expiration');
  state={...state,transactionId:'10007',status:1,revoked:false,productId:pro};await new Promise(r=>setTimeout(r,5));delayNext=true;const slow=purchase();for(let i=0;!releaseOld&&i<100;i++)await new Promise(r=>setTimeout(r,5));assert.ok(releaseOld);await new Promise(r=>setTimeout(r,5));state={...state,transactionId:'10008',productId:team};assert.equal((await purchase()).status,200);releaseOld();const late=await slow;assert.equal(late.body.code,'stale');assert.equal(account().plan_code,'team');pass('slow old authoritative query cannot override newer concurrent query');
  // Throw after SQL apply, before COMMIT: snapshot, receipt, F3B audit and projection must all roll back.
  const before=sql("SELECT md5(COALESCE((SELECT jsonb_agg(to_jsonb(t))::text FROM public.billing_subscriptions t),''))||':'||(SELECT count(*) FROM native_billing_private.receipts)||':'||(SELECT count(*) FROM public.billing_reconciliation_runs);");
  const {createNativeReconciliationService}=await import('../lib/subscription/native-reconciliation.server');
  state={...state,transactionId:'10009',productId:pro};await new Promise(r=>setTimeout(r,5));
  const rollback=createNativeReconciliationService({authenticateOwner:async()=>context,adapter:adapter(context),now:Date.now,repository:{withOwnerTransaction:(owner,work)=>store.repository.withOwnerTransaction(owner,tx=>work({...tx,async applyBillingProjection(v){await tx.applyBillingProjection(v);throw Error('test commit boundary');}}))}});
  assert.equal((await rollback(proof())).code,'repository_unavailable');assert.equal(sql("SELECT md5(COALESCE((SELECT jsonb_agg(to_jsonb(t))::text FROM public.billing_subscriptions t),''))||':'||(SELECT count(*) FROM native_billing_private.receipts)||':'||(SELECT count(*) FROM public.billing_reconciliation_runs);"),before);pass('late failure rolls back F3B snapshot audit receipt and entitlement atomically');
  state={...state,appAccountToken:adminContext.expectedAccountBindingToken,originalTransactionId:'20000',transactionId:'20001'};await new Promise(r=>setTimeout(r,5));assert.equal((await purchase(proof(),users.legacy.id)).body.code,'protected_projection');assert.equal(sql(`SELECT plan_source FROM public.subscription_accounts WHERE owner_id='${users.legacy.id}';`),'admin');pass('admin assignment never overwritten');
  assert.equal((await notification('not-a-jws')).status,400);pass('unverified notification cannot enter inbox');
  const interrupted=notificationProof();const interruptedData=await verifier.verifyAndDecodeNotification(interrupted);const event=interruptedData.notificationUUID!;
  const claim=await store.eventClaim({event,hash:createHash('sha256').update(interrupted).digest('hex'),occurredAt:new Date(interruptedData.signedDate!).toISOString()});assert.ok(claim.lease);assert.equal((await notification(interrupted)).body.code,'notification_processing');
  sql("UPDATE native_billing_private.event_leases SET expires_at=clock_timestamp()-interval '1 second';");assert.equal((await notification(interrupted)).status,200);pass('expired notification lease recovers safely after process interruption');
  const cleanupContext=await store.context(users.cleanup.id);
  async function competing(c:typeof context){
    const tx=transaction({originalTransactionId:'30000',transactionId:'30001',appAccountToken:c.expectedAccountBindingToken});
    const signed=cryptographic.sign(tx),renew=cryptographic.sign({environment:'Sandbox',originalTransactionId:'30000',productId:state.productId,appAccountToken:c.expectedAccountBindingToken,autoRenewStatus:1,signedDate:Date.now()});
    const current=createAppleVerificationAdapter({...identity,verifier,client:{async getAllSubscriptionStatuses(){return {environment:'Sandbox',bundleId:identity.bundleId,data:[{subscriptionGroupIdentifier:'777',lastTransactions:[{originalTransactionId:'30000',status:1,signedTransactionInfo:signed,signedRenewalInfo:renew}]}]};}},mapping:p=>store.mapping(c,p),now:Date.now});
    return createNativeReconciliationService({authenticateOwner:async()=>c,adapter:current,repository:store.repository,now:Date.now})({schemaVersion:1,store:'apple_app_store',productId:state.productId,opaqueVerificationPayload:signed});
  }
  const races=await Promise.all([competing(otherContext),competing(cleanupContext)]);assert.equal(races.filter(r=>r.outcome==='applied').length,1);assert.equal(races.filter(r=>r.code==='reference_owned_elsewhere').length,1);assert.equal(sql("SELECT count(*) FROM public.billing_subscriptions WHERE provider_subscription_ref='30000';"),'1');pass('cross-owner provider-chain race has one winner and no transfer');
  const noProof=await pool.connect();try{await noProof.query('BEGIN; SET LOCAL ROLE stallight_billing_writer');await assert.rejects(noProof.query("SELECT native_billing_private.command('apply',$1,$2)",[users.owner.id,JSON.stringify({key:'0'.repeat(64),snapshot:{ownerId:users.owner.id,origin:'apple_app_store',environment:'sandbox',providerSubscriptionRef:'10000',snapshotHash:'0'.repeat(64)},decision:{outcome:'apply',code:'projection_ready'}})]),e=>(e as Error).message.includes('b04_projection_denied'));}finally{await noProof.query('ROLLBACK');noProof.release();}pass('writer role without verified evidence marker is rejected');
  sql("INSERT INTO public.subscription_price_versions(id,plan_code,cadence,currency,amount_minor,price_policy,commercial_status,effective_at) VALUES('pro_monthly_twd_2027_v1','pro','monthly','TWD',99,'standard','active',clock_timestamp()-interval '1 day');INSERT INTO native_billing_private.mappings VALUES('sandbox','fixture.stallight.pro.next','pro_monthly_twd_2027_v1','active');");
  state={...state,originalTransactionId:'10000',transactionId:'10010',appAccountToken:context.expectedAccountBindingToken,productId:'fixture.stallight.pro.next'};await new Promise(r=>setTimeout(r,5));assert.equal((await purchase()).status,200);assert.equal(account().plan_code,'pro');assert.equal(sql("SELECT provider_price_ref FROM public.billing_subscriptions WHERE provider_subscription_ref='10000';"),'pro_monthly_twd_2027_v1');assert.equal(sql("SELECT amount_minor FROM public.subscription_price_versions WHERE id='pro_monthly_twd_2026_10_v1';"),'59');pass('future DB-owned price version works without editing code or changing old prices');
  sql(`INSERT INTO public.billing_customer_links(owner_id,billing_origin,provider_environment,provider_customer_ref) VALUES('${users.owner.id}','google_play','sandbox','fixture-google-customer');INSERT INTO public.billing_subscriptions(billing_customer_link_id,owner_id,billing_origin,provider_environment,provider_subscription_ref,normalized_plan_code,normalized_cadence,normalized_billing_status,current_period_starts_at,current_period_ends_at,provider_observed_at,snapshot_hash,last_reconciled_at) SELECT id,owner_id,'google_play','sandbox','fixture-google-chain','team','monthly','active',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day',clock_timestamp(),repeat('a',64),clock_timestamp() FROM public.billing_customer_links WHERE billing_origin='google_play';`);
  state={...state,transactionId:'10011'};await new Promise(r=>setTimeout(r,5));assert.equal((await purchase()).body.code,'subscription_conflict');assert.equal(account().plan_code,'pro');assert.equal(sql("SELECT count(*) FROM public.billing_subscriptions WHERE billing_origin='google_play';"),'1');pass('second active origin is held without cancellation refund or replacing valid access');
  assert.equal(sql("SELECT has_function_privilege('authenticated','native_billing_private.command(text,uuid,jsonb)','execute');"),'f');
  assert.equal(sql("SELECT count(*) FROM public.billing_event_inbox WHERE processing_status='processing';"),'0');
  assert.equal(sql('SELECT count(*) FROM public.markets;'),'1');pass('private ACL final readback / durable inbox settled / business data retained');
  mkdirSync('docs/evidence',{recursive:true});writeFileSync('docs/evidence/ios-windows-b04-apple-local-2026-11-20.json',JSON.stringify({schemaVersion:1,batch:'B04',at:new Date().toISOString(),localOnly:true,officialSdk:'3.1.0',signedFixture:'fresh local ES256 x5c chain; SDK cryptographic verification enabled with isolated test root, online checks false ONLY in test',provider:'loopback HTTP substitute; not Apple sandbox',database:'PostgreSQL17 with original063066067 and B04 guarded draft',checks,passed:checks.length,liveStoreKit:false,productionEnabled:false,billingReaderEnabled:false,sources:['lib/subscription/apple-verification.server.ts','lib/subscription/apple-repository.server.ts','lib/subscription/apple-handlers.server.ts','lib/subscription/native-reconciliation.server.ts','lib/subscription/native-reconciliation-decision.ts','lib/subscription/subscription-pricing.ts','lib/subscription/native-store-catalog.ts','scripts/verify-apple-b04.ts','scripts/lib/account-deletion-candidate-services.ts','tests/fixtures/apple-signed-fixture.ts','tests/apple-b04.test.ts','docs/subscription/drafts/APPLE_B04_LOCAL_WRITER.sql','package.json','package-lock.json'].map(path=>({path,sha256:createHash('sha256').update(read(path).replaceAll('\r\n','\n')).digest('hex')}))},null,2)+'\n');
 }finally{
  for(const s of servers){s.closeAllConnections();await new Promise<void>(r=>s.close(()=>r()));}
  await pool?.end();await services?.close();cryptographic.close();
  if(dbStarted){const inspected=JSON.parse(docker(['inspect',db]))[0];assert.equal(inspected.Config.Labels['feria-purpose'],purpose);assert.equal(inspected.HostConfig.NetworkMode,network);docker(['rm','-fv',db]);}
  if(netStarted)docker(['network','rm',network]);console.log('B04 disposable services and signing keys removed');
 }
}
void main().catch(e=>{console.error(String((e as{stderr?:string}).stderr??(e instanceof Error?e.stack:'B04 failed')).slice(0,1800));process.exitCode=1;});
