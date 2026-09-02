import {
  finiteNumber,
  getDealItemProductId,
  getDealItemProductName,
  getDealItems,
  getEventMarketId,
  isManualDealEvent,
} from '@/lib/events/event-read-model';
import type { DealClosedPayload, Event } from '@/types/db';

export interface BasicProductRankingResult {
  productName: string;
  quantity: number;
}

export type BasicProductNameResolver = (productId: string) => Promise<string | undefined>;

export async function calculateBasicProductRankingFromEvents(
  events: Array<Event<DealClosedPayload>>,
  marketIds: Set<string>,
  resolveProductName: BasicProductNameResolver,
): Promise<BasicProductRankingResult | null> {
  if (marketIds.size === 0) return null;

  const quantities = new Map<string, BasicProductRankingResult>();

  for (const event of events) {
    const marketId = getEventMarketId(event);
    if (!marketId || !marketIds.has(marketId) || isManualDealEvent(event)) continue;

    for (const item of getDealItems(event)) {
      const productId = getDealItemProductId(item);
      if (!productId) continue;

      let productName = getDealItemProductName(item);
      if (productName === productId || productName === '商品') {
        productName = await resolveProductName(productId) ?? productName;
      }
      if (!productName) continue;

      const quantity = finiteNumber(item.quantity);
      const current = quantities.get(productId);
      if (current) {
        current.quantity += quantity;
      } else {
        quantities.set(productId, { productName, quantity });
      }
    }
  }

  const ranking = Array.from(quantities.values());
  if (ranking.length === 0) return null;
  return ranking.reduce((top, item) => item.quantity > top.quantity ? item : top);
}
