import type { ParsedMarketDraft } from './types';

export interface ParsedMarketDraftValidation {
  valid: boolean;
  errors: string[];
}

export const validateParsedMarketDraft = (
  inputText: string,
  referenceDate: string,
  draft: ParsedMarketDraft,
): ParsedMarketDraftValidation => {
  const errors: string[] = [];
  const inputPoints = Array.from(inputText);
  const ids = new Set<string>();
  const evidenceIds = new Set(draft.evidence.map((evidence) => evidence.id));
  const requireUnique = (id: string): void => {
    if (ids.has(id)) errors.push(`duplicate id: ${id}`);
    ids.add(id);
  };
  const requireEvidenceIds = (owner: string, values: readonly string[]): void => {
    values.forEach((id) => {
      if (!evidenceIds.has(id)) errors.push(`${owner}: missing evidence ${id}`);
    });
  };

  if (draft.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (draft.disposition === 'reject' && draft.events.length !== 0) errors.push('reject must not contain events');
  if (draft.disposition === 'single_candidate' && draft.events.length !== 1) errors.push('single_candidate must contain one event');
  if (draft.disposition === 'event_selection_required' && draft.events.length < 2) {
    errors.push('event_selection_required must contain at least two events');
  }

  for (const evidence of draft.evidence) {
    requireUnique(evidence.id);
    if (evidence.source === 'reference_date') {
      if (evidence.text !== referenceDate || evidence.start !== null || evidence.end !== null) {
        errors.push(`${evidence.id}: invalid reference_date evidence`);
      }
      continue;
    }
    if (
      typeof evidence.start !== 'number'
      || typeof evidence.end !== 'number'
      || evidence.start < 0
      || evidence.end < evidence.start
      || inputPoints.slice(evidence.start, evidence.end).join('') !== evidence.text
    ) errors.push(`${evidence.id}: invalid input_text evidence`);
  }

  for (const event of draft.events) {
    requireUnique(event.id);
    const candidateIds = event.candidates.map((candidate) => candidate.id);
    if (JSON.stringify(candidateIds) !== JSON.stringify(event.candidateIds)) {
      errors.push(`${event.id}: candidateIds do not match candidates`);
    }
    for (const candidate of event.candidates) {
      requireUnique(candidate.id);
      requireEvidenceIds(candidate.id, candidate.evidenceIds);
      if (candidate.status === 'not_present' && (candidate.value !== null || candidate.evidenceIds.length > 0)) {
        errors.push(`${candidate.id}: invalid not_present candidate`);
      }
      if (candidate.status === 'choice_required' && (candidate.options?.length ?? 0) < 2) {
        errors.push(`${candidate.id}: choice_required needs at least two options`);
      }
      if (
        (candidate.status === 'conflict' || candidate.status === 'unsupported' || candidate.status === 'ignore')
        && candidate.applyPolicy !== 'never'
      ) errors.push(`${candidate.id}: unsafe apply policy`);
      candidate.options?.forEach((option) => {
        requireUnique(option.id);
        requireEvidenceIds(option.id, option.evidenceIds);
        if (!option.linkedCandidateIds.includes(candidate.id)) {
          errors.push(`${option.id}: option is not linked to its candidate`);
        }
      });
    }
  }

  draft.warnings.forEach((warning) => {
    requireUnique(warning.id);
    requireEvidenceIds(warning.id, warning.evidenceIds);
  });
  draft.ignoreSpans.forEach((span) => requireEvidenceIds('ignoreSpan', [span.evidenceId]));
  draft.sensitiveSpans.forEach((span) => requireEvidenceIds('sensitiveSpan', [span.evidenceId]));
  return { valid: errors.length === 0, errors };
};
