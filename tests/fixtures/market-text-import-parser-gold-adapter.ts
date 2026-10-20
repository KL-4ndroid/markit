import { parseMarketText } from '../../lib/market-text-import/parser';
import type { EvidenceSpan, FieldCandidate, ParsedDateValue } from '../../lib/market-text-import/types';
import type {
  CoreEvaluationCandidate,
  EvaluationEvidence,
  GoldEvaluationActual,
  GoldEvaluationTarget,
} from './market-text-import-gold-evaluator';

const dateValueForEvaluation = (value: unknown): unknown => {
  if (!value || typeof value !== 'object' || !('kind' in value)) return value;
  const dateValue = value as ParsedDateValue;
  if (dateValue.kind === 'selected_dates') return dateValue.dates;
  if (dateValue.kind === 'continuous_range') return { start: dateValue.start, end: dateValue.end };
  if (dateValue.kind === 'multiple_ranges') return dateValue.ranges;
  return null;
};

const evaluationEvidence = (
  candidate: FieldCandidate<unknown>,
  evidenceById: ReadonlyMap<string, EvidenceSpan>,
): EvaluationEvidence[] => candidate.evidenceIds.flatMap((id) => {
  const evidence = evidenceById.get(id);
  if (!evidence) return [];
  return [{
    source: evidence.source,
    text: evidence.text,
    start: evidence.start,
    end: evidence.end,
  }];
});

export const parseGoldTarget = (target: GoldEvaluationTarget): GoldEvaluationActual => {
  const response = parseMarketText({
    inputText: target.inputText,
    referenceDate: target.referenceDate,
    locale: 'zh-TW',
  });
  if (response.ok === false) throw new Error(`${target.fixtureId}: parser returned ${response.error.code}`);
  const evidenceById = new Map(response.draft.evidence.map((evidence) => [evidence.id, evidence]));
  return {
    fixtureId: target.fixtureId,
    disposition: response.draft.disposition,
    readiness: response.draft.readiness,
    events: response.draft.events.map((event, eventIndex) => ({
      coreCandidates: event.candidates.flatMap((candidate): CoreEvaluationCandidate[] => {
        if (candidate.field !== 'name' && candidate.field !== 'dates' && candidate.field !== 'location') return [];
        if (
          candidate.field === 'dates'
          && candidate.value
          && typeof candidate.value === 'object'
          && 'kind' in candidate.value
          && candidate.value.kind === 'recurrence'
          && 'rawRule' in candidate.value
          && typeof candidate.value.rawRule === 'string'
          && /每週|每周/.test(candidate.value.rawRule)
        ) return [];
        return [{
          field: candidate.field,
          semanticRole: candidate.field === 'name'
            ? 'market_name'
            : candidate.field === 'dates'
              ? 'event_dates'
              : 'event_location',
          status: candidate.status,
          normalizedValue: candidate.field === 'dates'
            ? dateValueForEvaluation(candidate.value)
            : candidate.value,
          applyPolicy: candidate.applyPolicy,
          evidence: evaluationEvidence(candidate, evidenceById),
          sourceEventIndexes: [eventIndex],
        }];
      }),
    })),
  };
};

export const parseGoldTargets = (targets: readonly GoldEvaluationTarget[]): GoldEvaluationActual[] => (
  targets.map(parseGoldTarget)
);
