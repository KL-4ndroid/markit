import { canonicalizeEvent } from '@/lib/db/data-canonicalization';
import type { Event } from '@/types/db';

export function createCanonicalSyncedEvent(rawEvent: Record<string, unknown>): Event {
  const localEvent = {
    id: rawEvent.id as string,
    type: rawEvent.type as Event['type'],
    payload: rawEvent.payload as Event['payload'],
    actor_id: rawEvent.actor_id as string | undefined,
    market_id: rawEvent.market_id as string | undefined,
    timestamp: new Date(rawEvent.timestamp as string).getTime(),
    sync_status: 'synced',
    metadata: rawEvent.metadata as Event['metadata'],
  } as Event;

  return canonicalizeEvent(localEvent).event;
}
