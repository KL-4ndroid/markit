import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const draftPath = 'docs/security/drafts/SRA_A1_LOCAL_REVIEW_MIGRATION.sql';
const localTestPath = 'supabase/tests/sra_a1_local.sql';
const evidencePath = 'docs/security/SUPABASE_SECURITY_ADVISOR_SRA_A1_LOCAL_EVIDENCE_2026_08_24.md';
const read = (path: string): string => readFileSync(join(root, path), 'utf8');

assert.ok(existsSync(join(root, draftPath)), 'SRA-A1 local review migration draft must exist');
assert.ok(existsSync(join(root, localTestPath)), 'SRA-A1 local database evidence test must exist');
assert.ok(existsSync(join(root, evidencePath)), 'SRA-A1 local evidence document must exist');

const draft = read(draftPath);
const localTest = read(localTestPath);
const evidence = read(evidencePath);
const manifest = read('scripts/test-files.txt');

const targets = [
  'public.update_market_read_model()',
  'public.update_product_read_model()',
  'public.handle_new_user()',
  'public.auto_add_staff_to_new_market()',
] as const;

for (const target of targets) {
  assert.ok(draft.includes(`ALTER FUNCTION ${target}`), `missing bounded ALTER for ${target}`);
  assert.ok(
    draft.includes(`REVOKE EXECUTE ON FUNCTION ${target} FROM PUBLIC, anon, authenticated;`),
    `missing exact client revoke for ${target}`,
  );
}

for (const marker of [
  'SRA-A1 LOCAL REVIEW MIGRATION DRAFT',
  'Prohibited: remote/Production execution',
  "SET LOCAL lock_timeout = '5s'",
  "SET LOCAL statement_timeout = '30s'",
  'sra_a1_preflight_function_drift',
  'sra_a1_preflight_trigger_drift',
  'search_path TO pg_catalog, public',
  'sra_a1_postcheck_client_execute_retained',
  'sra_a1_postcheck_public_execute_retained',
]) {
  assert.ok(draft.includes(marker), `missing SRA-A1 implementation marker: ${marker}`);
}

assert.doesNotMatch(draft, /CREATE OR REPLACE FUNCTION/iu);
assert.doesNotMatch(draft, /GRANT\s+EXECUTE/iu);
assert.doesNotMatch(draft, /\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO|FROM)?\s*public\./iu);
assert.doesNotMatch(draft, /\b(?:CREATE|ALTER|DROP)\s+(?:TABLE|VIEW|POLICY|TRIGGER)\b/iu);
assert.doesNotMatch(draft, /\bCASCADE\b/iu);

for (const marker of [
  '\\set ON_ERROR_STOP on',
  'BEGIN;',
  'sra_a1_catalog_assertions',
  'sra_a1_profile_trigger_failed',
  'sra_a1_market_projection_failed',
  'sra_a1_market_membership_trigger_failed',
  'sra_a1_product_projection_failed',
  "'transactionOutcome', 'rolled_back'",
  'ROLLBACK;',
]) {
  assert.ok(localTest.includes(marker), `missing disposable local evidence marker: ${marker}`);
}

const migrationNames = readdirSync(join(root, 'supabase', 'migrations'));
assert.equal(
  migrationNames.some(name => /sra[_-]?a1/i.test(name)),
  false,
  'SRA-A1 must stay outside the remote migration chain until migration-history approval',
);
assert.ok(
  manifest.includes('tsx tests/supabase-security-advisor-sra-a1-implementation.test.ts'),
  'complete test manifest must include the SRA-A1 implementation guardrail',
);

for (const marker of [
  'review/local implementation and disposable localhost evidence complete',
  'linked_project` was null',
  'targetFunctionCount',
  'transactionOutcome',
  'rolled_back',
  'second application was rejected',
  'zero synthetic Auth users, markets, and products',
  'non-Production, remote migration, and Production execution not approved',
]) {
  assert.ok(evidence.includes(marker), `missing SRA-A1 evidence marker: ${marker}`);
}

console.log('PASS SRA-A1 implementation stays local-only, exact-scope, and fail closed');
