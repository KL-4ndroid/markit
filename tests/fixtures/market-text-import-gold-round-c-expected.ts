import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type {
  MarketTextImportDraftReadiness,
  MarketTextImportEventDisposition,
} from './market-text-import-gold-round-a-expected';

type ExpectedNode = Record<string, unknown>;

export interface MarketTextImportGoldRoundCExpected {
  schemaVersion: 1;
  fixtureId: string;
  round: 'C';
  reviewerId: 'Reviewer E';
  privacyReview: 'pass';
  disposition: MarketTextImportEventDisposition;
  readiness: MarketTextImportDraftReadiness;
  events: ExpectedNode[];
  ignoreSpans: ExpectedNode[];
  warnings: Array<ExpectedNode | string>;
  notes: Array<ExpectedNode | string>;
  reviewEvidence: unknown[];
  adjudicationTags: string[];
}

export interface RoundCExpectedEvidence {
  source: 'input_text' | 'reference_date';
  text: string;
}

const yaml = require('js-yaml') as {
  JSON_SCHEMA: unknown;
  load: (source: string, options: { schema: unknown }) => unknown;
};

const isRecord = (value: unknown): value is ExpectedNode => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isDisposition = (value: unknown): value is MarketTextImportEventDisposition => (
  value === 'single_candidate'
  || value === 'event_selection_required'
  || value === 'insufficient'
  || value === 'reject'
);

const isReadiness = (value: unknown): value is MarketTextImportDraftReadiness => (
  value === 'reviewable_core' || value === 'partial' || value === 'blocked'
);

const normalizeNotPresentNodes = (value: unknown): void => {
  if (Array.isArray(value)) {
    value.forEach(normalizeNotPresentNodes);
    return;
  }
  if (!isRecord(value)) return;

  if (value.status === 'not_present') {
    value.value = null;
    value.evidence = null;
  }
  Object.values(value).forEach(normalizeNotPresentNodes);
};

const readYamlFence = (markdown: string, path: string): string => {
  const match = markdown.match(/```yaml\r?\n([\s\S]*?)\r?\n```/);
  if (!match) throw new Error(`${path}: missing YAML fence`);
  return match[1];
};

const getEventField = (
  fixture: MarketTextImportGoldRoundCExpected,
  key: string,
): ExpectedNode | null => {
  const value = fixture.events[0]?.[key];
  return isRecord(value) ? value : null;
};

