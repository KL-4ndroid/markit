import { db } from '@/lib/db';
import { withoutDeletedDealEvents } from '@/lib/db/event-tombstones';
import { getDealItems, getDealItemProductId, getEventMarketId } from '@/lib/events/event-read-model';
import type { DealClosedPayload, Event } from '@/types/db';
import type { InfoLevel } from '@/lib/data-sanitization';

/** Read-model only: visible active sales, never a second stock replay or cloud write. */
export async function rebuildStaffProductSales(productIds: string[], marketIds: string[], infoLevel: InfoLevel): Promise<void> {
  if (infoLevel >= 3) return;
  const scope = new Set(marketIds);
  await db.transaction('rw', db.events, db.products, async () => {
    const counts = new Map<string, number>();
    if (infoLevel >= 2) {
      const events = (await db.events.where('type').anyOf(['deal_closed', 'deal_deleted']).toArray())
        .filter(event => scope.has(getEventMarketId(event) ?? ''));
      const deals = events.filter(event => event.type === 'deal_closed') as Event<DealClosedPayload>[];
      const deleted = events.filter(event => event.type === 'deal_deleted');
      for (const event of withoutDeletedDealEvents(deals, deleted)) {
        for (const item of getDealItems(event)) {
          const id = getDealItemProductId(item);
          if (id && typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0) {
            counts.set(id, (counts.get(id) ?? 0) + item.quantity);
          }
        }
      }
    }
    for (const id of productIds) {
      await db.products.update(id, { totalSold: counts.get(id) ?? 0, staffSalesProjectionReady: infoLevel >= 2 });
    }
  });
}
