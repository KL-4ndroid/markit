import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  classifyImportOutcome,
  type ImportOutcomePhase,
} from '../lib/db/import-recovery-classifier';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const classifierSource = readFileSync(join(projectRoot, 'lib/db/import-recovery-classifier.ts'), 'utf8');
const highRiskPlanSource = readFileSync(join(projectRoot, 'docs/HIGH_RISK_SYNC_AND_DATA_EXECUTION_PLAN.md'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const testManifestSource = readFileSync(join(projectRoot, 'scripts/test-files.txt'), 'utf8');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Import recovery classifier ===');

runTest('maps parse integrity and replay failures to precheck_failed', () => {
  for (const phase of ['parse', 'integrity_precheck', 'replay_readiness'] satisfies ImportOutcomePhase[]) {
    const result = classifyImportOutcome({ phase, ok: false });

    assert.equal(result.state, 'precheck_failed');
    assert.equal(result.severity, 'error');
    assert.equal(result.indexedDbExpectation, 'unchanged');
    assert.equal(result.shouldSuggestAutomaticRestore, false);
    assert.equal(result.requiresManualReview, false);
  }
});

runTest('maps backup transaction and post validation failures to documented risk states', () => {
  assert.deepEqual(classifyImportOutcome({ phase: 'emergency_backup', ok: false }), {
    state: 'backup_failed',
    severity: 'error',
    indexedDbExpectation: 'unchanged',
    shouldSuggestAutomaticRestore: false,
    requiresManualReview: false,
  });

  assert.deepEqual(classifyImportOutcome({ phase: 'replacement_transaction', ok: false }), {
    state: 'transaction_failed',
    severity: 'error',
    indexedDbExpectation: 'rollback_expected',
    shouldSuggestAutomaticRestore: false,
    requiresManualReview: false,
  });

  assert.deepEqual(classifyImportOutcome({ phase: 'post_import_validation', ok: false }), {
    state: 'post_import_validation_failed',
    severity: 'critical',
    indexedDbExpectation: 'imported_data_present',
    shouldSuggestAutomaticRestore: false,
    requiresManualReview: true,
  });
});

runTest('maps completed imports to success states based on warnings', () => {
  assert.deepEqual(classifyImportOutcome({ phase: 'completed', ok: true }), {
    state: 'success',
    severity: 'info',
    indexedDbExpectation: 'imported_data_present',
    shouldSuggestAutomaticRestore: false,
    requiresManualReview: false,
  });

  assert.deepEqual(classifyImportOutcome({ phase: 'completed', ok: true, warningCount: 2 }), {
    state: 'success_with_warnings',
    severity: 'warning',
    indexedDbExpectation: 'imported_data_present',
    shouldSuggestAutomaticRestore: false,
    requiresManualReview: false,
  });
});

runTest('rejects ambiguous success or failure inputs', () => {
  assert.throws(
    () => classifyImportOutcome({ phase: 'replacement_transaction', ok: true }),
    /Successful import outcome can only be classified from the completed phase/,
  );

  assert.throws(
    () => classifyImportOutcome({ phase: 'completed', ok: false }),
    /Failed import outcome must identify the failed phase/,
  );
});

runTest('classifier remains pure and isolated from runtime mutation surfaces', () => {
  for (const blocked of [
    /from ['"]\.\/index['"]/,
    /from ['"]\.\.\/index['"]/,
    /importData/,
    /\bdb\./,
    /\bindexedDB[\s.(]/i,
    /localStorage/,
    /sessionStorage/,
    /supabase/i,
    /react/i,
  ]) {
    assert.doesNotMatch(classifierSource, blocked);
  }
});

runTest('high-risk plan records classifier as the only approved continuation slice', () => {
  assert.match(highRiskPlanSource, /pure import-outcome classifier design and tests only/);
  assert.match(highRiskPlanSource, /The classifier does not call `importData\(\)`/);
  assert.match(highRiskPlanSource, /The classifier does not read or write IndexedDB/);
  assert.match(highRiskPlanSource, /The classifier does not mount in UI/);
});

runTest('full test suite includes import recovery classifier guardrail', () => {
  assert.match(testManifestSource, /tsx tests\/import-recovery-classifier\.test\.ts/);
});

function main(): void {
  let failed = 0;

  for (const test of tests) {
    try {
      test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} import recovery classifier tests failed`);
  }
}

main();
