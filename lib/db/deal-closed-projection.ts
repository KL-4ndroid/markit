import {
  getDealEventCost,
  getDealEventCount,
  getDealEventDate,
  getDealEventRevenue,
  isBackfillDealEvent,
  isManualDealEvent,
} from '@/lib/events/event-read-model';
import type { DealClosedPayload, Event } from '@/types/db';

export type DealClosedMode = 'manual' | 'backfill' | 'normal';

export interface ManualDealProjection {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  dealCount: number;
}

export function getDealClosedMode(event: Event<DealClosedPayload>): DealClosedMode {
  if (isManualDealEvent(event)) return 'manual';
  if (isBackfillDealEvent(event)) return 'backfill';
  return 'normal';
}

export function getDealClosedTransactionDate(event: Event<DealClosedPayload>): string {
  return getDealEventDate(event);
}

export function getDealClosedManualProjection(event: Event<DealClosedPayload>): ManualDealProjection {
  const revenue = getDealEventRevenue(event);
  const cost = getDealEventCost(event);

  return {
    date: getDealClosedTransactionDate(event),
    revenue,
    cost,
    profit: revenue - cost,
    dealCount: getDealEventCount(event),
  };
}
