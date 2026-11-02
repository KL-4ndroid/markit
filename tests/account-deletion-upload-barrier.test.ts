import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {beginDeletionUploadSession,beginConfiguredDeletionUpload} from '../lib/subscription/account-deletion-upload-barrier.server';
import {cleanupProductPhotoKeys,isDefiniteProductPhotoRejection} from '../lib/products/product-cover-photo-upload-cleanup';

async function main(){
 const actor=randomUUID(),entityId=randomUUID(),photoId=randomUUID();
 const a=`product-cover-photos/${actor}/${entityId}/${photoId}/v1/display.webp`,b=a.replace('display','thumbnail');
 let frozen=false,closeLost=false;const states:string[]=[],issued:string[]=[],calls:string[]=[];
 const client={async rpc(name:string,args:Record<string,unknown>){calls.push(name);
  if(name==='bff_authorize_deletion_upload'){if(frozen)return {error:{code:'55000'}};if(args.p_key)issued.push(String(args.p_key));}
  if(name==='bff_finish_deletion_upload'){states.push(String(args.p_state));if(closeLost){closeLost=false;return {error:{code:'network'}};}}
  return {error:null};
 }};
 assert.equal(await beginConfiguredDeletionUpload(actor,actor,client,{}),null);assert.equal(calls.length,0);
 await assert.rejects(()=>beginConfiguredDeletionUpload(actor,actor,client,{ACCOUNT_DELETION_UPLOAD_BARRIER_ENABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co'}));
 await assert.rejects(()=>beginConfiguredDeletionUpload(actor,actor,client,{ACCOUNT_DELETION_UPLOAD_BARRIER_ENABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',VERCEL:'1'}));
 const session=await beginDeletionUploadSession(client,actor,actor);
 await assert.rejects(()=>session.bind({kind:'product',entityId,keys:[a.replace(actor,randomUUID()),b],writeKeys:[a,b],expected:{}}));
 await session.bind({kind:'product',entityId,keys:[a,b],writeKeys:[a,b],expected:{photoId,version:1}});
 let release!:()=>void,entered!:()=>void,writes=0;
 const started=new Promise<void>(r=>entered=r),wait=new Promise<void>(r=>release=r);
 const operation=session.put(a,async()=>{entered();await wait;writes++;return true;});await started;
 await assert.rejects(()=>session.finish(),/inflight/);await assert.rejects(()=>session.put(b,async()=>true));assert.equal(states.length,0);
 frozen=true;release();await operation;
 await assert.rejects(()=>session.put(b,async()=>{writes++;return true;}));assert.equal(writes,1);
 closeLost=true;await assert.rejects(()=>session.finish());await assert.rejects(()=>session.put(a,async()=>true));await session.finish();
 assert.deepEqual(states,['settled','settled']);assert.deepEqual(issued,[a]);
 frozen=false;
 for(const fail of ['throw','false']){const s=await beginDeletionUploadSession(client,actor,actor);await s.bind({kind:'product',entityId,keys:[a,b],writeKeys:[a,b],expected:{photoId,version:1}});
  if(fail==='throw')await assert.rejects(()=>s.put(a,async()=>{throw Error('Injected unknown result');}));else await s.put(a,async()=>({ok:false}));
  await s.finish();assert.equal(states.at(-1),'uncertain');}
 const removed:string[]=[];
 assert.equal(await cleanupProductPhotoKeys([a,b,a,'old-image','old-thumb'],[a,b],async k=>{removed.push(k);if(k==='old-image')throw Error('old delete failed');return true;}),false);
 assert.deepEqual(removed,['old-image','old-thumb']);
 for(const code of ['55000','42501','P0001'])assert.equal(isDefiniteProductPhotoRejection({code}),true);
 for(const code of ['PGRST000','network','',undefined])assert.equal(isDefiniteProductPhotoRejection({code}),false);
 console.log('PASS local-only gate, no premature close, late/frozen PUT fencing, close-ack retry, uncertainty and retained-photo cleanup');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
