import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = join(__dirname, '..');
const source = readFileSync(
  join(projectRoot, 'supabase/migrations/057_harden_sales_photo_evidence_api_boundary.sql'),
  'utf8'
);

console.log('\n=== Supabase sales photo evidence API boundary migration ===');

assert.match(
  source,
  /is_sale_photo_evidence_sale_event\(sale_id, market_id, owner_id\)\s*AND\s*\(\s*\(\s*owner_id = auth\.uid\(\)[\s\S]*?\)\s*OR\s*\(\s*captured_by_staff_id = auth\.uid\(\)/
);
console.log('PASS sale-event validation encloses both owner and staff insert branches');

assert.match(source, /sale_photo_evidence_r2_object_key_identity_check/);
assert.match(source, /'sales-evidence\/7d\/' \|\| owner_id::text \|\| '\/' \|\| market_id::text \|\| '\/' \|\| sale_id::text \|\| '\/' \|\| id::text \|\| '\.webp'/);
assert.match(source, /sale_photo_evidence_r2_thumbnail_key_identity_check/);
assert.match(source, /'sales-evidence-thumbs\/7d\/' \|\| owner_id::text/);
console.log('PASS image and thumbnail keys are bound to the complete evidence identity');

assert.match(source, /file_size_bytes IS NULL OR file_size_bytes <= 1000000/);
assert.match(source, /NOT VALID/);
console.log('PASS new writes get the upload ceiling without blocking migration on unaudited history');

assert.doesNotMatch(source, /SERVICE_ROLE|service_role|R2_SECRET|secret_access/i);
console.log('PASS migration contains no server credentials');
