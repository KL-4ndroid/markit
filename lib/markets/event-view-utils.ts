import type { DealClosedPayload, Event } from '@/types/db';

type MarketScopedPayload = {
  market_id?: string;
  marketId?: string;
};

type DealDatePayload = {
  dealDate?: string;
  deal_date?: string;
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
