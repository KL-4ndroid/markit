import {
  getDealEventCount,
  getDealEventRevenue,
  getDealItemQuantity,
  getDealItems,
  getDealPaymentMethod,
  isBackfillDealEvent,
  type EventLike,
} from '@/lib/events/event-read-model';
import { isSalesPaymentMethod, type SalesPaymentMethod } from '@/lib/sales/payment-methods';
import type { DealClosedPayload } from '@/types/db';

export type SalesTransactionSummary = {
  dealEventId: string;
  totalAmount: number;
  paymentMethod: SalesPaymentMethod;
  itemCount: number;
  itemLabel: string;
  completedAt: string;
  isBackfill: boolean;
};

export type SalesTransactionSummaryInput = Omit<DealClosedPayload, 'market_id'> & {
  market_id?: string;
  marketId?: string;
};

function normalizeCompletedAt(value: string | number | Date | null | undefined): string {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function normalizeAmount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function itemLabel(itemCount: number, manualDealCount: number, hasItems: boolean): string {
  if (hasItems) return `${itemCount} 件商品`;
  if (manualDealCount > 1) return `${manualDealCount} 筆收入`;
  return '快速收款';
}

export function buildSalesTransactionSummary(
  deal: SalesTransactionSummaryInput,
  dealEventId: string,
  completedAt?: string | number | Date | null
): SalesTransactionSummary {
  const items = Array.isArray(deal.items) ? deal.items : [];
  const itemCount = items.reduce((sum, item) => sum + Math.max(0, normalizeAmount(item.quantity)), 0);
  const manualDealCount = Math.max(1, Math.floor(normalizeAmount(deal.manualDealCount) || 1));

  return {
    dealEventId,
    totalAmount: normalizeAmount(deal.manualRevenue ?? deal.totalAmount),
    paymentMethod: isSalesPaymentMethod(deal.paymentMethod) ? deal.paymentMethod : 'other',
    itemCount: items.length > 0 ? itemCount : manualDealCount,
    itemLabel: itemLabel(itemCount, manualDealCount, items.length > 0),
    completedAt: normalizeCompletedAt(completedAt),
    isBackfill: deal.isBackfill === true,
  };
}

export function buildSalesTransactionSummaryFromEvent(
  event: EventLike | null | undefined
): SalesTransactionSummary | null {
  if (!event?.id || event.type !== 'deal_closed') return null;

  const items = getDealItems(event);
  const itemCount = items.reduce((sum, item) => sum + Math.max(0, getDealItemQuantity(item)), 0);
  const manualDealCount = Math.max(1, Math.floor(getDealEventCount(event)));

  return {
    dealEventId: event.id,
    totalAmount: getDealEventRevenue(event),
    paymentMethod: getDealPaymentMethod(event),
    itemCount: items.length > 0 ? itemCount : manualDealCount,
    itemLabel: itemLabel(itemCount, manualDealCount, items.length > 0),
    completedAt: normalizeCompletedAt(event.timestamp),
    isBackfill: isBackfillDealEvent(event),
  };
}
