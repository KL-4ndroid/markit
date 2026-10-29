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
export async function getCloudEventCount(_userId: string): Promise<number> {
  try {
    const query = supabase
      .from('owner_accessible_events')
      .select('id', { count: 'exact', head: true });

    const { count } = await query;
    return count || 0;
  } catch {
    return 0;
  }
}
