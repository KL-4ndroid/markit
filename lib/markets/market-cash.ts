import type { Market } from '@/types/db';
import { marketBusinessDates } from './market-business-dates';
import { otherCashCents, type OtherCash, type CashSalesBasis } from './market-cash-adjustment';
export const marketCashEnabled = () => process.env.NEXT_PUBLIC_MARKET_CASH_ENABLED === 'true';
export const CASH_DENOMINATIONS = [1000,500,100,50,10,5,1] as const;
export const MAX_CASH_CENTS = 99_999_999_999;
export type CashPoint = {mode:'none'} | {mode:'total';amount:string} | {mode:'denominations';counts:Record<string,string>};
export interface CashData { opening:CashPoint; closing:CashPoint; note:string;otherCash?:OtherCash;salesBasis?:CashSalesBasis|null }
export interface MarketCashRecord { id:string;ownerId:string;marketId:string;businessDate:string;data:CashData;revision:number;mutationId:string;updatedAt:string }
export interface MarketCashDraft { id:string;ownerId:string;marketId:string;businessDate:string;data:CashData;baseRevision:number;mutationId:string;updatedAt:number;buffers?:Partial<Record<'opening'|'closing',CashPoint[]>> }
export const cashRecordId = (marketId:string,date:string) => `${marketId}:${date}`;
export const emptyCashData = (): CashData => ({opening:{mode:'none'},closing:{mode:'none'},note:''});
export function isCashOwner(market:Market|undefined,ownerId:string):market is Market & {id:string} {
  return Boolean(ownerId && market?.id && market.owner_id===ownerId && !market.isDeleted
    && (market as Market & {access_type?:string}).access_type!=='staff');
}
export function cashPointCents(point:CashPoint):number|null {
  if(point.mode==='none') return null;
  if(point.mode==='total') {
    const value=point.amount.trim();
    if(!/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(value)) throw new Error('總額請填寫非負金額，最多兩位小數。');
    const [whole,fraction='']=value.split('.');
    return Number(whole)*100+Number(fraction.padEnd(2,'0'));
  }
  if(point.mode!=='denominations') throw new Error('請選擇現金記錄方式。');
  if(Object.keys(point.counts).some(key=>!CASH_DENOMINATIONS.some(d=>String(d)===key))) throw new Error('面額不在支援範圍，請改用總額記錄。');
  let total=0,entered=false;
  for(const denomination of CASH_DENOMINATIONS) {
    const raw=point.counts[denomination]?.trim() ?? '';
    if(raw==='') continue;
    entered=true;
    if(!/^(0|[1-9]\d{0,5})$/.test(raw)) throw new Error('張數／枚數請填寫非負整數，最多 999999。');
    total+=denomination*Number(raw)*100;
  }
  if(!entered) throw new Error('請至少輸入一種面額的數量；確認沒有現金時可填 0。');
  if(total>MAX_CASH_CENTS) throw new Error('現金總額過大，請檢查張數／枚數。');
  return total;
}
export const formatCashCents = (cents:number) => `NT$${(cents/100).toLocaleString('zh-TW',{maximumFractionDigits:2})}`;
export function cashIncrease(data:CashData):number|null {
  const opening=cashPointCents(data.opening),closing=cashPointCents(data.closing);
  return opening===null || closing===null ? null : closing-opening;
}
export function validateCashData(data:CashData):CashData {
  function validate(point:CashPoint):CashPoint {
    const cents=cashPointCents(point);
    if(point.mode==='total') return {mode:'total',amount:((cents ?? 0)/100).toFixed(2)};
    if(point.mode==='denominations') return {mode:'denominations',counts:Object.fromEntries(CASH_DENOMINATIONS
      .filter(d=>point.counts[d]?.trim())
      .map(d=>[d,point.counts[d].trim()]))};
    return {mode:'none'};
  }
  if([...data.note].length>1000) throw new Error('盤點備註最多 1000 字。');
  const result:CashData={opening:validate(data.opening),closing:validate(data.closing),note:data.note.trim()};
  if(data.otherCash){
    if(data.otherCash.mode!=='none' && data.otherCash.mode!=='net')throw new Error('其他現金進出方式不正確。');
    const cents=otherCashCents(data.otherCash);
    result.otherCash=data.otherCash.mode==='none'?{mode:'none'}:{mode:'net',amount:(cents/100).toFixed(2),note:data.otherCash.note.trim()};
  }
  if(data.salesBasis!==undefined){
    const basis=data.salesBasis;
    if(basis && (!/^[a-f0-9]{32}$/.test(basis.salesKey) || typeof basis.cashKey!=='string' || basis.cashKey.length>16000 || !Number.isFinite(Date.parse(basis.capturedAt))))throw new Error('請重新讀取現金銷售，再記下比較基準。');
    result.salesBasis=basis;
  }
  return result;
}
export function validateCashDate(date:string,market:Pick<Market,'dates'|'startDate'|'endDate'>,previousDate?:string) {
  if(date!==previousDate && !marketBusinessDates(market).includes(date)) throw new Error('請選擇這場市集的營業日期。');
}
export function cashHasConflict(draft:MarketCashDraft|undefined,row:MarketCashRecord|undefined) {
  return Boolean(draft && row && draft.baseRevision!==row.revision && draft.mutationId!==row.mutationId);
}
export function cashErrorMessage(error:unknown) {
  const message=String((error as {message?:string})?.message ?? error);
  if(message.includes('CASH_DRAFT_CONFLICT')) return '另一個分頁已更新草稿。這次輸入沒有覆寫它，請先保留目前內容，再重新開啟。';
  if(message.includes('CASH_CONFLICT')) return '其他裝置已更新這天的現金紀錄。草稿仍保留，請讀取雲端版本後整合。';
  if(message.includes('CASH_STORAGE')) return '草稿尚未寫入裝置，請勿離開，先保留目前數字。';
  if(message.includes('CASH_OFFLINE')) return '目前離線，草稿已留在這台裝置；連線後請再按儲存到雲端。';
  if(message.includes('CASH_SCOPE')) return '目前無法存取這場市集。草稿仍留在原帳號中。';
  if(message.includes('CASH_DATE')) return '市集日期已變更，請重新確認營業日期；草稿仍保留。';
  if(message.includes('CASH_CLIENT_UPGRADE')) return '這筆包含新版現金比較資料，請更新應用程式後再編輯。草稿仍保留。';
  if(/^(請|總額|張數|面額|現金總額|盤點備註|其他現金)/.test(message)) return message;
  return '尚未確認送達雲端。草稿仍保留，請核對雲端後重試。';
}
