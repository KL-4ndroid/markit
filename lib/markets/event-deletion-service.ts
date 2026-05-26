import { db } from '@/lib/db';
import { recordEvent } from '@/lib/db/events';
import { getDeletedEventIds } from '@/lib/db/event-tombstones';
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

function formatLocalDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

async function assertNotAlreadyDeleted(eventId: string): Promise<void> {
  const deletedEventIds = await getDeletedEventIds();
  if (deletedEventIds.has(eventId)) {
    throw new Error(`Event already deleted: ${eventId}`);
  }
}

async function resolveDealDeletionResult(event: Event<DealClosedPayload>): Promise<DeleteDealResult> {
  if (!event.id) {
    throw new Error('Cannot delete a deal event without an event id');
  }

  const payload = event.payload;
  const marketId = payload.market_id;
  if (!marketId) {
    throw new Error(`Deal event is missing market_id: ${event.id}`);
  }

  let totalAmount = payload.totalAmount;
  let totalCost = 0;
  let dealCount = 1;
  const productsSold: DailyStats['productsSold'] = [];

  if (payload.isManualEntry) {
    totalAmount = payload.manualRevenue ?? 0;
    totalCost = payload.manualCost ?? 0;
    dealCount = payload.manualDealCount ?? 1;
  } else if (payload.items) {
    for (const item of payload.items) {
      const product = await db.products.get(item.productId);
      const cost = item.cost_at_time_of_sale ?? product?.cost ?? 0;
      totalCost += cost * item.quantity;
      productsSold.push({
        productId: item.productId,
        quantity: item.quantity,
        revenue: (item.price_at_time_of_sale ?? item.price) * item.quantity,
      });
    }
  }

  return {
    deletedEventId: event.id,
    marketId,
    totalAmount,
    totalCost,
    dealCount,
    dealDate: payload.dealDate ?? formatLocalDate(event.timestamp),
    productsSold,
  };
}

export async function deleteDealEvent(event: Event<DealClosedPayload>): Promise<DeleteDealResult> {
  const result = await resolveDealDeletionResult(event);
  await assertNotAlreadyDeleted(result.deletedEventId);

  await recordEvent('deal_deleted', {
    eventId: result.deletedEventId,
    marketId: result.marketId,
    dealDate: result.dealDate,
    totalAmount: result.totalAmount,
    totalCost: result.totalCost,
    dealCount: result.dealCount,
    productsSold: result.productsSold,
  });

  return result;
}

export async function deleteDealEventById(eventId: string): Promise<DeleteDealResult> {
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

  return deleteDealEvent(event);
}

export async function deleteInteractionEvent(event: Event<InteractionRecordedPayload>): Promise<DeleteEventResult> {
  if (!event.id) {
    throw new Error('Cannot delete an interaction event without an event id');
  }

  const marketId = event.payload.market_id;
  if (!marketId) {
    throw new Error(`Interaction event is missing market_id: ${event.id}`);
  }

  await assertNotAlreadyDeleted(event.id);

  await recordEvent('interaction_deleted', {
    eventId: event.id,
    market_id: marketId,
    interactionType: event.payload.type,
  });

  return {
    deletedEventId: event.id,
    marketId,
  };
}

export async function deleteInteractionEventById(eventId: string): Promise<DeleteEventResult> {
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

  return deleteInteractionEvent(event);
}
