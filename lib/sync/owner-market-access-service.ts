import { supabase } from '@/lib/supabase/client';

/**
 * Get all market IDs an owner can pull events for.
 *
 * Owner-owned markets are included directly because a fresh device may not have
 * a corresponding market_members row for the owner yet.
 */
export async function getOwnerAccessibleMarketIds(userId: string): Promise<string[]> {
  const [{ data: memberMarkets, error: memberError }, { data: ownedMarkets, error: ownedError }] =
    await Promise.all([
      supabase.from('market_members').select('market_id').eq('user_id', userId),
      supabase.from('markets').select('id').eq('owner_id', userId),
    ]);

  if (memberError) throw memberError;
  if (ownedError) throw ownedError;

  const memberIds = (memberMarkets || []).map(m => m.market_id).filter(Boolean);
  const ownedIds = (ownedMarkets || []).map(m => m.id).filter(Boolean);

  return Array.from(new Set([...memberIds, ...ownedIds]));
}
