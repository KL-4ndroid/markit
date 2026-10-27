import { getMarketBoothFee } from './market-booth-fee';
import { isOptionalMarketRegion } from './market-region';
import { normalizePaymentDeadline } from './market-payment-deadline';

export interface MarketCoreFormValues {
  name?: string;
  location?: string;
  regionCode?: string | null;
  paymentDeadline?: unknown;
  dates?: string[];
}

export type MarketCoreFormErrorKey = 'name' | 'regionCode' | 'location' | 'dates' | 'paymentDeadline';
export type MarketCoreFormErrors = Partial<Record<MarketCoreFormErrorKey, string>>;

const MARKET_CORE_ERROR_ORDER: MarketCoreFormErrorKey[] = ['name', 'regionCode', 'location', 'dates', 'paymentDeadline'];

/** Compare editable values, not formatting differences from cloud time/date serialization. */
export function hasMarketFormChanges(initial: Record<string, unknown>, current: Record<string, unknown>): boolean {
  const snapshot = (values: Record<string, unknown>) => JSON.stringify(Object.keys(values).sort().map(key => {
    let value = values[key];
    if (key === 'paymentDeadline') {
      try { value = normalizePaymentDeadline(value) ?? null; }
      catch { /* Keep invalid drafts visible as changes; submission shows the error. */ }
    }
    if (key === 'dates' && Array.isArray(value)) value = [...new Set(value)].sort();
    if (typeof value === 'string') {
      const text = value.trim();
      value = key.endsWith('Time') && /^\d{2}:\d{2}:00$/.test(text) ? text.slice(0, 5) : text;
    }
    return [key, value];
  }));
  return snapshot(initial) !== snapshot(current);
}

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

  if (requireIdentity && !isOptionalMarketRegion(values.regionCode)) {
    errors.regionCode = '請選擇有效的縣市，或選擇未分類';
  }
  if (requireIdentity) {
    try { normalizePaymentDeadline(values.paymentDeadline); }
    catch { errors.paymentDeadline = '請確認有效的繳費期限（台灣時間）'; }
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

export function calculateMarketDurationLabel(start?: string | null, end?: string | null): string {
  const clockPattern = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;
  if (!start || !end || !clockPattern.test(start) || !clockPattern.test(end)) return '尚未設定';
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  if (startHour > 23 || endHour > 23 || startMinute > 59 || endMinute > 59) return '尚未設定';
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
  registrationFee?: number;
  tableRental?: number;
  chairRental?: number;
  umbrellaRental?: number;
  tableFree: boolean;
  chairFree: boolean;
  umbrellaFree: boolean;
}): number {
  return getMarketBoothFee(values)
    + (values.tableFree ? 0 : Number(values.tableRental || 0))
    + (values.chairFree ? 0 : Number(values.chairRental || 0))
    + (values.umbrellaFree ? 0 : Number(values.umbrellaRental || 0));
}
