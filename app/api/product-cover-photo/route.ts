import { runAppApiWithCors, createAppApiCorsPreflightResponse } from '@/lib/api/server/cors';
import { NextResponse } from 'next/server';
import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import { deleteProductCoverPhotoObject } from '@/lib/products/product-cover-photo-r2.server';
import { createProductCoverPhotoServiceClient, isProductCoverPhotoDeleteEnabled, resolveProductCoverPhotoAccess } from '@/lib/products/product-cover-photo-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handleDELETE(request: Request) {
  if (!isProductCoverPhotoDeleteEnabled()) return NextResponse.json({ ok: false, code: 'disabled' }, { status: 501 });
  const auth = await authenticateAppApiRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, code: auth.code }, { status: auth.code === 'authentication_unavailable' ? 503 : 401 });
  const productId = new URL(request.url).searchParams.get('productId');
  const client = createProductCoverPhotoServiceClient();
  if (!productId || !client) return NextResponse.json({ ok: false, code: 'invalid_request' }, { status: 400 });
  const access = await resolveProductCoverPhotoAccess(client, auth.actor.actorId, productId);
  if (!access?.canEdit) return NextResponse.json({ ok: false, code: 'permission_denied' }, { status: 403 });
  const { data: photo } = await client.from('product_cover_photos').select('display_object_key,thumbnail_object_key').eq('product_id', productId).is('deleted_at', null).maybeSingle();
  const { error } = await client.rpc('delete_product_cover_photo', { p_actor_id: auth.actor.actorId, p_product_id: productId });
  if (error) return NextResponse.json({ ok: false, code: 'delete_failed' }, { status: 404 });
  await Promise.all([deleteProductCoverPhotoObject(photo?.display_object_key), deleteProductCoverPhotoObject(photo?.thumbnail_object_key)]);
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}


const allowedMethods = ['DELETE', 'OPTIONS'] as const;
export const DELETE = (request: Request) => runAppApiWithCors(request, () => handleDELETE(request), { allowedMethods });
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, { allowedMethods });
