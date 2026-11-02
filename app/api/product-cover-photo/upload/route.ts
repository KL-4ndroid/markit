import { runAppApiWithCors, createAppApiCorsPreflightResponse } from '@/lib/api/server/cors';
import { checkServerSubscriptionWrite } from '@/lib/subscription/write-access.server';
import { subscriptionWriteErrorStatus } from '@/lib/subscription/write-access';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import { buildProductCoverPhotoObjectKey, PRODUCT_COVER_PHOTO_POLICY } from '@/lib/products/product-cover-photo-model';
import { deleteProductCoverPhotoObject, putProductCoverPhotoObject } from '@/lib/products/product-cover-photo-r2.server';
import {
  createProductCoverPhotoServiceClient,
  getProductCoverPhotoAccountByteLimit,
  isProductCoverPhotoEntitlementRequired,
  isProductCoverPhotoUploadEnabled,
  resolveProductCoverPhotoAccess,
  resolveProductCoverPhotoPlanAccess,
  type ProductCoverPhotoPlanAccess,
} from '@/lib/products/product-cover-photo-server';
import { createAccountCapabilityRepository } from '@/lib/subscription/account-capability-storage.server';
import {beginConfiguredDeletionUpload,type DeletionUploadSession} from '@/lib/subscription/account-deletion-upload-barrier.server';
import {cleanupProductPhotoKeys,isDefiniteProductPhotoRejection} from '@/lib/products/product-cover-photo-upload-cleanup';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = async (blob: Blob) => createHash('sha256').update(new Uint8Array(await blob.arrayBuffer())).digest('hex');

