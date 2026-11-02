// READ ONLY: no GetObject bodies, Put/Delete/Abort, SQL/RPC writes, or configuration changes.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {S3Client,ListObjectsV2Command,ListMultipartUploadsCommand,GetBucketLifecycleConfigurationCommand,HeadObjectCommand} from '@aws-sdk/client-s3';
import {analyzeDeletionR2Inventory,type PhotoReference,type ListedPhotoObject} from './lib/account-deletion-r2-inventory';

let stage='arguments';
async function main(){
 const localMode=process.argv[2]==='--configured-readonly';
 const override=process.argv[3]==='--bucket'?process.argv[4]:undefined;
 const uiFile=process.argv[5]==='--ui-inventory'?process.argv[6]:undefined;
 assert.deepEqual(process.argv.slice(2),[localMode?'--configured-readonly':'--production-readonly',...(override?['--bucket',override]:[]),...(uiFile?['--ui-inventory',uiFile]:[])]);
 if(override)assert.match(override,/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/);
 const env=Object.fromEntries(Object.entries(localMode?parse(readFileSync('.env.local')):process.env).map(([k,v])=>[k,v?.trim()]));
 for(const name of ['R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME','NEXT_PUBLIC_SUPABASE_URL'])if(!env[name]){stage=`missing_${name}`;throw Error('Required production configuration unavailable');}
 stage='supabase_target';
 const url=new URL(env.NEXT_PUBLIC_SUPABASE_URL!);
 assert.equal(url.href,'https://fgejncfsvvsayiequubm.supabase.co/');
 stage='r2_target';const endpoint=env.R2_ENDPOINT||`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
 const parsed=new URL(endpoint);
 assert.equal(parsed.protocol,'https:');assert.ok(!parsed.username&&!parsed.password&&!parsed.search&&!parsed.hash&&parsed.pathname==='/');
 assert.ok([`${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,`${env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,`${env.R2_ACCOUNT_ID}.fedramp.r2.cloudflarestorage.com`].includes(parsed.hostname));
 stage='supabase_credential';const secret=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;if(!secret)throw Error('Production metadata credential unavailable');
 const db=createClient(url.href,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const r2=new S3Client({endpoint,region:'auto',maxAttempts:1,credentials:{accessKeyId:env.R2_ACCESS_KEY_ID!,secretAccessKey:env.R2_SECRET_ACCESS_KEY!}});
 const Bucket=override||env.R2_BUCKET_NAME!.trim();const startedAt=new Date().toISOString();
 const safeError=(e:unknown)=>{const x=e as {name?:string;$metadata?:{httpStatusCode?:number}};return {code:/^[A-Za-z0-9_]{1,60}$/.test(x.name??'')?x.name:'unavailable',status:x.$metadata?.httpStatusCode??null};};
 async function metadata(){
  const refs:PhotoReference[]=[];const counts:Record<string,{rows:number;statuses:Record<string,number>;activeLeases:number}>={};const rowsForHash:unknown[]=[];let complete=true;
  for(const table of ['product_cover_photos','sale_photo_evidence']){
   const fields=table==='product_cover_photos'?['display_object_key','thumbnail_object_key']:['r2_object_key','r2_thumbnail_key'];
   const c={rows:0,statuses:{} as Record<string,number>,activeLeases:0};counts[table]=c;
   let ended=false;
   for(let page=0;page<20;page++){
    const {data,error}=await db.from(table).select(`id,owner_id,status,upload_lease_expires_at,${fields.join(',')}${table==='sale_photo_evidence'?',expires_at':''}`).order('id').range(page*500,page*500+499).abortSignal(AbortSignal.timeout(20000));
    if(error||!data){complete=false;break;}
    for(const raw of data){const row=raw as unknown as Record<string,string|null>;rowsForHash.push([table,row]);c.rows++;const status=row.status??'unknown';c.statuses[status]=(c.statuses[status]??0)+1;
     if(Date.parse(row.upload_lease_expires_at??'')>Date.parse(startedAt))c.activeLeases++;
     for(const f of fields)if(row[f])refs.push({ownerId:row.owner_id!,key:row[f]!,status,expiresAt:row.expires_at});
    }
    if(data.length<500){ended=true;break;}
   }
   if(!ended)complete=false;
  }
  return {refs,counts,complete,hash:createHash('sha256').update(JSON.stringify(rowsForHash)).digest('hex')};
 }
 stage='read_only_scan';try{
  const before=await metadata();
  if(uiFile){
   // User-authenticated dashboard observations are an audit input, never a grant
   // for this credential and never an authorization to delete or mark absence.
   const ui=JSON.parse(readFileSync(uiFile,'utf8')) as {source:string;bucket:string;endpoint:string;observedAt:string;complete:boolean;objectCount:number;totalSizeDisplay:string;objects:{key:string;modifiedAt?:string}[]};
   assert.equal(ui.source,'cloudflare_dashboard_dom');assert.equal(ui.bucket,Bucket);assert.equal(new URL(ui.endpoint).href,parsed.href);
   assert.ok(Array.isArray(ui.objects)&&ui.objects.length<=20000&&ui.objects.every(o=>typeof o.key==='string'&&o.key.length<=1024));
   assert.equal(ui.objectCount,ui.objects.length);assert.ok(Number.isFinite(Date.parse(ui.observedAt))&&Math.abs(Date.now()-Date.parse(ui.observedAt))<3600000);
   const after=await metadata();
   const analysis=analyzeDeletionR2Inventory({refs:before.refs,objects:ui.objects.map(o=>({...o,size:0})),metadataComplete:before.complete&&after.complete,objectsComplete:ui.complete===true,metadataStable:before.hash===after.hash,at:startedAt});
   const result={observedAt:ui.observedAt,comparedAt:new Date().toISOString(),source:'Cloudflare authenticated dashboard list + bounded database SELECT; no S3 calls',bucket:Bucket,totalSizeDisplay:ui.totalSizeDisplay,
    metadata:before.counts,metadataStable:before.hash===after.hash,analysis,productionTargetVerified:false,
    objectAbsenceVerified:false,multipartVerified:false,deletionAuthorized:false,productionDeletionEnabled:false};
   mkdirSync('.codex-artifacts',{recursive:true});writeFileSync('.codex-artifacts/account-deletion-r2-ui-comparison.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));return;
  }
  const objects:ListedPhotoObject[]=[];let listComplete=false,ContinuationToken:string|undefined,listRequests=0,listError:unknown=null;
  for(let page=0;page<20;page++){
   try{
    listRequests++;const out=await r2.send(new ListObjectsV2Command({Bucket,MaxKeys:1000,ContinuationToken}),{abortSignal:AbortSignal.timeout(20000)});
    for(const o of out.Contents??[])if(o.Key)objects.push({key:o.Key,size:o.Size??0,modifiedAt:o.LastModified?.toISOString()});
    if(!out.IsTruncated){listComplete=true;break;}
    if(!out.NextContinuationToken||out.NextContinuationToken===ContinuationToken)break;ContinuationToken=out.NextContinuationToken;
   }catch(e){listError=safeError(e);break;}
  }
  let multipartComplete=false,multipartCount=0,KeyMarker:string|undefined,UploadIdMarker:string|undefined,multipartError:unknown=null;
  for(let page=0;page<20;page++){
   try{const out=await r2.send(new ListMultipartUploadsCommand({Bucket,MaxUploads:1000,KeyMarker,UploadIdMarker}),{abortSignal:AbortSignal.timeout(20000)});
    multipartCount+=(out.Uploads??[]).length;if(!out.IsTruncated){multipartComplete=true;break;}
    if(!out.NextKeyMarker||(out.NextKeyMarker===KeyMarker&&out.NextUploadIdMarker===UploadIdMarker))break;
    KeyMarker=out.NextKeyMarker;UploadIdMarker=out.NextUploadIdMarker;
   }catch(e){multipartError=safeError(e);break;}
  }
  let lifecycle:unknown;
  try{const out=await r2.send(new GetBucketLifecycleConfigurationCommand({Bucket}),{abortSignal:AbortSignal.timeout(20000)});
   lifecycle={readable:true,rules:(out.Rules??[]).map(r=>({enabled:r.Status==='Enabled',scope:r.Filter?.Prefix??r.Prefix??'all',expirationDays:r.Expiration?.Days??null,abortMultipartDays:r.AbortIncompleteMultipartUpload?.DaysAfterInitiation??null}))};
  }catch(e){lifecycle={readable:false,error:safeError(e)};}
  const after=await metadata();const analysis=analyzeDeletionR2Inventory({refs:before.refs,objects,metadataComplete:before.complete&&after.complete,objectsComplete:listComplete,metadataStable:before.hash===after.hash,at:startedAt});
  const listed=new Set(objects.map(o=>o.key));const probes={present:0,explicit404:0,unavailable:0,limit:10};
  for(const key of [...new Set(before.refs.filter(r=>listComplete&&r.status==='uploaded'&&!listed.has(r.key)).map(r=>r.key))].slice(0,10)){
   try{await r2.send(new HeadObjectCommand({Bucket,Key:key}),{abortSignal:AbortSignal.timeout(20000)});probes.present++;}
   catch(e){const x=safeError(e);if(x.status===404&&['NotFound','NoSuchKey'].includes(x.code??''))probes.explicit404++;else probes.unavailable++;}
  }
  let localTargetMatch:boolean|null=null;
  if(!localMode)try{const local=parse(readFileSync('.env.local'));localTargetMatch=local.R2_BUCKET_NAME?.trim()===Bucket&&(local.R2_ENDPOINT?.trim()||`https://${local.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`).replace(/\/$/,'')===endpoint.replace(/\/$/,'');}catch{/* No local config is required. */}
  const result={observedAt:startedAt,finishedAt:new Date().toISOString(),source:localMode?`${override?'explicit read-only bucket target with local credentials':'local configured R2 target'}; production binding unverified`:'linked Vercel production configuration; deployed revision binding not verified',bucket:Bucket,projectRef:'fgejncfsvvsayiequubm',localTargetMatch,
   scope:'read-only metadata; no photo body downloaded or data/configuration changed',metadata:before.counts,metadataStable:before.hash===after.hash,
   r2:{objects:objects.length,bytes:objects.reduce((n,o)=>n+o.size,0),listComplete,listRequests,listError,multipartCount,multipartComplete,multipartError,lifecycle},analysis,missingUploadedHeadSamples:probes,
   productionTargetVerified:false,deletionAuthorized:false,productionDeletionEnabled:false,remaining:['deployed revision configuration binding','bucket lifecycle permissions','backup/replica inventory','server PUT lease/freeze race acceptance','live disposable-prefix deletion acceptance']};
  mkdirSync('.codex-artifacts',{recursive:true});writeFileSync('.codex-artifacts/account-deletion-r2-inventory.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{r2.destroy();}
}
void main().catch(()=>{console.error(`Read-only R2 inventory stopped (${stage}); no secret/error body emitted.`);process.exitCode=1;});
