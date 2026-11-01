import { db } from '@/lib/db';
import { getActiveDealEventsForMarket, getActiveInteractionEventsForMarket } from '@/lib/events/active-event-service';
import { getDealEventDate, getLocalDateStringFromTimestamp } from '@/lib/events/event-read-model';
import { readOwnerCacheReadiness } from './owner-cache-readiness';
import type { DealClosedPayload, Event, InteractionRecordedPayload } from '@/types/db';

export const EMPTY_MARKET_ACTIVITY = {
  localReady: false, historyVerified: false,
  deals: [] as Event<DealClosedPayload>[], interactions: [] as Event<InteractionRecordedPayload>[],
};

/** Observed by Dexie liveQuery, including cloud replay and deletion tombstones. */
export async function readOwnerMarketActivity(ownerId: string, marketId: string, dates: readonly string[]) {
  return db.transaction('r', [db.markets, db.settings, db.events], async () => {
    const readiness = await readOwnerCacheReadiness(db, ownerId, [marketId]);
    if (!readiness.localReady) return { ...EMPTY_MARKET_ACTIVITY, historyVerified: false };
    const [deals, interactions] = await Promise.all([
      getActiveDealEventsForMarket(marketId), getActiveInteractionEventsForMarket(marketId),
    ]);
    return { localReady: true, historyVerified: readiness.historyVerified,
      deals: deals.filter(event => dates.includes(getDealEventDate(event))),
      interactions: interactions.filter(event => dates.includes(getLocalDateStringFromTimestamp(event.timestamp) ?? '')),
    };
  });
}
