import {
  getDealEventCount,
  getDealEventRevenue,
} from '@/lib/markets/event-view-utils';
import type { DealClosedPayload, Event } from '@/types/db';

export interface DailyDealSummary {
  revenue: number;
  dealCount: number;
}

export function summarizeDailyDealEvents(
  deals: Array<Event<DealClosedPayload>>
): DailyDealSummary {
  return deals.reduce<DailyDealSummary>(
    (summary, event) => ({
      revenue: summary.revenue + getDealEventRevenue(event),
      dealCount: summary.dealCount + getDealEventCount(event),
    }),
    { revenue: 0, dealCount: 0 }
  );
}
