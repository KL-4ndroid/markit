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

/** Owner reads/deletion retain existing behavior until the downgrade policy is decided.
 * Foreign-workspace access always requires an active relationship AND a High owner. */
export async function resolveProductCoverPhotoOwnerAccess(client: SupabaseClient, actorId: string, ownerId: string) {
  if (ownerId === actorId) return { ownerId, canEdit: true };
  const { data: relationship, error } = await client.from('staff_relationships').select('role,status')
    .eq('owner_id', ownerId).eq('staff_id', actorId).eq('status', 'active').maybeSingle();
  if (error || !relationship || relationship.status !== 'active'
    || !['manager', 'operator', 'viewer'].includes(relationship.role)) return null;
  const resolution = await resolveServerAccountCapabilities({
    actorId, ownerId, nowMs: Date.now(),
    repository: {
      async readForActor() {
        const { data, error: rpcError } = await client.rpc('read_subscription_account_for_actor', {
          p_actor_id: actorId, p_owner_id: ownerId,
        });
        if (rpcError) throw new Error('product_photo_owner_capability_unavailable');
        const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
        if (!row || row.access_allowed !== true || row.owner_id !== ownerId) return { access: 'forbidden' };
        return { access: 'allowed', account: row.account_exists === true ? {
          ownerId: row.owner_id, planCode: row.plan_code, planSource: row.plan_source,
          billingStatus: row.billing_status, entitlementStatus: row.entitlement_status,
          entitlementEndsAt: row.entitlement_ends_at, updatedAt: row.updated_at,
        } : null };
      },
    },
  });
  if (resolution.outcome !== 'available') return null;
  const decision = evaluateCapabilityAccess({
    authenticated: true, ownerWorkspaceAvailable: true, workspaceOwnerId: ownerId, requestedOwnerId: ownerId,
    actorRole: relationship.role, rolePermission: true, capabilities: resolution.response.capabilities,
    feature: 'staffCollaboration', operation: 'read_existing', runtimeEnabled: true, dataReady: true,
    nowMs: Date.now(), network: 'online',
  });
  return decision.allowed ? { ownerId, canEdit: relationship.role === 'manager' } : null;
}

export async function resolveProductCoverPhotoAccess(client: SupabaseClient, actorId: string, productId?: string | null) {
  if (!productId) return { ownerId: actorId, canEdit: true };
  const { data: product, error } = await client.from('products').select('id,owner_id,is_active').eq('id', productId).maybeSingle();
  if (error || !product || product.is_active !== true) return null;
  return resolveProductCoverPhotoOwnerAccess(client, actorId, String(product.owner_id));
}
