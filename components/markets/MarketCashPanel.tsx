'use client';

import { useCallback,useEffect,useId,useMemo,useRef,useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db,generateUUID } from '@/lib/db';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRoleContext } from '@/lib/role-context';
import { cashCloud } from '@/lib/supabase/market-cash';
import { MarketCashRepository } from '@/lib/markets/market-cash-repository';
import { marketBusinessDates } from '@/lib/markets/market-business-dates';
import { CashSalesComparison } from './CashSalesComparison';
import { ContextHelp } from '@/components/ui/ContextHelp';
import { CASH_DENOMINATIONS,cashErrorMessage,cashHasConflict,cashIncrease,cashPointCents,cashRecordId,emptyCashData,formatCashCents,isCashOwner,marketCashEnabled,
  type CashPoint,type MarketCashDraft } from '@/lib/markets/market-cash';

const action='min-h-11 rounded-xl border border-primary/20 px-3 py-2 text-sm text-primary disabled:opacity-50';
export function MarketCashPanel({marketId,sessionDate,defaultOpen=false}:{marketId:string;sessionDate?:string|null;defaultOpen?:boolean}) {
  const {user}=useAuth();const {userRole,roleRefreshState}=useRoleContext();
  const [open,setOpen]=useState(defaultOpen);
  if(!marketCashEnabled() || !user || userRole.isStaff || !roleRefreshState.shouldMountProtectedChildren)return null;
  return <section className="my-4 rounded-3xl border border-primary/10 bg-white p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-x-3">
    <button type="button" className="flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 text-left" aria-expanded={open} onClick={()=>setOpen(!open)}>
      <span className="text-base font-semibold">開／收攤現金（選填）</span>
      <span className="shrink-0 text-sm text-primary">{open?'收起':'展開'}</span>
    </button>
    <ContextHelp label="盤點說明" iconOnly>
      <p>可略過不記錄；不影響正常開攤與收攤。可以直接填總額，或依面額計算。</p>
      <p>「未記錄」與實際記錄 0 元不同。切換記錄方式時，尚未儲存的輸入會留在本機草稿，可切回查看。</p>
      <p>每場、每天獨立記錄；跨午夜請選原本的營業日期。同一現金盒跨多場時，請自行區分範圍。</p>
      <p>現金盤點與比較不會改動營收、庫存或淨利。本機草稿需按「儲存到雲端」才會送出。</p>
    </ContextHelp>
    </div>
    {open && <CashWorkspace key={`${user.id}:${marketId}`} ownerId={user.id} marketId={marketId} sessionDate={sessionDate} disabled={!roleRefreshState.isAuthorizationFresh} />}
  </section>;
}
function pointLabel(point:CashPoint){try{const cents=cashPointCents(point);return cents===null?'未記錄':formatCashCents(cents);}catch{return '草稿尚未填完整';}}
function CashWorkspace({ownerId,marketId,sessionDate,disabled}:{ownerId:string;marketId:string;sessionDate?:string|null;disabled:boolean}) {
  const repository=useMemo(()=>new MarketCashRepository(ownerId,cashCloud),[ownerId]);
  const data=useLiveQuery(async()=>({market:await db.markets.get(marketId),
    rows:(await db.marketCashRecords.where('[ownerId+marketId]').equals([ownerId,marketId]).toArray()),
    drafts:(await db.marketCashDrafts.where('[ownerId+marketId]').equals([ownerId,marketId]).toArray()),
  }),[ownerId,marketId]);
  const [date,setDate]=useState('');const [editor,setEditor]=useState<MarketCashDraft|null>(null);
  const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');const [cloudError,setCloudError]=useState('');const [status,setStatus]=useState('');
  const alive=useRef(true);const writes=useRef(Promise.resolve());const saving=useRef(false);
  const refresh=useCallback(async()=>{
    setLoading(true);setCloudError('');
    try{await repository.refresh(marketId);}catch{if(alive.current)setCloudError('尚未確認最新雲端紀錄。以下可能是本機先前保存的內容；草稿會保留。');}
    finally{if(alive.current)setLoading(false);}
  },[repository,marketId]);
  useEffect(()=>{alive.current=true;void refresh();return()=>{alive.current=false;};},[refresh]);
  if(!data)return <p className="mt-3 text-sm">讀取現金紀錄中…</p>;
  if(!isCashOwner(data.market,ownerId))return <p className="mt-3 text-sm">目前無法讀取這場市集的現金紀錄。</p>;
  const dates=[...new Set([...marketBusinessDates(data.market),...data.rows.map(row=>row.businessDate),...data.drafts.map(d=>d.businessDate)])].sort();
  const day=dates.includes(date)?date:sessionDate && dates.includes(sessionDate)?sessionDate:data.drafts[0]?.businessDate ?? dates[0] ?? '';
  const id=cashRecordId(marketId,day),row=data.rows.find(r=>r.id===id),draft=data.drafts.find(d=>d.id===id);
  const conflict=cashHasConflict(editor ?? draft,row);
  const saved=row?.data ?? emptyCashData();
  const previous=data.rows.filter(r=>r.businessDate<day).sort((a,b)=>b.businessDate.localeCompare(a.businessDate))[0];
  let priorClosing:number|null=null;
  try{if(previous)priorClosing=cashPointCents(previous.data.closing);}catch{/* Invalid old data must not become a zero balance. */}
  function persist(next:MarketCashDraft){
    const previousMutationId=editor?.mutationId;
    setEditor(next);setError('');setStatus('正在保留本機草稿…');
    writes.current=writes.current.then(async()=>{
      try{await repository.stage(next,previousMutationId);if(alive.current)setStatus('草稿已保存在這台裝置，尚未送達雲端。');}
      catch(e){if(alive.current)setError(cashErrorMessage(e));}
    });
  }
  function changePoint(side:'opening'|'closing',point:CashPoint){if(editor)persist({...editor,data:{...editor.data,[side]:point},mutationId:generateUUID(),updatedAt:Date.now()});}
  function changeMode(side:'opening'|'closing',mode:CashPoint['mode']){
    if(!editor)return;const old=editor.data[side];
    const buffers={...editor.buffers,[side]:[...(editor.buffers?.[side] ?? []).filter(p=>p.mode!==old.mode),old]};
    let point:CashPoint=buffers[side]?.find(p=>p.mode===mode) ?? (mode==='none'?{mode}:{mode,...(mode==='total'?{amount:''}:{counts:{}})} as CashPoint);
    if(mode==='total' && old.mode==='denominations'){try{point={mode:'total',amount:((cashPointCents(old) ?? 0)/100).toFixed(2)};}catch{/* Keep unfinished counts in the draft buffer. */}}
    persist({...editor,buffers,data:{...editor.data,[side]:point},mutationId:generateUUID(),updatedAt:Date.now()});
  }
  async function submit(){
    if(!editor || disabled || saving.current)return;saving.current=true;setBusy(true);setError('');
    try{await writes.current;await repository.save(editor);if(alive.current){setEditor(null);setStatus('已保存到雲端。現金盤點不會改動營收、庫存或淨利。');}}
    catch(e){if(alive.current)setError(cashErrorMessage(e));if(String((e as {message?:string})?.message).includes('CASH_CONFLICT'))await refresh();}
    finally{saving.current=false;if(alive.current)setBusy(false);}
  }
  async function discard(){
    const target=editor ?? draft;if(!target || saving.current)return;
    setBusy(true);setError('');try{await writes.current;await repository.discard(target.id,target.mutationId);if(alive.current){setEditor(null);setStatus('本機草稿已捨棄，已同步紀錄保留。');}}catch(e){if(alive.current)setError(cashErrorMessage(e));}finally{if(alive.current)setBusy(false);}
  }
  return <div className="mt-4 space-y-3" aria-busy={busy || loading}>
    <label className="block text-sm">營業日期<select value={day} disabled={busy || disabled} onChange={e=>{setDate(e.target.value);setEditor(null);setError('');setStatus('');}} className="mt-1 min-h-11 w-full rounded-xl border border-primary/20 bg-white px-3 text-base sm:text-sm">
      {dates.map(d=><option key={d} value={d}>{d}{!marketBusinessDates(data.market!).includes(d)?'（日期待確認）':''}</option>)}
    </select></label>
    {loading && <p role="status" className="text-sm">正在確認雲端…</p>}
    {cloudError && <p role="status" className="text-sm text-danger">{cloudError}</p>}
    {status && <p role="status" className="text-sm text-primary">{status}</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {!editor && <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`${action} bg-primary text-white`} disabled={busy || loading || disabled || !day} onClick={()=>{
          setEditor(draft ?? {id,ownerId,marketId,businessDate:day,data:row?.data ?? emptyCashData(),baseRevision:row?.revision ?? 0,mutationId:generateUUID(),updatedAt:Date.now()});setError('');setStatus('輸入後會保留本機草稿；按儲存到雲端才送出。');
        }}>{draft?'繼續處理現金草稿':row?'修改現金紀錄':'選擇記錄方式'}</button>
        <button type="button" className={action} disabled={busy || loading || disabled} onClick={()=>void refresh()}>重新讀取</button>
        {draft && <button type="button" className={action} disabled={busy} onClick={()=>void discard()}>捨棄本機草稿</button>}
      </div>
      <dl className="grid grid-cols-2 gap-3 rounded-xl bg-background p-3 text-sm"><div><dt>開攤現金</dt><dd className="mt-1 break-words font-semibold">{pointLabel(saved.opening)}</dd></div><div><dt>收攤現金</dt><dd className="mt-1 break-words font-semibold">{pointLabel(saved.closing)}</dd></div></dl>
      <CashIncrease data={saved} />
      <CashSalesComparison ownerId={ownerId} marketId={marketId} day={day} data={saved} disabled={busy || loading || disabled}/>
      {saved.note && <p className="whitespace-pre-wrap break-words text-sm">{saved.note}</p>}
      {row && <p className="text-xs text-muted-foreground">已同步 · 第 {row.revision} 版 · 修改 {new Date(row.updatedAt).toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei'})}</p>}
      {draft && <p className="text-sm text-primary">這天有尚未送出的本機草稿。</p>}
    </>}
    {editor && <div className="space-y-4 rounded-xl border border-primary/15 p-3">
      <CashPointEditor label="開攤現金" point={editor.data.opening} disabled={busy || disabled} onMode={mode=>changeMode('opening',mode)} onChange={point=>changePoint('opening',point)} />
      {previous && priorClosing!==null && <button type="button" className={action} disabled={busy || disabled} onClick={()=>changePoint('opening',{mode:'total',amount:((priorClosing ?? 0)/100).toFixed(2)})}>帶入 {previous.businessDate} 收攤 {formatCashCents(priorClosing)}</button>}
      <CashPointEditor label="收攤現金" closing point={editor.data.closing} disabled={busy || disabled} onMode={mode=>changeMode('closing',mode)} onChange={point=>changePoint('closing',point)} />
      <p className="text-xs text-muted-foreground">選「不記錄」並儲存，會清除該時點原金額。</p>
      <CashIncrease data={editor.data} />
      <details className="rounded-xl border border-primary/10" open={editor.data.otherCash?.mode==='net' || undefined}>
        <summary className="min-h-11 cursor-pointer rounded-xl px-3 py-3 text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">比較現金銷售與其他進出（選用）</summary>
        <div className="p-3 pt-0"><CashSalesComparison ownerId={ownerId} marketId={marketId} day={day} data={editor.data} disabled={busy || loading || disabled} onChange={next=>persist({...editor,data:next,mutationId:generateUUID(),updatedAt:Date.now()})}/></div>
      </details>
      <label className="block text-sm">盤點備註（選填）<textarea rows={3} value={editor.data.note} disabled={busy || disabled} maxLength={1000} onChange={e=>persist({...editor,data:{...editor.data,note:e.target.value},mutationId:generateUUID(),updatedAt:Date.now()})} className="mt-1 w-full rounded-xl border border-primary/20 p-3 text-base sm:text-sm" placeholder="例如：兩場共用現金盒，或提領前後的盤點範圍" /></label>
      {conflict && row && <div className="space-y-2 rounded-xl bg-background p-3 text-sm"><p>雲端第 {row.revision} 版：開攤 {pointLabel(row.data.opening)}／收攤 {pointLabel(row.data.closing)}</p><p className="whitespace-pre-wrap break-words">雲端備註：{row.data.note || '未填'}</p>
        {row.data.otherCash?.mode==='net' && <p className="whitespace-pre-wrap break-words">雲端其他現金進出：{row.data.otherCash.amount} 元 · {row.data.otherCash.note || '未填備註'}</p>}
        <button type="button" className={action} disabled={busy || disabled} onClick={()=>persist({...editor,baseRevision:row.revision,mutationId:generateUUID(),updatedAt:Date.now()})}>已核對，保留目前輸入整合</button></div>}
      <div className="flex flex-wrap gap-2"><button type="button" className={`${action} bg-primary text-white`} disabled={busy || disabled || conflict} onClick={()=>void submit()}>儲存到雲端</button>
        <button type="button" className={action} disabled={busy} onClick={()=>setEditor(null)}>先收起，保留草稿</button>
        <button type="button" className={action} disabled={busy} onClick={()=>void discard()}>捨棄本機草稿</button></div>
    </div>}
  </div>;
}
function CashIncrease({data}:{data:{opening:CashPoint;closing:CashPoint}}){
  let increase:number|null=null;try{increase=cashIncrease({...data,note:''});}catch{/* An incomplete input is not zero. */}
  return <p className="rounded-xl bg-background p-3 text-sm">{increase===null?'記錄開攤與收攤現金後，可查看盤點增減。':`盤點現金${increase>=0?'增加':'減少'} ${formatCashCents(Math.abs(increase))}。`}<span className="mt-1 block text-xs text-muted-foreground">盤點增減不是營收或淨利，也不表示已對帳完成。</span></p>;
}
function CashPointEditor({label,point,disabled,closing=false,onMode,onChange}:{label:string;point:CashPoint;disabled:boolean;closing?:boolean;onMode:(mode:CashPoint['mode'])=>void;onChange:(point:CashPoint)=>void}){
  const id=useId();
  return <fieldset disabled={disabled} className="space-y-2"><legend className="mb-2 text-sm font-semibold">{label}</legend>
    {closing && point.mode!=='none' && <p className="text-xs leading-5 text-muted-foreground">請在提領或存款前盤點。</p>}
    <label htmlFor={id} className="text-xs text-muted-foreground">{label}記錄方式</label>
    <select id={id} value={point.mode} onChange={e=>onMode(e.target.value as CashPoint['mode'])} className="min-h-11 w-full rounded-xl border border-primary/20 bg-white px-3 text-base sm:text-sm"><option value="none">不記錄（預設）</option><option value="total">直接填總額</option><option value="denominations">依面額計算</option></select>
    {point.mode==='total' && <label className="block text-sm">{label}總額（元）<input inputMode="decimal" value={point.amount} onChange={e=>onChange({...point,amount:e.target.value})} className="mt-1 min-h-11 w-full rounded-xl border border-primary/20 px-3 text-base sm:text-sm" placeholder="例如 2000，0 代表實際記錄零元" /></label>}
    {point.mode==='denominations' && <div className="grid grid-cols-2 gap-2">{CASH_DENOMINATIONS.map(d=><label key={d} className="min-w-0 text-sm">{label} {d.toLocaleString()} 元{d>=100?'（張）':'（枚）'}<input inputMode="numeric" value={point.counts[d] ?? ''} onChange={e=>onChange({...point,counts:{...point.counts,[d]:e.target.value}})} className="mt-1 min-h-11 w-full rounded-xl border border-primary/20 px-3 text-base sm:text-sm" placeholder="未填" /></label>)}</div>}
    {point.mode!=='none' && <p className="text-sm text-primary">合計：{pointLabel(point)}</p>}
  </fieldset>;
}
