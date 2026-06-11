import {
  getDealEventDate,
  getDealEventRevenue,
  getDealItemProductName,
  getDealItemRevenue,
  getDealItems,
  getDealPaymentMethod,
  getEventMarketId,
  getLocalDateStringFromTimestamp as getOptionalLocalDateStringFromTimestamp,
} from '@/lib/events/event-read-model';

export {
  getDealEventDate,
  getDealEventRevenue,
  getDealItemProductName,
  getDealItemRevenue,
  getDealItems,
  getDealPaymentMethod,
  getEventMarketId,
};

export function getLocalDateStringFromTimestamp(timestamp: number): string {
  return getOptionalLocalDateStringFromTimestamp(timestamp) ?? '';
}
