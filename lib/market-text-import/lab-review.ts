import type { CandidateStatus, ParsedMarketDraft } from './types';

export type MarketTextImportLabVerdict = 'correct' | 'incorrect' | 'needs_rule' | 'not_reviewed';

export interface MarketTextImportLabCandidateReview {
  candidateId: string;
  field: string;
  status: CandidateStatus;
  reasonCode: string;
  applyPolicy: string;
  verdict: MarketTextImportLabVerdict;
}

export interface MarketTextImportLabReviewRecord {
  schemaVersion: 1;
  referenceDate: string;
  input: {
    characterCount: number;
    sensitiveContentDetected: boolean;
  };
  parser: {
    disposition: ParsedMarketDraft['disposition'];
    readiness: ParsedMarketDraft['readiness'];
    warningCodes: string[];
    candidateReviews: MarketTextImportLabCandidateReview[];
  };
  reviewer: {
    note: string;
  };
}

export function buildMarketTextImportLabReviewRecord(input: {
  inputText: string;
  referenceDate: string;
  draft: ParsedMarketDraft;
  verdicts: Readonly<Record<string, MarketTextImportLabVerdict | undefined>>;
  note: string;
}): MarketTextImportLabReviewRecord {
  return {
    schemaVersion: 1,
    referenceDate: input.referenceDate,
    input: {
      characterCount: Array.from(input.inputText).length,
      sensitiveContentDetected: input.draft.sensitiveSpans.length > 0,
    },
    parser: {
      disposition: input.draft.disposition,
      readiness: input.draft.readiness,
      warningCodes: input.draft.warnings.map(warning => warning.code),
      candidateReviews: input.draft.events.flatMap(event => event.candidates.map(candidate => ({
        candidateId: candidate.id,
        field: candidate.field,
        status: candidate.status,
        reasonCode: candidate.reasonCode,
        applyPolicy: candidate.applyPolicy,
        verdict: input.verdicts[candidate.id] ?? 'not_reviewed',
      }))),
    },
    reviewer: {
      note: input.note.trim(),
    },
  };
}
