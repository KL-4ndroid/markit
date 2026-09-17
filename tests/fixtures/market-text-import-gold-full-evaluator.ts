import {
  assessDraftGoldQualityGate,
  evaluateGoldResults,
  loadGoldEvaluationTargets,
  type EvaluationEvidence,
  type GoldEvaluationActual,
  type GoldEvaluationReport,
  type GoldEvaluationTarget,
  type MetricRate,
} from './market-text-import-gold-evaluator';
import { loadMarketTextImportGoldRoundAExpected } from './market-text-import-gold-round-a-expected';
import { loadMarketTextImportGoldRoundBExpected } from './market-text-import-gold-round-b-expected';
import { loadMarketTextImportGoldRoundCExpected } from './market-text-import-gold-round-c-expected';
import type { MarketTextImportPasteScenario } from './market-text-import-gold';

export type EvaluationGroup = 'core' | 'time' | 'money' | 'equipment' | 'warning';
type CandidateStatus =
  | 'exact'
  | 'inferable'
  | 'choice_required'
  | 'conflict'
  | 'not_present'
  | 'unsupported'
  | 'ignore';
type ApplyPolicy = 'eligible' | 'requires_option' | 'requires_extra_confirmation' | 'never';
type ExpectedNode = Record<string, unknown>;

export interface FullEvaluationCandidate {
  candidateId: string;
  group: EvaluationGroup;
  semanticRole: string;
  status: CandidateStatus;
  normalizedValue: unknown;
  applyPolicy: ApplyPolicy;
  evidence: EvaluationEvidence[];
  sourceEventIndexes: number[];
  optionGroupId?: string;
  optionPayload?: unknown;
}

export interface LinkedOptionProjection {
  optionGroupId: string;
  candidateIds: string[];
  optionFingerprint: string;
}

export interface FullEvaluationEvent {
  candidates: FullEvaluationCandidate[];
  linkedOptions: LinkedOptionProjection[];
}

export interface FullGoldEvaluationTarget extends Omit<GoldEvaluationTarget, 'events'> {
  events: FullEvaluationEvent[];
  warnings: FullEvaluationCandidate[];
}

export interface FullGoldEvaluationActual extends Omit<GoldEvaluationActual, 'events'> {
  events: FullEvaluationEvent[];
  warnings: FullEvaluationCandidate[];
}

export interface FieldEvaluationMetrics {
  candidatePrecision: MetricRate;
  supportedRecall: MetricRate;
  eligiblePrecision: MetricRate;
  evidenceIntegrity: MetricRate;
  candidateCount: number;
  expectedSupportedCount: number;
}

export interface FullEvaluationMetrics extends FieldEvaluationMetrics {
  linkedOptionIntegrity: MetricRate;
  warningPrecision: MetricRate;
  warningRecall: MetricRate;
  unsafeApplyCount: number;
  externalEvidenceViolations: number;
  optionIntegrityViolations: number;
}

export interface FullGoldEvaluationReport {
  core: GoldEvaluationReport;
  overall: FullEvaluationMetrics;
  byGroup: Record<EvaluationGroup, FieldEvaluationMetrics>;
  byStatus: Record<CandidateStatus, FieldEvaluationMetrics>;
  byRound: Record<'A' | 'B' | 'C', FullEvaluationMetrics>;
  byScenario: Record<MarketTextImportPasteScenario, FullEvaluationMetrics>;
}

export interface FrozenGoldQualityThresholdsV1 {
  version: 1;
  hardZero: readonly [
    'rejectLeakCount',
    'crossEventMergeViolations',
    'unsafeApplyCount',
    'administrativeDateLeakageCount',
    'externalEvidenceViolations',
    'optionIntegrityViolations',
  ];
  focused: {
    dispositionAccuracy: 1;
    eventCountAccuracy: 1;
    eligiblePrecision: 0.99;
    candidatePrecision: 0.99;
    supportedRecall: 0.90;
    evidenceIntegrity: 1;
    linkedOptionIntegrity: 1;
  };
  overall: {
    dispositionAccuracy: 0.98;
    eventCountAccuracy: 0.98;
    eligiblePrecision: 0.98;
    candidatePrecision: 0.98;
    supportedRecall: 0.85;
    evidenceIntegrity: 1;
    linkedOptionIntegrity: 1;
  };
}

