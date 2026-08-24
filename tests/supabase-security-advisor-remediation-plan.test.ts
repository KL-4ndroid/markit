import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const planPath = 'docs/security/SUPABASE_SECURITY_ADVISOR_REMEDIATION_PLAN_2026_08_05.md';

assert.ok(existsSync(join(root, planPath)), 'security remediation plan must exist');

const plan = read(planPath);
const permissionDistribution = read('docs/role-permission-distribution.md');
const manifest = read('scripts/test-files.txt');

for (const marker of [
  'Status: SRA-000 live inventory captured; SRA-A minimal proposal complete; no remediation migration is approved or applied',
  'SRA-000',
  'SRA-001',
  'SRA-010',
  'staff_accessible_markets',
  'staff_accessible_products',
  'staff_accessible_events',
  'update_market_read_model()',
  'update_product_read_model()',
  'handle_new_user()',
  'auto_add_staff_to_new_market()',
  '允許 authenticated 插入市集',
  '允許 authenticated 插入商品',
  'verify_invitation_token(text)',
  'leaked-password protection',
  'anonymous denial',
  'authenticated denial',
  'cross-owner denial',
  '`viewer`',
  '`operator`',
  '`manager`',
  '`owner`',
  'PermissionGate',
  'useUserRole',
  'Dexie',
  'corrective-forward',
]) {
  assert.ok(plan.includes(marker), `missing remediation marker: ${marker}`);
}

assert.ok(
  plan.includes('Do not apply `security_invoker = true` directly'),
  'plan must preserve the current staff read boundary',
);
assert.ok(
  permissionDistribution.includes(planPath),
  'permission distribution must link the remediation plan',
);
assert.ok(
  permissionDistribution.includes('No migration, RLS policy, RPC grant, provider setting'),
  'permission distribution must state that this batch changes no runtime permission',
);
assert.ok(
  manifest.includes('tsx tests/supabase-security-advisor-remediation-plan.test.ts'),
  'complete test manifest must include the remediation guardrail',
);
assert.ok(
  manifest.includes('tsx tests/supabase-security-advisor-sra-a-proposal.test.ts'),
  'complete test manifest must include the SRA-A proposal guardrail',
);

const migrationNames = readdirSync(join(root, 'supabase', 'migrations'));
assert.equal(
  migrationNames.some((name) => /^068_.*(?:security|advisor|remediation)/i.test(name)),
  false,
  'planning batch must not add a remediation migration',
);

console.log('Supabase Security Advisor remediation plan guardrails passed.');
