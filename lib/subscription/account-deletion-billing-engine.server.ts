import { buildDetachedBillingEvidence,type BillingRetentionFingerprint,type DetachedBillingEvidence,type DetachableBillingTable } from './account-deletion-billing-retention';
import { requireIsolatedEndpoint } from './account-deletion-engine-adapters.server';
import { DeletionEngineFailure } from './account-deletion-engine.server';

export type BillingEngineRpc={rpc(name:string,args:Record<string,unknown>):PromiseLike<{data:unknown;error:{code?:string}|null}>};
export type PreparedBillingBatch=Readonly<{outcome:'prepared';actorId:string;subjectId:string;keyVersion:string;detachedAt:string;retainUntil:string;sourceHash:string;externalReferencesCleared?:boolean;sources:readonly {table:string;row:Record<string,unknown>}[]}>;
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

/** Inbox ownership is attested by the leased DB batch, never inferred from payload. */
export function minimizePreparedBillingBatch(batch:PreparedBillingBatch,fingerprint:BillingRetentionFingerprint):readonly DetachedBillingEvidence[]{
  if(!UUID.test(batch.actorId)||!UUID.test(batch.subjectId)||!/^[a-f0-9]{64}$/.test(batch.sourceHash)
    ||batch.keyVersion!==fingerprint.keyVersion||!Array.isArray(batch.sources)||batch.sources.length<1||batch.sources.length>1000)throw new DeletionEngineFailure('manual_review','billing_batch_invalid');
  return batch.sources.map(source=>{
    if(!record(source.row))throw new DeletionEngineFailure('manual_review','billing_source_invalid');
    const base={actorId:batch.actorId,billingSubjectId:batch.subjectId,detachedAt:batch.detachedAt,retainUntil:batch.retainUntil,keyVersion:batch.keyVersion,fingerprint};
    if(source.table!=='billing_event_inbox')return buildDetachedBillingEvidence({...base,table:source.table as DetachableBillingTable,row:source.row});
    const row=source.row;
    if(row.owner_id!==batch.actorId||typeof row.id!=='string'||!UUID.test(row.id)||!Object.hasOwn(row,'raw_payload_ciphertext_ref')
      ||(row.raw_payload_ciphertext_ref!==null&&batch.externalReferencesCleared!==true)
      ||!['newebpay_web','ecpay_web','apple_app_store','google_play'].includes(String(row.billing_origin))
      ||!['sandbox','production'].includes(String(row.provider_environment))||typeof row.provider_event_ref!=='string'
      ||!row.provider_event_ref||row.provider_event_ref.length>512||!['pending','verified','rejected'].includes(String(row.verification_status))
      ||typeof row.event_kind!=='string'||!/^[a-z0-9]+(_[a-z0-9]+)*$/.test(row.event_kind)||row.event_kind.length>80
      ||!['pending','processing','retryable_failed','processed','ignored','terminal_failed'].includes(String(row.processing_status)))
      throw new DeletionEngineFailure('manual_review','billing_inbox_unclassified');
    const date=(v:unknown)=>{if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))throw new DeletionEngineFailure('manual_review','billing_inbox_date_invalid');return new Date(v).toISOString();};
    return Object.freeze({billingSubjectId:batch.subjectId,sourceTable:'billing_event_inbox' as const,
      recordRef:fingerprint('record:billing_event_inbox',row.id),detachedAt:date(batch.detachedAt),retainUntil:date(batch.retainUntil),keyVersion:batch.keyVersion,
      facts:Object.freeze({billing_origin:row.billing_origin as string,provider_environment:row.provider_environment as string,
        verification_status:row.verification_status as string,event_kind:row.event_kind,processing_status:row.processing_status as string,
        provider_occurred_at:row.provider_occurred_at===null?null:date(row.provider_occurred_at),received_at:date(row.received_at)}),
      refs:Object.freeze({provider_event_ref:fingerprint(`provider:${row.billing_origin}:${row.provider_environment}:event`,row.provider_event_ref)})});
  });
}

/** Explicit internal worker port. No route, scheduling, env fallback or automatic retry. */
export function createDeletionBillingPreparationPort(input:{endpoint:string;client:BillingEngineRpc;fingerprint:BillingRetentionFingerprint}){
  requireIsolatedEndpoint(input.endpoint);
  const rpc=async(name:string,args:Record<string,unknown>)=>{
    const result=await input.client.rpc(name,args);
    if(result.error)throw new DeletionEngineFailure(result.error.code==='55000'?'manual_review':'failed_retryable','billing_preparation_failed');
    return result.data;
  };
  return {
    async prepare(args:{requestId:string;leaseToken:string;retainUntil:string;classificationHash:string}){
      if(!UUID.test(args.requestId)||!UUID.test(args.leaseToken)||!/^[a-f0-9]{64}$/.test(args.classificationHash))throw new DeletionEngineFailure('manual_review','billing_input_invalid');
      const response=await rpc('bff_prepare_billing_detachment',{req:args.requestId,token:args.leaseToken,until_at:args.retainUntil,key_version:input.fingerprint.keyVersion,classification_hash:args.classificationHash});
      if(!record(response))throw new DeletionEngineFailure('manual_review','billing_response_invalid');
      if(response.outcome==='not_required'||response.outcome==='already_detached')return {outcome:response.outcome,count:0};
      if(response.outcome!=='prepared')throw new DeletionEngineFailure('manual_review','billing_response_invalid');
      const batch=response as unknown as PreparedBillingBatch;
      const records=minimizePreparedBillingBatch(batch,input.fingerprint);
      const staged=await rpc('bff_stage_billing_detachment',{req:args.requestId,token:args.leaseToken,source_hash:batch.sourceHash,records});
      if(!record(staged)||staged.outcome!=='staged'||staged.count!==records.length)throw new DeletionEngineFailure('manual_review','billing_stage_response_invalid');
      return {outcome:'staged' as const,count:records.length,subjectId:batch.subjectId};
    },
  };
}
