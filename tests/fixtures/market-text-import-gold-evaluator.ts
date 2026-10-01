import type {
  MarketTextImportDraftReadiness,
  MarketTextImportEventDisposition,
} from './market-text-import-gold-round-a-expected';
import { loadMarketTextImportGoldRoundAExpected } from './market-text-import-gold-round-a-expected';
import { loadMarketTextImportGoldRoundBExpected } from './market-text-import-gold-round-b-expected';
import { loadMarketTextImportGoldRoundCExpected } from './market-text-import-gold-round-c-expected';
import {
  loadMarketTextImportGoldInputs,
  type MarketTextImportGoldInputFixture,
  type MarketTextImportPasteScenario,
} from './market-text-import-gold';

type CoreField = 'name' | 'dates' | 'location';
type CandidateStatus =
  | 'exact'
  | 'inferable'
  | 'choice_required'
  | 'conflict'
  | 'not_present'
  | 'unsupported'
  | 'ignore';
type ApplyPolicy = 'eligible' | 'requires_option' | 'requires_extra_confirmation' | 'never';
type EvidenceSource = 'input_text' | 'reference_date' | 'external';
type ExpectedNode = Record<string, unknown>;

export interface EvaluationEvidence {
  source: EvidenceSource;
  text: string;
  start?: number | null;
  end?: number | null;
}

export interface CoreEvaluationCandidate {
  field: CoreField;
  semanticRole: 'market_name' | 'event_dates' | 'event_location' | 'administrative_date';
  status: CandidateStatus;
  normalizedValue: unknown;
  applyPolicy: ApplyPolicy;
  evidence: EvaluationEvidence[];
  sourceEventIndexes: number[];
}

export interface GoldEvaluationTarget {
  fixtureId: string;
  round: 'A' | 'B' | 'C';
  pasteScenario: MarketTextImportPasteScenario;
  inputText: string;
  referenceDate: string;
  disposition: MarketTextImportEventDisposition;
  readiness: MarketTextImportDraftReadiness;
  events: Array<{ coreCandidates: CoreEvaluationCandidate[] }>;
}

export interface GoldEvaluationActual {
  fixtureId: string;
  disposition: MarketTextImportEventDisposition;
  readiness: MarketTextImportDraftReadiness;
  events: Array<{ coreCandidates: CoreEvaluationCandidate[] }>;
}

export interface MetricRate {
  numerator: number;
  denominator: number;
  rate: number;
}

export interface GoldEvaluationMetrics {
  fixtureCount: number;
  dispositionAccuracy: MetricRate;
  readinessAccuracy: MetricRate;
  eventCountAccuracy: MetricRate;
  coreCandidatePrecision: MetricRate;
  coreSupportedRecall: MetricRate;
  eligiblePrecision: MetricRate;
  evidenceIntegrity: MetricRate;
  rejectLeakCount: number;
  crossEventMergeViolations: number;
  unsafeApplyCount: number;
  coreFalsePositiveCount: number;
  administrativeDateLeakageCount: number;
  externalEvidenceViolations: number;
}

export interface GoldEvaluationReport {
  overall: GoldEvaluationMetrics;
  byRound: Record<'A' | 'B' | 'C', GoldEvaluationMetrics>;
  byScenario: Record<MarketTextImportPasteScenario, GoldEvaluationMetrics>;
}

export interface GoldQualityGateAssessment {
  passed: boolean;
  failures: string[];
}

interface LoadedExpected {
  fixtureId: string;
  round: 'A' | 'B' | 'C';
  disposition: MarketTextImportEventDisposition;
  readiness: MarketTextImportDraftReadiness;
  events: unknown[];
}

const isRecord = (value: unknown): value is ExpectedNode => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isCandidateStatus = (value: unknown): value is CandidateStatus => (
  value === 'exact'
  || value === 'inferable'
  || value === 'choice_required'
  || value === 'conflict'
  || value === 'not_present'
  || value === 'unsupported'
  || value === 'ignore'
);

const toEvidence = (value: unknown): EvaluationEvidence[] => {
  const output: EvaluationEvidence[] = [];
  const visit = (item: unknown): void => {
    if (typeof item === 'string') {
      const referenceDate = item.match(/^referenceDate: (\d{4}-\d{2}-\d{2})$/);
      output.push(referenceDate
        ? { source: 'reference_date', text: referenceDate[1] }
        : { source: 'input_text', text: item });
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (!isRecord(item)) return;
    if (typeof item.span === 'string') visit(item.span);
    if (typeof item.text === 'string') visit(item.text);
    if ('evidence' in item) visit(item.evidence);
  };
  visit(value);
  return output;
};

const normalizedName = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return value.preferredDisplayName ?? value.value ?? value;
};

