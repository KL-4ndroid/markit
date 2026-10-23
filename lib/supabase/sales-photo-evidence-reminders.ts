import { supabase } from './client';
import type { SalesPhotoEvidenceAlbumSourceRow } from '@/lib/sales/photo-evidence-owner-album-read-model';

/** Complete owner-scoped metadata read; the album's first 100 rows cannot prove absence. */
export async function listOwnerSalesPhotoEvidenceReminderRows(
  ownerId: string,
  marketId: string,
  isCurrent: () => boolean
): Promise<SalesPhotoEvidenceAlbumSourceRow[]> {
  const rows: SalesPhotoEvidenceAlbumSourceRow[] = [];
  let afterId: string | null = null;
  do {
    if (!isCurrent()) throw new Error('Photo reminder scope changed');
    let query = supabase.from('sale_photo_evidence')
      .select('id,owner_id,market_id,sale_id,captured_by_staff_id,status,sale_completed_at,deleted_at')
      .eq('owner_id', ownerId).eq('market_id', marketId).is('deleted_at', null)
      .order('id', { ascending: true }).limit(500);
    if (afterId) query = query.gt('id', afterId);
    const { data, error } = await query;
    if (error) throw error;
    if (!isCurrent()) throw new Error('Photo reminder scope changed');
    const page = (data ?? []) as SalesPhotoEvidenceAlbumSourceRow[];
    rows.push(...page);
    if (page.length < 500) return rows;
    const nextId = page[page.length - 1]?.id;
    if (!nextId || (afterId && nextId <= afterId)) throw new Error('Photo reminder cursor did not advance');
    afterId = nextId;
  } while (true);
}
