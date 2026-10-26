/** Disposable Postgres verification. Never reads credentials or connects to Supabase. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID as uuid } from 'node:crypto';
const { PGlite } = await import(pathToFileURL(resolve('.codex-artifacts/region-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
const pg = new PGlite();
const owner=uuid(), other=uuid(), staff=uuid(), viewer=uuid(), market=uuid(), foreignMarket=uuid(), product=uuid();
let passed=0;
const check=async(name,fn)=>{await fn();passed++;console.log(`PASS ${name}`);};
const root=()=>pg.exec('RESET ROLE');
const asUser=async(id,role='authenticated')=>{await root();await pg.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",[id,role]);await pg.exec(`SET ROLE ${role}`);};
const switchPlan=async(plan,enabled=true)=>{await asUser(owner,'service_role');return (await pg.query('SELECT set_subscription_test_switch($1,$2,$3) AS state',[owner,plan,enabled])).rows[0].state;};
const event=async(type='deal_closed',payload={},marketId=market,actor=owner)=>pg.query('INSERT INTO events(id,type,payload,market_id,actor_id) VALUES($1,$2,$3,$4,$5)',[uuid(),type,JSON.stringify(payload),marketId,actor]);
try {
  await pg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::UUID$$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
    CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT); INSERT INTO auth.users VALUES('${owner}','123@123'),('${other}','other@example.test');
    CREATE TABLE profiles(id UUID PRIMARY KEY); INSERT INTO profiles VALUES('${owner}'),('${other}'),('${staff}'),('${viewer}');
    CREATE TABLE staff_relationships(owner_id UUID,staff_id UUID,status TEXT,role TEXT);
    INSERT INTO staff_relationships VALUES('${owner}','${staff}','active','manager'),('${owner}','${viewer}','active','viewer');
    CREATE TABLE markets(id UUID PRIMARY KEY,owner_id UUID,notes TEXT,total_revenue NUMERIC DEFAULT 0,total_profit NUMERIC DEFAULT 0,total_deals INTEGER DEFAULT 0,total_interactions INTEGER DEFAULT 0);
    INSERT INTO markets(id,owner_id) VALUES('${market}','${owner}'),('${foreignMarket}','${other}');
    CREATE TABLE products(id UUID PRIMARY KEY,owner_id UUID,name TEXT);
    INSERT INTO products VALUES('${product}','${owner}','existing');
    CREATE TABLE events(id UUID PRIMARY KEY,actor_id UUID,market_id UUID,type TEXT,payload JSONB,metadata JSONB);
    CREATE TABLE market_cash_records(id UUID PRIMARY KEY,market_id UUID,owner_id UUID,data JSONB);
    CREATE TABLE daily_stats(id UUID PRIMARY KEY,market_id UUID,owner_id UUID);
    CREATE TABLE product_cover_photos(id UUID PRIMARY KEY,product_id UUID,owner_id UUID,status TEXT);
    CREATE TABLE sale_photo_evidence(id UUID PRIMARY KEY,market_id UUID,owner_id UUID,status TEXT);
    GRANT SELECT,INSERT,UPDATE,DELETE ON markets,products,events,market_cash_records,daily_stats,product_cover_photos,sale_photo_evidence TO authenticated,service_role;
    ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_market ON markets TO authenticated USING(owner_id=auth.uid()) WITH CHECK(owner_id=auth.uid());
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_events ON events TO authenticated USING(actor_id=auth.uid()) WITH CHECK(actor_id=auth.uid() AND (market_id IS NULL OR EXISTS(SELECT 1 FROM markets m WHERE m.id=market_id AND m.owner_id=auth.uid())));
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
  `);
  await pg.exec(readFileSync('supabase/migrations/063_add_subscription_accounts.sql','utf8'));
  const migration=readFileSync('supabase/migrations/082_add_subscription_write_guards.sql','utf8');
  await pg.exec(migration); await pg.exec(migration);
  await check('migration reruns without enrolling owners or changing original account rows',async()=>{
    assert.equal((await pg.query('SELECT count(*)::int n FROM subscription_write_guard_owners')).rows[0].n,0);
    assert.equal((await pg.query('SELECT count(*)::int n FROM subscription_accounts')).rows[0].n,0);
    await asUser(other);await event('deal_closed',{},foreignMarket,other);
  });
  await root();
  await assert.rejects(pg.exec(readFileSync('supabase/verification/082_subscription_write_guard_readiness.sql','utf8')),/must be enrolled/);
  await pg.exec(readFileSync('supabase/repairs/082_enable_test_account_write_guards.sql','utf8'));
  await pg.exec(readFileSync('supabase/repairs/082_enable_test_account_write_guards.sql','utf8'));
  await pg.exec(readFileSync('supabase/verification/082_subscription_write_guard_readiness.sql','utf8'));
  assert.equal((await pg.query('SELECT count(*)::int n FROM subscription_write_guard_owners')).rows[0].n,1);
  await check('private helpers, switch RPC and tables are not callable or writable by clients',async()=>{
    const r=(await pg.query(`SELECT has_function_privilege('authenticated','set_subscription_test_switch(UUID,TEXT,BOOLEAN)','EXECUTE') a,
      has_function_privilege('authenticated','subscription_effective_plan(UUID)','EXECUTE') b,
      has_function_privilege('anon','check_subscription_write_access(UUID,TEXT)','EXECUTE') c,
      has_table_privilege('authenticated','subscription_write_guard_owners','INSERT,UPDATE,DELETE') d,
      has_function_privilege('authenticated','check_subscription_write_access(UUID,TEXT)','EXECUTE') allowed`)).rows[0];
    assert.deepEqual(r,{a:false,b:false,c:false,d:false,allowed:true});
    await asUser(owner);await assert.rejects(pg.query('SELECT set_subscription_test_switch($1,$2,true)',[owner,'team']),/permission denied/);
  });
  await check('Free keeps market metadata and zero initial summaries but blocks paid writes',async()=>{
    await asUser(owner);
    await pg.query('UPDATE markets SET notes=$1 WHERE id=$2',['free notes',market]);
    await pg.query('INSERT INTO markets(id,owner_id,total_revenue) VALUES($1,$2,0.00)',[uuid(),owner]);
    for(const type of ['deal_closed','deal_deleted','interaction_recorded','interaction_deleted','field_note_created']) await assert.rejects(event(type),/SUBSCRIPTION_PLAN_REQUIRED/);
    await event('market_updated',{updates:{notes:'allowed',total_revenue:0}});
    await assert.rejects(event('market_updated',{updates:{total_revenue:99}}),/SUBSCRIPTION_PLAN_REQUIRED/);
    await assert.rejects(event('market_updated',{updates:{totalRevenue:99}}),/SUBSCRIPTION_PLAN_REQUIRED/);
    await assert.rejects(pg.query('UPDATE markets SET total_revenue=1 WHERE id=$1',[market]),/SUBSCRIPTION_PLAN_REQUIRED/);
    await assert.rejects(pg.query('INSERT INTO products VALUES($1,$2,$3)',[uuid(),owner,'new']),/SUBSCRIPTION_PLAN_REQUIRED/);
    await assert.rejects(pg.query('INSERT INTO market_cash_records VALUES($1,$2,$3,$4)',[uuid(),market,owner,'{}']),/SUBSCRIPTION_PLAN_REQUIRED/);
    for(const type of ['market_operating_opened','checklist_item_created','market_created']) await event(type);
  });
  await check('Light enables sales, products, cash and covers; sales photos and shared notes require High',async()=>{
    const state=await switchPlan('pro');assert.equal(state.cloudBacked,true);assert.equal(state.planCode,'pro');
    await asUser(owner);await event();await event('interaction_recorded');
    await event('product_updated',{productId:product},null);
    await pg.query('INSERT INTO market_cash_records VALUES($1,$2,$3,$4)',[uuid(),market,owner,'{}']);
    await pg.query('INSERT INTO product_cover_photos VALUES($1,$2,$3,$4)',[uuid(),product,owner,'uploading']);
    await assert.rejects(pg.query('INSERT INTO sale_photo_evidence VALUES($1,$2,$3,$4)',[uuid(),market,owner,'uploading']),/SUBSCRIPTION_PLAN_REQUIRED/);
    await assert.rejects(event('field_note_created'),/SUBSCRIPTION_PLAN_REQUIRED/);
  });
  await check('High enables sales photos/shared notes, preserves existing entity RLS and rejects forged scope',async()=>{
    await switchPlan('team');await asUser(owner);
    await event('field_note_created');
    await pg.query('INSERT INTO sale_photo_evidence VALUES($1,$2,$3,$4)',[uuid(),market,owner,'uploading']);
    await assert.rejects(event('deal_closed',{},foreignMarket),/row-level security/);
    await assert.rejects(pg.query('INSERT INTO market_cash_records VALUES($1,$2,$3,$4)',[uuid(),foreignMarket,owner,'{}']),/SUBSCRIPTION_SCOPE/);
    const allowed=(await pg.query('SELECT check_subscription_write_access($1,$2) result',[other,'sales'])).rows[0].result;assert.equal(allowed.allowed,false);
  });
  await check('staff needs active High owner and suitable role; cash remains owner-only',async()=>{
    await asUser(staff);
    for(const [feature,allowed] of [['sales',true],['products',true],['sales_photo',true],['cash',false]]) assert.equal((await pg.query('SELECT check_subscription_write_access($1,$2) r',[owner,feature])).rows[0].r.allowed,allowed);
    await asUser(viewer);assert.equal((await pg.query('SELECT check_subscription_write_access($1,$2) r',[owner,'sales'])).rows[0].r.allowed,false);
    await switchPlan('pro');await asUser(staff);assert.equal((await pg.query('SELECT check_subscription_write_access($1,$2) r',[owner,'sales'])).rows[0].r.allowed,false);
  });
  await check('capability RPC and write authority share test plan; reset restores original account',async()=>{
    await root();await pg.query("INSERT INTO subscription_accounts(owner_id,plan_code,plan_source) VALUES($1,'team','admin')",[owner]);
    await switchPlan('free');await asUser(owner,'service_role');
    const read=async()=> (await pg.query('SELECT * FROM read_subscription_account_for_actor($1,$1)',[owner])).rows[0];
    assert.equal((await read()).plan_code,'free');assert.equal((await read()).plan_source,'free');
    await switchPlan(null,false);assert.equal((await read()).plan_code,'team');
    await root();assert.equal((await pg.query('SELECT plan_code FROM subscription_accounts WHERE owner_id=$1',[owner])).rows[0].plan_code,'team');
    await assert.rejects(pg.query('SELECT set_subscription_test_switch($1,$2,true)',[other,'team']),/TEST_SWITCH_NOT_ALLOWED/);
  });
  await check('expiry restores original authority; metadata acknowledgement and photo compensation still work',async()=>{
    await switchPlan('team');await asUser(owner);const id=uuid();
    await pg.query("INSERT INTO sale_photo_evidence VALUES($1,$2,$3,'uploading')",[id,market,owner]);
    const eventId=uuid();await pg.query("INSERT INTO events(id,actor_id,market_id,type,payload) VALUES($1,$2,$3,'deal_closed','{}')",[eventId,owner,market]);
    await switchPlan('free');await asUser(owner);
    await pg.query("UPDATE sale_photo_evidence SET status='upload_failed' WHERE id=$1",[id]);
    await assert.rejects(pg.query("UPDATE sale_photo_evidence SET status='uploaded' WHERE id=$1",[id]),/SUBSCRIPTION_PLAN_REQUIRED/);
    await pg.query("UPDATE events SET metadata='{}' WHERE id=$1",[eventId]);
    await assert.rejects(pg.query("UPDATE events SET type='market_created' WHERE id=$1",[eventId]),/EVENT_IMMUTABLE/);
    await root();await pg.query("UPDATE subscription_accounts SET entitlement_status='inactive' WHERE owner_id=$1",[owner]);
    await pg.query("UPDATE subscription_write_guard_owners SET test_expires_at=now()-INTERVAL '1 second' WHERE owner_id=$1",[owner]);
    await asUser(owner);await assert.rejects(event(),/SUBSCRIPTION_PLAN_REQUIRED/);
    await asUser(owner,'service_role');assert.equal((await pg.query('SELECT read_subscription_test_switch($1) r',[owner])).rows[0].r.enabled,false);
  });
  console.log(`${passed} subscription SQL checks passed (isolated database only).`);
} finally { await pg.close(); }
