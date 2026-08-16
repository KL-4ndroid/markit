import { NextResponse } from 'next/server';

import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import {
  createProductCoverPhotoServiceClient,
  isProductCoverPhotoReadEnabled,
} from '@/lib/products/product-cover-photo-server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isProductCoverPhotoReadEnabled()) return NextResponse.json({ photos: {} }, { headers: { 'Cache-Control': 'no-store' } });
  const auth = await authenticateAppApiRequest(request);
  if (!auth.ok) return NextResponse.json({ photos: {} }, { status: 401 });
  const client = createProductCoverPhotoServiceClient();
  if (!client) return NextResponse.json({ photos: {} }, { status: 503 });

  const body = await request.json().catch(() => null) as { productIds?: unknown } | null;
  const productIds = Array.isArray(body?.productIds)
    ? [...new Set(body.productIds.filter((id): id is string => typeof id === 'string' && UUID.test(id)))].slice(0, 100)
    : [];
  if (productIds.length === 0) return NextResponse.json({ photos: {} }, { headers: { 'Cache-Control': 'no-store' } });

  const { data: relationships } = await client.from('staff_relationships').select('owner_id')
    .eq('staff_id', auth.actor.actorId).eq('status', 'active');
  const allowedOwnerIds = new Set<string>([
    auth.actor.actorId,
    ...(relationships ?? []).map(item => String(item.owner_id)),
  ]);
  const { data: products } = await client.from('products').select('id,owner_id')
    .in('id', productIds).eq('is_active', true);
  const allowedProductIds = (products ?? [])
    .filter(product => allowedOwnerIds.has(String(product.owner_id)))
    .map(product => String(product.id));
  if (allowedProductIds.length === 0) return NextResponse.json({ photos: {} }, { headers: { 'Cache-Control': 'no-store' } });

  const { data: photos } = await client.from('product_cover_photos').select('product_id,version')
    .in('product_id', allowedProductIds).eq('status', 'uploaded').is('deleted_at', null);
  const response = Object.fromEntries((photos ?? []).map(photo => [String(photo.product_id), Number(photo.version)]));
  return NextResponse.json({ photos: response }, { headers: { 'Cache-Control': 'private, max-age=60' } });
}
