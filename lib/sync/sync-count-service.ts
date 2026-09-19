import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase/client';

/**
 * Count local events waiting to be uploaded.
 */
export async function getLocalPendingCount(): Promise<number> {
  try {
    return await db.events
      .where('sync_status')
      .anyOf(['pending', 'local_only'])
      .count();
  } catch {
    return 0;
  }
}

/**
 * Count cloud events visible to the current owner/member scope.
 */
export async function getCloudEventCount(userId: string): Promise<number> {
  try {
    const { data: memberMarkets } = await supabase
      .from('market_members')
      .select('market_id')
      .eq('user_id', userId);

    const marketIds = memberMarkets?.map(m => m.market_id) || [];

    let query = supabase
      .from('events')
      .select('id', { count: 'exact', head: true });

    if (marketIds.length > 0) {
      query = query.or(`market_id.in.(${marketIds.join(',')}),and(actor_id.eq.${userId},market_id.is.null)`);
    } else {
      query = query.eq('actor_id', userId).is('market_id', null);
    }

    const { count } = await query;
    return count || 0;
  } catch {
    return 0;
  }
}
