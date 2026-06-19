import { db } from '@/lib/db';
import { recordEvent } from '@/lib/db/events';
import { getDeletedEventIds } from '@/lib/db/event-tombstones';
import { timestampToLocalDateString } from '@/lib/time-utils';
import {
  getDealEventCost,
  getDealEventCount,
  getDealEventDate,
  getDealEventRevenue,
  getDealItemPrice,
  getDealItemCost,
  getDealItemProductId,
  getDealItemQuantity,
  getDealItems,
  getEventMarketId,
  getInteractionType,
  isManualDealEvent,
} from '@/lib/events/event-read-model';
import type {
  DailyStats,
  DealClosedPayload,
  Event,
  InteractionRecordedPayload,
} from '@/types/db';

export interface DeleteEventResult {
  deletedEventId: string;
  marketId: string;
}

export interface DeleteDealResult extends DeleteEventResult {
  totalAmount: number;
  totalCost: number;
  dealCount: number;
  dealDate: string;
  productsSold: DailyStats['productsSold'];
}

export interface DeleteEventPermissionOptions {
  allowDelete?: boolean;
  ownActorId?: string;
  now?: number;
}

export type ProductCostResolver = (productId: string) => Promise<number | undefined>;
export type EventRecorder = typeof recordEvent;

export function assertEventDeletionAllowed(options?: DeleteEventPermissionOptions): void {
  if (options?.allowDelete !== true) {
    throw new Error('Event deletion is not allowed for this context');
  }
}

export function assertOwnEventDeletionAllowed(
  event: Pick<Event, 'actor_id' | 'timestamp'>,
  options?: DeleteEventPermissionOptions
): void {
  if (!options?.ownActorId) return;
  if (event.actor_id !== options.ownActorId) {
    throw new Error('Only the creator can delete this event');
  }

  const today = timestampToLocalDateString(options.now ?? Date.now());
  const eventDate = timestampToLocalDateString(event.timestamp);
  if (eventDate !== today) {
    throw new Error('Only same-day events can be deleted by the creator');
  }
}

export function assertEventCanBeDeleted(eventId: string | undefined, deletedEventIds: Set<string>): string {
  if (!eventId) {
    throw new Error('Cannot delete an event without an event id');
  }

  if (deletedEventIds.has(eventId)) {
    throw new Error(`Event already deleted: ${eventId}`);
  }

  return eventId;
}

async function assertNotAlreadyDeleted(eventId: string): Promise<void> {
  const deletedEventIds = await getDeletedEventIds();
  assertEventCanBeDeleted(eventId, deletedEventIds);
}

async function getStoredProductCost(productId: string): Promise<number | undefined> {
  const product = await db.products.get(productId);
  return product?.cost;
}

export async function resolveDealDeletionResult(
  event: Event<DealClosedPayload>,
  resolveProductCost: ProductCostResolver = getStoredProductCost
): Promise<DeleteDealResult> {
  if (!event.id) {
    throw new Error('Cannot delete a deal event without an event id');
  }

  const marketId = getEventMarketId(event);
  if (!marketId) {
    throw new Error(`Deal event is missing market_id: ${event.id}`);
  }

  const totalAmount = getDealEventRevenue(event);
  let totalCost = getDealEventCost(event);
  const dealCount = getDealEventCount(event);
  const productsSold: DailyStats['productsSold'] = [];

  const items = getDealItems(event);
  if (!isManualDealEvent(event) && items.length > 0) {
    totalCost = 0;
    for (const item of items) {
      const productId = getDealItemProductId(item);
      if (!productId) continue;

      const itemCost = getDealItemCost(item);
      const cost = itemCost > 0 ? itemCost : await resolveProductCost(productId) ?? 0;
      const quantity = getDealItemQuantity(item);
      const price = getDealItemPrice(item);
      totalCost += cost * quantity;
      productsSold.push({
        productId,
        quantity,
        revenue: price * quantity,
      });
    }
  }

  return {
    deletedEventId: event.id,
    marketId,
    totalAmount,
    totalCost,
    dealCount,
    dealDate: getDealEventDate(event),
    productsSold,
  };
}

export async function deleteDealEvent(
  event: Event<DealClosedPayload>,
  options?: DeleteEventPermissionOptions
): Promise<DeleteDealResult> {
  assertEventDeletionAllowed(options);

  const result = await resolveDealDeletionResult(event);
  await assertNotAlreadyDeleted(result.deletedEventId);

  await recordDealDeletedEvent(result);

  return result;
}

export async function recordDealDeletedEvent(
  result: DeleteDealResult,
  recorder: EventRecorder = recordEvent
): Promise<void> {
  await recorder('deal_deleted', {
    eventId: result.deletedEventId,
    market_id: result.marketId,
    marketId: result.marketId,
    dealDate: result.dealDate,
    totalAmount: result.totalAmount,
    totalCost: result.totalCost,
    dealCount: result.dealCount,
    productsSold: result.productsSold,
  });
}

export async function deleteDealEventById(
  eventId: string,
  options?: DeleteEventPermissionOptions
): Promise<DeleteDealResult> {
  assertEventDeletionAllowed(options);

  if (!eventId) {
    throw new Error('Cannot delete a deal event without an event id');
  }

  const event = await db.events.get(eventId) as Event<DealClosedPayload> | undefined;
  if (!event) {
    throw new Error(`Deal event not found: ${eventId}`);
  }
  if (event.type !== 'deal_closed') {
    throw new Error(`Event is not a deal_closed event: ${eventId}`);
  }
  assertOwnEventDeletionAllowed(event, options);

  return deleteDealEvent(event, options);
}

export async function deleteInteractionEvent(
  event: Event<InteractionRecordedPayload>,
  options?: DeleteEventPermissionOptions
): Promise<DeleteEventResult> {
  assertEventDeletionAllowed(options);

  if (!event.id) {
    throw new Error('Cannot delete an interaction event without an event id');
  }

  const marketId = getEventMarketId(event);
  if (!marketId) {
    throw new Error(`Interaction event is missing market_id: ${event.id}`);
  }

  await assertNotAlreadyDeleted(event.id);

  await recordEvent('interaction_deleted', {
    eventId: event.id,
    market_id: marketId,
    interactionType: getInteractionType(event) ?? 'unknown',
  });

  return {
    deletedEventId: event.id,
    marketId,
  };
}

export async function deleteInteractionEventById(
  eventId: string,
  options?: DeleteEventPermissionOptions
): Promise<DeleteEventResult> {
  assertEventDeletionAllowed(options);

  if (!eventId) {
    throw new Error('Cannot delete an interaction event without an event id');
  }

  const event = await db.events.get(eventId) as Event<InteractionRecordedPayload> | undefined;
  if (!event) {
    throw new Error(`Interaction event not found: ${eventId}`);
  }
  if (event.type !== 'interaction_recorded') {
    throw new Error(`Event is not an interaction_recorded event: ${eventId}`);
  }
  assertOwnEventDeletionAllowed(event, options);

  return deleteInteractionEvent(event, options);
}