function error(code: string, status: number, keep = true) {
  return NextResponse.json({ ok: false, code, shouldKeepLocalPayload: keep }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function planAccessError(access: Extract<ProductCoverPhotoPlanAccess, { allowed: false }>): {
  code: string;
  status: number;
} {
  if (access.reason === 'free_plan') return { code: 'paid_entitlement_required', status: 403 };
  if (access.reason === 'subscription_inactive') return { code: 'subscription_inactive', status: 403 };
  return { code: 'entitlement_unavailable', status: 503 };
}

const uploadDefaults={isProductCoverPhotoUploadEnabled,authenticateAppApiRequest,createProductCoverPhotoServiceClient,resolveProductCoverPhotoAccess,
 checkServerSubscriptionWrite,isProductCoverPhotoEntitlementRequired,createAccountCapabilityRepository,resolveProductCoverPhotoPlanAccess,
 beginConfiguredDeletionUpload,putProductCoverPhotoObject,deleteProductCoverPhotoObject,getProductCoverPhotoAccountByteLimit};
export function createProductCoverPhotoUploadHandler(overrides:Partial<typeof uploadDefaults>={}){
 const d={...uploadDefaults,...overrides};
 return async function handlePOST(request: Request) {
  if (!d.isProductCoverPhotoUploadEnabled()) return error('product_cover_photo_upload_disabled', 501);
  const auth = await d.authenticateAppApiRequest(request);
  if (!auth.ok) return error(auth.code, auth.code === 'authentication_unavailable' ? 503 : 401);
  const client = d.createProductCoverPhotoServiceClient();
  if (!client) return error('service_unavailable', 503);
  let form: FormData;
  try { form = await request.formData(); } catch { return error('invalid_form_data', 400, false); }
  const productId = String(form.get('productId') || '');
  const photoId = String(form.get('photoId') || '');
  const display = form.get('display');
  const thumbnail = form.get('thumbnail');
  const width = Number(form.get('width'));
  const height = Number(form.get('height'));
  const version = Number(form.get('version') || 1);
  if (!UUID.test(productId) || !UUID.test(photoId) || !(display instanceof Blob) || !(thumbnail instanceof Blob)) return error('invalid_upload', 400, false);
  if (!['image/webp', 'image/jpeg'].includes(display.type) || !['image/webp', 'image/jpeg'].includes(thumbnail.type)) return error('invalid_mime_type', 400, false);
  if (display.size < 1 || display.size > PRODUCT_COVER_PHOTO_POLICY.displayMaxBytes || thumbnail.size < 1 || thumbnail.size > PRODUCT_COVER_PHOTO_POLICY.thumbnailMaxBytes) return error('invalid_output_size', 400, false);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || Math.max(width, height) > PRODUCT_COVER_PHOTO_POLICY.displayMaxEdgePx || !Number.isInteger(version) || version < 1) return error('invalid_dimensions', 400, false);
  const access = await d.resolveProductCoverPhotoAccess(client, auth.actor.actorId, productId);
  if (!access || !access.canEdit) return error('permission_denied', 403);
  const writeAccess = await d.checkServerSubscriptionWrite({ actorId: auth.actor.actorId, ownerId: access.ownerId, feature: 'product_photo' });
  if (!writeAccess.allowed) return error(writeAccess.reason, subscriptionWriteErrorStatus(writeAccess));
  const entitlementRequired = d.isProductCoverPhotoEntitlementRequired();
  const capabilityRepository = entitlementRequired ? d.createAccountCapabilityRepository() : null;
  const planAccess = await d.resolveProductCoverPhotoPlanAccess({
    actorId: auth.actor.actorId,
    ownerId: access.ownerId,
    entitlementRequired,
    repository: capabilityRepository,
    nowMs: Date.now(),
  });
  if (!planAccess.allowed) {
    const denied = planAccessError(planAccess);
    return error(denied.code, denied.status);
  }

  const { data: previous,error:previousError } = await client.from('product_cover_photos').select('display_object_key,thumbnail_object_key').eq('product_id', productId).is('deleted_at', null).maybeSingle();
  if(previousError)return error('service_unavailable',503);
  const displayKey = buildProductCoverPhotoObjectKey({ ownerId: access.ownerId, productId, photoId, version, variant: 'display', mimeType: display.type });
  const thumbnailKey = buildProductCoverPhotoObjectKey({ ownerId: access.ownerId, productId, photoId, version, variant: 'thumbnail', mimeType: thumbnail.type });
  let uploadBarrier:DeletionUploadSession|null;
  try{uploadBarrier=await d.beginConfiguredDeletionUpload(auth.actor.actorId,access.ownerId,client);}catch{return error('upload_barrier_unavailable',503);}
  try {
  if(uploadBarrier?.readback){
    let replay;try{replay=await uploadBarrier.readback({kind:'product',entityId:productId,photoId,version,width,height,image:display,thumbnail});}catch{return error('photo_readback_unavailable',503);}
    if(replay==='confirmed')return NextResponse.json({ok:true,productId,photoId,version,replayed:true},{headers:{'Cache-Control':'no-store'}});
    if(replay!=='absent')return NextResponse.json({ok:false,code:replay==='pending'?'photo_upload_requires_review':'photo_upload_conflict',shouldKeepLocalPayload:true,shouldRetryWithLocalPayload:false,retryable:false},{status:409,headers:{'Cache-Control':'no-store'}});
  }
  const { error: claimError } = await client.rpc('claim_product_cover_photo_upload', {
    p_actor_id: auth.actor.actorId,
    p_product_id: productId,
    p_photo_id: photoId,
    p_version: version,
    p_requested_bytes: display.size + thumbnail.size,
    p_max_account_bytes: d.getProductCoverPhotoAccountByteLimit(),
    p_require_entitlement: false,
  });
  if (claimError) {
    if(!isDefiniteProductPhotoRejection(claimError))uploadBarrier?.uncertain();
    if (claimError.message.includes('paid_entitlement_required')) return error('paid_entitlement_required', 403);
    if (claimError.message.includes('storage_quota_exceeded')) return error('storage_quota_exceeded', 413);
    return error('claim_failed', 403);
  }
  await uploadBarrier?.bind({kind:'product',entityId:productId,keys:[displayKey,thumbnailKey,previous?.display_object_key,previous?.thumbnail_object_key].filter((k):k is string=>Boolean(k)),writeKeys:[displayKey,thumbnailKey],expected:{photoId,version}});
  let finalError = { code: 'upload_failed', status: 503 };
  let failureMarkCode = 'upload_or_finalize_failed';
  let finalized=false;
  let finalizeStarted=false,finalizeOutcomeKnown=false;
  try {
    const put=(key:string,blob:Blob)=>uploadBarrier?.writeObject?uploadBarrier.writeObject(key,blob,blob.type)
      :uploadBarrier?uploadBarrier.put(key,()=>d.putProductCoverPhotoObject(key,blob)):d.putProductCoverPhotoObject(key,blob);
    if (!await put(displayKey, display)) throw new Error('r2_unavailable');
    if (!await put(thumbnailKey, thumbnail)) throw new Error('r2_unavailable');
    const displayHash = await hash(display);
    const thumbnailHash = await hash(thumbnail);
    const currentAccess = await d.resolveProductCoverPhotoAccess(client, auth.actor.actorId, productId);
    if (!currentAccess?.canEdit || currentAccess.ownerId !== access.ownerId) {
      finalError = { code: 'permission_denied', status: 403 };
      failureMarkCode = 'permission_changed';
      throw new Error('permission_changed');
    }
    const currentWriteAccess = await d.checkServerSubscriptionWrite({ actorId: auth.actor.actorId, ownerId: currentAccess.ownerId, feature: 'product_photo' });
    if (!currentWriteAccess.allowed) {
      finalError = { code: currentWriteAccess.reason, status: subscriptionWriteErrorStatus(currentWriteAccess) };
      failureMarkCode = 'entitlement_changed';
      throw new Error('entitlement_changed');
    }
    const currentPlanAccess = await d.resolveProductCoverPhotoPlanAccess({
      actorId: auth.actor.actorId,
      ownerId: currentAccess.ownerId,
      entitlementRequired,
      repository: capabilityRepository,
      nowMs: Date.now(),
    });
    if (!currentPlanAccess.allowed) {
      finalError = planAccessError(currentPlanAccess);
      failureMarkCode = 'entitlement_changed';
      throw new Error('entitlement_changed');
    }
    await uploadBarrier?.assertActive();
    finalizeStarted=true;
    const { error: finalizeError } = await client.rpc('finalize_product_cover_photo_upload', {
      p_actor_id: auth.actor.actorId, p_product_id: productId, p_photo_id: photoId, p_version: version,
      p_display_object_key: displayKey, p_thumbnail_object_key: thumbnailKey,
      p_display_content_hash: displayHash, p_thumbnail_content_hash: thumbnailHash,
      p_display_mime_type: display.type, p_thumbnail_mime_type: thumbnail.type,
      p_display_size_bytes: display.size, p_thumbnail_size_bytes: thumbnail.size, p_width: width, p_height: height,
      p_require_entitlement: false,
    });
    if (finalizeError) {finalizeOutcomeKnown=isDefiniteProductPhotoRejection(finalizeError);if(!finalizeOutcomeKnown)uploadBarrier?.uncertain();throw new Error('finalize_failed');}
    finalizeOutcomeKnown=true;
    finalized=true;
    if(!await cleanupProductPhotoKeys([previous?.display_object_key,previous?.thumbnail_object_key],[displayKey,thumbnailKey],d.deleteProductCoverPhotoObject))uploadBarrier?.uncertain();
    return NextResponse.json({ ok: true, productId, photoId, version }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    if(finalizeStarted&&!finalizeOutcomeKnown){uploadBarrier?.uncertain();return error('upload_result_unconfirmed',503);}
    const compensationKeys=[displayKey,thumbnailKey].filter(k=>!uploadBarrier?.canCompensate||uploadBarrier.canCompensate(k));
    const cleanupIncomplete=!finalized&&!await cleanupProductPhotoKeys(compensationKeys,[],d.deleteProductCoverPhotoObject);
    if(cleanupIncomplete)uploadBarrier?.uncertain();
    else await client.rpc('mark_product_cover_photo_upload_failed', { p_actor_id: auth.actor.actorId, p_product_id: productId, p_photo_id: photoId, p_error_code: failureMarkCode });
    return error(finalError.code, finalError.status);
  }
  } catch {uploadBarrier?.uncertain();return error('upload_barrier_unavailable',503);}
  finally{try{await uploadBarrier?.finish();}catch{return error('upload_barrier_unavailable',503);}}
}
}


const handlePOST=createProductCoverPhotoUploadHandler();
const allowedMethods = ['POST', 'OPTIONS'] as const;
export const POST = (request: Request) => runAppApiWithCors(request, () => handlePOST(request), { allowedMethods });
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, { allowedMethods });
