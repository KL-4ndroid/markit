// Disposable captured-catalog checks. No hosted endpoints, real identities or credentials.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {capturedAccessDefinitions} from './account-deletion-access-fixture';
import {deletionRoutineMode} from '../../lib/subscription/account-deletion-access-policy';
import {quoteSql as q} from './account-deletion-catalog-fixture';

type Context={sql:(s:string)=>string;insert:(table:string,row:Record<string,unknown>)=>void;pass:(s:string)=>void;
 owner:string;other:string;staff:string;market:string;otherMarket:string;product:string;otherProduct:string;event:string};
export function verifyCapturedAccess(c:Context){
 const {sql,insert,pass,owner,other,staff,market,otherMarket,product,event}=c;
 const as=(who:string|null,query:string,role='authenticated',commit=false)=>sql(`BEGIN;SET LOCAL request.jwt.claim.sub=${q(who??'')};SET LOCAL request.jwt.claim.role=${q(role)};SET LOCAL ROLE ${role};${query};${commit?'COMMIT':'ROLLBACK'};`);
 const freeze=(who:string)=>`INSERT INTO deletion_engine_private.frozen(actor_hash,request_id) VALUES(encode(extensions.digest('${who}','sha256'),'hex'),'${randomUUID()}');`;
 // Make both brand accounts and the staff relationship meaningful before baselines.
 insert('subscription_accounts',{owner_id:other,plan_code:'team',plan_source:'admin',billing_status:'none',entitlement_status:'active'});
 sql(`UPDATE products SET is_active=true,cost=23,stock=10 WHERE id='${product}';`);
 const liveProduct=randomUUID();insert('products',{id:liveProduct,owner_id:other,market_id:otherMarket,name:'Active catalog',category:'other',price:99,cost:23,stock:10,is_active:true,unlimited_stock:false});
 sql(`UPDATE staff_relationships SET status='active',permissions='{"can_view":true,"can_edit":true,"infoLevel":2}' WHERE owner_id='${other}' AND staff_id='${staff}';`);
 assert.equal(Number(as(other,'SELECT count(*) FROM owner_accessible_markets')),1);
 assert.equal(Number(as(staff,'SELECT count(*) FROM staff_accessible_markets')),1);
 assert.equal(as(staff,`SELECT cost IS NULL AND price=99 AND stock=10 FROM staff_accessible_products WHERE id='${liveProduct}'`),'t');
 assert.equal(as(staff,`SELECT total_profit IS NULL AND booth_cost IS NULL FROM staff_accessible_markets WHERE id='${otherMarket}'`),'t');
 assert.equal(as(staff,`SELECT metadata IS NULL FROM staff_accessible_events WHERE id='${event}'`),'t');
 pass('active owner/operator views preserve original price/stock access and staff cost/profit/metadata masks');
 sql(`UPDATE staff_relationships SET role='viewer',permissions='{"can_view":true,"can_edit":false,"infoLevel":0}' WHERE owner_id='${other}' AND staff_id='${staff}';`);
 assert.equal(as(staff,`SELECT cost IS NULL AND price IS NULL AND stock IS NULL FROM staff_accessible_products WHERE id='${liveProduct}'`),'t');
 sql(`UPDATE staff_relationships SET role='manager',permissions='{"can_view":true,"can_edit":true,"infoLevel":2}' WHERE owner_id='${other}' AND staff_id='${staff}';`);
 assert.equal(as(staff,`SELECT cost IS NULL AND price=99 AND stock=10 FROM staff_accessible_products WHERE id='${liveProduct}'`),'t');
 sql(`UPDATE staff_relationships SET role='operator',permissions='{"can_view":true,"can_edit":true,"infoLevel":2}' WHERE owner_id='${other}' AND staff_id='${staff}';`);
 pass('viewer/operator/manager masks and canonical role transitions preserve deployed permission rules');
 const before=JSON.parse(sql(`SELECT jsonb_build_object('revenue',total_revenue,'profit',total_profit,'deals',total_deals) FROM markets WHERE id='${otherMarket}';`));
 const sale=randomUUID(),payload=q(JSON.stringify({items:[{productId:liveProduct,quantity:1,price:99,cost:23}],isBackfill:false}));
 const saleInsert=`INSERT INTO public.events(id,type,actor_id,market_id,payload,timestamp,sync_status,created_at)
   VALUES('${sale}','deal_closed','${other}','${otherMarket}',${payload},clock_timestamp(),'synced',clock_timestamp()) ON CONFLICT(id) DO NOTHING;`;
 const after=JSON.parse(as(other,`${saleInsert}${saleInsert}SELECT jsonb_build_object('revenue',m.total_revenue,'profit',m.total_profit,'deals',m.total_deals,'stock',p.stock)
   FROM markets m JOIN products p ON p.id='${liveProduct}' WHERE m.id='${otherMarket}'`));
 assert.equal(after.revenue,Number(before.revenue)+99);assert.equal(after.profit,Number(before.profit)+76);
 assert.equal(after.deals,Number(before.deals)+1);assert.equal(after.stock,9);
 pass('ordinary authenticated sale runs all deployed projections once; repeated insert does not duplicate income or stock deduction');
 // Snapshots must be scoped by identity even though their routines are SECURITY DEFINER.
 for(let n=1;n<=3;n++)insert('snapshots',{user_id:owner,snapshot_at:new Date(Date.UTC(2026,10,n)).toISOString(),version:n,data:{synthetic:true},event_count:0});
 assert.equal(Number(as(owner,`SELECT count(*) FROM get_latest_snapshot('${owner}')`)),1);
 assert.throws(()=>as(other,`SELECT * FROM get_latest_snapshot('${owner}')`),/snapshot_owner_scope/);
 assert.throws(()=>as(null,`SELECT * FROM get_latest_snapshot('${owner}')`,'anon'),/snapshot_owner_scope|permission denied/);
 assert.throws(()=>as(other,`SELECT cleanup_old_snapshots('${owner}')`),/snapshot_owner_scope/);
 assert.equal(Number(as(owner,`SELECT cleanup_old_snapshots('${owner}')`,'authenticated',true)),1);
 assert.equal(Number(sql(`SELECT count(*) FROM snapshots WHERE user_id='${owner}'`)),2);
 pass('snapshot self-read/cleanup work; anonymous and cross-account access fail; cleanup returns affected count');
 // All non-pure/control entry points stop at their outer guard before invalid NULL
 // arguments/default declarations can execute stored-data reads or writes.
 let guarded=0,falseChecks=0;
 for(const r of capturedAccessDefinitions().routines){
  const mode=deletionRoutineMode(r.detail.name,r.detail.returnType);
  if(['control','pure','trigger','disabled_legacy'].includes(mode))continue;
  const args=r.detail.argumentTypes?r.detail.argumentTypes.split(', ').map(t=>`NULL::${t}`).join(','):'';
  const query=`SELECT * FROM public.${r.detail.name}(${args})`;
  const wrapped=`BEGIN;${freeze(owner)}SET LOCAL request.jwt.claim.sub='${owner}';SET LOCAL request.jwt.claim.role='authenticated';${query};ROLLBACK;`;
  if(mode==='false_on_denial'){assert.equal(sql(wrapped),'f');falseChecks++;}
  else assert.throws(()=>sql(wrapped),/account_deletion_access_frozen/);
  guarded++;
 }
 pass(`${guarded} stored-data routines reject a frozen principal before their bodies (${falseChecks} predicates return false)`);
 const views=capturedAccessDefinitions().relations.filter(r=>r.detail.kind==='v');
 for(const who of [owner,staff])for(const v of views){
  assert.equal(Number(sql(`BEGIN;${freeze(who)}SET LOCAL request.jwt.claim.sub='${who}';SET LOCAL request.jwt.claim.role='authenticated';SET LOCAL ROLE authenticated;SELECT count(*) FROM ${v.identity};ROLLBACK;`)),0);
 }
 pass('all 5 definer views return zero rows for frozen owners and frozen staff with old JWT claims');
 // Freeze a brand, but keep a staff member's other active brand readable.
 insert('staff_relationships',{owner_id:owner,staff_id:staff,staff_email:`${staff}@example.test`,status:'active',role:'operator',permissions:{can_view:true,can_edit:true,infoLevel:2}});
 assert.equal(Number(sql(`BEGIN;${freeze(owner)}SET LOCAL request.jwt.claim.sub='${staff}';SET LOCAL request.jwt.claim.role='authenticated';SET LOCAL ROLE authenticated;SELECT count(*) FROM staff_accessible_markets;ROLLBACK;`)),1);
 assert.equal(sql(`BEGIN;${freeze(owner)}SET LOCAL request.jwt.claim.role='service_role';SET LOCAL ROLE service_role;SELECT has_authoritative_team_entitlement('${owner}');ROLLBACK;`),'f');
 assert.throws(()=>sql(`BEGIN;${freeze(owner)}SET LOCAL request.jwt.claim.role='service_role';SET LOCAL ROLE service_role;SELECT * FROM get_latest_snapshot('${owner}');ROLLBACK;`),/account_deletion_access_frozen/);
 assert.throws(()=>sql(`BEGIN;${freeze(owner)}SET LOCAL request.jwt.claim.role='service_role';SET LOCAL ROLE service_role;UPDATE markets SET name='Blocked' WHERE id='${market}';ROLLBACK;`),/account_deletion_access_frozen/);
 assert.equal(Number(sql(`BEGIN;${freeze(staff)}SET LOCAL request.jwt.claim.sub='${other}';SET LOCAL request.jwt.claim.role='authenticated';SET LOCAL ROLE authenticated;SELECT count(*) FROM owner_accessible_events WHERE id='${event}';ROLLBACK;`)),1);
 pass('frozen-brand targeting blocked for service role; other brands and historical staff-authored income stay visible');
 const invite=`frozen-${randomUUID()}`;insert('staff_invitations',{owner_id:owner,token:invite,expires_at:new Date(Date.now()+3600000).toISOString()});
 for(const [kind,value] of [['market',[otherMarket,market]],['product',product],['json',{nested:[{marketId:market}]}],['token',invite]] as const){
  assert.equal(sql(`BEGIN;${freeze(owner)}SELECT deletion_engine_private.reference_allowed(${q(kind)},${q(JSON.stringify(value))}::jsonb);ROLLBACK;`),'f');
 }
 assert.throws(()=>sql(`BEGIN;${freeze(owner)}SET LOCAL request.jwt.claim.role='anon';SELECT * FROM verify_invitation_token(${q(invite)});ROLLBACK;`),/account_deletion_access_frozen/);
 pass('UUID arrays, nested JSON targets and anonymous invitation-token lookups cannot bypass frozen ownership');
 for(const role of ['anon','authenticated','service_role'])assert.throws(()=>as(null,'TRUNCATE public.snapshots',role),/permission denied/);
 pass('application roles cannot use TRUNCATE to bypass row policies/fences');
 // Keep the existing owner-cleanup regression meaningful without making the
 // test-only second staff relationship part of the original staff-kind fixture.
 sql(`DELETE FROM staff_relationships WHERE owner_id='${owner}' AND staff_id='${staff}';`);
}
export function verifyCapturedWorkerFence(c:Pick<Context,'sql'|'pass'|'owner'|'other'|'market'|'otherMarket'>,r:{id:string;token:string}){
 const {sql,pass,owner,other,market,otherMarket}=c;
 const worker=(query:string,step='staff_access_revoked',token=r.token)=>sql(`BEGIN;
  SET LOCAL deletion_engine.request='${r.id}';SET LOCAL deletion_engine.lease=${q(token)};SET LOCAL deletion_engine.step=${q(step)};
  ${query};ROLLBACK;`);
 assert.equal(worker(`SELECT deletion_engine_private.worker_matches('${owner}')`),'t');
 assert.equal(worker(`SELECT status FROM bff_read_account_deletion_request('${owner}')`),'processing');
 assert.throws(()=>worker(`SELECT * FROM bff_cancel_account_deletion_request('${owner}','${r.id}','processing')`),/account_deletion_conflict/);
 assert.equal(worker(`SELECT deletion_engine_private.worker_matches('${other}')`),'f');
 assert.equal(worker(`SELECT deletion_engine_private.worker_matches('${owner}')`,'profile_deleted'),'f');
 assert.equal(worker(`SELECT deletion_engine_private.worker_matches('${owner}')`,'staff_access_revoked','wrong-token'),'f');
 assert.equal(worker(`UPDATE account_deletion_requests SET lease_expires_at=clock_timestamp()-interval '1 second' WHERE id='${r.id}';SELECT deletion_engine_private.worker_matches('${owner}')`),'f');
 assert.throws(()=>worker(`UPDATE markets SET name='Must not change' WHERE id='${market}'`),/account_deletion_access_frozen/);
 assert.throws(()=>worker(`DELETE FROM user_settings WHERE user_id='${owner}'`),/account_deletion_access_frozen/);
 assert.throws(()=>worker(`DELETE FROM profiles WHERE id='${owner}'`),/account_deletion_access_frozen/);
 assert.throws(()=>worker(`INSERT INTO deletion_engine_private.frozen(actor_hash,request_id) VALUES(encode(extensions.digest('${other}','sha256'),'hex'),'${randomUUID()}');UPDATE markets SET name='Other frozen owner' WHERE id='${otherMarket}'`),/account_deletion_access_frozen/);
 pass('exact lease/actor/next-step checks reject expiry, wrong token/step, premature profile/data deletion and another frozen brand');
}
