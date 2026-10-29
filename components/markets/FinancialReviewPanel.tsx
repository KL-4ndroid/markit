'use client';
import {useRef,useState} from 'react';
import {AppDialog} from '@/components/ui/AppDialog';
import {db,generateUUID} from '@/lib/db';
import {dailyFinancialBasis,marketFeeBasis} from '@/lib/analytics/financial-record-quality';
import {emptyFinancialDay,financialReviewError,reviewAmount,type FinancialReviewMode,type FinancialReviewWrite} from '@/lib/markets/financial-reviews';
import {getLocalDateString} from '@/lib/time-utils';
import type {useFinancialReviews} from '@/hooks/useFinancialReviews';
import type {DailyStats,Market} from '@/types/db';

export function FinancialReviewPanel({market,rawStats,finance,initialDate}:{market:Market;rawStats:readonly DailyStats[];finance:ReturnType<typeof useFinancialReviews>;initialDate?:string}){
 const [date,setDate]=useState(initialDate ?? '');
 const [editor,setEditor]=useState<{base:Omit<FinancialReviewWrite,'amount'|'mutationId'>;amount:string}|null>(null);
 const [error,setError]=useState('');const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);
 const attempt=useRef<FinancialReviewWrite|null>(null);const saving=useRef(false);
 if(!finance.enabled || !market.id)return null;
 const source=finance.snapshots.find(s=>s.marketId===market.id && s.ownerId===market.owner_id);
 const day=source?.dates.includes(date)?date:initialDate && source?.dates.includes(initialDate)?initialDate:source?.dates.filter(d=>d<=getLocalDateString()).at(-1) ?? '';
 const record=source?.reviews.find(r=>r.review_key===day && r.mode!=='cleared');
 const feeRecord=source?.reviews.find(r=>r.review_key==='fees' && r.mode!=='cleared');
 const disabled=!finance.ready || finance.loading || finance.blocked.has(market.id) || busy;
 function open(mode:FinancialReviewMode,key=day){
  if(!source || !market.id || disabled)return;
  setError('');setStatus('');attempt.current=null;
  const prior=source.reviews.find(row=>row.review_key===key);
  const raw=rawStats.find(stat=>stat.marketId===market.id && stat.date===key) ?? emptyFinancialDay(market.id,key);
  const daySource=source.days[key];
  if(key==='fees' ? JSON.stringify(source.feeBasis)!==marketFeeBasis(market) : !daySource?.valid || daySource.revenue!==raw.revenue || daySource.deals!==raw.dealCount){setError('來源尚未同步一致，請重新讀取紀錄後再核對。');return;}
  setEditor({base:{marketId:market.id,key,mode,observed:key==='fees'?source.feeBasis:JSON.parse(dailyFinancialBasis(raw)),sourceKey:key==='fees'?source.feeKey:daySource.key,revision:prior?.revision ?? 0},amount:mode==='cost'?(prior?.valid && prior.mode==='cost'?String(prior.amount):raw.cost>0?String(raw.cost):''):''});
 }
 async function submit(){
  if(!editor || saving.current)return;saving.current=true;setBusy(true);setError('');
  try{
   const request=attempt.current ?? {...editor.base,amount:editor.base.mode==='cost'?reviewAmount(editor.amount):null,mutationId:generateUUID()};
   attempt.current=request;await finance.repository.save(request);
   setEditor(null);attempt.current=null;setStatus('已保存核對紀錄，收入、成交數與商品庫存維持原值。');
  }catch(e){setError(financialReviewError(e));}finally{saving.current=false;setBusy(false);}
 }
 async function rebase(){
  if(!editor || busy)return;setBusy(true);setError('');
  try{
   const fresh=(await finance.repository.refresh([market.id!]))[0];
   const prior=fresh.reviews.find(row=>row.review_key===editor.base.key);
   if(prior && attempt.current && prior.mutation_id===attempt.current.mutationId && (prior.valid || prior.mode==='cleared')){setEditor(null);setStatus('已確認先前的核對已保存。');attempt.current=null;return;}
   const raw=await db.dailyStats.where('[date+marketId]').equals([editor.base.key,market.id!]).first() ?? emptyFinancialDay(market.id!,editor.base.key);
   const observed=editor.base.key==='fees'?fresh.feeBasis:JSON.parse(dailyFinancialBasis(raw));
   setEditor({...editor,base:{...editor.base,sourceKey:editor.base.key==='fees'?fresh.feeKey:fresh.days[editor.base.key]?.key ?? '',observed,revision:prior?.revision ?? 0}});attempt.current=null;
  }catch(e){setError(financialReviewError(e));}finally{setBusy(false);}
 }
 return <details className="mb-4 rounded-card border border-atelier-line bg-atelier-paper p-4" open={Boolean(initialDate) || undefined}>
  <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">核對成本與零收入</summary>
  {finance.loading && <p role="status" className="text-sm">正在讀取核對紀錄…</p>}
  {finance.error && <p role="status" className="text-sm text-danger">{finance.error}</p>}
  {finance.blocked.has(market.id) && !finance.error && !finance.loading && <p role="status" className="text-sm">還有場次資料待同步，完成同步後再核對。</p>}
  {status && <p role="status" className="text-sm text-primary">{status}</p>}
  {error && !editor && <p role="alert" className="text-sm text-danger">{error}</p>}
  <label className="mt-3 block text-sm">核對日期<select aria-label="核對日期" className="mt-1 min-h-11 w-full rounded-control border border-atelier-line bg-atelier-paper px-3 text-base" value={day} disabled={disabled} onChange={e=>setDate(e.target.value)}>{source?.dates.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
  {record && <p className="mt-2 text-xs leading-6 text-muted-foreground">{record.valid ? record.mode==='cost'?`已核對本日銷售成本 ${record.amount} 元`:'已確認本日零收入' : '原核對的來源已變更，請重新核對。'}</p>}
  <div className="mt-2 flex flex-wrap gap-2">
   <button type="button" disabled={disabled || !day || !source?.days[day]?.count || day>getLocalDateString()} onClick={()=>open('cost')} className="min-h-11 rounded-control border border-atelier-line px-3 text-sm disabled:opacity-50">核對當日銷售成本</button>
   <button type="button" disabled={disabled || !day || source?.days[day]?.count!==0 || !source?.days[day]?.zeroAllowed} onClick={()=>open('zero-income')} className="min-h-11 rounded-control border border-atelier-line px-3 text-sm disabled:opacity-50">確認當日零收入</button>
   {source?.feeTotal===0 && <button type="button" disabled={disabled} onClick={()=>open('zero-fee','fees')} className="min-h-11 rounded-control border border-atelier-line px-3 text-sm disabled:opacity-50">{feeRecord?.valid?'重新確認固定費用為 0':'確認固定費用為 0'}</button>}
   {feeRecord && <button type="button" disabled={disabled} onClick={()=>open('cleared','fees')} className="min-h-11 px-3 text-sm underline">撤回固定費用確認</button>}
   {record && <button type="button" disabled={disabled} onClick={()=>open('cleared')} className="min-h-11 px-3 text-sm underline">撤回本日核對</button>}
  </div>
  <button type="button" disabled={busy || finance.loading} onClick={()=>void finance.refresh()} className="mt-2 min-h-11 text-sm text-primary underline">重新讀取核對紀錄</button>
  <AppDialog open={!!editor} onClose={()=>{if(!busy){setEditor(null);setError('');}}} title={editor?.base.mode==='cost'?'核對當日銷售成本':editor?.base.mode==='zero-fee'?'確認固定費用為零':editor?.base.mode==='cleared'?'撤回核對紀錄':'確認當日零收入'} dismissible={!busy} presentation="sheet">
   <p className="mb-3 text-sm">{editor?.base.key==='fees'?'整場攤位與自付設備費':editor?.base.key}</p>
   {editor?.base.mode==='cost' ? <><label className="block text-sm">銷售成本總額（元）<input aria-label="銷售成本總額" inputMode="decimal" value={editor.amount} onChange={e=>{attempt.current=null;setEditor({...editor,amount:e.target.value});}} disabled={busy} className="mt-1 min-h-11 w-full rounded-control border border-atelier-line px-3 text-base" /></label><p className="mt-2 text-xs leading-6 text-muted-foreground">只填當日銷售成本，攤位及設備費另計。確認沒有銷售成本可填 0；個別商品及成交明細保留原內容。</p></> : <p className="text-sm leading-7">{editor?.base.mode==='zero-fee'?'確認整場攤位與自付設備費總額為 0；保證金與抽成仍各自計算。':editor?.base.mode==='cleared'?'撤回後回到原紀錄的成本判讀，核對歷程仍會保留。':'確認這天沒有銷售收入與成交；不會新增零元成交。'}</p>}
   {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
   {error && <button type="button" disabled={busy} onClick={()=>void rebase()} className="min-h-11 text-sm text-primary underline">重新讀取來源，保留輸入</button>}
   <div className="mt-4 flex gap-3"><button type="button" disabled={busy} onClick={()=>{setEditor(null);setError('');}} className="min-h-11 rounded-control border border-atelier-line px-4">取消</button><button type="button" disabled={busy || disabled} onClick={()=>void submit()} className="min-h-11 rounded-control bg-primary px-4 text-white disabled:opacity-50">{busy?'保存中…':'保存核對紀錄'}</button></div>
  </AppDialog>
 </details>;
}