const normalizedLocation = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return value.venue ?? value.value ?? value;
};

const daySpan = (start: string, end: string): number | null => {
  const startTime = Date.parse(`${start}T00:00:00Z`);
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime < startTime) return null;
  return Math.floor((endTime - startTime) / 86_400_000) + 1;
};

const needsRangeConfirmation = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (typeof value.start === 'string' && typeof value.end === 'string') {
    return (daySpan(value.start, value.end) ?? 0) > 14;
  }
  if (Array.isArray(value.ranges)) {
    return value.ranges.some((range) => (
      isRecord(range)
      && typeof range.start === 'string'
      && typeof range.end === 'string'
      && (daySpan(range.start, range.end) ?? 0) > 14
    ));
  }
  if (Array.isArray(value)) {
    return value.some(needsRangeConfirmation);
  }
  return false;
};

const expectedApplyPolicy = (
  field: CoreField,
  status: CandidateStatus,
  value: unknown,
): ApplyPolicy => {
  if (status === 'choice_required') return 'requires_option';
  if (status !== 'exact' && status !== 'inferable') return 'never';
  if (value === null || value === undefined) return 'never';
  if (field === 'dates' && needsRangeConfirmation(value)) return 'requires_extra_confirmation';
  return 'eligible';
};

const createCoreCandidate = (
  field: CoreField,
  node: unknown,
  eventIndex: number,
): CoreEvaluationCandidate | null => {
  if (!isRecord(node) || !isCandidateStatus(node.status)) return null;
  const rawValue = node.value ?? null;
  const normalizedValue = field === 'name'
    ? normalizedName(rawValue)
    : field === 'location'
      ? normalizedLocation(rawValue)
      : rawValue;

  return {
    field,
    semanticRole: field === 'name'
      ? 'market_name'
      : field === 'dates'
        ? 'event_dates'
        : 'event_location',
    status: node.status,
    normalizedValue,
    applyPolicy: expectedApplyPolicy(field, node.status, normalizedValue),
    evidence: toEvidence(node.evidence),
    sourceEventIndexes: [eventIndex],
  };
};

const projectCoreEvent = (value: unknown, eventIndex: number): { coreCandidates: CoreEvaluationCandidate[] } => {
  if (!isRecord(value)) return { coreCandidates: [] };
  const nameNode = value.marketName ?? value.eventName;
  const datesNode = value.eventDates ?? value.dates ?? value.selectedDates ?? value.activityRange;
  const locationNode = value.location;
  const candidates = [
    createCoreCandidate('name', nameNode, eventIndex),
    createCoreCandidate('dates', datesNode, eventIndex),
    createCoreCandidate('location', locationNode, eventIndex),
  ].filter((candidate): candidate is CoreEvaluationCandidate => candidate !== null);
  return { coreCandidates: candidates };
};

export const loadGoldEvaluationTargets = (projectRoot: string): GoldEvaluationTarget[] => {
  const inputs = loadMarketTextImportGoldInputs(projectRoot);
  const inputById = new Map(inputs.map((fixture) => [fixture.fixtureId, fixture]));
  const expected: LoadedExpected[] = [
    ...loadMarketTextImportGoldRoundAExpected(projectRoot),
    ...loadMarketTextImportGoldRoundBExpected(projectRoot),
    ...loadMarketTextImportGoldRoundCExpected(projectRoot),
  ];

  return expected.map((fixture) => {
    const input = inputById.get(fixture.fixtureId);
    if (!input) throw new Error(`${fixture.fixtureId}: missing executable input for evaluator`);
    return {
      fixtureId: fixture.fixtureId,
      round: fixture.round,
      pasteScenario: input.pasteScenario,
      inputText: input.inputText,
      referenceDate: input.referenceDate,
      disposition: fixture.disposition,
      readiness: fixture.readiness,
      events: fixture.events.map(projectCoreEvent),
    };
  });
};

const stableValue = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const candidateKey = (candidate: CoreEvaluationCandidate): string => (
  `${candidate.field}:${candidate.semanticRole}`
);

const candidateExact = (
  expected: CoreEvaluationCandidate,
  actual: CoreEvaluationCandidate,
): boolean => (
  expected.field === actual.field
  && expected.semanticRole === actual.semanticRole
  && expected.status === actual.status
  && expected.applyPolicy === actual.applyPolicy
  && stableValue(expected.normalizedValue) === stableValue(actual.normalizedValue)
);

