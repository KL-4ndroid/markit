'use client';

import { supabase } from '@/lib/supabase/client';
import type {
  PreparedProductCoverPhoto,
  ProductCoverPhotoCapability,
  ProductCoverPhotoCapabilityReason,
} from './product-cover-photo-model';

const CAPABILITY_REASONS: ReadonlySet<ProductCoverPhotoCapabilityReason> = new Set([
  'open_access',
  'paid_active',
  'free_plan',
  'subscription_inactive',
  'entitlement_unavailable',
  'permission_denied',
  'runtime_disabled',
  'authentication_required',
  'unavailable',
]);

function isCapabilityReason(value: unknown): value is ProductCoverPhotoCapabilityReason {
  return typeof value === 'string'
    && CAPABILITY_REASONS.has(value as ProductCoverPhotoCapabilityReason);
}

async function token(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('authentication_required');
  return data.session.access_token;
}

export async function getProductCoverPhotoCapability(productId?: string): Promise<ProductCoverPhotoCapability> {
  try {
    const accessToken = await token();
    const query = productId ? `?productId=${encodeURIComponent(productId)}` : '';
    const response = await fetch(`/api/product-cover-photo/capability${query}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
    const body = await response.json().catch(() => null) as Partial<ProductCoverPhotoCapability> | null;
    if (
      body
      && typeof body.canManage === 'boolean'
      && typeof body.canDelete === 'boolean'
      && isCapabilityReason(body.reason)
    ) {
      return {
        canManage: body.canManage,
        canDelete: body.canDelete,
        reason: body.reason,
      };
    }
    return { canManage: false, canDelete: false, reason: 'unavailable' };
  } catch {
    return { canManage: false, canDelete: false, reason: 'unavailable' };
  }
}

export async function uploadProductCoverPhoto(productId: string, photo: PreparedProductCoverPhoto, version = Date.now()) {
  const accessToken = await token();
  const form = new FormData();
  form.set('productId', productId); form.set('photoId', crypto.randomUUID()); form.set('version', String(version));
  form.set('width', String(photo.width)); form.set('height', String(photo.height));
  form.set('display', photo.display, 'display.webp'); form.set('thumbnail', photo.thumbnail, 'thumbnail.webp');
  const response = await fetch('/api/product-cover-photo/upload', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.code || 'upload_failed');
  return response.json();
}

export async function deleteProductCoverPhoto(productId: string): Promise<void> {
  const accessToken = await token();
  const response = await fetch(`/api/product-cover-photo?productId=${encodeURIComponent(productId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) throw new Error('delete_failed');
}

export async function fetchProductCoverPhoto(productId: string, variant: 'display' | 'thumbnail'): Promise<string | null> {
  try {
    const accessToken = await token();
    const response = await fetch(`/api/product-cover-photo/image?productId=${encodeURIComponent(productId)}&variant=${variant}`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return null;
    return URL.createObjectURL(await response.blob());
  } catch { return null; }
}

export async function fetchProductCoverPhotoMetadata(productIds: string[]): Promise<Record<string, number>> {
  if (productIds.length === 0) return {};
  try {
    const accessToken = await token();
    const response = await fetch('/api/product-cover-photo/metadata', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: productIds.slice(0, 100) }),
      cache: 'no-store',
    });
    if (!response.ok) return {};
    const body = await response.json() as { photos?: Record<string, number> };
    return body.photos ?? {};
  } catch {
    return {};
  }
}
