import { cashPointCents, type CashData } from './market-cash';
import type { EventLike } from '@/lib/events/event-read-model';

export const cashComparisonEnabled = () => process.env.NEXT_PUBLIC_MARKET_CASH_COMPARISON_ENABLED === 'true';
export { otherCashCents } from './market-cash-adjustment';
export type { OtherCash, CashSalesBasis } from './market-cash-adjustment';
import { otherCashCents } from './market-cash-adjustment';
export interface CashSalesSnapshot { marketId:string;key:string;capturedAt:string;events:EventLike[] }
export function cashComparisonKey(data:CashData):string {
  return JSON.stringify([cashPointCents(data.opening),cashPointCents(data.closing),data.otherCash?.mode ?? 'none',otherCashCents(data.otherCash),data.otherCash?.mode==='net'?data.otherCash.note.trim():'',data.note.trim()]);
}
function eventDate(event:EventLike):string|null {
  const explicit=event.payload?.dealDate ?? event.payload?.deal_date;
  // No device-timezone fallback: ambiguous legacy records must be confirmed.
  if(typeof explicit!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(explicit))return null;
  const timestamp=Date.parse(`${explicit}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10)===explicit?explicit:null;
}
function saleCents(event:EventLike):number|null {
  const p=event.payload ?? {};
  const direct=p.manualRevenue ?? p.manual_revenue ?? p.totalAmount ?? p.total_amount;
  const cents=(value:unknown):number|null=>typeof value==='number' && Number.isFinite(value) && value>=0 && value<=999999999.99 && Math.abs(value*100-Math.round(value*100))<0.0001?Math.round(value*100):null;
  if(direct!==undefined)return cents(direct);
  if(!Array.isArray(p.items) || !p.items.length)return null;
  let sum=0;
  for(const item of p.items){
    const price=cents(item.price_at_time_of_sale ?? item.priceAtTimeOfSale ?? item.price),quantity=item.quantity;
    if(price===null || !Number.isSafeInteger(quantity) || quantity<0)return null;
    sum+=price*quantity;if(!Number.isSafeInteger(sum))return null;
  }
  return sum;
}
export function summarizeCashSales(events:EventLike[],date:string) {
  const unique=new Map(events.filter(e=>e.id).map(e=>[e.id!,e]));
  const deleted=new Set([...unique.values()].filter(e=>e.type==='deal_deleted').map(e=>e.payload?.eventId ?? e.payload?.event_id));
  let cashCents=0,noncashCents=0,unknownPaymentCount=0,invalidAmountCount=0,unassignedDateCount=0,saleCount=0;
  for(const event of unique.values()){
    if(event.type!=='deal_closed' || deleted.has(event.id))continue;
    const day=eventDate(event);if(!day){unassignedDateCount++;continue;}if(day!==date)continue;
    saleCount++;
    const amount=saleCents(event),method=event.payload?.paymentMethod ?? event.payload?.payment_method;
    if(amount===null){invalidAmountCount++;continue;}
    if(method==='cash')cashCents+=amount;
    else if(method==='card' || method==='mobile')noncashCents+=amount;
    else unknownPaymentCount++; // 'other' may include cash; never silently treat it as noncash.
  }
  if(!Number.isSafeInteger(cashCents) || !Number.isSafeInteger(noncashCents))throw new Error('CASH_SALES_AMOUNT');
  return {cashCents,noncashCents,unknownPaymentCount,invalidAmountCount,unassignedDateCount,saleCount};
}
export function buildCashComparison(data:CashData,snapshot:CashSalesSnapshot,date:string) {
  const sales=summarizeCashSales(snapshot.events,date),opening=cashPointCents(data.opening),closing=cashPointCents(data.closing),other=otherCashCents(data.otherCash);
  const expected=opening===null?null:opening+sales.cashCents+other;
  const difference=expected===null || closing===null?null:closing-expected;
  const stale=Boolean(data.salesBasis && (data.salesBasis.salesKey!==snapshot.key || data.salesBasis.cashKey!==cashComparisonKey(data)));
  return {...sales,expected,difference,other,stale};
}
export function cashComparisonSourceReady(model:ReturnType<typeof buildCashComparison>|null,fresh:boolean,pendingCount:number):boolean {
  return Boolean(fresh && pendingCount===0 && model && model.unknownPaymentCount===0 && model.invalidAmountCount===0 && model.unassignedDateCount===0);
}
