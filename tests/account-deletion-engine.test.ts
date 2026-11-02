import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { createAccountDeletionStepExecutor, deletionEvidence, DeletionEngineFailure, isOwnedDeletionObjectKey, type DeletionLease, type DeletionDatabasePort } from '../lib/subscription/account-deletion-engine.server';
import { createDeletionIdentityPort, createDeletionObjectPort } from '../lib/subscription/account-deletion-engine-adapters.server';
import { runAccountDeletionSagaTick, type AccountDeletionSagaRepository } from '../lib/subscription/account-deletion-saga.server';

async function main() {
  const actor=randomUUID(),requestId=randomUUID(),leaseToken=randomUUID();
  const key=`product-cover-photos/${actor}/${randomUUID()}/${randomUUID()}/v1/display.webp`;
  assert.ok(isOwnedDeletionObjectKey(key,actor));
  assert.ok(isOwnedDeletionObjectKey(`sales-evidence/7d/${actor}/market/sale/evidence.webp`,actor));
  for(const bad of [key.replace(actor,randomUUID()),key.replace('/v1/','/../'),key+'?download=1',key.replace('display','%64isplay'),`https://example.com/${key}`,key.replace('/v1/','//v1/')])assert.equal(isOwnedDeletionObjectKey(bad,actor),false);
  const lease:DeletionLease={requestId,leaseToken,accountKind:'owner',stepCode:'r2_objects_deleted'};
  let contexts=0,failFence=false,acknowledged=false,deleted=0,authDeleted=0;
  const db:DeletionDatabasePort={
    async context(){contexts++;if(failFence&&contexts>1)throw new DeletionEngineFailure('manual_review','engine_fence_or_scope');return {actorId:actor,totalObjects:1,objects:acknowledged?[]:[{key,deleted:false,absent:false}]};},
    async execute(i){return {affectedCount:0,evidenceHash:deletionEvidence(i.requestId,i.stepCode,0)};},
    async acknowledgeObject(){acknowledged=true;},
    async completeExternal(i){return {affectedCount:1,evidenceHash:deletionEvidence(i.requestId,i.stepCode,1)};},
  };
  const execute=createAccountDeletionStepExecutor({database:db,objects:{async deleteObject(){deleted++;},async isAbsent(){return false;}},identity:{async freeze(){},async deleteIdentity(){authDeleted++;},async isAbsent(){return false;}}});
  failFence=true;
  assert.equal((await execute(lease)).outcome,'manual_review');assert.equal(deleted,0);
  failFence=false;contexts=0;
  assert.equal((await execute(lease)).outcome,'completed');assert.equal(deleted,1);assert.equal(contexts,3);
  acknowledged=false;
  assert.equal((await execute({...lease,stepCode:'r2_absence_verified'})).outcome,'failed_retryable');assert.equal(authDeleted,0);
  // A forged snapshot cannot cause a destructive side effect even if the repository claims a lease.
  const repo:AccountDeletionSagaRepository={
    async claimLease(){return {claimed:true,leaseToken,snapshot:{requestId:randomUUID(),accountKind:'owner',requestStatus:'processing',identityConfirmed:true,preflightResolution:'clean',steps:[]}};},
    async recordStepResult(){throw new Error('unexpected record');},async finalizeCompletion(){throw new Error('unexpected finalize');},async releaseLease(){},
  };
  assert.equal((await runAccountDeletionSagaTick({requestId,workerId:'test-engine-worker',nowMs:Date.now(),leaseDurationMs:5000,repository:repo,executeStep:async()=>{throw new Error('must not execute');}})).outcome,'request_not_processable');
  const client=new S3Client({region:'auto',endpoint:'http://127.0.0.1:1',credentials:{accessKeyId:'synthetic',secretAccessKey:'synthetic'}});
  assert.throws(()=>createDeletionObjectPort({client,bucket:'deletion-test',endpoint:'https://account.r2.cloudflarestorage.com'}));client.destroy();
  const auth=createClient('http://127.0.0.1:1','synthetic',{auth:{persistSession:false}});
  assert.throws(()=>createDeletionIdentityPort(auth,'https://example.supabase.co'));
  const draft=readFileSync('docs/subscription/drafts/ACCOUNT_DELETION_ENGINE_2026_11_02.sql','utf8');
  assert.match(draft,/ROLLBACK;\s*$/);assert.match(draft,/current_database\(\)<>'deletion_engine_test'/);
  assert.doesNotMatch(readFileSync('app/api/account-deletion/route.ts','utf8'),/account-deletion-engine/);
  console.log('PASS deletion engine key isolation, per-object fencing, absence failure, snapshot identity and local-only adapters');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
