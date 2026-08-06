import {
  getDealEventCount,
  getDealEventRevenue,
  getEventMarketId,
} from '@/lib/events/event-read-model';
import type { Event } from '@/types/db';

export interface LiveMetricsSnapshot {
  totalRevenue: number;
  dealCount: number;
  interactionCount: number;
  averageOrderValue: number;
  conversionRate: number;
}

export function createEmptyLiveMetrics(): LiveMetricsSnapshot {
  return {
    totalRevenue: 0,
    dealCount: 0,
    interactionCount: 0,
    averageOrderValue: 0,
    conversionRate: 0,
  };
}

export function calculateLiveMetrics(
  events: Event[] | undefined,
  marketId: string
): LiveMetricsSnapshot {
  if (!events || !marketId) {
    return createEmptyLiveMetrics();
  }

  let totalRevenue = 0;
  let dealCount = 0;
  let interactionCount = 0;

  for (const event of events) {
    if (getEventMarketId(event) !== marketId) continue;

    if (event.type === 'deal_closed') {
      totalRevenue += getDealEventRevenue(event);
      dealCount += getDealEventCount(event);
    } else if (event.type === 'interaction_recorded') {
      interactionCount += 1;
    }
  }

  const averageOrderValue = dealCount > 0 ? totalRevenue / dealCount : 0;
  const totalInteractions = interactionCount + dealCount;
  const conversionRate = totalInteractions > 0 ? (dealCount / totalInteractions) * 100 : 0;

  return {
    totalRevenue,
    dealCount,
    interactionCount,
    averageOrderValue,
    conversionRate,
  };
}