const evidenceIsValid = (
  fixture: GoldEvaluationTarget,
  evidence: EvaluationEvidence,
): boolean => {
  if (evidence.source === 'external') return false;
  if (evidence.source === 'reference_date') {
    return evidence.text === fixture.referenceDate
      && (evidence.start === undefined || evidence.start === null)
      && (evidence.end === undefined || evidence.end === null);
  }
  if (evidence.start === undefined && evidence.end === undefined) {
    return fixture.inputText.includes(evidence.text);
  }
  if (
    typeof evidence.start !== 'number'
    || typeof evidence.end !== 'number'
    || evidence.start < 0
    || evidence.end < evidence.start
  ) return false;
  return Array.from(fixture.inputText).slice(evidence.start, evidence.end).join('') === evidence.text;
};

const rate = (numerator: number, denominator: number): MetricRate => ({
  numerator,
  denominator,
  rate: denominator === 0 ? 1 : numerator / denominator,
});

const emptyMetrics = (): GoldEvaluationMetrics => ({
  fixtureCount: 0,
  dispositionAccuracy: rate(0, 0),
  readinessAccuracy: rate(0, 0),
  eventCountAccuracy: rate(0, 0),
  coreCandidatePrecision: rate(0, 0),
  coreSupportedRecall: rate(0, 0),
  eligiblePrecision: rate(0, 0),
  evidenceIntegrity: rate(0, 0),
  rejectLeakCount: 0,
  crossEventMergeViolations: 0,
  unsafeApplyCount: 0,
  coreFalsePositiveCount: 0,
  administrativeDateLeakageCount: 0,
  externalEvidenceViolations: 0,
});

const evaluateSubset = (
  targets: readonly GoldEvaluationTarget[],
  actualById: ReadonlyMap<string, GoldEvaluationActual>,
): GoldEvaluationMetrics => {
  if (targets.length === 0) return emptyMetrics();

  let dispositionMatches = 0;
  let readinessMatches = 0;
  let eventCountMatches = 0;
  let correctCandidates = 0;
  let actualCandidateCount = 0;
  let supportedExpectedCount = 0;
  let supportedMatches = 0;
  let eligibleActualCount = 0;
  let correctEligibleCount = 0;
  let evidenceCount = 0;
  let validEvidenceCount = 0;
  let rejectLeakCount = 0;
  let crossEventMergeViolations = 0;
  let unsafeApplyCount = 0;
  let coreFalsePositiveCount = 0;
  let administrativeDateLeakageCount = 0;
  let externalEvidenceViolations = 0;

  for (const target of targets) {
    const actual = actualById.get(target.fixtureId);
    if (!actual) continue;
    if (actual.disposition === target.disposition) dispositionMatches += 1;
    if (actual.readiness === target.readiness) readinessMatches += 1;
    if (actual.events.length === target.events.length) eventCountMatches += 1;
    if (target.disposition === 'reject' && actual.events.length > 0) rejectLeakCount += 1;

    const eventCount = Math.max(target.events.length, actual.events.length);
    for (let eventIndex = 0; eventIndex < eventCount; eventIndex += 1) {
      const expectedCandidates = target.events[eventIndex]?.coreCandidates ?? [];
      const actualCandidates = actual.events[eventIndex]?.coreCandidates ?? [];
      const expectedByKey = new Map(expectedCandidates.map((candidate) => [candidateKey(candidate), candidate]));
      actualCandidateCount += actualCandidates.length;
      supportedExpectedCount += expectedCandidates.filter(
        (candidate) => candidate.status !== 'not_present' && candidate.status !== 'ignore',
      ).length;

      for (const candidate of actualCandidates) {
        const expectedCandidate = expectedByKey.get(candidateKey(candidate));
        const isExact = expectedCandidate ? candidateExact(expectedCandidate, candidate) : false;
        if (isExact) correctCandidates += 1;
        if (
          isExact
          && expectedCandidate
          && expectedCandidate.status !== 'not_present'
          && expectedCandidate.status !== 'ignore'
        ) supportedMatches += 1;

        if (candidate.applyPolicy === 'eligible') {
          eligibleActualCount += 1;
          if (isExact && expectedCandidate?.applyPolicy === 'eligible') {
            correctEligibleCount += 1;
          } else {
            unsafeApplyCount += 1;
          }
        }
        if (
          candidate.normalizedValue !== null
          && (
            !expectedCandidate
            || expectedCandidate.status === 'not_present'
            || (expectedCandidate.status === 'unsupported' && candidate.status !== 'unsupported')
          )
        ) coreFalsePositiveCount += 1;
        if (candidate.sourceEventIndexes.length > 1) crossEventMergeViolations += 1;
        if (
          candidate.field === 'dates'
          && candidate.semanticRole === 'administrative_date'
          && candidate.applyPolicy === 'eligible'
        ) administrativeDateLeakageCount += 1;

        for (const evidence of candidate.evidence) {
          evidenceCount += 1;
          if (evidenceIsValid(target, evidence)) validEvidenceCount += 1;
          if (evidence.source === 'external') externalEvidenceViolations += 1;
        }
      }
    }
  }

  return {
    fixtureCount: targets.length,
    dispositionAccuracy: rate(dispositionMatches, targets.length),
    readinessAccuracy: rate(readinessMatches, targets.length),
    eventCountAccuracy: rate(eventCountMatches, targets.length),
    coreCandidatePrecision: rate(correctCandidates, actualCandidateCount),
    coreSupportedRecall: rate(supportedMatches, supportedExpectedCount),
    eligiblePrecision: rate(correctEligibleCount, eligibleActualCount),
    evidenceIntegrity: rate(validEvidenceCount, evidenceCount),
    rejectLeakCount,
    crossEventMergeViolations,
    unsafeApplyCount,
    coreFalsePositiveCount,
    administrativeDateLeakageCount,
    externalEvidenceViolations,
  };
};

