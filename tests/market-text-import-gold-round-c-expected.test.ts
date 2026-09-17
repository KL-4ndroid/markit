import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  getRoundCExpectedEvidence,
  loadMarketTextImportGoldRoundCExpected,
} from './fixtures/market-text-import-gold-round-c-expected';
import { loadMarketTextImportGoldInputs } from './fixtures/market-text-import-gold';

const projectRoot = join(__dirname, '..');
const inputFixtures = loadMarketTextImportGoldInputs(projectRoot)
  .filter((fixture) => fixture.round === 'C');
const expectedFixtures = loadMarketTextImportGoldRoundCExpected(projectRoot);

assert.equal(expectedFixtures.length, 30, 'Round C must have 30 executable expected outputs');
assert.deepEqual(
  expectedFixtures.map((fixture) => fixture.fixtureId).sort(),
  inputFixtures.map((fixture) => fixture.fixtureId).sort(),
  'Round C expected-output IDs must exactly match Round C executable inputs',
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
  if (expected.disposition === 'reject') {
    assert.equal(expected.readiness, 'blocked', `${expected.fixtureId}: reject is blocked`);
    assert.deepEqual(expected.events, [], `${expected.fixtureId}: reject must have no event blocks`);
  }

  for (const evidence of getRoundCExpectedEvidence(expected)) {
    assert.ok(evidence.text.length > 0, `${expected.fixtureId}: empty evidence is not allowed`);
    if (evidence.source === 'reference_date') {
      assert.equal(
        evidence.text,
        input.referenceDate,
        `${expected.fixtureId}: reference-date evidence must equal request metadata`,
      );
    } else {
      assert.ok(
        input.inputText.includes(evidence.text),
        `${expected.fixtureId}: evidence is outside inputText: ${JSON.stringify(evidence.text)}`,
      );
    }
  }
}

const count = (value: string): number => expectedFixtures.filter(
  (fixture) => fixture.disposition === value,
).length;
assert.equal(count('single_candidate'), 26);
assert.equal(count('event_selection_required'), 1);
assert.equal(count('reject'), 3);

const readinessCount = (value: string): number => expectedFixtures.filter(
  (fixture) => fixture.readiness === value,
).length;
assert.equal(readinessCount('reviewable_core'), 10);
assert.equal(readinessCount('partial'), 16);
assert.equal(readinessCount('blocked'), 4);

const expectedById = new Map(expectedFixtures.map((fixture) => [fixture.fixtureId, fixture]));
for (const fixtureId of ['MTI-REP-0084-P01', 'MTI-REP-0084-P02', 'MTI-REP-0089-P01']) {
  const selectedDates = expectedById.get(fixtureId)?.events[0]?.selectedDates;
  assert.ok(typeof selectedDates === 'object' && selectedDates !== null);
  assert.equal((selectedDates as Record<string, unknown>).status, 'unsupported');
  assert.equal((selectedDates as Record<string, unknown>).value, null);
}

const recruitmentDates = expectedById.get('MTI-REP-0096-P01')?.events[0]?.dates;
assert.ok(typeof recruitmentDates === 'object' && recruitmentDates !== null);
assert.equal((recruitmentDates as Record<string, unknown>).status, 'not_present');
assert.equal(expectedById.get('MTI-REP-0096-P02')?.readiness, 'reviewable_core');
assert.equal(expectedById.get('MTI-REP-0097-P02')?.readiness, 'partial');

const roundCFeeOptions = expectedById.get('MTI-REP-0097-P02')?.events[0]?.publishedBoothOptions;
assert.ok(typeof roundCFeeOptions === 'object' && roundCFeeOptions !== null);
assert.equal((roundCFeeOptions as Record<string, unknown>).status, 'choice_required');

for (const fixtureId of ['MTI-REP-0099-P01', 'MTI-REP-0100-P01', 'MTI-REP-0100-P02']) {
  assert.deepEqual(expectedById.get(fixtureId)?.events, []);
}

console.log('market text import Gold Round C expected outputs: 30 fixtures passed');
