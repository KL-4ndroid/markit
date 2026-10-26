'use client';

import { useCallback,useEffect,useRef,useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { readCashSales } from '@/lib/supabase/market-cash';
import { getNetworkPort } from '@/lib/platform/network-capability';
import { getLifecyclePort } from '@/lib/platform/lifecycle-capability';
import { cashScopeEpoch } from '@/lib/markets/market-cash-scope';
import { ContextHelp } from '@/components/ui/ContextHelp';
import { formatCashCents,type CashData } from '@/lib/markets/market-cash';
import { buildCashComparison,cashComparisonEnabled,cashComparisonKey,cashComparisonSourceReady,type CashSalesSnapshot } from '@/lib/markets/market-cash-comparison';

const button='min-h-11 rounded-xl border border-primary/20 px-3 py-2 text-sm text-primary disabled:opacity-50';
interface Props { ownerId:string;marketId:string;day:string;data:CashData;disabled:boolean;onChange?:(data:CashData)=>void }
export function CashSalesComparison(props:Props){
  return cashComparisonEnabled()?<ComparisonWorkspace key={`${props.ownerId}:${props.marketId}`} {...props}/>:null;
}
function ComparisonWorkspace({ownerId,marketId,day,data,disabled,onChange}:Props){
  const local=useLiveQuery(()=>db.events.where('market_id').equals(marketId).filter(e=>e.type==='deal_closed' || e.type==='deal_deleted').toArray(),[marketId]);
  const localKey=local?JSON.stringify(local.map(e=>[e.id,e.payload,e.sync_status]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))):null;
  const pending=local?.filter(e=>e.sync_status!=='synced').length ?? 0;
  const [snapshot,setSnapshot]=useState<CashSalesSnapshot|null>(null),[loadedLocalKey,setLoadedLocalKey]=useState<string|null>(null);
  const [loading,setLoading]=useState(false),[error,setError]=useState(''),[connectionVersion,setConnectionVersion]=useState(0);
  const request=useRef(0);
  useEffect(()=>{
    const cancel=()=>{request.current++;};
    const invalidate=()=>{cancel();setLoadedLocalKey(null);setLoading(false);setConnectionVersion(n=>n+1);};
    const network=getNetworkPort().subscribe(invalidate),lifecycle=getLifecyclePort().subscribe(invalidate);
    return()=>{cancel();network();lifecycle();};
  },[]);
  const refresh=useCallback(async()=>{
    if(disabled || localKey===null || !getNetworkPort().getCurrentStatus().connected || getLifecyclePort().getCurrentState()!=='active')return;
    const generation=++request.current,epoch=cashScopeEpoch();setLoading(true);setError('');setLoadedLocalKey(null);
    try{
      const next=await readCashSales(ownerId,marketId);
      if(generation===request.current && epoch===cashScopeEpoch()){setSnapshot(next);setLoadedLocalKey(localKey);}
    }catch(e){if(generation===request.current)setError(String((e as {message?:string})?.message).includes('CASH_SALES_LIMIT')?'這場成交資料超過比較上限，暫不提供差額；盤點仍可保存。':'尚未讀到完整雲端成交；請連線後重新讀取。盤點與草稿仍保留。');}
    finally{if(generation===request.current)setLoading(false);}
  },[ownerId,marketId,localKey,disabled]);
  useEffect(()=>{void refresh();},[refresh,connectionVersion]);
  let model:ReturnType<typeof buildCashComparison>|null=null,inputError='';
  try{if(snapshot)model=buildCashComparison(data,snapshot,day);}catch(e){inputError=String((e as Error).message);}
  const fresh=Boolean(snapshot && loadedLocalKey!==null && loadedLocalKey===localKey && !loading && !error && !disabled && getNetworkPort().getCurrentStatus().connected);
  const complete=cashComparisonSourceReady(model,fresh,pending);
  const net=data.otherCash?.mode==='net'?data.otherCash:null;
  const differenceLabel=model?.difference===null || !model?'記錄開攤與收攤現金後，才可比較差額。':`現金差額${complete?'':'（暫估）'}：${model.difference===0?'NT$0（目前記錄相符）':`${model.difference>0?'多出':'短少'} ${formatCashCents(Math.abs(model.difference))}`}`;
  return <section aria-label="現金銷售比較" className="space-y-3 rounded-xl border border-primary/15 p-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <h3 className="font-semibold">現金銷售與差額</h3>
      <ContextHelp label="差額怎麼算">
        <p>現金差額＝實盤收攤現金 −（開攤現金＋已記錄現金銷售＋其他現金進出）。非現金收款不納入現金銷售。</p>
        <p>其他現金進出只記一個淨額。例如補入找零 1,000 元、拿出 500 元，淨額為補入 500 元。沒有記錄時，比較會假設沒有其他進出。</p>
        <p>雲端讀取只代表該時點已送達的紀錄，不保證其他裝置沒有未送出成交。共用現金盒跨場時，請自行拆分。</p>
        <p>比較不調整營收、庫存或利潤。差額為零只表示目前記錄相符，不代表所有帳務已核對。</p>
      </ContextHelp>
    </div>
    {onChange && <>
      <label className="block">其他現金進出（選填）<select className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 text-base sm:text-sm" disabled={disabled} value={net?'net':'none'} onChange={e=>onChange({...data,otherCash:e.target.value==='net'?{mode:'net',amount:'',note:''}:{mode:'none'}})}><option value="none">不記錄，假設沒有其他進出</option><option value="net">記錄一個淨額</option></select></label>
      {net && <div className="space-y-2">
        <label className="block">進出方向<select className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 text-base sm:text-sm" disabled={disabled} value={net.amount.startsWith('-')?'out':'in'} onChange={e=>onChange({...data,otherCash:{...net,amount:(e.target.value==='out'?'-':'')+net.amount.replace(/^-/,'')}})}><option value="in">補入現金（增加）</option><option value="out">拿出／支出／退現（減少）</option></select></label>
        <label className="block">現金進出淨額（元）<input className="mt-1 min-h-11 w-full rounded-xl border px-3 text-base sm:text-sm" inputMode="decimal" disabled={disabled} value={net.amount.replace(/^-/,'')} onChange={e=>onChange({...data,otherCash:{...net,amount:(net.amount.startsWith('-')?'-':'')+e.target.value}})} placeholder="例如 500；沒有進出可填 0"/></label>
        <label className="block">現金進出備註（選填）<textarea rows={2} maxLength={1000} className="mt-1 w-full rounded-xl border p-3 text-base sm:text-sm" disabled={disabled} value={net.note} onChange={e=>onChange({...data,otherCash:{...net,note:e.target.value}})} placeholder="例如：補入找零 1000、拿出 500，淨額為補入 500"/></label>
      </div>}
    </>}
    {!net && <p className="text-xs text-muted-foreground">比較時假設沒有其他現金進出。</p>}
    {net?.note && !onChange && <p className="whitespace-pre-wrap break-words">現金進出備註：{net.note}</p>}
    <button type="button" className={button} disabled={disabled || loading} onClick={()=>void refresh()}>{loading?'讀取雲端成交中…':'重新讀取現金銷售'}</button>
    {error && <p role="status" className="text-danger">{error}</p>}
    {!fresh && <p role="status">成交來源待確認；以下數字僅供參考，不能據此完成對帳。</p>}
    {pending>0 && <p role="status">本機尚有 {pending} 筆成交／撤回資料未確認同步，請先處理同步後重讀。</p>}
    {inputError && <p role="status" className="text-danger">{inputError}</p>}
    {model && <>
      <dl className="grid grid-cols-2 gap-3">
        <div><dt>已記錄現金銷售</dt><dd className="mt-1 break-words font-semibold">{formatCashCents(model.cashCents)}</dd></div>
        <div><dt>非現金收款（排除）</dt><dd className="mt-1 break-words">{formatCashCents(model.noncashCents)}</dd></div>
        <div><dt>其他現金進出</dt><dd className="mt-1 break-words">{formatCashCents(model.other)}</dd></div>
        <div><dt>預期收攤現金{complete?'':'（暫估）'}</dt><dd className="mt-1 break-words font-semibold">{model.expected===null?'需先記開攤現金':formatCashCents(model.expected)}</dd></div>
      </dl>
      <p className="rounded-xl bg-background p-3">{differenceLabel}<span className="mt-1 block text-xs text-muted-foreground">依目前已讀取紀錄比較；不代表所有帳務已核對。</span></p>
      {model.unknownPaymentCount>0 && <p role="status">有 {model.unknownPaymentCount} 筆付款方式為其他／缺漏，尚無法確認現金比例；未納入現金銷售。</p>}
      {model.invalidAmountCount>0 && <p role="status">有 {model.invalidAmountCount} 筆金額格式待確認，未納入比較。</p>}
      {model.unassignedDateCount>0 && <p role="status">這場另有 {model.unassignedDateCount} 筆缺少明確營業日期，未自行按裝置時間分配。</p>}
      {model.expected!==null && model.expected<0 && <p role="status">預期收攤金額為負，請檢查現金進出是否重複計入。</p>}
      {model.stale && <p role="status" className="text-primary">原比較基準已更新，請重新確認成交、盤點及進出內容。</p>}
      {onChange && <button type="button" className={button} disabled={disabled || !complete || model.difference===null} onClick={()=>snapshot && onChange({...data,salesBasis:{salesKey:snapshot.key,cashKey:cashComparisonKey(data),capturedAt:snapshot.capturedAt}})}>記下目前比較基準</button>}
    </>}
    {snapshot && <p className="text-xs text-muted-foreground">雲端成交讀取時間：{new Date(snapshot.capturedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</p>}
    {data.salesBasis && <p className="text-xs text-muted-foreground">比較基準時間：{new Date(data.salesBasis.capturedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}。{onChange?'此基準需隨盤點一起儲存到雲端。':''}</p>}
  </section>;
}
