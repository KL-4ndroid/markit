import type { Market } from '@/types/db';
import { toDateKeyInTimeZone } from './date-key';

export function canStartScheduledMarket(market: Market, now: Date = new Date()): boolean {
  if (
    market.sessionOrigin !== 'schedule'
    || market.scheduleOccurrenceState !== 'scheduled'
    || market.status !== 'registered'
    || market.isDeleted
  ) return false;

  const today = toDateKeyInTimeZone(now, 'Asia/Taipei');
  const occurrenceDate = market.dates?.[0] ?? market.startDate;
  return occurrenceDate === today;
}
