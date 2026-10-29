import { runAppApiWithCors, createAppApiCorsPreflightResponse } from '@/lib/api/server/cors';
import { NextResponse } from 'next/server';
import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import { PRODUCT_COVER_PHOTO_POLICY } from '@/lib/products/product-cover-photo-model';
import { getProductCoverPhotoObject } from '@/lib/products/product-cover-photo-r2.server';
import { createProductCoverPhotoServiceClient, isProductCoverPhotoReadEnabled, resolveProductCoverPhotoAccess } from '@/lib/products/product-cover-photo-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handleGET(request: Request) {
  if (!isProductCoverPhotoReadEnabled()) return NextResponse.json({ ok: false, code: 'disabled' }, { status: 404 });
  const auth = await authenticateAppApiRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, code: auth.code }, { status: auth.code === 'authentication_unavailable' ? 503 : 401 });
  const url = new URL(request.url);
  const productId = url.searchParams.get('productId');
  const variant = url.searchParams.get('variant') === 'display' ? 'display' : 'thumbnail';
  if (!productId) return NextResponse.json({ ok: false, code: 'invalid_product' }, { status: 400 });
  const client = createProductCoverPhotoServiceClient();
  if (!client) return NextResponse.json({ok:false,code:'unavailable'}, {status:503});
  if (!await resolveProductCoverPhotoAccess(client, auth.actor.actorId, productId)) return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 });
  const { data, error: metadataError } = await client.from('product_cover_photos').select('status,display_object_key,thumbnail_object_key,display_content_hash,thumbnail_content_hash,version')
    .eq('product_id', productId).is('deleted_at', null).maybeSingle();
  if (metadataError) return NextResponse.json({ok:false,code:'unavailable'}, {status:503});
  if (!data) return NextResponse.json({ ok: false, code: 'photo_empty' }, { status: 404,headers:{'Cache-Control':'no-store'} });
  if (data.status !== 'uploaded') return NextResponse.json({ok:false,code:'photo_pending'}, {status:503});
  const key = variant === 'display' ? data?.display_object_key : data?.thumbnail_object_key;
  if (!key) return NextResponse.json({ok:false,code:'unavailable'}, {status:503});
  const object = await getProductCoverPhotoObject(key, variant === 'display' ? PRODUCT_COVER_PHOTO_POLICY.displayMaxBytes : PRODUCT_COVER_PHOTO_POLICY.thumbnailMaxBytes).catch(()=>null);
  if (!object) return NextResponse.json({ok:false,code:'unavailable'}, {status:503});
  const etag = variant === 'display' ? data.display_content_hash : data.thumbnail_content_hash;
  const responseBody = new ArrayBuffer(object.body.byteLength);
  new Uint8Array(responseBody).set(object.body);
  return new NextResponse(responseBody, { status: 200, headers: { 'Content-Type': object.contentType, 'Cache-Control': 'no-store', ...(etag ? { ETag: `"${etag}"` } : {}) } });
}


const allowedMethods = ['GET', 'OPTIONS'] as const;
export const GET = (request: Request) => runAppApiWithCors(request, () => handleGET(request), { allowedMethods });
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, { allowedMethods });
