import {
  getDealEventDate,
  getDealEventCount,
  getDealEventRevenue,
  getDealNotes,
  getDealItemProductName,
  getDealItemQuantity,
  getDealItemRevenue,
  getDealItems,
  getDealPaymentMethod,
  getEventMarketId,
  getInteractionType,
  getLocalDateStringFromTimestamp as getOptionalLocalDateStringFromTimestamp,
  isBackfillDealEvent,
  isManualDealEvent,
  isDealClosedEvent,
} from '@/lib/events/event-read-model';
import type { Event } from '@/types/db';

export function countDealRecordsByDate(events: readonly Event[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) {
    if (!isDealClosedEvent(event)) continue;
    const date = getDealEventDate(event);
    if (date) counts[date] = (counts[date] ?? 0) + 1;
  }
  return counts;
}

export {
  getDealEventDate,
  getDealEventCount,
  getDealEventRevenue,
  getDealNotes,
  getDealItemProductName,
  getDealItemQuantity,
  getDealItemRevenue,
  getDealItems,
  getDealPaymentMethod,
  getEventMarketId,
  getInteractionType,
  isBackfillDealEvent,
  isManualDealEvent,
};

export function getLocalDateStringFromTimestamp(timestamp: number): string {
  return getOptionalLocalDateStringFromTimestamp(timestamp) ?? '';
}
