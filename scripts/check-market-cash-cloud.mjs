/** Read-only schema probe; never reads balances or invokes a writer. */
import {config} from 'dotenv';
config({path:'.env.local',quiet:true});
const base=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base || !key)throw new Error('Missing Supabase server configuration; do not paste secrets into chat.');
const headers={apikey:key};if(!key.startsWith('sb_secret_'))headers.Authorization=`Bearer ${key}`;
const target=new URL('/rest/v1/market_cash_records',base);target.searchParams.set('select','market_id,business_date,owner_id,data,revision,mutation_id,updated_at');target.searchParams.set('limit','0');
const response=await fetch(target,{headers,signal:AbortSignal.timeout(12000)});
console.log(`${response.ok?'PASS':'PENDING'} optional cash schema (HTTP ${response.status}); no amounts read or writes invoked.`);
if(!response.ok)process.exitCode=1;
