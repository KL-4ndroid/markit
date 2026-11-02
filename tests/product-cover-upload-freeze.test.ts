import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import Module,{createRequire} from 'node:module';
import type {SupabaseClient} from '@supabase/supabase-js';
import {beginDeletionUploadSession} from '../lib/subscription/account-deletion-upload-barrier.server';
const req=createRequire(import.meta.url),marker=req.resolve('server-only'),stub=new Module(marker);stub.filename=marker;stub.loaded=true;stub.exports={};req.cache[marker]=stub;
const {createProductCoverPhotoUploadHandler}=req('../app/api/product-cover-photo/upload/route') as typeof import('../app/api/product-cover-photo/upload/route');
const owner=randomUUID(),productId=randomUUID(),photoId=randomUUID(),oldId=randomUUID();
const a=`product-cover-photos/${owner}/${productId}/${photoId}/v2/display.webp`,b=a.replace('display','thumbnail');
const oldA=`product-cover-photos/${owner}/${productId}/${oldId}/v1/display.webp`,oldB=oldA.replace('display','thumbnail');
function request(){const f=new FormData();for(const [k,v] of Object.entries({productId,photoId,width:'1',height:'1',version:'2'}))f.set(k,v);f.set('display',new Blob([new Uint8Array(12)],{type:'image/webp'}));f.set('thumbnail',new Blob([new Uint8Array(12)],{type:'image/webp'}));return new Request('http://localhost/api/product-cover-photo/upload',{method:'POST',body:f});}
async function scenario(o:{freeze?:boolean;cleanupFail?:boolean;oldCleanupFail?:boolean;finalizeError?:string;readError?:boolean;replay?:boolean;beginFailure?:boolean;barrierDisabled?:boolean}={}){
 let frozen=false;const calls:string[]=[],puts:string[]=[],removed:string[]=[],states:string[]=[];
 const barrierClient={async rpc(name:string,args:Record<string,unknown>){calls.push(name);
  if((o.beginFailure&&name==='bff_begin_deletion_upload')||(frozen&&name==='bff_authorize_deletion_upload'))return {error:{code:'55000'}};
  if(name==='bff_finish_deletion_upload')states.push(String(args.p_state));return {error:null};
 }};
 const client={from(){return {select(){return this;},eq(){return this;},is(){return this;},async maybeSingle(){return {data:{display_object_key:o.replay?a:oldA,thumbnail_object_key:o.replay?b:oldB},error:o.readError?{code:'network'}:null};}};},
  async rpc(name:string){calls.push(name);return {error:name==='finalize_product_cover_photo_upload'&&o.finalizeError?{code:o.finalizeError}:null};}} as unknown as SupabaseClient;
 const handler=createProductCoverPhotoUploadHandler({isProductCoverPhotoUploadEnabled:()=>true,authenticateAppApiRequest:async()=>({ok:true,actor:{actorId:owner}}),createProductCoverPhotoServiceClient:()=>client,
  resolveProductCoverPhotoAccess:async()=>({ownerId:owner,canEdit:true}),checkServerSubscriptionWrite:async()=>({enabled:true,allowed:true,reason:'allowed'}),isProductCoverPhotoEntitlementRequired:()=>false,
  beginConfiguredDeletionUpload:async()=>o.barrierDisabled?null:beginDeletionUploadSession(barrierClient,owner,owner),
  putProductCoverPhotoObject:async key=>{puts.push(key);if(o.freeze)frozen=true;return true;},deleteProductCoverPhotoObject:async key=>{if(key)removed.push(key);if(o.cleanupFail||o.oldCleanupFail&&[oldA,oldB].includes(key??''))throw Error('Injected delete failure');return true;}});
 const response=await handler(request());return {status:response.status,body:await response.json(),calls,puts,removed,states};
}
async function main(){
 let r=await scenario({freeze:true});assert.equal(r.status,503);assert.equal(r.body.shouldKeepLocalPayload,true);assert.deepEqual(r.puts,[a]);assert.deepEqual(r.removed,[a,b]);assert.deepEqual(r.states,['settled']);assert.ok(!r.calls.includes('finalize_product_cover_photo_upload'));
 r=await scenario({freeze:true,cleanupFail:true});assert.deepEqual(r.states,['uncertain']);assert.ok(!r.calls.includes('mark_product_cover_photo_upload_failed'));
 r=await scenario({oldCleanupFail:true});assert.equal(r.status,200);assert.deepEqual(r.removed,[oldA,oldB]);assert.deepEqual(r.states,['uncertain']);
 r=await scenario({finalizeError:'FETCH_ERROR'});assert.equal(r.status,503);assert.equal(r.body.code,'upload_result_unconfirmed');assert.deepEqual(r.removed,[]);assert.deepEqual(r.states,['uncertain']);
 r=await scenario({readError:true});assert.equal(r.status,503);assert.deepEqual(r.calls,[]);assert.deepEqual(r.puts,[]);
 r=await scenario({replay:true});assert.equal(r.status,200);assert.deepEqual(r.removed,[]);assert.deepEqual(r.states,['settled']);
 r=await scenario({beginFailure:true});assert.equal(r.status,503);assert.deepEqual(r.puts,[]);assert.ok(!r.calls.includes('claim_product_cover_photo_upload'));
 r=await scenario({finalizeError:'42501'});assert.equal(r.status,503);assert.deepEqual(r.removed,[a,b]);assert.deepEqual(r.states,['settled']);
 r=await scenario({barrierDisabled:true,oldCleanupFail:true});assert.equal(r.status,200);assert.deepEqual(r.removed,[oldA,oldB]);assert.deepEqual(r.states,[]);
 console.log('PASS product upload handler: freeze mid-PUT, compensation failure, old-photo cleanup, ambiguous finalize, read failure and replay safety');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
