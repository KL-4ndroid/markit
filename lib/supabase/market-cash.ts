import { supabase } from './client';
import { runJournalRequest } from '@/lib/markets/market-journal-request';
import { cashRecordId,type CashData,type MarketCashRecord } from '@/lib/markets/market-cash';
import type { CashCloudPort } from '@/lib/markets/market-cash-repository';
import { cashComparisonEnabled, type CashSalesSnapshot } from '@/lib/markets/market-cash-comparison';
type CashRow={owner_id:string;market_id:string;business_date:string;data:CashData;revision:number;mutation_id:string;updated_at:string};
const fromRow=(row:CashRow):MarketCashRecord=>({id:cashRecordId(row.market_id,row.business_date),ownerId:row.owner_id,marketId:row.market_id,businessDate:row.business_date,data:row.data,revision:row.revision,mutationId:row.mutation_id,updatedAt:row.updated_at});
export const cashCloud:CashCloudPort={
  async assertIdentity(ownerId){const {data,error}=await runJournalRequest(()=>supabase.auth.getSession());if(error || data.session?.user.id!==ownerId)throw new Error('CASH_SCOPE');},
  async list(ownerId,marketId){
    const rows:MarketCashRecord[]=[];let after:string|null=null;
    for(;;){
      let query=supabase.from('market_cash_records').select('*').eq('owner_id',ownerId).eq('market_id',marketId).order('business_date').limit(200);
      if(after)query=query.gt('business_date',after);
      const {data,error}=await runJournalRequest(signal=>query.abortSignal(signal).retry(false));if(error)throw error;
      const page=data as CashRow[];rows.push(...page.map(fromRow));if(page.length<200)return rows;after=page[page.length-1].business_date;
    }
  },
  async save(draft){
    const enhanced=draft.data.otherCash!==undefined || draft.data.salesBasis!==undefined;
    if(enhanced && !cashComparisonEnabled())throw new Error('CASH_CLIENT_UPGRADE');
    const {data,error}=await runJournalRequest(signal=>supabase.rpc(enhanced?'save_market_cash_record_v2':'save_market_cash_record',{
      p_market_id:draft.marketId,p_business_date:draft.businessDate,p_data:draft.data,p_expected_revision:draft.baseRevision,p_mutation_id:draft.mutationId,
    }).abortSignal(signal).retry(false));if(error)throw error;
    return fromRow((Array.isArray(data)?data[0]:data) as CashRow);
  },
};
export async function readCashSales(ownerId:string,marketId:string):Promise<CashSalesSnapshot>{
  await cashCloud.assertIdentity(ownerId);
  const {data,error}=await runJournalRequest(signal=>supabase.rpc('read_market_cash_sales',{p_market_id:marketId}).abortSignal(signal).retry(false));
  if(error)throw error;
  await cashCloud.assertIdentity(ownerId);
  const snapshot=data as CashSalesSnapshot;
  if(snapshot?.marketId!==marketId || !/^[a-f0-9]{32}$/.test(snapshot.key) || !Array.isArray(snapshot.events))throw new Error('CASH_SCOPE');
  return snapshot;
}
