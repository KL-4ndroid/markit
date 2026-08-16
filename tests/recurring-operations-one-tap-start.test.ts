import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canStartScheduledMarket } from '../lib/recurring-operations';
import type { Market } from '../types/db';

const scheduled: Market = {
  id: 'fixed', name: '固定場', location: '台北', dates: ['2026-08-14'], startDate: '2026-08-14', endDate: '2026-08-14',
  startTime: '17:00', endTime: '23:00', status: 'registered', sessionOrigin: 'schedule', scheduleOccurrenceState: 'scheduled',
  registrationFee: 0, boothCost: 0, createdAt: 1, updatedAt: 1,
};
assert.equal(canStartScheduledMarket(scheduled, new Date('2026-08-14T10:00:00Z')), true);
assert.equal(canStartScheduledMarket({ ...scheduled, sessionOrigin: 'manual' }, new Date('2026-08-14T10:00:00Z')), false);
assert.equal(canStartScheduledMarket({ ...scheduled, status: 'paid' }, new Date('2026-08-14T10:00:00Z')), false);
assert.equal(canStartScheduledMarket({ ...scheduled, scheduleOccurrenceState: 'skipped' }, new Date('2026-08-14T10:00:00Z')), false);
assert.equal(canStartScheduledMarket(scheduled, new Date('2026-08-15T10:00:00Z')), false);

const home = readFileSync('app/page.tsx', 'utf8');
const detail = readFileSync('components/markets/MarketDetailScreen.tsx', 'utf8');
const listView = readFileSync('lib/markets/market-list-view-model.ts', 'utf8');
assert.match(home, /startMarket\(marketId\)/);
assert.match(home, /roleRefreshState\.isAuthorizationFresh/);
assert.match(detail, /market\.sessionOrigin !== 'schedule'/);
assert.match(listView, /function preparingStatusLabel[\s\S]*market\.sessionOrigin === 'schedule'[\s\S]*return '已排定'/);
console.log('recurring operations one-tap start tests passed');
