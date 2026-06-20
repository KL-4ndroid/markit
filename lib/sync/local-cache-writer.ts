import { db } from '@/lib/db';
import { marketAccessRowToLocal, productAccessRowToLocal } from '@/lib/data-mappers';
import { sanitizeWithLevel, type InfoLevel } from '@/lib/data-sanitization';
import { resetMarketProjectionFields } from '@/lib/sync/projection-reset';
import type { Market, Product } from '@/types/db';

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

export async function syncProductsToIndexedDB(
  products: any[],
  currentUserId: string,
  infoLevel: InfoLevel
): Promise<void> {
  console.log(`Syncing ${products.length} products to IndexedDB...`, {
    currentUserId: currentUserId.substring(0, 8),
  });

  if (products.length > 0) {
    console.log('Product sync sample:', products.slice(0, 3).map(p => ({
      id: p.id?.substring(0, 8),
      name: p.name,
      owner_id: p.owner_id?.substring(0, 8),
      access_type: p.access_type,
      relationship_owner_id: p.relationship_owner_id?.substring(0, 8),
    })));
  }

  let syncedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    try {
      const isOwner = product.access_type === 'owner' && product.owner_id === currentUserId;
      const isStaff = product.access_type === 'staff' && product.relationship_owner_id;

      if (!isOwner && !isStaff) {
        console.warn(`Skipping inaccessible product: ${product.name} (owner: ${product.owner_id?.substring(0, 8)})`);
        skippedCount++;
        continue;
      }

      const sanitizedRow = sanitizeWithLevel(product, 'product', infoLevel);
      const mappedProduct = productAccessRowToLocal(sanitizedRow as Record<string, unknown>);

      const productData = {
        ...mappedProduct,
        unlimitedStock: mappedProduct.unlimitedStock ?? false,
        isActive: mappedProduct.isActive ?? true,
        totalSold: 0,
      };

      await db.products.put({ ...productData, id: product.id } as Product);
      syncedCount++;
    } catch (error) {
      console.error(`Failed to sync product: ${product.id}`, error);
      skippedCount++;
    }
  }

  console.log(`Product sync complete: synced ${syncedCount}, skipped ${skippedCount}, total ${products.length}`);
}
