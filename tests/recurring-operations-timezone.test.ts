import assert from 'node:assert/strict';

import {
  addCalendarDays,
  getCalendarWeekday,
  isDateKey,
  toDateKeyInTimeZone,
} from '../lib/recurring-operations/date-key';

assert.equal(isDateKey('2026-02-28'), true);
assert.equal(isDateKey('2026-02-29'), false);
assert.equal(isDateKey('2028-02-29'), true);
assert.equal(addCalendarDays('2026-12-31', 1), '2027-01-01');
assert.equal(getCalendarWeekday('2026-08-17'), 1);

const instant = new Date('2026-08-16T16:30:00.000Z');
assert.equal(toDateKeyInTimeZone(instant, 'Asia/Taipei'), '2026-08-17');
assert.equal(toDateKeyInTimeZone(instant, 'UTC'), '2026-08-16');
assert.throws(() => toDateKeyInTimeZone(instant, 'Not/A-Timezone'));

console.log('recurring timezone and calendar-date tests passed');
