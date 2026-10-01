import assert from 'node:assert/strict';

import { planScheduleReconciliation } from '../lib/recurring-operations/reconciliation';
import type { OperationSchedule, ScheduledMarketCandidate } from '../lib/recurring-operations/types';

function schedule(overrides: Partial<OperationSchedule> = {}): OperationSchedule {
  return {
    id: 'schedule-a',
    owner_id: 'owner-a',
    venueId: 'venue-a',
    timezone: 'Asia/Taipei',
    recurrence: {
      frequency: 'weekly',
      interval: 1,
      weekdays: [1],
      startDate: '2026-08-03',
    },
    startTime: '17:00',
    endTime: '23:00',
    endsNextDay: false,
    defaults: {},
    status: 'active',
    revision: 2,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

function market(date: string, overrides: Partial<ScheduledMarketCandidate> = {}): ScheduledMarketCandidate {
  return {
    id: `market-${date}`,
    owner_id: 'owner-a',
    scheduleId: 'schedule-a',
    sessionOrigin: 'schedule',
    scheduleOccurrenceKey: `owner-a:schedule-a:${date}`,
    scheduleRevision: 1,
    scheduleOccurrenceState: 'scheduled',
    startDate: date,
    dates: [date],
    status: 'registered',
    ...overrides,
  };
}

const plan = planScheduleReconciliation({
  scheduleAfter: schedule(),
  existingMarkets: [
    market('2026-08-10'),
    market('2026-08-17', { isScheduleOverride: true }),
    market('2026-08-24', { status: 'completed' }),
    market('2026-08-31'),
  ],
  activityByMarketId: {
    'market-2026-08-31': { hasDeals: true },
  },
  fromDate: '2026-08-10',
  throughDate: '2026-09-07',
  effectiveDate: '2026-08-10',
});

assert.deepEqual(
  plan.actions.map(action => [action.occurrenceDate, action.kind, 'reason' in action ? action.reason : null]),
  [
    ['2026-08-10', 'update_snapshot', null],
    ['2026-08-17', 'preserve', 'single_occurrence_override'],
    ['2026-08-24', 'blocked', 'ongoing_or_completed'],
    ['2026-08-31', 'blocked', 'user_activity_present'],
    ['2026-09-07', 'create', null],
  ],
);

const changedWeekday = planScheduleReconciliation({
  scheduleBefore: schedule({ revision: 1 }),
  scheduleAfter: schedule({
    recurrence: { frequency: 'weekly', interval: 1, weekdays: [2], startDate: '2026-08-03' },
  }),
  existingMarkets: [market('2026-08-10')],
  fromDate: '2026-08-10',
  throughDate: '2026-08-18',
});
assert.deepEqual(changedWeekday.actions.map(action => action.kind), ['mark_rule_removed', 'create', 'create']);

const paused = planScheduleReconciliation({
  scheduleAfter: schedule({ status: 'paused' }),
  existingMarkets: [market('2026-08-10')],
  fromDate: '2026-08-10',
  throughDate: '2026-08-24',
});
assert.equal(paused.actions[0].kind, 'suppress');

const resumed = planScheduleReconciliation({
  scheduleAfter: schedule(),
  existingMarkets: [market('2026-08-10', { scheduleOccurrenceState: 'suppressed' })],
  fromDate: '2026-08-10',
  throughDate: '2026-08-10',
});
assert.equal(resumed.actions[0].kind, 'restore');

console.log('recurring reconciliation tests passed');
