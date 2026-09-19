import assert from 'node:assert/strict';
import { validate as validateUuid, version as uuidVersion } from 'uuid';

import {
  buildScheduleOccurrenceKey,
  deriveScheduleReconcileEventId,
  deriveScheduledMarketCreatedEventId,
  deriveScheduledMarketId,
} from '../lib/recurring-operations/occurrence-identity';

const input = {
  ownerId: 'owner-a',
  scheduleId: 'schedule-a',
  localOccurrenceDate: '2026-08-17',
};

assert.equal(buildScheduleOccurrenceKey(input), 'owner-a:schedule-a:2026-08-17');

const marketId = deriveScheduledMarketId(input);
assert.equal(marketId, deriveScheduledMarketId(input));
assert.equal(validateUuid(marketId), true);
assert.equal(uuidVersion(marketId), 5);

const createdEventId = deriveScheduledMarketCreatedEventId(input);
assert.notEqual(createdEventId, marketId);
assert.equal(createdEventId, deriveScheduledMarketCreatedEventId(input));
assert.equal(uuidVersion(createdEventId), 5);

assert.equal(
  deriveScheduleReconcileEventId(input, 2),
  deriveScheduleReconcileEventId(input, 2),
);
assert.notEqual(deriveScheduleReconcileEventId(input, 1), deriveScheduleReconcileEventId(input, 2));

assert.notEqual(
  deriveScheduledMarketId({ ...input, localOccurrenceDate: '2026-08-18' }),
  marketId,
);
assert.throws(() => buildScheduleOccurrenceKey({ ...input, localOccurrenceDate: '2026-02-30' }));

console.log('recurring deterministic identity tests passed');
