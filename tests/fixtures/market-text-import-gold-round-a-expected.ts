import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as yaml from 'js-yaml';

type CandidateStatus =
  | 'exact'
  | 'inferable'
  | 'choice_required'
  | 'conflict'
  | 'not_present'
  | 'unsupported'
  | 'ignore';

export type MarketTextImportEventDisposition =
  | 'single_candidate'
  | 'event_selection_required'
  | 'insufficient'
  | 'reject';

export type MarketTextImportDraftReadiness = 'reviewable_core' | 'partial' | 'blocked';

export interface ExpectedReviewedValue {
  role?: string;
  status: CandidateStatus;
  value: unknown;
  evidence: string | string[] | null;
  [key: string]: unknown;
}

export interface ExpectedReviewedEvent {
  marketName: ExpectedReviewedValue;
  eventDates: ExpectedReviewedValue;
  location: ExpectedReviewedValue;
  times: ExpectedReviewedValue[];
  costs: ExpectedReviewedValue[];
  equipment: ExpectedReviewedValue[];
}

export interface MarketTextImportGoldRoundAExpected {
  schemaVersion: 1;
  fixtureId: string;
  round: 'A';
  privacyReview: 'pass';
  disposition: MarketTextImportEventDisposition;
  readiness: MarketTextImportDraftReadiness;
  events: ExpectedReviewedEvent[];
  ignoreSpans: Array<{ text: string; reason: string }>;
  warnings: string[];
  notes: string;
  adjudicationTags: string[];
}

interface ReviewerResult {
  fixtureId: string;
  privacyReview: string;
  eventDisposition: MarketTextImportEventDisposition;
  events: ExpectedReviewedEvent[];
  ignoreSpans: Array<{ text: string; reason: string }>;
  warnings: string[];
  notes: string;
}

interface RoundAFinalDecision {
  readiness: MarketTextImportDraftReadiness;
  adjudicationTags: string[];
}

const ROUND_A_FINAL_DECISIONS: Readonly<Record<string, RoundAFinalDecision>> = {
  'MTI-REP-0001-P01': { readiness: 'partial', adjudicationTags: ['missing_name_partial'] },
  'MTI-REP-0001-P02': { readiness: 'reviewable_core', adjudicationTags: ['accept'] },
  'MTI-REP-0002-P01': { readiness: 'partial', adjudicationTags: ['accept_name_structure', 'missing_location_partial'] },
  'MTI-REP-0002-P02': { readiness: 'blocked', adjudicationTags: ['accept_name_structure', 'event_selection_blocked'] },
  'MTI-REP-0004-P01': { readiness: 'partial', adjudicationTags: ['missing_name_partial'] },
  'MTI-REP-0004-P02': { readiness: 'reviewable_core', adjudicationTags: ['tent_quantity_unknown'] },
  'MTI-REP-0007-P01': { readiness: 'reviewable_core', adjudicationTags: ['date_dependent_times_unsupported'] },
  'MTI-REP-0007-P02': { readiness: 'reviewable_core', adjudicationTags: ['date_dependent_times_unsupported', 'per_event_covers_dates'] },
  'MTI-REP-0007-P03': { readiness: 'reviewable_core', adjudicationTags: ['date_dependent_times_unsupported', 'per_event_covers_dates'] },
  'MTI-REP-0011-P01': { readiness: 'partial', adjudicationTags: ['linked_location_and_cost_choice'] },
  'MTI-REP-0011-P02': { readiness: 'partial', adjudicationTags: ['linked_location_and_cost_choice'] },
  'MTI-REP-0012-P01': { readiness: 'blocked', adjudicationTags: ['insufficient_blocked'] },
  'MTI-REP-0016-P01': { readiness: 'reviewable_core', adjudicationTags: ['accept'] },
  'MTI-REP-0016-P02': { readiness: 'blocked', adjudicationTags: ['recurrence_unsupported', 'event_selection_blocked'] },
  'MTI-REP-0018-P01': { readiness: 'blocked', adjudicationTags: ['rentable_not_selected', 'insufficient_blocked'] },
  'MTI-REP-0018-P02': { readiness: 'blocked', adjudicationTags: ['non_concrete_dates_unsupported', 'insufficient_blocked'] },
  'MTI-REP-0029-P01': { readiness: 'partial', adjudicationTags: ['selected_booth_total_inferable', 'missing_location_partial'] },
  'MTI-REP-0029-P02': { readiness: 'blocked', adjudicationTags: ['reject_empty_events'] },
  'MTI-REP-0036-P01': { readiness: 'reviewable_core', adjudicationTags: ['equipment_provision_unknown', 'accept_name_structure'] },
  'MTI-REP-0036-P02': { readiness: 'blocked', adjudicationTags: ['equipment_provision_unknown', 'event_selection_blocked'] },
  'MTI-REP-0042-P01': { readiness: 'blocked', adjudicationTags: ['reject_empty_events'] },
  'MTI-REP-0047-P01': { readiness: 'reviewable_core', adjudicationTags: ['date_dependent_area_preserved'] },
  'MTI-REP-0047-P02': { readiness: 'blocked', adjudicationTags: ['city_only_location_exact', 'recurrence_unsupported', 'event_selection_blocked'] },
};

