import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  deriveScheduledMarketCreatedEventId,
  deriveScheduledMarketId,
} from '../lib/recurring-operations/occurrence-identity';

const migration = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/069_add_recurring_hybrid_operations.sql'), 'utf8');
const input = { ownerId: 'owner-1', scheduleId: 'schedule-1', localOccurrenceDate: '2026-08-15' };

assert.equal(deriveScheduledMarketId(input), deriveScheduledMarketId({ ...input }));
assert.equal(deriveScheduledMarketCreatedEventId(input), deriveScheduledMarketCreatedEventId({ ...input }));
assert.notEqual(deriveScheduledMarketId(input), deriveScheduledMarketCreatedEventId(input));

assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS uq_markets_owner_schedule_occurrence/);
assert.match(migration, /ON public\.markets\(owner_id, schedule_occurrence_key\)/);
assert.match(migration, /WHERE schedule_occurrence_key IS NOT NULL/);
assert.match(migration, /CREATE TRIGGER trigger_update_recurring_operations_read_model/);
assert.match(migration, /AFTER INSERT ON public\.events/);

console.log('recurring operations remote idempotency tests passed');
