import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const strategyPath =
  'docs/security/SUPABASE_SRA_A1_REMOTE_MIGRATION_HISTORY_STRATEGY_2026_08_26.md';
const strategy = readFileSync(join(root, strategyPath), 'utf8');
const taskMatrix = JSON.parse(
  readFileSync(join(root, 'docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json'), 'utf8'),
) as { tasks: Array<{ id: string; status: string; evidence: string[] }> };

assert.ok(existsSync(join(root, strategyPath)), 'SRA-A1 migration-history strategy must exist');

for (const marker of [
  'remote-history-first, forward-only, disposable release workspace',
  'neither `072` nor any other version is approved',
  '`migration repair` is not part of the normal SRA-A1 route',
  'Automatic rollback is prohibited',
  'security-owner approved Docker rehearsal plus exact Production metadata-only reads',
  'all remote writes and deployment prohibited',
  'Migration SHA-256',
  '`SEC-REMEDIATION` remains `pending_approval`',
]) {
  assert.ok(strategy.includes(marker), `missing migration strategy marker: ${marker}`);
}

assert.match(strategy, /dry run proposes more than one migration/u);
assert.match(strategy, /filename or\s+SHA-256 differs/u);
assert.match(strategy, /Production mutation or an uncertain\s+environment identity/u);
assert.match(strategy, /schema_migrations` is absent/u);
assert.match(strategy, /Do not create the ledger/u);
assert.match(strategy, /separate cloud non-Production project is not required/u);
assert.match(strategy, /Do not use\s+`--include-all`/u);

const remediationTask = taskMatrix.tasks.find(task => task.id === 'SEC-REMEDIATION');
assert.equal(remediationTask?.status, 'pending_approval');
assert.ok(remediationTask?.evidence.includes(strategyPath));

const migrations = readdirSync(join(root, 'supabase', 'migrations'));
assert.equal(
  migrations.some(name => /sra[_-]?a1/i.test(name)),
  false,
  'strategy preparation must not create a numbered SRA-A1 migration',
);

console.log('PASS SRA-A1 strategy permits only matched-target metadata reads and new Docker rehearsal');
