import { getUserSettings, saveUserSettings } from '@/lib/supabase/settings';

export const OWNER_BRAND_NAME_FALLBACK = '我的品牌';
export const OWNER_BRAND_NAME_UPDATED_EVENT = 'owner-brand-name-updated';
export const OWNER_BRAND_NAME_MAX_LENGTH = 40;

export function normalizeOwnerBrandName(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, OWNER_BRAND_NAME_MAX_LENGTH);

  return normalized.length > 0 ? normalized : null;
}

export function getOwnerBrandNameDisplay(value: unknown): string {
  return normalizeOwnerBrandName(value) ?? OWNER_BRAND_NAME_FALLBACK;
}

export function getOwnerBrandNameCacheKey(ownerId: string): string {
  return `owner_brand_name:${ownerId}`;
}

export function readCachedOwnerBrandName(ownerId: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return normalizeOwnerBrandName(window.localStorage.getItem(getOwnerBrandNameCacheKey(ownerId)));
  } catch {
    return null;
  }
}

export function cacheOwnerBrandName(ownerId: string, brandName: string): void {
  if (typeof window === 'undefined') return;

  const normalized = normalizeOwnerBrandName(brandName);
  if (!normalized) return;

  try {
    window.localStorage.setItem(getOwnerBrandNameCacheKey(ownerId), normalized);
    window.dispatchEvent(new CustomEvent(OWNER_BRAND_NAME_UPDATED_EVENT, {
      detail: { ownerId, brandName: normalized },
    }));
  } catch {
    // Brand name cache is a convenience only; cloud settings remain the source.
  }
}

export async function loadOwnerBrandName(ownerId: string): Promise<string> {
  const settings = await getUserSettings(ownerId);
  const cloudBrandName = normalizeOwnerBrandName(settings?.brand_name);

  if (cloudBrandName) {
    cacheOwnerBrandName(ownerId, cloudBrandName);
    return cloudBrandName;
  }

  return readCachedOwnerBrandName(ownerId) ?? OWNER_BRAND_NAME_FALLBACK;
}

export async function saveOwnerBrandName(ownerId: string, value: string): Promise<string> {
  const brandName = normalizeOwnerBrandName(value);
  if (!brandName) {
    throw new Error('品牌名稱不可空白');
  }

  await saveUserSettings(ownerId, { brand_name: brandName });
  cacheOwnerBrandName(ownerId, brandName);
  return brandName;
}
