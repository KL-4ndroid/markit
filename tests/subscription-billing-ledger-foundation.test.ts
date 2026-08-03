import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const migrationPath = 'supabase/migrations/067_add_billing_event_transaction_ledger.sql';
const verificationPath =
  'supabase/verification/067_billing_event_transaction_ledger_read_only.sql';
const smokePath = 'scripts/smoke-subscription-billing-ledger-foundation.mjs';
const runbookPath = 'docs/subscription/F3B_BILLING_LEDGER_MIGRATION_RUNBOOK.md';

for (const path of [migrationPath, verificationPath, smokePath, runbookPath]) {
  assert.ok(existsSync(join(root, path)), `${path} must exist for F3B`);
}

const migration = read(migrationPath);
const migrationSql = migration.replace(/^\s*--.*$/gm, '');
const verification = read(verificationPath);
const smoke = read(smokePath);
const runbook = read(runbookPath);
const implementationPlan = read('docs/SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md');
const dataDesign = read('docs/subscription/BILLING_DATA_SECURITY_DESIGN.md');
const packageJson = read('package.json');
const testManifest = read('scripts/test-files.txt');

assert.ok(migration.includes('BEGIN;'));
assert.ok(migration.includes('COMMIT;'));

const createdTables = [...migration.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)/g)].map(
  match => match[1],
);
assert.deepEqual(createdTables, [
  'billing_customer_links',
  'billing_subscriptions',
  'billing_transactions',
  'billing_event_inbox',
  'billing_reconciliation_runs',
]);

assert.doesNotMatch(migrationSql, /ALTER TABLE public\.subscription_accounts/i);
assert.doesNotMatch(migrationSql, /CREATE POLICY|SECURITY DEFINER|\bGRANT\b/i);
assert.doesNotMatch(migrationSql, /DROP TABLE|TRUNCATE TABLE|DELETE FROM|INSERT INTO/i);
assert.doesNotMatch(migrationSql, /\braw_payload\s+(?:text|json|jsonb|bytea)\b/i);
assert.doesNotMatch(migrationSql, /CREATE (?:OR REPLACE )?FUNCTION[^;]+checkout/i);
assert.doesNotMatch(migration, /ON DELETE CASCADE/i);

for (const table of createdTables) {
  assert.ok(
    migration.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
    `${table} must enable RLS`,
  );
  assert.ok(
    migration.includes(`REVOKE ALL ON TABLE public.${table}`),
    `${table} must revoke direct access`,
  );
}

for (const role of ['PUBLIC', 'anon', 'authenticated', 'service_role']) {
  assert.ok(migration.includes(role), `${role} must be denied direct F3B access`);
}

const guardFunctions = [
  'reject_billing_customer_link_mutation',
  'enforce_billing_subscription_snapshot_write',
  'prevent_f3b_billing_ledger_delete',
  'enforce_billing_transaction_write',
  'enforce_billing_event_inbox_write',
  'enforce_billing_reconciliation_run_write',
];
for (const functionName of guardFunctions) {
  assert.ok(migration.includes(`FUNCTION public.${functionName}()`));
  assert.ok(migration.includes(`REVOKE ALL ON FUNCTION public.${functionName}()`));
}

for (const triggerName of [
  'reject_billing_customer_link_mutation',
  'enforce_billing_subscription_snapshot_write',
  'prevent_billing_subscription_delete',
  'enforce_billing_transaction_write',
  'enforce_billing_event_inbox_write',
  'prevent_billing_event_inbox_delete',
  'enforce_billing_reconciliation_run_write',
  'prevent_billing_reconciliation_run_delete',
]) {
  assert.ok(migration.includes(`CREATE TRIGGER ${triggerName}`));
}

for (const guard of [
  'billing_customer_link_immutable',
  'billing_subscription_customer_identity_mismatch',
  'billing_subscription_identity_immutable',
  'billing_subscription_stale_snapshot',
  'billing_subscription_sequence_cleared',
  'f3b_billing_ledger_delete_forbidden',
  'billing_transaction_append_only',
  'billing_transaction_subscription_identity_mismatch',
  'billing_event_invalid_initial_state',
  'billing_event_identity_immutable',
  'billing_event_invalid_verification_transition',
  'billing_event_invalid_processing_transition',
  'billing_event_attempt_increment_required',
  'billing_reconciliation_event_identity_mismatch',
  'billing_reconciliation_invalid_initial_state',
  'billing_reconciliation_identity_immutable',
  'billing_reconciliation_invalid_transition',
]) {
  assert.ok(migration.includes(guard), `missing F3B guard: ${guard}`);
}

