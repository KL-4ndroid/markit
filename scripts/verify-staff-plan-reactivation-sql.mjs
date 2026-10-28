/** Isolated PostgreSQL fixture only. No credentials, network or live writes. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID as uuid} from 'node:crypto';
const {PGlite}=await import(pathToFileURL(resolve('.codex-artifacts/region-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
const pg=new PGlite();
const deployed=JSON.parse(readFileSync('tests/fixtures/staff-lifecycle-deployed-2026-10-28.json','utf8').replace(/^\uFEFF/,''));
const owner=uuid(),staff=uuid(),other=uuid(),relationship=uuid(),market=uuid();
const canonical={can_view:true,can_edit:true,infoLevel:2};
let passed=0;
const check=async(name,fn)=>{await fn();passed++;console.log(`PASS ${name}`);};
const root=()=>pg.exec('RESET ROLE');
const asUser=async(id)=>{await root();await pg.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",[id]);await pg.exec('SET ROLE authenticated');};
const state=async()=>{await root();return (await pg.query(`SELECT sr.status,sr.role,sr.permissions,
  has_authoritative_team_entitlement(sr.owner_id) AS team,
  (SELECT count(*)::int FROM market_members WHERE market_id=$2 AND user_id=$3) AS memberships
  FROM staff_relationships sr WHERE sr.id=$1`,[relationship,market,staff])).rows[0];};
const restore=async(actor=owner)=>{await asUser(actor);await pg.query('SELECT restore_staff_relationship($1)',[relationship]);};
const account=async(plan,ends=null)=>{await root();await pg.query(`UPDATE subscription_accounts SET plan_code=$2,
  plan_source=CASE WHEN $2='free' THEN 'free' ELSE 'admin' END,billing_status='none',entitlement_status='active',entitlement_ends_at=$3 WHERE owner_id=$1`,[owner,plan,ends]);};
const toggle=async(plan,enabled=true)=>{await root();return pg.query('SELECT set_subscription_test_switch($1,$2,$3)',[owner,plan,enabled]);};
// Fixtures simulate an existing database after time has elapsed. Disable only
// the disposable source triggers while seeding OLD rows; never a live database.
const seed=async({plan='free',ends=null,override=null,expires=null,status='active',permissions=canonical}={})=>{
  await root();
  await pg.exec('ALTER TABLE subscription_accounts DISABLE TRIGGER sync_team_plan_staff_suspension');
  const overrideTrigger=(await pg.query("SELECT 1 FROM pg_trigger WHERE tgname='sync_team_override_staff_suspension'")).rows.length>0;
  if(overrideTrigger)await pg.exec('ALTER TABLE subscription_write_guard_owners DISABLE TRIGGER sync_team_override_staff_suspension');
  await account(plan,ends);
  await pg.query(`UPDATE subscription_write_guard_owners SET enabled=true,allow_test_switch=true,test_plan_code=$2,test_expires_at=$3 WHERE owner_id=$1`,[owner,override,expires]);
  if((await pg.query("SELECT 1 FROM pg_trigger WHERE tgname='staff_role_permission_consistency'")).rows.length)await pg.exec('ALTER TABLE staff_relationships DISABLE TRIGGER staff_role_permission_consistency');
  await pg.query('UPDATE staff_relationships SET status=$2,permissions=$3 WHERE id=$1',[relationship,status,JSON.stringify(permissions)]);
  if((await pg.query("SELECT 1 FROM pg_trigger WHERE tgname='staff_role_permission_consistency'")).rows.length)await pg.exec('ALTER TABLE staff_relationships ENABLE TRIGGER staff_role_permission_consistency');
  await pg.query("INSERT INTO market_members(market_id,user_id,role) VALUES($1,$2,'staff') ON CONFLICT DO NOTHING",[market,staff]);
  await pg.exec('ALTER TABLE subscription_accounts ENABLE TRIGGER sync_team_plan_staff_suspension');
  if(overrideTrigger)await pg.exec('ALTER TABLE subscription_write_guard_owners ENABLE TRIGGER sync_team_override_staff_suspension');
};
const future=()=>new Date(Date.now()+86400000).toISOString(),past=()=>new Date(Date.now()-86400000).toISOString();
try {
  await pg.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
    CREATE SCHEMA auth;GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::UUID$$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$SELECT current_setting('request.jwt.claim.role',true)$$;
    CREATE TABLE auth.users(id UUID PRIMARY KEY,email TEXT);
    CREATE TABLE profiles(id UUID PRIMARY KEY);
    CREATE TABLE staff_relationships(id UUID PRIMARY KEY,owner_id UUID,staff_id UUID,status TEXT,role TEXT,permissions JSONB);
    CREATE TABLE markets(id UUID PRIMARY KEY,owner_id UUID,status TEXT,total_revenue NUMERIC DEFAULT 0,total_profit NUMERIC DEFAULT 0,total_deals INT DEFAULT 0,total_interactions INT DEFAULT 0);
    CREATE TABLE market_members(market_id UUID,user_id UUID,role TEXT,joined_at TIMESTAMPTZ DEFAULT now(),PRIMARY KEY(market_id,user_id));
    CREATE TABLE products(id UUID PRIMARY KEY,owner_id UUID);
    CREATE TABLE events(id UUID PRIMARY KEY,actor_id UUID,market_id UUID,type TEXT,payload JSONB,metadata JSONB);
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
    GRANT SELECT ON staff_relationships,market_members TO authenticated;
  `);
  for(const id of [owner,staff,other]){await pg.query('INSERT INTO profiles VALUES($1)',[id]);await pg.query("INSERT INTO auth.users VALUES($1,'synthetic@example.test')",[id]);}
  await pg.exec(readFileSync('supabase/migrations/063_add_subscription_accounts.sql','utf8'));
  await pg.exec(readFileSync('supabase/migrations/082_add_subscription_write_guards.sql','utf8'));
  for(const f of deployed)await pg.exec(f.definition);
  await pg.exec('CREATE TRIGGER sync_team_plan_staff_suspension AFTER INSERT OR UPDATE OR DELETE ON subscription_accounts FOR EACH ROW EXECUTE FUNCTION sync_team_plan_staff_suspension()');
  await pg.query("INSERT INTO subscription_accounts(owner_id,plan_code,plan_source) VALUES($1,'free','free')",[owner]);
  await pg.query('INSERT INTO subscription_write_guard_owners(owner_id,enabled,allow_test_switch) VALUES($1,true,true)',[owner]);
  await pg.query("INSERT INTO markets(id,owner_id,status) VALUES($1,$2,'paid')",[market,owner]);
  await pg.query("INSERT INTO staff_relationships VALUES($1,$2,$3,'active','operator',$4)",[relationship,owner,staff,JSON.stringify(canonical)]);
  await check('BASELINE deployed override reactivation exposes retained active relationship',async()=>{
    await seed();assert.equal((await state()).team,false);await toggle('team');const s=await state();assert.equal(s.status,'active');assert.equal(s.team,true);
  });
  await check('BASELINE deployed renewal after elapsed expiry keeps old active relationship',async()=>{
    await seed({plan:'team',ends:past()});assert.equal((await state()).team,false);await account('team',future());assert.equal((await state()).status,'active');
  });
  const before=await state();await root();await pg.exec(readFileSync('supabase/migrations/087_guard_staff_role_permission_consistency.sql','utf8'));
  const migration=readFileSync('supabase/migrations/088_guard_staff_plan_reactivation.sql','utf8');await pg.exec(migration);await pg.exec(migration);
  assert.deepEqual(await state(),before,'install/rerun must not backfill relationships');
  if(process.argv.includes('--deployed')){
    const patched=JSON.parse(readFileSync('tests/fixtures/staff-lifecycle-patched-deployed-2026-10-28.json','utf8').replace(/^\uFEFF/,''));
    const normalizeBody=definition=>definition.slice(definition.indexOf('AS $')).replace(/\$\w*\$/g,'$$').replace(/--[^\n]*/g,'').replace(/\s+/g,'').toLowerCase();
    for(const f of patched){
      const local=(await pg.query('SELECT pg_get_functiondef($1::regprocedure) AS definition',[f.signature])).rows[0].definition;
      assert.equal(normalizeBody(f.definition),normalizeBody(local),`deployed body drift: ${f.signature}`);
      assert.ok(f.config.includes('search_path=pg_catalog, public'));
      if(f.signature.startsWith('staff_team_access_from_source_rows'))assert.deepEqual(f.acl,['postgres=X/postgres']);
      if(f.signature.startsWith('restore_staff_relationship'))assert.deepEqual(f.acl,deployed.find(x=>x.signature===f.signature).acl);
      await pg.exec(f.definition);
    }
    assert.equal(patched.length,3);
    console.log('Verified deployed bodies, private helper ACL, retained restore ACL and fixed search paths; testing exported definitions.');
  }
  await check('088 private helper, two enabled sources and restoration marker',async()=>{await root();await pg.exec(readFileSync('supabase/verification/088_staff_plan_reactivation_readiness.sql','utf8'));});
  await check('Team ends through account update: suspend and remove staff membership',async()=>{
    await seed({plan:'team',ends:future()});await account('free');assert.deepEqual(await state(),{status:'suspended_by_plan',role:'operator',permissions:canonical,team:false,memberships:0});
  });
  await check('Team override ends or is cleared: suspend while preserving role/history',async()=>{
    await seed({override:'team',expires:future()});await toggle('pro');assert.equal((await state()).status,'suspended_by_plan');
    await seed({override:'team',expires:future()});await toggle(null,false);assert.equal((await state()).status,'suspended_by_plan');
  });
  await check('already expired account renewed: remains suspended until explicit owner restore',async()=>{
    await seed({plan:'team',ends:past()});assert.equal((await state()).team,false);await account('team',future());assert.equal((await state()).status,'suspended_by_plan');
    await restore();assert.equal((await state()).status,'active');assert.equal((await state()).memberships,1);
  });
  await check('expired override renewed on Free account cannot silently restore staff',async()=>{
    await seed({override:'team',expires:past()});assert.equal((await state()).team,false);await toggle('team');assert.equal((await state()).status,'suspended_by_plan');
  });
  await check('continuous Team account and Team override extensions do not suspend',async()=>{
    await seed({plan:'team',ends:future()});await account('team',future());assert.equal((await state()).status,'active');
    await seed({override:'team',expires:future()});await toggle('team');assert.equal((await state()).status,'active');
  });
  await check('expired Team override falls back to valid Team account without a lapse',async()=>{
    await seed({plan:'team',ends:future(),override:'team',expires:past()});assert.equal((await state()).team,true);await toggle(null,false);assert.equal((await state()).status,'active');
  });
  await check('Free override masks valid Team account; clearing it still requires confirmation',async()=>{
    await seed({plan:'team',ends:future(),override:'free',expires:future()});assert.equal((await state()).team,false);await toggle(null,false);assert.equal((await state()).team,true);assert.equal((await state()).status,'suspended_by_plan');
  });
  await check('non-Team upgrade, wrong owner restore, inactive restore, revoked restore fail safely',async()=>{
    await seed();await toggle('team');await assert.rejects(()=>restore(other));await toggle(null,false);await assert.rejects(()=>restore());
    await toggle('team');await root();await pg.query("UPDATE staff_relationships SET status='revoked' WHERE id=$1",[relationship]);await assert.rejects(()=>restore());
  });
  await check('old inconsistent JSON does not block suspension under 087',async()=>{
    const old={can_view:true,can_edit:false,infoLevel:0};await seed({plan:'team',ends:future(),permissions:old});await account('free');const s=await state();assert.equal(s.status,'suspended_by_plan');assert.deepEqual(s.permissions,old);
  });
  await check('override delete and account delete preserve suspended relationship',async()=>{
    await seed({override:'team',expires:future()});await root();await pg.query('DELETE FROM subscription_write_guard_owners WHERE owner_id=$1',[owner]);assert.equal((await state()).status,'suspended_by_plan');
    await pg.query('INSERT INTO subscription_write_guard_owners(owner_id,enabled,allow_test_switch) VALUES($1,true,true)',[owner]);await seed({plan:'team',ends:future()});await pg.query('DELETE FROM subscription_accounts WHERE owner_id=$1',[owner]);assert.equal((await state()).status,'suspended_by_plan');
  });
  console.log(`${passed} staff plan lifecycle checks passed (isolated database only).`);
} catch(e){console.error(JSON.stringify({message:e.message,code:e.code,query:e.query},null,2));process.exitCode=1;}
finally{await pg.close();}
