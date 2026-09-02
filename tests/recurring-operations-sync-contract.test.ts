import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  marketCreatedPayloadToCloud,
  marketRowToLocal,
  operationScheduleRowToLocal,
  venueRowToLocal,
} from '../lib/data-mappers';

const root = process.cwd();
const pushSource = fs.readFileSync(path.join(root, 'lib/sync/sync-push-service.ts'), 'utf8');
const pullSource = fs.readFileSync(path.join(root, 'lib/sync/owner-pull-service.ts'), 'utf8');

const cloud = marketCreatedPayloadToCloud({
  name: 'Fixed market',
  location: 'Taipei',
  startDate: '2026-08-15',
  endDate: '2026-08-15',
  registrationFee: 0,
  boothCost: 0,
  venueId: 'venue-1',
  scheduleId: 'schedule-1',
  sessionOrigin: 'schedule',
  scheduleOccurrenceKey: 'owner-1:schedule-1:2026-08-15',
  scheduleRevision: 2,
  scheduleOccurrenceState: 'scheduled',
  isScheduleOverride: false,
}, 'market-1');
assert.equal(cloud.venue_id, 'venue-1');
assert.equal(cloud.schedule_occurrence_key, 'owner-1:schedule-1:2026-08-15');

const market = marketRowToLocal({
  id: 'market-1', name: 'Fixed market', location: 'Taipei',
  start_date: '2026-08-15', end_date: '2026-08-15',
  registration_fee: 0, booth_cost: 0,
  venue_id: 'venue-1', schedule_id: 'schedule-1', session_origin: 'schedule',
  schedule_occurrence_key: 'owner-1:schedule-1:2026-08-15',
  schedule_revision: 2, schedule_occurrence_state: 'scheduled', is_schedule_override: false,
  created_at: '2026-08-14T00:00:00Z', updated_at: '2026-08-14T00:00:00Z',
});
assert.equal(market.scheduleId, 'schedule-1');
assert.equal(market.scheduleRevision, 2);

assert.equal(venueRowToLocal({ id: 'v', owner_id: 'o', name: 'V', status: 'active', created_at: 1, updated_at: 1 }).locationNote, undefined);
assert.equal(operationScheduleRowToLocal({
  id: 's', owner_id: 'o', venue_id: 'v', timezone: 'Asia/Taipei',
  recurrence: {}, start_time: '10:00', end_time: '18:00', defaults: {}, status: 'active', revision: 1,
  created_at: 1, updated_at: 1,
}).venueId, 'v');

assert.match(pushSource, /maybeSingle\(\)/);
assert.match(pushSource, /insertError\.code === '23505'/);
assert.match(pullSource, /actor_id.*market_id\.is\.null/);
assert.match(pullSource, /eventHandlers\[event\.type/);

console.log('recurring operations sync contract tests passed');
