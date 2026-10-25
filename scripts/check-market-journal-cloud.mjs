/** Read-only schema readiness. Does not read journal text or invoke a writer. */
import { config } from 'dotenv';
config({path:'.env.local',quiet:true});
const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base || !key) {
  console.error('Missing local Supabase URL/server key; never paste keys into chat.');process.exitCode=1;
} else {
  const headers={apikey:key};
  if(!key.startsWith('sb_secret_')) headers.Authorization=`Bearer ${key}`;
  const url=new URL('/rest/v1/market_journals',base);
  url.searchParams.set('select','id,owner_id,market_id,author_id,business_date,body,revision,mutation_id,created_at,updated_at,deleted_at');
  url.searchParams.set('limit','0');
  const response=await fetch(url,{headers});
  console.log(`${response.ok?'PASS':'PENDING'} private journal schema (HTTP ${response.status}); no text read, no write invoked.`);
  if(!response.ok) process.exitCode=1;
}
