import {
  classifyImportOutcome,
  type ImportOutcomeClassification,
  type ImportOutcomePhase,
} from './import-recovery-classifier';
import type { BackupData, IntegrityResult } from './integrity';

export interface PhaseAwareImportDependencies {
  parseBackupData(jsonData: string): BackupData;
  runPreImportIntegrityCheck(data: BackupData): IntegrityResult;
  runReplayReadinessCheck(data: BackupData): IntegrityResult;
  createEmergencyBackupBeforeImport(): Promise<void>;
  replaceImportedData(data: BackupData): Promise<void>;
  readPostImportData(sourceData: BackupData): Promise<BackupData>;
  runPostImportIntegrityCheck(data: BackupData): IntegrityResult;
  onWarnings?(warnings: string[]): void;
}

export interface PhaseAwareImportResult {
  classification: ImportOutcomeClassification;
  warnings: string[];
}

export class ImportOutcomeError extends Error {
  readonly phase: ImportOutcomePhase;
  readonly classification: ImportOutcomeClassification;
  readonly originalError: unknown;

  constructor(phase: ImportOutcomePhase, originalError: unknown) {
    super(originalError instanceof Error ? originalError.message : String(originalError));
    this.name = 'ImportOutcomeError';
    this.phase = phase;
    this.classification = classifyImportOutcome({ phase, ok: false });
    this.originalError = originalError;
  }
}

async function runPhase<T>(
  phase: ImportOutcomePhase,
  operation: () => T | Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new ImportOutcomeError(phase, error);
  }
}

export async function runPhaseAwareImport(
  jsonData: string,
  dependencies: PhaseAwareImportDependencies,
): Promise<PhaseAwareImportResult> {
  const data = await runPhase('parse', () => dependencies.parseBackupData(jsonData));
  const preImportCheck = await runPhase('integrity_precheck', () =>
    dependencies.runPreImportIntegrityCheck(data)
  );
  const replayReadiness = await runPhase('replay_readiness', () =>
    dependencies.runReplayReadinessCheck(data)
  );

  await runPhase('emergency_backup', () =>
    dependencies.createEmergencyBackupBeforeImport()
  );
  await runPhase('replacement_transaction', () =>
    dependencies.replaceImportedData(data)
  );

  const postImportData = await runPhase('post_import_validation', () =>
    dependencies.readPostImportData(data)
  );
  const postImportCheck = await runPhase('post_import_validation', () =>
    dependencies.runPostImportIntegrityCheck(postImportData)
  );

  const warnings = [
    ...preImportCheck.warnings,
    ...replayReadiness.warnings,
    ...postImportCheck.warnings,
  ];

  if (warnings.length > 0) {
    dependencies.onWarnings?.(warnings);
  }

  return {
    classification: classifyImportOutcome({
      phase: 'completed',
      ok: true,
      warningCount: warnings.length,
    }),
    warnings,
  };
}
