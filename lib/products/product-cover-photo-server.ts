import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { evaluateCapabilityAccess } from '../subscription/subscription-access';
import {
  resolveServerAccountCapabilities,
  type AccountCapabilityRepository,
} from '../subscription/account-capability-server';

export function createProductCoverPhotoServiceClient(env: Record<string, string | undefined> = process.env): SupabaseClient | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export function isProductCoverPhotoReadEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.PRODUCT_COVER_PHOTO_READ_ENABLED === '1'
    && (env.VERCEL_ENV !== 'production' || env.PRODUCT_COVER_PHOTO_READ_ALLOW_PRODUCTION === '1');
}

export function isProductCoverPhotoUploadEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.PRODUCT_COVER_PHOTO_UPLOAD_ENABLED === '1'
    && (env.VERCEL_ENV !== 'production' || env.PRODUCT_COVER_PHOTO_UPLOAD_ALLOW_PRODUCTION === '1');
}

export function isProductCoverPhotoDeleteEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.PRODUCT_COVER_PHOTO_DELETE_ENABLED === '1' && isProductCoverPhotoReadEnabled(env);
}

export function getProductCoverPhotoAccountByteLimit(env: Record<string, string | undefined> = process.env): number {
  const configured = Number(env.PRODUCT_COVER_PHOTO_MAX_ACCOUNT_BYTES);
  return Number.isSafeInteger(configured) && configured >= 750_000 ? configured : 25_000_000;
}

export function isProductCoverPhotoEntitlementRequired(env: Record<string, string | undefined> = process.env): boolean {
  return env.PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE === 'required';
}

export type ProductCoverPhotoPlanAccess =
  | { allowed: true; reason: 'open_access' | 'paid_active' }
  | {
      allowed: false;
      reason: 'free_plan' | 'subscription_inactive' | 'entitlement_unavailable';
    };

export async function resolveProductCoverPhotoPlanAccess(input: {
  actorId: string;
  ownerId: string;
  entitlementRequired: boolean;
  repository: AccountCapabilityRepository | null;
  nowMs: number;
}): Promise<ProductCoverPhotoPlanAccess> {
  if (!input.entitlementRequired) {
    return { allowed: true, reason: 'open_access' };
  }
  if (!input.repository) {
    return { allowed: false, reason: 'entitlement_unavailable' };
  }

  const resolution = await resolveServerAccountCapabilities({
    actorId: input.actorId,
    ownerId: input.ownerId,
    repository: input.repository,
    nowMs: input.nowMs,
  });
  if (resolution.outcome !== 'available') {
    return { allowed: false, reason: 'entitlement_unavailable' };
  }

  const decision = evaluateCapabilityAccess({
    authenticated: true,
    ownerWorkspaceAvailable: true,
    workspaceOwnerId: input.ownerId,
    requestedOwnerId: input.ownerId,
    actorRole: input.actorId === input.ownerId ? 'owner' : 'manager',
    rolePermission: true,
    capabilities: resolution.response.capabilities,
    feature: 'productCoverPhoto',
    operation: 'create',
    runtimeEnabled: true,
    dataReady: true,
    nowMs: input.nowMs,
    network: 'online',
  });

  if (decision.allowed) {
    return { allowed: true, reason: 'paid_active' };
  }
  if (decision.reason === 'plan_required') {
    return { allowed: false, reason: 'free_plan' };
  }
  if (
    decision.reason === 'entitlement_inactive'
    || decision.reason === 'promotion_reward_expired'
  ) {
    return { allowed: false, reason: 'subscription_inactive' };
  }
  return { allowed: false, reason: 'entitlement_unavailable' };
}

export async function resolveProductCoverPhotoAccess(client: SupabaseClient, actorId: string, productId?: string | null) {
  let ownerId = actorId;
  let canEdit = true;
  if (productId) {
    const { data: product } = await client.from('products').select('id,owner_id,is_active').eq('id', productId).maybeSingle();
    if (!product || product.is_active !== true) return null;
    ownerId = String(product.owner_id);
    canEdit = ownerId === actorId;
    if (!canEdit) {
      const { data: relationship } = await client.from('staff_relationships').select('role,status')
        .eq('owner_id', ownerId).eq('staff_id', actorId).eq('status', 'active').maybeSingle();
      canEdit = relationship?.role === 'manager';
    }
  }
  return { ownerId, canEdit };
}
