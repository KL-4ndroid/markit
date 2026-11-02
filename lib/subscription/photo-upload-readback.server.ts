import { createHash } from 'node:crypto';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { isOwnedDeletionObjectKey } from './account-deletion-engine.server';
import { requireIsolatedEndpoint } from './account-deletion-engine-adapters.server';
export type PhotoReadbackInput={kind:'product'|'sale';entityId:string;photoId?:string;version?:number;marketId?:string;width:number;height:number;image:Blob;thumbnail:Blob};
type Rpc={rpc(n:string,a:Record<string,unknown>):PromiseLike<{data?:unknown;error:unknown}>};
export async function readRecordedPhotoUpload(input:{actor:string;owner:string;client:Rpc;endpoint:string;bucket:string;credentials:{accessKeyId:string;secretAccessKey:string};photo:PhotoReadbackInput}):Promise<'absent'|'pending'|'conflict'|'confirmed'>{
 requireIsolatedEndpoint(input.endpoint);
 const p=input.photo,hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
 const image=new Uint8Array(await p.image.arrayBuffer()),thumb=new Uint8Array(await p.thumbnail.arrayBuffer());
 const spec={photoId:p.photoId,version:p.version,marketId:p.marketId,width:p.width,height:p.height,imageHash:hash(image),thumbnailHash:hash(thumb),imageMime:p.image.type,thumbnailMime:p.thumbnail.type,imageBytes:image.length,thumbnailBytes:thumb.length};
 async function lookup(source:string|null){const r=await input.client.rpc('bff_read_recorded_photo_upload',{p_actor:input.actor,p_owner:input.owner,p_kind:p.kind,p_entity:p.entityId,p_spec:spec,p_source:source});if(r.error)throw Error('photo_readback_unavailable');return r.data as {outcome:string;sourceHash?:string;keys?:string[]}|null;}
 const row=await lookup(null);
 if(row&&['absent','pending','conflict'].includes(row.outcome))return row.outcome as 'absent'|'pending'|'conflict';
 if(row?.outcome!=='confirmed'||!/^[a-f0-9]{64}$/.test(row.sourceHash??'')||row.keys?.length!==2||row.keys.some(k=>!isOwnedDeletionObjectKey(k,input.owner)))throw Error('photo_readback_unavailable');
 const sdk=new S3Client({region:'auto',endpoint:input.endpoint,forcePathStyle:true,credentials:input.credentials,maxAttempts:1});
 try{
  for(const [i,expected]of [image,thumb].entries()){
   const obj=await sdk.send(new GetObjectCommand({Bucket:input.bucket,Key:row.keys[i]}),{abortSignal:AbortSignal.timeout(5000)});
   if(!obj.Body||obj.ContentLength!==expected.length||obj.ContentType!==(i===0?p.image.type:p.thumbnail.type))throw Error('photo_readback_unavailable');
   const chunks:Uint8Array[]=[];let size=0;for await(const chunk of obj.Body as AsyncIterable<Uint8Array>){size+=chunk.byteLength;if(size>expected.length)throw Error('photo_readback_unavailable');chunks.push(chunk);}
   if(size!==expected.length||hash(Buffer.concat(chunks))!==hash(expected))throw Error('photo_readback_unavailable');
  }
  const checked=await lookup(row.sourceHash!);if(checked?.outcome!=='confirmed'||checked.sourceHash!==row.sourceHash)throw Error('photo_readback_changed');
  return 'confirmed';
 }finally{sdk.destroy();}
}
