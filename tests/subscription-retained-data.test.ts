import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase/client';
import { pushEvents } from '../lib/sync/sync-push-service';
import { canSyncEventInScope, checkSubscriptionRead, parseSubscriptionReadScope } from '../lib/subscription/read-access';
import { buildSubscriptionCenterView } from '../lib/subscription/subscription-center-view';
import { resolveModelAccountCapabilities } from '../lib/subscription/subscription-capabilities';

async function main() {
  assert.equal(parseSubscriptionReadScope({ownerId:'other',enforced:true,scope:'paid'},'owner'),null);
  assert.equal(parseSubscriptionReadScope({ownerId:'owner',enforced:false,scope:'foundation'},'owner'),null);
  assert.equal(parseSubscriptionReadScope({ownerId:'owner',enforced:true,scope:'legacy'},'owner'),null);
  assert.equal(parseSubscriptionReadScope(null,'owner'),null);
  assert.equal(canSyncEventInScope('deal_closed','foundation'),false);
  assert.equal(canSyncEventInScope('market_status_changed','foundation'),true);
  assert.equal(canSyncEventInScope('settings_updated','foundation'),true);
  const sql=readFileSync('supabase/migrations/092_subscription_retained_data_reads.sql','utf8');
  const eventTypes=readFileSync('types/db.ts','utf8').split('export type EventType =')[1].split(';')[0].matchAll(/'([^']+)'/g);
  const sqlFoundation=sql.split('SELECT p_type IN (')[1].split(');')[0];
  for(const [,type] of eventTypes) assert.equal(canSyncEventInScope(type as any,'foundation'),sqlFoundation.includes(`'${type}'`),type);
  assert.deepEqual(await checkSubscriptionRead({rpc:async()=>({data:null,error:{code:'missing'}})},'a','a','products'),{enabled:true,allowed:false,reason:'entitlement_unavailable'});
  assert.equal((await checkSubscriptionRead({rpc:async()=>({data:{enabled:true,allowed:true,reason:'plan_required'},error:null})},'a','a','products')).allowed,false);
  const expired=resolveModelAccountCapabilities({ownerId:'owner',planCode:'team',planSource:'admin',billingStatus:'none',entitlementStatus:'active',
    entitlementEndsAt:'2026-10-28T00:00:00Z',capabilityEvaluatedAt:'2026-10-29T00:00:00Z',capabilityRefreshAfter:'2026-10-29T00:05:00Z'});
  const view=buildSubscriptionCenterView({viewer:'owner',isAuthenticated:true,isLoading:false,nowMs:Date.parse('2026-10-29T00:00:00Z'),
    capabilityResult:{ok:true,status:'admin_inactive',freshness:'fresh',capabilities:expired}});
  assert.equal(view.planLabel,'免費版');assert.ok(view.lifecycleNotice);

  const originalFrom=supabase.from,originalRpc=supabase.rpc;
  try {
    await db.events.put({id:'paid-draft',actor_id:'owner',type:'deal_closed',market_id:'market',timestamp:1,payload:{totalAmount:10},sync_status:'pending'});
    const before=await db.events.get('paid-draft');
    let scope='foundation', reads=0;
    (supabase as any).rpc=async()=>({data:{ownerId:'owner',enforced:true,scope},error:null});
    (supabase as any).from=(table:string)=>{
      reads++;const query:any={select:()=>query,eq:()=>query,
        maybeSingle:async()=>({data:table==='events'?null:{id:'owner'},error:null}),
        single:async()=>({data:{id:'owner'},error:null}),insert:async()=>({error:null})};return query;
    };
    assert.equal(await pushEvents('owner'),0);assert.equal(reads,0);
    assert.deepEqual(await db.events.get('paid-draft'),before,'downgrade leaves pending paid payload and status intact');
    (supabase as any).rpc=async()=>({data:null,error:{code:'unavailable'}});
    await assert.rejects(pushEvents('owner'),/待同步紀錄已保留/);
    assert.deepEqual(await db.events.get('paid-draft'),before);
    scope='paid';(supabase as any).rpc=async()=>({data:{ownerId:'owner',enforced:true,scope},error:null});
    assert.equal(await pushEvents('owner'),1);
    assert.equal((await db.events.get('paid-draft'))?.sync_status,'synced');
    assert.deepEqual((await db.events.get('paid-draft'))?.payload,before?.payload);
    // Staff personal accounts can be Free; their employer's backend tier/role
    // determines permission. Do not defer a legitimate Team-brand operation.
    await db.events.put({...before!,id:'staff-draft',actor_id:'staff',sync_status:'pending'});
    await db.markets.put({id:'market',owner_id:'owner'} as any);
    (supabase as any).rpc=async()=>({data:{ownerId:'staff',enforced:true,scope:'foundation'},error:null});
    assert.equal(await pushEvents('staff'),1);
    assert.equal((await db.events.get('staff-draft'))?.sync_status,'synced');
  } finally {(supabase as any).from=originalFrom;(supabase as any).rpc=originalRpc;await db.delete();}
  console.log('PASS retained-data scope, Free foundation contract, fail-closed reads, expired UI, paid pending pause and resume');
}
void main();
