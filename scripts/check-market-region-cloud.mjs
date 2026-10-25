/** Read-only checks. Does not write business data or enable the client flag. */
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) {
  console.error('Missing local Supabase URL/server key; do not paste keys into chat.');
  process.exitCode = 1;
} else {
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  let ready = true;
  for (const table of ['markets', 'venues', 'staff_accessible_markets']) {
    const response = await fetch(new URL(`/rest/v1/${table}?select=region_code&limit=0`, base), { headers });
    console.log(`${response.ok ? 'PASS' : 'PENDING'} ${table}.region_code (HTTP ${response.status})`);
    if (!response.ok) ready = false;
  }
  for (const [code, expected] of [['tw-tainan-city', true], ['台南市', false], [null, true]]) {
    const response = await fetch(new URL('/rest/v1/rpc/market_region_code_is_valid', base), {
      method: 'POST', headers, body: JSON.stringify({ code }),
    });
    const valid = response.ok && await response.json() === expected;
    console.log(`${valid ? 'PASS' : 'PENDING'} read-only region validator (${code ?? 'unclassified'})`);
    if (!valid) ready = false;
  }
  console.log(ready ? 'Cloud schema checks passed. Still verify projection/role evidence and mobile UI before release.' : 'Keep NEXT_PUBLIC_MARKET_REGION_ENABLED=false until migration 074 and SQL verification are complete.');
  if (!ready) process.exitCode = 1;
}
