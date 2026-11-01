import type { MarketPulseDB } from '@/lib/db';
import type { DailyStats, Event, Market, DealClosedPayload } from '@/types/db';
import { getEventMarketId } from '@/lib/events/event-read-model';
import { getDealClosedMode, getDealClosedTransactionDate } from '@/lib/db/deal-closed-projection';
import Dexie from 'dexie';
import { normalizeEventPayloadForLocal } from '@/lib/data-mappers';

const dailyKey = (date: string, marketId: string | undefined) => JSON.stringify([date, marketId]);

/**
 * Transaction-local table adapter for the existing manual-sale/interaction handlers.
 * Never caches across batches. Other event types use the original database path.
 */
export async function createReplayProjectionBatch(local: MarketPulseDB, events: readonly Event[], assertActive: () => void) {
  const prepared = events.map(event => ({ ...event, payload: normalizeEventPayloadForLocal(event.payload) }));
  if (!prepared.length || prepared.some(event => event.type !== 'interaction_recorded'
    && !(event.type === 'deal_closed' && getDealClosedMode(event as Event<DealClosedPayload>) === 'manual'))) return null;
  const keys: [string, string][] = [];
  for (const event of prepared) {
    const marketId = getEventMarketId(event);
    if (!marketId) return null;
    const timestamp = new Date(event.timestamp);
    const date = event.type === 'deal_closed' ? getDealClosedTransactionDate(event as Event<DealClosedPayload>)
      : `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
    keys.push([date, marketId]);
  }
  assertActive();
  const marketIds = [...new Set(keys.map(([, id]) => id))];
  const uniqueKeys = [...new Map(keys.map(key => [dailyKey(...key), key])).values()];
  const [marketRows, dailyRows] = await Promise.all([
    local.markets.bulkGet(marketIds), local.dailyStats.where('[date+marketId]').anyOf(uniqueKeys).toArray(),
  ]);
  assertActive();
  const markets = new Map(marketRows.filter((row): row is Market => !!row).map(row => [row.id!, row]));
  const days = new Map<string, DailyStats>();
  const daysById = new Map<number, DailyStats>();
  // anyOf keeps index/primary-key order: retain the same first row as .first().
  for (const row of dailyRows) {
    const key = dailyKey(row.date, row.marketId);
    if (!days.has(key)) { days.set(key, row); daysById.set(row.id!, row); }
  }
  const dirtyMarkets = new Set<string>(), dirtyDays = new Set<number>();
  const adapter = {
    markets: {
      get: (id: string) => Dexie.Promise.resolve(markets.get(id)),
      update: (id: string, changes: Partial<Market>) => {
        const row = markets.get(id);
        if (!row) return Dexie.Promise.resolve(0);
        markets.set(id, { ...row, ...changes }); dirtyMarkets.add(id); return Dexie.Promise.resolve(1);
      },
    },
    dailyStats: {
      where: (index: string) => {
        if (index !== '[date+marketId]') throw new Error('Unexpected replay projection query');
        return { equals: ([date, id]: [string, string]) => ({ first: () => Dexie.Promise.resolve(days.get(dailyKey(date, id))) }) };
      },
      add: (row: DailyStats) => {
        assertActive();
        // Allocate a real auto-increment ID inside this same transaction.
        return local.dailyStats.add(row).then(id => {
          const created = { ...row, id };
          days.set(dailyKey(row.date, row.marketId), created); daysById.set(id, created); return id;
        });
      },
      update: (id: number, changes: Partial<DailyStats>) => {
        const row = daysById.get(id);
        if (!row) return Dexie.Promise.resolve(0);
        const updated = { ...row, ...changes };
        daysById.set(id, updated); days.set(dailyKey(row.date, row.marketId), updated); dirtyDays.add(id); return Dexie.Promise.resolve(1);
      },
    },
  };
  return { database: adapter, async flush() {
    assertActive();
    if (dirtyMarkets.size) await local.markets.bulkPut([...dirtyMarkets].map(id => markets.get(id)!));
    assertActive();
    if (dirtyDays.size) await local.dailyStats.bulkPut([...dirtyDays].map(id => daysById.get(id)!));
    assertActive();
  } };
}
