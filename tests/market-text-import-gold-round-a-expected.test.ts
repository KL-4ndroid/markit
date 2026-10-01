import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  getExpectedEvidenceTexts,
  loadMarketTextImportGoldRoundAExpected,
} from './fixtures/market-text-import-gold-round-a-expected';
import { loadMarketTextImportGoldInputs } from './fixtures/market-text-import-gold';

const projectRoot = join(__dirname, '..');
const inputFixtures = loadMarketTextImportGoldInputs(projectRoot)
  .filter((fixture) => fixture.round === 'A');
const expectedFixtures = loadMarketTextImportGoldRoundAExpected(projectRoot);

assert.equal(expectedFixtures.length, 23, 'Round A must have 23 executable expected outputs');
assert.deepEqual(
  expectedFixtures.map((fixture) => fixture.fixtureId).sort(),
  inputFixtures.map((fixture) => fixture.fixtureId).sort(),
  'Round A expected-output IDs must exactly match Round A executable inputs',
);

const inputById = new Map(inputFixtures.map((fixture) => [fixture.fixtureId, fixture]));
const candidateStatuses = new Set([
  'exact',
  'inferable',
  'choice_required',
  'conflict',
  'not_present',
  'unsupported',
  'ignore',
]);

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

  for (const event of expected.events) {
    const candidates = [
      event.marketName,
      event.eventDates,
      event.location,
      ...event.times,
      ...event.costs,
      ...event.equipment,
    ];
    for (const candidate of candidates) {
      assert.ok(
        candidateStatuses.has(candidate.status),
        `${expected.fixtureId}: invalid candidate status ${candidate.status}`,
      );
      if (candidate.status === 'not_present') {
        assert.equal(candidate.value, null, `${expected.fixtureId}: not_present value must be null`);
        assert.equal(candidate.evidence, null, `${expected.fixtureId}: not_present evidence must be null`);
      } else {
        assert.notEqual(candidate.evidence, null, `${expected.fixtureId}: non-empty candidate needs evidence`);
      }
    }
  }

  for (const evidenceText of getExpectedEvidenceTexts(expected)) {
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
  { single_candidate: 14, event_selection_required: 4, insufficient: 3, reject: 2 },
  'Round A disposition distribution must remain adjudicated at 14/4/3/2',
);
assert.deepEqual(
  countBy(expectedFixtures.map((fixture) => fixture.readiness)),
  { partial: 6, reviewable_core: 8, blocked: 9 },
  'Round A readiness distribution must remain adjudicated at 8/6/9',
);

for (const fixtureId of ['MTI-REP-0007-P02', 'MTI-REP-0007-P03']) {
  const fixture = expectedFixtures.find((item) => item.fixtureId === fixtureId);
  const event = fixture?.events[0];
  const boothCost = event?.costs.find((candidate) => candidate.role === 'selected_booth_total');
  assert.ok(boothCost && typeof boothCost.value === 'object' && boothCost.value !== null);
  assert.equal((boothCost.value as Record<string, unknown>).unit, 'per_event');
  assert.deepEqual(
    (boothCost.value as Record<string, unknown>).coversDates,
    event?.eventDates.value,
    `${fixtureId}: per-event booth total must preserve covered dates`,
  );
}

for (const fixtureId of ['MTI-REP-0011-P01', 'MTI-REP-0011-P02']) {
  const fixture = expectedFixtures.find((item) => item.fixtureId === fixtureId);
  const location = fixture?.events[0]?.location;
  assert.equal(location?.status, 'choice_required');
  assert.equal((location?.options as unknown[])?.length, 2);
  assert.equal(fixture?.readiness, 'partial');
}

const inferredBoothCost = expectedFixtures
  .find((fixture) => fixture.fixtureId === 'MTI-REP-0029-P01')
  ?.events[0]
  ?.costs.find((candidate) => candidate.role === 'selected_booth_total');
assert.equal(inferredBoothCost?.status, 'inferable');

console.log('market text import Gold Round A expected outputs: 23 fixtures passed');