const applyRoundCFinalAdjudication = (fixture: MarketTextImportGoldRoundCExpected): void => {
  const decisionTags: Record<string, string[]> = {
    'MTI-REP-0081-P01': ['payment_total_currency_unknown'],
    'MTI-REP-0082-P01': ['published_price_currency_inferable_unit_unknown'],
    'MTI-REP-0084-P01': ['external_selected_dates_unsupported'],
    'MTI-REP-0084-P02': ['external_selected_dates_unsupported'],
    'MTI-REP-0085-P02': ['payment_roles_currency_inferable'],
    'MTI-REP-0089-P01': ['external_selected_dates_unsupported'],
    'MTI-REP-0090-P01': ['external_booth_cost_unsupported'],
    'MTI-REP-0093-P01': ['literal_occurrence_name_exact'],
    'MTI-REP-0094-P01': ['title_location_exact'],
    'MTI-REP-0094-P02': ['title_location_exact'],
    'MTI-REP-0094-P03': ['four_event_candidates_preserved'],
    'MTI-REP-0096-P01': ['recruitment_period_ignored'],
    'MTI-REP-0096-P02': ['explicit_ranges_reviewable_core', 'conditional_hours_unsupported'],
    'MTI-REP-0097-P01': ['selected_booth_total_currency_unknown'],
    'MTI-REP-0097-P02': ['four_event_dates_preserved', 'fee_date_mapping_unsupported', 'stall_type_unproven'],
    'MTI-REP-0099-P01': ['reject_empty_events'],
    'MTI-REP-0100-P01': ['reject_empty_events'],
    'MTI-REP-0100-P02': ['reject_empty_events'],
  };
  fixture.adjudicationTags = decisionTags[fixture.fixtureId] ?? ['accept_independent_result'];

  if (fixture.fixtureId === 'MTI-REP-0081-P01') {
    const paymentTotal = getEventField(fixture, 'paymentTotal');
    if (!paymentTotal || !isRecord(paymentTotal.value)) {
      throw new Error(`${fixture.fixtureId}: missing payment total`);
    }
    paymentTotal.value.role = 'payment_total';
    paymentTotal.value.currency = null;
    paymentTotal.value.currencyStatus = 'unknown';
    paymentTotal.applyPolicy = 'never';
  }

  if (fixture.fixtureId === 'MTI-REP-0082-P01') {
    const boothCost = getEventField(fixture, 'boothCost');
    if (!boothCost || !isRecord(boothCost.value)) {
      throw new Error(`${fixture.fixtureId}: missing published booth price`);
    }
    boothCost.value.role = 'published_booth_price';
    boothCost.value.currency = 'TWD';
    boothCost.value.currencyStatus = 'inferable';
    boothCost.value.unit = 'unknown';
    boothCost.applyPolicy = 'never';
  }

  for (const fixtureId of ['MTI-REP-0084-P01', 'MTI-REP-0084-P02', 'MTI-REP-0089-P01']) {
    if (fixture.fixtureId === fixtureId) {
      const selectedDates = getEventField(fixture, 'selectedDates');
      if (!selectedDates || selectedDates.status !== 'unsupported' || selectedDates.value !== null) {
        throw new Error(`${fixture.fixtureId}: external selected dates must be unsupported with null value`);
      }
      selectedDates.applyPolicy = 'never';
    }
  }

  if (fixture.fixtureId === 'MTI-REP-0090-P01') {
    const boothCost = getEventField(fixture, 'boothCost');
    if (!boothCost || boothCost.status !== 'unsupported' || boothCost.value !== null) {
      throw new Error(`${fixture.fixtureId}: external booth cost must be unsupported with null value`);
    }
    boothCost.applyPolicy = 'never';
  }

  if (fixture.fixtureId === 'MTI-REP-0085-P02') {
    const payment = getEventField(fixture, 'payment');
    if (!payment || !isRecord(payment.value)) {
      throw new Error(`${fixture.fixtureId}: missing received/due payment roles`);
    }
    payment.value.currency = 'TWD';
    payment.value.currencyStatus = 'inferable';
    payment.value.receivedRole = 'payment_received';
    payment.value.dueRole = 'payment_due';
    payment.applyPolicy = 'never';
  }

  if (fixture.fixtureId === 'MTI-REP-0096-P01') {
    const dates = getEventField(fixture, 'dates');
    if (!dates || dates.status !== 'not_present' || dates.value !== null) {
      throw new Error(`${fixture.fixtureId}: recruitment period must not become event dates`);
    }
  }

  if (fixture.fixtureId === 'MTI-REP-0096-P02') {
    const dates = getEventField(fixture, 'dates');
    const operatingHours = getEventField(fixture, 'operatingHours');
    if (!dates || dates.status !== 'inferable' || !operatingHours || operatingHours.status !== 'unsupported') {
      throw new Error(`${fixture.fixtureId}: ranges and conditional hours do not match adjudication`);
    }
    fixture.readiness = 'reviewable_core';
  }

  if (fixture.fixtureId === 'MTI-REP-0097-P01') {
    const boothCost = getEventField(fixture, 'boothCost');
    if (!boothCost || !isRecord(boothCost.value)) {
      throw new Error(`${fixture.fixtureId}: missing booth total`);
    }
    boothCost.value.role = 'selected_booth_total';
    boothCost.value.currency = null;
    boothCost.value.currencyStatus = 'unknown';
    boothCost.value.unit = 'per_event';
    boothCost.applyPolicy = 'never';
  }

  if (fixture.fixtureId === 'MTI-REP-0097-P02') {
    fixture.readiness = 'partial';
    const dates = getEventField(fixture, 'dates');
    const boothCost = getEventField(fixture, 'boothCost');
    if (!dates || dates.status !== 'inferable' || !boothCost) {
      throw new Error(`${fixture.fixtureId}: missing preserved dates or fee relation`);
    }
    boothCost.status = 'unsupported';
    boothCost.value = {
      role: 'selected_booth_total',
      amount: 2000,
      currency: null,
      currencyStatus: 'unknown',
      chargedDays: 2,
      dateMapping: null,
    };
    boothCost.applyPolicy = 'never';
    fixture.events[0].publishedBoothOptions = {
      status: 'choice_required',
      value: [
        { label: '普通攤', amount: 1000, unit: 'per_day' },
        { label: '三輪車', amount: 1200, unit: 'per_day' },
      ],
      evidence: ['普通攤：1000元／日', '三輪車：1200元／日'],
      applyPolicy: 'requires_option',
      reason: '總額與租借天數不能證明已選普通攤。',
    };
    delete fixture.events[0].alternatePrice;
  }
};

