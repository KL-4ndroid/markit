import type { DealClosedPayload, Event, InteractionRecordedPayload } from '@/types/db';
import { db } from './index';

type DeletedEventPayload = {
  eventId: string;
};

export async function getDeletedEventIds(): Promise<Set<string>> {
  const deletedEvents = await db.events
    .where('type')
    .anyOf(['interaction_deleted', 'deal_deleted'])
    .toArray() as Event<DeletedEventPayload>[];

  return new Set(
    deletedEvents
      .map(event => event.payload?.eventId)
      .filter((eventId): eventId is string => typeof eventId === 'string' && eventId.length > 0)
  );
}

export function withoutDeletedEvents<T extends Event>(
  events: T[],
  deletedEventIds: Set<string>
): T[] {
  return events.filter(event => !event.id || !deletedEventIds.has(event.id));
}

export async function getActiveInteractionEvents(): Promise<Event<InteractionRecordedPayload>[]> {
  const [events, deletedEventIds] = await Promise.all([
    db.events.where('type').equals('interaction_recorded').toArray() as Promise<Event<InteractionRecordedPayload>[]>,
    getDeletedEventIds(),
  ]);

  return withoutDeletedEvents(events, deletedEventIds);
}

export async function getActiveDealEvents(): Promise<Event<DealClosedPayload>[]> {
  const [events, deletedEventIds] = await Promise.all([
    db.events.where('type').equals('deal_closed').toArray() as Promise<Event<DealClosedPayload>[]>,
    getDeletedEventIds(),
  ]);

  return withoutDeletedEvents(events, deletedEventIds);
}