for (const constraint of [
  'billing_customer_links_owner_origin_environment_key',
  'billing_customer_links_provider_identity_key',
  'billing_subscriptions_provider_identity_key',
  'billing_transactions_provider_kind_key',
  'billing_event_inbox_provider_event_key',
  'billing_event_inbox_verification_shape_check',
  'billing_event_inbox_processing_shape_check',
  'billing_reconciliation_runs_status_shape_check',
]) {
  assert.ok(migration.includes(constraint), `missing F3B constraint: ${constraint}`);
}

assert.ok(migration.includes('raw_payload_ciphertext_ref'));
assert.match(migrationSql, /provider_sequence\s+TEXT/i);
assert.match(
  migrationSql,
  /provider_sequence\s*=\s*pg_catalog\.btrim\(provider_sequence\)[\s\S]*pg_catalog\.length\(provider_sequence\)\s+BETWEEN\s+1\s+AND\s+256/i,
);
assert.doesNotMatch(migrationSql, /provider_sequence\s+(?:BIGINT|INTEGER|NUMERIC)/i);
assert.ok(migration.includes("snapshot_hash ~ '^[0-9a-f]{64}$'"));
assert.ok(migration.includes('amount_minor >= 0'));
assert.ok(migration.includes("provider_environment IN ('sandbox', 'production')"));
assert.ok(migration.includes('A transaction row never grants capability by itself'));
assert.ok(migration.includes('creates no writer and cannot mutate subscription_accounts'));

assert.ok(
  verification.includes('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;'),
);
assert.ok(verification.includes('ROLLBACK;'));
assert.doesNotMatch(
  verification,
  /^\s*(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|GRANT|REVOKE|TRUNCATE|CALL)\b/im,
  '067 verification must remain read-only',
);
for (const checkName of [
  'tables_exist',
  'required_columns_exist',
  'ledger_starts_empty',
  'rls_enabled',
  'no_direct_table_privileges',
  'no_rls_policies',
  'guard_functions_private',
  'guard_functions_not_security_definer',
  'required_triggers_exist',
  'foreign_keys_restrict_delete',
  'provider_identity_uniqueness_exists',
  'subscription_projection_unchanged',
]) {
  assert.ok(verification.includes(`'${checkName}'`), `missing read-only check: ${checkName}`);
}

assert.match(smoke, /--execute=denial-only/);
assert.match(smoke, /--require-authenticated/);
assert.match(smoke, /errorCode === '42501'/);
assert.match(smoke, /payload_hash: 'invalid_by_design'/);
assert.doesNotMatch(smoke, /subscription_accounts|app\/api\/billing|checkout/);
assert.doesNotMatch(smoke, /console\.(?:log|table)\([^\n]*(?:password|token|email|userId)/);
for (const table of createdTables) assert.ok(smoke.includes(`table: '${table}'`));
for (const functionName of guardFunctions) assert.ok(smoke.includes(`'${functionName}'`));

for (const phrase of [
  'not applied',
  'five empty tables',
  'read-only verifier',
  '--execute=denial-only',
  'Security Advisor',
  'Stop and do not begin F3C',
  'Do not attempt an ad hoc destructive rollback',
]) {
  assert.ok(runbook.includes(phrase), `missing F3B runbook boundary: ${phrase}`);
}

assert.match(implementationPlan, /F3B[^\n]*implemented locally[^\n]*not applied/i);
assert.match(dataDesign, /067_add_billing_event_transaction_ledger\.sql/);
assert.match(packageJson, /"smoke:subscription:billing-ledger-foundation"/);
assert.ok(
  testManifest.includes('tsx tests/subscription-billing-ledger-foundation.test.ts'),
  'F3B guardrail must be part of the complete test manifest',
);

const physicalBillingMigrations = readdirSync(join(root, 'supabase', 'migrations')).filter(
  name => /billing|subscription_price|checkout|payment_provider|price_assignment/i.test(name),
);
assert.deepEqual(physicalBillingMigrations, [
  '066_add_subscription_price_catalog_foundation.sql',
  '067_add_billing_event_transaction_ledger.sql',
]);

for (const forbiddenRuntimePath of [
  'app/api/billing',
  'app/api/checkout',
  'app/api/webhooks/newebpay',
  'app/api/webhooks/ecpay',
  'lib/subscription/billing-reconciliation.server.ts',
  'lib/subscription/billing-writer.server.ts',
]) {
  assert.equal(
    existsSync(join(root, forbiddenRuntimePath)),
    false,
    `${forbiddenRuntimePath} remains outside F3B`,
  );
}

console.log('PASS F3B private billing event and transaction ledger foundation');
