import {
  finiteNumber,
  getDealEventCost,
  getDealEventCount,
  getDealEventDate,
  getDealEventRevenue,
  getDealItemProductId,
  getDealItemQuantity,
  getDealItems,
  isBackfillDealEvent,
  isManualDealEvent,
  type DealItemLike,
} from '@/lib/events/event-read-model';
import type { DailyStats, DealClosedPayload, Event, Product } from '@/types/db';

export type DealClosedMode = 'manual' | 'backfill' | 'normal';

export interface ManualDealProjection {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  dealCount: number;
}

export type ProductSnapshotForDealProjection = Pick<Product, 'id' | 'name' | 'price' | 'cost'>;

export interface DealClosedItemProjection {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  revenue: number;
  cost: number;
  productsSold?: DailyStats['productsSold'][number];
}

export interface DealClosedItemsProjection {
  items: DealClosedItemProjection[];
  totalAmount: number;
  totalCost: number;
  productsSold: DailyStats['productsSold'];
}

export function getDealClosedMode(event: Event<DealClosedPayload>): DealClosedMode {
  if (isManualDealEvent(event)) return 'manual';
  if (isBackfillDealEvent(event)) return 'backfill';
  return 'normal';
}

export function getDealClosedTransactionDate(event: Event<DealClosedPayload>): string {
  return getDealEventDate(event);
}

export function getDealClosedManualProjection(event: Event<DealClosedPayload>): ManualDealProjection {
  const revenue = getDealEventRevenue(event);
  const cost = getDealEventCost(event);

  return {
    date: getDealClosedTransactionDate(event),
    revenue,
    cost,
    profit: revenue - cost,
    dealCount: getDealEventCount(event),
  };
}

export function getDealClosedItemProjection(
  item: DealItemLike,
  product?: ProductSnapshotForDealProjection
): DealClosedItemProjection {
  const productId = getDealItemProductId(item) ?? product?.id;
  const normalizedProductId =
    typeof productId === 'string' && productId.trim().length > 0
      ? productId
      : undefined;
  const productName =
    item.product_name ??
    item.productName ??
    product?.name ??
    normalizedProductId ??
    '商品';
  const quantity = getDealItemQuantity(item);
  const unitPrice = finiteNumber(
    item.price_at_time_of_sale ??
      item.priceAtTimeOfSale ??
      item.price ??
      product?.price
  );
  const unitCost = finiteNumber(
    item.cost_at_time_of_sale ??
      item.costAtTimeOfSale ??
      item.cost ??
      product?.cost
  );
  const revenue = unitPrice * quantity;
  const cost = unitCost * quantity;

  return {
    productId: normalizedProductId,
    productName,
    quantity,
    unitPrice,
    unitCost,
    revenue,
    cost,
    productsSold: normalizedProductId
      ? {
          productId: normalizedProductId,
          quantity,
          revenue,
        }
      : undefined,
  };
}

export function getDealClosedItemsProjection(
  event: Event<DealClosedPayload>,
  productsById: Map<string, ProductSnapshotForDealProjection> = new Map()
): DealClosedItemsProjection {
  const items = getDealItems(event).map((item) => {
    const productId = getDealItemProductId(item);
    return getDealClosedItemProjection(
      item,
      productId ? productsById.get(productId) : undefined
    );
  });

  return {
    items,
    totalAmount: items.reduce((sum, item) => sum + item.revenue, 0),
    totalCost: items.reduce((sum, item) => sum + item.cost, 0),
    productsSold: items.flatMap((item) => item.productsSold ? [item.productsSold] : []),
  };
}
