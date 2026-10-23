import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDealEventCost, getDealEventCount, getDealEventRevenue } from '../lib/events/event-read-model';

const fixtures = JSON.parse(readFileSync('tests/fixtures/deal-projection-contract.json', 'utf8')) as {
  name: string; payload: Record<string, unknown>; expected: number[];
}[];
for (const fixture of fixtures) {
  const event = { payload: fixture.payload };
  assert.deepEqual([getDealEventRevenue(event), getDealEventCost(event), getDealEventCount(event)], fixture.expected, fixture.name);
}
const sql = readFileSync('supabase/migrations/073_align_cloud_deal_projections.sql', 'utf8');
assert.ok(sql.includes('BW10_DEAL_MARKET_V1') && sql.includes('BW10_DEAL_PRODUCT_V1'));
assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.deal_projection_delta'));
assert.ok(sql.includes('Unexpected market deal branch') && sql.includes('Unexpected product deal branch'));
assert.ok(!/UPDATE\s+public\.events|DELETE\s+FROM/i.test(sql), 'migration must preserve original event evidence');
console.log(`PASS ${fixtures.length} shared/cloud sales contract fixtures; guarded event-preserving migration`);
