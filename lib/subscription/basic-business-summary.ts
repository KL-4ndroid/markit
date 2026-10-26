import type { Event, DealClosedPayload, Market } from '@/types/db';
import { getDealEventCount, getDealEventDate, getDealEventRevenue } from '@/lib/events/event-read-model';

/** Input must already be owner-scoped and tombstone-filtered by the shared event reader. */
export function buildBasicMonthlyTotals(events: readonly Event<DealClosedPayload>[], month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid summary month');
  return events.reduce((total, event) => getDealEventDate(event).startsWith(`${month}-`)
    ? { income: total.income + getDealEventRevenue(event), deals: total.deals + getDealEventCount(event) }
    : total, { income: 0, deals: 0 });
}

export function selectBasicHistory(markets: readonly Market[], ownerId: string, today: string, search: string) {
  const query = search.trim().toLocaleLowerCase();
  return markets.filter(m => m.owner_id === ownerId && !m.isDeleted && m.startDate <= today
    && (!query || `${m.name} ${m.location} ${m.startDate}`.toLocaleLowerCase().includes(query)))
    .sort((a,b) => b.startDate.localeCompare(a.startDate));
}
