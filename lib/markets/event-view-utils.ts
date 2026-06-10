import type { DealClosedPayload, Event } from '@/types/db';

type MarketScopedPayload = {
  market_id?: string;
  marketId?: string;
};

type DealDatePayload = {
  dealDate?: string;
  deal_date?: string;
};

type DealAmountPayload = {
  manualRevenue?: number;
  manual_revenue?: number;
  totalAmount?: number;
  total_amount?: number;
};

type DealPaymentPayload = {
  paymentMethod?: DealClosedPayload['paymentMethod'];
  payment_method?: DealClosedPayload['paymentMethod'];
};

type DealItemView = DealClosedPayload['items'][number] & {
  product_id?: string;
  productName?: string;
  product_name?: string;
  price_at_time_of_sale?: number;
};

export function getEventMarketId(event: Pick<Event, 'market_id' | 'payload'>): string | undefined {
  const payload = event.payload as MarketScopedPayload | undefined;
  return event.market_id ?? payload?.market_id ?? payload?.marketId;
}

export function getLocalDateStringFromTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getDealEventDate(event: Event<DealClosedPayload>): string {
  const payload = event.payload as DealClosedPayload & DealDatePayload;
  return payload.dealDate ?? payload.deal_date ?? getLocalDateStringFromTimestamp(event.timestamp);
}

export function getDealEventRevenue(event: Event<DealClosedPayload>): number {
  const payload = event.payload as DealClosedPayload & DealAmountPayload;
  return finiteNumber(
    payload.manualRevenue ??
      payload.manual_revenue ??
      payload.totalAmount ??
      payload.total_amount
  );
}

export function getDealPaymentMethod(event: Event<DealClosedPayload>): DealClosedPayload['paymentMethod'] {
  const payload = event.payload as DealClosedPayload & DealPaymentPayload;
  return payload.paymentMethod ?? payload.payment_method ?? 'other';
}

export function getDealItems(event: Event<DealClosedPayload>): DealItemView[] {
  const payload = event.payload as DealClosedPayload;
  return Array.isArray(payload.items) ? payload.items as DealItemView[] : [];
}

export function getDealItemProductName(item: DealItemView): string {
  return item.product_name ?? item.productName ?? item.productId ?? item.product_id ?? '商品';
}

export function getDealItemRevenue(item: DealItemView): number {
  const quantity = finiteNumber(item.quantity);
  const price = finiteNumber(item.price_at_time_of_sale ?? item.price);
  return price * quantity;
}

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
