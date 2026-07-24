import type { DealClosedPayload, Event } from '@/types/db';

export type EventLike = {
  id?: string;
  type?: string;
  payload?: any;
  market_id?: string;
  timestamp?: string | number;
};

export type DealItemLike = DealClosedPayload['items'][number] & {
  cost?: number;
  costAtTimeOfSale?: number;
  cost_at_time_of_sale?: number;
  priceAtTimeOfSale?: number;
  price_at_time_of_sale?: number;
  product_id?: string;
  productName?: string;
  product_name?: string;
};

export function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function getLocalDateStringFromTimestamp(timestamp: string | number | undefined): string | undefined {
  if (timestamp === undefined) return undefined;

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getEventMarketId(event: Pick<EventLike, 'market_id' | 'payload'>): string | undefined {
  return event.market_id ?? event.payload?.market_id ?? event.payload?.marketId;
}

export function getPayloadPreferredEventMarketId(event: Pick<EventLike, 'market_id' | 'payload'>): string | undefined {
  return event.payload?.market_id ?? event.payload?.marketId ?? event.market_id;
}

export function getTombstoneTargetEventId(event: Pick<EventLike, 'payload'>): string | undefined {
  return event.payload?.eventId ?? event.payload?.event_id;
}

export function getDealEventDate(event: EventLike): string {
  // For deletion tombstones, prefer the stored dealDate to avoid using the deletion
  // timestamp (which reflects when the delete was recorded, not the original deal date).
  // Only fall back to timestamp when dealDate is genuinely absent — e.g. a Cloud
  // tombstone created before this fix was applied.
  if (event.type === 'deal_deleted' || event.type === 'interaction_deleted') {
    return (
      event.payload?.dealDate ??
      event.payload?.deal_date ??
      getLocalDateStringFromTimestamp(event.timestamp) ??
      ''
    );
  }
  return (
    event.payload?.dealDate ??
    event.payload?.deal_date ??
    getLocalDateStringFromTimestamp(event.timestamp) ??
    ''
  );
}

export function getDealEventRevenue(event: EventLike): number {
  const payload = event.payload ?? {};
  const directRevenue =
    payload.manualRevenue ??
    payload.manual_revenue ??
    payload.totalAmount ??
    payload.total_amount;

  if (typeof directRevenue === 'number' && Number.isFinite(directRevenue)) {
    return directRevenue;
  }

  if (Array.isArray(payload.items)) {
    return payload.items.reduce((sum: number, item: DealItemLike) => {
      return sum + getDealItemRevenue(item);
    }, 0);
  }

  return 0;
}

export function getDealEventCost(event: EventLike): number {
  const payload = event.payload ?? {};
  const directCost =
    payload.manualCost ??
    payload.manual_cost ??
    payload.totalCost ??
    payload.total_cost;

  if (typeof directCost === 'number' && Number.isFinite(directCost)) {
    return directCost;
  }

  if (Array.isArray(payload.items)) {
    return payload.items.reduce((sum: number, item: DealItemLike) => {
      return sum + getDealItemCost(item) * finiteNumber(item.quantity);
    }, 0);
  }

  return 0;
}

export function getDealEventCount(event: EventLike): number {
  const payload = event.payload ?? {};
  return finiteNumber(
    payload.manualDealCount ??
      payload.manual_deal_count ??
      payload.dealCount ??
      payload.deal_count,
    1
  );
}

export function getInteractionType(event: EventLike): string | undefined {
  const interactionType = event.payload?.interactionType ?? event.payload?.interaction_type ?? event.payload?.type;
  return typeof interactionType === 'string' && interactionType.trim().length > 0
    ? interactionType
    : undefined;
}

export function getDealPaymentMethod(event: EventLike): DealClosedPayload['paymentMethod'] {
  return event.payload?.paymentMethod ?? event.payload?.payment_method ?? 'other';
}

export function getDealNotes(event: EventLike): string | undefined {
  const notes = event.payload?.notes;
  return typeof notes === 'string' && notes.trim().length > 0 ? notes : undefined;
}

export function getDealItems(event: EventLike): DealItemLike[] {
  return Array.isArray(event.payload?.items) ? event.payload.items as DealItemLike[] : [];
}

export function getDealItemProductId(item: DealItemLike): string | undefined {
  return item.productId ?? item.product_id;
}

export function getDealItemProductName(item: DealItemLike): string {
  return item.product_name ?? item.productName ?? getDealItemProductId(item) ?? '商品';
}

export function getDealItemPrice(item: DealItemLike): number {
  return finiteNumber(item.price_at_time_of_sale ?? item.priceAtTimeOfSale ?? item.price);
}

export function getDealItemCost(item: DealItemLike): number {
  return finiteNumber(item.cost_at_time_of_sale ?? item.costAtTimeOfSale ?? item.cost);
}

export function getDealItemQuantity(item: DealItemLike): number {
  return finiteNumber(item.quantity);
}

export function getDealItemRevenue(item: DealItemLike): number {
  return getDealItemPrice(item) * getDealItemQuantity(item);
}

export function isManualDealEvent(event: EventLike): boolean {
  return event.payload?.isManualEntry === true || event.payload?.is_manual_entry === true;
}

export function isBackfillDealEvent(event: EventLike): boolean {
  return event.payload?.isBackfill === true || event.payload?.is_backfill === true;
}

export function isDealClosedEvent(event: EventLike): event is Event<DealClosedPayload> {
  return event.type === 'deal_closed';
}
