export interface MarketCoreFormValues {
  name?: string;
  location?: string;
  dates?: string[];
}

export type MarketCoreFormErrorKey = 'name' | 'location' | 'dates';
export type MarketCoreFormErrors = Partial<Record<MarketCoreFormErrorKey, string>>;

const MARKET_CORE_ERROR_ORDER: MarketCoreFormErrorKey[] = ['name', 'location', 'dates'];

export function validateMarketCoreForm(
  values: MarketCoreFormValues,
  options: { requireIdentity?: boolean } = {},
): MarketCoreFormErrors {
  const errors: MarketCoreFormErrors = {};
  const requireIdentity = options.requireIdentity ?? true;

  if (requireIdentity && !values.name?.trim()) {
    errors.name = '請輸入市集名稱';
  }
  if (requireIdentity && !values.location?.trim()) {
    errors.location = '請輸入市集地點';
  }
  if (!values.dates || values.dates.length === 0) {
    errors.dates = '請至少選擇一個市集日期';
  }

  return errors;
}

export function getFirstMarketCoreError(
  errors: MarketCoreFormErrors,
): MarketCoreFormErrorKey | null {
  return MARKET_CORE_ERROR_ORDER.find(field => Boolean(errors[field])) ?? null;
}

export function deriveMarketDateBounds(dates: string[]): {
  dates: string[];
  startDate: string;
  endDate: string;
} {
  const sortedDates = [...dates].sort();
  return {
    dates: sortedDates,
    startDate: sortedDates[0] ?? '',
    endDate: sortedDates[sortedDates.length - 1] ?? '',
  };
}

export function calculateMarketDurationLabel(start: string, end: string): string {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;
  if (endTotal < startTotal) endTotal += 24 * 60;
  const duration = Math.max(0, endTotal - startTotal);
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  return minutes > 0 ? `${hours} 小時 ${minutes} 分鐘` : `${hours} 小時`;
}

export function calculateMarketFixedCost(values: {
  boothCost?: number;
  tableRental?: number;
  chairRental?: number;
  umbrellaRental?: number;
  tableFree: boolean;
  chairFree: boolean;
  umbrellaFree: boolean;
}): number {
  return Number(values.boothCost || 0)
    + (values.tableFree ? 0 : Number(values.tableRental || 0))
    + (values.chairFree ? 0 : Number(values.chairRental || 0))
    + (values.umbrellaFree ? 0 : Number(values.umbrellaRental || 0));
}
