'use client';
import {useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db} from '@/lib/db';
import {FinancialReviewRepository} from '@/lib/markets/financial-review-repository';
import {financialReviewCloud} from '@/lib/supabase/financial-reviews';
import {financialReviewsEnabled} from '@/lib/markets/financial-reviews';
import {financialReviewEpoch,subscribeFinancialReviewScope} from '@/lib/markets/financial-review-scope';

/** Caller must intersect owner role and paid capability. All reads are additionally owner-scoped. */
export function useFinancialReviews(ownerId:string,marketIds:readonly string[],allowed:boolean) {
 const enabled=financialReviewsEnabled() && allowed && !!ownerId;
 const idsKey=[...new Set(marketIds)].sort().join('|');
 const ids=useMemo(()=>idsKey?idsKey.split('|'):[],[idsKey]);
 const epoch=useSyncExternalStore(subscribeFinancialReviewScope,financialReviewEpoch,financialReviewEpoch);
 const scope=`${ownerId}:${idsKey}:${epoch}:${enabled}`;
 const currentScope=useRef(scope);currentScope.current=scope;
 const requestId=useRef(0);
 const repository=useMemo(()=>new FinancialReviewRepository(enabled?ownerId:'',financialReviewCloud,db,epoch),[ownerId,enabled,epoch]);
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
  const request=++requestId.current;
  setState({scope,loading:true,error:''});
  try {for(let offset=0;offset<ids.length;offset+=100)await repository.refresh(ids.slice(offset,offset+100));if(currentScope.current===scope && requestId.current===request)setState({scope,loading:false,error:''});}
  catch {if(currentScope.current===scope && requestId.current===request)setState({scope,loading:false,error:'尚未確認最新成本核對紀錄，淨利暫不作完整判讀。'});}
 },[enabled,ids,repository,scope]);
 useEffect(()=>{let active=true;
  if(!enabled || !ids.length)return;
  const request=++requestId.current;
  setState({scope,loading:true,error:''});
  void (async()=>{try {for(let offset=0;offset<ids.length;offset+=100)await repository.refresh(ids.slice(offset,offset+100));if(active && currentScope.current===scope && requestId.current===request)setState({scope,loading:false,error:''});}
  catch {if(active && currentScope.current===scope && requestId.current===request)setState({scope,loading:false,error:'尚未確認最新成本核對紀錄，淨利暫不作完整判讀。'});}})();
  return()=>{active=false;};
 },[enabled,ids,repository,scope,pendingKey]);
 const ready=state.scope===scope && !state.loading && !state.error;
 const blocked=useMemo(()=>new Set(enabled?ready?local?.pending ?? ids:ids:[]),[enabled,ready,local?.pending,ids]);
 return {enabled,repository,snapshots:enabled?local?.snapshots ?? []:[],blocked,ready:!enabled || ready,
  loading:enabled && ids.length>0 && (state.scope!==scope || state.loading || local===undefined),error:enabled && state.scope===scope?state.error:'',refresh};
}
