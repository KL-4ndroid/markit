import assert from 'node:assert/strict';
import { checkBackupIntegrity } from '../lib/db/integrity';

const market = (id: string) => ({
  id,
  owner_id: 'owner-1',
  name: id,
  location: 'Taipei',
  startDate: '2026-08-15',
  endDate: '2026-08-15',
  status: 'registered' as const,
  registrationFee: 0,
  boothCost: 0,
  sessionOrigin: 'schedule' as const,
  scheduleOccurrenceKey: 'owner-1:schedule-1:2026-08-15',
  createdAt: 1,
  updatedAt: 1,
});

const result = checkBackupIntegrity({
  version: 2,
  exportedAt: 1,
  events: [],
  markets: [market('market-1'), market('market-2')],
  products: [],
  dailyStats: [],
  settings: [],
  venues: [],
  operationSchedules: [],
});
assert.equal(result.ok, false);
assert.ok(result.errors.some(error => error.includes('duplicate scheduleOccurrenceKey')));
console.log('recurring operations integrity tests passed');
