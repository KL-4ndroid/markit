import assert from 'node:assert/strict';
import { join } from 'node:path';

import {
  loadMarketTextImportGoldInputs,
  MARKET_TEXT_IMPORT_GOLD_DOCUMENT_SETS,
  parseFixtureIdsFromAdjudication,
  parseFixtureIdsFromReviewerResult,
  readMarketTextImportGoldDocument,
} from './fixtures/market-text-import-gold';

const projectRoot = join(__dirname, '..');
const fixtures = loadMarketTextImportGoldInputs(projectRoot);

const fixtureIds = fixtures.map((fixture) => fixture.fixtureId);
assert.equal(fixtures.length, 83, 'the design Gold corpus must contain all 83 adjudicated fixtures');
assert.equal(new Set(fixtureIds).size, 83, 'fixtureId must be unique across all rounds');
assert.equal(
  new Set(fixtures.map((fixture) => fixture.sourceSampleId)).size,
  52,
  'all 52 reviewed source families represented by Round A/B/C must remain present',
);

assert.deepEqual(
  Object.fromEntries(
    MARKET_TEXT_IMPORT_GOLD_DOCUMENT_SETS.map(({ round }) => [
      round,
      fixtures.filter((fixture) => fixture.round === round).length,
    ]),
  ),
  { A: 23, B: 30, C: 30 },
  'round sizes must stay frozen at 23/30/30',
);

const validDate = /^\d{4}-\d{2}-\d{2}$/;
for (const fixture of fixtures) {
  assert.equal(fixture.schemaVersion, 1, `${fixture.fixtureId}: unexpected schema version`);
  assert.equal(fixture.split, 'design_gold', `${fixture.fixtureId}: unexpected split`);
  assert.match(fixture.fixtureId, /^MTI-REP-\d{4}-P\d{2}$/);
  assert.equal(
    fixture.sourceSampleId,
    fixture.fixtureId.replace(/-P\d{2}$/, ''),
    `${fixture.fixtureId}: source family must derive from fixtureId`,
  );
  assert.match(fixture.referenceDate, validDate, `${fixture.fixtureId}: invalid referenceDate`);
  assert.equal(
    new Date(`${fixture.referenceDate}T00:00:00Z`).toISOString().slice(0, 10),
    fixture.referenceDate,
    `${fixture.fixtureId}: referenceDate must be a real calendar date`,
  );
  assert.ok(fixture.inputText.length > 0, `${fixture.fixtureId}: inputText must not be empty`);
  assert.equal(
    fixture.inputText.includes('\r'),
    false,
    `${fixture.fixtureId}: executable inputs use canonical LF line endings`,
  );
}

for (const documentSet of MARKET_TEXT_IMPORT_GOLD_DOCUMENT_SETS) {
  const roundIds = new Set(
    fixtures
      .filter((fixture) => fixture.round === documentSet.round)
      .map((fixture) => fixture.fixtureId),
  );
  const adjudicationIds = parseFixtureIdsFromAdjudication(
    readMarketTextImportGoldDocument(projectRoot, documentSet.adjudicationPath),
  );
  const reviewerIds = documentSet.reviewerResultPaths.flatMap((path) => (
    parseFixtureIdsFromReviewerResult(readMarketTextImportGoldDocument(projectRoot, path))
  ));

  assert.equal(
    adjudicationIds.length,
    documentSet.expectedCount,
    `Round ${documentSet.round}: adjudication row count drifted`,
  );
  assert.equal(
    reviewerIds.length,
    documentSet.expectedCount,
    `Round ${documentSet.round}: reviewer result count drifted`,
  );
  assert.equal(
    new Set(adjudicationIds).size,
    adjudicationIds.length,
    `Round ${documentSet.round}: duplicate adjudication rows`,
  );
  assert.equal(
    new Set(reviewerIds).size,
    reviewerIds.length,
    `Round ${documentSet.round}: duplicate reviewer results`,
  );
  assert.deepEqual(
    [...adjudicationIds].sort(),
    [...roundIds].sort(),
    `Round ${documentSet.round}: adjudication coverage must exactly match executable inputs`,
  );
  assert.deepEqual(
    [...reviewerIds].sort(),
    [...roundIds].sort(),
    `Round ${documentSet.round}: reviewer coverage must exactly match executable inputs`,
  );
}

const allowedPrivacyTokens = new Set([
  'BANK_ACCOUNT',
  'BRAND_NAME',
  'EMAIL',
  'IDENTIFIER',
  'ORGANIZER_ADDRESS',
  'PERSON_NAME',
  'PHONE_OR_CONTACT',
  'PRIVATE_ADDRESS',
  'PRIVATE_ANSWER',
  'PRIVATE_BRAND',
  'PRIVATE_DATE',
  'PRIVATE_FORM_ANSWER',
  'PRIVATE_FORM_URL',
  'PRIVATE_PERSON',
  'PRIVATE_VEHICLE',
  'PROGRAM_URL',
  'PROMO_CODE',
  'REGISTRATION_URL',
]);

for (const fixture of fixtures) {
  assert.doesNotMatch(
    fixture.inputText,
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    `${fixture.fixtureId}: raw email address is not allowed`,
  );
  assert.doesNotMatch(
    fixture.inputText,
    /https?:\/\//i,
    `${fixture.fixtureId}: raw URL is not allowed`,
  );
  assert.doesNotMatch(
    fixture.inputText,
    /(?<!\d)09\d{8}(?!\d)/,
    `${fixture.fixtureId}: raw Taiwan mobile number is not allowed`,
  );
  assert.doesNotMatch(
    fixture.inputText,
    /(?<!\d)0\d{1,2}[-\s]\d{3,4}[-\s]\d{4}(?!\d)/,
    `${fixture.fixtureId}: raw Taiwan contact number is not allowed`,
  );
  assert.doesNotMatch(
    fixture.inputText,
    /(?:帳號|銀行帳戶|匯款帳號)[：:\s]*\d{8,}/,
    `${fixture.fixtureId}: raw bank account is not allowed`,
  );
  assert.doesNotMatch(
    fixture.inputText,
    /\b[A-Z][12]\d{8}\b/,
    `${fixture.fixtureId}: raw Taiwan identity number is not allowed`,
  );
  assert.doesNotMatch(
    fixture.inputText,
    /\b[A-Z]{2,3}-?\d{4}\b/i,
    `${fixture.fixtureId}: raw vehicle plate is not allowed`,
  );

  const tokens = [...fixture.inputText.matchAll(/\[([A-Z][A-Z0-9_]*)\]/g)]
    .map((match) => match[1]);
  for (const token of tokens) {
    assert.ok(
      allowedPrivacyTokens.has(token),
      `${fixture.fixtureId}: unreviewed privacy token [${token}]`,
    );
  }
}

const scenarioCounts = fixtures.reduce<Record<string, number>>((counts, fixture) => {
  counts[fixture.pasteScenario] = (counts[fixture.pasteScenario] ?? 0) + 1;
  return counts;
}, {});
assert.ok(scenarioCounts.focused_block > 0, 'Gold corpus must cover focused block paste');
assert.ok(scenarioCounts.focused_with_context > 0, 'Gold corpus must cover focused context paste');
assert.ok(scenarioCounts.full_message_stress > 0, 'Gold corpus must cover full-message stress paste');

console.log(
  `market text import Gold input corpus: ${fixtures.length} fixtures, ${new Set(fixtures.map((fixture) => fixture.sourceSampleId)).size} source families`,
);
