import assert from 'node:assert/strict';
import {
  buildScheduledMarketPayload,
  deriveScheduledMarketCreatedEventId,
} from '../lib/recurring-operations';
import type { OperationSchedule, Venue } from '../lib/recurring-operations';

const venue: Venue = {
  id: 'venue-1', owner_id: 'owner-1', name: '夜市攤位', address: '台北', status: 'active', createdAt: 1, updatedAt: 1,
};
const schedule: OperationSchedule = {
  id: 'schedule-1', owner_id: 'owner-1', venueId: venue.id, timezone: 'Asia/Taipei',
  recurrence: { frequency: 'weekly', interval: 1, weekdays: [5], startDate: '2026-08-01' },
  startTime: '17:00', endTime: '23:00', endsNextDay: false, defaults: { boothCost: 300 },
  status: 'active', revision: 2, createdAt: 1, updatedAt: 1,
};

const deviceA = buildScheduledMarketPayload(structuredClone(schedule), structuredClone(venue), '2026-08-21');
const deviceB = buildScheduledMarketPayload(structuredClone(schedule), structuredClone(venue), '2026-08-21');
assert.deepEqual(deviceA, deviceB);
assert.equal(deviceA.marketId, deviceB.marketId);
assert.equal(
  deriveScheduledMarketCreatedEventId({ ownerId: 'owner-1', scheduleId: 'schedule-1', localOccurrenceDate: '2026-08-21' }),
  deriveScheduledMarketCreatedEventId({ ownerId: 'owner-1', scheduleId: 'schedule-1', localOccurrenceDate: '2026-08-21' }),
);
console.log('recurring operations two-device idempotency tests passed');
