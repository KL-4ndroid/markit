'use client';
import Link from 'next/link';
import { useMemo,useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRoleContext } from '@/lib/role-context';
import { MarketCashRepository } from '@/lib/markets/market-cash-repository';
import { cashCloud } from '@/lib/supabase/market-cash';
import { cashErrorMessage,isCashOwner } from '@/lib/markets/market-cash';
import { buildMarketDetailHref } from '@/lib/navigation/market-detail-route';
export function CashDraftList(){
  const {user}=useAuth();const {userRole,roleRefreshState}=useRoleContext();
  const repository=useMemo(()=>new MarketCashRepository(user?.id ?? '',cashCloud),[user?.id]);
  const [error,setError]=useState('');
  const drafts=useLiveQuery(async()=>{
    if(!user || userRole.isStaff)return [];
    const rows=await db.marketCashDrafts.where('ownerId').equals(user.id).toArray();
    return Promise.all(rows.map(async draft=>({draft,market:await db.markets.get(draft.marketId)})));
  },[user?.id,userRole.isStaff]);
  if(!user || userRole.isStaff || !roleRefreshState.shouldMountProtectedChildren || !drafts?.length)return null;
  return <section className="space-y-3 border-t border-primary/10 pt-5"><h2 className="font-semibold">尚未送出的現金草稿</h2>
    <p className="text-sm text-muted-foreground">一般同步不會代為送出。回原市集展開「開／收攤現金」，或明確捨棄本機草稿；已同步紀錄保留。</p>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {drafts.map(({draft,market})=><div key={draft.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-background p-3 text-sm">
      <span>{isCashOwner(market,user.id)?market.name:'原市集目前無法讀取'} · {draft.businessDate}</span>
      {isCashOwner(market,user.id) && <Link href={buildMarketDetailHref(draft.marketId, { returnTo: 'account' })} className="inline-flex min-h-11 items-center text-primary underline">回原市集處理</Link>}
      <button type="button" disabled={!roleRefreshState.isAuthorizationFresh} className="min-h-11 rounded-xl border border-primary/20 px-3 text-primary disabled:opacity-50" onClick={async()=>{
        try{await repository.discard(draft.id,draft.mutationId);setError('');}catch(e){setError(cashErrorMessage(e));}
      }}>捨棄此份本機現金草稿</button>
    </div>)}
  </section>;
}
