import {db} from '@/lib/db';
import {getNetworkPort} from '@/lib/platform/network-capability';
import {financialReviewEpoch} from './financial-review-scope';
import {financialCacheId,financialReviewsEnabled,type FinancialReviewSnapshot,type FinancialReviewWrite} from './financial-reviews';
export interface FinancialReviewCloudPort {assertIdentity(owner:string):Promise<void>;read(ids:string[]):Promise<FinancialReviewSnapshot[]>;save(write:FinancialReviewWrite):Promise<void>}
export class FinancialReviewRepository {
 private epoch=financialReviewEpoch();
 constructor(readonly ownerId:string,private cloud:FinancialReviewCloudPort){}
 private scope(){if(!this.ownerId || this.epoch!==financialReviewEpoch())throw new Error('FINANCE_SCOPE');}
 private async authorize(ids:string[]){
  this.scope();if(!financialReviewsEnabled())throw new Error('FINANCE_DISABLED');
  if(!getNetworkPort().getCurrentStatus().connected)throw new Error('FINANCE_OFFLINE');
  for(const id of ids){const market=await db.markets.get(id);if(!market || market.owner_id!==this.ownerId || market.access_type==='staff' || market.isDeleted)throw new Error('FINANCE_SCOPE');}
  await this.cloud.assertIdentity(this.ownerId);this.scope();
 }
 async refresh(ids:string[]){
  await this.authorize(ids);const snapshots=await this.cloud.read(ids);await this.authorize(ids);
  if(snapshots.length!==new Set(ids).size || new Set(snapshots.map(s=>s.marketId)).size!==snapshots.length || snapshots.some(s=>s.ownerId!==this.ownerId || !ids.includes(s.marketId)))throw new Error('FINANCE_SCOPE');
  await db.transaction('rw',db.financialReviewCache,async()=>{this.scope();await db.financialReviewCache.bulkPut(snapshots.map(snapshot=>({id:financialCacheId(this.ownerId,snapshot.marketId),ownerId:this.ownerId,marketId:snapshot.marketId,snapshot})));});
  return snapshots;
 }
 async save(write:FinancialReviewWrite){
  await this.authorize([write.marketId]);await this.cloud.save(write);await this.authorize([write.marketId]);
  const snapshot=(await this.refresh([write.marketId]))[0];const row=snapshot.reviews.find(r=>r.review_key===write.key);
  if(!row || row.mutation_id!==write.mutationId)throw new Error('FINANCE_CONFLICT');
  if(row.mode!=='cleared' && !row.valid)throw new Error('FINANCE_SOURCE');
 }
}
