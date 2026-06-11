import {
  finiteNumber,
  getDealItemCost,
  getDealItemPrice,
  getDealItemProductId,
  getDealItemProductName,
  getDealItems,
  getEventMarketId,
} from '@/lib/events/event-read-model';
import type { DealClosedPayload, Event } from '@/types/db';

export interface TopProductsResult {
  topByQuantity: { productName: string; quantity: number } | null;
  topByRevenue: { productName: string; revenue: number } | null;
  topByProfit: { productName: string; profit: number } | null;
}

export type ProductNameResolver = (productId: string) => Promise<string | undefined>;

type ProductStats = {
  productName: string;
  quantity: number;
  revenue: number;
  profit: number;
};

export function createEmptyTopProductsResult(): TopProductsResult {
  return {
    topByQuantity: null,
    topByRevenue: null,
    topByProfit: null,
  };
}

export async function calculateTopProductsFromEvents(
  events: Array<Event<DealClosedPayload>>,
  marketIds: Set<string>,
  resolveProductName: ProductNameResolver
): Promise<TopProductsResult> {
  if (marketIds.size === 0) return createEmptyTopProductsResult();

  const productStats = new Map<string, ProductStats>();

  for (const event of events) {
    const marketId = getEventMarketId(event);
    if (!marketId || !marketIds.has(marketId)) continue;
    if (event.payload.isManualEntry) continue;

    for (const item of getDealItems(event)) {
      const productId = getDealItemProductId(item);
      if (!productId) continue;

      let productName = getDealItemProductName(item);
      if (productName === productId || productName === '商品') {
        productName = await resolveProductName(productId) ?? productName;
      }

      if (!productName) continue;

      const quantity = finiteNumber(item.quantity);
      const price = getDealItemPrice(item);
      const cost = getDealItemCost(item);
      const revenue = price * quantity;
      const profit = (price - cost) * quantity;

      const current = productStats.get(productId);
      if (current) {
        current.quantity += quantity;
        current.revenue += revenue;
        current.profit += profit;
      } else {
        productStats.set(productId, {
          productName,
          quantity,
          revenue,
          profit,
        });
      }
    }
  }

  const productsArray = Array.from(productStats.values());
  if (productsArray.length === 0) return createEmptyTopProductsResult();

  const topByQuantity = productsArray.reduce((max, product) =>
    product.quantity > max.quantity ? product : max
  );
  const topByRevenue = productsArray.reduce((max, product) =>
    product.revenue > max.revenue ? product : max
  );
  const topByProfit = productsArray.reduce((max, product) =>
    product.profit > max.profit ? product : max
  );

  return {
    topByQuantity: {
      productName: topByQuantity.productName,
      quantity: topByQuantity.quantity,
    },
    topByRevenue: {
      productName: topByRevenue.productName,
      revenue: topByRevenue.revenue,
    },
    topByProfit: {
      productName: topByProfit.productName,
      profit: topByProfit.profit,
    },
  };
}
