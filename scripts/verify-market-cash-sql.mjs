/** Disposable SQL verification, never connects to Supabase. Reuses the optional PGlite runtime. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID as uuid } from 'node:crypto';
const {PGlite}=await import(pathToFileURL(resolve('.codex-artifacts/region-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
const pg=new PGlite(),owner=uuid(),other=uuid(),staff=uuid(),market=uuid(),second=uuid();
let passed=0;
const check=async(name,fn)=>{await fn();passed++;console.log(`PASS ${name}`);};
const asUser=async id=>{await pg.exec('RESET ROLE');await pg.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await pg.exec('SET ROLE authenticated');};
const none={mode:'none'},total=amount=>({mode:'total',amount}),detail=counts=>({mode:'denominations',counts});
const data=(opening=none,closing=none,note='')=>({opening,closing,note});
const save=async({marketId=market,date='2026-10-23',body=data(total('2000')),revision=0,mutation=uuid()}={})=>(await pg.query('SELECT (save_market_cash_record($1,$2,$3,$4,$5)).*',[marketId,date,JSON.stringify(body),revision,mutation])).rows[0];
try{
  await pg.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
    CREATE SCHEMA auth;GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::UUID$$;
    CREATE TABLE auth.users(id UUID PRIMARY KEY);INSERT INTO auth.users VALUES('${owner}'),('${other}'),('${staff}');
    CREATE TABLE markets(id UUID PRIMARY KEY,owner_id UUID,is_deleted BOOLEAN DEFAULT FALSE,start_date DATE,end_date DATE,session_origin TEXT,schedule_revision INTEGER,schedule_occurrence_state TEXT,total_revenue NUMERIC,total_profit NUMERIC);
    INSERT INTO markets VALUES('${market}','${owner}',FALSE,'2026-10-23','2026-10-25','schedule',1,'scheduled',4500,3000),('${second}','${owner}',FALSE,'2026-10-23','2026-10-25','manual',NULL,NULL,0,0);
    ALTER TABLE markets ENABLE ROW LEVEL SECURITY;CREATE POLICY fixture_market ON markets FOR SELECT TO authenticated USING(owner_id=auth.uid() OR auth.uid()='${staff}');GRANT SELECT ON markets TO authenticated;
    CREATE TABLE events(id UUID PRIMARY KEY,type TEXT,payload JSONB,actor_id UUID,market_id UUID,timestamp TIMESTAMPTZ);
    INSERT INTO events VALUES(gen_random_uuid(),'market_created','{"dates":["2026-10-23","2026-10-25"]}','${owner}','${market}',NOW());
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
  `);
  const migration=readFileSync(resolve('supabase/migrations/078_add_optional_market_cash_records.sql'),'utf8');
  await pg.exec(migration);await pg.exec(migration);
  const comparisonMigration=readFileSync(resolve('supabase/migrations/079_add_cash_sales_comparison.sql'),'utf8');
  await pg.exec(comparisonMigration);await pg.exec(comparisonMigration);
  await check('migration reruns and direct client writes/helper execution are denied',async()=>{
    const r=(await pg.query(`SELECT has_table_privilege('authenticated','market_cash_records','INSERT,UPDATE,DELETE') a,
      has_table_privilege('anon','market_cash_records','SELECT') b,
      has_function_privilege('authenticated','market_cash_point_cents(JSONB)','EXECUTE') c,
      has_function_privilege('anon','save_market_cash_record(UUID,DATE,JSONB,INTEGER,UUID)','EXECUTE') d`)).rows[0];assert.ok(Object.values(r).every(v=>!v));
  });
  await asUser(owner);
  await check('untouched none/none never creates a zero cash count',async()=>{
    await assert.rejects(save({body:data()}),/CASH_INPUT/);assert.equal((await pg.query('SELECT * FROM market_cash_records')).rows.length,0);
  });
  const mutation=uuid();
  await check('opening-only count survives and an identical lost acknowledgement is idempotent',async()=>{
    const a=await save({mutation});assert.equal(a.revision,1);assert.deepEqual(a.data.closing,none);assert.equal((await save({mutation})).revision,1);
  });
  await check('zero amount differs from missing and fractional money stays exact',async()=>{
    const r=await save({body:data(total('0'),total('0.29')),revision:1});assert.equal(r.data.opening.amount,'0');
    await pg.exec('RESET ROLE');assert.equal((await pg.query('SELECT market_cash_point_cents($1) AS cents',[JSON.stringify(r.data.closing)])).rows[0].cents,29);await asUser(owner);
  });
  await check('all denominations including 500 produce the expected cents',async()=>{
    const r=await save({revision:2,body:data(detail({1000:'2',500:'1',100:'3',50:'1',10:'2',5:'1',1:'4'}),total('5450'))});
    await pg.exec('RESET ROLE');assert.equal((await pg.query('SELECT market_cash_point_cents($1) AS cents',[JSON.stringify(r.data.opening)])).rows[0].cents,287900);await asUser(owner);
  });
  await check('malformed amounts/counts, empty detail and unknown fields fail without writes',async()=>{
    for(const point of [total(''),total('-1'),total('1.234'),total('1e3'),detail({100:'-1'}),detail({100:'1.5'}),detail({100:''}),detail({2000:'1'}),detail({100:1}),detail({1000:'999999',500:'999999'}),{mode:'none',amount:'0'}]){
      await assert.rejects(save({revision:3,body:data(point)}),/CASH_INPUT/);
    }
    await assert.rejects(save({revision:3,body:{...data(total('1')),extra:1}}),/CASH_INPUT/);
    await assert.rejects(save({revision:3,body:data(total('1'),none,'字'.repeat(1001))}),/CASH_INPUT/);
    assert.equal((await pg.query('SELECT revision FROM market_cash_records')).rows[0].revision,3);
  });
  await check('old revisions and same mutation with different data cannot overwrite',async()=>{
    await assert.rejects(save({revision:1}),/CASH_CONFLICT/);
    const current=(await pg.query('SELECT mutation_id FROM market_cash_records')).rows[0].mutation_id;
    await assert.rejects(save({revision:3,mutation:current,body:data(total('1'))}),/CASH_CONFLICT/);
  });
  await check('non-contiguous and out-of-range new days are rejected',async()=>{
    await assert.rejects(save({date:'2026-10-24'}),/CASH_DATE/);await assert.rejects(save({date:'2026-10-26'}),/CASH_DATE/);
  });
  await check('another business day and another market keep independent cash boxes',async()=>{
    const b=await save({date:'2026-10-25',body:data(none,total('0'))});assert.deepEqual(b.data.opening,none);
    const c=await save({marketId:second,body:data(total('100'))});assert.equal(c.data.opening.amount,'100');
    assert.equal((await pg.query('SELECT * FROM market_cash_records')).rows.length,3);
  });
  await asUser(other);
  await check('another owner sees no cash and cannot write it',async()=>{
    assert.equal((await pg.query('SELECT * FROM market_cash_records')).rows.length,0);await assert.rejects(save(),/CASH_SCOPE/);
  });
  await asUser(staff);
  await check('staff market visibility does not grant cash visibility or writing',async()=>{
    assert.equal((await pg.query('SELECT * FROM markets')).rows.length,2);
    assert.equal((await pg.query('SELECT * FROM market_cash_records')).rows.length,0);await assert.rejects(save(),/CASH_SCOPE/);
  });
  await pg.exec('RESET ROLE');
  await check('a counted fixed schedule snapshot cannot be revised or suppressed',async()=>{
    await assert.rejects(pg.query('UPDATE markets SET schedule_revision=2 WHERE id=$1',[market]),/CASH_SCHEDULE_PROTECTED/);
    await assert.rejects(pg.query("UPDATE markets SET schedule_occurrence_state='suppressed' WHERE id=$1",[market]),/CASH_SCHEDULE_PROTECTED/);
  });
  await pg.query("UPDATE markets SET start_date='2026-10-25' WHERE id=$1",[market]);await asUser(owner);
  await check('existing historical cash remains editable after a market date correction',async()=>{
    assert.equal((await save({revision:3,body:data(total('2000'),total('5450'),'原日期盤點更正')})).revision,4);
  });
  await check('explicitly choosing none can clear saved amounts without inventing zero',async()=>{
    const r=await save({revision:4,body:data()});assert.deepEqual(r.data,data());
  });
  await pg.exec('RESET ROLE');await pg.query('UPDATE markets SET is_deleted=TRUE WHERE id=$1',[market]);await asUser(owner);
  await check('deleted market cash is hidden and writes are refused',async()=>{
    assert.equal((await pg.query('SELECT * FROM market_cash_records WHERE market_id=$1',[market])).rows.length,0);await assert.rejects(save({revision:5}),/CASH_SCOPE/);
  });
  await pg.exec('RESET ROLE');
  await check('sales/profit projections and the event stream remain unchanged',async()=>{
    const r=(await pg.query('SELECT total_revenue,total_profit FROM markets WHERE id=$1',[market])).rows[0];assert.deepEqual(r,{total_revenue:'4500',total_profit:'3000'});
    assert.equal((await pg.query('SELECT count(*) FROM events')).rows[0].count,1);
  });
  await pg.query('UPDATE markets SET is_deleted=FALSE WHERE id=$1',[market]);await asUser(owner);
  const saveV2=async(body,revision,mutation=uuid())=>(await pg.query('SELECT (save_market_cash_record_v2($1,$2,$3,$4,$5)).*',[market,'2026-10-23',JSON.stringify(body),revision,mutation])).rows[0];
  const extended={...data(total('2000'),total('5450')),otherCash:{mode:'net',amount:'-50.00',note:'提領'},salesBasis:{salesKey:'a'.repeat(32),cashKey:'[200000,545000]',capturedAt:'2026-10-23T12:00:00Z'}};
  await check('v2 retains cash movements and comparison basis; lost acknowledgement is idempotent',async()=>{
    const mutation=uuid();const a=await saveV2(extended,5,mutation);assert.equal(a.revision,6);assert.deepEqual(a.data,extended);
    assert.equal((await saveV2(extended,5,mutation)).revision,6);
  });
  await check('legacy writer cannot strip comparison data and invalid extras fail atomically',async()=>{
    await assert.rejects(save({revision:6}),/CASH_CLIENT_UPGRADE/);
    for(const otherCash of [{mode:'net',amount:'-1.234',note:''},{mode:'net',amount:'1'}, {mode:'bogus'}, {mode:'none',amount:'0'},{mode:'net',amount:'0',note:'字'.repeat(1001)}])await assert.rejects(saveV2({...extended,otherCash},6),/CASH_INPUT/);
    for(const salesBasis of [{},{salesKey:'x',cashKey:'a',capturedAt:'bad'},{...extended.salesBasis,extra:true}])await assert.rejects(saveV2({...extended,salesBasis},6),/CASH_INPUT/);
    await assert.rejects(saveV2(extended,1),/CASH_CONFLICT/);assert.equal((await pg.query('SELECT revision FROM market_cash_records WHERE market_id=$1 AND business_date=$2',[market,'2026-10-23'])).rows[0].revision,6);
  });
  await pg.exec('RESET ROLE');
  const original=uuid(),tombstone=uuid();
  await pg.query('INSERT INTO events VALUES($1,$2,$3,$4,$5,NOW()),($6,$7,$8,$4,$5,NOW())',[original,'deal_closed',JSON.stringify({dealDate:'2026-10-23',totalAmount:3500,paymentMethod:'cash'}),staff,market,tombstone,'deal_deleted',JSON.stringify({eventId:original})]);
  await asUser(owner);
  await check('owner gets one complete sale/tombstone snapshot including staff sales; source changes invalidate key',async()=>{
    const read=async()=>(await pg.query('SELECT read_market_cash_sales($1) snapshot',[market])).rows[0].snapshot;
    const a=await read();assert.equal(a.events.length,2);assert.equal(a.marketId,market);assert.match(a.key,/^[a-f0-9]{32}$/);
    await pg.exec('RESET ROLE');await pg.query('UPDATE events SET payload=payload || $1::JSONB WHERE id=$2',[JSON.stringify({paymentMethod:'card'}),original]);await asUser(owner);
    const b=await read();assert.notEqual(b.key,a.key);
  });
  await check('staff and other owners cannot read cash comparison sources or use v2',async()=>{
    for(const actor of [staff,other]){await asUser(actor);await assert.rejects(pg.query('SELECT read_market_cash_sales($1)',[market]),/CASH_SCOPE/);await assert.rejects(saveV2(extended,6),/CASH_SCOPE/);}
  });
  await pg.exec('RESET ROLE');
  await check('comparison RPC grants reject anon and clients still cannot mutate cash tables',async()=>{
    const row=(await pg.query("SELECT has_function_privilege('anon','read_market_cash_sales(UUID)','EXECUTE') a, has_function_privilege('anon','save_market_cash_record_v2(UUID,DATE,JSONB,INTEGER,UUID)','EXECUTE') b, has_table_privilege('authenticated','market_cash_records','INSERT,UPDATE,DELETE') c")).rows[0];assert.ok(Object.values(row).every(v=>!v));
    const r=(await pg.query('SELECT total_revenue,total_profit FROM markets WHERE id=$1',[market])).rows[0];assert.deepEqual(r,{total_revenue:'4500',total_profit:'3000'});
  });
  await asUser(owner);
  await check('a movement-only day preserves missing counts instead of manufacturing zero counts',async()=>{
    const r=(await pg.query('SELECT (save_market_cash_record_v2($1,$2,$3,$4,$5)).*',[second,'2026-10-24',JSON.stringify({...data(),otherCash:{mode:'net',amount:'0',note:''}}),0,uuid()])).rows[0];assert.deepEqual(r.data.opening,none);assert.deepEqual(r.data.closing,none);
  });
  await pg.exec('RESET ROLE');
  await check('over-limit source stream fails explicitly instead of returning a partial or zero comparison',async()=>{
    await pg.query("INSERT INTO events SELECT gen_random_uuid(),'deal_closed','{}'::JSONB,$1,$2,NOW() FROM generate_series(1,10001)",[owner,second]);await asUser(owner);
    await assert.rejects(pg.query('SELECT read_market_cash_sales($1)',[second]),/CASH_SALES_LIMIT/);await pg.exec('RESET ROLE');
  });
  await pg.query('UPDATE markets SET is_deleted=TRUE WHERE id=$1',[market]);await asUser(owner);
  await check('deleted market comparison is inaccessible',async()=>{await assert.rejects(pg.query('SELECT read_market_cash_sales($1)',[market]),/CASH_SCOPE/);});
  console.log(`${passed} cash SQL checks passed`);
}finally{await pg.close();}