export const FROZEN_GOLD_QUALITY_THRESHOLDS_V1: FrozenGoldQualityThresholdsV1 = {
  version: 1,
  hardZero: [
    'rejectLeakCount',
    'crossEventMergeViolations',
    'unsafeApplyCount',
    'administrativeDateLeakageCount',
    'externalEvidenceViolations',
    'optionIntegrityViolations',
  ],
  focused: {
    dispositionAccuracy: 1,
    eventCountAccuracy: 1,
    eligiblePrecision: 0.99,
    candidatePrecision: 0.99,
    supportedRecall: 0.90,
    evidenceIntegrity: 1,
    linkedOptionIntegrity: 1,
  },
  overall: {
    dispositionAccuracy: 0.98,
    eventCountAccuracy: 0.98,
    eligiblePrecision: 0.98,
    candidatePrecision: 0.98,
    supportedRecall: 0.85,
    evidenceIntegrity: 1,
    linkedOptionIntegrity: 1,
  },
};

interface LoadedExpected {
  fixtureId: string;
  round: 'A' | 'B' | 'C';
  events: unknown[];
  warnings: unknown[];
}

const isRecord = (value: unknown): value is ExpectedNode => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isStatus = (value: unknown): value is CandidateStatus => (
  value === 'exact'
  || value === 'inferable'
  || value === 'choice_required'
  || value === 'conflict'
  || value === 'not_present'
  || value === 'unsupported'
  || value === 'ignore'
);

const stableValue = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

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

const classifyGroup = (path: string, node: ExpectedNode): Exclude<EvaluationGroup, 'core' | 'warning'> => {
  const hint = `${path} ${String(node.role ?? '')} ${String(node.type ?? '')}`.toLowerCase();
  if (/(time|hour|check.?in|setup|teardown|operation|報到)/.test(hint)) return 'time';
  if (/(cost|price|deposit|payment|fee|amount|discount|rental|money|攤位費|保證金)/.test(hint)) return 'money';
  return 'equipment';
};

const normalizedCandidateValue = (node: ExpectedNode): unknown => {
  if (node.status === 'not_present') return null;
  if ('value' in node) return node.value;
  const excluded = new Set([
    'status',
    'evidence',
    'reason',
    'inference',
    'inferenceBasis',
    'inferenceSource',
    'currencyEvidence',
    'applyPolicy',
    'optionGroupId',
  ]);
  const normalized = Object.fromEntries(
    Object.entries(node).filter(([key]) => !excluded.has(key)),
  );
  return Object.keys(normalized).length === 0 ? null : normalized;
};

const applyPolicyFor = (
  group: EvaluationGroup,
  role: string,
  node: ExpectedNode,
  normalizedValue: unknown,
): ApplyPolicy => {
  const status = node.status as CandidateStatus;
  if (status === 'choice_required') return 'requires_option';
  if (status !== 'exact' && status !== 'inferable') return 'never';
  if (normalizedValue === null || group === 'warning') return 'never';
  const hint = `${role} ${stableValue(normalizedValue)}`.toLowerCase();

  if (group === 'time') {
    return /(operation_start|operation_end|operation_hours|operatingstarttime|operatingendtime)/.test(hint)
      ? 'eligible'
      : 'never';
  }
  if (group === 'money') {
    if (/(published|option|payment|received|due|refund|equipment|power|unit_price)/.test(hint)) return 'never';
    if (/(selected_booth|boothcost|booth_cost|deposit)/.test(hint)) {
      return /currencyStatus":"unknown|currency":null/.test(stableValue(normalizedValue)) ? 'never' : 'eligible';
    }
    return 'never';
  }
  if (group === 'equipment') {
    return /(included_free|provision":"included|rentable_selected|selected_rental)/.test(hint)
      ? 'eligible'
      : 'never';
  }
  return 'never';
};

const coreKeys = new Set([
  'marketName',
  'eventName',
  'eventDates',
  'dates',
  'selectedDates',
  'activityRange',
  'location',
]);

