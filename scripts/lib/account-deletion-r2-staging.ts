// Test tooling only. Never imported by a product route or used with production buckets.
import {DeleteObjectCommand,HeadObjectCommand,type S3Client} from '@aws-sdk/client-s3';
import {isExplicitDeletionObjectAbsence} from '../../lib/subscription/account-deletion-engine-adapters.server';
import {isOwnedDeletionObjectKey,type DeletionObjectPort} from '../../lib/subscription/account-deletion-engine.server';

export const DELETION_R2_TEST_BUCKET='markit-sales-photo-staging';
type Scope={client:Pick<S3Client,'send'>;bucket:string;endpoint:string;actorId:string;runId:string;keys:readonly string[]};
export function createStagingDeletionProbe(input:Scope):DeletionObjectPort & {assertKey:(key:string)=>void}{
 if(input.bucket!==DELETION_R2_TEST_BUCKET)throw Error('Staging bucket required');
 const u=new URL(input.endpoint);
 if(u.protocol!=='https:'||!/^([a-f0-9]{32})(\.eu|\.fedramp)?\.r2\.cloudflarestorage\.com$/.test(u.hostname)
  ||u.pathname!=='/'||u.username||u.password||u.port||u.search||u.hash)throw Error('Explicit R2 endpoint required');
 if(!/^[a-f0-9-]{36}$/i.test(input.runId)||input.keys.length<1||input.keys.length>8||new Set(input.keys).size!==input.keys.length)throw Error('Bounded test manifest required');
 const keys=new Set(input.keys);
 const inRun=(key:string)=>isOwnedDeletionObjectKey(key,input.actorId)&&['sales-evidence','sales-evidence-thumbs']
  .some(root=>key.startsWith(`${root}/7d/${input.actorId}/__deletion_acceptance/${input.runId}/`));
 if(input.keys.some(key=>!inRun(key)))throw Error('Test namespace required');
 function assertKey(key:string){if(!keys.has(key)||!inRun(key))throw Error('Key outside disposable manifest');}
 return {
  assertKey,
  async deleteObject(key){
   assertKey(key);
   try{
    const head=await input.client.send(new HeadObjectCommand({Bucket:input.bucket,Key:key}),{abortSignal:AbortSignal.timeout(15000)});
    if(head.Metadata?.['deletion-test-run']!==input.runId)throw Error('Test ownership metadata mismatch');
   }catch(e){if(!isExplicitDeletionObjectAbsence(e))throw e;}
   await input.client.send(new DeleteObjectCommand({Bucket:input.bucket,Key:key}),{abortSignal:AbortSignal.timeout(15000)});
  },
  async isAbsent(key){
   assertKey(key);
   try{await input.client.send(new HeadObjectCommand({Bucket:input.bucket,Key:key}),{abortSignal:AbortSignal.timeout(15000)});return false;}
   catch(e){if(isExplicitDeletionObjectAbsence(e))return true;throw e;}
  },
 };
}
