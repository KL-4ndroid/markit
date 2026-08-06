import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const proposal = readFileSync(
  join(root, 'docs/subscription/F3C_ENTITLEMENT_PROJECTION_WRITER_PROPOSAL_2026_08_06.md'),
  'utf8',
);

for (const requirement of [
  'planning only',
  'server-only transaction boundary',
  'cross-owner',
  'idempotent',
  'out-of-order',
  'Duplicate-origin',
  'anonymous denial',
  'ordinary authenticated denial',
  'Security Advisor',
  'corrective-forward',
  'Production',
  'Dexie',
  'simulation and fake IAP evidence cannot reach the writer',
]) {
  assert.ok(proposal.includes(requirement), requirement);
}

assert.match(proposal, /does not create SQL, a route, a callback, a writer, a grant, a policy/);
assert.match(proposal, /must continue returning billing-disconnected Free state/);

for (const forbiddenPath of [
  'app/api/subscription/reconcile/route.ts',
  'app/api/subscription/checkout/route.ts',
  'lib/subscription/entitlement-projection-writer.ts',
  'supabase/migrations/068_add_entitlement_projection_writer.sql',
]) {
  assert.equal(existsSync(join(root, forbiddenPath)), false, `${forbiddenPath} must remain absent`);
}

console.log('PASS F3C entitlement projection writer remains a bounded planning-only proposal');
