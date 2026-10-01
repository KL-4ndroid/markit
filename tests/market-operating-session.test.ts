import assert from 'node:assert/strict';
import { resolveMarketOperatingSession } from '../lib/markets/market-operating-session';
import { marketRowToLocal, marketUpdatesToCamel, marketUpdatesToSnake } from '../lib/data-mappers';
import type { Market } from '../types/db';

function market(overrides: Partial<Market> = {}): Market {
  return {
    id: 'market-session-test',
    name: '測試市集',
    location: '台北',
    dates: ['2026-08-12'],
    startDate: '2026-08-12',
    endDate: '2026-08-12',
    status: 'paid',
    operatingStartTime: '00:15',
    operatingEndTime: '23:00',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

const beforeOfficialStart = resolveMarketOperatingSession(
  market(),
  new Date(2026, 7, 12, 0, 0, 56)
);
assert.equal(beforeOfficialStart.phase, 'early-window');
assert.equal(beforeOfficialStart.sessionDate, '2026-08-12');
assert.equal(beforeOfficialStart.canRecordLiveActivity, false);
assert.equal(beforeOfficialStart.canStartEarly, true);

const manuallyOpenedEarly = resolveMarketOperatingSession(
  market({ operationPhase: 'operating', operationSessionDate: '2026-08-12' }),
  new Date(2026, 7, 12, 0, 0, 56)
);
assert.equal(manuallyOpenedEarly.phase, 'early-operating');
assert.equal(manuallyOpenedEarly.canRecordLiveActivity, true);

const officialHours = resolveMarketOperatingSession(
  market(),
  new Date(2026, 7, 12, 0, 15)
);
assert.equal(officialHours.phase, 'operating');
assert.equal(officialHours.canRecordLiveActivity, true);

const extendedHours = resolveMarketOperatingSession(
  market(),
  new Date(2026, 7, 12, 23, 30)
);
assert.equal(extendedHours.phase, 'extended');
assert.equal(extendedHours.canRecordLiveActivity, true);

const afterFlexibleWindow = resolveMarketOperatingSession(
  market(),
  new Date(2026, 7, 13, 0, 0, 56)
);
assert.equal(afterFlexibleWindow.phase, 'ended');
assert.equal(afterFlexibleWindow.canRecordLiveActivity, false);
assert.equal(afterFlexibleWindow.workspacePhase, 'ended');

const manuallyClosed = resolveMarketOperatingSession(
  market({ operationPhase: 'closing', operationSessionDate: '2026-08-12' }),
  new Date(2026, 7, 12, 20, 0)
);
assert.equal(manuallyClosed.phase, 'closed');
assert.equal(manuallyClosed.canRecordLiveActivity, false);
assert.equal(manuallyClosed.workspacePhase, 'ended');

const multiDayMarket = market({
  dates: ['2026-08-12', '2026-08-13'],
  endDate: '2026-08-13',
  operationPhase: 'closing',
  operationSessionDate: '2026-08-12',
});
const firstDayClosed = resolveMarketOperatingSession(
  multiDayMarket,
  new Date(2026, 7, 12, 20, 0)
);
assert.equal(firstDayClosed.phase, 'closed');
assert.equal(firstDayClosed.workspacePhase, 'not-started');

const nextDayOfficialHours = resolveMarketOperatingSession(
  multiDayMarket,
  new Date(2026, 7, 13, 0, 15)
);
assert.equal(nextDayOfficialHours.phase, 'operating');
assert.equal(nextDayOfficialHours.sessionDate, '2026-08-13');
assert.equal(nextDayOfficialHours.canRecordLiveActivity, true);

const overnightMarket = market({
  dates: ['2026-08-12'],
  operatingStartTime: '22:00',
  operatingEndTime: '02:00',
});
const overnightOfficialHours = resolveMarketOperatingSession(
  overnightMarket,
  new Date(2026, 7, 13, 1, 0)
);
assert.equal(overnightOfficialHours.phase, 'operating');
assert.equal(overnightOfficialHours.sessionDate, '2026-08-12');
assert.equal(overnightOfficialHours.canRecordLiveActivity, true);

assert.deepEqual(
  marketUpdatesToSnake({ operationPhase: 'closing', operationSessionDate: '2026-08-12' }),
  { operation_phase: 'closing', operation_session_date: '2026-08-12' }
);
assert.deepEqual(
  marketUpdatesToCamel({ operation_phase: 'operating', operation_session_date: '2026-08-12' }),
  { operationPhase: 'operating', operationSessionDate: '2026-08-12' }
);
assert.equal(marketRowToLocal({
  id: 'mapped-market',
  name: '映射測試',
  start_date: '2026-08-12',
  end_date: '2026-08-12',
  operation_session_date: '2026-08-12',
}).operationSessionDate, '2026-08-12');

console.log('market operating session tests passed');
