'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db} from '@/lib/db';
import {FinancialReviewRepository} from '@/lib/markets/financial-review-repository';
import {financialReviewCloud} from '@/lib/supabase/financial-reviews';
import {financialReviewsEnabled} from '@/lib/markets/financial-reviews';

/** Caller must intersect owner role and paid capability. All reads are additionally owner-scoped. */
export function useFinancialReviews(ownerId:string,marketIds:readonly string[],allowed:boolean) {
 const enabled=financialReviewsEnabled() && allowed && !!ownerId;
 const idsKey=[...new Set(marketIds)].sort().join('|');
 const ids=useMemo(()=>idsKey?idsKey.split('|'):[],[idsKey]);
 const scope=`${ownerId}:${idsKey}`;
 const repository=useMemo(()=>new FinancialReviewRepository(ownerId,financialReviewCloud),[ownerId]);
 const local=useLiveQuery(async()=>{
  if(!enabled || !ids.length)return {snapshots:[],pending:[] as string[]};
  const snapshots=(await db.financialReviewCache.where('ownerId').equals(ownerId).toArray()).filter(row=>ids.includes(row.marketId)).map(row=>row.snapshot);
  const pending=[...new Set((await db.events.where('market_id').anyOf(ids).toArray())
   .filter(event=>['local_only','pending','conflict','error'].includes(event.sync_status ?? '') && ['deal_closed','deal_deleted','market_created','market_updated','market_ended'].includes(event.type)).map(event=>event.market_id!))];
  return {snapshots,pending};
 },[enabled,ownerId,idsKey]);
 const [state,setState]=useState({scope:'',loading:false,error:''});
 const pendingKey=local?.pending.join('|') ?? '';
 const refresh=useCallback(async()=>{
  if(!enabled || !ids.length)return;
  setState({scope,loading:true,error:''});
  try {for(let offset=0;offset<ids.length;offset+=100)await repository.refresh(ids.slice(offset,offset+100));setState({scope,loading:false,error:''});}
  catch {setState({scope,loading:false,error:'尚未確認最新成本核對紀錄，淨利暫不作完整判讀。'});}
 },[enabled,ids,repository,scope]);
 useEffect(()=>{let active=true;
  if(!enabled || !ids.length)return;
  setState({scope,loading:true,error:''});
  void (async()=>{try {for(let offset=0;offset<ids.length;offset+=100)await repository.refresh(ids.slice(offset,offset+100));if(active)setState({scope,loading:false,error:''});}
  catch {if(active)setState({scope,loading:false,error:'尚未確認最新成本核對紀錄，淨利暫不作完整判讀。'});}})();
  return()=>{active=false;};
 },[enabled,ids,repository,scope,pendingKey]);
 const ready=state.scope===scope && !state.loading && !state.error;
 const blocked=useMemo(()=>new Set(enabled?ready?local?.pending ?? ids:ids:[]),[enabled,ready,local?.pending,ids]);
 return {enabled,repository,snapshots:enabled?local?.snapshots ?? []:[],blocked,ready:!enabled || ready,
  loading:enabled && ids.length>0 && (state.scope!==scope || state.loading || local===undefined),error:enabled && state.scope===scope?state.error:'',refresh};
}
