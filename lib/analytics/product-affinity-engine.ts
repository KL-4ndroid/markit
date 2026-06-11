import type { DealClosedPayload, Event, Market } from '@/types/db';
import type { MarketPulseDB } from '@/lib/db';
import type { ProductPair } from './types';
import {
  getDealEventDate,
  getDealEventRevenue,
  getDealItemProductId,
  getDealItemProductName,
  getDealItems,
  getEventMarketId,
  isDealClosedEvent,
} from '@/lib/events/event-read-model';

type ProductNameResolver = (productId: string) => Promise<string | undefined>;

export async function calculateProductAffinity(
  markets: Market[],
  db: MarketPulseDB
): Promise<ProductPair[]> {
  const marketIds = markets.map((market) => market.id).filter((id): id is string => !!id);
  if (marketIds.length === 0) return [];

  const marketIdSet = new Set(marketIds);
  const events = (await db.events
    .where('type')
    .equals('deal_closed')
    .filter((event) => marketIdSet.has(getEventMarketId(event) ?? ''))
    .toArray()) as Array<Event<DealClosedPayload>>;

  const productIdsToFetch = new Set<string>();
  for (const event of events) {
    if (!isDealClosedEvent(event) || event.payload.isManualEntry) continue;

    const items = getDealItems(event);
    if (items.length < 2) continue;

    for (const item of items) {
      const productId = getDealItemProductId(item);
      const productName = getDealItemProductName(item);
      if (productId && productName === productId) {
        productIdsToFetch.add(productId);
      }
    }
  }

  const productMap = new Map<string, string>();
  if (productIdsToFetch.size > 0) {
    const products = await db.products
      .where('id')
      .anyOf(Array.from(productIdsToFetch))
      .toArray();

    for (const product of products) {
      if (product.id && product.name) {
        productMap.set(product.id, product.name);
      }
    }
  }

  return calculateProductAffinityFromEvents(events, marketIdSet, async (productId) => {
    return productMap.get(productId);
  });
}

export async function calculateProductAffinityFromEvents(
  events: Array<Event<DealClosedPayload>>,
  marketIds: Set<string>,
  resolveProductName: ProductNameResolver
): Promise<ProductPair[]> {
  const pairMap = new Map<string, {
    productA: string;
    productB: string;
    count: number;
  }>();
  const productCountMap = new Map<string, number>();
  let totalTransactions = 0;

  for (const event of events) {
    const marketId = getEventMarketId(event);
    if (!marketId || !marketIds.has(marketId)) continue;
    if (event.payload.isManualEntry) continue;

    const items = getDealItems(event);
    if (items.length < 2) continue;

    totalTransactions++;

    const productNames: string[] = [];
    for (const item of items) {
      const productId = getDealItemProductId(item);
      let productName = getDealItemProductName(item);

      if (productId && productName === productId) {
        productName = await resolveProductName(productId) ?? productName;
      }

      if (!productName) continue;

      productNames.push(productName);
      productCountMap.set(productName, (productCountMap.get(productName) || 0) + 1);
    }

    for (let i = 0; i < productNames.length; i++) {
      for (let j = i + 1; j < productNames.length; j++) {
        const productA = productNames[i];
        const productB = productNames[j];
        const [first, second] = productA < productB
          ? [productA, productB]
          : [productB, productA];
        const pairKey = `${first}|${second}`;
        const existing = pairMap.get(pairKey);

        if (existing) {
          existing.count++;
        } else {
          pairMap.set(pairKey, {
            productA: first,
            productB: second,
            count: 1,
          });
        }
      }
    }
  }

  if (totalTransactions === 0) return [];

  const results: ProductPair[] = Array.from(pairMap.values()).map((pair) => {
    const countA = productCountMap.get(pair.productA) || 0;
    const countB = productCountMap.get(pair.productB) || 0;
    const pairCount = pair.count;
    const probA = countA / totalTransactions;
    const probB = countB / totalTransactions;
    const probAB = pairCount / totalTransactions;
    const lift = probA * probB > 0 ? probAB / (probA * probB) : 0;
    const confidence = countA > 0 ? pairCount / countA : 0;

    return {
      productA: pair.productA,
      productB: pair.productB,
      coOccurrences: pairCount,
      confidence,
      lift,
      support: probAB,
    };
  });

  results.sort((a, b) => b.lift - a.lift);
  return results;
}

export function filterStrongAssociations(
  pairs: ProductPair[],
  minLift: number = 1.2
): ProductPair[] {
  return pairs.filter((pair) => pair.lift >= minLift);
}

export function getProductRecommendations(
  pairs: ProductPair[],
  minLift: number = 1.2,
  minSupport: number = 0.01
): ProductPair[] {
  return pairs.filter((pair) =>
    pair.lift >= minLift && pair.support >= minSupport
  );
}

export async function calculateDailyRevenue(
  markets: Market[],
  db: MarketPulseDB,
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  const revenueMap = new Map<string, number>();
  const marketIds = markets.map((market) => market.id).filter((id): id is string => !!id);
  if (marketIds.length === 0) return revenueMap;

  const marketIdSet = new Set(marketIds);
  const events = await db.events
    .where('type')
    .equals('deal_closed')
    .filter((event) => marketIdSet.has(getEventMarketId(event) ?? ''))
    .toArray();

  for (const event of events) {
    const dealDate = getDealEventDate(event);
    if (dealDate < startDate || dealDate > endDate) continue;

    revenueMap.set(
      dealDate,
      (revenueMap.get(dealDate) || 0) + getDealEventRevenue(event)
    );
  }

  return revenueMap;
}
