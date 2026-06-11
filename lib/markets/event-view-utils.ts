import {
  getDealEventDate,
  getDealEventCount,
  getDealEventRevenue,
  getDealItemProductName,
  getDealItemRevenue,
  getDealItems,
  getDealPaymentMethod,
  getEventMarketId,
  getInteractionType,
  getLocalDateStringFromTimestamp as getOptionalLocalDateStringFromTimestamp,
  isManualDealEvent,
} from '@/lib/events/event-read-model';

export {
  getDealEventDate,
  getDealEventCount,
  getDealEventRevenue,
  getDealItemProductName,
  getDealItemRevenue,
  getDealItems,
  getDealPaymentMethod,
  getEventMarketId,
  getInteractionType,
  isManualDealEvent,
};

export function getLocalDateStringFromTimestamp(timestamp: number): string {
  return getOptionalLocalDateStringFromTimestamp(timestamp) ?? '';
}
