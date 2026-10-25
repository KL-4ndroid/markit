/** Disposable PostgreSQL/WASM checks. No Supabase connection or real data writes. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID as uuid } from 'node:crypto';
const {PGlite} = await import(pathToFileURL(resolve('.codex-artifacts/region-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
const pg = new PGlite();
const owner=uuid(),other=uuid(),manager=uuid(),operator=uuid(),market=uuid(),template=uuid();
const items=[{id:uuid(),text:'桌布與招牌'},{id:uuid(),text:'行動電源'},{id:uuid(),text:'雨具'}];
let passed=0;
const check=async(name,fn)=>{await fn();passed++;console.log(`PASS ${name}`);};
const asUser=async id=>{await pg.exec('RESET ROLE');await pg.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);await pg.exec('SET ROLE authenticated');};
const save=async({id=template,ownerId=owner,name='戶外市集',body=items,revision=0,mutation=uuid(),archived=false}={})=>(await pg.query('SELECT (save_preparation_template($1,$2,$3,$4,$5,$6,$7)).*',[id,ownerId,name,JSON.stringify(body),revision,mutation,archived])).rows[0];
const apply=async(id=uuid(),revision=1,itemIds=items.map(i=>i.id),marketId=market)=>(await pg.query('SELECT apply_preparation_template($1,$2,$3,$4,$5) AS result',[id,marketId,template,revision,itemIds])).rows[0].result;
const event=async(type,itemId,text,completed)=>pg.query('INSERT INTO events VALUES($1,$2,$3,$4,$5,clock_timestamp(),NULL)',[uuid(),type,JSON.stringify({market_id:market,itemId,...(text!==undefined?{text}:{}),...(completed!==undefined?{completed}:{})}),owner,market]);
try {
  await pg.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::UUID$$;
    CREATE TABLE auth.users(id UUID PRIMARY KEY);
    INSERT INTO auth.users VALUES('${owner}'),('${other}'),('${manager}'),('${operator}');
    CREATE TABLE staff_relationships(owner_id UUID,staff_id UUID,status TEXT,role TEXT);
    INSERT INTO staff_relationships VALUES('${owner}','${manager}','active','manager'),('${owner}','${operator}','active','operator');
    CREATE TABLE team_entitlements(owner_id UUID,active BOOLEAN);
    INSERT INTO team_entitlements VALUES('${owner}',TRUE);
    CREATE FUNCTION has_authoritative_team_entitlement(UUID) RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$SELECT coalesce((SELECT active FROM team_entitlements WHERE owner_id=$1),false)$$;
    CREATE TABLE markets(id UUID PRIMARY KEY,owner_id UUID,is_deleted BOOLEAN DEFAULT FALSE,total_revenue NUMERIC DEFAULT 500,total_profit NUMERIC DEFAULT 300);
    INSERT INTO markets(id,owner_id) VALUES('${market}','${owner}');
    CREATE TABLE events(id UUID PRIMARY KEY,type TEXT,payload JSONB,actor_id UUID,market_id UUID,timestamp TIMESTAMPTZ,metadata JSONB);
    ALTER TABLE events ENABLE ROW LEVEL SECURITY;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
  `);
  const migration=readFileSync(resolve('supabase/migrations/077_add_preparation_templates.sql'),'utf8');
  await pg.exec(migration); await pg.exec(migration);
  await check('migration reruns and direct writes/anonymous calls stay denied',async()=>{
    const r=(await pg.query(`SELECT has_table_privilege('authenticated','preparation_templates','INSERT,UPDATE,DELETE') AS a,
      has_table_privilege('authenticated','preparation_template_applications','SELECT,INSERT,UPDATE,DELETE') AS b,
      has_function_privilege('anon','apply_preparation_template(UUID,UUID,UUID,INTEGER,UUID[])','EXECUTE') AS c`)).rows[0];
    assert.deepEqual(r,{a:false,b:false,c:false});
  });
  await asUser(owner);
  const mutation=uuid();
  await check('owner creates and retries the same save without revision growth',async()=>{
    assert.equal((await save({mutation})).revision,1);assert.equal((await save({mutation})).revision,1);
  });
  await check('invalid, repeated and oversized items are rejected',async()=>{
    await assert.rejects(save({id:uuid(),body:[items[0],items[0]]}),/TEMPLATE_INPUT/);
    await assert.rejects(save({id:uuid(),body:[{id:uuid(),text:'字'.repeat(201)}]}),/TEMPLATE_INPUT/);
    await assert.rejects(save({id:uuid(),body:[{id:uuid(),text:'  '}]}),/TEMPLATE_INPUT/);
    await assert.rejects(save({id:uuid(),body:[{id:uuid(),text:'two\nlines'}]}),/TEMPLATE_INPUT/);
    await assert.rejects(save({id:uuid(),body:[items[0],{id:items[0].id.toUpperCase(),text:'另一項'}]}),/TEMPLATE_INPUT/);
  });
  let receipt,appId=uuid();
  await check('apply creates one atomic snapshot of unchecked existing event types',async()=>{
    receipt=await apply(appId);assert.equal(receipt.appliedCount,3);assert.equal(receipt.events.length,3);
    assert.ok(receipt.events.every(e=>e.payload.completed===false&&e.type==='checklist_item_created'));
  });
  const itemId=receipt.events[0].payload.itemId;
  await pg.exec('RESET ROLE');await event('checklist_item_updated',itemId,undefined,true);await asUser(owner);
  await check('same acknowledgement retry and a fresh request never reset completed items',async()=>{
    assert.deepEqual(await apply(appId),receipt);
    const result=await apply();assert.equal(result.appliedCount,0);assert.equal(result.skippedCount,3);
  });
  await check('invalid selection and reused request ids with a different payload fail',async()=>{
    await assert.rejects(apply(uuid(),1,[uuid()]),/TEMPLATE_INPUT/);
    await assert.rejects(apply(appId,1,[items[0].id]),/TEMPLATE_CONFLICT/);
    await assert.rejects(apply(uuid(),1,[items[0].id,items[0].id]),/TEMPLATE_INPUT/);
  });
  await check('template edits leave past events untouched and stale saves/applies fail',async()=>{
    const changed=items.map((i,n)=>n===0?{...i,text:'加大的桌布'}:i);
    await save({revision:1,body:changed});
    await assert.rejects(save({revision:1}),/TEMPLATE_CONFLICT/);
    await assert.rejects(apply(),/TEMPLATE_CONFLICT/);
    assert.deepEqual(await apply(appId),receipt,'old lost acknowledgement survives a template revision change');
    const next=await apply(uuid(),2,[items[0].id]);assert.equal(next.events[0].payload.text,'加大的桌布');
  });
  await asUser(other);
  await check('another owner cannot read, save, apply or retrieve receipts',async()=>{
    assert.equal((await pg.query('SELECT * FROM preparation_templates')).rows.length,0);
    await assert.rejects(save({revision:2}),/TEMPLATE_SCOPE/);await assert.rejects(apply(appId),/TEMPLATE_SCOPE/);
  });
  await asUser(operator);
  await check('operator cannot read templates or apply them',async()=>{
    assert.equal((await pg.query('SELECT * FROM preparation_templates')).rows.length,0);
    await assert.rejects(apply(uuid(),2),/TEMPLATE_SCOPE/);
  });
  await asUser(manager);
  await check('active Team manager can read/manage/apply brand templates',async()=>{
    assert.equal((await pg.query('SELECT * FROM preparation_templates')).rows.length,1);
    await assert.rejects(apply(appId),/TEMPLATE_CONFLICT/,'another actor cannot reuse an owner receipt');
    await save({revision:2});const r=await apply(uuid(),3);assert.equal(r.appliedCount,0);
  });
  await pg.exec('RESET ROLE; UPDATE team_entitlements SET active=FALSE');await asUser(manager);
  await check('Team loss immediately blocks manager read/save/apply on server',async()=>{
    assert.equal((await pg.query('SELECT * FROM preparation_templates')).rows.length,0);
    await assert.rejects(save({revision:3}),/TEMPLATE_SCOPE/);await assert.rejects(apply(uuid(),3),/TEMPLATE_SCOPE/);
  });
  await asUser(owner);
  await check('owner can archive/restore; archived templates cannot apply',async()=>{
    await save({revision:3,archived:true});await assert.rejects(apply(uuid(),4),/TEMPLATE_CONFLICT/);
    await save({revision:4,archived:false});
  });
  await pg.exec('RESET ROLE');
  await check('deleting an item does not resurrect it through an old request; explicit new apply can restore it',async()=>{
    await event('checklist_item_deleted',itemId);await asUser(owner);
    assert.deepEqual(await apply(appId),receipt);
    const r=await apply(uuid(),5,[items[0].id]);assert.equal(r.appliedCount,1);
  });
  await pg.exec('RESET ROLE');
  await check('failed event insertion rolls back the entire batch and receipt',async()=>{
    await pg.exec(`CREATE FUNCTION fixture_fail() RETURNS TRIGGER LANGUAGE plpgsql AS $$BEGIN IF NEW.payload->>'text'='雨具' THEN RAISE EXCEPTION 'fixture failure'; END IF; RETURN NEW; END$$;
      CREATE TRIGGER fixture_failure BEFORE INSERT ON events FOR EACH ROW EXECUTE FUNCTION fixture_fail();`);
    await event('checklist_item_deleted',receipt.events[1].payload.itemId);await event('checklist_item_deleted',receipt.events[2].payload.itemId);
    const before=(await pg.query('SELECT count(*) FROM events')).rows[0].count;const id=uuid();await asUser(owner);
    await assert.rejects(apply(id,5,[items[1].id,items[2].id]),/fixture failure/);await pg.exec('RESET ROLE');
    assert.equal((await pg.query('SELECT count(*) FROM events')).rows[0].count,before);
    assert.equal((await pg.query('SELECT count(*) FROM preparation_template_applications WHERE id=$1',[id])).rows[0].count,0);
  });
  await check('financial projection values remain unchanged',async()=>{
    assert.deepEqual((await pg.query('SELECT total_revenue,total_profit FROM markets')).rows[0],{total_revenue:'500',total_profit:'300'});
  });
  console.log(`${passed} preparation-template SQL checks passed`);
} finally {await pg.close();}
