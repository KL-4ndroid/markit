import 'server-only';
import {createHash} from 'node:crypto';
import {VerificationException,VerificationStatus} from '@apple/app-store-server-library';
import {createNativeReconciliationService} from './native-reconciliation.server';
import type {NativeStoreVerificationContext} from './native-store-verification-contract';
import type {createApplePostgresRepository} from './apple-repository.server';
import type {AppleIdentity,AppleSignedVerifier} from './apple-verification.server';
import {createAppleVerificationAdapter} from './apple-verification.server';

export type AppleHandlerDependencies = {
  enabled:boolean; identity:AppleIdentity; verifier:AppleSignedVerifier;
  store:ReturnType<typeof createApplePostgresRepository>;
  adapter(context:NativeStoreVerificationContext):ReturnType<typeof createAppleVerificationAdapter>;
  authenticate(request:Request):Promise<string|null>; now():number;
};
function reply(status:number,code:string){return Response.json({code},{status,headers:{'cache-control':'no-store'}});}
async function body(request:Request):Promise<unknown>{
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw new Error('body');
  const reader=request.body?.getReader();if(!reader)throw new Error('body');
  const chunks:Uint8Array[]=[];let length=0;
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>65536){await reader.cancel();throw new Error('body');}chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
/** Private handler factory for the reviewed integration. No public route or environment activation is installed by B04. */
export function createAppleHandlers(deps:AppleHandlerDependencies){
  async function bounded<T>(work:()=>Promise<T>):Promise<T>{
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{return await Promise.race([Promise.resolve().then(work),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('apple_verification_timeout')),10000);})]);}
    finally{if(timer)clearTimeout(timer);}
  }
  const reconcile=(context:NativeStoreVerificationContext,payload:unknown)=>createNativeReconciliationService({
    authenticateOwner:async()=>context,adapter:deps.adapter(context),repository:deps.store.repository,now:deps.now,
  })(payload);
  return {
    async purchase(request:Request):Promise<Response>{
      if(!deps.enabled)return reply(503,'apple_runtime_disabled');
      if(request.method!=='POST')return reply(405,'method_not_allowed');
      let owner:string|null;try{owner=await deps.authenticate(request);}catch{return reply(503,'authentication_unavailable');}
      if(!owner)return reply(401,'authentication_required');
      let payload:unknown;try{payload=await body(request);}catch{return reply(400,'invalid_request');}
      try{
        const context=await deps.store.context(owner);
        const result=await reconcile(context,payload);
        return reply(result.outcome==='unavailable'?503:result.outcome==='rejected'?403:200,result.code);
      }catch{return reply(503,'apple_reconciliation_unavailable');}
    },
    async notification(request:Request):Promise<Response>{
      if(!deps.enabled)return reply(503,'apple_runtime_disabled');
      if(request.method!=='POST')return reply(405,'method_not_allowed');
      let signed:string;
      try{const value=await body(request) as Record<string,unknown>;if(!value||Object.keys(value).length!==1||typeof value.signedPayload!=='string')throw new Error('body');signed=value.signedPayload;}catch{return reply(400,'invalid_request');}
      let notification:Awaited<ReturnType<AppleSignedVerifier['verifyAndDecodeNotification']>>;
      let tx:Awaited<ReturnType<AppleSignedVerifier['verifyAndDecodeTransaction']>>;
      try{
        notification=await bounded(()=>deps.verifier.verifyAndDecodeNotification(signed));
        if(!notification.notificationUUID || !/^[0-9a-f-]{36}$/i.test(notification.notificationUUID)
          || !Number.isSafeInteger(notification.signedDate) || notification.signedDate!>deps.now()
          || notification.data?.environment!==(deps.identity.environment==='sandbox'?'Sandbox':'Production')
          || notification.data.bundleId!==deps.identity.bundleId
          || deps.identity.environment==='production'&&notification.data.appAppleId!==deps.identity.appAppleId
          || !notification.data.signedTransactionInfo)throw new Error('identity');
        tx=await bounded(()=>deps.verifier.verifyAndDecodeTransaction(notification.data!.signedTransactionInfo!));
        if(!tx.appAccountToken || !/^[0-9a-f-]{36}$/i.test(tx.appAccountToken))throw new Error('binding');
      }catch(error){
        if(error instanceof VerificationException&&error.status===VerificationStatus.RETRYABLE_VERIFICATION_FAILURE
          || error instanceof Error&&error.message==='apple_verification_timeout')return reply(503,'apple_verification_unavailable');
        return reply(400,'apple_notification_invalid');
      }
      let lease:string|undefined;
      const event=notification.notificationUUID!;
      try{
        const claim=await deps.store.eventClaim({event,hash:createHash('sha256').update(signed).digest('hex'),occurredAt:new Date(notification.signedDate!).toISOString()});
        if(claim.duplicate)return reply(200,'notification_duplicate');
        if(claim.busy||!claim.lease)return reply(503,'notification_processing');
        lease=claim.lease;
        const owner=await deps.store.lookupBinding(tx.appAccountToken!);
        if(!owner){await deps.store.eventFinish({event,lease,result:'review'});return reply(202,'account_binding_review_required');}
        const context=await deps.store.context(owner);
        const result=await reconcile(context,{schemaVersion:1,store:'apple_app_store',productId:tx.productId,opaqueVerificationPayload:notification.data!.signedTransactionInfo});
        await deps.store.eventFinish({event,lease,result:result.outcome==='unavailable'?'retry':'done'});
        return reply(result.outcome==='unavailable'?503:200,result.code);
      }catch{
        if(lease){try{await deps.store.eventFinish({event,lease,result:'retry'});}catch{}}
        return reply(503,'notification_retry_required');
      }
    },
  };
}
