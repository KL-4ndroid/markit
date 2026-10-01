import assert from 'node:assert/strict';
import { join } from 'node:path';

import { loadMarketTextImportGoldRoundAExpected } from './fixtures/market-text-import-gold-round-a-expected';
import { loadMarketTextImportGoldRoundBExpected } from './fixtures/market-text-import-gold-round-b-expected';
import { loadMarketTextImportGoldRoundCExpected } from './fixtures/market-text-import-gold-round-c-expected';
import { loadMarketTextImportGoldInputs } from './fixtures/market-text-import-gold';

const projectRoot = join(__dirname, '..');
const inputs = loadMarketTextImportGoldInputs(projectRoot);
const expected = [
  ...loadMarketTextImportGoldRoundAExpected(projectRoot),
  ...loadMarketTextImportGoldRoundBExpected(projectRoot),
  ...loadMarketTextImportGoldRoundCExpected(projectRoot),
];

assert.equal(expected.length, 83, 'all 83 Gold expected outputs must be executable');
assert.equal(new Set(expected.map((fixture) => fixture.fixtureId)).size, 83, 'Gold expected IDs must be unique');
assert.deepEqual(
  expected.map((fixture) => fixture.fixtureId).sort(),
  inputs.map((fixture) => fixture.fixtureId).sort(),
  'the full Gold expected set must exactly cover the executable input set',
);
assert.ok(expected.every((fixture) => fixture.privacyReview === 'pass'));

const distribution = (key: 'disposition' | 'readiness'): Record<string, number> => expected.reduce(
  (counts, fixture) => ({
    ...counts,
    [fixture[key]]: (counts[fixture[key]] ?? 0) + 1,
  }),
  {} as Record<string, number>,
);

assert.deepEqual(
  distribution('disposition'),
  { single_candidate: 65, event_selection_required: 6, insufficient: 5, reject: 7 },
  'overall Gold disposition distribution must remain frozen',
);
assert.deepEqual(
  distribution('readiness'),
  { partial: 38, reviewable_core: 24, blocked: 21 },
  'overall Gold readiness distribution must remain frozen',
);

console.log('market text import Gold expected coverage: 83/83 fixtures passed');
