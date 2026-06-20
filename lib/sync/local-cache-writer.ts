import { db } from '@/lib/db';
import { marketAccessRowToLocal } from '@/lib/data-mappers';
import { sanitizeWithLevel, type InfoLevel } from '@/lib/data-sanitization';
import { resetMarketProjectionFields } from '@/lib/sync/projection-reset';
import type { Market } from '@/types/db';

export async function syncMarketsToIndexedDB(
  markets: any[],
  currentUserId: string,
  infoLevel: InfoLevel
): Promise<void> {
  console.log(`Syncing ${markets.length} markets to IndexedDB...`, {
    currentUserId: currentUserId.substring(0, 8),
  });

  if (markets.length > 0) {
    console.log('Market sync sample:', markets.slice(0, 3).map(m => ({
      id: m.id?.substring(0, 8),
      name: m.name,
      owner_id: m.owner_id?.substring(0, 8),
      access_type: m.access_type,
      status: m.status,
      isDeleted: m.isDeleted,
    })));
  }

  for (const market of markets) {
    try {
      const existing = await db.markets.get(market.id);
      const sanitizedRow = sanitizeWithLevel(market, 'market', infoLevel);
      const mappedMarket = marketAccessRowToLocal(sanitizedRow as Record<string, unknown>);

      const marketData = {
        ...mappedMarket,
        sync_status: 'synced' as const,
        earlyEntryEnabled: mappedMarket.earlyEntryEnabled ?? existing?.earlyEntryEnabled ?? false,
        earlyEntryTime: mappedMarket.earlyEntryTime ?? existing?.earlyEntryTime,
        checkInTime: mappedMarket.checkInTime ?? existing?.checkInTime,
        operatingStartTime: mappedMarket.operatingStartTime ?? existing?.operatingStartTime,
        operatingEndTime: mappedMarket.operatingEndTime ?? existing?.operatingEndTime,
        ...resetMarketProjectionFields(mappedMarket as Market),
      };

      await db.markets.put({ ...marketData, id: market.id } as Market);
    } catch (error) {
      console.error(`Failed to sync market: ${market.id}`, error);
    }
  }

  console.log('Market sync complete');
}
