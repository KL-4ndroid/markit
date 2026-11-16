// SQL data-stage verification against captured deployed column/FK/check contracts.
// Preceding external absence/freeze receipts are fixture preconditions, NOT R2/Auth acceptance.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID,createHash } from 'node:crypto';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { requiredAccountDeletionSteps } from '../lib/subscription/account-deletion-contract';
import { capturedDeletionCatalog,capturedOperationalFixtureDdl,approvedOperationalColumnsDdl,deployedEventGuardsDdl,quoteSql as q,quoteIdentifier as qi } from './lib/account-deletion-catalog-fixture';
import { capturedRuntimeDefinitionsDdl,capturedRuntimeSecurityDdl,capturedRuntimeTriggersDdl,frozenPublicSurfaceDdl,fencedEventAuthorizerDdl,accessCatalogManifestDdl } from './lib/account-deletion-access-fixture';
import { verifyCapturedAccess,verifyCapturedWorkerFence } from './lib/account-deletion-access-checks';

async function main(){
  const access=process.argv.includes('--captured-access');
  assert.deepEqual(process.argv.slice(2),access?['--isolated','--captured-access']:['--isolated']);
  assert.ok(!process.env.DOCKER_HOST&&!process.env.DOCKER_CONTEXT&&!process.env.VERCEL&&!process.env.VERCEL_ENV);
  const docker=(args:string[],input?:string)=>execFileSync('docker',['--context','desktop-linux',...args],{input,encoding:'utf8',timeout:30_000,maxBuffer:4*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
  assert.equal(docker(['context','inspect','desktop-linux','--format','{{.Endpoints.docker.Host}}']),'npipe:////./pipe/dockerDesktopLinuxEngine');
  const db=`deletion-operational-${randomUUID()}`; const purpose='account-deletion-operational-isolated';
  const sql=(s:string)=>docker(['exec','-i',db,'psql','-h','127.0.0.1','-XqAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','deletion_engine_test'],s);
  const deny=(s:string)=>assert.throws(()=>sql(s));
  const checks:string[]=[];const pass=(s:string)=>{checks.push(s);console.log('PASS '+s);};
  const tables=capturedDeletionCatalog().filter(r=>r.detail.kind==='r');
  const insert=(table:string,data:Record<string,unknown>)=>{
    const columns=tables.find(r=>r.identity===`public.${table}`)!.detail.columns;
    const row={...data};
    for(const c of columns)if(!c.nullable&&row[c.name]===undefined){
      if(c.type==='uuid')row[c.name]=randomUUID();
      else if(c.type==='timestamp with time zone')row[c.name]=new Date().toISOString();
      else if(c.type==='boolean')row[c.name]=false;
      else if(/^(integer|bigint|numeric)/.test(c.type))row[c.name]=1;
      else if(c.type==='jsonb')row[c.name]={};
      else throw new Error(`Explicit fixture value needed: ${table}.${c.name}`);
    }
    const entries=Object.entries(row);
    sql(`INSERT INTO public.${qi(table)}(${entries.map(([k])=>qi(k)).join(',')}) VALUES(${entries.map(([k,v])=>{
      if(v===null)return 'NULL';const c=columns.find(c=>c.name===k)!;
      return c.type==='jsonb'?`${q(JSON.stringify(v))}::jsonb`:q(String(v));
    }).join(',')});`);
  };
  let started=false;
  try{
    docker(['run','--rm','-d','--network','none','--name',db,'--label',`feria-purpose=${purpose}`,
      '-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=deletion_engine_test','postgres:17-alpine']);started=true;
    for(let n=0;n<60;n++){try{sql('SELECT 1');break;}catch{if(n===59)throw new Error('Disposable SQL unavailable');await new Promise(r=>setTimeout(r,100));}}
    sql(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role ${access?'BYPASSRLS':''};CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY${access?',email text,raw_user_meta_data jsonb':''});CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id));
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
      GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon,authenticated,service_role;`);
    sql(capturedOperationalFixtureDdl());
    sql("CREATE FUNCTION delete_current_user_app_data() RETURNS void LANGUAGE sql AS 'SELECT'; REVOKE ALL ON FUNCTION delete_current_user_app_data() FROM PUBLIC;");
    sql(readFileSync('supabase/migrations/071_add_account_deletion_request_foundation.sql','utf8'));
    if(access){
      sql('DROP FUNCTION delete_current_user_app_data();');sql(capturedRuntimeDefinitionsDdl());sql(capturedRuntimeSecurityDdl());
      sql(readFileSync('supabase/migrations/095_scope_snapshot_rpcs_to_owner.sql','utf8'));
      sql(readFileSync('supabase/migrations/095_scope_snapshot_rpcs_to_owner.sql','utf8')); // repeat-safe repair
      assert.match(sql(readFileSync('supabase/verification/095_snapshot_owner_scope_readiness.sql','utf8')),/095_snapshot_scope_ready\|t\|/);
      mkdirSync('.codex-artifacts',{recursive:true});
      writeFileSync('.codex-artifacts/snapshot-095-definition-checks.json',sql(`SELECT jsonb_agg(jsonb_build_object('name',p.proname,'md5',md5(pg_get_functiondef(p.oid)),'config',p.proconfig))
        FROM pg_proc p WHERE p.oid IN('public.get_latest_snapshot(uuid)'::regprocedure,'public.cleanup_old_snapshots(uuid)'::regprocedure);`));
    }
    const draft=(path:string)=>{const s=readFileSync(path,'utf8');assert.match(s,/ROLLBACK;\s*$/);sql(s.replace(/ROLLBACK;\s*$/,'COMMIT;'));};
    draft('docs/subscription/drafts/ACCOUNT_DELETION_REQUEST_WORKFLOW_2026_11_01.sql');
    draft('docs/subscription/drafts/ACCOUNT_DELETION_ENGINE_2026_11_02.sql');
    sql(approvedOperationalColumnsDdl());
    draft('docs/subscription/drafts/ACCOUNT_DELETION_OPERATIONAL_COVERAGE_2026_11_02.sql');
    try{sql('SELECT deletion_engine_private.assert_catalog();');}catch{
      const diff=sql(`SELECT coalesce(json_agg(d),'[]') FROM(SELECT e.table_name,e.column_name,e.type_name expected_type,l.type_name live_type,e.nullable expected_nullable,l.nullable live_nullable
        FROM deletion_engine_private.approved_columns e FULL JOIN(SELECT c.relname table_name,a.attname column_name,format_type(a.atttypid,a.atttypmod) type_name,NOT a.attnotnull nullable
          FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
          WHERE n.nspname='public' AND c.relkind IN('r','p','f') AND a.attnum>0 AND NOT a.attisdropped)l USING(table_name,column_name)
        WHERE e.type_name IS DISTINCT FROM l.type_name OR e.nullable IS DISTINCT FROM l.nullable LIMIT 10)d;`);
      throw new Error('Captured catalog mismatch: '+diff);
    }
    pass('40 deployed table column/type/nullability contracts and actual FK/check constraints installed locally');
    const owner=randomUUID(),other=randomUUID(),staff=randomUUID(),pending=randomUUID(),upload=randomUUID(),billing=randomUUID();
    for(const id of [owner,other,staff,pending,upload,billing]){sql(`INSERT INTO auth.users(id) VALUES('${id}');`);insert('profiles',{id,email:`${id}@example.test`,display_name:'Synthetic member'});}
    const venue=randomUUID(),schedule=randomUUID(),market=randomUUID(),otherMarket=randomUUID(),product=randomUUID(),otherProduct=randomUUID(),event=randomUUID(),globalEvent=randomUUID();
    insert('venues',{id:venue,owner_id:owner,name:'Synthetic venue',status:'active'});
    insert('operation_schedules',{id:schedule,owner_id:owner,venue_id:venue,timezone:'Asia/Taipei',recurrence:{frequency:'weekly',interval:1,weekdays:[1]},start_time:'10:00',end_time:'18:00',status:'active'});
    const marketRow=(id:string,who:string)=>({id,owner_id:who,name:'Synthetic market',location:'Synthetic location',start_date:'2026-11-01',end_date:'2026-11-01',status:'registered'});
    insert('markets',{...marketRow(market,owner),venue_id:venue,schedule_id:schedule});insert('markets',marketRow(otherMarket,other));
    insert('products',{id:product,owner_id:owner,name:'Deleted catalog',category:'other',price:49});
    insert('products',{id:otherProduct,owner_id:other,market_id:market,name:'Preserved shared catalog',category:'other',price:99});
    insert('events',{id:event,type:'deal_closed',actor_id:staff,market_id:otherMarket,payload:{totalPrice:99,staffId:staff},metadata:{staffEmail:`${staff}@example.test`}});
    const nullMetadataEvent=randomUUID(),referencingEvent=randomUUID();
    insert('events',{id:nullMetadataEvent,type:'deal_closed',actor_id:staff,market_id:otherMarket,payload:{totalPrice:49,productName:'Synthetic member',actorName:'Synthetic member'}});
    insert('events',{id:referencingEvent,type:'deal_closed',actor_id:other,market_id:otherMarket,payload:{totalPrice:199,staffId:staff}});
    insert('events',{id:globalEvent,type:'settings_updated',actor_id:owner,payload:{theme:'light'},metadata:{}});
    insert('events_archive',{type:'deal_closed',actor_id:staff,market_id:otherMarket,payload:{totalPrice:99,staffId:staff},metadata:{},archived_by:staff});
    insert('events_archive',{type:'deal_closed',actor_id:other,market_id:otherMarket,payload:{totalPrice:199},metadata:{},archived_by:staff});
    insert('staff_relationships',{owner_id:other,staff_id:staff,staff_email:`${staff}@example.test`,status:'active',role:'operator'});
    insert('market_invitations',{code:'SYN123',market_id:otherMarket,created_by:other,used_by:staff});
    insert('snapshots',{user_id:other,snapshot_at:new Date().toISOString(),version:1,data:{staffId:staff,amount:99},event_count:1});
    insert('snapshots',{user_id:other,snapshot_at:new Date().toISOString(),version:2,data:{amount:199},event_count:1});
    const template=randomUUID();insert('preparation_templates',{id:template,owner_id:other,name:'Other brand template',items:[{id:randomUUID(),text:'Keep'}]});
    insert('preparation_template_applications',{owner_id:other,market_id:otherMarket,actor_id:staff,template_id:template,request:{actorId:staff},result:{added:1}});
    insert('owner_workflow_receipts',{owner_id:other,kind:'journal_tasks',request:{actorId:staff},result:{added:1}});
    insert('market_journals',{owner_id:owner,author_id:owner,market_id:market,body:'Owner notes'});
    insert('market_cash_records',{owner_id:owner,market_id:market,business_date:'2026-11-01',data:{opening:100}});
    insert('market_financial_reviews',{owner_id:owner,market_id:market,review_key:'transport',mode:'cost',observed:{},source_key:'synthetic'});
    insert('market_financial_review_receipts',{owner_id:owner,request:{},response:{}});
    insert('owner_workflow_receipts',{owner_id:owner,kind:'venue_regions',request:{},result:{}});
    insert('subscription_accounts',{owner_id:owner,plan_code:'team',plan_source:'admin',billing_status:'none',entitlement_status:'active'});
    insert('account_entitlements',{owner_id:owner,source:'admin'});
    insert('subscription_write_guard_owners',{owner_id:owner});
    insert('subscription_test_switch_audit',{owner_id:owner,plan_code:'team'});
    const ownTemplate=randomUUID();insert('preparation_templates',{id:ownTemplate,owner_id:owner,name:'Deleted template',items:[{text:'Prepare'}]});
    insert('preparation_template_applications',{owner_id:owner,market_id:market,actor_id:owner,template_id:ownTemplate,request:{},result:{}});
    insert('user_settings',{user_id:owner});
    const pendingMarket=randomUUID();insert('markets',marketRow(pendingMarket,pending));
    const pendingId='synthetic-cloud-pending';insert('pending_operations',{operation_id:pendingId,operation_type:'checklist_item_toggle',entity_type:'checklist_item',entity_id:randomUUID(),market_id:pendingMarket,payload:{},idempotency_key:'synthetic-key',actor_id:pending,role_snapshot:{},status:'pending'});
    const uploadingProduct=randomUUID();insert('products',{id:uploadingProduct,owner_id:upload,name:'In flight',category:'other',price:1});
    insert('product_cover_photos',{owner_id:upload,product_id:uploadingProduct,status:'uploading',upload_lease_expires_at:new Date(Date.now()+600_000).toISOString()});
    insert('billing_customer_links',{owner_id:billing,billing_origin:'apple_app_store',provider_environment:'sandbox',provider_customer_ref:'synthetic-private-reference'});
    sql(deployedEventGuardsDdl());
    if(access){
      assert.equal(sql("SELECT has_function_privilege('anon','public.get_latest_snapshot(uuid)','EXECUTE') OR has_function_privilege('anon','public.cleanup_old_snapshots(uuid)','EXECUTE');"),'f');
      const snapshotCall=(who:string,target:string,cleanup=false)=>sql(`BEGIN;SET LOCAL request.jwt.claim.sub='${who}';SET LOCAL request.jwt.claim.role='authenticated';SET LOCAL ROLE authenticated;SELECT ${cleanup?'cleanup_old_snapshots':'count(*) FROM get_latest_snapshot'}('${target}');COMMIT;`);
      assert.equal(snapshotCall(other,other),'1');
      deny(`BEGIN;SET LOCAL request.jwt.claim.sub='${other}';SET LOCAL request.jwt.claim.role='authenticated';SET LOCAL ROLE authenticated;SELECT * FROM get_latest_snapshot('${owner}');COMMIT;`);
      deny(`BEGIN;SET LOCAL request.jwt.claim.sub='${other}';SET LOCAL request.jwt.claim.role='authenticated';SET LOCAL ROLE authenticated;SELECT cleanup_old_snapshots('${owner}');COMMIT;`);
      for(let n=10;n<13;n++)insert('snapshots',{user_id:owner,snapshot_at:new Date(Date.UTC(2026,10,n)).toISOString(),version:n,data:{synthetic:true},event_count:0});
      assert.equal(snapshotCall(owner,owner,true),'1');
      assert.equal(sql(`SELECT count(*) FROM snapshots WHERE user_id='${owner}';`),'2');
      sql(`DELETE FROM snapshots WHERE user_id='${owner}';`);
      pass('standalone 095 privacy repair rejects cross-account/anonymous RPC access and preserves self cleanup before deletion fences');
      sql(capturedRuntimeTriggersDdl());
      draft('docs/subscription/drafts/ACCOUNT_DELETION_ACCESS_FENCE_2026_11_02.sql');
      sql(fencedEventAuthorizerDdl(sql("SELECT pg_get_functiondef('deletion_engine_private.authorize_event_change(jsonb,jsonb,text)'::regprocedure);")));
      const defs=JSON.parse(sql(`SELECT jsonb_object_agg(p.proname||'('||oidvectortypes(p.proargtypes)||')',pg_get_functiondef(p.oid)) FROM pg_proc p
        JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';`)) as Record<string,string>;
      sql(frozenPublicSurfaceDdl(defs));
      verifyCapturedAccess({sql,insert,pass,owner,other,staff,market,otherMarket,product,otherProduct,event});
      sql(accessCatalogManifestDdl());sql('SELECT deletion_engine_private.assert_catalog();');
      for(const mutation of [
        "CREATE FUNCTION public.unreviewed_reader() RETURNS int LANGUAGE sql AS 'SELECT 1';",
        'CREATE VIEW public.unreviewed_view AS SELECT id FROM public.markets;',
        'GRANT TRUNCATE ON public.snapshots TO authenticated;',
        'ALTER TABLE public.events DISABLE TRIGGER trigger_update_market_read_model;',
        'DROP POLICY deletion_engine_read_fence ON public.snapshots;',
      ])deny(`BEGIN;${mutation}SELECT deletion_engine_private.assert_catalog();ROLLBACK;`);
      pass('unreviewed routines/views, restored TRUNCATE grants, disabled triggers and removed fences invalidate engine preflight');
    }
    const count=(table:string,where='true')=>Number(sql(`SELECT count(*) FROM public.${qi(table)} WHERE ${where};`));
    const request=(actor:string)=>{
      const h=createHash('sha256').update(actor).digest('hex');
      const id=sql(`SELECT request_id FROM bff_create_account_deletion_request('${actor}','${h}','${h}','2026-08-17','clean');`);
      sql(`SELECT * FROM bff_confirm_account_deletion_request('${actor}','${id}','requested');`);
      const lease=JSON.parse(sql(`SELECT bff_claim_account_deletion_lease('${id}','operational-fixture-worker',clock_timestamp(),300);`));
      return {id,actor,token:lease.leaseToken as string,kind:lease.snapshot.accountKind as 'owner'|'staff'};
    };
    type Req=ReturnType<typeof request>;
    const call=(r:Req,step:string,action:string)=>JSON.parse(sql(`SELECT bff_account_deletion_engine('${r.id}','${r.token}',${q(step)},${q(r.kind)},${q(action)},NULL);`));
    const record=(r:Req,step:string,result:{affectedCount:number;evidenceHash:string})=>sql(`SELECT bff_record_account_deletion_step('${r.id}','${r.token}',${q(step)},'completed',${result.affectedCount},${q(result.evidenceHash)},NULL);`);
    const advance=(r:Req,through:string)=>{
      for(const step of requiredAccountDeletionSteps(r.kind)){
        if(count('account_deletion_cleanup_steps',`request_id='${r.id}' AND step_code=${q(step)} AND status='completed'`))continue;
        call(r,step,'context');
        const external=['r2_objects_deleted','r2_absence_verified'].includes(step);
        const receipt=call(r,step,external?'complete_external':'execute');
        record(r,step,receipt);if(step===through)break;
      }
    };
    const s=request(staff);advance(s,'staff_attribution_anonymized');
    assert.equal(count('events',`id='${event}' AND actor_id IS NULL`),1);
    assert.equal(count('events_archive',`market_id='${otherMarket}'`),2);
    assert.equal(count('events_archive',`actor_id='${other}' AND archived_by IS NULL`),1);
    assert.equal(count('snapshots',`user_id='${other}'`),1);
    assert.equal(count('preparation_template_applications',`owner_id='${other}' AND actor_id IS NULL`),1);
    assert.equal(count('market_invitations',"code='SYN123'"),0);
    assert.equal(sql(`SELECT payload->>'totalPrice' FROM events WHERE id='${event}';`),'99');
    assert.equal(sql(`SELECT payload->>'productName' FROM events WHERE id='${nullMetadataEvent}';`),'Synthetic member');
    assert.equal(sql(`SELECT payload->>'actorName' FROM events WHERE id='${nullMetadataEvent}';`),'[deleted member]');
    assert.equal(count('events',`id='${nullMetadataEvent}' AND actor_id IS NULL AND metadata->>'deletedActor'='true'`),1);
    assert.equal(count('events',`id='${referencingEvent}' AND actor_id='${other}' AND NOT metadata ? 'deletedActor'`),1);
    assert.ok(!sql(`SELECT request::text FROM owner_workflow_receipts WHERE owner_id='${other}';`).includes(staff));
    pass('staff attribution anonymized in live/archive events and receipts; contaminated snapshot invalidated; owner facts preserved');
    deny(`BEGIN;SELECT set_config('request.jwt.claim.role','authenticated',true);SELECT set_config('request.jwt.claim.sub','${other}',true);UPDATE events SET payload='{"totalPrice":999}' WHERE id='${event}';COMMIT;`);
    pass('deployed event guards still reject ordinary semantic rewrites without disabling triggers');
    advance(s,'profile_deleted');assert.equal(count('profiles',`id='${staff}'`),0);
    assert.equal(count('markets',`id='${otherMarket}'`),1);pass('staff profile can be removed with actual foreign keys; other brand remains');
    for(const who of [pending,upload,billing]){
      const r=request(who);deny(`SELECT bff_account_deletion_engine('${r.id}','${r.token}','access_frozen',${q(r.kind)},'context',NULL);`);
      assert.equal(sql(`SELECT count(*) FROM deletion_engine_private.frozen WHERE request_id='${r.id}';`),'0');
      assert.equal(count('profiles',`id='${who}'`),1);
    }
    assert.equal(count('pending_operations',`operation_id='${pendingId}'`),1);
    pass('cloud pending writes, live upload leases and real billing linkage block before freeze');
    const o=request(owner);
    if(access){advance(o,'access_frozen');verifyCapturedWorkerFence({sql,pass,owner,other,market,otherMarket},o);}
    advance(o,'operational_data_cleaned');
    for(const table of ['markets','products','venues','operation_schedules','market_journals','market_cash_records','market_financial_reviews','market_financial_review_receipts','preparation_templates','preparation_template_applications','owner_workflow_receipts','subscription_accounts','account_entitlements','subscription_write_guard_owners','subscription_test_switch_audit'])assert.equal(count(table,`owner_id='${owner}'`),0,table);
    assert.equal(count('events',`id='${globalEvent}'`),0);
    assert.equal(count('products',`id='${otherProduct}' AND market_id IS NULL`),1);
    assert.equal(count('markets',`id='${otherMarket}'`),1);
    advance(o,'profile_deleted');assert.equal(count('profiles',`id='${owner}'`),0);
    pass('full owner operational cleanup honors FK order, removes global events and preserves another brand shared product');
    sql('ALTER TABLE public.market_journals ADD COLUMN unreviewed_private_note text;');
    deny('SELECT deletion_engine_private.assert_catalog();');sql('ALTER TABLE public.market_journals DROP COLUMN unreviewed_private_note;');
    sql('CREATE TABLE public.unclassified_records(actor_id uuid);');deny('SELECT deletion_engine_private.assert_catalog();');sql('DROP TABLE public.unclassified_records;');
    pass('unreviewed extra columns and tables rejected by captured contract');
    mkdirSync('.codex-artifacts',{recursive:true});writeFileSync(`.codex-artifacts/account-deletion-${access?'access':'operational'}-acceptance.json`,JSON.stringify({at:new Date().toISOString(),checks,tableContracts:40,scope:access?'134 captured routines, 5 views and captured public-table triggers; isolated SQL only':'SQL data steps only; no Auth/R2/store/production acceptance',productionEnabled:false},null,2));
  }finally{
    if(started){const inspect=JSON.parse(docker(['inspect',db]))[0];assert.equal(inspect.Config.Labels['feria-purpose'],purpose);assert.equal(inspect.HostConfig.NetworkMode,'none');assert.equal(inspect.Mounts.filter((m:{Type:string})=>m.Type==='bind').length,0);docker(['rm','-fv',db]);}
  }
  console.log(`PASS operational coverage (${checks.length} scenarios); disposable PostgreSQL removed`);
}
void main().catch(e=>{console.error(e instanceof Error?e.stack:'Isolated data-stage verification failed');process.exitCode=1;});
