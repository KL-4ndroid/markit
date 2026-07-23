import { NextResponse } from 'next/server';
import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import { PRODUCT_COVER_PHOTO_POLICY } from '@/lib/products/product-cover-photo-model';
import { getProductCoverPhotoObject } from '@/lib/products/product-cover-photo-r2.server';
import { createProductCoverPhotoServiceClient, isProductCoverPhotoReadEnabled, resolveProductCoverPhotoAccess } from '@/lib/products/product-cover-photo-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!isProductCoverPhotoReadEnabled()) return NextResponse.json({ ok: false, code: 'disabled' }, { status: 404 });
  const auth = await authenticateAppApiRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, code: 'authentication_required' }, { status: 401 });
  const url = new URL(request.url);
  const productId = url.searchParams.get('productId');
  const variant = url.searchParams.get('variant') === 'display' ? 'display' : 'thumbnail';
  if (!productId) return NextResponse.json({ ok: false, code: 'invalid_product' }, { status: 400 });
  const client = createProductCoverPhotoServiceClient();
  if (!client || !await resolveProductCoverPhotoAccess(client, auth.actor.actorId, productId)) return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 });
  const { data } = await client.from('product_cover_photos').select('display_object_key,thumbnail_object_key,display_content_hash,thumbnail_content_hash,version')
    .eq('product_id', productId).eq('status', 'uploaded').is('deleted_at', null).maybeSingle();
  if (!data) return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 });
  const key = variant === 'display' ? data?.display_object_key : data?.thumbnail_object_key;
  if (!key) return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 });
  const object = await getProductCoverPhotoObject(key, variant === 'display' ? PRODUCT_COVER_PHOTO_POLICY.displayMaxBytes : PRODUCT_COVER_PHOTO_POLICY.thumbnailMaxBytes);
  if (!object) return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 });
  const etag = variant === 'display' ? data.display_content_hash : data.thumbnail_content_hash;
  const responseBody = new ArrayBuffer(object.body.byteLength);
  new Uint8Array(responseBody).set(object.body);
  return new NextResponse(responseBody, { status: 200, headers: { 'Content-Type': object.contentType, 'Cache-Control': 'private, max-age=3600', ...(etag ? { ETag: `"${etag}"` } : {}) } });
}
