import { db } from '@/lib/db';
import { getNetworkPort } from '@/lib/platform/network-capability';
import { cashScopeEpoch } from './market-cash-scope';
import { cashRecordId,isCashOwner,marketCashEnabled,validateCashData,validateCashDate,type MarketCashRecord,type MarketCashDraft } from './market-cash';
export interface CashCloudPort {
  assertIdentity(ownerId:string):Promise<void>;
  list(ownerId:string,marketId:string):Promise<MarketCashRecord[]>;
  save(draft:MarketCashDraft):Promise<MarketCashRecord>;
}
export class MarketCashRepository {
  private epoch=cashScopeEpoch();
  constructor(readonly ownerId:string,private cloud:CashCloudPort){}
  private assertScope(){if(!this.ownerId || this.epoch!==cashScopeEpoch())throw new Error('CASH_SCOPE');}
  async stage(draft:MarketCashDraft,previousMutationId?:string) {
    this.assertScope();
    if(!marketCashEnabled() || draft.ownerId!==this.ownerId || draft.id!==cashRecordId(draft.marketId,draft.businessDate))throw new Error('CASH_SCOPE');
    await db.transaction('rw',[db.markets,db.marketCashRecords,db.marketCashDrafts],async()=>{
      this.assertScope();
      if(!isCashOwner(await db.markets.get(draft.marketId),this.ownerId))throw new Error('CASH_SCOPE');
      const existing=await db.marketCashDrafts.get(draft.id),row=await db.marketCashRecords.get(draft.id);
      if((existing && existing.ownerId!==this.ownerId) || (row && row.ownerId!==this.ownerId))throw new Error('CASH_SCOPE');
      if(existing && existing.mutationId!==draft.mutationId && existing.mutationId!==previousMutationId)throw new Error('CASH_DRAFT_CONFLICT');
      await db.marketCashDrafts.put(draft);
    }).catch(error=>{if(String(error?.message).startsWith('CASH_'))throw error;throw new Error('CASH_STORAGE');});
  }
  async discard(id:string,mutationId:string){
    this.assertScope();
    await db.transaction('rw',db.marketCashDrafts,async()=>{
      this.assertScope(); const draft=await db.marketCashDrafts.get(id);
      if(draft?.ownerId===this.ownerId){if(draft.mutationId!==mutationId)throw new Error('CASH_DRAFT_CONFLICT');await db.marketCashDrafts.delete(id);}
    });
  }
  async refresh(marketId:string){
    this.assertScope(); if(!getNetworkPort().getCurrentStatus().connected)throw new Error('CASH_OFFLINE');
    await this.cloud.assertIdentity(this.ownerId);
    const rows=await this.cloud.list(this.ownerId,marketId);
    await this.cloud.assertIdentity(this.ownerId);this.assertScope();
    await db.transaction('rw',[db.marketCashRecords,db.markets],async()=>{
      this.assertScope();if(!isCashOwner(await db.markets.get(marketId),this.ownerId))throw new Error('CASH_SCOPE');
      for(const row of rows){
        if(row.ownerId!==this.ownerId || row.marketId!==marketId || row.id!==cashRecordId(marketId,row.businessDate))throw new Error('CASH_SCOPE');
        const previous=await db.marketCashRecords.get(row.id);
        if(!previous || previous.revision<=row.revision)await db.marketCashRecords.put(row);
      }
    });
  }
  async save(draft:MarketCashDraft){
    this.assertScope();const market=await db.markets.get(draft.marketId);
    if(draft.ownerId!==this.ownerId || !isCashOwner(market,this.ownerId))throw new Error('CASH_SCOPE');
    const previous=await db.marketCashRecords.get(draft.id);
    validateCashDate(draft.businessDate,market,previous?.businessDate);
    const normalized={...draft,data:validateCashData(draft.data)};
    if(draft.baseRevision===0 && normalized.data.opening.mode==='none' && normalized.data.closing.mode==='none' && !normalized.data.note && normalized.data.otherCash?.mode!=='net')throw new Error('請選擇記錄方式並輸入金額；不記錄可直接離開。');
    await this.stage(normalized);
    if(!getNetworkPort().getCurrentStatus().connected)throw new Error('CASH_OFFLINE');
    await this.cloud.assertIdentity(this.ownerId);
    const row=await this.cloud.save(normalized);
    await this.cloud.assertIdentity(this.ownerId);this.assertScope();
    if(row.ownerId!==this.ownerId || row.id!==draft.id || row.marketId!==draft.marketId || row.businessDate!==draft.businessDate)throw new Error('CASH_SCOPE');
    await db.transaction('rw',[db.marketCashRecords,db.marketCashDrafts],async()=>{
      this.assertScope();const previousRow=await db.marketCashRecords.get(row.id);
      if(!previousRow || previousRow.revision<=row.revision)await db.marketCashRecords.put(row);
      if((await db.marketCashDrafts.get(draft.id))?.mutationId===draft.mutationId)await db.marketCashDrafts.delete(draft.id);
    });return row;
  }
}
