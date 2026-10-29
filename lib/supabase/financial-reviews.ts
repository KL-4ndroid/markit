import {supabase} from './client';
import {runJournalRequest} from '@/lib/markets/market-journal-request';
import type {FinancialReviewCloudPort} from '@/lib/markets/financial-review-repository';
import type {FinancialReviewSnapshot} from '@/lib/markets/financial-reviews';
export const financialReviewCloud:FinancialReviewCloudPort={
 async assertIdentity(owner){const {data,error}=await runJournalRequest(()=>supabase.auth.getSession());if(error || data.session?.user.id!==owner)throw new Error('FINANCE_SCOPE');},
 async read(ids){
  const {data,error}=await runJournalRequest(signal=>supabase.rpc('read_market_financial_reviews',{p_market_ids:ids}).abortSignal(signal).retry(false));if(error)throw error;
  if(!Array.isArray(data))throw new Error('FINANCE_SOURCE');
  return (data as FinancialReviewSnapshot[]).map(snapshot=>{
   if(!Array.isArray(snapshot.dates) || !Array.isArray(snapshot.feeBasis) || !Array.isArray(snapshot.reviews) || !snapshot.days || !/^[a-f0-9]{32}$/.test(snapshot.feeKey))throw new Error('FINANCE_SOURCE');
   return {...snapshot,days:Object.fromEntries(Object.entries(snapshot.days).map(([day,value])=>[day,{...value,valid:value.valid===true,zeroAllowed:value.zeroAllowed===true}])),reviews:snapshot.reviews.map(row=>({...row,valid:row.valid===true}))};
  });
 },
 async save(w){const {error}=await runJournalRequest(signal=>supabase.rpc('save_market_financial_review',{p_market_id:w.marketId,p_review_key:w.key,p_mode:w.mode,p_amount:w.amount,p_observed:w.observed,p_source_key:w.sourceKey,p_expected_revision:w.revision,p_mutation_id:w.mutationId}).abortSignal(signal).retry(false));if(error)throw error;},
};
