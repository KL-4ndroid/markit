import { NextResponse } from 'next/server';
import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import { createProductCoverPhotoServiceClient, isProductCoverPhotoDeleteEnabled, isProductCoverPhotoUploadEnabled, resolveProductCoverPhotoAccess } from '@/lib/products/product-cover-photo-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await authenticateAppApiRequest(request);
  if (!auth.ok) return NextResponse.json({ canManage: false, canDelete: false, reason: 'unavailable' }, { status: 401 });
  const client = createProductCoverPhotoServiceClient();
  if (!client) return NextResponse.json({ canManage: false, canDelete: false, reason: 'unavailable' }, { status: 503 });
  const productId = new URL(request.url).searchParams.get('productId');
  const access = await resolveProductCoverPhotoAccess(client, auth.actor.actorId, productId);
  if (!access) return NextResponse.json({ canManage: false, canDelete: false, reason: 'permission_denied' }, { status: 404 });
  const canManage = access.canEdit && access.paid && isProductCoverPhotoUploadEnabled();
  return NextResponse.json({
    canManage,
    canDelete: access.canEdit && isProductCoverPhotoDeleteEnabled(),
    reason: canManage ? 'paid_active' : access.canEdit && !access.paid ? 'free_plan' : 'permission_denied',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
