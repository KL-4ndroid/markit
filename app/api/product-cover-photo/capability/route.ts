import { runAppApiWithCors, createAppApiCorsPreflightResponse } from '@/lib/api/server/cors';
import { checkServerSubscriptionWrite } from '@/lib/subscription/write-access.server';
import { NextResponse } from 'next/server';
import { authenticateAppApiRequest } from '@/lib/api/server/auth';
import {
  createProductCoverPhotoServiceClient,
  isProductCoverPhotoDeleteEnabled,
  isProductCoverPhotoEntitlementRequired,
  isProductCoverPhotoUploadEnabled,
  resolveProductCoverPhotoAccess,
  resolveProductCoverPhotoPlanAccess,
} from '@/lib/products/product-cover-photo-server';
import { createAccountCapabilityRepository } from '@/lib/subscription/account-capability-storage.server';

export const dynamic = 'force-dynamic';

async function handleGET(request: Request) {
  const auth = await authenticateAppApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { canManage: false, canDelete: false, reason: auth.code === 'authentication_unavailable' ? 'unavailable' : 'authentication_required' },
      { status: auth.code === 'authentication_unavailable' ? 503 : 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const client = createProductCoverPhotoServiceClient();
  if (!client) return NextResponse.json({ canManage: false, canDelete: false, reason: 'unavailable' }, { status: 503 });
  const productId = new URL(request.url).searchParams.get('productId');
  const access = await resolveProductCoverPhotoAccess(client, auth.actor.actorId, productId);
  if (!access) return NextResponse.json({ canManage: false, canDelete: false, reason: 'permission_denied' }, { status: 404 });
  if (!access.canEdit) {
    return NextResponse.json(
      { canManage: false, canDelete: false, reason: 'permission_denied' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const writeAccess = await checkServerSubscriptionWrite({ actorId: auth.actor.actorId, ownerId: access.ownerId, feature: 'product_photo' });
  if (!writeAccess.allowed) {
    const reason = writeAccess.reason === 'plan_required' ? 'free_plan'
      : writeAccess.reason === 'entitlement_unavailable' ? 'entitlement_unavailable' : 'permission_denied';
    return NextResponse.json({ canManage: false, canDelete: isProductCoverPhotoDeleteEnabled(), reason },
      { headers: { 'Cache-Control': 'no-store' } });
  }
  const entitlementRequired = isProductCoverPhotoEntitlementRequired();
  const planAccess = await resolveProductCoverPhotoPlanAccess({
    actorId: auth.actor.actorId,
    ownerId: access.ownerId,
    entitlementRequired,
    repository: entitlementRequired ? createAccountCapabilityRepository() : null,
    nowMs: Date.now(),
  });
  const uploadEnabled = isProductCoverPhotoUploadEnabled();
  const canManage = planAccess.allowed && uploadEnabled;
  const reason = !planAccess.allowed
    ? planAccess.reason
    : uploadEnabled
      ? planAccess.reason
      : 'runtime_disabled';
  return NextResponse.json({
    canManage,
    canDelete: isProductCoverPhotoDeleteEnabled(),
    reason,
  }, { headers: { 'Cache-Control': 'no-store' } });
}


const allowedMethods = ['GET', 'OPTIONS'] as const;
export const GET = (request: Request) => runAppApiWithCors(request, () => handleGET(request), { allowedMethods });
export const OPTIONS = (request: Request) => createAppApiCorsPreflightResponse(request, { allowedMethods });
