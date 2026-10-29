/** Disposable database only. No environment keys or Supabase network connection. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID as uuid} from 'node:crypto';
const {PGlite}=await import(pathToFileURL(resolve('.codex-artifacts/region-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
const pg=new PGlite(),owner=uuid(),other=uuid(),staff=uuid(),market=uuid(),day='2025-10-15';let passed=0;
async function check(name,fn){await fn();console.log(`PASS ${name}`);passed++;}
async function asUser(id){await pg.exec('RESET ROLE');await pg.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await pg.exec('SET ROLE authenticated');}
async function snapshot(){return (await pg.query('SELECT read_market_financial_reviews($1) AS data',[[market]])).rows[0].data[0];}
async function save(source,{key=day,mode='cost',amount=200,observed=[market,day,1000,0,1000,1],revision=0,mutation=uuid()}={}) {
 return (await pg.query('SELECT save_market_financial_review($1,$2,$3,$4,$5,$6,$7,$8) AS row',[market,key,mode,amount,JSON.stringify(observed),key==='fees'?source.feeKey:source.days[key]?.key,revision,mutation])).rows[0].row;
}
try{
 await pg.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
 GRANT USAGE ON SCHEMA auth TO authenticated;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);INSERT INTO auth.users VALUES('${owner}'),('${other}'),('${staff}');
 CREATE TABLE profiles(id uuid PRIMARY KEY,plan text);INSERT INTO profiles VALUES('${owner}','pro'),('${other}','pro'),('${staff}','team');
 CREATE FUNCTION subscription_effective_plan(id uuid) RETURNS text LANGUAGE sql SECURITY DEFINER AS $$SELECT plan FROM profiles WHERE profiles.id=$1$$;
 CREATE FUNCTION subscription_read_owner_paid(id uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$SELECT auth.uid()=$1 AND subscription_effective_plan($1) IN('pro','team')$$;
 CREATE TABLE markets(id uuid PRIMARY KEY,owner_id uuid,is_deleted boolean DEFAULT false,start_date date,end_date date,booth_cost numeric DEFAULT 0,registration_fee numeric DEFAULT 0,notes text);
 INSERT INTO markets VALUES('${market}','${owner}',false,'2025-10-15','2025-10-17',0,0,'original');
 CREATE TABLE events(id uuid PRIMARY KEY,type text,payload jsonb,market_id uuid,actor_id uuid,timestamp timestamptz DEFAULT clock_timestamp());
 INSERT INTO events VALUES(gen_random_uuid(),'market_created','{"dates":["2025-10-15","2025-10-17"]}','${market}','${owner}',clock_timestamp());
 INSERT INTO events VALUES(gen_random_uuid(),'deal_closed','{"dealDate":"2025-10-15","manualRevenue":1000,"manualCost":0,"manualDealCount":1}','${market}','${owner}',clock_timestamp());
 ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;`);
 const source=readFileSync('supabase/migrations/094_add_owner_financial_reviews.sql','utf8');
 await pg.exec(source);await pg.exec(source);await pg.exec(readFileSync('supabase/verification/094_owner_financial_reviews_readiness.sql','utf8'));
 await check('migration reruns; no client table writes or helper execution',async()=>{
  for(const role of ['anon','authenticated','service_role']) {
   const result=(await pg.query(`SELECT has_table_privilege($1,'market_financial_reviews','SELECT,INSERT,UPDATE,DELETE') AS a,has_function_privilege($1,'financial_review_source(uuid)','EXECUTE') AS b`,[role])).rows[0];
   assert.equal(result.a,false);assert.equal(result.b,false);
  }
 });
 await asUser(owner);let first=await snapshot();
 await check('snapshot preserves explicit non-contiguous dates and reads actual totals',async()=>{
  assert.deepEqual(first.dates,['2025-10-15','2025-10-17']);assert.equal(first.days[day].revenue,1000);assert.equal(first.days[day].deals,1);assert.equal(first.days['2025-10-17'].count,0);
 });
 const mutation=uuid();
 await check('daily cost review, exact retries and no deal writes',async()=>{
  const row=await save(first,{mutation});assert.equal(row.amount,200);assert.equal(row.revision,1);
  assert.deepEqual(await save(first,{mutation}),row);
  await pg.exec('RESET ROLE');assert.equal((await pg.query('SELECT count(*) AS n FROM events')).rows[0].n,2);await asUser(owner);
 });
 await check('stale revision, reused mutation and spoofed income fail',async()=>{
  await assert.rejects(save(first),/FINANCE_CONFLICT/);
  await assert.rejects(save(first,{mutation,amount:201}),/FINANCE_RETRY_CONFLICT/);
  await assert.rejects(save(first,{revision:1,observed:[market,day,999,0,999,1]}),/FINANCE_SOURCE/);
  await assert.rejects(save(first,{revision:1,observed:[null,day,1000,0,1000,1]}),/FINANCE_SOURCE/);
  await assert.rejects(save(first,{revision:1,amount:-1}),/FINANCE_INPUT/);
  await assert.rejects(save(first,{revision:1,amount:1.001}),/FINANCE_INPUT/);
 });
 await check('offsetting negative fees cannot be confirmed as free',async()=>{
  await pg.exec('RESET ROLE');await pg.exec('ALTER TABLE markets ADD COLUMN table_rental numeric DEFAULT 0');
  await pg.query('UPDATE markets SET booth_cost=-50,table_rental=50 WHERE id=$1',[market]);await asUser(owner);
  const invalid=await snapshot();assert.equal(invalid.feeTotal,0);
  await assert.rejects(save(invalid,{key:'fees',mode:'zero-fee',amount:null,observed:invalid.feeBasis}),/FINANCE_INPUT/);
  await pg.exec('RESET ROLE');await pg.query('UPDATE markets SET booth_cost=0,table_rental=0 WHERE id=$1',[market]);await asUser(owner);
 });
 await check('old receipt replay does not overwrite a newer review',async()=>{
  await save(first,{revision:1,amount:300});const old=await save(first,{mutation});assert.equal(old.revision,1);
  assert.equal((await snapshot()).reviews.find(r=>r.review_key===day).amount,300);
 });
 await check('explicit free and zero-income confirmation; no zero sale inserted',async()=>{
  await save(first,{key:'fees',mode:'zero-fee',amount:null,observed:first.feeBasis});
  await save(first,{key:'2025-10-17',mode:'zero-income',amount:null,observed:[market,'2025-10-17',0,0,0,0]});
  await assert.rejects(save(first,{mode:'zero-income',amount:null,revision:2}),/FINANCE_INPUT/);
  const s=await snapshot();assert.equal(s.reviews.length,3);assert.ok(s.reviews.every(r=>r.valid));
 });
 await check('source changes invalidate affected day, fee changes invalidate free review',async()=>{
  await pg.exec('RESET ROLE');await pg.query("INSERT INTO events VALUES($1,'deal_closed',$2,$3,$4,clock_timestamp())",[uuid(),JSON.stringify({dealDate:day,totalAmount:100}),market,owner]);
  await asUser(owner);const changed=await snapshot();
  assert.equal(changed.reviews.find(r=>r.review_key===day).valid,false);
  assert.equal(changed.reviews.find(r=>r.review_key==='2025-10-17').valid,true);
  await assert.rejects(save(first,{revision:1}),/FINANCE_SOURCE/);
  await pg.exec('RESET ROLE');await pg.query('UPDATE markets SET booth_cost=50 WHERE id=$1',[market]);await asUser(owner);
  assert.equal((await snapshot()).reviews.find(r=>r.review_key==='fees').valid,false);
 });
 await check('same-day zero income requires closing; reopening invalidates confirmation',async()=>{
  await pg.exec('RESET ROLE');const today=(await pg.query("SELECT (clock_timestamp() AT TIME ZONE 'Asia/Taipei')::date::text AS day")).rows[0].day;const id=uuid();
  await pg.query('INSERT INTO markets(id,owner_id,start_date,end_date) VALUES($1,$2,$3,$3)',[id,owner,today]);await asUser(owner);
  const read=async()=>(await pg.query('SELECT read_market_financial_reviews($1) AS data',[[id]])).rows[0].data[0];
  let s=await read();
  const zeroSave=async()=>pg.query('SELECT save_market_financial_review($1,$2,$3,$4,$5,$6,$7,$8)',[id,today,'zero-income',null,JSON.stringify([id,today,0,0,0,0]),s.days[today].key,0,uuid()]);
  await assert.rejects(zeroSave(),/FINANCE_INPUT/);
  await pg.exec('RESET ROLE');await pg.query("INSERT INTO events VALUES($1,'market_updated',$2,$3,$4,clock_timestamp()+interval '1 second')",[uuid(),JSON.stringify({updates:{operationPhase:'closing',operationSessionDate:today}}),id,owner]);await asUser(owner);
  s=await read();assert.equal(s.days[today].zeroAllowed,true);await zeroSave();
  await pg.exec('RESET ROLE');await pg.query("INSERT INTO events VALUES($1,'market_updated',$2,$3,$4,clock_timestamp()+interval '2 seconds')",[uuid(),JSON.stringify({updates:{operationPhase:'operating',operationSessionDate:today}}),id,owner]);await asUser(owner);
  assert.equal((await read()).reviews[0].valid,false);
 });
 await check('other owner, staff, free owner and removed market denied even on retry',async()=>{
  for(const user of [other,staff]){await asUser(user);await assert.rejects(snapshot(),/FINANCE_SCOPE/);await assert.rejects(save(first,{mutation}),/FINANCE_SCOPE/);}
  for(const plan of ['free',null]){await pg.exec('RESET ROLE');await pg.query('UPDATE profiles SET plan=$2 WHERE id=$1',[owner,plan]);await asUser(owner);await assert.rejects(save(first,{mutation}),/FINANCE_SCOPE/);}
  await pg.exec('RESET ROLE');await pg.query("UPDATE profiles SET plan='team' WHERE id=$1",[owner]);await pg.query('UPDATE markets SET is_deleted=true WHERE id=$1',[market]);await asUser(owner);await assert.rejects(snapshot(),/FINANCE_SCOPE/);
 });
 console.log(`PASS ${passed} isolated financial-review SQL groups`);
} finally {await pg.close();}
