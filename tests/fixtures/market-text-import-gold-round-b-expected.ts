import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as yaml from 'js-yaml';

import type {
  MarketTextImportDraftReadiness,
  MarketTextImportEventDisposition,
} from './market-text-import-gold-round-a-expected';

type ExpectedNode = Record<string, unknown>;

export interface MarketTextImportGoldRoundBExpected {
  schemaVersion: 1;
  fixtureId: string;
  round: 'B';
  reviewerId: 'Reviewer C' | 'Reviewer D';
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
  if (!isRecord(value)) {
    return;
  }

  if (value.status === 'not_present') {
    value.value = null;
    value.evidence = null;
  }
  Object.values(value).forEach(normalizeNotPresentNodes);
};

const readYamlFence = (markdown: string, fence: '~~~' | '```', path: string): string => {
  const escapedFence = fence.replace(/`/g, '\\`');
  const match = markdown.match(new RegExp(`${escapedFence}yaml\\r?\\n([\\s\\S]*?)\\r?\\n${escapedFence}`));
  if (!match) {
    throw new Error(`${path}: missing YAML fence`);
  }
  return match[1];
};

const normalizeReviewerC = (value: unknown): MarketTextImportGoldRoundBExpected => {
  if (!isRecord(value) || typeof value.fixtureId !== 'string') {
    throw new Error('Reviewer C result is missing fixtureId');
  }
  if (value.privacyReview !== 'pass' || !isDisposition(value.eventDisposition) || !isReadiness(value.draftReadiness)) {
    throw new Error(`${value.fixtureId}: invalid Reviewer C decision envelope`);
  }

  const events = Array.isArray(value.events) ? value.events.filter(isRecord) : [];
  normalizeNotPresentNodes(events);

  return {
    schemaVersion: 1,
    fixtureId: value.fixtureId,
    round: 'B',
    reviewerId: 'Reviewer C',
    privacyReview: 'pass',
    disposition: value.eventDisposition,
    readiness: value.draftReadiness,
    events,
    ignoreSpans: Array.isArray(value.ignoreSpans) ? value.ignoreSpans.filter(isRecord) : [],
    warnings: Array.isArray(value.warnings) ? value.warnings.filter((item) => isRecord(item) || typeof item === 'string') : [],
    notes: Array.isArray(value.notes) ? value.notes.filter((item) => isRecord(item) || typeof item === 'string') : [],
    reviewEvidence: [
      isRecord(value.eventDispositionBasis) ? value.eventDispositionBasis.evidence : null,
      isRecord(value.draftReadinessBasis) ? value.draftReadinessBasis.evidence : null,
    ].filter((item) => item !== null),
    adjudicationTags: ['accept'],
  };
};

const normalizeReviewerD = (value: unknown): MarketTextImportGoldRoundBExpected => {
  if (!isRecord(value) || typeof value.fixtureId !== 'string') {
    throw new Error('Reviewer D result is missing fixtureId');
  }
  const privacyReview = isRecord(value.privacyReview) ? value.privacyReview : null;
  const eventDisposition = isRecord(value.eventDisposition) ? value.eventDisposition : null;
  const draftReadiness = isRecord(value.draftReadiness) ? value.draftReadiness : null;
  if (
    privacyReview?.status !== 'pass'
    || !isDisposition(eventDisposition?.value)
    || !isReadiness(draftReadiness?.value)
  ) {
    throw new Error(`${value.fixtureId}: invalid Reviewer D decision envelope`);
  }

  const events = Array.isArray(value.events) ? value.events.filter(isRecord) : [];
  normalizeNotPresentNodes(events);

  return {
    schemaVersion: 1,
    fixtureId: value.fixtureId,
    round: 'B',
    reviewerId: 'Reviewer D',
    privacyReview: 'pass',
    disposition: eventDisposition.value,
    readiness: draftReadiness.value,
    events,
    ignoreSpans: Array.isArray(value.ignoreSpans) ? value.ignoreSpans.filter(isRecord) : [],
    warnings: Array.isArray(value.warnings) ? value.warnings.filter((item) => isRecord(item) || typeof item === 'string') : [],
    notes: Array.isArray(value.notes) ? value.notes.filter((item) => isRecord(item) || typeof item === 'string') : [],
    reviewEvidence: [privacyReview.evidence, eventDisposition.evidence, draftReadiness.evidence],
    adjudicationTags: ['accept'],
  };
};

const findNodeByRole = (value: unknown, role: string): ExpectedNode | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNodeByRole(item, role);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  if (value.role === role) return value;
  for (const child of Object.values(value)) {
    const found = findNodeByRole(child, role);
    if (found) return found;
  }
  return null;
};

