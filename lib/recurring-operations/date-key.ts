const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateKey(value: string): boolean {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function assertDateKey(value: string, field = 'date'): void {
  if (!isDateKey(value)) {
    throw new Error(`${field} must be a valid YYYY-MM-DD calendar date`);
  }
}

function dateKeyToUtcDate(value: string): Date {
  assertDateKey(value);
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addCalendarDays(value: string, days: number): string {
  if (!Number.isInteger(days)) throw new Error('days must be an integer');
  const date = dateKeyToUtcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getCalendarWeekday(value: string): number {
  return dateKeyToUtcDate(value).getUTCDay();
}

export function compareDateKeys(left: string, right: string): number {
  assertDateKey(left, 'left');
  assertDateKey(right, 'right');
  return left.localeCompare(right);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function toDateKeyInTimeZone(instant: Date, timeZone: string): string {
  if (!Number.isFinite(instant.getTime())) throw new Error('instant must be a valid Date');
  if (!isValidTimeZone(timeZone)) throw new Error(`Unsupported time zone: ${timeZone}`);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    numberingSystem: 'latn',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
  const result = `${part('year')}-${part('month')}-${part('day')}`;
  assertDateKey(result, 'formatted date');
  return result;
}
