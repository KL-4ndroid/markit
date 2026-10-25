export type OtherCash = { mode:'none' } | { mode:'net';amount:string;note:string };
export type CashSalesBasis = { salesKey:string;cashKey:string;capturedAt:string };
export function otherCashCents(other:OtherCash|undefined):number {
  if(!other || other.mode==='none')return 0;
  const amount=other.amount.trim();
  if(!/^-?(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(amount))throw new Error('其他現金進出請填正負金額，最多兩位小數。');
  const [whole,fraction='']=amount.replace(/^-/,'').split('.');
  const absolute=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if([...other.note].length>1000)throw new Error('其他現金進出備註最多 1000 字。');
  return amount.startsWith('-')?-absolute:absolute;
}