const findNodeWithKey = (value: unknown, key: string): ExpectedNode | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNodeWithKey(item, key);
      if (found) return found;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  if (key in value) return value;
  for (const child of Object.values(value)) {
    const found = findNodeWithKey(child, key);
    if (found) return found;
  }
  return null;
};

const applyRoundBFinalAdjudication = (fixture: MarketTextImportGoldRoundBExpected): void => {
  const decisions: Record<string, {
    disposition: MarketTextImportEventDisposition;
    readiness: MarketTextImportDraftReadiness;
    tags: string[];
  }> = {
    'MTI-REP-0066-P01': {
      disposition: 'single_candidate',
      readiness: 'blocked',
      tags: ['single_event_with_market_scope_warning', 'core_date_conflict'],
    },
    'MTI-REP-0066-P02': {
      disposition: 'single_candidate',
      readiness: 'blocked',
      tags: ['same_level_correction_conflict', 'core_date_conflict'],
    },
    'MTI-REP-0069-P02': {
      disposition: 'single_candidate',
      readiness: 'partial',
      tags: ['published_fee_not_selected', 'linked_location_choice'],
    },
    'MTI-REP-0076-P01': {
      disposition: 'single_candidate',
      readiness: 'partial',
      tags: ['available_dates_choice_required'],
    },
    'MTI-REP-0076-P02': {
      disposition: 'single_candidate',
      readiness: 'blocked',
      tags: ['selected_dates_fee_dates_conflict'],
    },
    'MTI-REP-0078-P01': {
      disposition: 'single_candidate',
      readiness: 'partial',
      tags: ['per_date_booth_assignment_unsupported'],
    },
    'MTI-REP-0080-P03': {
      disposition: 'single_candidate',
      readiness: 'partial',
      tags: ['registration_date_role_inferable', 'legacy_private_token_aliases'],
    },
  };

  const decision = decisions[fixture.fixtureId];
  if (!decision) return;

  fixture.disposition = decision.disposition;
  fixture.readiness = decision.readiness;
  fixture.adjudicationTags = decision.tags;

  if (fixture.fixtureId === 'MTI-REP-0069-P02') {
    const publishedFee = findNodeByRole(fixture.events, 'booth_option');
    if (!publishedFee || publishedFee.selected !== false) {
      throw new Error(`${fixture.fixtureId}: cannot preserve unselected public fee`);
    }
    publishedFee.role = 'published_booth_price';
    publishedFee.status = 'choice_required';
    publishedFee.applyPolicy = 'never';
  }

  if (fixture.fixtureId === 'MTI-REP-0076-P01') {
    const eventDates = fixture.events[0]?.eventDates;
    if (!isRecord(eventDates) || eventDates.status !== 'choice_required') {
      throw new Error(`${fixture.fixtureId}: available dates must remain choice_required`);
    }
    const boothOptions = findNodeByRole(fixture.events, 'booth_option');
    if (!boothOptions) {
      throw new Error(`${fixture.fixtureId}: missing booth options`);
    }
    boothOptions.evidence = [
      '傘帳一天700元、兩天1,300元，含一桌二椅。',
      '全棚一天900元、兩天1,600元，含一桌二椅。',
    ];
  }

  if (fixture.fixtureId === 'MTI-REP-0076-P02') {
    const eventDates = fixture.events[0]?.eventDates;
    if (!isRecord(eventDates) || eventDates.status !== 'conflict') {
      throw new Error(`${fixture.fixtureId}: selected dates and fee dates must remain conflict`);
    }
  }

  if (fixture.fixtureId === 'MTI-REP-0078-P01') {
    const assignment = findNodeWithKey(fixture.events, 'perDateBoothAssignment');
    const candidate = assignment?.perDateBoothAssignment;
    if (!isRecord(candidate) || candidate.status !== 'unsupported') {
      throw new Error(`${fixture.fixtureId}: per-date booth assignment must remain unsupported`);
    }
  }

  if (fixture.fixtureId === 'MTI-REP-0080-P03') {
    const eventDates = fixture.events[0]?.eventDates;
    if (!isRecord(eventDates) || eventDates.status !== 'inferable') {
      throw new Error(`${fixture.fixtureId}: registration-form dates must remain inferable`);
    }
  }
};

