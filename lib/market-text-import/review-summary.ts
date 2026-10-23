import type { MarketFormField, ParsedMarketEvent } from './types';

const CORE_FIELDS = ['name', 'location', 'dates'] as const;

/** Summarize parser evidence, never infer that absent evidence means absent text. */
export function buildImportReviewSummary(event: ParsedMarketEvent, current: Partial<Record<MarketFormField, unknown>>) {
  const recognized = new Set(event.candidates.filter(candidate => candidate.applyPolicy === 'eligible').map(candidate => candidate.field));
  const needsReview = new Set(event.candidates.filter(candidate => candidate.field !== 'warning_only' && candidate.applyPolicy !== 'eligible').map(candidate => candidate.field));
  const missingCore = CORE_FIELDS.filter(field => {
    const value = current[field];
    const hasValue = Array.isArray(value) ? value.length > 0 : typeof value === 'string' && value.trim().length > 0;
    return !hasValue && !recognized.has(field);
  });
  missingCore.forEach(field => needsReview.add(field));
  return { recognizedCount: recognized.size, reviewCount: needsReview.size, missingCore };
}
