import { db } from '@/lib/db';
import { getEventMarketId } from '@/lib/events/event-read-model';
import { createPermissionGate, type InfoLevel } from '@/lib/data-sanitization';
import type { DailyStats, Market } from '@/types/db';

const PROJECTION_EVENT_TYPES = new Set(['deal_closed', 'deal_deleted']);

interface StaffProjectionReplayEvent {
  type: string;
  market_id?: string;
  payload?: any;
}

/**
 * Re-sanitize projection tables after staff event replay.
 */
export async function sanitizeStaffProjectionsAfterReplay(
  event: StaffProjectionReplayEvent,
  infoLevel: InfoLevel
): Promise<void> {
  if (infoLevel === 3) return;
  if (!PROJECTION_EVENT_TYPES.has(event.type)) return;

  const marketId = getEventMarketId(event);
  if (!marketId) return;

  const marketGate = createPermissionGate({ infoLevel, entity: 'market' });
  const statsGate = createPermissionGate({ infoLevel, entity: 'stats' });

  const existingMarket = await db.markets.get(marketId);
  if (existingMarket) {
    const sanitized = marketGate.sanitizeMarketProjection(existingMarket as unknown as Record<string, unknown>);
    await db.markets.put({ ...sanitized, id: marketId } as Market);
  }

  const dailyStats = await db.dailyStats.where('marketId').equals(marketId).toArray();
  for (const stat of dailyStats) {
    if (stat.id === undefined) continue;
    const sanitized = statsGate.sanitizeDailyStatsProjection(stat as unknown as Record<string, unknown>);
    await db.dailyStats.put({ ...sanitized, id: stat.id } as DailyStats);
  }
}
