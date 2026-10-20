import assert from 'node:assert/strict';

import { calculateWeeklyOccurrences } from '../lib/recurring-operations/weekly-recurrence';
import type { OperationSchedule } from '../lib/recurring-operations/types';

function schedule(overrides: Partial<OperationSchedule> = {}): OperationSchedule {
  return {
    id: 'schedule-a',
    owner_id: 'owner-a',
    venueId: 'venue-a',
    timezone: 'Asia/Taipei',
    recurrence: {
      frequency: 'weekly',
      interval: 1,
      weekdays: [1, 4],
      startDate: '2026-08-10',
      endDate: '2026-09-03',
    },
    startTime: '17:00',
    endTime: '01:00',
    endsNextDay: true,
    defaults: {},
    status: 'active',
    revision: 1,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

assert.deepEqual(
  calculateWeeklyOccurrences(schedule(), '2026-08-01', '2026-08-24'),
  ['2026-08-10', '2026-08-13', '2026-08-17', '2026-08-20', '2026-08-24'],
);

assert.deepEqual(
  calculateWeeklyOccurrences(schedule(), '2026-08-13', '2026-09-30'),
  ['2026-08-13', '2026-08-17', '2026-08-20', '2026-08-24', '2026-08-27', '2026-08-31', '2026-09-03'],
);

assert.deepEqual(calculateWeeklyOccurrences(schedule({ status: 'paused' }), '2026-08-10', '2026-08-24'), []);
assert.deepEqual(calculateWeeklyOccurrences(schedule(), '2026-08-24', '2026-08-10'), []);

console.log('recurring weekly occurrence tests passed');
