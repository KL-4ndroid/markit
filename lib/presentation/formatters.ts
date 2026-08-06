const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK_TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function parseDateOnly(value: string): DateParts | null {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function datePartsToKey(parts: DateParts): string {
  return [
    parts.year,
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

export function formatDisplayDate(value: Date | string): string {
  if (typeof value === 'string') {
    const parts = parseDateOnly(value);
    if (parts) return `${parts.year}/${parts.month}/${String(parts.day).padStart(2, '0')}`;
  }

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : '';
  return `${date.getFullYear()}/${date.getMonth() + 1}/${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDisplayDateRange(start: string, end: string): string {
  const startParts = parseDateOnly(start);
  const endParts = parseDateOnly(end);
  if (!startParts || !endParts) {
    return [start, end].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join('~');
  }

  const startLabel = formatDisplayDate(start);
  if (datePartsToKey(startParts) === datePartsToKey(endParts)) return startLabel;
  if (startParts.year === endParts.year && startParts.month === endParts.month) {
    return `${startLabel}~${String(endParts.day).padStart(2, '0')}`;
  }
  if (startParts.year === endParts.year) {
    return `${startLabel}~${endParts.month}/${String(endParts.day).padStart(2, '0')}`;
  }
  return `${startLabel}~${endParts.year}/${endParts.month}/${String(endParts.day).padStart(2, '0')}`;
}

export function formatDisplayDateRanges(dates: readonly string[]): string {
  const validDates = [...new Set(dates)].filter(date => parseDateOnly(date)).sort();
  if (validDates.length === 0) return '';

  const ranges: Array<[string, string]> = [];
  let rangeStart = validDates[0];
  let rangeEnd = validDates[0];

  for (const current of validDates.slice(1)) {
    const previousParts = parseDateOnly(rangeEnd);
    const currentParts = parseDateOnly(current);
    if (!previousParts || !currentParts) continue;

    const previousDate = new Date(previousParts.year, previousParts.month - 1, previousParts.day);
    const currentDate = new Date(currentParts.year, currentParts.month - 1, currentParts.day);
    const differenceInDays = (currentDate.getTime() - previousDate.getTime()) / 86_400_000;
    if (differenceInDays === 1) {
      rangeEnd = current;
    } else {
      ranges.push([rangeStart, rangeEnd]);
      rangeStart = current;
      rangeEnd = current;
    }
  }

  ranges.push([rangeStart, rangeEnd]);
  return ranges.map(([start, end]) => formatDisplayDateRange(start, end)).join('、');
}

export function formatClockTime(value?: string | null): string {
  if (!value) return '';
  const match = CLOCK_TIME_PATTERN.exec(value);
  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return value;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatClockTimeRange(
  start?: string | null,
  end?: string | null,
  separator = '–',
): string {
  const startLabel = formatClockTime(start);
  const endLabel = formatClockTime(end);
  if (startLabel && endLabel) return `${startLabel}${separator}${endLabel}`;
  return startLabel || endLabel;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatRelativeTimestamp(timestamp: number | null, now = Date.now()): string {
  if (timestamp === null) return '尚未同步';
  const difference = Math.max(0, now - timestamp);
  if (difference < 60_000) return '剛剛';
  if (difference < 3_600_000) return `${Math.floor(difference / 60_000)} 分鐘前`;
  if (difference < 86_400_000) return `${Math.floor(difference / 3_600_000)} 小時前`;
  return `${Math.floor(difference / 86_400_000)} 天前`;
}
