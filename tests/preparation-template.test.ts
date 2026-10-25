import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import { db, generateUUID, clearAllData } from '../lib/db';
import { checklistTextKey, templateItemsFromLines, validatePreparationTemplate } from '../lib/markets/preparation-template';
import { PreparationTemplateRepository, type PreparationTemplateCloudPort } from '../lib/markets/preparation-template-repository';
import { invalidatePreparationTemplateScope } from '../lib/markets/preparation-template-scope';
import { installNetworkPort } from '../lib/platform/network-capability';
import { getActiveChecklistItemsForMarket } from '../lib/markets/checklist';
import { recordEvent } from '../lib/db/events';

async function main() {
  process.env.NEXT_PUBLIC_PREPARATION_TEMPLATES_ENABLED='true';
  const restore=installNetworkPort({getCurrentStatus:()=>({connected:true,connectionType:'unknown'}),subscribe:()=>()=>{}});
  await db.open();await clearAllData();
  const item={id:generateUUID(),text:'桌布'};
  assert.deepEqual(templateItemsFromLines('桌布\n\n 雨具 ',[item],()=> 'new'),[item,{id:'new',text:'雨具'}]);
  assert.equal(checklistTextKey('  a\t b\n '),'a b');
  assert.throws(()=>validatePreparationTemplate('x',[item,{id:generateUUID(),text:' 桌布 '}]),/重複/);
  assert.throws(()=>validatePreparationTemplate('x',[{...item,text:'😀'.repeat(201)}]),/200/);
  assert.doesNotThrow(()=>validatePreparationTemplate('x',[{...item,text:'😀'.repeat(200)}]));
  assert.throws(()=>validatePreparationTemplate(' ',[item]),/名稱/);
  const now=Date.now();
  const created={id:generateUUID(),market_id:'market',actor_id:'actor',type:'checklist_item_created' as const,payload:{market_id:'market',itemId:item.id,text:item.text,completed:false},timestamp:now};
  let calls=0;let identity='actor';let invalidation=false;
  const cloud:PreparationTemplateCloudPort={
    async assertIdentity(id){if(id!==identity)throw new Error('TEMPLATE_SCOPE');},
    async list(){return [];},async save(){throw new Error('not used');},
    async apply(){calls++;if(invalidation)invalidatePreparationTemplateScope();return {appliedCount:1,skippedCount:0,events:[created]};},
  };
  let repo=new PreparationTemplateRepository('actor','owner',cloud);
  const application={id:generateUUID(),marketId:'market',templateId:generateUUID(),revision:1,itemIds:[item.id]};
  await repo.apply(application);assert.equal((await getActiveChecklistItemsForMarket('market')).length,1);
  await db.events.add({id:generateUUID(),type:'checklist_item_updated',actor_id:'actor',market_id:'market',payload:{market_id:'market',itemId:item.id,completed:true},timestamp:now+1,sync_status:'pending'});
  await assert.rejects(repo.apply(application),/TEMPLATE_PENDING/);assert.equal(calls,1);
  await db.events.where('sync_status').equals('pending').modify({sync_status:'synced'});
  await repo.apply(application);assert.equal((await getActiveChecklistItemsForMarket('market'))[0].completed,true,'retry cannot reset later toggles');
  const offline=installNetworkPort({getCurrentStatus:()=>({connected:false,connectionType:'none'}),subscribe:()=>()=>{}});
  await assert.rejects(repo.apply(application),/TEMPLATE_OFFLINE/);assert.equal(calls,2);offline();
  identity='other';await assert.rejects(repo.apply(application),/TEMPLATE_SCOPE/);assert.equal(calls,2);identity='actor';
  await db.events.clear();invalidation=true;
  await assert.rejects(repo.apply(application),/TEMPLATE_SCOPE/);assert.equal(await db.events.count(),0,'late response cannot repopulate a reset account cache');
  const future={...created,timestamp:Date.now()+60_000,sync_status:'synced' as const};
  await db.events.put(future);
  const toggleId=await recordEvent('checklist_item_updated',{market_id:'market',itemId:item.id,completed:true});
  assert.ok((await db.events.get(toggleId))!.timestamp>future.timestamp);
  assert.equal((await getActiveChecklistItemsForMarket('market'))[0].completed,true,'a slower device clock cannot replay a toggle before the server-created item');
  await recordEvent('checklist_item_deleted',{market_id:'market',itemId:item.id});
  assert.equal((await getActiveChecklistItemsForMarket('market')).length,0,'delete also follows the item despite clock skew');
  repo=new PreparationTemplateRepository('actor','owner',cloud);invalidation=false;
  process.env.NEXT_PUBLIC_PREPARATION_TEMPLATES_ENABLED='false';
  await assert.rejects(repo.apply(application),/TEMPLATE_SCOPE/);
  restore();await clearAllData();db.close();console.log('Preparation template domain/repository checks passed');
}
void main().catch(error=>{console.error(error);process.exitCode=1;db.close();});
