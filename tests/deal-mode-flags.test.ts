import assert from 'node:assert/strict';
import { resolveDealModeFlags } from '../lib/db/hooks';

function main(): void {
  assert.deepEqual(
    resolveDealModeFlags({}),
    { isBackfill: false, isManualEntry: false },
    'normal product deal should persist explicit false flags'
  );

  assert.deepEqual(
    resolveDealModeFlags({ isManualEntry: true }),
    { isBackfill: false, isManualEntry: true },
    'live manual deal should not be treated as backfill'
  );

  assert.deepEqual(
    resolveDealModeFlags({ isBackfill: true, isManualEntry: false }),
    { isBackfill: true, isManualEntry: false },
    'backfilled item deal should preserve item mode'
  );

  assert.deepEqual(
    resolveDealModeFlags({ isManualEntry: true }, '2026-06-12'),
    { isBackfill: true, isManualEntry: true },
    'dated manual deal should be backfill + manual'
  );

  assert.deepEqual(
    resolveDealModeFlags({ isBackfill: false, isManualEntry: false }, '2026-06-12'),
    { isBackfill: true, isManualEntry: false },
    'explicit false backfill is overridden by a historical deal date'
  );

  console.log('PASS deal mode flags');
}

main();
