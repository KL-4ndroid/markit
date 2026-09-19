import assert from 'node:assert/strict';
import { parseBackupData } from '../lib/db/integrity';

const base = { exportedAt: 1, events: [], markets: [], products: [], dailyStats: [], settings: [] };
const v1 = parseBackupData(JSON.stringify({ version: 1, ...base }));
assert.deepEqual(v1.venues, []);
assert.deepEqual(v1.operationSchedules, []);

const v2 = parseBackupData(JSON.stringify({ version: 2, ...base, venues: [], operationSchedules: [] }));
assert.equal(v2.version, 2);
assert.throws(
  () => parseBackupData(JSON.stringify({ version: 2, ...base, venues: [] })),
  /operationSchedules/,
);
console.log('recurring operations Backup v2 tests passed');
