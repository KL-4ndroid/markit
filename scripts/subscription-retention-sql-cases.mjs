import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
export async function verifySubscriptionRetention(pg,{owner,other,operator,manager,viewer,product,market,asUser,root,check}) {
 const inventory=JSON.parse(readFileSync('tests/fixtures/subscription-retention-deployed-2026-10-29.json','utf8'));
 await root();
 for(const name of ['sanitize_staff_event_payload','read_market_cash_sales']) await pg.exec(inventory.functions.find(f=>f.name===name).definition);
 for(const view of inventory.views) await pg.exec(`CREATE OR REPLACE VIEW public.${view.name} AS ${view.definition}`);
 await pg.exec('GRANT SELECT ON staff_accessible_markets,staff_accessible_products,staff_accessible_events TO authenticated');
 const baseTables=['markets','products','events','market_cash_records','product_cover_photos','sale_photo_evidence'];
 const before={};for(const name of baseTables) before[name]=(await pg.query(`SELECT to_jsonb(t) AS row FROM ${name} t ORDER BY to_jsonb(t)::text`)).rows;
 const migration=readFileSync('supabase/migrations/092_subscription_retained_data_reads.sql','utf8');
 await check('092 dormant installation and repeat preserve all business records',async()=>{
  await pg.exec(migration);await pg.exec(migration);
  await asUser(owner);const scope=(await pg.query('SELECT read_subscription_data_scope() AS scope')).rows[0].scope;
  assert.equal(scope.scope,'legacy');assert.equal(scope.enforced,false);
 });
 const plan=async(code,end=null)=>{await root();await pg.query("UPDATE subscription_accounts SET plan_code=$2,plan_source=CASE WHEN $2='free' THEN 'free' ELSE 'admin' END,billing_status='none',entitlement_status='active',entitlement_ends_at=$3 WHERE owner_id=$1",[owner,code,end]);};
 await root();await pg.exec('UPDATE subscription_read_guard_settings SET enforce_all=true');
 await check('092 Free reads foundation only, base finance denied, cash RPC blocked',async()=>{
  await plan('free');await asUser(owner);
  for(const t of ['markets','products','events','market_cash_records']) assert.equal((await pg.query(`SELECT * FROM ${t}`)).rows.length,0,t);
  const rows=(await pg.query('SELECT * FROM owner_accessible_markets WHERE id=$1',[market])).rows;
  assert.equal(rows.length,1);for(const k of ['total_revenue','total_profit','total_interactions','total_deals'])assert.equal(rows[0][k],null);
  const events=(await pg.query('SELECT * FROM owner_accessible_events')).rows;
  assert.ok(events.every(e=>!['deal_closed','deal_deleted','product_created','product_updated','interaction_recorded'].includes(e.type)));
  await assert.rejects(()=>pg.query('SELECT read_market_cash_sales($1)',[market]),e=>e.code==='42501');
  assert.equal((await pg.query('SELECT read_subscription_data_scope() AS scope')).rows[0].scope.scope,'foundation');
 });
 await check('092 legacy views cannot bypass Free or ended Team access',async()=>{
  await asUser(owner);
  assert.equal((await pg.query('SELECT * FROM staff_accessible_products')).rows.length,0);
  const row=(await pg.query('SELECT * FROM staff_accessible_markets WHERE id=$1',[market])).rows[0];assert.equal(row.total_revenue,null);
  for(const actor of [operator,manager,viewer]){await asUser(actor);for(const t of inventory.views.map(v=>v.name))assert.equal((await pg.query(`SELECT * FROM ${t}`)).rows.length,0,t);}
 });
 await check('092 global writes still allow Free arrangements and reject paid sales without deleting drafts',async()=>{
  await root();await pg.exec('BEGIN');
  try {
   await pg.exec('UPDATE subscription_write_guard_settings SET enforce_all=true');await asUser(owner);
   await pg.query("INSERT INTO events(id,actor_id,type,payload,market_id,timestamp) VALUES(gen_random_uuid(),$1,'market_updated',$2,$3,now())",[owner,JSON.stringify({market_id:market,updates:{name:'Free foundation still works'}}),market]);
   await root();assert.equal((await pg.query('SELECT name FROM markets WHERE id=$1',[market])).rows[0].name,'Free foundation still works');
   await asUser(owner);
   await assert.rejects(()=>pg.query("INSERT INTO events(id,actor_id,type,payload,market_id,timestamp) VALUES(gen_random_uuid(),$1,'deal_closed',$2,$3,now())",[owner,JSON.stringify({market_id:market,totalAmount:1,items:[]}),market]),e=>e.code==='42501');
  } finally {await pg.exec('ROLLBACK');await root();}
 });
 await check('092 Light restores old sales/product reads, without staff collaboration',async()=>{
  await plan('pro');await asUser(owner);
  assert.ok((await pg.query('SELECT * FROM products WHERE id=$1',[product])).rows.length);
  assert.ok((await pg.query("SELECT * FROM owner_accessible_events WHERE type='deal_closed'")).rows.length);
  assert.ok((await pg.query("SELECT * FROM owner_accessible_events WHERE type='product_updated' AND actor_id=$1",[manager])).rows.length);
  await pg.query('SELECT read_market_cash_sales($1)',[market]);
  await asUser(operator);assert.equal((await pg.query('SELECT * FROM staff_accessible_products')).rows.length,0);
 });
 await check('092 Team staff respects role data levels and recursively removes nested cost',async()=>{
  await plan('team');await root();
  for(const [id,role] of [[operator,'operator'],[manager,'manager'],[viewer,'viewer']])await pg.query('UPDATE staff_relationships SET role=$2,permissions=$3,status=\'active\' WHERE staff_id=$1',[id,role,JSON.stringify({can_view:true,can_edit:role!=='viewer',infoLevel:role==='viewer'?0:2})]);
  await asUser(viewer);const row=(await pg.query('SELECT * FROM staff_accessible_products WHERE id=$1',[product])).rows[0];assert.ok(row);
  assert.equal(row.price,null);assert.equal(row.stock,null);assert.equal(row.total_sold,null);
  assert.equal((await pg.query("SELECT * FROM staff_accessible_events WHERE type='deal_closed'")).rows.length,0);
  await asUser(operator);const operational=(await pg.query('SELECT * FROM staff_accessible_products WHERE id=$1',[product])).rows[0];
  assert.notEqual(operational.price,null);assert.equal(operational.cost,null);
  const masked=(await pg.query("SELECT subscription_staff_payload($1::jsonb) AS data",[JSON.stringify({updates:{cost:40,description:'kept',items:[{cost:3,price:9}]},cost:10})])).rows[0].data;
  assert.deepEqual(masked,{updates:{description:'kept',items:[{price:9}]}});
  await asUser(other);assert.equal((await pg.query('SELECT subscription_read_paid($1) AS allowed',[owner])).rows[0].allowed,false);
 });
 await check('092 exact time expiry stops active staff rows without deleting membership/history',async()=>{
  await plan('team',new Date(Date.now()-60_000).toISOString());await asUser(operator);
  assert.equal((await pg.query('SELECT * FROM staff_accessible_markets')).rows.length,0);
  await asUser(owner);assert.equal((await pg.query('SELECT * FROM products')).rows.length,0);
  await plan('pro');await asUser(owner);assert.ok((await pg.query('SELECT * FROM products')).rows.length);
 });
 await check('092 expired and grace contracts use exact entitlement dates; server read decisions fail closed',async()=>{
  await plan('team',new Date(Date.now()+60_000).toISOString());await root();
  await pg.query("UPDATE subscription_accounts SET entitlement_status='grace' WHERE owner_id=$1",[owner]);
  await asUser(owner);assert.equal((await pg.query('SELECT read_subscription_data_scope() AS scope')).rows[0].scope.scope,'paid');
  await plan('free');await root();
  const denied=(await pg.query("SELECT check_subscription_read_for_actor($1,$1,'product_photo') AS decision",[owner])).rows[0].decision;
  assert.deepEqual(denied,{enabled:true,allowed:false,reason:'plan_required'});
  await plan('pro');await root();
  assert.equal((await pg.query("SELECT check_subscription_read_for_actor($1,$1,'product_photo') AS decision",[owner])).rows[0].decision.allowed,true);
  assert.equal((await pg.query("SELECT check_subscription_read_for_actor($1,$1,'sales_photo') AS decision",[owner])).rows[0].decision.allowed,false);
  assert.equal((await pg.query('SELECT subscription_read_owner_advanced($1) AS allowed',[owner])).rows[0].allowed,false);
 });
 await check('092 read routines reject anonymous/client server-actor spoofing and preserve retained rows',async()=>{
  await root();assert.equal((await pg.query("SELECT has_function_privilege('authenticated','check_subscription_read_for_actor(uuid,uuid,text)','EXECUTE') AS ok")).rows[0].ok,false);
  assert.equal((await pg.query("SELECT has_table_privilege('anon','owner_accessible_events','SELECT') AS ok")).rows[0].ok,false);
  for(const name of baseTables)assert.deepEqual((await pg.query(`SELECT to_jsonb(t) AS row FROM ${name} t ORDER BY to_jsonb(t)::text`)).rows,before[name],name);
 });
}
