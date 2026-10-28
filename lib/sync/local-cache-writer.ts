import { db } from '@/lib/db';
import { getEventMarketId } from '@/lib/events/event-read-model';
import { marketAccessRowToLocal, normalizeEventPayloadForLocal, productAccessRowToLocal } from '@/lib/data-mappers';
import { hasSemanticDuplicateDealClosedEvent } from '@/lib/sync/semantic-event-dedupe';
import { markEventSynced } from '@/lib/sync/event-sync-service';
import { preflightStaffEventImport } from '@/lib/sync/staff-event-preflight';
import { sanitizeStaffProjectionsAfterReplay } from '@/lib/sync/staff-projection-sanitizer';
import { createCanonicalSyncedEvent } from '@/lib/sync/synced-event-factory';
import { sanitizeEventsWithLevel, sanitizeWithLevel, type InfoLevel } from '@/lib/data-sanitization';
import { resetMarketProjectionFields } from '@/lib/sync/projection-reset';
import type { Event, Market, Product } from '@/types/db';

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
  const pendingProducts = new Set<string>();
  const pendingEvents = await db.events.filter(event => event.actor_id === currentUserId && event.sync_status !== 'synced').toArray();
  for (const event of pendingEvents) {
    const payload = event.payload ?? {};
    const references = [payload.productId, payload.product_id,
      ...(Array.isArray(payload.items) ? payload.items.map((item: any) => item.productId ?? item.product_id) : []),
      ...(Array.isArray(payload.productsSold) ? payload.productsSold.map((item: any) => item.productId ?? item.product_id) : [])];
    for (const id of references) if (typeof id === 'string') pendingProducts.add(id);
  }

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
      const existing = pendingProducts.has(product.id) ? await db.products.get(product.id) : undefined;
      const retained = existing?.owner_id === mappedProduct.owner_id
        ? sanitizeWithLevel(existing, 'product', infoLevel) : {};
      const hydratedProduct = { ...mappedProduct, ...retained };

      const productData = {
        ...hydratedProduct,
        access_type: mappedProduct.access_type,
        relationship_owner_id: mappedProduct.relationship_owner_id,
        permissions: mappedProduct.permissions,
        unlimitedStock: hydratedProduct.unlimitedStock ?? false,
        isActive: hydratedProduct.isActive ?? true,
        totalSold: 0,
        staffSalesProjectionReady: false,
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

export async function syncEventsToIndexedDB(events: any[], infoLevel: InfoLevel): Promise<void> {
  const sanitizedEvents = sanitizeEventsWithLevel(events, infoLevel);

  console.log(`Syncing ${sanitizedEvents.length} events to IndexedDB...`);

  let processedCount = 0;
  let skippedCount = 0;

  for (const event of sanitizedEvents) {
    try {
      const existing = await db.events.get(event.id);

      if (existing) {
        if (
          (event.type === 'deal_deleted' || event.type === 'interaction_deleted') &&
          event.payload?.eventId &&
          !existing.payload?.eventId
        ) {
          const updated = {
            ...existing,
            payload: { ...existing.payload, eventId: event.payload.eventId },
            sync_status: 'synced' as const,
          };
          await db.events.put(updated);

          const { eventHandlers } = await import('@/lib/db/events');
          const handler = eventHandlers[event.type as keyof typeof eventHandlers];
          if (handler) {
            const processedPayload = normalizeEventPayloadForLocal(updated.payload);
            await handler({
              id: updated.id,
              type: updated.type,
              payload: processedPayload,
              timestamp: updated.timestamp,
              actor_id: updated.actor_id,
              market_id: updated.market_id,
            } as Event, db, infoLevel < 3 ? { productSnapshot: true } : undefined);
            await sanitizeStaffProjectionsAfterReplay(updated, infoLevel);
          }
          processedCount++;
        } else {
          if (existing.sync_status !== 'synced') {
            await markEventSynced(event.id);
          }
          skippedCount++;
        }
        continue;
      }

      // A staff view contains canonical event IDs. Equal amounts on the same
      // date are legitimate separate sales; the ID check above handles retries.
      if (infoLevel === 3 && await hasSemanticDuplicateDealClosedEvent(db, event)) {
        skippedCount++;
        console.warn('[useSync] Skipping semantic duplicate deal_closed event during staff sync', {
          eventId: event.id,
          marketId: getEventMarketId(event),
        });
        continue;
      }

      const localEvent = createCanonicalSyncedEvent(event);

      if (infoLevel < 3) {
        const preflight = await preflightStaffEventImport(localEvent, {
          hasMarket: async (marketId) => Boolean(await db.markets.get(marketId)),
          hasProduct: async (productId) => Boolean(await db.products.get(productId)),
        });

        if (!preflight.shouldImport) {
          skippedCount++;
          console.warn('[useSync] Skipping event outside local scoped dataset', {
            eventId: event.id,
            eventType: event.type,
            reason: preflight.reason,
            referenceId: preflight.referenceId,
          });
          continue;
        }
      }

      await db.events.add(localEvent);

      const { eventHandlers } = await import('@/lib/db/events');
      const handler = eventHandlers[event.type as keyof typeof eventHandlers];

      if (handler) {
        const processedPayload = normalizeEventPayloadForLocal(localEvent.payload);
        await handler({
          id: localEvent.id,
          type: localEvent.type,
          payload: processedPayload,
          timestamp: localEvent.timestamp,
          actor_id: localEvent.actor_id,
          market_id: localEvent.market_id,
        } as Event, db, infoLevel < 3 ? { productSnapshot: true } : undefined);

        await sanitizeStaffProjectionsAfterReplay(localEvent, infoLevel);
      }

      processedCount++;
    } catch (error: any) {
      if (error.name === 'ConstraintError') {
        skippedCount++;
        continue;
      }
      console.error(`Failed to sync event: ${event.type} (${event.id?.substring(0, 8)}...)`, error);
    }
  }

  console.log(`Event sync complete: processed ${processedCount}, skipped ${skippedCount}, total ${events.length}`);
}
