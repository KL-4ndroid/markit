/** Read-only schema readiness. Never creates templates or applies checklist events. */
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url || !key) throw new Error('Server-only Supabase configuration is missing; no values were printed.');
const headers={apikey:key};
if(!key.startsWith('sb_secret_')) headers.Authorization=`Bearer ${key}`;
const target=new URL('/rest/v1/preparation_templates',url);
target.searchParams.set('select','id,owner_id,name,items,revision,mutation_id,archived,updated_at');
target.searchParams.set('limit','0');
const response=await fetch(target,{headers,signal:AbortSignal.timeout(12000)});
if(!response.ok){console.error(`Template table readiness pending (HTTP ${response.status}).`);process.exitCode=1;}
else console.log('PASS preparation_templates columns are available. This does not verify RPC grants, RLS or actual account behavior.');
