import { db } from '@/lib/db';
import type { Market } from '@/types/db';

export async function getMarketDetail(marketId: string): Promise<Market | undefined> {
  if (!marketId.trim()) {
    return undefined;
  }

  return db.markets.get(marketId);
}
