import type { Market } from '@/types/db';
/** Explicit, possibly non-contiguous business days take precedence over the range. */
export function marketBusinessDates(market: Pick<Market, 'dates' | 'startDate' | 'endDate'>): string[] {
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
    && new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) === date;
  if (market.dates?.length) return [...new Set(market.dates.filter(validDate))].sort();
  const result: string[] = [];
  let date = market.startDate;
  while (validDate(date) && date <= market.endDate && result.length < 3660) {
    result.push(date);
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate()+1); date=next.toISOString().slice(0,10);
  }
  return result;
}
