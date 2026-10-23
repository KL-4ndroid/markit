import { liveQuery, type Table } from 'dexie';
import type { Event } from '@/types/db';

/** Observe local durability independently of whether a cloud sync can run. */
export function subscribeLocalPendingCount(
  events: Table<Event, string>,
  onCount: (count: number) => void,
  onError: (error: unknown) => void,
): () => void {
  const subscription = liveQuery(() => events
    .where('sync_status')
    .anyOf(['pending', 'local_only'])
    .count()).subscribe({ next: onCount, error: onError });
  return () => subscription.unsubscribe();
}
