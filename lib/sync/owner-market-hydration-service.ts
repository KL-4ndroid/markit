import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase/client';
import { marketRowToLocal } from '@/lib/data-mappers';
import { resetMarketProjectionFields } from '@/lib/sync/projection-reset';
import { createPermissionGate, type InfoLevel } from '@/lib/data-sanitization';

export interface MarketHydrationResult {
  hydrated: Set<string>;
  missing: Set<string>;
  failed: Set<string>;
}

/**
 * Hydrate missing markets from Cloud before replaying owner events.
 */
export async function batchHydrateMarkets(
  marketIds: Set<string>,
  infoLevel: InfoLevel
): Promise<MarketHydrationResult> {
  const hydrated = new Set<string>();
  const missing = new Set<string>();
  const failed = new Set<string>();

  const toFetch = [...marketIds];
  if (toFetch.length === 0) {
    return { hydrated, missing, failed };
  }

  const notYetLocal: string[] = [];
  for (const marketId of toFetch) {
    const exists = await db.markets.get(marketId);
    if (!exists) {
      notYetLocal.push(marketId);
    } else {
      hydrated.add(marketId);
    }
  }

  if (notYetLocal.length === 0) {
    return { hydrated, missing, failed };
  }

  const { data: markets, error } = await supabase
    .from('markets')
    .select('*')
    .in('id', notYetLocal);

  if (error) {
    console.error('[hydration] Failed to fetch markets from Cloud:', error);
    for (const id of notYetLocal) failed.add(id);
    return { hydrated, missing, failed };
  }

  const foundIds = new Set<string>();
  if (markets) {
    for (const market of markets) {
      foundIds.add(market.id);
      const localMarket = marketRowToLocal(market);
      const sanitized = marketGateForLevel(infoLevel).sanitizeMarketProjection(
        localMarket as unknown as Record<string, unknown>
      );
      const reset = resetMarketProjectionFields(
        sanitized as unknown as typeof localMarket
      );
      await db.markets.put(reset as unknown as typeof localMarket);
      hydrated.add(market.id);
    }
  }

  for (const id of notYetLocal) {
    if (!foundIds.has(id)) missing.add(id);
  }

  if (missing.size > 0) {
    console.warn(`[hydration] Markets not found in Cloud (deleted or unauthorized): ${[...missing].join(', ')}`);
  }

  if (hydrated.size > 0) {
    console.log(`[hydration] Hydrated ${hydrated.size} markets from Cloud`);
  }

  return { hydrated, missing, failed };
}

function marketGateForLevel(infoLevel: InfoLevel) {
  return createPermissionGate({ infoLevel, entity: 'market' });
}
