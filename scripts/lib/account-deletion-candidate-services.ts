// Optional real GoTrue/PostgREST adapters for the EXISTING captured-SQL runner.
// Synthetic identities/keys only; ports loopback, no bind mounts, private Docker network.
import assert from 'node:assert/strict';
import { AuthClient } from '@supabase/auth-js';
import { createDeletionIdentityPort } from '../../lib/subscription/account-deletion-engine-adapters.server';
import { randomBytes,createHmac } from 'node:crypto';
type Docker=(a:string[],input?:string)=>string;
export async function startCandidateServices(input:{docker:Docker;db:string;network:string;purpose:string}){
 const {docker,db,network,purpose}=input,secret=randomBytes(48).toString('hex'),auth=db+'-auth',rest=db+'-rest';let restStarted=false;
 const jwt=(role:string)=>{const a=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),b=Buffer.from(JSON.stringify({role,iss:'supabase',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');return `${a}.${b}.${createHmac('sha256',secret).update(`${a}.${b}`).digest('base64url')}`;};
 const service=jwt('service_role'),password=randomBytes(20).toString('hex');
 const endpoint=(name:string,port:string)=>{const r=JSON.parse(docker(['inspect',name]))[0];assert.equal(r.Config.Labels['feria-purpose'],purpose);assert.equal(r.HostConfig.PortBindings[port][0].HostIp,'127.0.0.1');return `http://127.0.0.1:${r.NetworkSettings.Ports[port][0].HostPort}`;};
 async function ready(url:string){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Candidate service health failed');}
 docker(['run','--rm','-d','--name',auth,'--network',network,'--label',`feria-purpose=${purpose}`,'-p','127.0.0.1::9999',
  '-e','GOTRUE_API_HOST=0.0.0.0','-e','GOTRUE_API_PORT=9999','-e','API_EXTERNAL_URL=http://127.0.0.1','-e','GOTRUE_SITE_URL=http://127.0.0.1',
  '-e','GOTRUE_DB_DRIVER=postgres','-e',`GOTRUE_DB_DATABASE_URL=postgres://postgres@${db}:5432/deletion_engine_test?sslmode=disable&search_path=auth`,
  '-e','GOTRUE_DB_NAMESPACE=auth','-e',`GOTRUE_JWT_SECRET=${secret}`,'-e','GOTRUE_JWT_ADMIN_ROLES=service_role','-e','GOTRUE_JWT_AUD=authenticated','-e','GOTRUE_JWT_DEFAULT_GROUP=authenticated',
  '-e','GOTRUE_MAILER_AUTOCONFIRM=true','-e','GOTRUE_DISABLE_SIGNUP=false','public.ecr.aws/supabase/gotrue:v2.196.0']);
 const authUrl=endpoint(auth,'9999/tcp');
 try{await ready(authUrl+'/health');}catch(e){docker(['rm','-fv',auth]);throw e;}
 const tokens=new Map<string,string>();let restUrl='';
 const identityClient=new AuthClient({url:authUrl,headers:{Authorization:`Bearer ${service}`,apikey:service},persistSession:false,autoRefreshToken:false,detectSessionInUrl:false});
 async function authCall(path:string,method='GET',body?:unknown,token=service){const r=await fetch(authUrl+path,{method,headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(5000)});let data:unknown=null;try{data=await r.json();}catch{}return {status:r.status,data};}
 async function rpc(name:string,args:Record<string,unknown>,token=service){const r=await fetch(restUrl+'/rpc/'+name,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(8000)});const body=await r.text();let data:unknown=null;try{data=JSON.parse(body);}catch{}return r.ok?{data,error:null}:{data:null,error:{code:(data as{code?:string}|null)?.code??String(r.status)}};}
 return {
  async users(){const out={}as Record<'owner'|'other'|'staff'|'legacy',{id:string;email:string}>;for(const kind of ['owner','other','staff','legacy']as const){const email=`candidate-${kind}-${randomBytes(6).toString('hex')}@example.test`;const created=await authCall('/admin/users','POST',{email,password,email_confirm:true,role:'authenticated'});assert.equal(created.status,200);const u=created.data as{id:string};const login=await authCall('/token?grant_type=password','POST',{email,password});assert.equal(login.status,200);tokens.set(u.id,(login.data as{access_token:string}).access_token);out[kind]={id:u.id,email};}return out;},
  async startRest(){docker(['run','--rm','-d','--name',rest,'--network',network,'--label',`feria-purpose=${purpose}`,'-p','127.0.0.1::3000','-e',`PGRST_DB_URI=postgres://postgres@${db}:5432/deletion_engine_test`,'-e','PGRST_DB_SCHEMAS=public','-e','PGRST_DB_ANON_ROLE=anon','-e',`PGRST_JWT_SECRET=${secret}`,'public.ecr.aws/supabase/postgrest:v16.1']);restStarted=true;restUrl=endpoint(rest,'3000/tcp');await ready(restUrl+'/');},
  rpc,
  async authenticate(request:Request){const {authenticateAppApiRequest}=await import('../../lib/api/server/auth');return authenticateAppApiRequest(request,{verifier:{async getUser(token){const r=await authCall('/user','GET',undefined,token);return {data:{user:r.status===200?r.data as{id:string}:null},error:r.status===200?null:Error('Candidate auth rejected')};}}});},
  token(actor:string){const t=tokens.get(actor);assert.ok(t);return t;},
  async read(table:string,filters:string,actor:string){const r=await fetch(`${restUrl}/${table}?select=${table==='events'?'*,markets(owner_id)':'*'}&${filters}`,{headers:{authorization:`Bearer ${table==='product_cover_photos'?service:tokens.get(actor)}`},signal:AbortSignal.timeout(5000)});if(!r.ok){const e=await r.json()as{code?:string;message?:string};if(e.code!=='PGRST200')console.error(`Candidate ${table} read rejected (${r.status}/${e.code??'unknown'})`);throw Error('Candidate read rejected');}const rows=await r.json()as unknown[];assert.ok(rows.length<=1);return rows[0]??null;},
  async verifyAnonymous(){const r=await rpc('bff_read_recorded_photo_upload',{p_actor:null,p_owner:null,p_kind:'product',p_entity:null,p_spec:{},p_source:null},jwt('anon'));assert.ok(r.error);},
  async deleteIdentity(actor:string){const r=await authCall('/admin/users/'+actor,'DELETE');assert.equal(r.status,200);const again=await authCall('/user','GET',undefined,tokens.get(actor));assert.notEqual(again.status,200);},
  identity:createDeletionIdentityPort({auth:identityClient},authUrl),
  async close(){for(const name of [...(restStarted?[rest]:[]),auth]){let r;try{r=JSON.parse(docker(['inspect',name]))[0];}catch{continue;}assert.equal(r.Config.Labels['feria-purpose'],purpose);assert.equal(r.HostConfig.NetworkMode,network);assert.equal(r.Mounts.filter((m:{Type:string})=>m.Type==='bind').length,0);docker(['rm','-fv',name]);}},
 };
}
