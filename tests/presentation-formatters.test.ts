import assert from 'node:assert/strict';

import {
  formatClockTime,
  formatClockTimeRange,
  formatCurrency,
  formatDisplayDate,
  formatDisplayDateRange,
  formatDisplayDateRanges,
  formatRelativeTimestamp,
} from '../lib/presentation/formatters';

assert.equal(formatDisplayDate('2026-07-02'), '2026/7/02');
assert.equal(formatDisplayDateRange('2026-07-02', '2026-07-31'), '2026/7/02~31');
assert.equal(formatDisplayDateRange('2026-07-30', '2026-08-02'), '2026/7/30~8/02');
assert.equal(formatDisplayDateRange('2026-12-31', '2027-01-02'), '2026/12/31~2027/1/02');
assert.equal(
  formatDisplayDateRanges(['2026-07-02', '2026-07-03', '2026-07-08']),
  '2026/7/02~03、2026/7/08',
);

assert.equal(formatClockTime('9:05:00'), '09:05');
assert.equal(formatClockTime('24:00:00'), '24:00:00');
assert.equal(formatClockTimeRange('09:00:00', '18:30:00'), '09:00–18:30');

assert.equal(formatCurrency(12_999), '$12,999');
assert.equal(formatCurrency(-12_999), '-$12,999');

const now = new Date('2026-07-23T12:00:00+08:00').getTime();
assert.equal(formatRelativeTimestamp(null, now), '尚未同步');
assert.equal(formatRelativeTimestamp(now - 30_000, now), '剛剛');
assert.equal(formatRelativeTimestamp(now - 5 * 60_000, now), '5 分鐘前');

console.log('PASS shared presentation formatters');
