import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  getRoundBExpectedEvidenceTexts,
  loadMarketTextImportGoldRoundBExpected,
} from './fixtures/market-text-import-gold-round-b-expected';
import { loadMarketTextImportGoldInputs } from './fixtures/market-text-import-gold';

const projectRoot = join(__dirname, '..');
const inputFixtures = loadMarketTextImportGoldInputs(projectRoot)
  .filter((fixture) => fixture.round === 'B');
const expectedFixtures = loadMarketTextImportGoldRoundBExpected(projectRoot);

assert.equal(expectedFixtures.length, 30, 'Round B must have 30 executable expected outputs');
assert.equal(
  expectedFixtures.filter((fixture) => fixture.reviewerId === 'Reviewer C').length,
  25,
  'Round B must preserve Reviewer C coverage at 25 fixtures',
);
assert.equal(
  expectedFixtures.filter((fixture) => fixture.reviewerId === 'Reviewer D').length,
  5,
  'Round B must preserve Reviewer D remainder coverage at 5 fixtures',
);
assert.deepEqual(
  expectedFixtures.map((fixture) => fixture.fixtureId).sort(),
  inputFixtures.map((fixture) => fixture.fixtureId).sort(),
  'Round B expected-output IDs must exactly match Round B executable inputs',
);

const inputById = new Map(inputFixtures.map((fixture) => [fixture.fixtureId, fixture]));
for (const expected of expectedFixtures) {
  const input = inputById.get(expected.fixtureId);
  assert.ok(input, `${expected.fixtureId}: missing executable input`);
  assert.equal(expected.schemaVersion, 1);
  assert.equal(expected.privacyReview, 'pass');
  assert.ok(expected.adjudicationTags.length > 0, `${expected.fixtureId}: missing adjudication tags`);

  if (expected.disposition === 'single_candidate') {
    assert.equal(expected.events.length, 1, `${expected.fixtureId}: single candidate needs one event`);
  }
  if (expected.disposition === 'event_selection_required') {
    assert.ok(expected.events.length >= 2, `${expected.fixtureId}: event selection needs multiple events`);
    assert.equal(expected.readiness, 'blocked', `${expected.fixtureId}: unresolved event selection is blocked`);
  }
  if (expected.disposition === 'insufficient' || expected.disposition === 'reject') {
    assert.equal(expected.readiness, 'blocked', `${expected.fixtureId}: non-actionable fixture is blocked`);
  }
  if (expected.disposition === 'reject') {
    assert.deepEqual(expected.events, [], `${expected.fixtureId}: reject must have no event blocks`);
  }

  for (const evidenceText of getRoundBExpectedEvidenceTexts(expected)) {
    assert.ok(evidenceText.length > 0, `${expected.fixtureId}: empty evidence is not allowed`);
    assert.ok(
      input.inputText.includes(evidenceText),
      `${expected.fixtureId}: evidence is outside inputText: ${JSON.stringify(evidenceText)}`,
    );
  }
}

const countBy = <T extends string>(values: readonly T[]): Record<T, number> => values.reduce(
  (counts, value) => ({ ...counts, [value]: (counts[value] ?? 0) + 1 }),
  {} as Record<T, number>,
);

assert.deepEqual(
  countBy(expectedFixtures.map((fixture) => fixture.disposition)),
  { reject: 2, single_candidate: 25, event_selection_required: 1, insufficient: 2 },
  'Round B disposition distribution must remain adjudicated at 25/1/2/2',
);
assert.deepEqual(
  countBy(expectedFixtures.map((fixture) => fixture.readiness)),
  { blocked: 8, partial: 16, reviewable_core: 6 },
  'Round B readiness distribution must remain adjudicated at 6/16/8',
);

const expectedById = new Map(expectedFixtures.map((fixture) => [fixture.fixtureId, fixture]));
for (const fixtureId of ['MTI-REP-0066-P01', 'MTI-REP-0066-P02', 'MTI-REP-0076-P02']) {
  assert.equal(expectedById.get(fixtureId)?.readiness, 'blocked', `${fixtureId}: core date conflict must block`);
}
assert.equal(expectedById.get('MTI-REP-0076-P01')?.readiness, 'partial');
assert.equal(expectedById.get('MTI-REP-0078-P01')?.disposition, 'single_candidate');

const publishedFee = expectedById.get('MTI-REP-0069-P02')
  ?.events.flatMap((event) => Array.isArray(event.costs) ? event.costs : [])
  .find((candidate) => typeof candidate === 'object' && candidate !== null && candidate.role === 'published_booth_price');
assert.ok(publishedFee, 'MTI-REP-0069-P02: public fee must remain an unselected published option');
assert.equal(publishedFee.status, 'choice_required');
assert.equal(publishedFee.applyPolicy, 'never');

const inferredFormDates = expectedById.get('MTI-REP-0080-P03')?.events[0]?.eventDates;
assert.ok(typeof inferredFormDates === 'object' && inferredFormDates !== null);
assert.equal((inferredFormDates as Record<string, unknown>).status, 'inferable');

console.log('market text import Gold Round B expected outputs: 30 fixtures passed');
