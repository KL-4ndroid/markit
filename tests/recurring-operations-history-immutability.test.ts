import assert from 'node:assert/strict';
import { planScheduleReconciliation } from '../lib/recurring-operations';
import type { OperationSchedule } from '../lib/recurring-operations';

const schedule: OperationSchedule = {
  id: 's', owner_id: 'o', venueId: 'v', timezone: 'Asia/Taipei', recurrence: { frequency: 'weekly', interval: 1, weekdays: [5], startDate: '2026-08-01' },
  startTime: '11:00', endTime: '19:00', endsNextDay: false, defaults: {}, status: 'active', revision: 3, createdAt: 1, updatedAt: 1,
};
const plan = planScheduleReconciliation({
  scheduleAfter: schedule, fromDate: '2026-08-14', throughDate: '2026-08-28', effectiveDate: '2026-08-21',
  existingMarkets: [
    { id: 'past', owner_id: 'o', scheduleId: 's', sessionOrigin: 'schedule', startDate: '2026-08-14', status: 'registered', scheduleRevision: 1, scheduleOccurrenceState: 'scheduled' },
    { id: 'ongoing', owner_id: 'o', scheduleId: 's', sessionOrigin: 'schedule', startDate: '2026-08-21', status: 'ongoing', scheduleRevision: 1, scheduleOccurrenceState: 'scheduled' },
    { id: 'completed', owner_id: 'o', scheduleId: 's', sessionOrigin: 'schedule', startDate: '2026-08-28', status: 'completed', scheduleRevision: 1, scheduleOccurrenceState: 'scheduled' },
    { id: 'activity', owner_id: 'o', scheduleId: 's', sessionOrigin: 'schedule', startDate: '2026-09-04', status: 'registered', scheduleRevision: 1, scheduleOccurrenceState: 'scheduled' },
  ],
  activityByMarketId: { activity: { hasDeals: true } },
});
assert.ok(plan.actions.some(action => action.kind === 'preserve' && action.marketId === 'past' && action.reason === 'before_effective_date'));
assert.ok(plan.actions.some(action => action.kind === 'blocked' && action.marketId === 'ongoing' && action.reason === 'ongoing_or_completed'));
assert.ok(plan.actions.some(action => action.kind === 'blocked' && action.marketId === 'completed' && action.reason === 'ongoing_or_completed'));
assert.ok(plan.actions.some(action => action.kind === 'blocked' && action.marketId === 'activity' && action.reason === 'user_activity_present'));
console.log('recurring operations history immutability tests passed');
