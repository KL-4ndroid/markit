import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const c = read('docs/security/SUPABASE_SRA_C_STAFF_READ_CUTOVER_PLAN_2026_09_01.md');
const d = read('docs/security/SUPABASE_SRA_D_LEAKED_PASSWORD_ROLLOUT_2026_09_01.md');

for (const marker of [
  'Changing the views to',
  'SECURITY INVOKER',
  'list_accessible_markets_v2',
  'list_accessible_products_v2',
  'list_accessible_events_v2',
  'revoke `PUBLIC` and `anon`',
  'view` and `rpc_v2`',
  'zero runtime view callers',
  'explicit C1 local-only implementation approval',
]) {
  assert.ok(c.includes(marker), `missing SRA-C boundary: ${marker}`);
}
for (const caller of [
  'lib/sync/staff-pull-service.ts',
  'lib/supabase/markets.ts',
  'lib/supabase/products.ts',
  'lib/sales/photo-evidence-manual-upload-client.ts',
]) {
  assert.ok(c.includes(caller), `missing SRA-C caller: ${caller}`);
}

for (const marker of [
  'confirmed disabled',
  'No setting was changed',
  'must not be silently treated as staging',
  'new sign-up',
  'reset and password change',
  'invitation sign-up/acceptance',
  'explicit instruction to click the checkbox and Save changes',
  'does not authorize enabling the setting on Production',
]) {
  assert.ok(d.includes(marker), `missing SRA-D boundary: ${marker}`);
}
assert.doesNotMatch(d, /@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/u);
assert.ok(read('scripts/test-files.txt').includes('tsx tests/supabase-sra-cd-plans.test.ts'));

console.log('PASS SRA-C/D plans remain staged, cross-platform, and Production-unapproved');
