import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import { buildProductCoverPhotoObjectKey, PRODUCT_COVER_PHOTO_POLICY } from '@/lib/products/product-cover-photo-model';
import { deleteProductCoverPhotoObject, putProductCoverPhotoObject } from '@/lib/products/product-cover-photo-r2.server';
import { createProductCoverPhotoServiceClient, getProductCoverPhotoAccountByteLimit, isProductCoverPhotoUploadEnabled, resolveProductCoverPhotoAccess } from '@/lib/products/product-cover-photo-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = async (blob: Blob) => createHash('sha256').update(new Uint8Array(await blob.arrayBuffer())).digest('hex');

function error(code: string, status: number, keep = true) {
  return NextResponse.json({ ok: false, code, shouldKeepLocalPayload: keep }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!isProductCoverPhotoUploadEnabled()) return error('product_cover_photo_upload_disabled', 501);
  const auth = await authenticateAppApiRequest(request);
  if (!auth.ok) return error('authentication_required', 401);
  const client = createProductCoverPhotoServiceClient();
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
  const access = await resolveProductCoverPhotoAccess(client, auth.actor.actorId, productId);
  if (!access || !access.canEdit) return error('permission_denied', 403);
  if (!access.paid) return error('paid_entitlement_required', 403);

  const { data: previous } = await client.from('product_cover_photos').select('display_object_key,thumbnail_object_key').eq('product_id', productId).is('deleted_at', null).maybeSingle();
  const displayKey = buildProductCoverPhotoObjectKey({ ownerId: access.ownerId, productId, photoId, version, variant: 'display', mimeType: display.type });
  const thumbnailKey = buildProductCoverPhotoObjectKey({ ownerId: access.ownerId, productId, photoId, version, variant: 'thumbnail', mimeType: thumbnail.type });
  const { error: claimError } = await client.rpc('claim_product_cover_photo_upload', {
    p_actor_id: auth.actor.actorId,
    p_product_id: productId,
    p_photo_id: photoId,
    p_version: version,
    p_requested_bytes: display.size + thumbnail.size,
    p_max_account_bytes: getProductCoverPhotoAccountByteLimit(),
  });
  if (claimError) {
    if (claimError.message.includes('paid_entitlement_required')) return error('paid_entitlement_required', 403);
    if (claimError.message.includes('storage_quota_exceeded')) return error('storage_quota_exceeded', 413);
    return error('claim_failed', 403);
  }
  try {
    if (!await putProductCoverPhotoObject(displayKey, display)) throw new Error('r2_unavailable');
    if (!await putProductCoverPhotoObject(thumbnailKey, thumbnail)) throw new Error('r2_unavailable');
    const displayHash = await hash(display);
    const thumbnailHash = await hash(thumbnail);
    const { error: finalizeError } = await client.rpc('finalize_product_cover_photo_upload', {
      p_actor_id: auth.actor.actorId, p_product_id: productId, p_photo_id: photoId, p_version: version,
      p_display_object_key: displayKey, p_thumbnail_object_key: thumbnailKey,
      p_display_content_hash: displayHash, p_thumbnail_content_hash: thumbnailHash,
      p_display_mime_type: display.type, p_thumbnail_mime_type: thumbnail.type,
      p_display_size_bytes: display.size, p_thumbnail_size_bytes: thumbnail.size, p_width: width, p_height: height,
    });
    if (finalizeError) throw new Error('finalize_failed');
    await Promise.all([deleteProductCoverPhotoObject(previous?.display_object_key), deleteProductCoverPhotoObject(previous?.thumbnail_object_key)]);
    return NextResponse.json({ ok: true, productId, photoId, version }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    await Promise.all([deleteProductCoverPhotoObject(displayKey), deleteProductCoverPhotoObject(thumbnailKey)]);
    await client.rpc('mark_product_cover_photo_upload_failed', { p_actor_id: auth.actor.actorId, p_product_id: productId, p_photo_id: photoId, p_error_code: 'upload_or_finalize_failed' });
    return error('upload_failed', 503);
  }
}
