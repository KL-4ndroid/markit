export type ImportOutcomeState =
  | 'precheck_failed'
  | 'backup_failed'
  | 'transaction_failed'
  | 'post_import_validation_failed'
  | 'success_with_warnings'
  | 'success';

export type ImportOutcomePhase =
  | 'parse'
  | 'integrity_precheck'
  | 'replay_readiness'
  | 'emergency_backup'
  | 'replacement_transaction'
  | 'post_import_validation'
  | 'completed';

export type ImportOutcomeSeverity = 'info' | 'warning' | 'error' | 'critical';

export type ImportIndexedDbExpectation =
  | 'unchanged'
  | 'rollback_expected'
  | 'imported_data_present';

export interface ImportOutcomeClassificationInput {
  phase: ImportOutcomePhase;
  ok: boolean;
  warningCount?: number;
}

export interface ImportOutcomeClassification {
  state: ImportOutcomeState;
  severity: ImportOutcomeSeverity;
  indexedDbExpectation: ImportIndexedDbExpectation;
  shouldSuggestAutomaticRestore: false;
  requiresManualReview: boolean;
}

const PRECHECK_PHASES = new Set<ImportOutcomePhase>([
  'parse',
  'integrity_precheck',
  'replay_readiness',
]);

export function classifyImportOutcome(
  input: ImportOutcomeClassificationInput,
): ImportOutcomeClassification {
  if (input.ok) {
    if (input.phase !== 'completed') {
      throw new Error('Successful import outcome can only be classified from the completed phase.');
    }

    if ((input.warningCount ?? 0) > 0) {
      return {
        state: 'success_with_warnings',
        severity: 'warning',
        indexedDbExpectation: 'imported_data_present',
        shouldSuggestAutomaticRestore: false,
        requiresManualReview: false,
      };
    }

    return {
      state: 'success',
      severity: 'info',
      indexedDbExpectation: 'imported_data_present',
      shouldSuggestAutomaticRestore: false,
      requiresManualReview: false,
    };
  }

  if (input.phase === 'completed') {
    throw new Error('Failed import outcome must identify the failed phase.');
  }

  if (PRECHECK_PHASES.has(input.phase)) {
    return {
      state: 'precheck_failed',
      severity: 'error',
      indexedDbExpectation: 'unchanged',
      shouldSuggestAutomaticRestore: false,
      requiresManualReview: false,
    };
  }

  if (input.phase === 'emergency_backup') {
    return {
      state: 'backup_failed',
      severity: 'error',
      indexedDbExpectation: 'unchanged',
      shouldSuggestAutomaticRestore: false,
      requiresManualReview: false,
    };
  }

  if (input.phase === 'replacement_transaction') {
    return {
      state: 'transaction_failed',
      severity: 'error',
      indexedDbExpectation: 'rollback_expected',
      shouldSuggestAutomaticRestore: false,
      requiresManualReview: false,
    };
  }

  return {
    state: 'post_import_validation_failed',
    severity: 'critical',
    indexedDbExpectation: 'imported_data_present',
    shouldSuggestAutomaticRestore: false,
    requiresManualReview: true,
  };
}
