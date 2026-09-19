import assert from 'node:assert/strict';
import { planScheduleReconciliation } from '../lib/recurring-operations';
import type { OperationSchedule } from '../lib/recurring-operations';
import { readFileSync } from 'node:fs';

const schedule: OperationSchedule = {
  id: 's', owner_id: 'o', venueId: 'v', timezone: 'Asia/Taipei', recurrence: { frequency: 'weekly', interval: 1, weekdays: [5], startDate: '2026-08-01' },
  startTime: '10:00', endTime: '18:00', endsNextDay: false, defaults: {}, status: 'active', revision: 2, createdAt: 1, updatedAt: 1,
};
const plan = planScheduleReconciliation({
  scheduleAfter: schedule, fromDate: '2026-08-14', throughDate: '2026-08-21',
  existingMarkets: [{ id: 'm', owner_id: 'o', scheduleId: 's', sessionOrigin: 'schedule', startDate: '2026-08-14', status: 'registered', isScheduleOverride: true, scheduleRevision: 1, scheduleOccurrenceState: 'scheduled' }],
});
assert.ok(plan.actions.some(action => action.kind === 'preserve' && action.reason === 'single_occurrence_override'));
const editForm = readFileSync('components/markets/EditMarketForm.tsx', 'utf8');
assert.match(editForm, /markScheduleOverride[\s\S]*isScheduleOverride: true/);
console.log('recurring operations single override tests passed');
