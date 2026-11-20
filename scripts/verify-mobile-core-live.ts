// Companion to serve-mobile-core-acceptance: real Auth/PostgREST, synthetic data only.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
async function main(){
 assert.equal(process.argv.length,3);assert.ok(['--peer-cost','--final'].includes(process.argv[2]));
 const fixture=JSON.parse(readFileSync('.codex-artifacts/b03-local-fixture.private.json','utf8'));
 assert.equal(fixture.origin,'http://127.0.0.1:41430');
 const inspected=JSON.parse(execFileSync('docker',['--context','desktop-linux','inspect',fixture.db],{encoding:'utf8'}))[0];
 assert.equal(inspected.Config.Labels['feria-purpose'],'mobile-core-acceptance');
 let anon='';
 for(const file of readdirSync('out/_next/static/chunks').filter(f=>f.endsWith('.js'))){
  for(const value of readFileSync('out/_next/static/chunks/'+file,'utf8').match(/eyJhbGci[A-Za-z0-9_.-]+/g)??[]){
   try{if(JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString()).role==='anon')anon=value;}catch{}
  }
 }
 assert.ok(anon);
 async function login(user:'owner'|'other'){
  const r=await fetch(fixture.origin+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:anon,'content-type':'application/json'},body:JSON.stringify({email:fixture.users[user].email,password:fixture.password})});
  assert.equal(r.status,200);return (await r.json()).access_token as string;
 }
 const owner=await login('owner'),other=await login('other');
 async function rpc(name:string,args:unknown,token=owner){
  const r=await fetch(fixture.origin+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:anon,authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(args)});
  return {status:r.status,data:await r.json()};
 }
 if(process.argv[2]==='--final'){
  async function rows(path:string,token=owner){const r=await fetch(fixture.origin+'/rest/v1/'+path,{headers:{apikey:anon,authorization:'Bearer '+token}});const data=await r.json();assert.equal(r.status,200,JSON.stringify({path,error:r.ok?undefined:data}));return data;}
  const events=await rows('events?select=id,type,payload&market_id=eq.'+fixture.market) as {id:string;type:string;payload:{totalAmount?:number;paymentMethod?:string}}[];
  const sales=events.filter(e=>e.type==='deal_closed');assert.equal(sales.length,3);assert.equal(new Set(sales.map(e=>e.id)).size,3);
  assert.equal(sales.reduce((sum,e)=>sum+Number(e.payload.totalAmount),0),440);
  assert.equal(sales.filter(e=>e.payload.paymentMethod==='cash').reduce((sum,e)=>sum+Number(e.payload.totalAmount),0),320);
  const products=await rows('products?select=id,stock,price');assert.equal(products.length,1);assert.equal(products[0].stock,19);
  const markets=await rows('markets?select=id,name,status,owner_id,booth_cost,registration_fee,table_rental,commission_rate,region_code,payment_deadline');
  assert.equal(markets.length,2);assert.ok(markets.every((m:{owner_id:string})=>m.owner_id===fixture.users.owner.id));
  const initial=markets.find((m:{id:string})=>m.id===fixture.market);assert.equal(Number(initial.booth_cost),600);assert.equal(Number(initial.registration_fee),0);assert.equal(Number(initial.table_rental),100);assert.equal(Number(initial.commission_rate),0);
  const registered=markets.find((m:{name:string})=>m.name==='[B03] 免費報名流程');assert.equal(registered.status,'paid');assert.equal(Number(registered.booth_cost),800);assert.ok(registered.region_code);assert.ok(registered.payment_deadline);
  const financial=await rpc('read_market_financial_reviews',{p_market_ids:[fixture.market]});assert.equal(financial.status,200);const review=financial.data[0].reviews.find((r:{review_key:string})=>r.review_key===fixture.date);assert.equal(Number(review.amount),88);assert.equal(review.revision,2);
  const cash=await rows('market_cash_records?select=data,revision&market_id=eq.'+fixture.market);assert.equal(cash.length,1);assert.equal(cash[0].data.opening.amount,'1000.00');assert.equal(cash[0].data.closing.amount,'1320.00');
  const team=await rows('staff_relationships?select=status,role');assert.equal(team.length,1);assert.equal(team[0].status,'suspended_by_plan');assert.equal(team[0].role,'operator');
  const otherRows=await rows('markets?select=id',other);assert.equal(otherRows.length,1);assert.equal(otherRows[0].id,fixture.otherMarket);
  const proof={at:new Date().toISOString(),environment:'loopback disposable Auth/PostgREST',sales:{ids:sales.map(e=>e.id),count:3,revenue:440,cash:320,nonCash:120},product:{stock:19},financialReview:{amount:88,revision:2},cash:{opening:1000,closing:1320,difference:0},registration:{status:'paid',fee:800,region:registered.region_code,deadline:registered.payment_deadline,blankCommission:0},retainedCosts:{booth:600,legacyRegistration:0,equipmentRental:100},team:{status:'suspended_by_plan',role:'operator',automaticRestoration:false},otherBrandRetained:true};
  writeFileSync('.codex-artifacts/b03-final-live-proof.json',JSON.stringify(proof,null,2));console.log('PASS B03 final persisted totals / registration / retained costs / cash / team / other brand');return;
 }
 const source=await rpc('read_market_financial_reviews',{p_market_ids:[fixture.market]});
 assert.equal(source.status,200);const snapshot=source.data[0],day=snapshot.days[fixture.date];
 assert.equal(day.revenue,440);assert.equal(day.deals,3);assert.equal(day.valid,true);
 const args={p_market_id:fixture.market,p_review_key:fixture.date,p_mode:'cost',p_amount:77,
  p_observed:[fixture.market,fixture.date,440,40,400,3],p_source_key:day.key,p_expected_revision:0,p_mutation_id:randomUUID()};
 const saved=await rpc('save_market_financial_review',args);assert.equal(saved.status,200);assert.equal(saved.data.revision,1);
 const replay=await rpc('save_market_financial_review',args);assert.equal(replay.status,200);assert.deepEqual(replay.data,saved.data);
 const conflict=await rpc('save_market_financial_review',{...args,p_amount:99,p_mutation_id:randomUUID()});
 assert.equal(conflict.data.message,'FINANCE_CONFLICT');assert.equal(conflict.data.code,'40001');
 const forbidden=await rpc('read_market_financial_reviews',{p_market_ids:[fixture.market]},other);
 assert.equal(forbidden.data.message,'FINANCE_SCOPE');assert.equal(forbidden.data.code,'42501');
 const proof={environment:'loopback disposable Auth/PostgREST',secondClient:'independent authenticated HTTP client; not second physical device',checks:['live source revenue440/deals3','peer cost77 revision1 saved','same mutation replay revision1','stale revision rejected40001','other owner rejected42501'],at:new Date().toISOString()};
 writeFileSync('.codex-artifacts/b03-live-api-proof.json',JSON.stringify(proof,null,2));
 console.log('PASS B03 live financial peer / idempotency / conflict / cross-owner (5 checks)');
}
void main().catch(e=>{console.error(e instanceof Error?e.message:'B03 check failed');process.exitCode=1;});
