// Disposable SQL/billing integration only. No .env, real merchant, Auth server or R2.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {capturedDeletionCatalog,capturedOperationalFixtureDdl,approvedOperationalColumnsDdl,deployedBillingGuardsDdl,deployedEventGuardsDdl,quoteSql as q,quoteIdentifier as qi} from './lib/account-deletion-catalog-fixture';
import {capturedRuntimeDefinitionsDdl,capturedRuntimeSecurityDdl,capturedRuntimeTriggersDdl,frozenPublicSurfaceDdl,fencedEventAuthorizerDdl,accessCatalogManifestDdl} from './lib/account-deletion-access-fixture';
import {requiredAccountDeletionSteps} from '../lib/subscription/account-deletion-contract';
import {createBillingRetentionFingerprint} from '../lib/subscription/account-deletion-billing-retention.server';
import {createDeletionBillingPreparationPort,minimizePreparedBillingBatch,type PreparedBillingBatch} from '../lib/subscription/account-deletion-billing-engine.server';

async function main(){
 const access=process.argv.includes('--captured-access');
 assert.deepEqual(process.argv.slice(2),access?['--isolated','--captured-access']:['--isolated']);assert.ok(!process.env.DOCKER_HOST&&!process.env.DOCKER_CONTEXT&&!process.env.VERCEL&&!process.env.VERCEL_ENV);
 const docker=(args:string[],input?:string)=>execFileSync('docker',['--context','desktop-linux',...args],{input,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
 assert.equal(docker(['context','inspect','desktop-linux','--format','{{.Endpoints.docker.Host}}']),'npipe:////./pipe/dockerDesktopLinuxEngine');
 const db=`deletion-billing-${randomUUID()}`,purpose='account-deletion-billing-isolated';
 const psql=['exec','-i',db,'psql','-h','127.0.0.1','-XAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','deletion_engine_test'];
 const sql=(s:string)=>docker(psql,s);const denied=(s:string)=>assert.throws(()=>sql(s));
 const deniedWith=(s:string,message:string)=>{try{sql(s);assert.fail('SQL was expected to reject');}catch(e){assert.ok(String((e as {stderr?:unknown}).stderr??'').includes(message),'Wrong rejection reason');}};
 const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
 const checks:string[]=[];const pass=(s:string)=>{checks.push(s);console.log('PASS '+s);};
 const tables=capturedDeletionCatalog().filter(r=>r.detail.kind==='r');
 const insert=(table:string,data:Record<string,unknown>)=>{
   const cols=tables.find(r=>r.identity===`public.${table}`)!.detail.columns;const row={...data};
   for(const c of cols)if(!c.nullable&&row[c.name]===undefined){
     if(c.type==='uuid')row[c.name]=randomUUID();else if(c.type==='timestamp with time zone')row[c.name]=new Date().toISOString();
     else if(c.type==='boolean')row[c.name]=false;else if(/^(integer|bigint|numeric)/.test(c.type))row[c.name]=1;
     else if(c.type==='jsonb')row[c.name]={};else throw new Error(`Missing fixture field ${table}.${c.name}`);
   }
   sql(`INSERT INTO public.${qi(table)}(${Object.keys(row).map(qi).join(',')}) VALUES(${Object.entries(row).map(([k,v])=>v===null?'NULL':cols.find(c=>c.name===k)!.type==='jsonb'?`${q(JSON.stringify(v))}::jsonb`:q(String(v))).join(',')});`);
 };
 const draft=(path:string)=>{const s=readFileSync(path,'utf8');assert.match(s,/ROLLBACK;\s*$/);sql(s.replace(/ROLLBACK;\s*$/,'COMMIT;'));};
 const key=randomBytes(32);const fingerprint=createBillingRetentionFingerprint(key,'synthetic-v1');let started=false;
 try{
   docker(['run','--rm','-d','--network','none','--name',db,'--label',`feria-purpose=${purpose}`,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=deletion_engine_test','postgres:17-alpine']);started=true;
   for(let n=0;n<60;n++){try{sql('SELECT 1');break;}catch{if(n===59)throw new Error('Disposable PostgreSQL unavailable');await new Promise(r=>setTimeout(r,100));}}
   sql(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role ${access?'BYPASSRLS':''};CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY${access?',email text,raw_user_meta_data jsonb':''});CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id));
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.role',true)$$;`);
   sql(capturedOperationalFixtureDdl());sql("CREATE FUNCTION delete_current_user_app_data() RETURNS void LANGUAGE sql AS 'SELECT';REVOKE ALL ON FUNCTION delete_current_user_app_data() FROM PUBLIC;");
   sql(readFileSync('supabase/migrations/071_add_account_deletion_request_foundation.sql','utf8'));
   if(access){sql('DROP FUNCTION delete_current_user_app_data();');sql(capturedRuntimeDefinitionsDdl());sql(capturedRuntimeSecurityDdl());sql(readFileSync('supabase/migrations/095_scope_snapshot_rpcs_to_owner.sql','utf8'));}
   draft('docs/subscription/drafts/ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.sql');
   draft('docs/subscription/drafts/ACCOUNT_DELETION_ENGINE_2026_11_02.sql');sql(approvedOperationalColumnsDdl());
   draft('docs/subscription/drafts/ACCOUNT_DELETION_OPERATIONAL_COVERAGE_2026_11_02.sql');
   draft('docs/subscription/drafts/ACCOUNT_DELETION_BILLING_RETENTION_2026_11_02.sql');
   // Only synthetic key material, via stdin; never command arguments or report output.
   sql(`INSERT INTO deletion_billing_private.keys VALUES('synthetic-v1',decode('${key.toString('hex')}','hex'));`);
   const owner=randomUUID(),other=randomUUID(),customer=randomUUID(),subscription=randomUUID(),event=randomUUID(),recon=randomUUID(),assignment=randomUUID();
   const time=new Date().toISOString(),old=new Date(Date.now()-86400000).toISOString();const until=sql("SELECT deletion_billing_private.iso((clock_timestamp()+interval '5 years'-interval '1 day')::text);");
   for(const id of [owner,other]){sql(`INSERT INTO auth.users(id) VALUES('${id}');`);insert('profiles',{id,email:`${id}@example.test`,display_name:'Synthetic billing'});}
   insert('subscription_accounts',{owner_id:owner,plan_code:'pro',plan_source:'billing',billing_status:'active',entitlement_status:'active'});
   insert('billing_customer_links',{id:customer,owner_id:owner,billing_origin:'apple_app_store',provider_environment:'sandbox',provider_customer_ref:'customer@example.test'});
   insert('billing_customer_links',{owner_id:other,billing_origin:'apple_app_store',provider_environment:'sandbox',provider_customer_ref:'unrelated@example.test'});
   insert('billing_subscriptions',{id:subscription,billing_customer_link_id:customer,owner_id:owner,billing_origin:'apple_app_store',provider_environment:'sandbox',provider_subscription_ref:'synthetic-active-subscription',normalized_plan_code:'pro',normalized_cadence:'annual',normalized_billing_status:'expired',provider_observed_at:old,snapshot_hash:hash('snapshot'),last_reconciled_at:old});
   const providerRef='order:測試,"quoted"\\private@example.test';
   insert('billing_transactions',{owner_id:owner,billing_subscription_id:subscription,billing_origin:'apple_app_store',provider_environment:'sandbox',provider_transaction_ref:providerRef,transaction_kind:'charge',transaction_status:'settled',currency:'TWD',amount_minor:58800,provider_effective_at:old,provider_observed_at:time,settled_at:time,snapshot_hash:hash('charge')});
   insert('billing_transactions',{owner_id:owner,billing_subscription_id:subscription,billing_origin:'apple_app_store',provider_environment:'sandbox',provider_transaction_ref:'synthetic-refund',provider_parent_transaction_ref:providerRef,transaction_kind:'refund',transaction_status:'settled',currency:'TWD',amount_minor:0,provider_effective_at:old,provider_observed_at:time,settled_at:time,snapshot_hash:hash('refund')});
   insert('billing_event_inbox',{id:event,billing_origin:'apple_app_store',provider_environment:'sandbox',provider_event_ref:'synthetic-notification',payload_hash:hash('notification'),verification_status:'verified',event_kind:'renewal',provider_occurred_at:old,received_at:old,processing_status:'processed',attempt_count:1,processed_at:time,raw_payload_ciphertext_ref:'synthetic-external-blob'});
   insert('billing_reconciliation_runs',{id:recon,owner_id:owner,billing_origin:'apple_app_store',provider_environment:'sandbox',trigger_kind:'event',trigger_event_inbox_id:event,status:'succeeded',started_at:old,completed_at:time,provider_observed_at:time,provider_snapshot_ref:'synthetic-provider-snapshot',before_projection_hash:hash('before'),after_projection_hash:hash('after'),decision_code:'synthetic_applied'});
   const mapping=randomUUID();insert('subscription_price_versions',{id:'synthetic_retention_price',plan_code:'pro',cadence:'annual',currency:'TWD',amount_minor:58800,price_policy:'standard',commercial_status:'active',effective_at:old});
   insert('billing_storefront_price_mappings',{id:mapping,price_version_id:'synthetic_retention_price',billing_origin:'apple_app_store',provider_environment:'sandbox',mapping_mode:'provider_price_object',provider_product_ref:'synthetic.product',provider_price_ref:'synthetic.price',mapping_status:'active',verified_at:old,evidence_reference:'synthetic_evidence',activated_at:old});
   insert('subscription_price_assignments',{id:assignment,owner_id:owner,storefront_price_mapping_id:mapping,price_version_id:'synthetic_retention_price',assigned_plan_code:'pro',assigned_cadence:'annual',assigned_currency:'TWD',assigned_amount_minor:58800,price_policy:'standard',assignment_source:'billing',source_reference:'private-source@example.test',continuity_started_at:old,assigned_at:old,last_transition_at:old,last_transition_reason:'synthetic_assigned',last_transition_evidence_reference:'synthetic_evidence'});
   sql(deployedBillingGuardsDdl(true));
   if(access){
    sql(deployedEventGuardsDdl());sql(capturedRuntimeTriggersDdl());
    draft('docs/subscription/drafts/ACCOUNT_DELETION_ACCESS_FENCE_2026_11_02.sql');
    sql(fencedEventAuthorizerDdl(sql("SELECT pg_get_functiondef('deletion_engine_private.authorize_event_change(jsonb,jsonb,text)'::regprocedure);")));
    const defs=JSON.parse(sql(`SELECT jsonb_object_agg(p.proname||'('||oidvectortypes(p.proargtypes)||')',pg_get_functiondef(p.oid)) FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';`)) as Record<string,string>;
    sql(frozenPublicSurfaceDdl(defs));
    pass('captured 134 routines, 5 views and all public-table triggers coexist with scoped billing detachment guards');
   }
   denied(`UPDATE billing_transactions SET amount_minor=999 WHERE owner_id='${owner}';`);
   denied(`DELETE FROM billing_customer_links WHERE owner_id='${other}';`);
   pass('deployed append-only/restrict guards remain active before scoped detachment');
   const id=sql(`SELECT request_id FROM bff_create_account_deletion_request('${owner}','${hash(owner)}','${hash(owner)}','2026-08-17','clean');`);
   sql(`SELECT * FROM bff_confirm_account_deletion_request('${owner}','${id}','requested');`);
   const claimed=JSON.parse(sql(`SELECT bff_claim_account_deletion_lease('${id}','billing-fixture-worker',clock_timestamp(),300);`));const token=claimed.leaseToken;
   const prepareSql=(t:string|null=token)=>`SELECT bff_prepare_billing_detachment('${id}',${t===null?'NULL':q(t)},${q(until)},'synthetic-v1','${hash('reviewed-policy')}');`;
   denied(prepareSql(null));denied(prepareSql(randomUUID()));
   denied(prepareSql());
   denied(`SELECT bff_clear_billing_reference('${id}','${token}','billing_event_inbox','${event}','raw_payload_ciphertext_ref','provider_identifier','synthetic-v1','${hash('bad-proof')}');`);
   sql(`SELECT bff_clear_billing_reference('${id}','${token}','billing_event_inbox','${event}','raw_payload_ciphertext_ref','blob_absence_verified','synthetic-v1','${hash('synthetic-only-blob-absence')}');
     SELECT bff_clear_billing_reference('${id}','${token}','billing_reconciliation_runs','${recon}','provider_snapshot_ref','provider_identifier','synthetic-v1','${hash('synthetic-only-reference-classification')}');`);
   pass('unresolved external refs block preparation; only scoped source-matching clearance permits minimization');
   deniedWith(`BEGIN;INSERT INTO billing_event_inbox(id,billing_origin,provider_environment,provider_event_ref,payload_hash,verification_status,event_kind,received_at,processing_status,attempt_count,created_at,updated_at)
     VALUES('${randomUUID()}','apple_app_store','sandbox','unclassified-synthetic-event','${hash('orphan')}','verified','renewal',clock_timestamp(),'pending',0,clock_timestamp(),clock_timestamp());${prepareSql()}COMMIT;`,'billing_inbox_unclassified');
   deniedWith(`BEGIN;INSERT INTO billing_reconciliation_runs(id,owner_id,billing_origin,provider_environment,trigger_kind,trigger_event_inbox_id,status,started_at,created_at,updated_at)
     VALUES('${randomUUID()}','${other}','apple_app_store','sandbox','event','${event}','running',clock_timestamp(),clock_timestamp(),clock_timestamp());${prepareSql()}COMMIT;`,'billing_inbox_unclassified');
   sql(`UPDATE deletion_billing_private.reference_clearances SET reference_hash='${hash('stale-pointer-proof')}' WHERE field_name='raw_payload_ciphertext_ref';`);
   deniedWith(prepareSql(),'billing_raw_payload_cleanup_required');
   sql(`SELECT bff_clear_billing_reference('${id}','${token}','billing_event_inbox','${event}','raw_payload_ciphertext_ref','blob_absence_verified','synthetic-v1','${hash('synthetic-only-blob-absence')}');`);
   pass('unmapped/shared inbox ownership and stale external reference proofs cannot be guessed or reused');
   const count=(table:string,where='true')=>Number(sql(`SELECT count(*) FROM ${table} WHERE ${where};`));
   const rpc={async rpc(name:string,args:Record<string,unknown>){
     try{
       let statement:string;
       if(name==='bff_prepare_billing_detachment')statement=`SELECT ${name}(${q(String(args.req))},${q(String(args.token))},${q(String(args.until_at))},${q(String(args.key_version))},${q(String(args.classification_hash))});`;
       else statement=`SELECT bff_stage_billing_detachment(${q(String(args.req))},${q(String(args.token))},${q(String(args.source_hash))},${q(JSON.stringify(args.records))}::jsonb);`;
       return {data:JSON.parse(sql(statement)),error:null};
     }catch{return {data:null,error:{code:'55000'}};}
   }};
   const coordinator=createDeletionBillingPreparationPort({endpoint:'http://127.0.0.1:1',client:rpc,fingerprint});
   const args={requestId:id,leaseToken:token,retainUntil:until,classificationHash:hash('reviewed-policy')};
   const batch=JSON.parse(sql(prepareSql())) as PreparedBillingBatch;const evidence=minimizePreparedBillingBatch(batch,fingerprint);
   assert.equal(evidence.length,7);
   const stage=(data:unknown,source=batch.sourceHash)=>`SELECT bff_stage_billing_detachment('${id}','${token}',${q(source)},${q(JSON.stringify(data))}::jsonb);`;
   const forged=JSON.parse(JSON.stringify(evidence));forged.find((r:{sourceTable:string})=>r.sourceTable==='billing_transactions').facts.amount_minor=999;
   denied(stage(forged));denied(stage([...evidence,evidence[0]]));
   const leaked=JSON.parse(JSON.stringify(evidence));leaked[0].email='private@example.test';denied(stage(leaked));
   pass('leased source capture and independent DB validation reject forged amount, duplicate evidence and leaked identifiers');
   sql(`UPDATE billing_subscriptions SET normalized_billing_status='active',provider_observed_at=clock_timestamp(),last_reconciled_at=clock_timestamp() WHERE id='${subscription}';`);
   denied(stage(evidence));
   const staged=await coordinator.prepare(args);assert.equal(staged.outcome,'staged');assert.equal(staged.count,7);
   const subject=(staged as {subjectId:string}).subjectId;
   const subjectRevision=Number(sql(`SELECT revision FROM deletion_billing_private.subjects WHERE id='${subject}';`));assert.equal(subjectRevision,2);
   pass('concurrent provider snapshot invalidates staging; explicit reprepare uses stable subject and key version');
   const call=(step:string,action='execute')=>JSON.parse(sql(`SELECT bff_account_deletion_engine('${id}','${token}',${q(step)},'owner',${q(action)},NULL);`));
   const record=(step:string,r:{affectedCount:number;evidenceHash:string})=>sql(`SELECT bff_record_account_deletion_step('${id}','${token}',${q(step)},'completed',${r.affectedCount},${q(r.evidenceHash)},NULL);`);
   for(const step of requiredAccountDeletionSteps('owner')){
     if(step==='billing_identity_detached')break;
     call(step,'context');record(step,call(step,['r2_objects_deleted','r2_absence_verified'].includes(step)?'complete_external':'execute'));
   }
   // No trigger is disabled: an injected failure tests entire archive+delete rollback.
   sql("CREATE FUNCTION synthetic_billing_fault() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'synthetic late delete failure' USING ERRCODE='55000';END$$;CREATE TRIGGER zz_synthetic_billing_fault BEFORE DELETE ON billing_customer_links FOR EACH ROW EXECUTE FUNCTION synthetic_billing_fault();");
   denied(`SELECT bff_account_deletion_engine('${id}','${token}','billing_identity_detached','owner','execute',NULL);`);
   assert.equal(count('deletion_billing_private.records'),0);assert.equal(count('deletion_billing_private.bindings'),0);assert.equal(count('billing_transactions',`owner_id='${owner}'`),2);
   sql('DROP TRIGGER zz_synthetic_billing_fault ON billing_customer_links;DROP FUNCTION synthetic_billing_fault();');
   pass('late original-ledger failure rolls back retained records, retired bindings and all deletes atomically');
   const detached=call('billing_identity_detached');assert.equal(detached.affectedCount,7);
   assert.equal(count('deletion_billing_private.records',`subject_id='${subject}'`),7);
   assert.equal(count('billing_transactions',`owner_id='${owner}'`),0);assert.equal(count('billing_customer_links',`owner_id='${other}'`),1);
   assert.equal(call('billing_identity_detached').affectedCount,7);record('billing_identity_detached',detached);
   const stored=sql(`SELECT evidence::text FROM deletion_billing_private.records WHERE subject_id='${subject}';`);
   for(const raw of [owner,'@example.test',providerRef,'private-source'])assert.ok(!stored.includes(raw));
   assert.equal(sql(`SELECT sum((evidence#>>'{facts,amount_minor}')::bigint) FROM deletion_billing_private.records WHERE source_table='billing_transactions';`),'58800');
   assert.equal(count('deletion_billing_private.subjects',`id='${subject}' AND provider_review_pending`),1);
   pass('all five ledger classes plus classified inbox detach without profile FK, preserving refund/zero amount and other owner');
   const retired=JSON.parse(sql(`SELECT bff_check_retired_billing_binding('apple_app_store','sandbox','transaction',${q(providerRef)});`));assert.equal(retired.outcome,'retired');assert.equal(retired.automaticBindingAllowed,false);
   denied(`INSERT INTO billing_customer_links VALUES('${randomUUID()}','${other}','apple_app_store','sandbox','customer@example.test',clock_timestamp());`);
   const unknown=JSON.parse(sql("SELECT bff_check_retired_billing_binding('apple_app_store','sandbox','transaction','unknown');"));assert.equal(unknown.automaticBindingAllowed,false);
   denied(`UPDATE deletion_billing_private.records SET evidence='{}';`);
   pass('retired identifiers cannot bind another owner; unknown restore remains denied; retained evidence is immutable');
   for(const step of ['operational_data_cleaned','profile_deleted'])record(step,call(step));
   assert.equal(count('profiles',`id='${owner}'`),0);sql(`DELETE FROM auth.users WHERE id='${owner}';`);
   for(const step of ['auth_user_deleted','sessions_revoked'])record(step,call(step,'complete_external'));
   assert.equal(sql(`SELECT bff_finalize_account_deletion('${id}','${token}');`),'completed');
   const notDue=JSON.parse(sql(`SELECT bff_purge_detached_billing('${subject}',${subjectRevision},'${randomUUID()}');`));assert.equal(notDue.outcome,'not_due');
   denied(`SELECT bff_purge_detached_billing('${subject}',NULL,'${randomUUID()}');`);
   pass('profile removal succeeds after detachment; premature purge and missing revision cannot remove retained evidence');
   for(const role of ['anon','authenticated','service_role']){
     denied(`BEGIN;SET LOCAL ROLE ${role};SELECT * FROM deletion_billing_private.records;ROLLBACK;`);
     if(role!=='service_role')denied(`BEGIN;SET LOCAL ROLE ${role};SELECT bff_purge_detached_billing('${subject}',1,'${randomUUID()}');ROLLBACK;`);
   }
   pass('private keys, retained evidence and purge operations stay inaccessible to client roles');
   const rotation=randomBytes(32);sql(`INSERT INTO deletion_billing_private.keys VALUES('synthetic-v2',decode('${rotation.toString('hex')}','hex'));`);
   assert.equal(JSON.parse(sql(`SELECT bff_check_retired_billing_binding('apple_app_store','sandbox','transaction',${q(providerRef)});`)).outcome,'retired');
   denied("UPDATE deletion_billing_private.keys SET material=decode(repeat('00',32),'hex') WHERE version='synthetic-v1';");
   denied("DELETE FROM deletion_billing_private.keys WHERE version='synthetic-v1';");
   denied(`UPDATE deletion_billing_private.subjects SET provider_review_pending=false WHERE id='${subject}';`);
   const reviewOp=randomUUID();const extended=sql("SELECT deletion_billing_private.iso((clock_timestamp()+interval '5 years'-interval '1 hour')::text);");
   const reviewSql=`SELECT bff_review_detached_billing('${subject}',${subjectRevision},'${reviewOp}',${q(extended)},'${hash('synthetic-only-provider-closed-proof')}');`;
   assert.equal(JSON.parse(sql(reviewSql)).revision,subjectRevision+1);assert.equal(JSON.parse(sql(reviewSql)).revision,subjectRevision+1);
   denied(`SELECT bff_purge_detached_billing('${subject}',${subjectRevision},'${randomUUID()}');`);
   pass('key rotation preserves old retired lookups; reviewed closure only extends deadline and invalidates stale purge revision');
   // Historical synthetic subjects model due retention without accepting a caller-supplied clock.
   const historical=(review=false)=>{
     const sub=randomUUID();sql(`INSERT INTO deletion_billing_private.subjects VALUES('${sub}','${id}','synthetic-v1',clock_timestamp()-interval '6 years',clock_timestamp()-interval '1 year','${hash('historic-review')}',1,${review});
       INSERT INTO deletion_billing_private.records VALUES('${sub}','billing_transactions','${hash(sub)}','{"facts":{"amount_minor":58800}}','${hash('historic-record')}');`);return sub;
   };
   const due=historical(),held=historical(),review=historical(true),hold=randomUUID();
   sql(`INSERT INTO deletion_billing_private.holds(id,subject_id,evidence_hash) VALUES('${hold}','${held}','${hash('legal-hold')}');`);
   assert.equal(JSON.parse(sql(`SELECT bff_purge_detached_billing('${held}',1,'${randomUUID()}');`)).outcome,'held');
   assert.equal(JSON.parse(sql(`SELECT bff_purge_detached_billing('${review}',1,'${randomUUID()}');`)).outcome,'held');
   denied(`SELECT bff_purge_detached_billing('${due}',2,'${randomUUID()}');`);
   const rollbackOp=randomUUID(),rollbackSubject=historical();
   sql(`CREATE FUNCTION synthetic_purge_fault() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF OLD.id='${rollbackSubject}'::uuid THEN RAISE EXCEPTION 'synthetic purge failure' USING ERRCODE='55000';END IF;RETURN OLD;END$$;
     CREATE TRIGGER zz_synthetic_purge_fault BEFORE DELETE ON deletion_billing_private.subjects FOR EACH ROW EXECUTE FUNCTION synthetic_purge_fault();`);
   denied(`SELECT bff_purge_detached_billing('${rollbackSubject}',1,'${rollbackOp}');`);
   assert.equal(count('deletion_billing_private.records',`subject_id='${rollbackSubject}'`),1);
   assert.equal(count('deletion_billing_private.purge_receipts',`operation_id='${rollbackOp}'`),0);
   sql('DROP TRIGGER zz_synthetic_purge_fault ON deletion_billing_private.subjects;DROP FUNCTION synthetic_purge_fault();');
   assert.equal(JSON.parse(sql(`SELECT bff_purge_detached_billing('${rollbackSubject}',1,'${rollbackOp}');`)).count,1);
   pass('interrupted due purge restores evidence and creates no success receipt; same operation safely resumes');
   const op=randomUUID();const purged=JSON.parse(sql(`SELECT bff_purge_detached_billing('${due}',1,'${op}');`));assert.equal(purged.outcome,'purged');assert.equal(purged.count,1);
   assert.equal(JSON.parse(sql(`SELECT bff_purge_detached_billing('${due}',1,'${op}');`)).count,1);
   denied(`SELECT bff_purge_detached_billing('${held}',1,'${op}');`);
   denied(`UPDATE deletion_billing_private.purge_receipts SET affected_count=999 WHERE operation_id='${op}';`);
   assert.equal(count('deletion_billing_private.subjects',`id='${due}'`),0);assert.equal(count('deletion_billing_private.records',`subject_id='${subject}'`),7);
   pass('DB-clock due purge is scoped and idempotent; legal holds, provider review and stale revisions preserve evidence');
   const race=historical();const leader=spawn('docker',['--context','desktop-linux',...psql],{stdio:['pipe','pipe','pipe']});let out='';
   const closed=new Promise<number|null>((resolve,reject)=>{leader.on('close',resolve);leader.on('error',reject);});
   const ready=new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Hold race timed out')),10000);leader.stdout.on('data',d=>{out+=d;if(out.includes('HOLD_READY')){clearTimeout(timer);resolve();}});});
   leader.stdin.end(`BEGIN;INSERT INTO deletion_billing_private.holds(id,subject_id,evidence_hash) VALUES('${randomUUID()}','${race}','${hash('race-hold')}');SELECT 'HOLD_READY';SELECT pg_sleep(0.5);COMMIT;`);
   await ready;assert.equal(JSON.parse(sql(`SELECT bff_purge_detached_billing('${race}',1,'${randomUUID()}');`)).outcome,'held');assert.equal(await closed,0);
   pass('concurrent hold insertion serializes before purge and prevents financial evidence deletion');
   if(access){sql(accessCatalogManifestDdl());sql('SELECT deletion_engine_private.assert_catalog();');pass('combined access manifest recognizes only reviewed request/engine/billing control signatures');}
   mkdirSync('.codex-artifacts',{recursive:true});writeFileSync('.codex-artifacts/account-deletion-billing-acceptance.json',JSON.stringify({at:new Date().toISOString(),checks,capturedAccess:access,productionEnabled:false,scope:'captured SQL contracts and billing guard integration; synthetic financial data only'},null,2));
 }finally{if(started){const c=JSON.parse(docker(['inspect',db]))[0];assert.equal(c.Config.Labels['feria-purpose'],purpose);assert.equal(c.HostConfig.NetworkMode,'none');assert.equal(c.Mounts.filter((m:{Type:string})=>m.Type==='bind').length,0);docker(['rm','-fv',db]);}}
 console.log(`PASS billing detachment (${checks.length} scenarios); disposable PostgreSQL removed`);
}
void main().catch(e=>{console.error(e instanceof Error?e.message:'Isolated billing verification failed');process.exitCode=1;});
