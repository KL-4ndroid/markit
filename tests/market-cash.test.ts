import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db,generateUUID,clearAllData } from '../lib/db';
import { CASH_DENOMINATIONS,cashPointCents,cashIncrease,emptyCashData,validateCashData,cashRecordId,cashHasConflict,validateCashDate,type MarketCashDraft,type MarketCashRecord } from '../lib/markets/market-cash';
import { MarketCashRepository,type CashCloudPort } from '../lib/markets/market-cash-repository';
import { invalidateCashScope } from '../lib/markets/market-cash-scope';
import { installNetworkPort } from '../lib/platform/network-capability';
import { getLocalPendingWriteReport } from '../lib/sync/local-pending-write-report';
import { guardedAuthenticatedCacheReset } from '../lib/sync/authenticated-cache-reset-guard';
import { resolveAccountDeletionPreflight } from '../lib/subscription/account-deletion-preflight';
import { hasScheduleMarketUserActivity } from '../lib/recurring-operations/reconciliation';
import { marketBusinessDates } from '../lib/markets/market-business-dates';
async function main(){
  const network=installNetworkPort({getCurrentStatus:()=>({connected:true,connectionType:'unknown'}),subscribe:()=>()=>{}});
  process.env.NEXT_PUBLIC_MARKET_CASH_ENABLED='true';await db.open();await clearAllData();
  assert.equal(cashPointCents({mode:'none'}),null);assert.equal(cashPointCents({mode:'total',amount:'0'}),0);
  assert.equal(cashPointCents({mode:'total',amount:'0.29'}),29);
  assert.equal(cashPointCents({mode:'denominations',counts:{1000:'2',500:'1',100:'3',50:'1',10:'2',5:'1',1:'4'}}),287900);
  assert.equal(CASH_DENOMINATIONS.includes(500),true);
  assert.equal(cashPointCents({mode:'denominations',counts:{1000:'0',100:''}}),0);
  for(const counts of [{100:'-1'},{100:'1.5'},{100:'1e2'},{100:''},{2000:'1'},{1000:'999999',500:'999999'}])assert.throws(()=>cashPointCents({mode:'denominations',counts}));
  for(const amount of ['','-1','1.234','1e3','NaN','Infinity','1000000000'])assert.throws(()=>cashPointCents({mode:'total',amount}));
  assert.equal(cashIncrease(emptyCashData()),null);
  assert.equal(cashIncrease({opening:{mode:'total',amount:'2000'},closing:{mode:'total',amount:'5450'},note:''}),345000);
  const market={id:'cash-market',owner_id:'owner',name:'Test',location:'Test',startDate:'2026-10-23',endDate:'2026-10-25',dates:['2026-10-23','2026-10-25'],status:'completed' as const,createdAt:1,updatedAt:1,totalRevenue:4500,totalProfit:3000};
  await db.markets.put(market);assert.deepEqual(marketBusinessDates(market),market.dates);
  assert.throws(()=>validateCashDate('2026-10-24',market));assert.doesNotThrow(()=>validateCashDate('2026-10-24',market,'2026-10-24'));
  assert.throws(()=>validateCashData({...emptyCashData(),note:'字'.repeat(1001)}));
  const rows=new Map<string,MarketCashRecord>();let actor='owner',loseAck=false,writerCalls=0,invalidate=false;
  const cloud:CashCloudPort={
    async assertIdentity(owner){if(actor!==owner)throw new Error('CASH_SCOPE');},
    async list(owner,marketId){return [...rows.values()].filter(r=>r.ownerId===owner && r.marketId===marketId);},
    async save(draft){
      writerCalls++;const previous=rows.get(draft.id);
      if(previous?.mutationId===draft.mutationId)return previous;
      if((previous?.revision ?? 0)!==draft.baseRevision)throw new Error('CASH_CONFLICT');
      const row:MarketCashRecord={id:draft.id,ownerId:draft.ownerId,marketId:draft.marketId,businessDate:draft.businessDate,data:draft.data,mutationId:draft.mutationId,revision:(previous?.revision ?? 0)+1,updatedAt:'2026-10-23T12:00:00Z'};
      rows.set(row.id,row);if(invalidate)invalidateCashScope();if(loseAck){loseAck=false;throw new Error('lost response');}return row;
    },
  };
  let repo=new MarketCashRepository('owner',cloud);
  const draft:MarketCashDraft={id:cashRecordId(market.id,'2026-10-23'),ownerId:'owner',marketId:market.id,businessDate:'2026-10-23',data:{...emptyCashData(),opening:{mode:'total',amount:'2000'}},baseRevision:0,mutationId:generateUUID(),updatedAt:1};
  await assert.rejects(repo.save({...draft,data:emptyCashData()}),/不記錄/);assert.equal(await db.marketCashDrafts.count(),0);
  const offline=installNetworkPort({getCurrentStatus:()=>({connected:false,connectionType:'none'}),subscribe:()=>()=>{}});
  await assert.rejects(repo.save(draft),/CASH_OFFLINE/);assert.equal(writerCalls,0);assert.equal((await db.marketCashDrafts.get(draft.id))?.data.opening.mode,'total');offline();
  await db.close();await db.open();assert.equal(await db.marketCashDrafts.count(),1,'draft survives a database reopen');
  const report=await getLocalPendingWriteReport('owner');assert.equal(report.pendingMarketCashDraftCount,1);assert.ok(report.blockingReasonCodes.includes('local_pending_market_cash'));
  let resets=0;const blocked=await guardedAuthenticatedCacheReset({scope:'full',reason:'manual_signout',userId:'owner',allowSyncAttempt:true},{getReport:async()=>report,push:async()=>{},reset:async()=>{resets++;}});
  assert.equal(blocked.decision,'blocked');assert.equal(resets,0);assert.equal(resolveAccountDeletionPreflight({report,safeExportAvailable:true}).outcome,'blocked');
  assert.ok(hasScheduleMarketUserActivity({hasCashRecords:true}));
  await assert.rejects(repo.stage({...draft,mutationId:generateUUID()}),/CASH_DRAFT_CONFLICT/);
  loseAck=true;await assert.rejects(repo.save(draft),/lost response/);await repo.refresh(market.id);assert.equal(cashHasConflict(draft,await db.marketCashRecords.get(draft.id)),false);
  await repo.save(draft);assert.equal(rows.get(draft.id)?.revision,1);assert.equal(await db.marketCashDrafts.count(),0);
  const next={...draft,baseRevision:1,data:{...draft.data,closing:{mode:'total' as const,amount:'5450'},otherCash:{mode:'net' as const,amount:'-50',note:'提領'}},mutationId:generateUUID()};await repo.stage(next);
  await db.close();await db.open();assert.deepEqual((await db.marketCashDrafts.get(draft.id))?.data.otherCash,next.data.otherCash,'cash movement draft survives process/cache reopening');
  rows.set(draft.id,{...rows.get(draft.id)!,revision:2,mutationId:generateUUID()});await repo.refresh(market.id);
  assert.equal((await db.marketCashDrafts.get(draft.id))?.data.closing.mode,'total');assert.equal(cashHasConflict(next,await db.marketCashRecords.get(draft.id)),true);
  await assert.rejects(repo.save(next),/CASH_CONFLICT/);
  const merged={...next,baseRevision:2,mutationId:generateUUID()};await repo.stage(merged,next.mutationId);await repo.save(merged);
  assert.deepEqual((await db.marketCashRecords.get(draft.id))?.data.otherCash,{mode:'net',amount:'-50.00',note:'提領'});
  await repo.stage({...merged,mutationId:generateUUID(),data:{...merged.data,opening:{mode:'denominations',counts:{1000:'-1'}}}},merged.mutationId);
  assert.equal(await db.marketCashDrafts.count(),1,'invalid in-progress input can be preserved, but not sent');
  const pending=(await db.marketCashDrafts.toArray())[0];await assert.rejects(repo.save(pending),/整數/);await repo.discard(pending.id,pending.mutationId);
  actor='other';await assert.rejects(repo.refresh(market.id),/CASH_SCOPE/);actor='owner';
  assert.equal((await db.markets.get(market.id))?.totalRevenue,4500);assert.equal(await db.events.count(),0);
  invalidate=true;await assert.rejects(repo.save({...merged,baseRevision:3,mutationId:generateUUID()}),/CASH_SCOPE/);
  repo=new MarketCashRepository('owner',cloud);await clearAllData();await assert.rejects(repo.refresh(market.id),/CASH_SCOPE/);
  assert.equal(await db.marketCashDrafts.count(),0);assert.equal(await db.marketCashRecords.count(),0);
  network();db.close();console.log('Cash domain, persistence, conflict, reset and financial-isolation checks passed');
}
void main().catch(error=>{console.error(error);process.exitCode=1;db.close();});
