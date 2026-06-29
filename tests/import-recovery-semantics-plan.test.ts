import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type TestFn = () => void;

const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');
const planPath = join(projectRoot, 'docs/IMPORT_RECOVERY_SEMANTICS_PLAN_2026_06_29.md');
const highRiskPlanPath = join(projectRoot, 'docs/HIGH_RISK_SYNC_AND_DATA_EXECUTION_PLAN.md');
const importSource = readFileSync(join(projectRoot, 'lib/db/index.ts'), 'utf8');
const recoveryPageSource = readFileSync(join(projectRoot, 'app/recovery/page.tsx'), 'utf8');
const recoveryPanelSource = readFileSync(join(projectRoot, 'components/common/DatabaseRecoveryPanel.tsx'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const planSource = existsSync(planPath) ? readFileSync(planPath, 'utf8') : '';
const highRiskPlanSource = readFileSync(highRiskPlanPath, 'utf8');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

console.log('\n=== Import recovery semantics plan ===');

runTest('plan exists and builds on existing recovery/import surfaces', () => {
  assert.ok(existsSync(planPath));

  for (const expected of [
    /`importData\(\)` parses backup JSON/,
    /checkBackupIntegrity\(\)/,
    /validateBackupReplayReadiness\(\)/,
    /emergency local backup/,
    /one Dexie transaction/,
    /post-import integrity validation/,
    /`\/recovery` is already owner-only/,
    /`DatabaseRecoveryPanel` already supports local backup/,
    /must not create a second recovery system/,
  ]) {
    assert.match(planSource, expected);
  }
});

runTest('plan defines explicit import outcome states', () => {
  for (const state of [
    'precheck_failed',
    'backup_failed',
    'transaction_failed',
    'post_import_validation_failed',
    'success_with_warnings',
    'success',
  ]) {
    assert.match(planSource, new RegExp(`\\\`${state}\\\``));
  }

  assert.match(planSource, /post_import_validation_failed[\s\S]*highest-risk import failure state/);
});

runTest('plan keeps UI automation browser profile and production recovery out of phase 1', () => {
  for (const blocked of [
    /Not included:[\s\S]*New UI/,
    /Not included:[\s\S]*New runtime services/,
    /Not included:[\s\S]*New automatic restore behavior/,
    /Not included:[\s\S]*Browser\/profile IndexedDB tests/,
    /Do not add automatic restore/,
    /Do not mutate IndexedDB from the status panel/,
    /Do not write Supabase/,
    /Status: high-risk candidate only; not approved by this document/,
    /never use the user's daily Chrome profile/,
  ]) {
    assert.match(planSource, blocked);
  }
});

runTest('importData source order matches documented safety semantics', () => {
  const parseIndex = importSource.indexOf('const data: BackupData = parseBackupData(jsonData);');
  const precheckIndex = importSource.indexOf('const preImportCheck = checkBackupIntegrity(data);');
  const replayIndex = importSource.indexOf('const replayReadiness = validateBackupReplayReadiness(data);');
  const backupIndex = importSource.indexOf('await createEmergencyBackupBeforeImport();');
  const transactionIndex = importSource.indexOf("await db.transaction('rw', [db.events, db.markets, db.products, db.dailyStats, db.settings], async () => {");
  const postImportIndex = importSource.indexOf('const postImportData: BackupData');

  assert.ok(parseIndex > -1, 'parseBackupData call must exist');
  assert.ok(precheckIndex > parseIndex, 'integrity precheck must run after parse');
  assert.ok(replayIndex > precheckIndex, 'replay readiness must run after integrity precheck');
  assert.ok(backupIndex > replayIndex, 'emergency backup must run after prechecks');
  assert.ok(transactionIndex > backupIndex, 'replacement transaction must run after emergency backup');
  assert.ok(postImportIndex > transactionIndex, 'post-import validation must run after replacement transaction');
});

runTest('existing recovery page remains the owner-gated recovery surface', () => {
  assert.match(recoveryPageSource, /hasCapability\(roleCapabilities, 'canUseRepairTools'\)/);
  assert.match(recoveryPageSource, /<DatabaseRecoveryPanel \/>/);
  assert.match(recoveryPanelSource, /createRecoveryBackup/);
  assert.match(recoveryPanelSource, /repairInvalidDailyStats/);
  assert.match(recoveryPanelSource, /repairProductReferenceErrors/);
});

runTest('high-risk plan records semantics slice without approving runtime behavior', () => {
  assert.match(highRiskPlanSource, /Add import recovery semantics design and static guardrails without changing runtime behavior/);
  assert.match(highRiskPlanSource, /Import Recovery Semantics Design Slice/);
  assert.match(highRiskPlanSource, /Still not approved:[\s\S]*Import rollback UI/);
  assert.match(highRiskPlanSource, /Still not approved:[\s\S]*Browser\/profile IndexedDB mutation tests/);
  assert.match(highRiskPlanSource, /Still not approved:[\s\S]*Automatic restore or repair/);
});

runTest('full test suite includes import recovery semantics guardrail', () => {
  assert.match(packageJson.scripts.test, /tsx tests\/import-recovery-semantics-plan\.test\.ts/);
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
    throw new Error(`${failed} import recovery semantics plan tests failed`);
  }
}

main();
