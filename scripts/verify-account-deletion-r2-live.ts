// Real S3 effects ONLY on three self-created staging markers. No DB/Auth/API writes.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {parse} from 'dotenv';
import {S3Client,PutObjectCommand,HeadObjectCommand} from '@aws-sdk/client-s3';
import {createStagingDeletionProbe,DELETION_R2_TEST_BUCKET} from './lib/account-deletion-r2-staging';
import {isExplicitDeletionObjectAbsence} from '../lib/subscription/account-deletion-engine-adapters.server';
import {createAccountDeletionStepExecutor,deletionEvidence,DeletionEngineFailure,type DeletionDatabasePort,type DeletionLease} from '../lib/subscription/account-deletion-engine.server';

async function main(){
 assert.deepEqual(process.argv.slice(2),['--staging-disposable']);assert.ok(!process.env.VERCEL&&!process.env.VERCEL_ENV);
 const env=parse(readFileSync('.env.local'));
 for(const name of ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME'])assert.ok(env[name]?.trim(),'Staging configuration unavailable');
 const Bucket=env.R2_BUCKET_NAME.trim();assert.equal(Bucket,DELETION_R2_TEST_BUCKET);
 const endpoint=env.R2_ENDPOINT?.trim()||`https://${env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`;
 assert.equal(new URL(endpoint).hostname,`${env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`);
 const creds={accessKeyId:env.R2_ACCESS_KEY_ID.trim(),secretAccessKey:env.R2_SECRET_ACCESS_KEY.trim()};
 const client=new S3Client({region:'auto',endpoint,credentials:creds,maxAttempts:1});
 const badClient=new S3Client({region:'auto',endpoint,credentials:{...creds,secretAccessKey:creds.secretAccessKey+'-intentional-test-invalid-signature'},maxAttempts:1});
 const runId=randomUUID(),actor=randomUUID(),canaryActor=randomUUID();
 const prefix=(root:string,who:string)=>`${root}/7d/${who}/__deletion_acceptance/${runId}/`;
 const a=prefix('sales-evidence',actor)+'image.webp',b=prefix('sales-evidence-thumbs',actor)+'thumbnail.webp',c=prefix('sales-evidence',canaryActor)+'canary.webp';
 const keys=[a,b,c];const probe=createStagingDeletionProbe({client,bucket:Bucket,endpoint,actorId:actor,runId,keys:[a,b]});
 const deniedProbe=createStagingDeletionProbe({client:badClient,bucket:Bucket,endpoint,actorId:actor,runId,keys:[a,b]});
 const canary=createStagingDeletionProbe({client,bucket:Bucket,endpoint,actorId:canaryActor,runId,keys:[c]});
 const forKey=(key:string)=>key===c?canary:probe;
 const checks:string[]=[],attempted=new Set<string>(),confirmedAbsent=new Set<string>();
 const pass=(s:string)=>{checks.push(s);console.log('PASS '+s);};
 const manifestPath=`.codex-artifacts/r2-deletion-${runId}.manifest.json`;
 const persist=()=>writeFileSync(manifestPath,JSON.stringify({runId,bucket:Bucket,endpoint,keys,attempted:[...attempted],confirmedAbsent:[...confirmedAbsent],scope:'three self-created marker objects only; no credentials'},null,2));
 mkdirSync('.codex-artifacts',{recursive:true});persist();
 let testFailure=false,cleanupFailure=false;
 async function put(key:string){
  forKey(key).assertKey(key);assert.equal(await forKey(key).isAbsent(key),true,'Never overwrite an existing object');
  attempted.add(key);confirmedAbsent.delete(key);persist();
  await client.send(new PutObjectCommand({Bucket,Key:key,Body:Buffer.from(`disposable deletion probe ${runId}`),ContentType:'application/octet-stream',IfNoneMatch:'*',Metadata:{'deletion-test-run':runId}}),{abortSignal:AbortSignal.timeout(15000)});
 }
 try{
  for(const key of keys)await put(key);
  assert.equal(await probe.isAbsent(a),false);assert.equal(await canary.isAbsent(c),false);
  pass('three create-only staging markers exist; real HEAD distinguishes present from absence');
  await assert.rejects(()=>client.send(new PutObjectCommand({Bucket,Key:a,Body:Buffer.from('must not overwrite'),IfNoneMatch:'*'}),{abortSignal:AbortSignal.timeout(15000)}),e=>(e as {$metadata?:{httpStatusCode:number}}).$metadata?.httpStatusCode===412);
  assert.equal((await client.send(new HeadObjectCommand({Bucket,Key:a}))).Metadata?.['deletion-test-run'],runId);
  pass('real conditional PUT rejects overwrite with 412 and preserves ownership metadata');
  await assert.rejects(()=>deniedProbe.isAbsent(a),e=>{assert.equal((e as {$metadata?:{httpStatusCode:number}}).$metadata?.httpStatusCode,403);assert.equal(isExplicitDeletionObjectAbsence(e),false);return true;});
  pass('real invalid-signature 403 is a read failure, never absence');
  const lease:DeletionLease={requestId:randomUUID(),leaseToken:randomUUID(),accountKind:'owner',stepCode:'r2_objects_deleted'};
  let fence=true,loseAck=true,completed=0;const deleted=new Set<string>(),absent=new Set<string>();const until=Date.now()+300000;
  const db:DeletionDatabasePort={
   async context(l){if(!fence||Date.now()>until||l.leaseToken!==lease.leaseToken)throw new DeletionEngineFailure('manual_review','test_lease_invalid');const done=l.stepCode==='r2_objects_deleted'?deleted:absent;return {actorId:actor,totalObjects:2,objects:[a,b].filter(k=>!done.has(k)).map(key=>({key,deleted:deleted.has(key),absent:absent.has(key)}))};},
   async execute(){throw Error('No SQL data step allowed');},
   async acknowledgeObject(l,key){if(loseAck){loseAck=false;throw Error('Injected missing acknowledgement');}(l.stepCode==='r2_objects_deleted'?deleted:absent).add(key);},
   async completeExternal(l){completed++;return {affectedCount:2,evidenceHash:deletionEvidence(l.requestId,l.stepCode,2)};},
  };
  const identity={async freeze(){throw Error('No Auth operation allowed');},async deleteIdentity(){throw Error('No Auth operation allowed');},async isAbsent(){throw Error('No Auth operation allowed');}};
  const run=createAccountDeletionStepExecutor({database:db,objects:probe,identity});
  fence=false;assert.equal((await run(lease)).outcome,'manual_review');assert.equal(await probe.isAbsent(a),false);fence=true;
  assert.equal((await createAccountDeletionStepExecutor({database:db,objects:deniedProbe,identity})(lease)).outcome,'failed_retryable');assert.equal(deleted.size,0);assert.equal(await canary.isAbsent(c),false);
  pass('executor denies stale fixture lease and propagates real 403 without acknowledging or touching canary');
  assert.equal((await run(lease)).outcome,'failed_retryable');assert.equal(await probe.isAbsent(a),true);assert.equal(deleted.size,0);
  assert.equal((await run(lease)).outcome,'completed');assert.equal(deleted.size,2);assert.equal(await probe.isAbsent(b),true);
  await probe.deleteObject(a);assert.equal(await probe.isAbsent(a),true);
  pass('real DELETE plus lost fixture acknowledgement resumes safely; repeated DELETE of absent key succeeds');
  await assert.rejects(()=>probe.deleteObject(c),/outside disposable manifest/);assert.equal(await canary.isAbsent(c),false);
  pass('another actor canary survives cross-scope delete attempt');
  await put(a);const absenceLease={...lease,stepCode:'r2_absence_verified' as const};
  assert.equal((await run(absenceLease)).outcome,'failed_retryable');assert.equal(absent.size,0);
  await probe.deleteObject(a);assert.equal((await run(absenceLease)).outcome,'completed');assert.equal(absent.size,2);assert.equal(completed,2);
  pass('late self-created PUT before verification blocks absence; explicit cleanup then permits real 404 verification');
  await put(a);assert.equal(await probe.isAbsent(a),false);
  pass('post-verification recreation is possible: upload-quiescence remains a separate unresolved production requirement');
 }catch{testFailure=true;console.error('Live staging scenario stopped; raw provider errors and credentials suppressed.');}
 finally{
  for(const key of attempted){try{await forKey(key).deleteObject(key);assert.equal(await forKey(key).isAbsent(key),true);confirmedAbsent.add(key);persist();}catch{cleanupFailure=true;}}
  client.destroy();badClient.destroy();
  const result={observedAt:new Date().toISOString(),bucket:Bucket,checks,markerObjects:3,cleanupComplete:!cleanupFailure&&confirmedAbsent.size===attempted.size,scenarioPassed:!testFailure,productionEnabled:false,
   scope:'real staging R2; in-memory executor lease/receipt fixture; invalid signature 403 and acknowledgement loss explicitly injected; no real DB/Auth/store/provider tests',productionUploadRaceClosed:false};
  writeFileSync('.codex-artifacts/account-deletion-r2-live-acceptance.json',JSON.stringify(result,null,2));
  if(testFailure||cleanupFailure)throw Error('Live staging acceptance incomplete; retain disposable manifest for scoped recovery');
 }
 console.log(`PASS real staging R2 (${checks.length} groups); all attempted marker keys verified absent`);
}
void main().catch(()=>{console.error('Staging-only verification stopped; see sanitized evidence and disposable manifest.');process.exitCode=1;});
