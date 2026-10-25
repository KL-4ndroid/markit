import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export async function verifyJournalSql(pg,{owner,other,staff,market,legacy,asUser,check,event}) {
  await pg.exec('RESET ROLE');
  const source=readFileSync('supabase/migrations/076_add_private_market_journals.sql','utf8');
  const view=(await pg.query("SELECT pg_get_viewdef('staff_accessible_markets'::regclass) AS body")).rows[0].body;
  await check('076 migration and embedded grants/RLS checks',()=>pg.exec(source));
  const id=randomUUID(); const mutation=randomUUID();
  const save=async({noteId=id,marketId=legacy,date='2026-10-23',body='四點後人潮最多；提早停車。',revision=0,op=mutation,deleted=false}={})=>(await pg.query('SELECT to_jsonb(public.save_market_journal($1,$2,$3,$4,$5,$6,$7)) AS row',[noteId,marketId,date,body,revision,op,deleted])).rows[0].row;
  await asUser(owner);
  const before=(await pg.query('SELECT name,status,total_revenue,total_profit,booth_cost,notes FROM markets WHERE id=$1',[legacy])).rows[0];
  await check('076 owner create and exact retry, no event or financial mutation',async()=>{
    const events=(await pg.query('SELECT count(*) AS n FROM events')).rows[0].n;
    const row=await save(); assert.equal(row.owner_id,owner); assert.equal(row.author_id,owner); assert.equal(row.revision,1);
    assert.equal((await save()).revision,1);
    assert.equal((await pg.query('SELECT count(*) AS n FROM events')).rows[0].n,events);
    assert.deepEqual((await pg.query('SELECT name,status,total_revenue,total_profit,booth_cost,notes FROM markets WHERE id=$1',[legacy])).rows[0],before);
  });
  await check('076 stale revision and reused mutation cannot overwrite',async()=>{
    await assert.rejects(save({body:'overwrite',op:randomUUID()}),e=>e.code==='40001');
    await assert.rejects(save({body:'changed retry',revision:1}),e=>e.code==='40001');
    await assert.rejects(pg.query('UPDATE market_journals SET body=$1 WHERE id=$2',['bypass',id]),e=>e.code==='42501');
  });
  await check('076 blank/oversize/day outside market rejected',async()=>{
    for(const body of [' \n ','字'.repeat(5001)]) await assert.rejects(save({noteId:randomUUID(),op:randomUUID(),body}),e=>e.code==='22023');
    await assert.rejects(save({noteId:randomUUID(),op:randomUUID(),date:'2026-10-24'}),e=>e.code==='22023');
  });
  await asUser(staff);
  await check('076 active manager cannot read or mutate owner journal',async()=>{
    assert.equal((await pg.query('SELECT id FROM market_journals')).rows.length,0);
    await assert.rejects(save({noteId:randomUUID(),op:randomUUID()}),e=>e.code==='42501');
  });
  await asUser(other);
  await check('076 cross-owner UUID reuse and market spoof are denied',async()=>{
    assert.equal((await pg.query('SELECT id FROM market_journals')).rows.length,0);
    await assert.rejects(save({revision:1,op:randomUUID()}),e=>e.code==='42501');
  });
  await asUser(owner);
  await check('076 soft removal and restoration preserve author and history',async()=>{
    assert.equal((await save({revision:1,op:randomUUID(),deleted:true})).revision,2);
    const restored=await save({revision:2,op:randomUUID()});
    assert.equal(restored.deleted_at,null);assert.equal(restored.author_id,owner);assert.equal(restored.revision,3);
  });
  await check('076 explicit non-contiguous event dates exclude gaps',async()=>{
    await event('market_updated',{market_id:market,updates:{dates:['2026-10-23','2026-10-25'],start_date:'2026-10-23',end_date:'2026-10-25'}},market);
    await assert.rejects(save({noteId:randomUUID(),marketId:market,date:'2026-10-24',op:randomUUID()}),e=>e.code==='22023');
    assert.equal((await save({noteId:randomUUID(),marketId:market,date:'2026-10-25',op:randomUUID()})).business_date,'2026-10-25');
  });
  await check('076 journals block schedule rewrite; host notes remain editable',async()=>{
    await pg.query("UPDATE markets SET session_origin='schedule' WHERE id=$1",[market]);
    await assert.rejects(pg.query('UPDATE markets SET schedule_revision=2 WHERE id=$1',[market]),e=>e.code==='23514');
    await assert.rejects(pg.query("UPDATE markets SET schedule_occurrence_state='suppressed' WHERE id=$1",[market]),e=>e.code==='23514');
    await pg.query("UPDATE markets SET notes='allowed' WHERE id=$1",[market]);
  });
  await check('076 market deletion hides individual and aggregate reads',async()=>{
    await pg.query('UPDATE markets SET is_deleted=true WHERE id=$1',[legacy]);
    assert.equal((await pg.query('SELECT id FROM market_journals WHERE id=$1',[id])).rows.length,0);
    await assert.rejects(save({revision:3,op:randomUUID()}),e=>e.code==='42501');
    await pg.query('UPDATE markets SET is_deleted=false WHERE id=$1',[legacy]);
  });
  await pg.exec('RESET ROLE');
  await check('076 rerun keeps private text and original staff view',async()=>{
    await pg.exec(source);
    assert.equal((await pg.query('SELECT revision FROM market_journals WHERE id=$1',[id])).rows[0].revision,3);
    assert.equal((await pg.query("SELECT pg_get_viewdef('staff_accessible_markets'::regclass) AS body")).rows[0].body,view);
    assert.equal((await pg.query("SELECT has_function_privilege('service_role','public.guard_journal_schedule_snapshot()','EXECUTE') AS allowed")).rows[0].allowed,false);
  });
}
