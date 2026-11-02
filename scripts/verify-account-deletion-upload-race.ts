// Captured SQL + actual session coordinator + deferred PUT stand-in. No cloud access.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {capturedDeletionCatalog,capturedOperationalFixtureDdl,approvedOperationalColumnsDdl,deployedEventGuardsDdl,quoteIdentifier as qi,quoteSql as q} from './lib/account-deletion-catalog-fixture';
import {capturedAccessDefinitions,capturedRuntimeDefinitionsDdl,capturedRuntimeSecurityDdl,capturedRuntimeTriggersDdl,frozenPublicSurfaceDdl,fencedEventAuthorizerDdl,accessCatalogManifestDdl} from './lib/account-deletion-access-fixture';
import {beginDeletionUploadSession} from '../lib/subscription/account-deletion-upload-barrier.server';
import {candidateSourceHashes} from './lib/account-deletion-candidate-sources';

async function main(){
 const mode=process.argv[2],integrated=mode==='--candidate-isolated',handlers=integrated||mode==='--photo-handler-isolated',terminal=handlers||mode==='--terminal-put-isolated'||mode==='--terminal-put-staging-disposable';
 const reconciliation=mode==='--reconciliation-isolated'||terminal;
 const sourceHashes=integrated?candidateSourceHashes():undefined;
 assert.ok(['--isolated','--reconciliation-isolated','--terminal-put-isolated','--terminal-put-staging-disposable','--photo-handler-isolated','--candidate-isolated'].includes(mode));
 assert.deepEqual(process.argv.slice(2),[mode]);assert.ok(!process.env.DOCKER_HOST&&!process.env.DOCKER_CONTEXT&&!process.env.VERCEL&&!process.env.VERCEL_ENV);
 const docker=(args:string[],input?:string)=>execFileSync('docker',['--context','desktop-linux',...args],{input,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
 assert.equal(docker(['context','inspect','desktop-linux','--format','{{.Endpoints.docker.Host}}']),'npipe:////./pipe/dockerDesktopLinuxEngine');
 const db=`deletion-upload-${randomUUID()}`,purpose='account-deletion-upload-race-isolated';
 const network=integrated?db+'-net':'none';let networkCreated=false;
 let live:Awaited<ReturnType<typeof import('./lib/account-deletion-candidate-services')['startCandidateServices']>>|undefined;
 const psql=['exec','-i',db,'psql','-h','127.0.0.1','-XqAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-U','postgres','-d','deletion_engine_test'];
 const sql=(s:string)=>docker(psql,s);const denied=(s:string,code?:string)=>{try{sql(s);assert.fail('SQL must reject');}catch(e){const stderr=String((e as {stderr?:string}).stderr??'');if(code)assert.ok(stderr.includes(code),stderr.slice(0,1000));}};
 const checks:string[]=[],pass=(s:string)=>{checks.push(s);console.log('PASS '+s);};
 const tables=capturedDeletionCatalog().filter(r=>r.detail.kind==='r');
 const insert=(name:string,data:Record<string,unknown>,beforeSql='')=>{const cols=tables.find(r=>r.identity==='public.'+name)!.detail.columns,row={...data};for(const c of cols)if(!c.nullable&&row[c.name]===undefined){
  if(c.type==='uuid')row[c.name]=randomUUID();else if(c.type==='timestamp with time zone')row[c.name]=new Date().toISOString();else if(c.type==='boolean')row[c.name]=false;else if(/^(integer|bigint|numeric)/.test(c.type))row[c.name]=1;else if(c.type==='jsonb')row[c.name]={};else throw Error('Explicit fixture field required '+name+'.'+c.name);
 }sql(`${beforeSql}INSERT INTO public.${qi(name)}(${Object.keys(row).map(qi).join(',')}) VALUES(${Object.entries(row).map(([k,v])=>v===null?'NULL':cols.find(c=>c.name===k)?.type==='jsonb'?q(JSON.stringify(v))+'::jsonb':q(String(v))).join(',')});`);};
 const draft=(file:string)=>{const s=readFileSync('docs/subscription/drafts/'+file,'utf8');assert.match(s,/ROLLBACK;\s*$/);sql(s.replace(/ROLLBACK;\s*$/,'COMMIT;'));};
 const starts:{id:string;token:string;owner:string}[]=[];
 const client={async rpc(name:string,args:Record<string,unknown>){assert.ok(['bff_begin_deletion_upload','bff_bind_deletion_upload','bff_authorize_deletion_upload','bff_finish_deletion_upload','bff_reconcile_deletion_upload','bff_record_deletion_upload_put','bff_get_deletion_upload_drain','bff_read_recorded_photo_upload'].includes(name));
  if(name==='bff_begin_deletion_upload')starts.push({id:String(args.p_id),token:String(args.p_token),owner:String(args.p_owner)});
  if(live)return live.rpc(name,args);
  const values=Object.entries(args).map(([k,v])=>`${k}=>${v===null?'NULL':Array.isArray(v)?'ARRAY['+v.map(x=>q(String(x))).join(',')+']::text[]':typeof v==='object'?q(JSON.stringify(v))+'::jsonb':q(String(v))}`).join(',');
  try{const out=sql(`SELECT public.${name}(${values});`);return {data:out?JSON.parse(out) as unknown:null,error:null};}catch(e){const err=String((e as {stderr?:string}).stderr??'');if(name==='bff_read_recorded_photo_upload')console.error(err.slice(0,700));return {data:null,error:{code:err.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1]??'unknown'}};}
 }};
 const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
 const key=(owner:string,label:string)=>`sales-evidence/7d/${owner}/${label}.webp`;
 let started=false;
 try{
  if(integrated){docker(['network','create','--label',`feria-purpose=${purpose}`,network]);networkCreated=true;}
  docker(['run','--rm','-d','--network',network,'--name',db,'--label',`feria-purpose=${purpose}`,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=deletion_engine_test','postgres:17-alpine']);started=true;
  for(let n=0;n<60;n++){try{sql('SELECT 1');break;}catch{if(n===59)throw Error('Disposable DB unavailable');await new Promise(r=>setTimeout(r,100));}}
  sql('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;');
  if(integrated){const {startCandidateServices}=await import('./lib/account-deletion-candidate-services');live=await startCandidateServices({docker,db,network,purpose});}
  else sql('CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid);');
  sql(`CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
   CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role')$$;
   GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;`);
  sql(capturedOperationalFixtureDdl());sql("CREATE FUNCTION delete_current_user_app_data() RETURNS void LANGUAGE sql AS 'SELECT';");sql(readFileSync('supabase/migrations/071_add_account_deletion_request_foundation.sql','utf8'));
  sql('DROP FUNCTION delete_current_user_app_data();');sql(capturedRuntimeDefinitionsDdl());sql(capturedRuntimeSecurityDdl());
  draft('ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.sql');draft('ACCOUNT_DELETION_ENGINE_2026_11_02.sql');sql(approvedOperationalColumnsDdl());draft('ACCOUNT_DELETION_OPERATIONAL_COVERAGE_2026_11_02.sql');
  const users=await live?.users();
  const owner=users?.owner.id??randomUUID(),other=users?.other.id??randomUUID(),staff=users?.staff.id??randomUUID(),legacy=users?.legacy.id??randomUUID(),product=randomUUID(),otherProduct=randomUUID(),legacyProduct=randomUUID(),market=randomUUID(),sale=randomUUID();
  for(const id of [owner,other,staff,legacy]){if(!live)sql(`INSERT INTO auth.users(id) VALUES('${id}');`);insert('profiles',{id,email:Object.values(users??{}).find(u=>u.id===id)?.email??`${id}@example.test`,display_name:'Synthetic upload race'});}
  for(const id of [owner,other,legacy]){insert('subscription_accounts',{owner_id:id,plan_code:integrated&&id===legacy?'free':'team',plan_source:integrated&&id===legacy?'free':'admin',billing_status:'none',entitlement_status:'active'});insert('account_entitlements',{owner_id:id,product_cover_photo_enabled:true,source:'admin'});}
  if(integrated)insert('subscription_write_guard_settings',{singleton:true,enforce_all:true});
  for(const [id,who] of [[product,owner],[otherProduct,other],[legacyProduct,legacy]])insert('products',{id,owner_id:who,name:'Synthetic product',category:'other',is_active:true,price:10});
  insert('markets',{id:market,owner_id:other,name:'Synthetic market',location:'Synthetic',start_date:'2026-11-02',end_date:'2026-11-02',status:'registered'});
  insert('events',{id:sale,actor_id:other,market_id:market,type:'deal_closed',timestamp:new Date().toISOString(),payload:{totalAmount:10}});
  insert('staff_relationships',{owner_id:other,staff_id:staff,staff_email:'staff@example.test',role:'manager',status:'active',permissions:{can_view:true,can_edit:true,infoLevel:2}});
  const oldId=randomUUID(),newId=randomUUID(),oldA=`product-cover-photos/${owner}/${product}/${oldId}/v1/display.webp`,oldB=oldA.replace('display','thumbnail');
  insert('product_cover_photos',{id:oldId,owner_id:owner,product_id:product,status:'uploaded',version:1,display_object_key:oldA,thumbnail_object_key:oldB,display_content_hash:'a'.repeat(64),thumbnail_content_hash:'b'.repeat(64),display_mime_type:'image/webp',thumbnail_mime_type:'image/webp',display_size_bytes:10,thumbnail_size_bytes:5,width:1,height:1});
  // Explicit fixture defaults needed by the captured claim INSERTs (catalog capture has no defaults).
  sql(`CREATE UNIQUE INDEX product_cover_photos_one_active_per_product ON public.product_cover_photos(product_id) WHERE deleted_at IS NULL;
   ALTER TABLE public.sale_photo_evidence ALTER COLUMN id SET DEFAULT gen_random_uuid();
   ALTER TABLE public.sale_photo_evidence ALTER COLUMN created_at SET DEFAULT clock_timestamp();ALTER TABLE public.sale_photo_evidence ALTER COLUMN updated_at SET DEFAULT clock_timestamp();
   ALTER TABLE public.product_cover_photos ALTER COLUMN created_at SET DEFAULT clock_timestamp();ALTER TABLE public.product_cover_photos ALTER COLUMN updated_at SET DEFAULT clock_timestamp();`);
  sql(deployedEventGuardsDdl());sql(capturedRuntimeTriggersDdl());draft('ACCOUNT_DELETION_ACCESS_FENCE_2026_11_02.sql');
  sql(fencedEventAuthorizerDdl(sql("SELECT pg_get_functiondef('deletion_engine_private.authorize_event_change(jsonb,jsonb,text)'::regprocedure);")));
  const defs=JSON.parse(sql("SELECT jsonb_object_agg(p.proname||'('||oidvectortypes(p.proargtypes)||')',pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';"));sql(frozenPublicSurfaceDdl(defs));
  draft('ACCOUNT_DELETION_UPLOAD_BARRIER_2026_11_02.sql');
  if(reconciliation)draft('ACCOUNT_DELETION_UPLOAD_RECONCILIATION_2026_11_02.sql');
  if(terminal)draft('ACCOUNT_DELETION_TERMINAL_PUT_2026_11_02.sql');
  if(handlers)draft('ACCOUNT_DELETION_PHOTO_READBACK_2026_11_02.sql');
  sql(accessCatalogManifestDdl());sql('SELECT deletion_engine_private.assert_catalog();');
  await live?.startRest();
  denied(`BEGIN ISOLATION LEVEL REPEATABLE READ;SELECT bff_begin_deletion_upload('${randomUUID()}','${randomUUID()}','${other}','${other}');ROLLBACK;`,'40001');
  const request=(actor:string)=>{const id=sql(`SELECT request_id FROM bff_create_account_deletion_request('${actor}','${hash(actor)}','${hash(actor)}','2026-08-17','clean');`);sql(`SELECT * FROM bff_confirm_account_deletion_request('${actor}','${id}','requested');`);const r=JSON.parse(sql(`SELECT bff_claim_account_deletion_lease('${id}','upload-race-fixture',clock_timestamp(),300);`));return {id,actor,token:r.leaseToken as string,kind:r.snapshot.accountKind as string};};
  type Req=ReturnType<typeof request>;
  const call=(r:Req,step:string,action='execute')=>sql(`SELECT bff_account_deletion_engine('${r.id}','${r.token}',${q(step)},${q(r.kind)},${q(action)},NULL);`);
  const step=(r:Req,s:string)=>{let result=JSON.parse(call(r,s));if(s==='access_frozen')result=JSON.parse(call(r,s,'complete_external'));sql(`SELECT bff_record_account_deletion_step('${r.id}','${r.token}',${q(s)},'completed',${result.affectedCount},${q(result.evidenceHash)},NULL);`);};
  if(handlers){
   const {checkPhotoHandlerReceipts}=await import('./lib/account-deletion-photo-handler-checks');
   await checkPhotoHandlerReceipts({sql,denied,client,insert,request,step,starts,owner,other,product,otherProduct,live,staff,legacy,sourceHashes});
   if(sourceHashes)assert.deepEqual(candidateSourceHashes(),sourceHashes,'Candidate sources changed during verification');
   return;
  }
  if(terminal){
   const {checkTerminalPuts}=await import('./lib/account-deletion-terminal-put-checks');
   await checkTerminalPuts({sql,denied,client,insert,request,step,starts,owner,other,legacy,market,sale},mode==='--terminal-put-staging-disposable');
   return;
  }
  if(reconciliation){
   const {checkUploadReconciliation}=await import('./lib/account-deletion-upload-reconciliation-checks');
   async function whileLocked(leaderSql:string,follower:()=>void){
    const child=spawn('docker',['--context','desktop-linux',...psql],{stdio:['pipe','pipe','pipe']});let output='';
    const done=new Promise<number|null>((resolve,reject)=>{child.on('close',resolve);child.on('error',reject);});
    let timer:ReturnType<typeof setTimeout>|undefined;
    const ready=new Promise<void>((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Review lock timeout')),10000);child.stdout.on('data',d=>{output+=d;if(output.includes('REVIEW_LOCK_HELD'))resolve();});});
    child.stdin.end(leaderSql);
    try{await ready;if(timer)clearTimeout(timer);follower();assert.equal(await done,0);}
    finally{if(timer)clearTimeout(timer);child.kill();await done;}
   }
   await checkUploadReconciliation({sql,denied,client,insert,request,step,call,starts,owner,other,staff,product,otherProduct,legacy,legacyProduct,market,sale,oldA,oldB,newId,whileLocked});
   return;
  }
  const session=await beginDeletionUploadSession(client,owner,owner);
  sql(`SELECT claim_product_cover_photo_upload('${owner}','${product}','${newId}',2::bigint,15,1000000,false);`);
  const a=`product-cover-photos/${owner}/${product}/${newId}/v2/display.webp`,b=a.replace('display','thumbnail');
  await session.bind({kind:'product',entityId:product,keys:[a,b,oldA,oldB],writeKeys:[a,b],expected:{photoId:newId,version:2}});
  pass('captured product claim binds pending photo/version and preserves old/new keys before PUT');
  let release!:()=>void,entered!:()=>void;const began=new Promise<void>(r=>entered=r),wait=new Promise<void>(r=>release=r);let writes=0;
  const put=session.put(a,async()=>{entered();await wait;writes++;return true;});await began;
  const o=request(owner);step(o,'access_frozen');step(o,'staff_access_revoked');
  denied(`SELECT bff_account_deletion_engine('${o.id}','${o.token}','object_manifest_built','owner','context',NULL);`,'55P03');
  sql(`UPDATE deletion_upload_private.attempts SET deadline=clock_timestamp()-interval '1 second' WHERE owner_id='${owner}';`);
  denied(`SELECT deletion_engine_private.assert_uploads_quiescent('${owner}');`,'55000');
  sql(`UPDATE deletion_upload_private.attempts SET deadline=clock_timestamp()+interval '5 minutes' WHERE owner_id='${owner}';`);
  release();await put;
  await assert.rejects(()=>session.put(b,async()=>{writes++;return true;}));assert.equal(writes,1);
  const finalize=capturedAccessDefinitions().routines.find(r=>r.detail.name==='finalize_product_cover_photo_upload')!;
  denied(`SELECT public.finalize_product_cover_photo_upload(${finalize.detail.argumentTypes.split(', ').map((t,i)=>finalize.detail.argumentNames?.[i]==='p_actor_id'?q(owner):finalize.detail.argumentNames?.[i]==='p_product_id'?q(product):`NULL::${t}`).join(',')});`,'55000');
  await session.finish();await assert.rejects(()=>session.put(a,async()=>true));
  step(o,'object_manifest_built');assert.equal(sql(`SELECT count(*) FROM deletion_engine_private.objects WHERE request_id='${o.id}';`),'4');
  pass('freeze permits already-issued PUT to return but fences the next PUT/finalize; expired open lease never proves quiescence; manifest contains four old/new keys');
  const s=await beginDeletionUploadSession(client,staff,other),attempt=randomUUID();
  const evidence=JSON.parse(sql(`SELECT to_jsonb(bff_claim_sale_photo_evidence_upload('${staff}','${other}','${market}','${sale}',NULL,'${attempt}',clock_timestamp()));`));
  const sa=key(other,'staff-image'),sb=key(other,'staff-thumbnail');await s.bind({kind:'sale',entityId:evidence.id,keys:[sa,sb],writeKeys:[sa,sb],expected:{attemptId:attempt}});
  const st=request(staff);step(st,'access_frozen');step(st,'staff_access_revoked');
  denied(`SELECT bff_account_deletion_engine('${st.id}','${st.token}','staff_attribution_anonymized','staff','context',NULL);`,'55P03');
  await assert.rejects(()=>s.put(sa,async()=>true));await s.finish();
  for(const code of ['staff_attribution_anonymized','operational_data_cleaned','profile_deleted'])step(st,code);
  assert.equal(sql(`SELECT count(*) FROM deletion_upload_private.attempts WHERE owner_id='${other}' AND actor_id IS NULL AND ${q(sa)}=ANY(keys);`),'1');
  pass('captured staff sale claim is blocked by staff freeze; settle remains callable; profile cleanup removes actor identity while retaining other-brand keys');
  const uncertain=await beginDeletionUploadSession(client,other,other),p=randomUUID();
  sql(`SELECT claim_product_cover_photo_upload('${other}','${otherProduct}','${p}',1::bigint,15,1000000,false);`);
  const ua=`product-cover-photos/${other}/${otherProduct}/${p}/v1/display.webp`,ub=ua.replace('display','thumbnail');await uncertain.bind({kind:'product',entityId:otherProduct,keys:[ua,ub],writeKeys:[ua,ub],expected:{photoId:p,version:1}});
  await assert.rejects(()=>uncertain.put(ua,async()=>{throw Error('Injected unknown PUT outcome');}));await uncertain.finish();
  denied(`SELECT deletion_engine_private.assert_uploads_quiescent('${other}');`,'55000');
  denied(`UPDATE deletion_upload_private.attempts SET state='settled' WHERE false;SELECT bff_finish_deletion_upload(id,'${randomUUID()}','settled') FROM deletion_upload_private.attempts WHERE state='uncertain';`,'55000');
  pass('unknown PUT outcome holds cleanup even after request completion; wrong token cannot release it');
  const unknown=starts.at(-1)!;
  denied(`SELECT bff_finish_deletion_upload('${unknown.id}','${unknown.token}','settled');`,'55000');
  const competing=await beginDeletionUploadSession(client,other,other);
  sql(`SELECT claim_product_cover_photo_upload('${other}','${otherProduct}','${p}',1::bigint,15,1000000,false);`);
  await competing.bind({kind:'product',entityId:otherProduct,keys:[ua,ub],writeKeys:[ua,ub],expected:{photoId:p,version:1}});
  let escaped=false;await assert.rejects(()=>competing.put(ua,async()=>{escaped=true;return true;}));assert.equal(escaped,false);await competing.finish();
  const badId=randomUUID(),badToken=randomUUID();sql(`SELECT bff_begin_deletion_upload('${badId}','${badToken}','${other}','${other}');`);
  denied(`SELECT bff_bind_deletion_upload('${badId}','${badToken}','product','${otherProduct}',ARRAY[${q(ua)},${q(ub)}],ARRAY[${q(ua)},${q(ub)}],'{}');`,'22023');
  denied(`SELECT bff_bind_deletion_upload('${badId}','${badToken}','product','${otherProduct}',ARRAY[${q(a)},${q(ub)}],ARRAY[${q(a)},${q(ub)}],jsonb_build_object('photoId','${p}','version',1));`,'22023');
  sql(`SELECT bff_finish_deletion_upload('${badId}','${badToken}','settled');`);
  pass('uncertainty cannot be downgraded even with its valid token; competing same-key writes and cross-owner registration are rejected');
  insert('product_cover_photos',{owner_id:legacy,product_id:legacyProduct,status:'uploading',version:1,upload_lease_expires_at:new Date(Date.now()-60000).toISOString()});
  denied(`SELECT deletion_engine_private.assert_uploads_quiescent('${legacy}');`,'55000');sql(`DELETE FROM product_cover_photos WHERE owner_id='${legacy}';`);
  pass('untracked expired legacy claim requires review rather than assuming the old writer stopped');
  const l=request(legacy);const leader=spawn('docker',['--context','desktop-linux',...psql],{stdio:['pipe','pipe','pipe']});let out='';
  const closed=new Promise<number|null>((r,j)=>{leader.on('close',r);leader.on('error',j);});
  const ready=new Promise<void>((r,j)=>{const timer=setTimeout(()=>j(Error('Freeze lock timeout')),10000);leader.stdout.on('data',d=>{out+=d;if(out.includes('FREEZE_LOCK_HELD')){clearTimeout(timer);r();}});});
  leader.stdin.end(`BEGIN;SELECT bff_account_deletion_engine('${l.id}','${l.token}','access_frozen','owner','execute',NULL);SELECT 'FREEZE_LOCK_HELD';SELECT pg_sleep(0.5);COMMIT;`);
  await ready;await assert.rejects(()=>beginDeletionUploadSession(client,legacy,legacy));assert.equal(await closed,0);
  pass('two PostgreSQL sessions serialize freeze/new-begin: waiter rechecks committed freeze and cannot register a new writer');
  for(const role of ['anon','authenticated'])denied(`SET ROLE ${role};SELECT bff_begin_deletion_upload('${randomUUID()}','${randomUUID()}','${other}','${other}');`,'42501');
  denied('SET ROLE service_role;SELECT * FROM deletion_upload_private.attempts;','42501');
  pass('client roles cannot control upload barrier; service cannot directly read private attempts');
  mkdirSync('.codex-artifacts',{recursive:true});writeFileSync('.codex-artifacts/account-deletion-upload-race-acceptance.json',JSON.stringify({at:new Date().toISOString(),checks,scope:'captured local PostgreSQL + real session coordinator; deferred PUT stand-in, no cloud/Auth writes',productionEnabled:false},null,2));
 }finally{try{await live?.close();}finally{if(started){const c=JSON.parse(docker(['inspect',db]))[0];assert.equal(c.Config.Labels['feria-purpose'],purpose);assert.equal(c.HostConfig.NetworkMode,network);assert.equal(c.Mounts.filter((m:{Type:string})=>m.Type==='bind').length,0);docker(['rm','-fv',db]);if(reconciliation)console.log('PASS disposable reconciliation DB removed');}if(networkCreated)docker(['network','rm',network]);}}
 console.log(`PASS upload/freeze SQL race (${checks.length} groups); disposable DB removed`);
}
void main().catch(e=>{console.error(e instanceof Error?e.stack:'Isolated upload race failed');process.exitCode=1;});
