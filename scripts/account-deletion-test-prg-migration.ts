// Dedicated operator entry point for the test_prg token and deployment target.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildAccountDeletionMigration } from './lib/account-deletion-migration';
import { runManagedMigration } from './lib/account-deletion-managed-target';
import { buildTestPrgUpgradeAndInstall } from './lib/account-deletion-test-prg-upgrade';

async function main() {
  const [command, reviewedSqlSha, ...extra] = process.argv.slice(2);
  const upgradesBaseline = command === '--prepare-upgrade-install' || command === '--upgrade-and-install-disabled';
  const prepare = (command === '--prepare' || command === '--prepare-upgrade-install') && reviewedSqlSha === undefined;
  const verify = command === '--verify-target' && reviewedSqlSha === undefined;
  const install = (command === '--install-disabled' || command === '--upgrade-and-install-disabled')
    && /^[0-9a-f]{64}$/.test(reviewedSqlSha ?? '');
  assert.ok(extra.length === 0 && (prepare || verify || install), 'Unsupported test_prg command');

  // Check the canonical release manifest before creating or sending a test variant.
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/prepare-account-deletion-migration.ts', '--check'], { stdio: 'pipe' });
  if (!verify) {
    const sqlPath = upgradesBaseline ? '.codex-artifacts/096_test_prg_upgrade_install_disabled.sql'
      : '.codex-artifacts/096_test_prg_disabled.sql';
    const candidate = upgradesBaseline ? buildTestPrgUpgradeAndInstall() : buildAccountDeletionMigration('test_prg');
    if (prepare) {
      mkdirSync('.codex-artifacts', { recursive: true });
      writeFileSync(sqlPath, candidate.sql);
      console.log(JSON.stringify({ sqlPath, projectRef: candidate.projectRef, sqlSha: candidate.sqlSha,
        payloadSha: candidate.payloadSha, installationAttempted: false }));
      return;
    }
    assert.equal(readFileSync(sqlPath, 'utf8').replaceAll('\r\n', '\n'), candidate.sql, 'Generated test_prg migration SQL drift');
  }
  const result = await runManagedMigration({ target: 'test_prg', token: process.env.SUPABASE_TEST_PRG_ACCESS_TOKEN ?? '',
    mode: verify ? 'verify-target' : upgradesBaseline ? 'upgrade-and-install-disabled' : 'install-disabled', reviewedSqlSha });
  console.log(JSON.stringify(result));
}

void main().catch(error => {
  const message = error instanceof Error && /^managed_[a-z0-9_]+$/.test(error.message) ? error.message : 'managed_test_prg_command_rejected';
  console.error(message);
  process.exitCode = 1;
});
