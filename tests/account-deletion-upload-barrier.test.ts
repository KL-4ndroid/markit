import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {beginDeletionUploadSession,beginConfiguredDeletionUpload} from '../lib/subscription/account-deletion-upload-barrier.server';
import {terminalPutTargetHash} from '../lib/subscription/account-deletion-terminal-put.server';
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
 console.log('PASS isolated gate, no premature close, late/frozen PUT fencing, close-ack retry, uncertainty and retained-photo cleanup');
}

async function checkManagedPreview() {
  const owner = randomUUID();
  const product = randomUUID();
  const photo = randomUUID();
  const image = `product-cover-photos/${owner}/${product}/${photo}/v1/display.webp`;
  const thumbnail = image.replace('display', 'thumbnail');
  const ref = 'abcdefghij0123456789';
  const accountId = 'a'.repeat(32);
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const bucket = 'markit-account-deletion-preview';
  const targetHash = terminalPutTargetHash({ endpoint, bucket, mode: 'preview-photos' });
  const env = {
    VERCEL: '1', VERCEL_ENV: 'preview',
    ACCOUNT_DELETION_UPLOAD_BARRIER_ENABLED: '1', ACCOUNT_DELETION_UPLOAD_RECEIPTS_ENABLED: '1',
    ACCOUNT_DELETION_PREVIEW_UPLOADS_ENABLED: '1', ACCOUNT_DELETION_PREVIEW_OWNER_ID: owner,
    ACCOUNT_DELETION_PREVIEW_SUPABASE_REF: ref, ACCOUNT_DELETION_PREVIEW_R2_TARGET_SHA256: targetHash,
    NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
    R2_ACCOUNT_ID: accountId, R2_BUCKET_NAME: bucket, R2_ACCESS_KEY_ID: 'fake', R2_SECRET_ACCESS_KEY: 'fake',
  };
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = { async rpc(name: string, args: Record<string, unknown>) {
    calls.push({ name, args });
    return { data: name === 'bff_read_recorded_photo_upload' ? { outcome: 'pending' } : undefined,
      error: name === 'bff_record_deletion_upload_put' ? { code: '55000' } : null };
  } };
  const prodRef = 'fgejncfsvvsayiequubm';
  for (const override of [
    { VERCEL_ENV: 'production' }, { ACCOUNT_DELETION_PREVIEW_OWNER_ID: randomUUID() },
    { ACCOUNT_DELETION_UPLOAD_BARRIER_ENABLED: '0' }, { ACCOUNT_DELETION_UPLOAD_RECEIPTS_ENABLED: '0' },
    { ACCOUNT_DELETION_PREVIEW_SUPABASE_REF: 'x'.repeat(20) },
    { ACCOUNT_DELETION_PREVIEW_SUPABASE_REF: prodRef, NEXT_PUBLIC_SUPABASE_URL: `https://${prodRef}.supabase.co` },
    { NEXT_PUBLIC_SUPABASE_URL: `${env.NEXT_PUBLIC_SUPABASE_URL}/different` },
    { R2_BUCKET_NAME: 'markit-media-production' }, { R2_BUCKET_NAME: 'markit-sales-photo-staging' },
    { R2_ENDPOINT: `https://${'b'.repeat(32)}.r2.cloudflarestorage.com` },
    { ACCOUNT_DELETION_PREVIEW_R2_TARGET_SHA256: '0'.repeat(64) },
  ]) await assert.rejects(() => beginConfiguredDeletionUpload(owner, owner, client, { ...env, ...override }));
  assert.equal(calls.length, 0);

  const previousVercel = process.env.VERCEL;
  const previousVercelEnv = process.env.VERCEL_ENV;
  process.env.VERCEL = env.VERCEL;
  process.env.VERCEL_ENV = env.VERCEL_ENV;
  try {
    const session = await beginConfiguredDeletionUpload(owner, owner, client, env);
    assert.ok(session?.writeObject && session.readback && session.canCompensate);
    const photoBody = new Blob([new Uint8Array([1])], { type: 'image/webp' });
    assert.equal(await session.readback({ kind: 'product', entityId: product, photoId: photo, version: 1,
      width: 1, height: 1, image: photoBody, thumbnail: photoBody }), 'pending');
    await session.bind({ kind: 'product', entityId: product, keys: [image, thumbnail], writeKeys: [image, thumbnail], expected: { photoId: photo, version: 1 } });
    // A failed durable issue must stop before the SDK sends any request.
    await assert.rejects(() => session.writeObject!(image, new Uint8Array([1]), 'image/webp'));
    assert.equal(session.canCompensate(image), false);
    await session.finish();
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercelEnv;
  }
  assert.deepEqual(calls.map(call => call.name), [
    'bff_begin_deletion_upload', 'bff_read_recorded_photo_upload', 'bff_bind_deletion_upload', 'bff_authorize_deletion_upload',
    'bff_record_deletion_upload_put', 'bff_finish_deletion_upload',
  ]);
  assert.equal(calls[1].args.p_owner, owner);
  assert.equal(calls[4].args.p_action, 'issue');
  assert.equal((calls[4].args.p_data as { targetHash: string }).targetHash, targetHash);
  assert.equal(calls[5].args.p_state, 'uncertain');
  console.log('PASS managed Preview scope and stop before R2 when the SQL target is unbound');
}

void main().then(checkManagedPreview).catch(e=>{console.error(e);process.exitCode=1;});
