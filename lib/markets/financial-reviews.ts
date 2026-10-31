import type { DailyStats,Market } from '@/types/db';
import { dailyFinancialBasis,marketFeeBasis,type FinancialZeroConfirmation } from '@/lib/analytics/financial-record-quality';
export const financialReviewsEnabled=()=>process.env.NEXT_PUBLIC_FINANCIAL_REVIEWS_ENABLED==='true';
export type FinancialReviewMode='cost'|'zero-income'|'zero-fee'|'cleared';
export type FinancialReviewRow={owner_id:string;market_id:string;review_key:string;mode:FinancialReviewMode;amount:number|null;observed:unknown[];source_key:string;revision:number;mutation_id:string;updated_at:string;valid:boolean};
export type FinancialReviewSnapshot={ownerId:string;marketId:string;dates:string[];feeBasis:unknown[];feeKey:string;feeTotal:number;days:Record<string,{key:string;revenue:number;deals:number;count:number;valid:boolean;zeroAllowed:boolean}>;reviews:FinancialReviewRow[]};
export type FinancialReviewCache={id:string;ownerId:string;marketId:string;snapshot:FinancialReviewSnapshot};
export type FinancialReviewWrite={marketId:string;key:string;mode:FinancialReviewMode;amount:number|null;observed:unknown[];sourceKey:string;revision:number;mutationId:string};
export const financialCacheId=(owner:string,market:string)=>`${owner}:${market}`;
export function emptyFinancialDay(marketId:string,date:string):DailyStats{return {marketId,date,revenue:0,cost:0,profit:0,dealCount:0,touchCount:0,inquiryCount:0,productsSold:[],updatedAt:0};}
export function financialReviewError(error:unknown){
 const text=String((error as {message?:string})?.message ?? error);
 if(text.includes('FINANCE_SCOPE'))return '目前身分或方案無法核對這場市集。';
 if(text.includes('FINANCE_DRAFT_CONFLICT'))return '另一個視窗已更新這份草稿。你的輸入仍在畫面中，請重新開啟最新草稿，避免覆蓋。';
 if(text.includes('FINANCE_DRAFT_EXISTS'))return '這一天已有未完成草稿，請先選擇繼續或捨棄草稿。';
 if(text.includes('FINANCE_OFFLINE'))return '目前離線，草稿仍留在這台裝置。連線後請重新讀取來源，再確認保存結果。';
 if(/FINANCE_(SOURCE|CONFLICT|RETRY_CONFLICT)/.test(text))return '來源或核對紀錄已更新，請重新讀取後再核對；目前輸入仍保留。';
 if(text.includes('FINANCE_DATE'))return '請選擇已到的有效營業日期。';
 if(text.includes('FINANCE_INPUT'))return '金額或確認內容不正確，請檢查後再保存。';
 return '尚未確認送達雲端，請保留目前輸入並重新讀取紀錄，再核對保存結果。';
}
export function reviewAmount(text:string):number {
 if(!/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(text.trim()))throw new Error('FINANCE_INPUT');
 return Number(text);
}
/** Additional read layer. Never writes the underlying event, inventory, or daily projection. */
export function applyFinancialReviews(markets:readonly Market[],raw:readonly DailyStats[],snapshots:readonly FinancialReviewSnapshot[],blocked:ReadonlySet<string>=new Set()) {
 const stats=raw.map(stat=>({...stat}));
 const confirmations:Record<string,{fees:FinancialZeroConfirmation[];days:Record<string,FinancialZeroConfirmation[]>}>={};
 const stale:Record<string,string[]>={};
 for(const market of markets){
  if(!market.id)continue;
  const id=market.id,snapshot=snapshots.find(s=>s.marketId===id && s.ownerId===market.owner_id);
  const bundle:{fees:FinancialZeroConfirmation[];days:Record<string,FinancialZeroConfirmation[]>}={fees:[],days:{}};confirmations[id]=bundle;
  if(blocked.has(id) || !snapshot){for(const stat of stats.filter(s=>s.marketId===id))stat.financialReviewPending=true;continue;}
  for(const stat of stats.filter(s=>s.marketId===id)){
   const source=snapshot.days[stat.date];
   if(!source?.valid || source.revenue!==stat.revenue || source.deals!==stat.dealCount)stat.financialReviewPending=true;
  }
  for(const row of snapshot.reviews){
   if(row.mode==='cleared')continue;
   if(row.review_key==='fees'){
    if(row.valid && row.source_key===snapshot.feeKey && JSON.stringify(row.observed)===marketFeeBasis(market) && JSON.stringify(snapshot.feeBasis)===marketFeeBasis(market))bundle.fees.push({kind:'zero-fixed-fee',basis:marketFeeBasis(market)});
    else (stale[id]??=[]).push('fees');
    continue;
   }
   const day=row.review_key,source=snapshot.days[day];
   const indexes=stats.flatMap((s,i)=>s.marketId===id && s.date===day?[i]:[]);
   const before=indexes.length===1?stats[indexes[0]]:emptyFinancialDay(id,day);
   const current=row.valid && source?.valid && row.source_key===source.key && indexes.length<=1 && JSON.stringify(row.observed)===dailyFinancialBasis(before)
     && before.revenue===source.revenue && before.dealCount===source.deals
     && (row.mode!=='cost' || row.amount!==null && Number.isFinite(row.amount) && row.amount>=0)
     && (row.mode!=='zero-income' || source.count===0 && source.zeroAllowed);
   if(!current){(stale[id]??=[]).push(day);for(const i of indexes)stats[i].financialReviewPending=true;continue;}
   const next={...before};
   if(row.mode==='zero-income')next.financialZeroIncomeConfirmed=true;
   if(row.mode==='cost' && row.amount!==null){next.cost=row.amount;next.profit=Math.round((next.revenue-row.amount)*100)/100;}
   if(row.mode==='zero-income' && source.count!==0){(stale[id]??=[]).push(day);next.financialReviewPending=true;}
   if(indexes.length)stats[indexes[0]]=next;else stats.push(next);
   bundle.days[day]=[{kind:row.mode==='zero-income'?'zero-income':'zero-sales-cost',basis:dailyFinancialBasis(next)}];
  }
 }
 return {stats,confirmations,stale};
}
