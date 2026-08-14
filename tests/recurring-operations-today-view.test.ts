import assert from 'node:assert/strict';
import { buildTodayViewModel } from '../lib/home/today-view-model';
import type { Market } from '../types/db';

function market(overrides: Partial<Market>): Market {
  return {
    id: 'manual', name: '臨時市集', location: '台北', dates: ['2026-08-14'],
    startDate: '2026-08-14', endDate: '2026-08-14', startTime: '12:00', endTime: '18:00',
    status: 'registered', registrationFee: 0, boothCost: 0, createdAt: 1, updatedAt: 1, ...overrides,
  };
}

const view = buildTodayViewModel([
  market({ id: 'manual-future', dates: ['2026-08-15'], startDate: '2026-08-15', endDate: '2026-08-15' }),
  market({ id: 'fixed-future', name: '固定晚場', dates: ['2026-08-15'], startDate: '2026-08-15', endDate: '2026-08-15', startTime: '17:00', sessionOrigin: 'schedule', scheduleOccurrenceState: 'scheduled' }),
  market({ id: 'fixed-today', name: '固定早場', startTime: '09:00', sessionOrigin: 'schedule', scheduleOccurrenceState: 'scheduled' }),
  market({ id: 'skipped', sessionOrigin: 'schedule', scheduleOccurrenceState: 'skipped' }),
  market({ id: 'suppressed', sessionOrigin: 'schedule', scheduleOccurrenceState: 'suppressed' }),
], new Date(2026, 7, 14, 8, 0));

assert.deepEqual(view.todayMarkets.map(item => item.market.id), ['fixed-today']);
assert.deepEqual(view.upcomingMarkets.map(item => item.market.id), ['manual-future', 'fixed-future']);
console.log('recurring operations today view tests passed');
