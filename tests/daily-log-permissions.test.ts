import assert from 'node:assert/strict';
import { canDeleteDailyLogEntry } from '../lib/markets/daily-log-permissions';

function main(): void {
  assert.equal(canDeleteDailyLogEntry(undefined), false);
  assert.equal(canDeleteDailyLogEntry(false), false);
  assert.equal(canDeleteDailyLogEntry(true), true);

  console.log('PASS daily log permissions');
}

main();
