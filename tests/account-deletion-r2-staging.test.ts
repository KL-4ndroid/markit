import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {S3Client,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {createStagingDeletionProbe} from '../scripts/lib/account-deletion-r2-staging';
import {isExplicitDeletionObjectAbsence,createDeletionObjectPort} from '../lib/subscription/account-deletion-engine-adapters.server';

async function main(){
 const actor=randomUUID(),runId=randomUUID(),key=`sales-evidence/7d/${actor}/__deletion_acceptance/${runId}/image.webp`;
 const client=new S3Client({region:'auto',endpoint:'http://127.0.0.1:1',credentials:{accessKeyId:'synthetic',secretAccessKey:'synthetic'},maxAttempts:1});
 const input={client,bucket:'markit-sales-photo-staging',endpoint:'https://'+'a'.repeat(32)+'.r2.cloudflarestorage.com',actorId:actor,runId,keys:[key]};
 for(const change of [{bucket:'markit-media-production'},{endpoint:'http://example.com'},{endpoint:input.endpoint+'/bucket'},
  {keys:[key.replace(actor,randomUUID())]},{keys:[key.replace('__deletion_acceptance/','real-market/')]},{keys:[key,key]}])assert.throws(()=>createStagingDeletionProbe({...input,...change}));
 const port=createStagingDeletionProbe(input);
 await assert.rejects(()=>port.deleteObject(key.replace(actor,randomUUID())),/outside disposable manifest/);
 await assert.rejects(()=>port.isAbsent(key+'?version=2'),/outside disposable manifest/);
 let deletes=0;
 const mismatch={async send(command:unknown){if(command instanceof DeleteObjectCommand){deletes++;return {};}return {Metadata:{'deletion-test-run':'other-run'}};}};
 await assert.rejects(()=>createStagingDeletionProbe({...input,client:mismatch as unknown as Pick<S3Client,'send'>}).deleteObject(key),/ownership metadata mismatch/);
 assert.equal(deletes,0);
 assert.throws(()=>createDeletionObjectPort({client,bucket:input.bucket,endpoint:input.endpoint})); // runtime remains loopback-only
 assert.equal(isExplicitDeletionObjectAbsence({name:'NotFound',$metadata:{httpStatusCode:404}}),true);
 for(const error of [null,{name:'NotFound',$metadata:{httpStatusCode:403}},{name:'AccessDenied',$metadata:{httpStatusCode:404}},{name:'TimeoutError'},{name:'NoSuchKey',$metadata:{httpStatusCode:500}}])assert.equal(isExplicitDeletionObjectAbsence(error),false);
 client.destroy();console.log('PASS staging-only scope, exact disposable keys, strict absence and unchanged runtime isolation');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
