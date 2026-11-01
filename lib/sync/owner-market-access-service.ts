import { supabase } from '@/lib/supabase/client';
import { readCloudPages } from './bounded-cloud-reading';

/**
 * Get all market IDs an owner can pull events for.
 *
 * Owner-owned markets are included directly because a fresh device may not have
 * a corresponding market_members row for the owner yet.
 */
export async function getOwnerAccessibleMarketIds(userId: string, assertActive: () => void = () => undefined): Promise<string[]> {
  const [memberMarkets, ownedMarkets] =
    await Promise.all([
      readCloudPages(async (start, end) => {
        const { data, error } = await supabase.from('market_members').select('market_id').eq('user_id', userId).order('market_id').range(start, end);
        if (error) throw error;
        return data ?? [];
      }, { concurrency: 1, assertActive }),
      readCloudPages(async (start, end) => {
        const { data, error } = await supabase.from('owner_accessible_markets').select('id').eq('owner_id', userId).order('id').range(start, end);
        if (error) throw error;
        return data ?? [];
      }, { concurrency: 1, assertActive }),
    ]);

  const memberIds = (memberMarkets || []).map(m => m.market_id).filter(Boolean);
  const ownedIds = (ownedMarkets || []).map(m => m.id).filter(Boolean);

  return Array.from(new Set([...memberIds, ...ownedIds]));
}
