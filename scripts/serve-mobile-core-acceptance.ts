// Local acceptance infrastructure only. Serves the actual static App and API
// handlers against disposable GoTrue/PostgREST; never uses .env or hosted data.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, resolve, relative } from 'node:path';
import { createInterface } from 'node:readline';
import Module, { createRequire } from 'node:module';
import { startCandidateServices } from './lib/account-deletion-candidate-services';
import { capturedDeletionCatalog, capturedOperationalFixtureDdl, quoteIdentifier as qi, quoteSql as q } from './lib/account-deletion-catalog-fixture';
import { capturedRuntimeDefinitionsDdl, capturedRuntimeSecurityDdl, capturedRuntimeTriggersDdl } from './lib/account-deletion-access-fixture';

const ORIGIN='http://127.0.0.1:41430',PASSWORD='B03-Local-Only-20261120!',purpose='mobile-core-acceptance';
const read=(path:string)=>readFileSync(path,'utf8').replaceAll('\r\n','\n');
async function main(){
 assert.deepEqual(process.argv.slice(2),['--local']);
 assert.ok(!process.env.DOCKER_HOST&&!process.env.DOCKER_CONTEXT&&!process.env.VERCEL&&!process.env.VERCEL_ENV);
 assert.ok(!Object.keys(process.env).some(key=>/^(SUPABASE_|NEXT_PUBLIC_SUPABASE_|AWS_|ACCOUNT_DELETION_)|(^|_)R2_/.test(key)&&process.env[key]),'Ambient provider configuration refused');
 for(const path of ['.env','.env.local','.env.production','.env.production.local'])assert.ok(!existsSync(path),'Active environment files refused in this isolated fixture');
 const docker=(args:string[],input?:string)=>execFileSync('docker',['--context','desktop-linux',...args],{input,encoding:'utf8',timeout:90000,maxBuffer:6*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
 assert.equal(docker(['context','inspect','desktop-linux','--format','{{.Endpoints.docker.Host}}']),'npipe:////./pipe/dockerDesktopLinuxEngine');
 const db='mobile-core-'+randomUUID(),network=db+'-net';let started=false,networkStarted=false,closing=false;
 const sql=(source:string)=>docker(['exec','-i',db,'psql','-h','127.0.0.1','-XqAt','-U','postgres','-d','deletion_engine_test','-v','ON_ERROR_STOP=1'],source);
 let services:Awaited<ReturnType<typeof startCandidateServices>>|undefined;
 const stats:Record<string,number>={};let fault:{match:string;kind:string;remaining:number;delayMs:number}|null=null;
 const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.txt':'text/plain','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
 const routes:Record<string,Record<string,(request:Request)=>Promise<Response>>>={};
 const server=createServer((req,res)=>{void(async()=>{
  const url=new URL(req.url??'/',ORIGIN);const path=url.pathname;
  const hit=`${req.method} ${path}`;stats[hit]=(stats[hit]??0)+1;
  if(fault&&fault.remaining>0&&path.startsWith(fault.match)){
   fault.remaining--;
   if(fault.kind==='delay')await new Promise(r=>setTimeout(r,fault!.delayMs));
   if(fault.kind==='fail'){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({code:'B03_SYNTHETIC_UNAVAILABLE',message:'Local acceptance fault'}));return;}
  }
  const info=services!.connectionInfo();
  if(path.startsWith('/auth/v1/')||path.startsWith('/rest/v1/')){
   const auth=path.startsWith('/auth/v1/');const target=(auth?info.authUrl:info.restUrl)+path.slice(auth?8:8)+url.search;
   const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value&&!['host','connection','content-length','accept-encoding'].includes(key))headers.set(key,Array.isArray(value)?value.join(','):value);
   if(headers.get('apikey')===process.env.SUPABASE_SECRET_KEY)headers.set('authorization','Bearer '+info.serviceToken);
   const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
   const upstream=await fetch(target,{method:req.method,headers,body:chunks.length?Buffer.concat(chunks):undefined,signal:AbortSignal.timeout(20000)});
   if(fault&&fault.remaining>=0&&fault.kind==='drop-ack'&&fault.match===path&&req.method==='POST'){fault=null;await upstream.arrayBuffer();res.destroy();return;}
   const result=Buffer.from(await upstream.arrayBuffer());
   const responseHeaders:Record<string,string>={};upstream.headers.forEach((v,k)=>{if(!['content-encoding','transfer-encoding','content-length','connection'].includes(k))responseHeaders[k]=v;});
   res.writeHead(upstream.status,responseHeaders);res.end(result);return;
  }
  if(path.startsWith('/api/')){
   const handler=routes[path]?.[req.method??'GET'];if(!handler){res.writeHead(404).end();return;}
   const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
   const request=new Request(url,{method:req.method,headers:req.headers as Record<string,string>,body:chunks.length?Buffer.concat(chunks):undefined});
   const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  let pathname=decodeURIComponent(path);if(!extname(pathname))pathname=pathname.replace(/\/?$/,'/index.html');
  const base=resolve('out'),file=resolve(base,'.'+pathname);if(relative(base,file).startsWith('..')||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404).end('Not found');return;}
  res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream','cache-control':'no-store'});createReadStream(file).pipe(res);
 })().catch(error=>{console.error('B03 request failure',error instanceof Error?error.message:'unknown');if(!res.headersSent)res.writeHead(500);res.end('Local acceptance request failed');});});
 async function close(){if(closing)return;closing=true;server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));await services?.close();if(started){const c=JSON.parse(docker(['inspect',db]))[0];assert.equal(c.Config.Labels['feria-purpose'],purpose);assert.equal(c.HostConfig.NetworkMode,network);docker(['rm','-fv',db]);}if(networkStarted)docker(['network','rm',network]);console.log('B03 disposable services removed');}
 try{
  docker(['network','create','--label',`feria-purpose=${purpose}`,network]);networkStarted=true;
  docker(['run','--rm','-d','--network',network,'--name',db,'--label',`feria-purpose=${purpose}`,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=deletion_engine_test','postgres:17-alpine']);started=true;
  for(let i=0;i<60;i++){try{sql('SELECT 1');break;}catch{if(i===59)throw Error('Local DB not ready');await new Promise(r=>setTimeout(r,100));}}
  sql('CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;');
  services=await startCandidateServices({docker,db,network,purpose,fixturePassword:PASSWORD});
  sql(`CREATE OR REPLACE FUNCTION auth.uid()RETURNS uuid LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
   CREATE OR REPLACE FUNCTION auth.role()RETURNS text LANGUAGE sql STABLE AS $$SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role')$$;GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;`);
  sql(capturedOperationalFixtureDdl());sql("CREATE FUNCTION delete_current_user_app_data()RETURNS void LANGUAGE sql AS 'SELECT';");sql(read('supabase/migrations/071_add_account_deletion_request_foundation.sql'));sql('DROP FUNCTION delete_current_user_app_data();');
  sql(capturedRuntimeDefinitionsDdl());sql(capturedRuntimeSecurityDdl());sql(capturedRuntimeTriggersDdl());sql(read('supabase/migrations/095_scope_snapshot_rpcs_to_owner.sql'));sql(read('supabase/migrations/097_add_market_registration_conditions.sql'));
  // The capture omits defaults. Restore only the timestamp/UUID defaults used by normal App projections.
  const tables=capturedDeletionCatalog().filter(r=>r.detail.kind==='r');
  const defaults:string[]=[];
  for(const t of tables)for(const c of t.detail.columns){
   if(['created_at','updated_at'].includes(c.name)&&c.type==='timestamp with time zone')defaults.push(`ALTER TABLE ${t.identity} ALTER COLUMN ${qi(c.name)} SET DEFAULT clock_timestamp();`);
   if(c.name==='id'&&c.type==='uuid'&&t.identity!=='public.profiles')defaults.push(`ALTER TABLE ${t.identity} ALTER COLUMN id SET DEFAULT gen_random_uuid();`);
  }
  sql(defaults.join('\n'));
  // Match migration 069: captured catalog columns do not carry SQL defaults.
  sql('ALTER TABLE public.markets ALTER COLUMN is_schedule_override SET DEFAULT false;');
  const insert=(table:string,data:Record<string,unknown>,prefix='')=>{
   const cols=tables.find(t=>t.identity==='public.'+table)!.detail.columns,row={...data};
   for(const c of cols)if(!c.nullable&&row[c.name]===undefined){if(c.type==='uuid')row[c.name]=randomUUID();else if(c.type==='timestamp with time zone')row[c.name]=new Date().toISOString();else if(c.type==='boolean')row[c.name]=false;else if(/^(integer|bigint|numeric)/.test(c.type))row[c.name]=0;else if(c.type==='jsonb')row[c.name]={};else throw Error('Explicit fixture value needed '+table+'.'+c.name);}
   sql(`${prefix}INSERT INTO public.${qi(table)}(${Object.keys(row).map(qi).join(',')})VALUES(${Object.entries(row).map(([k,v])=>v===null?'NULL':cols.find(c=>c.name===k)?.type==='jsonb'?q(JSON.stringify(v))+'::jsonb':q(String(v))).join(',')});`);
  };
  const users=await services.users();const day='2026-11-20';
  for(const [kind,u]of Object.entries(users)){
   insert('profiles',{id:u.id,email:u.email,display_name:'B03 '+kind});
   if(kind!=='staff')insert('subscription_accounts',{owner_id:u.id,plan_code:kind==='legacy'?'free':'team',plan_source:kind==='legacy'?'free':'admin',billing_status:'none',entitlement_status:'active',entitlement_ends_at:null});
  }
  insert('subscription_read_guard_settings',{singleton:true,enforce_all:true});insert('subscription_write_guard_settings',{singleton:true,enforce_all:true});
  insert('staff_relationships',{owner_id:users.owner.id,staff_id:users.staff.id,staff_email:users.staff.email,role:'operator',status:'active',permissions:{can_view:true,can_edit:true,infoLevel:2}});
  const market=randomUUID(),otherMarket=randomUUID(),product=randomUUID();
  insert('markets',{id:market,owner_id:users.owner.id,name:'[B03] 手作雙日市集',location:'台南合成場地',start_date:day,end_date:'2026-11-21',status:'paid',operating_start_time:'00:00',operating_end_time:'23:59',operation_phase:'operating',operation_session_date:day,booth_cost:600,registration_fee:0});
  sql(`UPDATE public.markets SET registration_conditions='{"tableFree":"rental","chairFree":"unknown","umbrellaFree":"self"}' WHERE id='${market}';`);
  insert('markets',{id:otherMarket,owner_id:users.other.id,name:'[B03] 其他品牌專用',location:'隔離範圍',start_date:day,end_date:day,status:'registered'});
  insert('events',{id:randomUUID(),actor_id:users.owner.id,market_id:null,type:'product_created',timestamp:new Date().toISOString(),payload:{productId:product,name:'[B03] 手作杯墊',category:'handmade',price:120,cost:40,stock:20,isActive:true}},"SET request.jwt.claim.role='service_role';");
  await services.startRest();const info=services.connectionInfo();
  Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:ORIGIN,NEXT_PUBLIC_SUPABASE_ANON_KEY:info.anonToken,SUPABASE_SECRET_KEY:'sb_secret_'+randomBytes(32).toString('hex'),NEXT_PUBLIC_API_BASE_URL:ORIGIN.replace('http:','https:'),APP_API_CORS_ALLOWED_ORIGINS:ORIGIN+',http://localhost:41430',
   NEXT_PUBLIC_MARKET_REGION_ENABLED:'true',NEXT_PUBLIC_MARKET_PAYMENT_DEADLINE_ENABLED:'true',
   NEXT_PUBLIC_MARKET_JOURNALS_ENABLED:'true',NEXT_PUBLIC_MARKET_CASH_ENABLED:'true',NEXT_PUBLIC_MARKET_CASH_COMPARISON_ENABLED:'true',NEXT_PUBLIC_FINANCIAL_REVIEWS_ENABLED:'true',FERIA_RELEASE_CHANNEL:'production'});
  const requireLocal=createRequire(import.meta.url),marker=requireLocal.resolve('server-only'),stub=new Module(marker);
  stub.filename=marker;stub.loaded=true;stub.exports={};requireLocal.cache[marker]=stub;
  console.log('B03 isolated database and synthetic accounts ready');
  // Import handlers only after the loopback environment has been installed.
  for(const name of ['account-capabilities','product-cover-photo/capability','product-cover-photo/metadata','product-cover-photo/image','product-cover-photo/upload','sales-photo-evidence/image','sales-photo-evidence/upload','sales-photo-evidence/delete','operational-events/sync']){
   routes['/api/'+name]=await import('../app/api/'+name+'/route.ts');
  }
  await new Promise<void>((r,j)=>{server.once('error',j);server.listen(41430,'127.0.0.1',r);});
  console.log('B03 local HTTP handlers ready; building the formal mobile bundle');
  const env={...process.env};delete env.NODE_OPTIONS;
  const build=spawn(process.execPath,['scripts/build-mobile.mjs'],{env,stdio:'inherit'});
  assert.equal(await new Promise(r=>build.on('exit',r)),0,'Mobile static build failed');
  mkdirSync('.codex-artifacts',{recursive:true});const state={date:day,origin:ORIGIN,users,market,otherMarket,product,password:PASSWORD,db};
  writeFileSync('.codex-artifacts/b03-local-fixture.private.json',JSON.stringify(state,null,2));
  console.log('B03 READY',ORIGIN,'Synthetic fixture details: .codex-artifacts/b03-local-fixture.private.json');
  const lines=createInterface({input:process.stdin});
  for await(const line of lines){
   try{
    const command=JSON.parse(line) as {action:string;user?:keyof typeof users;plan?:string;seconds?:number;match?:string;kind?:string;count?:number;delayMs?:number};
    if(command.action==='stop')break;
    if(command.action==='fault'){assert.ok(command.match?.startsWith('/rest/v1/')||command.match==='/api/account-capabilities');assert.ok(['delay','fail','drop-ack'].includes(command.kind!));fault={match:command.match!,kind:command.kind!,remaining:command.count??1,delayMs:Math.min(command.delayMs??3000,10000)};console.log('B03 fault scheduled');}
    if(command.action==='plan'){assert.ok(command.user&&users[command.user]&&['free','pro','team'].includes(command.plan!));const until=command.seconds?new Date(Date.now()+command.seconds*1000).toISOString():null;sql(`UPDATE public.subscription_accounts SET plan_code=${q(command.plan!)},plan_source=${q(command.plan==='free'?'free':'admin')},entitlement_status='active',entitlement_ends_at=${until?q(until):'NULL'},updated_at=clock_timestamp() WHERE owner_id='${users[command.user!].id}';`);console.log('B03 synthetic plan updated');}
    if(command.action==='snapshot'){const data=sql(`SELECT jsonb_build_object('markets',(SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'owner',owner_id,'conditions',registration_conditions))FROM public.markets),'events',(SELECT jsonb_agg(jsonb_build_object('id',id,'type',type,'actor',actor_id,'market',market_id,'payload',payload))FROM public.events),'products',(SELECT jsonb_agg(jsonb_build_object('id',id,'stock',stock,'price',price))FROM public.products));`);writeFileSync('.codex-artifacts/b03-cloud-snapshot.json',data);console.log('B03 snapshot saved',createHash('sha256').update(data).digest('hex'));}
   }catch(error){console.error('B03 control rejected',error instanceof Error?error.message:'unknown');}
  }
  lines.close();
 }finally{await close();}
}
void main().catch(error=>{const stderr=String((error as {stderr?:string}).stderr??'');console.error(stderr.slice(0,1000)||(error instanceof Error?error.stack:String(error)));process.exitCode=1;});
