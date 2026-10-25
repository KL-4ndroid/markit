import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MARKET_REGIONS } from '../lib/markets/market-region';

const sql = readFileSync('supabase/migrations/074_add_market_region_foundation.sql', 'utf8');
const codes = [...sql.matchAll(/'(tw-[a-z-]+)'/g)].map(match => match[1]);
assert.deepEqual([...new Set(codes)].sort(), MARKET_REGIONS.map(region => region.code).sort(), 'client and database catalogs must stay identical');
assert.match(sql, /BEGIN;/);
assert.match(sql, /COMMIT;/);
assert.match(sql, /Unexpected staff view definition/);
assert.doesNotMatch(sql, /DISABLE ROW LEVEL SECURITY|UPDATE public\.markets SET total_|SET location/);
assert.match(sql, /REVOKE ALL ON FUNCTION public\.project_market_region_event\(\) FROM PUBLIC, anon, authenticated, service_role/);
console.log('PASS migration region catalog parity and rollout guardrails');