export const evaluateGoldResults = (
  targets: readonly GoldEvaluationTarget[],
  actualResults: readonly GoldEvaluationActual[],
): GoldEvaluationReport => {
  const actualById = new Map<string, GoldEvaluationActual>();
  for (const actual of actualResults) {
    if (actualById.has(actual.fixtureId)) throw new Error(`duplicate actual result ${actual.fixtureId}`);
    actualById.set(actual.fixtureId, actual);
  }
  const expectedIds = new Set(targets.map((target) => target.fixtureId));
  const missing = targets.filter((target) => !actualById.has(target.fixtureId));
  const extras = actualResults.filter((actual) => !expectedIds.has(actual.fixtureId));
  if (missing.length > 0 || extras.length > 0) {
    throw new Error(`actual result coverage mismatch: missing=${missing.length}, extra=${extras.length}`);
  }

  return {
    overall: evaluateSubset(targets, actualById),
    byRound: {
      A: evaluateSubset(targets.filter((target) => target.round === 'A'), actualById),
      B: evaluateSubset(targets.filter((target) => target.round === 'B'), actualById),
      C: evaluateSubset(targets.filter((target) => target.round === 'C'), actualById),
    },
    byScenario: {
      focused_block: evaluateSubset(targets.filter((target) => target.pasteScenario === 'focused_block'), actualById),
      focused_with_context: evaluateSubset(targets.filter((target) => target.pasteScenario === 'focused_with_context'), actualById),
      full_message_stress: evaluateSubset(targets.filter((target) => target.pasteScenario === 'full_message_stress'), actualById),
    },
  };
};

export const createPerfectGoldActualResults = (
  targets: readonly GoldEvaluationTarget[],
): GoldEvaluationActual[] => targets.map((target) => ({
  fixtureId: target.fixtureId,
  disposition: target.disposition,
  readiness: target.readiness,
  events: structuredClone(target.events),
}));

export const assessDraftGoldQualityGate = (
  report: GoldEvaluationReport,
): GoldQualityGateAssessment => {
  const failures: string[] = [];
  const overall = report.overall;
  const focused = report.byScenario.focused_block;
  const requireZero = (label: string, value: number): void => {
    if (value !== 0) failures.push(`${label} must be 0, received ${value}`);
  };
  const requireRate = (label: string, value: number, minimum: number): void => {
    if (value < minimum) failures.push(`${label} must be >= ${minimum}, received ${value}`);
  };

  requireZero('rejectLeakCount', overall.rejectLeakCount);
  requireZero('crossEventMergeViolations', overall.crossEventMergeViolations);
  requireZero('unsafeApplyCount', overall.unsafeApplyCount);
  requireZero('administrativeDateLeakageCount', overall.administrativeDateLeakageCount);
  requireZero('externalEvidenceViolations', overall.externalEvidenceViolations);
  requireRate('overall evidenceIntegrity', overall.evidenceIntegrity.rate, 1);
  requireRate('focused dispositionAccuracy', focused.dispositionAccuracy.rate, 1);
  requireRate('focused eventCountAccuracy', focused.eventCountAccuracy.rate, 1);
  requireRate('focused eligiblePrecision', focused.eligiblePrecision.rate, 0.99);
  requireRate('focused coreCandidatePrecision', focused.coreCandidatePrecision.rate, 0.99);
  requireRate('focused coreSupportedRecall', focused.coreSupportedRecall.rate, 0.90);
  requireRate('overall dispositionAccuracy', overall.dispositionAccuracy.rate, 0.98);
  requireRate('overall eventCountAccuracy', overall.eventCountAccuracy.rate, 0.98);
  requireRate('overall eligiblePrecision', overall.eligiblePrecision.rate, 0.98);
  requireRate('overall coreCandidatePrecision', overall.coreCandidatePrecision.rate, 0.98);
  requireRate('overall coreSupportedRecall', overall.coreSupportedRecall.rate, 0.85);

  return { passed: failures.length === 0, failures };
};