export const loadMarketTextImportGoldRoundCExpected = (
  projectRoot: string,
): MarketTextImportGoldRoundCExpected[] => {
  const reviewerPath = 'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_E_ROUND_C_V1_2026_09_16.md';
  const markdown = readFileSync(join(projectRoot, reviewerPath), 'utf8');
  const root = yaml.load(readYamlFence(markdown, reviewerPath), { schema: yaml.JSON_SCHEMA });
  if (!isRecord(root) || !Array.isArray(root.reviews)) {
    throw new Error(`${reviewerPath}: expected root reviews list`);
  }

  const results = root.reviews.map((value): MarketTextImportGoldRoundCExpected => {
    if (!isRecord(value) || typeof value.fixtureId !== 'string') {
      throw new Error('Reviewer E result is missing fixtureId');
    }
    const privacyReview = isRecord(value.privacyReview) ? value.privacyReview : null;
    const eventDisposition = isRecord(value.eventDisposition) ? value.eventDisposition : null;
    const draftReadiness = isRecord(value.draftReadiness) ? value.draftReadiness : null;
    if (
      privacyReview?.status !== 'pass'
      || !isDisposition(eventDisposition?.value)
      || !isReadiness(draftReadiness?.value)
    ) {
      throw new Error(`${value.fixtureId}: invalid Reviewer E decision envelope`);
    }

    const events = Array.isArray(value.events) ? value.events.filter(isRecord) : [];
    normalizeNotPresentNodes(events);
    const fixture: MarketTextImportGoldRoundCExpected = {
      schemaVersion: 1,
      fixtureId: value.fixtureId,
      round: 'C',
      reviewerId: 'Reviewer E',
      privacyReview: 'pass',
      disposition: eventDisposition.value,
      readiness: draftReadiness.value,
      events,
      ignoreSpans: Array.isArray(value.ignoreSpans) ? value.ignoreSpans.filter(isRecord) : [],
      warnings: Array.isArray(value.warnings) ? value.warnings.filter((item) => isRecord(item) || typeof item === 'string') : [],
      notes: Array.isArray(value.notes) ? value.notes.filter((item) => isRecord(item) || typeof item === 'string') : [],
      reviewEvidence: [privacyReview.evidence, eventDisposition.evidence, draftReadiness.evidence],
      adjudicationTags: [],
    };
    applyRoundCFinalAdjudication(fixture);
    return fixture;
  });

  if (results.length !== 30 || new Set(results.map((fixture) => fixture.fixtureId)).size !== 30) {
    throw new Error(`Round C expected-output coverage mismatch: ${results.length}`);
  }
  return results;
};

const collectEvidenceValue = (value: unknown, output: RoundCExpectedEvidence[]): void => {
  if (typeof value === 'string') {
    const referenceDate = value.match(/^referenceDate: (\d{4}-\d{2}-\d{2})$/);
    output.push(referenceDate
      ? { source: 'reference_date', text: referenceDate[1] }
      : { source: 'input_text', text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectEvidenceValue(item, output));
    return;
  }
  if (!isRecord(value)) return;
  if (typeof value.span === 'string') collectEvidenceValue(value.span, output);
  if (typeof value.text === 'string') collectEvidenceValue(value.text, output);
  if ('evidence' in value) collectEvidenceValue(value.evidence, output);
};

const collectEvidenceFromNode = (value: unknown, output: RoundCExpectedEvidence[]): void => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectEvidenceFromNode(item, output));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, child] of Object.entries(value)) {
    if (key === 'evidence' || key.endsWith('Evidence')) {
      collectEvidenceValue(child, output);
    } else {
      collectEvidenceFromNode(child, output);
    }
  }
};

export const getRoundCExpectedEvidence = (
  fixture: MarketTextImportGoldRoundCExpected,
): RoundCExpectedEvidence[] => {
  const output: RoundCExpectedEvidence[] = [];
  collectEvidenceFromNode(
    {
      events: fixture.events,
      ignoreSpans: fixture.ignoreSpans,
      warnings: fixture.warnings,
      notes: fixture.notes,
      reviewEvidence: fixture.reviewEvidence,
    },
    output,
  );
  return output;
};
