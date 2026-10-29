/** Explicit live verification: owner reads + denied staff/anonymous calls only.
 * No service key, role changes, valid writes, cache clearing or browser-session access.
 * Credentials must be supplied through temporary process environment variables.
 */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if(!url || new URL(url).hostname!=='fgejncfsvvsayiequubm.supabase.co' || !key)throw new Error('Expected explicitly scoped test project');
const ownerEmail=process.env.FINANCIAL_REVIEW_TEST_OWNER_EMAIL;
const staffEmail=process.env.FINANCIAL_REVIEW_TEST_STAFF_EMAIL;
const password=process.env.FINANCIAL_REVIEW_TEST_PASSWORD;
if(!ownerEmail || !staffEmail || !password)throw new Error('Temporary test credentials are required');
const factory=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const owner=factory(),staff=factory(),anonymous=factory();
const market='622aa8bc-c4f2-4068-9592-1cf8c872af90',zeroMarket='de5d2ead-5ee7-4115-9015-6919459c6984';
async function login(client,email){const {error}=await client.auth.signInWithPassword({email,password});if(error)throw new Error('Test sign-in failed');}
function denied(error){assert.ok(error);assert.equal(error.code,'42501');}
try {
 await login(owner,ownerEmail);
 const {data,error}=await owner.rpc('read_market_financial_reviews',{p_market_ids:[market,zeroMarket]});assert.ifError(error);
 assert.equal(data.length,2);
 const sales=data.find(s=>s.marketId===market),zero=data.find(s=>s.marketId===zeroMarket);
 assert.equal(sales.days['2026-10-27'].revenue,260);assert.equal(sales.days['2026-10-28'].revenue,1);
 assert.equal(sales.days['2026-10-27'].deals+sales.days['2026-10-28'].deals,4);
 assert.equal(sales.reviews.find(r=>r.review_key==='2026-10-27').mode,'cleared');
 assert.equal(sales.reviews.find(r=>r.review_key==='2026-10-28').amount,0);
 assert.ok(sales.reviews.find(r=>r.review_key==='2026-10-28').valid);
 assert.equal(zero.days['2026-10-25'].count,0);assert.equal(zero.days['2026-10-25'].revenue,0);
 assert.equal(zero.days['2026-10-25'].deals,0);
 assert.ok(zero.reviews.find(r=>r.mode==='zero-income')?.valid);assert.ok(zero.reviews.find(r=>r.mode==='zero-fee')?.valid);
 console.log('PASS live owner reads saved daily cost / cleared correction / zero-income / zero-fee; original sales remain 261 and 4, zero day has no sale event');
 await login(staff,staffEmail);
 denied((await staff.rpc('read_market_financial_reviews',{p_market_ids:[market]})).error);
 // Intentionally invalid input also prevents any business write if a scope guard regresses.
 denied((await staff.rpc('save_market_financial_review',{p_market_id:market,p_review_key:'fees',p_mode:'cleared',p_amount:null,p_observed:null,p_source_key:'invalid',p_expected_revision:0,p_mutation_id:randomUUID()})).error);
 console.log('PASS live staff read/save denied before invalid input is evaluated');
 denied((await anonymous.rpc('read_market_financial_reviews',{p_market_ids:[market]})).error);
 console.log('PASS live anonymous RPC execution denied');
} finally {
 // LOCAL signs out only these in-memory clients, preserving every browser session.
 await Promise.allSettled([owner.auth.signOut({scope:'local'}),staff.auth.signOut({scope:'local'})]);
}
