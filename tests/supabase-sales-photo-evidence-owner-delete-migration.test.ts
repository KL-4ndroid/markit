import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = join(__dirname, '..');
const migration = readFileSync(
  join(projectRoot, 'supabase/migrations/060_add_sales_photo_evidence_owner_delete_rpcs.sql'),
  'utf8'
);
const repository = readFileSync(
  join(projectRoot, 'lib/supabase/sales-photo-evidence-delete-repository.server.ts'),
  'utf8'
);

console.log('\n=== Sales photo evidence owner delete migration ===');

assert.match(migration, /CREATE OR REPLACE FUNCTION public\.bff_prepare_sale_photo_evidence_delete/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.bff_finalize_sale_photo_evidence_delete/);
assert.match(migration, /SECURITY DEFINER/g);
assert.match(migration, /v_evidence\.owner_id <> p_actor_id/);
assert.match(migration, /v_evidence\.status <> 'uploaded'/);
assert.match(migration, /r2_object_key IS DISTINCT FROM p_expected_image_object_key/);
assert.match(migration, /r2_thumbnail_key IS DISTINCT FROM p_expected_thumbnail_object_key/);
assert.match(migration, /SET deleted_at = pg_catalog\.clock_timestamp\(\)/);
assert.match(migration, /REVOKE ALL[\s\S]*FROM PUBLIC, anon, authenticated/);
assert.match(migration, /GRANT EXECUTE[\s\S]*TO service_role/);
assert.doesNotMatch(migration, /DELETE\s+FROM\s+public\.sale_photo_evidence/i);

assert.match(repository, /^import 'server-only';/);
assert.match(repository, /bff_prepare_sale_photo_evidence_delete/);
assert.match(repository, /bff_finalize_sale_photo_evidence_delete/);
assert.match(repository, /SUPABASE_SECRET_KEY/);
assert.doesNotMatch(repository, /NEXT_PUBLIC_SUPABASE/);

console.log('PASS owner-only RPC boundary, object-key guards, and soft-delete contract');
