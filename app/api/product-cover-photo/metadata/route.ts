import { runAppApiWithCors, createAppApiCorsPreflightResponse } from '@/lib/api/server/cors';
import { NextResponse } from 'next/server';

import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import {
  createProductCoverPhotoServiceClient,
  isProductCoverPhotoReadEnabled,
  resolveProductCoverPhotoOwnerAccess,
} from '@/lib/products/product-cover-photo-server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function handlePOST(request: Request) {
  if (!isProductCoverPhotoReadEnabled()) return NextResponse.json({ photos: {},state:'disabled',code:'disabled' }, { status:503,headers: { 'Cache-Control': 'no-store' } });
  const auth = await authenticateAppApiRequest(request);
  if (!auth.ok) return NextResponse.json({ photos: {}, code: auth.code }, { status: auth.code === 'authentication_unavailable' ? 503 : 401 });
  const client = createProductCoverPhotoServiceClient();
  if (!client) return NextResponse.json({ photos: {} }, { status: 503 });

  const body = await request.json().catch(() => null) as { productIds?: unknown } | null;
  const productIds = Array.isArray(body?.productIds)
    ? [...new Set(body.productIds.filter((id): id is string => typeof id === 'string' && UUID.test(id)))].slice(0, 100)
    : [];
  if (productIds.length === 0) return NextResponse.json({ state:'ready', photos: {} }, { headers: { 'Cache-Control': 'no-store' } });

  const { data: products,error: productError } = await client.from('products').select('id,owner_id')
    .in('id', productIds).eq('is_active', true);
  if (productError) return NextResponse.json({photos:{},code:'unavailable'},{status:503});
  const allowedOwnerIds = new Set<string>();
  const ownerIds = [...new Set((products ?? []).map(product => String(product.owner_id)))];
  try {
    await Promise.all(ownerIds.map(async ownerId => {
      if (await resolveProductCoverPhotoOwnerAccess(client, auth.actor.actorId, ownerId)) allowedOwnerIds.add(ownerId);
    }));
  } catch { return NextResponse.json({photos:{},code:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}}); }
  const allowedProductIds = (products ?? [])
    .filter(product => allowedOwnerIds.has(String(product.owner_id)))
    .map(product => String(product.id));
  if (allowedProductIds.length === 0 && (products ?? []).length > 0) return NextResponse.json({ photos:{},code:'access_denied' },{status:403,headers:{'Cache-Control':'no-store'}});
  if (allowedProductIds.length === 0) return NextResponse.json({ state:'ready', photos: {} }, { headers: { 'Cache-Control': 'no-store' } });

  const { data: photos,error: photoError } = await client.from('product_cover_photos').select('product_id,version,status')
    .in('product_id', allowedProductIds).is('deleted_at', null);
  if (photoError) return NextResponse.json({photos:{},code:'unavailable'},{status:503});
  // A cloud upload in progress is not authoritative evidence of an empty photo.
  if ((photos ?? []).some(photo => photo.status !== 'uploaded')) return NextResponse.json({photos:{},code:'photo_pending'},{status:503});
  const response = Object.fromEntries((photos ?? []).map(photo => [String(photo.product_id), Number(photo.version)]));
  return NextResponse.json({ state:'ready', photos: response }, { headers: { 'Cache-Control': 'no-store' } });
}


const allowedMethods = ['POST', 'OPTIONS'] as const;
export const POST = (request: Request) => runAppApiWithCors(request, () => handlePOST(request), { allowedMethods });
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, { allowedMethods });
