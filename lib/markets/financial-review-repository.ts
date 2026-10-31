import {db,type MarketPulseDB} from '@/lib/db';
import {getNetworkPort} from '@/lib/platform/network-capability';
import {financialReviewEpoch} from './financial-review-scope';
import {financialCacheId,financialReviewsEnabled,type FinancialReviewSnapshot,type FinancialReviewWrite,type FinancialReviewMode} from './financial-reviews';
import {financialDraftId,prepareFinancialEditor,type FinancialReviewDraft} from './financial-review-drafts';
import {getLocalDateString} from '@/lib/time-utils';
export interface FinancialReviewCloudPort {assertIdentity(owner:string):Promise<void>;read(ids:string[]):Promise<FinancialReviewSnapshot[]>;save(write:FinancialReviewWrite):Promise<void>}
export class FinancialReviewRepository {
 constructor(readonly ownerId:string,private cloud:FinancialReviewCloudPort,private readonly localDb:MarketPulseDB=db,private readonly epoch=financialReviewEpoch()){}
 private scope(){if(!this.ownerId || this.epoch!==financialReviewEpoch())throw new Error('FINANCE_SCOPE');}
 // Draft retention does not grant paid access. The caller hides this interface
 // when entitlement is unavailable; local operations still require this owner.
 private async draftIdentity(marketId:string){
  this.scope();if(!financialReviewsEnabled())throw new Error('FINANCE_DISABLED');
  await this.cloud.assertIdentity(this.ownerId);this.scope();
  const market=await this.localDb.markets.get(marketId);
  if(!market || market.owner_id!==this.ownerId || market.access_type==='staff' || market.isDeleted)throw new Error('FINANCE_SCOPE');
 }
 async listDrafts(marketId:string){
  await this.draftIdentity(marketId);
  const rows=await this.localDb.financialReviewDrafts.where('[ownerId+marketId]').equals([this.ownerId,marketId]).toArray();
  this.scope();return rows;
 }
 async stageDraft(draft:FinancialReviewDraft){
  await this.draftIdentity(draft.marketId);
  if(draft.ownerId!==this.ownerId || draft.id!==financialDraftId(this.ownerId,draft.marketId,draft.key)
    || !draft.generation || !Number.isSafeInteger(draft.localRevision) || draft.localRevision<0
    || draft.editor.base.marketId!==draft.marketId || draft.editor.base.key!==draft.key || draft.editor.amount.length>64)throw new Error('FINANCE_INPUT');
  return this.localDb.transaction('rw',this.localDb.financialReviewDrafts,async()=>{
   this.scope();const previous=await this.localDb.financialReviewDrafts.get(draft.id);
   if((previous?.localRevision ?? 0)!==draft.localRevision || (previous && previous.generation!==draft.generation))throw new Error('FINANCE_DRAFT_CONFLICT');
   const next={...draft,localRevision:draft.localRevision+1,updatedAt:Date.now()};
   await this.localDb.financialReviewDrafts.put(next);return next;
  });
 }
 async discardDraft(draft:FinancialReviewDraft){
  await this.draftIdentity(draft.marketId);
  if(draft.ownerId!==this.ownerId || draft.id!==financialDraftId(this.ownerId,draft.marketId,draft.key))throw new Error('FINANCE_SCOPE');
  await this.localDb.transaction('rw',this.localDb.financialReviewDrafts,async()=>{
   this.scope();const previous=await this.localDb.financialReviewDrafts.get(draft.id);
   if(previous && (previous.ownerId!==this.ownerId || previous.localRevision!==draft.localRevision || previous.generation!==draft.generation))throw new Error('FINANCE_DRAFT_CONFLICT');
   await this.localDb.financialReviewDrafts.delete(draft.id);
  });
 }
 async prepareEditor(marketId:string,key:string,mode:FinancialReviewMode){
  const snapshot=(await this.refresh([marketId]))[0];
  const market=await this.localDb.markets.get(marketId);
  if(!market || market.owner_id!==this.ownerId)throw new Error('FINANCE_SCOPE');
  const rows=await this.localDb.dailyStats.where('[date+marketId]').equals([key,marketId]).toArray();
  if(rows.length>1)throw new Error('FINANCE_SOURCE');
  this.scope();return {editor:prepareFinancialEditor(market,rows[0],snapshot,key,mode,getLocalDateString()),snapshot};
 }
 private async authorize(ids:string[]){
  this.scope();if(!financialReviewsEnabled())throw new Error('FINANCE_DISABLED');
  if(!getNetworkPort().getCurrentStatus().connected)throw new Error('FINANCE_OFFLINE');
  for(const id of ids){const market=await this.localDb.markets.get(id);if(!market || market.owner_id!==this.ownerId || market.access_type==='staff' || market.isDeleted)throw new Error('FINANCE_SCOPE');}
  await this.cloud.assertIdentity(this.ownerId);this.scope();
 }
 async refresh(ids:string[]){
  await this.authorize(ids);const snapshots=await this.cloud.read(ids);await this.authorize(ids);
  if(snapshots.length!==new Set(ids).size || new Set(snapshots.map(s=>s.marketId)).size!==snapshots.length || snapshots.some(s=>s.ownerId!==this.ownerId || !ids.includes(s.marketId)))throw new Error('FINANCE_SCOPE');
  await this.localDb.transaction('rw',this.localDb.financialReviewCache,async()=>{this.scope();await this.localDb.financialReviewCache.bulkPut(snapshots.map(snapshot=>({id:financialCacheId(this.ownerId,snapshot.marketId),ownerId:this.ownerId,marketId:snapshot.marketId,snapshot})));});
  return snapshots;
 }
 async save(write:FinancialReviewWrite){
  await this.authorize([write.marketId]);await this.cloud.save(write);await this.authorize([write.marketId]);
  const snapshot=(await this.refresh([write.marketId]))[0];const row=snapshot.reviews.find(r=>r.review_key===write.key);
  if(!row || row.mutation_id!==write.mutationId)throw new Error('FINANCE_CONFLICT');
  if(row.mode!=='cleared' && !row.valid)throw new Error('FINANCE_SOURCE');
 }
}
