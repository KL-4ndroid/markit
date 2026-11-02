import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createBillingRetentionFingerprint} from '../lib/subscription/account-deletion-billing-retention.server';
import {createDeletionBillingPreparationPort,minimizePreparedBillingBatch,type PreparedBillingBatch} from '../lib/subscription/account-deletion-billing-engine.server';

async function main(){
 const actor=randomUUID(),subject=randomUUID(),source=randomUUID();const fingerprint=createBillingRetentionFingerprint(randomBytes(32),'test-v1');
 const batch:PreparedBillingBatch={outcome:'prepared',actorId:actor,subjectId:subject,keyVersion:'test-v1',detachedAt:'2026-11-02T00:00:00.000Z',retainUntil:'2031-11-02T00:00:00.000Z',sourceHash:'a'.repeat(64),sources:[{table:'billing_event_inbox',row:{id:source,owner_id:actor,raw_payload_ciphertext_ref:null,billing_origin:'apple_app_store',provider_environment:'sandbox',provider_event_ref:'private@example.test',verification_status:'verified',event_kind:'renewal',processing_status:'processed',provider_occurred_at:null,received_at:'2026-11-01T00:00:00Z'}}]};
 const evidence=minimizePreparedBillingBatch(batch,fingerprint);assert.equal(evidence.length,1);assert.equal(evidence[0].sourceTable,'billing_event_inbox');
 for(const raw of [actor,source,'private@example.test'])assert.ok(!JSON.stringify(evidence).includes(raw));
 assert.throws(()=>minimizePreparedBillingBatch({...batch,actorId:randomUUID()},fingerprint));
 assert.throws(()=>minimizePreparedBillingBatch({...batch,keyVersion:'wrong-key'},fingerprint));
 assert.throws(()=>minimizePreparedBillingBatch({...batch,sources:[]},fingerprint));
 const rawRef={...batch,sources:[{...batch.sources[0],row:{...batch.sources[0].row,raw_payload_ciphertext_ref:'private-blob-ref'}}]};
 assert.throws(()=>minimizePreparedBillingBatch(rawRef,fingerprint));
 assert.ok(!JSON.stringify(minimizePreparedBillingBatch({...rawRef,externalReferencesCleared:true},fingerprint)).includes('private-blob-ref'));
 let calls=0;
 const port=createDeletionBillingPreparationPort({endpoint:'http://127.0.0.1:1',fingerprint,client:{async rpc(name){calls++;return name==='bff_prepare_billing_detachment'?{data:batch,error:null}:{data:null,error:{code:'55000'}};}}});
 await assert.rejects(port.prepare({requestId:randomUUID(),leaseToken:randomUUID(),retainUntil:batch.retainUntil,classificationHash:'b'.repeat(64)}));assert.equal(calls,2);
 assert.throws(()=>createDeletionBillingPreparationPort({endpoint:'https://hosted.supabase.co',fingerprint,client:{async rpc(){throw new Error('must not connect');}}}));
 const noData=createDeletionBillingPreparationPort({endpoint:'http://127.0.0.1:1',fingerprint,client:{async rpc(){return {data:{outcome:'not_required'},error:null};}}});
 assert.equal((await noData.prepare({requestId:randomUUID(),leaseToken:randomUUID(),retainUntil:batch.retainUntil,classificationHash:'b'.repeat(64)})).outcome,'not_required');
 const draft=readFileSync('docs/subscription/drafts/ACCOUNT_DELETION_BILLING_RETENTION_2026_11_02.sql','utf8');assert.match(draft,/ROLLBACK;\s*$/);assert.doesNotMatch(draft,/DISABLE TRIGGER/i);
 console.log('PASS billing worker privacy, classified inbox requirement, key/scope rejection, no automatic retry and loopback boundary');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