export const loadMarketTextImportGoldRoundBExpected = (
  projectRoot: string,
): MarketTextImportGoldRoundBExpected[] => {
  const reviewerCPath = 'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_C_ROUND_B_V1_2026_09_15.md';
  const reviewerDPath = 'docs/MARKET_TEXT_IMPORT_PASTE_FIXTURE_BLIND_REVIEW_RESULT_D_ROUND_B_REMAINDER_V1_2026_09_16.md';
  const reviewerCMarkdown = readFileSync(join(projectRoot, reviewerCPath), 'utf8');
  const reviewerDMarkdown = readFileSync(join(projectRoot, reviewerDPath), 'utf8');
  const reviewerCResults: MarketTextImportGoldRoundBExpected[] = [];

  yaml.loadAll(
    readYamlFence(reviewerCMarkdown, '~~~', reviewerCPath),
    (document) => {
      if (document !== undefined && document !== null) {
        reviewerCResults.push(normalizeReviewerC(document));
      }
    },
    { schema: yaml.JSON_SCHEMA },
  );

  const reviewerDRoot = yaml.load(
    readYamlFence(reviewerDMarkdown, '```', reviewerDPath),
    { schema: yaml.JSON_SCHEMA },
  );
  if (!isRecord(reviewerDRoot) || !Array.isArray(reviewerDRoot.fixtures)) {
    throw new Error(`${reviewerDPath}: expected root fixtures list`);
  }
  const reviewerDResults = reviewerDRoot.fixtures.map(normalizeReviewerD);
  const results = [...reviewerCResults, ...reviewerDResults];

  if (reviewerCResults.length !== 25 || reviewerDResults.length !== 5 || results.length !== 30) {
    throw new Error(
      `Round B reviewer merge mismatch: C=${reviewerCResults.length}, D=${reviewerDResults.length}, total=${results.length}`,
    );
  }
  if (new Set(results.map((fixture) => fixture.fixtureId)).size !== results.length) {
    throw new Error('Round B reviewer merge contains duplicate fixture IDs');
  }

  results.forEach(applyRoundBFinalAdjudication);
  return results;
};

const collectEvidenceValue = (value: unknown, output: string[]): void => {
  if (typeof value === 'string') {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectEvidenceValue(item, output));
    return;
  }
  if (!isRecord(value)) return;
  if (typeof value.span === 'string') output.push(value.span);
  if (typeof value.text === 'string') output.push(value.text);
  if ('evidence' in value) collectEvidenceValue(value.evidence, output);
};

const collectEvidenceFromNode = (value: unknown, output: string[]): void => {
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

export const getRoundBExpectedEvidenceTexts = (
  fixture: MarketTextImportGoldRoundBExpected,
): string[] => {
  const output: string[] = [];
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
