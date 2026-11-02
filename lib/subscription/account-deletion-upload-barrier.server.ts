// Server-side upload coordination; local-only while production deletion is disabled.
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {requireIsolatedEndpoint} from './account-deletion-engine-adapters.server';
import {isOwnedDeletionObjectKey} from './account-deletion-engine.server';
import {createTerminalPutWriter,terminalPutTargetHash,type TerminalPutTarget} from './account-deletion-terminal-put.server';
import {readRecordedPhotoUpload,type PhotoReadbackInput} from './photo-upload-readback.server';

type Rpc={rpc(name:string,args:Record<string,unknown>):PromiseLike<{data?:unknown;error:unknown|null}>};
export type DeletionUploadBinding={kind:'product'|'sale';entityId:string;keys:string[];writeKeys:string[];expected:Record<string,string|number>};
export type DeletionUploadSession={
 bind(binding:DeletionUploadBinding):Promise<void>;
 put<T>(key:string,operation:()=>Promise<T>):Promise<T>;
 writeObject?(key:string,body:Blob|ArrayBuffer|Uint8Array,contentType:string):Promise<boolean>;
 canCompensate?(key:string):boolean;
 readback?(photo:PhotoReadbackInput):Promise<'absent'|'pending'|'conflict'|'confirmed'>;
 assertActive():Promise<void>;
 uncertain():void;
 finish():Promise<void>;
};
type ReceiptWriter=ReturnType<typeof createTerminalPutWriter>;
export async function beginDeletionUploadSession(client:Rpc,actorId:string,ownerId:string,options?:{
 createWriter(identity:{id:string;token:string},binding:DeletionUploadBinding):ReceiptWriter;
 readback?(photo:PhotoReadbackInput):Promise<'absent'|'pending'|'conflict'|'confirmed'>;
}):Promise<DeletionUploadSession>{
 const id=randomUUID(),token=randomUUID();let doubtful=false,closed=false,finished=false,bound=false,inflight=0;let finishState:string|undefined;
 async function rpc(name:string,args:Record<string,unknown>={}){const {error}=await client.rpc(name,{p_id:id,p_token:token,...args});if(error)throw Error('deletion_upload_barrier_unavailable');}
 let writer:ReceiptWriter|undefined;
 await rpc('bff_begin_deletion_upload',{p_actor:actorId,p_owner:ownerId});
 const session:DeletionUploadSession={
  async bind(b){
   if(closed||bound||b.keys.length>8||b.writeKeys.length!==2||b.keys.some(k=>!isOwnedDeletionObjectKey(k,ownerId)))throw Error('deletion_upload_scope');
   await rpc('bff_bind_deletion_upload',{p_kind:b.kind,p_entity:b.entityId,p_keys:b.keys,p_write_keys:b.writeKeys,p_expected:b.expected});
   writer=options?.createWriter({id,token},b);bound=true;
  },
  async put(key,operation){
   if(closed||!bound||inflight)throw Error('deletion_upload_not_writable');
   inflight++;
   try{
    await rpc('bff_authorize_deletion_upload',{p_key:key});
    try{const result=await operation();if(result===false||(result&&typeof result==='object'&&'ok' in result&&result.ok===false))doubtful=true;return result;}
    catch(e){doubtful=true;throw e;}
   }finally{inflight--;}
  },
  async assertActive(){if(closed||inflight)throw Error('deletion_upload_not_writable');await rpc('bff_authorize_deletion_upload',{p_key:null});},
  uncertain(){doubtful=true;},
  async finish(){if(finished)return;if(inflight)throw Error('deletion_upload_still_inflight');closed=true;finishState??=doubtful?'uncertain':'settled';try{await rpc('bff_finish_deletion_upload',{p_state:finishState});finished=true;}finally{writer?.destroy();}},
 };
 if(options){
  session.readback=options.readback;
  session.writeObject=async(key,body,contentType)=>session.put(key,async()=>{
   if(!writer)throw Error('deletion_upload_writer_unavailable');
   const bytes=body instanceof Uint8Array?body:body instanceof ArrayBuffer?new Uint8Array(body):new Uint8Array(await body.arrayBuffer());
   return writer.write(key,bytes,id,contentType);
  });
  session.canCompensate=key=>writer?.canCompensate(key)??false;
 }
 return session;
}
export async function beginConfiguredDeletionUpload(actorId:string,ownerId:string,providedClient?:Rpc,env:Record<string,string|undefined>=process.env):Promise<DeletionUploadSession|null>{
 const receipts=env.ACCOUNT_DELETION_UPLOAD_RECEIPTS_ENABLED==='1';
 if(env.ACCOUNT_DELETION_UPLOAD_BARRIER_ENABLED!=='1'){if(receipts)throw Error('deletion_upload_receipts_require_barrier');return null;}
 if(env.VERCEL||env.VERCEL_ENV)throw Error('deletion_upload_barrier_local_only');
 const url=env.NEXT_PUBLIC_SUPABASE_URL??'';requireIsolatedEndpoint(url);
 const key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
 if(!providedClient&&!key)throw Error('deletion_upload_barrier_unavailable');
 const client=providedClient??createClient(url,key!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 if(!receipts)return beginDeletionUploadSession(client,actorId,ownerId);
 const endpoint=env.R2_ENDPOINT??'';requireIsolatedEndpoint(endpoint);
 const target:TerminalPutTarget={mode:'isolated',endpoint,bucket:env.R2_BUCKET_NAME??''};terminalPutTargetHash(target);
 const credentials={accessKeyId:env.R2_ACCESS_KEY_ID?.trim()??'',secretAccessKey:env.R2_SECRET_ACCESS_KEY?.trim()??''};
 if(!credentials.accessKeyId||!credentials.secretAccessKey)throw Error('deletion_upload_receipts_unavailable');
 return beginDeletionUploadSession(client,actorId,ownerId,{readback:photo=>readRecordedPhotoUpload({actor:actorId,owner:ownerId,client,endpoint,bucket:target.bucket,credentials,photo}),createWriter:({id,token},b)=>createTerminalPutWriter({
  databaseEndpoint:url,client,attemptId:id,token,target,credentials,localPhotoScope:{ownerId,keys:[...b.writeKeys]},
  assertKey(k){if(!b.writeKeys.includes(k)||!isOwnedDeletionObjectKey(k,ownerId))throw Error('deletion_upload_scope');},
 })});
}