const YAML_BLOCK = /^### (MTI-REP-\d{4}-P\d{2})\r?\n\r?\n```yaml\r?\n([\s\S]*?)\r?\n```/gm;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const parseReviewerResult = (source: string, headingFixtureId: string): ReviewerResult => {
  const parsed = yaml.load(source, { schema: yaml.JSON_SCHEMA });
  if (!isRecord(parsed) || parsed.fixtureId !== headingFixtureId) {
    throw new Error(`${headingFixtureId}: invalid or mismatched Reviewer B YAML`);
  }

  return parsed as unknown as ReviewerResult;
};

const normalizeNotPresentValues = (fixture: ReviewerResult): void => {
  for (const event of fixture.events) {
    const values = [
      event.marketName,
      event.eventDates,
      event.location,
      ...event.times,
      ...event.costs,
      ...event.equipment,
    ];
    for (const value of values) {
      if (value.status === 'not_present') {
        value.value = null;
        value.evidence = null;
      }
    }
  }
};

const applyRoundAFinalAdjudication = (fixture: ReviewerResult): void => {
  if (fixture.fixtureId === 'MTI-REP-0007-P02' || fixture.fixtureId === 'MTI-REP-0007-P03') {
    const event = fixture.events[0];
    const boothCost = event.costs.find((candidate) => candidate.role === 'booth_cost');
    if (!boothCost || !isRecord(boothCost.value) || !Array.isArray(event.eventDates.value)) {
      throw new Error(`${fixture.fixtureId}: cannot apply per-event cost adjudication`);
    }
    boothCost.role = 'selected_booth_total';
    boothCost.value.unit = 'per_event';
    boothCost.value.coversDates = [...event.eventDates.value];
  }

  if (fixture.fixtureId === 'MTI-REP-0011-P01' || fixture.fixtureId === 'MTI-REP-0011-P02') {
    const event = fixture.events[0];
    const options = event.costs
      .filter((candidate) => candidate.role === 'booth_option')
      .map((candidate) => ({
        label: isRecord(candidate.value) ? candidate.value.label : undefined,
        location: isRecord(candidate.value) ? candidate.value.linkedLocation : undefined,
        amount: isRecord(candidate.value) ? candidate.value.amount : undefined,
        evidence: candidate.evidence,
      }));
    if (options.length !== 2) {
      throw new Error(`${fixture.fixtureId}: linked location/cost adjudication needs two options`);
    }
    event.location.status = 'choice_required';
    event.location.options = options;
    event.location.optionGroupId = `${fixture.fixtureId}:booth-location`;
    for (const candidate of event.costs.filter((item) => item.role === 'booth_option')) {
      candidate.optionGroupId = `${fixture.fixtureId}:booth-location`;
    }
  }

  if (fixture.fixtureId === 'MTI-REP-0029-P01') {
    const boothCost = fixture.events[0].costs.find(
      (candidate) => candidate.role === 'selected_booth_cost',
    );
    if (!boothCost || boothCost.status !== 'inferable') {
      throw new Error(`${fixture.fixtureId}: cannot apply inferred booth-cost adjudication`);
    }
    boothCost.role = 'selected_booth_total';
  }
};

export const loadMarketTextImportGoldRoundAExpected = (
  projectRoot: string,
): MarketTextImportGoldRoundAExpected[] => {
  const reviewerPath = join(
    projectRoot,
    'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_B_V1_2026_09_15.md',
  );
  const markdown = readFileSync(reviewerPath, 'utf8');
  const results: MarketTextImportGoldRoundAExpected[] = [];

  for (const match of markdown.matchAll(YAML_BLOCK)) {
    const fixtureId = match[1];
    const finalDecision = ROUND_A_FINAL_DECISIONS[fixtureId];
    if (!finalDecision) {
      throw new Error(`${fixtureId}: missing Round A final adjudication decision`);
    }

    const reviewed = parseReviewerResult(match[2], fixtureId);
    if (reviewed.privacyReview !== 'pass') {
      throw new Error(`${fixtureId}: only privacy-pass fixtures may enter Gold`);
    }

    normalizeNotPresentValues(reviewed);
    applyRoundAFinalAdjudication(reviewed);

    results.push({
      schemaVersion: 1,
      fixtureId,
      round: 'A',
      privacyReview: 'pass',
      disposition: reviewed.eventDisposition,
      readiness: finalDecision.readiness,
      events: reviewed.events,
      ignoreSpans: reviewed.ignoreSpans,
      warnings: reviewed.warnings,
      notes: reviewed.notes,
      adjudicationTags: [...finalDecision.adjudicationTags],
    });
  }

  if (results.length !== Object.keys(ROUND_A_FINAL_DECISIONS).length) {
    throw new Error(
      `Round A expected-output coverage mismatch: loaded=${results.length}, decisions=${Object.keys(ROUND_A_FINAL_DECISIONS).length}`,
    );
  }

  return results;
};

export const getExpectedEvidenceTexts = (
  fixture: MarketTextImportGoldRoundAExpected,
): string[] => {
  const texts: string[] = [];

  for (const event of fixture.events) {
    const values = [
      event.marketName,
      event.eventDates,
      event.location,
      ...event.times,
      ...event.costs,
      ...event.equipment,
    ];
    for (const value of values) {
      if (typeof value.evidence === 'string') {
        texts.push(value.evidence);
      } else if (Array.isArray(value.evidence)) {
        texts.push(...value.evidence);
      }
    }
  }

  texts.push(...fixture.ignoreSpans.map((span) => span.text));
  return texts;
};
