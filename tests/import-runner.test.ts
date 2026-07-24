import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ImportOutcomeError,
  runPhaseAwareImport,
  type PhaseAwareImportDependencies,
} from '../lib/db/import-runner';
import type { BackupData, IntegrityResult } from '../lib/db/integrity';

type TestFn = () => Promise<void> | void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const importSource = readFileSync(join(projectRoot, 'lib/db/index.ts'), 'utf8');
const runnerSource = readFileSync(join(projectRoot, 'lib/db/import-runner.ts'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

const okIntegrity: IntegrityResult = { ok: true, errors: [], warnings: [] };
const backup: BackupData = {
  version: 1,
  exportedAt: 1_700_000_000_000,
  events: [],
  markets: [],
  products: [],
  dailyStats: [],
  settings: [],
};

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function dependencies(overrides: Partial<PhaseAwareImportDependencies> = {}): PhaseAwareImportDependencies {
  return {
    parseBackupData: () => backup,
    runPreImportIntegrityCheck: () => okIntegrity,
    runReplayReadinessCheck: () => okIntegrity,
    createEmergencyBackupBeforeImport: async () => {},
    replaceImportedData: async () => {},
    readPostImportData: async () => backup,
    runPostImportIntegrityCheck: () => okIntegrity,
    ...overrides,
  };
}

async function expectPhaseFailure(
  phase: ImportOutcomeError['phase'],
  overrides: Partial<PhaseAwareImportDependencies>,
  expectedState: ImportOutcomeError['classification']['state'],
): Promise<void> {
  await assert.rejects(
    () => runPhaseAwareImport('{}', dependencies(overrides)),
    (error) => {
      assert.ok(error instanceof ImportOutcomeError);
      assert.equal(error.phase, phase);
      assert.equal(error.classification.state, expectedState);
      assert.equal(error.originalError instanceof Error ? error.originalError.message : String(error.originalError), `${phase} failed`);
      return true;
    },
  );
}

console.log('\n=== Phase-aware import runner ===');

runTest('classifies parse integrity and replay failures as precheck_failed', async () => {
  await expectPhaseFailure('parse', {
    parseBackupData: () => {
      throw new Error('parse failed');
    },
  }, 'precheck_failed');

  await expectPhaseFailure('integrity_precheck', {
    runPreImportIntegrityCheck: () => {
      throw new Error('integrity_precheck failed');
    },
  }, 'precheck_failed');

  await expectPhaseFailure('replay_readiness', {
    runReplayReadinessCheck: () => {
      throw new Error('replay_readiness failed');
    },
  }, 'precheck_failed');
});

runTest('classifies backup transaction and post-validation failures by phase', async () => {
  await expectPhaseFailure('emergency_backup', {
    createEmergencyBackupBeforeImport: async () => {
      throw new Error('emergency_backup failed');
    },
  }, 'backup_failed');

  await expectPhaseFailure('replacement_transaction', {
    replaceImportedData: async () => {
      throw new Error('replacement_transaction failed');
    },
  }, 'transaction_failed');

  await expectPhaseFailure('post_import_validation', {
    runPostImportIntegrityCheck: () => {
      throw new Error('post_import_validation failed');
    },
  }, 'post_import_validation_failed');
});

runTest('returns success_with_warnings and forwards aggregated warnings', async () => {
  const seenWarnings: string[][] = [];
  const result = await runPhaseAwareImport('{}', dependencies({
    runPreImportIntegrityCheck: () => ({ ok: true, errors: [], warnings: ['pre warning'] }),
    runReplayReadinessCheck: () => ({ ok: true, errors: [], warnings: ['replay warning'] }),
    runPostImportIntegrityCheck: () => ({ ok: true, errors: [], warnings: ['post warning'] }),
    onWarnings: (warnings) => {
      seenWarnings.push(warnings);
    },
  }));

  assert.equal(result.classification.state, 'success_with_warnings');
  assert.deepEqual(result.warnings, ['pre warning', 'replay warning', 'post warning']);
  assert.deepEqual(seenWarnings, [['pre warning', 'replay warning', 'post warning']]);
});

runTest('returns success without warning callback when no warnings exist', async () => {
  let warningCalls = 0;
  const result = await runPhaseAwareImport('{}', dependencies({
    onWarnings: () => {
      warningCalls++;
    },
  }));

  assert.equal(result.classification.state, 'success');
  assert.deepEqual(result.warnings, []);
  assert.equal(warningCalls, 0);
});

runTest('importData preserves public signature and unwraps runner errors for callers', () => {
  assert.match(importSource, /export async function importData\(jsonData: string\): Promise<void>/);
  assert.match(importSource, /await runPhaseAwareImport\(jsonData/);
  assert.match(importSource, /error instanceof ImportOutcomeError/);
  assert.match(importSource, /throw originalError/);
});

runTest('runner remains DB-layer only and does not mount UI or write cloud data', () => {
  for (const blocked of [
    /from ['"]react['"]/,
    /from ['"]@\/components/,
    /supabase/i,
    /localStorage/,
    /indexedDB/i,
    /\bdb\./,
  ]) {
    assert.doesNotMatch(runnerSource, blocked);
  }
});

runTest('full test suite includes phase-aware import runner guardrail', () => {
  assert.match(testManifestSource, /tsx tests\/import-runner\.test\.ts/);
});

async function main(): Promise<void> {
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} phase-aware import runner tests failed`);
  }
}

main();
