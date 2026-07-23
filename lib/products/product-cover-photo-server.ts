import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createProductCoverPhotoServiceClient(env: Record<string, string | undefined> = process.env): SupabaseClient | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
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
  const { data: entitlement } = await client.from('account_entitlements')
    .select('product_cover_photo_enabled').eq('owner_id', ownerId).maybeSingle();
  return { ownerId, canEdit, paid: entitlement?.product_cover_photo_enabled === true };
}
