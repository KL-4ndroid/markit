/** Disposable PostgreSQL verification. No credentials, network or production writes. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID as uuid } from 'node:crypto';
const load = p => JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const snapshot = load('tests/fixtures/event-write-deployed-2026-10-27.json');
const helpers = load('tests/fixtures/event-write-deployed-helpers-2026-10-27.json');
const downstream = load('tests/fixtures/event-write-deployed-downstream-2026-10-28.json');
const patched = process.argv.includes('--deployed') ? load('tests/fixtures/event-write-patched-deployed-2026-10-28.json') : null;
if(patched) for(const g of patched.guards) {
  const file=g.signature.startsWith('enforce_event')?'supabase/migrations/086_enforce_event_actor_authorization.sql':'supabase/migrations/087_guard_staff_role_permission_consistency.sql';
  const normalize=s=>s.replace(/--[^\n]*/g,'').replace(/\s/g,'');
  assert.equal(normalize(g.definition.split('$function$')[1]),normalize(readFileSync(file,'utf8').split('$body$')[1]),g.signature);
  assert.equal(g.anon_execute,false);assert.equal(g.authenticated_execute,false);
}
const { PGlite } = await import(pathToFileURL(resolve('.codex-artifacts/region-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
const pg = new PGlite();
const owner=uuid(), other=uuid(), operator=uuid(), manager=uuid(), viewer=uuid();
const market=uuid(), foreignMarket=uuid(), product=uuid(), foreignProduct=uuid();
const root=()=>pg.exec('RESET ROLE');
const asUser=async(id, role='authenticated')=>{await root();await pg.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[id ?? '',role]);await pg.exec(`SET ROLE ${role}`);};
const event=async(actor,type,payload={},marketId=market,timestamp=new Date().toISOString())=>{
  const id=uuid();await pg.query('INSERT INTO events(id,actor_id,type,payload,market_id,timestamp) VALUES($1,$2,$3,$4,$5,$6)',[id,actor,type,JSON.stringify(payload),marketId,timestamp]);return id;
};
let passed=0;
const check=async(name,fn)=>{await fn();console.log(`PASS ${name}`);passed++;};
const deny=fn=>assert.rejects(fn,e=>e.code==='42501'||e.code==='22023'||e.code==='22P02');
const value=async(sql,args=[])=>{await root();return (await pg.query(sql,args)).rows[0];};
try {
  assert.equal(snapshot.authenticated_insert,true);
  await pg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::UUID$$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
    CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT);
    CREATE TABLE profiles(id UUID PRIMARY KEY);
    CREATE TYPE sync_status AS ENUM('synced','pending','local_only','failed');
    CREATE FUNCTION uuid_generate_v4() RETURNS UUID LANGUAGE sql AS $$SELECT gen_random_uuid()$$;
  `);
  for(const table of ['staff_relationships','markets','products','market_members','events']) {
    const columns=snapshot.columns.filter(c=>c.table===table).map(c=>`"${c.column}" ${c.type}${c.nullable==='NO'?' NOT NULL':''}${c.default?` DEFAULT ${c.default}`:''}`);
    const constraint=table==='events'?snapshot.constraints.map(c=>`CONSTRAINT "${c.name}" ${c.definition}`).join(','):
      table==='market_members'?'PRIMARY KEY(market_id,user_id)':'PRIMARY KEY(id)';
    await pg.exec(`CREATE TABLE ${table}(${columns.join(',')},${constraint});`);
  }
  await pg.exec(`CREATE TABLE venues(id UUID PRIMARY KEY,owner_id UUID);
    CREATE TABLE operation_schedules(id UUID PRIMARY KEY,owner_id UUID);
    CREATE TABLE market_journals(id UUID,market_id UUID);
    CREATE TABLE market_cash_records(id UUID,market_id UUID,owner_id UUID,data JSONB);
    CREATE TABLE daily_stats(id UUID,market_id UUID,owner_id UUID);
    CREATE TABLE product_cover_photos(id UUID,product_id UUID,owner_id UUID,status TEXT);
    CREATE TABLE sale_photo_evidence(id UUID,market_id UUID,owner_id UUID,status TEXT);
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated,service_role;
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
    CREATE POLICY market_owner ON markets TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
    ALTER TABLE products ENABLE ROW LEVEL SECURITY;
    CREATE POLICY product_owner ON products TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
  `);
  for(const [id,email] of [[owner,'owner@example.test'],[other,'other@example.test'],[operator,'operator@example.test'],[manager,'manager@example.test'],[viewer,'viewer@example.test']]) {
    await pg.query('INSERT INTO profiles VALUES($1)',[id]);await pg.query('INSERT INTO auth.users VALUES($1,$2)',[id,email]);
  }
  await pg.exec(readFileSync('supabase/migrations/063_add_subscription_accounts.sql','utf8'));
  await pg.exec(readFileSync('supabase/migrations/082_add_subscription_write_guards.sql','utf8'));
  // Replace event functions with the full actual deployed definitions, not inferred migration history.
  for(const helper of [...snapshot.helpers,...helpers])await pg.exec(helper.definition);
  for(const t of snapshot.triggers){assert.equal(t.enabled,'O');await pg.exec(t.function);await pg.exec(t.trigger.replace('CREATE TRIGGER','CREATE OR REPLACE TRIGGER'));}
  for(const t of downstream.triggers){assert.equal(t.enabled,'O');await pg.exec(t.function);await pg.exec(t.trigger.replace('CREATE TRIGGER','CREATE OR REPLACE TRIGGER'));}
  for(const c of downstream.constraints)if(!c.definition.startsWith('PRIMARY KEY'))await pg.exec(`ALTER TABLE ${c.table} ADD CONSTRAINT "${c.name}" ${c.definition}`);
  for(const p of snapshot.policies)await pg.exec(`CREATE POLICY "${p.policyname}" ON events AS ${p.permissive} FOR ${p.cmd} TO ${p.roles.join(',')}${p.qual?` USING (${p.qual})`:''}${p.with_check?` WITH CHECK (${p.with_check})`:''}`);
  await pg.query("INSERT INTO subscription_accounts(owner_id,plan_code,plan_source) VALUES($1,'team','admin'),($2,'pro','admin')",[owner,other]);
  for(const [id,role] of [[operator,'operator'],[manager,'manager'],[viewer,'viewer']])await pg.query("INSERT INTO staff_relationships(owner_id,staff_id,staff_email,status,role,permissions) VALUES($1,$2,'synthetic@example.test','active',$3,$4)",[owner,id,role,JSON.stringify({can_view:true,can_edit:role!=='viewer',infoLevel:role==='viewer'?0:2})]);
  await pg.query("INSERT INTO markets(id,owner_id,name,location,start_date,end_date) VALUES($1,$2,'owned','synthetic',current_date,current_date),($3,$4,'foreign','synthetic',current_date,current_date)",[market,owner,foreignMarket,other]);
  await pg.query("INSERT INTO market_members(market_id,user_id,role) VALUES($1,$2,'owner'),($3,$4,'owner')",[market,owner,foreignMarket,other]);
  await pg.query("INSERT INTO products(id,owner_id,name,category,price,stock) VALUES($1,$2,'owned','other',120,2),($3,$4,'foreign','other',99,3)",[product,owner,foreignProduct,other]);
  await check('BASELINE: outsider can alter another owner market through deployed policies and all eight triggers',async()=>{
    await asUser(other);await event(other,'market_updated',{market_id:market,updates:{name:'vulnerable'}},market);
    assert.equal((await value('SELECT name FROM markets WHERE id=$1',[market])).name,'vulnerable');
  });
  await check('BASELINE: viewer can alter market and cross-envelope product through deployed projections',async()=>{
    await asUser(viewer);await event(viewer,'market_updated',{market_id:market,updates:{name:'viewer-write'}},market);
    assert.equal((await value('SELECT name FROM markets WHERE id=$1',[market])).name,'viewer-write');
    await asUser(viewer);await event(viewer,'product_updated',{productId:foreignProduct,updates:{price:1}},market);
    assert.equal((await value('SELECT price FROM products WHERE id=$1',[foreignProduct])).price,'1');
  });
  if(process.argv.includes('--baseline-only')) { console.log('Confirmed isolated baseline vulnerabilities; no production writes.'); } else {
    const migration=readFileSync('supabase/migrations/086_enforce_event_actor_authorization.sql','utf8');
    await root();await pg.exec(migration);await pg.exec(migration);
    if(patched)await pg.exec(patched.guards.find(g=>g.signature.startsWith('enforce_event')).definition);
    await check('guard helper is not callable by anon or authenticated; trigger is enabled',async()=>{
      const r=await value("SELECT has_function_privilege('anon','public.enforce_event_actor_authorization()','EXECUTE') a,has_function_privilege('authenticated','public.enforce_event_actor_authorization()','EXECUTE') b");assert.deepEqual(r,{a:false,b:false});
      await pg.exec(readFileSync('supabase/verification/086_event_actor_authorization_readiness.sql','utf8'));
    });
    await check('outsiders, forged actor, null identity, and mismatched market aliases fail before projection',async()=>{
      await asUser(other);await deny(()=>event(other,'market_updated',{market_id:market,updates:{name:'blocked'}},market));
      await asUser(owner);await deny(()=>event(other,'market_updated',{market_id:market,updates:{name:'blocked'}},market));
      await deny(()=>event(owner,'market_updated',{market_id:foreignMarket,updates:{name:'blocked'}},market));
      await deny(()=>event(owner,'market_updated',{market_id:market,marketId:foreignMarket,updates:{}},market));
      await asUser(null);await deny(()=>event(owner,'market_started',{},market));
      assert.equal((await value('SELECT name FROM markets WHERE id=$1',[market])).name,'viewer-write');
    });
    await check('viewer and unknown/revoked roles cannot write; operator only gets its work capabilities',async()=>{
      await asUser(viewer);for(const type of ['market_updated','market_started','product_updated','deal_closed','checklist_item_created'])await deny(()=>event(viewer,type,{market_id:market,productId:product,updates:{}},market));
      await asUser(operator);await deny(()=>event(operator,'market_updated',{market_id:market,updates:{notes:'blocked'}},market));await deny(()=>event(operator,'product_updated',{productId:product,updates:{price:1}},market));
      await event(operator,'interaction_recorded',{market_id:market,type:'browse'},market);
      await event(operator,'checklist_item_updated',{market_id:market,itemId:'synthetic',completed:true},market);
      await deny(()=>event(operator,'checklist_item_updated',{market_id:market,itemId:'synthetic',completed:true,text:'injected'},market));
      await deny(()=>event(operator,'interaction_recorded',{market_id:market,type:'field_note'},market));
      await deny(()=>event(operator,'interaction_recorded',{market_id:market,type:'browse',interactionType:'field_note'},market));
      await deny(()=>event(operator,'interaction_recorded',{market_id:market,type:'browse',interaction_type:'field_note'},market));
      await root();await pg.query("UPDATE staff_relationships SET status='revoked' WHERE staff_id=$1",[operator]);await asUser(operator);await deny(()=>event(operator,'interaction_recorded',{type:'browse'},market));
      await root();await pg.query("UPDATE staff_relationships SET status='active' WHERE staff_id=$1",[operator]);
      await assert.rejects(()=>pg.query("UPDATE staff_relationships SET role='unexpected' WHERE staff_id=$1",[operator]),e=>e.code==='23514');
    });
    await check('manager basic fields succeed; financial, ownership and lifecycle edits fail',async()=>{
      await asUser(manager);await event(manager,'market_updated',{market_id:market,updates:{notes:'allowed',operating_start_time:'10:00'}},market);
      await event(manager,'product_updated',{productId:product,updates:{price:130,stock:4}},market);
      for(const updates of [{booth_cost:1},{total_revenue:99},{owner_id:manager},{operation_phase:'open'},{name:'not-whitelisted'}])await deny(()=>event(manager,'market_updated',{market_id:market,updates},market));
      await deny(()=>event(manager,'product_updated',{productId:product,updates:{cost:1}},market));
      await deny(()=>event(manager,'product_updated',{productId:foreignProduct,updates:{price:2}},market));
      for(const type of ['market_started','market_deleted','market_created','product_created','product_deleted','settings_updated'])await deny(()=>event(manager,type,{market_id:market,productId:product},market));
      await event(manager,'field_note_created',{market_id:market,noteId:'synthetic',text:'allowed'},market);
    });
    await check('real sales projections succeed; another owner product cannot be smuggled into a sale',async()=>{
      await asUser(operator);await deny(()=>event(operator,'deal_closed',{market_id:market,items:[{productId:foreignProduct,quantity:1,price:99}],totalAmount:99},market));
      const id=await event(operator,'deal_closed',{market_id:market,items:[{productId:product,quantity:1,price:130}],totalAmount:130,isBackfill:false},market);
      assert.equal((await value('SELECT stock FROM products WHERE id=$1',[product])).stock,3);
      await asUser(operator);await event(operator,'deal_deleted',{market_id:market,eventId:id},market);
      assert.equal((await value('SELECT stock FROM products WHERE id=$1',[product])).stock,4);
      await asUser(owner);const owned=await event(owner,'deal_closed',{market_id:market,totalAmount:10,isManualEntry:true},market);
      await asUser(operator);await deny(()=>event(operator,'deal_deleted',{market_id:market,eventId:owned},market));
      await asUser(operator);const old=await event(operator,'interaction_recorded',{type:'browse'},market,new Date(Date.now()-86400000).toISOString());await deny(()=>event(operator,'interaction_deleted',{eventId:old},market));
    });
    await check('staff loses write access immediately when Team ends, owner still has Free metadata',async()=>{
      await root();await pg.query("UPDATE subscription_accounts SET plan_code='pro',plan_source='admin' WHERE owner_id=$1",[owner]);await asUser(operator);await deny(()=>event(operator,'interaction_recorded',{type:'browse'},market));
      await root();await pg.query("INSERT INTO subscription_write_guard_owners(owner_id,enabled) VALUES($1,true)",[owner]);await pg.query("UPDATE subscription_accounts SET plan_code='free',plan_source='free' WHERE owner_id=$1",[owner]);
      await asUser(owner);await event(owner,'market_updated',{market_id:market,updates:{notes:'free allowed'}},market);await deny(()=>event(owner,'deal_closed',{isManualEntry:true,totalAmount:10},market));
      await root();await pg.query("UPDATE subscription_accounts SET plan_code='team',plan_source='admin' WHERE owner_id=$1",[owner]);
    });
    await check('event semantic UPDATE fails for everyone; metadata acknowledgement survives downgrade',async()=>{
      await asUser(owner);const id=await event(owner,'interaction_recorded',{type:'browse'},market);
      await deny(()=>pg.query("UPDATE events SET timestamp=now()+interval '1 day' WHERE id=$1",[id]));
      await deny(()=>pg.query("UPDATE events SET payload='{}' WHERE id=$1",[id]));
      await root();await pg.query("UPDATE subscription_accounts SET plan_code='free',plan_source='free' WHERE owner_id=$1",[owner]);await asUser(owner);await pg.query("UPDATE events SET metadata='{}',sync_status='synced' WHERE id=$1",[id]);
    });
    await check('owner creation and foreign collision protections remain correct',async()=>{
      await asUser(owner);const m=uuid();await event(owner,'market_created',{marketId:m,name:'new',location:'synthetic',startDate:'2026-10-28',endDate:'2026-10-28'},m);
      await deny(()=>event(owner,'market_created',{marketId:foreignMarket,name:'collision'},foreignMarket));
      await root();await pg.query("UPDATE subscription_accounts SET plan_code='pro',plan_source='admin' WHERE owner_id=$1",[owner]);await asUser(owner);
      const p=uuid();await event(owner,'product_created',{productId:p,name:'new',category:'other',price:100},null);
      await event(owner,'product_updated',{productId:p,updates:{price:110}},null);
      await deny(()=>event(owner,'product_updated',{productId:foreignProduct,updates:{price:1}},null));
    });
    await check('atomic mixed batch rolls back projections; backend cleanup remains trusted',async()=>{
      await asUser(owner);const id=await event(owner,'interaction_recorded',{type:'browse'},market);
      const prior=await value('SELECT total_interactions FROM markets WHERE id=$1',[market]);
      await asUser(owner);await deny(()=>pg.query(`INSERT INTO events(id,actor_id,type,payload,market_id) VALUES
        ($1,$2,'interaction_recorded','{"type":"browse"}',$3),($4,$2,'interaction_recorded','{}',$5)`,[uuid(),owner,market,uuid(),foreignMarket]));
      assert.deepEqual(await value('SELECT total_interactions FROM markets WHERE id=$1',[market]),prior);
      await asUser(owner,'service_role');await pg.query('DELETE FROM events WHERE id=$1',[id]);
    });
    await check('087 blocks mismatches through legacy RPC and direct updates, keeps existing restricted data untouched',async()=>{
      await root();await pg.query("UPDATE subscription_accounts SET plan_code='team',plan_source='admin' WHERE owner_id=$1",[owner]);
      await pg.query("UPDATE staff_relationships SET permissions=$1 WHERE staff_id=$2",[JSON.stringify({can_view:true,can_edit:false,infoLevel:0}),operator]);
      const before=(await pg.query('SELECT role,permissions FROM staff_relationships WHERE staff_id=$1',[operator])).rows[0];
      const m=readFileSync('supabase/migrations/087_guard_staff_role_permission_consistency.sql','utf8');await pg.exec(m);await pg.exec(m);
      if(patched)await pg.exec(patched.guards.find(g=>g.signature.startsWith('guard_staff')).definition);
      await pg.exec(readFileSync('supabase/verification/087_staff_role_permission_readiness.sql','utf8'));
      assert.deepEqual((await pg.query('SELECT role,permissions FROM staff_relationships WHERE staff_id=$1',[operator])).rows[0],before);
      await pg.query("UPDATE staff_relationships SET status='suspended_by_plan' WHERE staff_id=$1",[operator]);
      await pg.query("UPDATE staff_relationships SET status='active' WHERE staff_id=$1",[operator]);
      const relation=(await pg.query('SELECT id FROM staff_relationships WHERE staff_id=$1',[manager])).rows[0].id;
      await asUser(owner);await pg.query('SELECT update_staff_role($1,$2)',[relation,'operator']);
      await deny(()=>pg.query('SELECT update_staff_permissions($1,$2)',[relation,JSON.stringify({can_view:true,can_edit:false,infoLevel:0})]));
      await root();await deny(()=>pg.query("UPDATE staff_relationships SET permissions='{}' WHERE id=$1",[relation]));
      await asUser(owner);await pg.query('SELECT update_staff_role($1,$2)',[relation,'viewer']);
      await pg.query('SELECT update_staff_permissions($1,$2)',[relation,JSON.stringify({can_view:true,can_edit:false,infoLevel:0})]);
      await asUser(other);await assert.rejects(()=>pg.query('SELECT update_staff_role($1,$2)',[relation,'manager']));
    });
    console.log(`${passed} isolated event/staff authorization checks passed; production was never used for writes.`);
  }
} catch(error) { console.error(JSON.stringify({message:error.message,code:error.code,where:error.where,query:error.query},null,2)); process.exitCode=1; }
finally {await pg.close();}
