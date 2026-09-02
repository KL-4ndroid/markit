'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export function useOwnerRecurringOperations(ownerId: string | null) {
  return useLiveQuery(async () => {
    if (!ownerId) return { venues: [], schedules: [], error: null };
    try {
      const [venues, schedules] = await Promise.all([
        db.venues.where('owner_id').equals(ownerId).toArray(),
        db.operationSchedules.where('owner_id').equals(ownerId).toArray(),
      ]);
      return {
        venues: venues.filter(venue => !venue.isDeleted),
        schedules: schedules.sort((a, b) => b.updatedAt - a.updatedAt),
        error: null,
      };
    } catch (error) {
      return {
        venues: [],
        schedules: [],
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }, [ownerId]);
}
