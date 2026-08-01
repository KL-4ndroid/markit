import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { SUBSCRIPTION_PRICE_CATALOG } from '../lib/subscription/subscription-pricing';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const migrationPath = 'supabase/migrations/066_add_subscription_price_catalog_foundation.sql';
const verificationPath =
  'supabase/verification/066_subscription_price_foundation_read_only.sql';
const runbookPath = 'docs/subscription/F3A_PRICE_CATALOG_MIGRATION_RUNBOOK.md';

for (const path of [migrationPath, verificationPath, runbookPath]) {
  assert.ok(existsSync(join(root, path)), `${path} must exist for F3A`);
}

const migration = read(migrationPath);
const migrationSql = migration.replace(/^\s*--.*$/gm, '');
const verification = read(verificationPath);
const runbook = read(runbookPath);
const implementationPlan = read('docs/SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md');
const testManifest = read('scripts/test-files.txt');

assert.ok(migration.includes('BEGIN;'));
assert.ok(migration.includes('COMMIT;'));

const createdTables = [...migration.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)/g)].map(
  (match) => match[1],
);
assert.deepEqual(createdTables, [
  'subscription_price_versions',
  'billing_storefront_price_mappings',
  'subscription_price_assignments',
]);

assert.doesNotMatch(migration, /ALTER TABLE public\.subscription_accounts/i);
assert.doesNotMatch(migration, /ON DELETE CASCADE/i);
assert.doesNotMatch(migrationSql, /CREATE POLICY|SECURITY DEFINER|\bGRANT\b/i);
assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE TABLE/i);
assert.doesNotMatch(
  migrationSql,
  /checkout|callback route|provider SDK|billing writer/i,
  'runtime terms may appear only in scoped comments, not SQL objects',
);

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
  assert.ok(migration.includes(role), `${role} must be denied direct F3A access`);
}

for (const triggerFunction of [
  'enforce_subscription_price_version_update',
  'enforce_billing_storefront_mapping_update',
  'enforce_subscription_price_assignment_write',
]) {
  assert.ok(migration.includes(`FUNCTION public.${triggerFunction}()`));
  assert.ok(migration.includes(`REVOKE ALL ON FUNCTION public.${triggerFunction}()`));
}

for (const requiredConstraint of [
  'subscription_price_versions_offer_shape_check',
  'subscription_price_versions_status_shape_check',
  'billing_storefront_mappings_mode_shape_check',
  'billing_storefront_mappings_status_shape_check',
  'subscription_price_assignments_policy_shape_check',
  'subscription_price_assignments_time_order_check',
  'subscription_price_assignment_price_not_active',
  'subscription_price_assignment_mapping_not_active',
  'subscription_price_assignment_catalog_mismatch',
  'subscription_price_assignment_invalid_lock_transition',
  'subscription_price_assignment_invalid_initial_founder_state',
  'subscription_price_assignment_dormant_timestamp_required',
  'subscription_price_assignment_dormant_history_immutable',
  'subscription_price_assignment_dormant_transition_required',
  'subscription_price_assignment_transition_evidence_required',
]) {
  assert.ok(migration.includes(requiredConstraint), `missing F3A guard: ${requiredConstraint}`);
}

assert.ok(migration.includes("mapping_mode IN ('server_amount', 'provider_price_object')"));
assert.ok(migration.includes("'newebpay_web'"));
assert.ok(migration.includes("'ecpay_web'"));
assert.ok(migration.includes("'apple_app_store'"));
assert.ok(migration.includes("'google_play'"));
assert.doesNotMatch(migration, /'revenuecat_aggregate'/);

assert.ok(migration.includes('idx_subscription_price_assignments_founder_once'));
assert.ok(migration.includes("WHERE price_policy = 'founder_locked'"));
assert.ok(migration.includes('idx_subscription_price_assignments_current'));
assert.ok(migration.includes("founder_lock_status IN ('active', 'grace')"));
assert.ok(migration.includes('ON DELETE RESTRICT'));

const seedMatch = migration.match(
  /INSERT INTO public\.subscription_price_versions[\s\S]+?ON CONFLICT \(id\) DO NOTHING;/,
);
assert.ok(seedMatch, 'F3A must contain one bounded catalog seed');
const seed = seedMatch[0];
assert.equal((seed.match(/'candidate'/g) ?? []).length, 5);
assert.doesNotMatch(seed, /'active'|'retired'/);

for (const price of Object.values(SUBSCRIPTION_PRICE_CATALOG)) {
  assert.ok(seed.includes(`'${price.id}'`), `${price.id} must be seeded`);
  assert.ok(seed.includes(`'${price.planCode}'`));
  assert.ok(seed.includes(`'${price.cadence}'`));
  assert.ok(seed.includes(`${price.amountMinor}`));
}

assert.ok(migration.includes('subscription_price_catalog_seed_mismatch'));
assert.ok(migration.includes('No mapping is seeded or activated by migration 066'));
assert.ok(migration.includes('No writer or assignment is created by migration 066'));

assert.ok(
  verification.includes('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;'),
);
assert.ok(verification.includes('ROLLBACK;'));
assert.doesNotMatch(
  verification,
  /^\s*(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|GRANT|REVOKE|TRUNCATE|CALL)\b/im,
  '066 verification must remain read-only',
);
for (const checkName of [
  'tables_exist',
  'candidate_catalog_exact',
  'no_active_catalog',
  'no_storefront_mapping',
  'no_price_assignment',
  'rls_enabled',
  'no_direct_table_privileges',
  'no_rls_policies',
  'trigger_functions_private',
  'required_triggers_exist',
  'required_partial_uniqueness_exists',
  'subscription_projection_unchanged',
]) {
  assert.ok(verification.includes(`'${checkName}'`), `missing read-only check: ${checkName}`);
}

assert.ok(runbook.includes('使用者已確認 migration 066 套用'));
assert.ok(runbook.includes('F3A 尚未結案'));
assert.ok(runbook.includes('read-only SQL verifier'));
assert.ok(runbook.includes('authenticated denial'));
assert.ok(runbook.includes('Security Advisor'));
assert.ok(runbook.includes('5 candidate, 0 active'));
assert.ok(runbook.includes('billing_storefront_price_mappings: 0'));
assert.ok(runbook.includes('subscription_price_assignments: 0'));
assert.ok(runbook.includes('不得在 SQL Editor 臨時 drop'));
assert.ok(runbook.includes('F3B event/transaction ledger'));

assert.ok(
  implementationPlan.includes(
    'F3A migration `066_add_subscription_price_catalog_foundation.sql` is user-confirmed applied',
  ),
  'implementation plan must track the user-confirmed F3A apply separately',
);
assert.ok(implementationPlan.includes('F3A remains private and non-billable'));
assert.ok(implementationPlan.includes('all-true read-only SQL verifier'));
assert.match(
  implementationPlan,
  /F3B-F3E,[\s\S]*runtime mutation remain not approved/,
);
assert.ok(
  testManifest.includes('tsx tests/subscription-price-catalog-foundation.test.ts'),
  'F3A guardrail must be part of the complete test manifest',
);

const physicalBillingMigrations = readdirSync(join(root, 'supabase', 'migrations')).filter(
  (name) => /billing|subscription_price|checkout|payment_provider|price_assignment/i.test(name),
);
assert.deepEqual(physicalBillingMigrations, [
  '066_add_subscription_price_catalog_foundation.sql',
]);

console.log('PASS F3A private candidate price catalog and assignment foundation');
