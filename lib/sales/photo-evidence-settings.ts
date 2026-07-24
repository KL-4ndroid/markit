import { getUserSettings, saveUserSettings } from '@/lib/supabase/settings';

export function normalizeSalesPhotoEvidenceRequired(value: unknown): boolean {
  return value === true;
}

export async function loadDefaultSalesPhotoEvidenceRequired(ownerId: string): Promise<boolean> {
  if (!ownerId) return false;

  const settings = await getUserSettings(ownerId);
  return normalizeSalesPhotoEvidenceRequired(settings?.default_sales_photo_evidence_required);
}

export async function saveDefaultSalesPhotoEvidenceRequired(
  ownerId: string,
  required: boolean
): Promise<boolean> {
  if (!ownerId) {
    throw new Error('owner id is required');
  }

  const normalized = normalizeSalesPhotoEvidenceRequired(required);
  await saveUserSettings(ownerId, {
    default_sales_photo_evidence_required: normalized,
  });

  return normalized;
}
