// Explicit operator entry point. No dotenv or credential downloads. No default action.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { runManagedMigration } from './lib/account-deletion-managed-target';

async function main() {
  const args = process.argv.slice(2);
  const verify = args.length === 1 && args[0] === '--verify-target';
  const install = args.length === 2 && args[0] === '--install-disabled' && /^[0-9a-f]{64}$/.test(args[1]);
  assert.ok(verify || install, 'Use --verify-target OR --install-disabled <reviewed sqlSha>; cloud execution requires separate release authorization');
  // Reject stale generated SQL/manifest before ANY network call.
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/prepare-account-deletion-migration.ts', '--check'], { stdio: 'pipe' });
  const result = await runManagedMigration({ token: process.env.SUPABASE_ACCESS_TOKEN ?? '',
    mode: verify ? 'verify-target' : 'install-disabled', reviewedSqlSha: install ? args[1] : undefined });
  console.log(JSON.stringify(result));
}
void main().catch(error => {
  // Never print arbitrary dependency/provider errors (they may include credentials).
  const message = error instanceof Error && /^managed_[a-z0-9_]+$/.test(error.message) ? error.message : 'managed_command_rejected';
  console.error(message); process.exitCode = 1;
});
