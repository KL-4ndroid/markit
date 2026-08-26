import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const proposalPath = 'docs/security/SUPABASE_SECURITY_ADVISOR_SRA_A_MINIMAL_REMEDIATION_PROPOSAL_2026_08_24.md';
const read = (path: string): string => readFileSync(join(root, path), 'utf8');

assert.ok(existsSync(join(root, proposalPath)), 'SRA-A minimal proposal must exist');

const proposal = read(proposalPath);
const taskMatrix = JSON.parse(read('docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json')) as {
  tasks: Array<{ id: string; status: string; evidence: string[] }>;
};

for (const marker of [
  'proposal accepted; review/local implementation and disposable evidence complete;',
  '`public.update_market_read_model()`',
  '`public.update_product_read_model()`',
  '`public.handle_new_user()`',
  '`public.auto_add_staff_to_new_market()`',
  '`pg_catalog, public`',
  '`PUBLIC`, `anon`, and `authenticated`',
  'ALTER FUNCTION',
  'corrective-forward',
  'remote migration-history strategy',
  '`SEC-REMEDIATION` remains `pending_approval`',
]) {
  assert.ok(proposal.includes(marker), `missing SRA-A proposal marker: ${marker}`);
}

for (const excluded of [
  'staff_accessible_markets',
  'staff_accessible_products',
  'staff_accessible_events',
  'verify_invitation_token(text)',
  'leaked-password protection',
]) {
  assert.ok(proposal.includes(excluded), `proposal must explicitly exclude ${excluded}`);
}

assert.doesNotMatch(proposal, /GRANT EXECUTE ON FUNCTION/u);
assert.match(proposal, /does not assume that `072` is available remotely/u);

const remediationTask = taskMatrix.tasks.find(task => task.id === 'SEC-REMEDIATION');
assert.equal(remediationTask?.status, 'pending_approval');
assert.ok(remediationTask?.evidence.includes(proposalPath));
assert.ok(
  remediationTask?.evidence.includes(
    'docs/security/SUPABASE_SRA_A1_PRODUCTION_READ_ONLY_DOCKER_EVIDENCE_2026_08_26.md',
  ),
);

const migrations = readdirSync(join(root, 'supabase', 'migrations'));
assert.equal(
  migrations.some(name => /sra[_-]?a|minimal[_-]?remediation/i.test(name)),
  false,
  'proposal slice must not create an SRA-A migration',
);

console.log('PASS SRA-A minimal remediation proposal stays bounded and remote-unapproved');