interface CandidateDraft extends Omit<FullEvaluationCandidate, 'candidateId'> {
  baseId: string;
}

const projectComplexCandidates = (event: unknown, eventIndex: number): CandidateDraft[] => {
  const candidates: CandidateDraft[] = [];
  const visit = (value: unknown, path: string, key: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`, key));
      return;
    }
    if (!isRecord(value)) return;
    if (isStatus(value.status)) {
      const group = classifyGroup(path, value);
      const role = String(value.role ?? value.type ?? key);
      const typeSuffix = value.role && value.type ? `:${String(value.type)}` : '';
      const normalizedValue = normalizedCandidateValue(value);
      candidates.push({
        baseId: `${group}:${role}${typeSuffix}`,
        group,
        semanticRole: `${role}${typeSuffix}`,
        status: value.status,
        normalizedValue,
        applyPolicy: applyPolicyFor(group, role, value, normalizedValue),
        evidence: [
          ...toEvidence(value.evidence),
          ...toEvidence(value.currencyEvidence),
        ],
        sourceEventIndexes: [eventIndex],
        optionGroupId: typeof value.optionGroupId === 'string' ? value.optionGroupId : undefined,
        optionPayload: value.options ?? (value.status === 'choice_required' ? normalizedValue : undefined),
      });
      return;
    }
    for (const [childKey, child] of Object.entries(value)) {
      if (!coreKeys.has(childKey)) visit(child, path ? `${path}.${childKey}` : childKey, childKey);
    }
  };

  if (isRecord(event)) {
    for (const [key, value] of Object.entries(event)) {
      if (!coreKeys.has(key)) visit(value, key, key);
    }
  }
  return candidates;
};

const finalizeCandidateIds = (drafts: CandidateDraft[]): FullEvaluationCandidate[] => {
  const counts = new Map<string, number>();
  return drafts.map(({ baseId, ...candidate }) => {
    const index = counts.get(baseId) ?? 0;
    counts.set(baseId, index + 1);
    return { ...candidate, candidateId: `${baseId}:${index}` };
  });
};

const projectWarnings = (warnings: unknown[]): FullEvaluationCandidate[] => {
  const counts = new Map<string, number>();
  return warnings.map((warning) => {
    const node = isRecord(warning) ? warning : { message: String(warning) };
    const role = String(node.code ?? 'annotation_warning');
    const index = counts.get(role) ?? 0;
    counts.set(role, index + 1);
    return {
      candidateId: `warning:${role}:${index}`,
      group: 'warning' as const,
      semanticRole: role,
      status: 'exact' as const,
      normalizedValue: node.code ?? node.message ?? node.warning ?? warning,
      applyPolicy: 'never' as const,
      evidence: toEvidence(node.evidence),
      sourceEventIndexes: [],
    };
  });
};

const buildLinkedOptions = (candidates: FullEvaluationCandidate[]): LinkedOptionProjection[] => {
  const grouped = new Map<string, FullEvaluationCandidate[]>();
  for (const candidate of candidates) {
    if (candidate.status !== 'choice_required') continue;
    const groupId = candidate.optionGroupId ?? candidate.candidateId;
    grouped.set(groupId, [...(grouped.get(groupId) ?? []), candidate]);
  }
  return [...grouped.entries()].map(([optionGroupId, groupCandidates]) => ({
    optionGroupId,
    candidateIds: groupCandidates.map((candidate) => candidate.candidateId).sort(),
    optionFingerprint: stableValue(
      groupCandidates
        .map((candidate) => candidate.optionPayload)
        .sort((left, right) => stableValue(left).localeCompare(stableValue(right))),
    ),
  }));
};

const convertCoreCandidates = (
  target: GoldEvaluationTarget,
  eventIndex: number,
): FullEvaluationCandidate[] => target.events[eventIndex].coreCandidates.map((candidate, index) => ({
  candidateId: `core:${candidate.field}:${index}`,
  group: 'core',
  semanticRole: candidate.semanticRole,
  status: candidate.status,
  normalizedValue: candidate.normalizedValue,
  applyPolicy: candidate.applyPolicy,
  evidence: candidate.evidence,
  sourceEventIndexes: candidate.sourceEventIndexes,
  optionPayload: candidate.status === 'choice_required' ? candidate.normalizedValue : undefined,
}));

export const loadFullGoldEvaluationTargets = (projectRoot: string): FullGoldEvaluationTarget[] => {
  const coreTargets = loadGoldEvaluationTargets(projectRoot);
  const rawExpected: LoadedExpected[] = [
    ...loadMarketTextImportGoldRoundAExpected(projectRoot),
    ...loadMarketTextImportGoldRoundBExpected(projectRoot),
    ...loadMarketTextImportGoldRoundCExpected(projectRoot),
  ];
  const rawById = new Map(rawExpected.map((fixture) => [fixture.fixtureId, fixture]));

  return coreTargets.map((target) => {
    const raw = rawById.get(target.fixtureId);
    if (!raw) throw new Error(`${target.fixtureId}: missing raw expected annotation`);
    const events = raw.events.map((event, eventIndex) => {
      const candidates = [
        ...convertCoreCandidates(target, eventIndex),
        ...finalizeCandidateIds(projectComplexCandidates(event, eventIndex)),
      ];
      return { candidates, linkedOptions: buildLinkedOptions(candidates) };
    });
    return {
      fixtureId: target.fixtureId,
      round: target.round,
      pasteScenario: target.pasteScenario,
      inputText: target.inputText,
      referenceDate: target.referenceDate,
      disposition: target.disposition,
      readiness: target.readiness,
      events,
      warnings: projectWarnings(raw.warnings),
    };
  });
};

const rate = (numerator: number, denominator: number): MetricRate => ({
  numerator,
  denominator,
  rate: denominator === 0 ? 1 : numerator / denominator,
});

const evidenceIsValid = (
  target: FullGoldEvaluationTarget,
  evidence: EvaluationEvidence,
): boolean => {
  if (evidence.source === 'external') return false;
  if (evidence.source === 'reference_date') return evidence.text === target.referenceDate;
  if (evidence.start === undefined && evidence.end === undefined) return target.inputText.includes(evidence.text);
  if (typeof evidence.start !== 'number' || typeof evidence.end !== 'number') return false;
  return Array.from(target.inputText).slice(evidence.start, evidence.end).join('') === evidence.text;
};

const candidateExact = (expected: FullEvaluationCandidate, actual: FullEvaluationCandidate): boolean => (
  expected.candidateId === actual.candidateId
  && expected.group === actual.group
  && expected.semanticRole === actual.semanticRole
  && expected.status === actual.status
  && expected.applyPolicy === actual.applyPolicy
  && stableValue(expected.normalizedValue) === stableValue(actual.normalizedValue)
);

const optionKey = (option: LinkedOptionProjection): string => `${option.optionGroupId}:${option.optionFingerprint}`;

const flattenCandidates = (
  fixture: FullGoldEvaluationTarget | FullGoldEvaluationActual,
): FullEvaluationCandidate[] => [
  ...fixture.events.flatMap((event) => event.candidates),
  ...fixture.warnings,
];

interface ScopedCandidate {
  scope: string;
  candidate: FullEvaluationCandidate;
}

const scopeCandidates = (
  fixture: FullGoldEvaluationTarget | FullGoldEvaluationActual,
): ScopedCandidate[] => [
  ...fixture.events.flatMap((event, eventIndex) => event.candidates.map((candidate) => ({
    scope: `event:${eventIndex}`,
    candidate,
  }))),
  ...fixture.warnings.map((candidate) => ({ scope: 'warnings', candidate })),
];

const scopedCandidateKey = ({ scope, candidate }: ScopedCandidate): string => (
  `${scope}:${candidate.candidateId}`
);

const evaluateFieldSubset = (
  targets: readonly FullGoldEvaluationTarget[],
  actualById: ReadonlyMap<string, FullGoldEvaluationActual>,
  group?: EvaluationGroup,
  status?: CandidateStatus,
): FieldEvaluationMetrics => {
  let correct = 0;
  let actualCount = 0;
  let expectedSupported = 0;
  let supportedMatches = 0;
  let eligibleCount = 0;
  let eligibleCorrect = 0;
  let evidenceCount = 0;
  let evidenceCorrect = 0;

  for (const target of targets) {
    const actual = actualById.get(target.fixtureId);
    if (!actual) continue;
    const expectedCandidates = scopeCandidates(target).filter(({ candidate }) => (
      (!group || candidate.group === group) && (!status || candidate.status === status)
    ));
    const actualCandidates = scopeCandidates(actual).filter(({ candidate }) => (
      (!group || candidate.group === group) && (!status || candidate.status === status)
    ));
    const expectedById = new Map(expectedCandidates.map((entry) => [scopedCandidateKey(entry), entry.candidate]));
    actualCount += actualCandidates.length;
    expectedSupported += expectedCandidates.filter(
      ({ candidate }) => candidate.status === 'exact' || candidate.status === 'inferable',
    ).length;

    for (const entry of actualCandidates) {
      const { candidate } = entry;
      const expected = expectedById.get(scopedCandidateKey(entry));
      const exact = expected ? candidateExact(expected, candidate) : false;
      if (exact) correct += 1;
      if (exact && expected && (expected.status === 'exact' || expected.status === 'inferable')) {
        supportedMatches += 1;
      }
      if (candidate.applyPolicy === 'eligible') {
        eligibleCount += 1;
        if (exact && expected?.applyPolicy === 'eligible') eligibleCorrect += 1;
      }
      for (const evidence of candidate.evidence) {
        evidenceCount += 1;
        if (evidenceIsValid(target, evidence)) evidenceCorrect += 1;
      }
    }
  }

  return {
    candidatePrecision: rate(correct, actualCount),
    supportedRecall: rate(supportedMatches, expectedSupported),
    eligiblePrecision: rate(eligibleCorrect, eligibleCount),
    evidenceIntegrity: rate(evidenceCorrect, evidenceCount),
    candidateCount: actualCount,
    expectedSupportedCount: expectedSupported,
  };
};

const evaluateFullSubset = (
  targets: readonly FullGoldEvaluationTarget[],
  actualById: ReadonlyMap<string, FullGoldEvaluationActual>,
): FullEvaluationMetrics => {
  const fieldMetrics = evaluateFieldSubset(targets, actualById);
  let optionExpected = 0;
  let optionCorrect = 0;
  let unsafeApplyCount = 0;
  let externalEvidenceViolations = 0;
  let optionIntegrityViolations = 0;

  for (const target of targets) {
    const actual = actualById.get(target.fixtureId);
    if (!actual) continue;
    const expectedCandidates = new Map(scopeCandidates(target).map((entry) => [scopedCandidateKey(entry), entry.candidate]));
    for (const entry of scopeCandidates(actual)) {
      const { candidate } = entry;
      const expected = expectedCandidates.get(scopedCandidateKey(entry));
      if (
        candidate.applyPolicy === 'eligible'
        && (!expected || expected.applyPolicy !== 'eligible' || !candidateExact(expected, candidate))
      ) unsafeApplyCount += 1;
      externalEvidenceViolations += candidate.evidence.filter((evidence) => evidence.source === 'external').length;
    }

    const eventCount = Math.max(target.events.length, actual.events.length);
    for (let eventIndex = 0; eventIndex < eventCount; eventIndex += 1) {
      const expectedOptions = target.events[eventIndex]?.linkedOptions ?? [];
      const actualOptions = actual.events[eventIndex]?.linkedOptions ?? [];
      const actualKeys = new Set(actualOptions.map(optionKey));
      optionExpected += expectedOptions.length;
      optionCorrect += expectedOptions.filter((option) => actualKeys.has(optionKey(option))).length;
      optionIntegrityViolations += actualOptions.filter(
        (option) => !expectedOptions.some((expected) => optionKey(expected) === optionKey(option)),
      ).length;
    }
  }

  const warningMetrics = evaluateFieldSubset(targets, actualById, 'warning');
  return {
    ...fieldMetrics,
    linkedOptionIntegrity: rate(optionCorrect, optionExpected),
    warningPrecision: warningMetrics.candidatePrecision,
    warningRecall: warningMetrics.supportedRecall,
    unsafeApplyCount,
    externalEvidenceViolations,
    optionIntegrityViolations,
  };
};

const toCoreActual = (actual: FullGoldEvaluationActual): GoldEvaluationActual => ({
  fixtureId: actual.fixtureId,
  disposition: actual.disposition,
  readiness: actual.readiness,
  events: actual.events.map((event) => ({
    coreCandidates: event.candidates
      .filter((candidate) => candidate.group === 'core')
      .map((candidate) => ({
        field: candidate.semanticRole === 'market_name'
          ? 'name'
          : candidate.semanticRole === 'event_dates'
            ? 'dates'
            : 'location',
        semanticRole: candidate.semanticRole as 'market_name' | 'event_dates' | 'event_location' | 'administrative_date',
        status: candidate.status,
        normalizedValue: candidate.normalizedValue,
        applyPolicy: candidate.applyPolicy,
        evidence: candidate.evidence,
        sourceEventIndexes: candidate.sourceEventIndexes,
      })),
  })),
});

export const evaluateFullGoldResults = (
  targets: readonly FullGoldEvaluationTarget[],
  actualResults: readonly FullGoldEvaluationActual[],
): FullGoldEvaluationReport => {
  const actualById = new Map<string, FullGoldEvaluationActual>();
  for (const actual of actualResults) {
    if (actualById.has(actual.fixtureId)) throw new Error(`duplicate actual result ${actual.fixtureId}`);
    actualById.set(actual.fixtureId, actual);
  }
  const targetIds = new Set(targets.map((target) => target.fixtureId));
  const missing = targets.filter((target) => !actualById.has(target.fixtureId));
  const extras = actualResults.filter((actual) => !targetIds.has(actual.fixtureId));
  if (missing.length > 0 || extras.length > 0) {
    throw new Error(`actual result coverage mismatch: missing=${missing.length}, extra=${extras.length}`);
  }

  const coreTargets: GoldEvaluationTarget[] = loadCoreTargetsFromFull(targets);
  const core = evaluateGoldResults(coreTargets, actualResults.map(toCoreActual));
  return {
    core,
    overall: evaluateFullSubset(targets, actualById),
    byGroup: {
      core: evaluateFieldSubset(targets, actualById, 'core'),
      time: evaluateFieldSubset(targets, actualById, 'time'),
      money: evaluateFieldSubset(targets, actualById, 'money'),
      equipment: evaluateFieldSubset(targets, actualById, 'equipment'),
      warning: evaluateFieldSubset(targets, actualById, 'warning'),
    },
    byStatus: {
      exact: evaluateFieldSubset(targets, actualById, undefined, 'exact'),
      inferable: evaluateFieldSubset(targets, actualById, undefined, 'inferable'),
      choice_required: evaluateFieldSubset(targets, actualById, undefined, 'choice_required'),
      conflict: evaluateFieldSubset(targets, actualById, undefined, 'conflict'),
      not_present: evaluateFieldSubset(targets, actualById, undefined, 'not_present'),
      unsupported: evaluateFieldSubset(targets, actualById, undefined, 'unsupported'),
      ignore: evaluateFieldSubset(targets, actualById, undefined, 'ignore'),
    },
    byRound: {
      A: evaluateFullSubset(targets.filter((target) => target.round === 'A'), actualById),
      B: evaluateFullSubset(targets.filter((target) => target.round === 'B'), actualById),
      C: evaluateFullSubset(targets.filter((target) => target.round === 'C'), actualById),
    },
    byScenario: {
      focused_block: evaluateFullSubset(targets.filter((target) => target.pasteScenario === 'focused_block'), actualById),
      focused_with_context: evaluateFullSubset(targets.filter((target) => target.pasteScenario === 'focused_with_context'), actualById),
      full_message_stress: evaluateFullSubset(targets.filter((target) => target.pasteScenario === 'full_message_stress'), actualById),
    },
  };
};

const loadCoreTargetsFromFull = (targets: readonly FullGoldEvaluationTarget[]): GoldEvaluationTarget[] => targets.map((target) => ({
  fixtureId: target.fixtureId,
  round: target.round,
  pasteScenario: target.pasteScenario,
  inputText: target.inputText,
  referenceDate: target.referenceDate,
  disposition: target.disposition,
  readiness: target.readiness,
  events: target.events.map((event) => ({
    coreCandidates: event.candidates
      .filter((candidate) => candidate.group === 'core')
      .map((candidate) => ({
        field: candidate.semanticRole === 'market_name'
          ? 'name'
          : candidate.semanticRole === 'event_dates'
            ? 'dates'
            : 'location',
        semanticRole: candidate.semanticRole as 'market_name' | 'event_dates' | 'event_location' | 'administrative_date',
        status: candidate.status,
        normalizedValue: candidate.normalizedValue,
        applyPolicy: candidate.applyPolicy,
        evidence: candidate.evidence,
        sourceEventIndexes: candidate.sourceEventIndexes,
      })),
  })),
}));

export const createPerfectFullGoldActualResults = (
  targets: readonly FullGoldEvaluationTarget[],
): FullGoldEvaluationActual[] => targets.map((target) => ({
  fixtureId: target.fixtureId,
  disposition: target.disposition,
  readiness: target.readiness,
  events: structuredClone(target.events),
  warnings: structuredClone(target.warnings),
}));

export const assessFrozenGoldQualityGateV1 = (
  report: FullGoldEvaluationReport,
): { passed: boolean; failures: string[]; thresholds: FrozenGoldQualityThresholdsV1 } => {
  const failures = [...assessDraftGoldQualityGate(report.core).failures];
  const thresholds = FROZEN_GOLD_QUALITY_THRESHOLDS_V1;
  const focused = report.byScenario.focused_block;
  const overall = report.overall;
  const requireRate = (label: string, value: number, minimum: number): void => {
    if (value < minimum) failures.push(`${label} must be >= ${minimum}, received ${value}`);
  };
  const requireZero = (label: string, value: number): void => {
    if (value !== 0) failures.push(`${label} must be 0, received ${value}`);
  };

  requireZero('full unsafeApplyCount', overall.unsafeApplyCount);
  requireZero('full externalEvidenceViolations', overall.externalEvidenceViolations);
  requireZero('full optionIntegrityViolations', overall.optionIntegrityViolations);
  requireRate('focused full candidatePrecision', focused.candidatePrecision.rate, thresholds.focused.candidatePrecision);
  requireRate('focused full supportedRecall', focused.supportedRecall.rate, thresholds.focused.supportedRecall);
  requireRate('focused full eligiblePrecision', focused.eligiblePrecision.rate, thresholds.focused.eligiblePrecision);
  requireRate('focused full evidenceIntegrity', focused.evidenceIntegrity.rate, thresholds.focused.evidenceIntegrity);
  requireRate('focused linkedOptionIntegrity', focused.linkedOptionIntegrity.rate, thresholds.focused.linkedOptionIntegrity);
  requireRate('overall full candidatePrecision', overall.candidatePrecision.rate, thresholds.overall.candidatePrecision);
  requireRate('overall full supportedRecall', overall.supportedRecall.rate, thresholds.overall.supportedRecall);
  requireRate('overall full eligiblePrecision', overall.eligiblePrecision.rate, thresholds.overall.eligiblePrecision);
  requireRate('overall full evidenceIntegrity', overall.evidenceIntegrity.rate, thresholds.overall.evidenceIntegrity);
  requireRate('overall linkedOptionIntegrity', overall.linkedOptionIntegrity.rate, thresholds.overall.linkedOptionIntegrity);

  return { passed: failures.length === 0, failures, thresholds };
};

export const summarizeFullGoldEvaluation = (report: FullGoldEvaluationReport): Record<string, unknown> => ({
  thresholdVersion: FROZEN_GOLD_QUALITY_THRESHOLDS_V1.version,
  overall: report.overall,
  core: report.core.overall,
  byGroup: report.byGroup,
  byStatus: report.byStatus,
  byRound: report.byRound,
  byScenario: report.byScenario,
});
